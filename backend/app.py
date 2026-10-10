"""
Flask application — ATS CV Optimizer backend.
"""
import os
import time
import json
import base64
from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from config import Config
import orchestrator as orch
from utils.file_parser    import parse_file
from utils.url_scraper    import scrape_job_url
from utils.latex_compiler import compile_latex
from agents.career_advisor import chat as advisor_chat
from agents.keyword_advisor import explain_keyword, align_experience

# ─── App setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config.from_object(Config)
CORS(app, origins=[Config.FRONTEND_URL], supports_credentials=True)
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".tex", ".md"}


def _allowed(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


# ─── CV Upload ────────────────────────────────────────────────────────────────
@app.post("/api/upload-cv")
def upload_cv():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f.filename or not _allowed(f.filename):
        return jsonify({"error": "Unsupported file type. Use PDF, TXT, TEX, or MD."}), 400

    filename = secure_filename(f.filename)
    filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
    f.save(filepath)

    try:
        parsed = parse_file(filepath, filename)
        return jsonify({
            "success": True,
            "text":     parsed["text"],
            "format":   parsed["format"],
            "is_latex": parsed["is_latex"],
            "filename": filename,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


# ─── Scrape job URL ───────────────────────────────────────────────────────────
@app.post("/api/scrape-url")
def scrape_url():
    body = request.get_json(silent=True) or {}
    url  = body.get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    result = scrape_job_url(url)
    return jsonify(result)


# ─── Pipeline: start (Phase 1) ────────────────────────────────────────────────
@app.post("/api/pipeline/start")
def pipeline_start():
    body         = request.get_json(silent=True) or {}
    cv_text      = body.get("cv_text", "").strip()
    is_latex     = body.get("is_latex", False)
    jd_text      = body.get("jd_text", "").strip()
    preferences  = body.get("preferences", {})

    if not cv_text:
        return jsonify({"error": "CV text is required"}), 400
    if not jd_text:
        return jsonify({"error": "Job description is required"}), 400

    sid = orch.create_session()
    orch.run_phase1(sid, cv_text, is_latex, jd_text, preferences)
    return jsonify({"session_id": sid})


# ─── Pipeline: SSE stream ─────────────────────────────────────────────────────
@app.get("/api/pipeline/stream/<sid>")
def pipeline_stream(sid: str):
    if not orch.get_session(sid):
        return jsonify({"error": "Session not found"}), 404

    def generate():
        last_ping = time.time()
        while True:
            session = orch.get_session(sid)
            if not session:
                break
            events = orch.pop_events(sid)
            for ev in events:
                yield f"data: {json.dumps(ev)}\n\n"

            # Only stop streaming once a final terminal state is reached
            if session["status"] in ("complete", "error"):
                if not events:
                    break

            # Periodic heartbeat ping to keep SSE connection alive during pauses
            if time.time() - last_ping > 15:
                yield ": keepalive\n\n"
                last_ping = time.time()

            time.sleep(0.4)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Pipeline: status check ───────────────────────────────────────────────────
@app.get("/api/pipeline/status/<sid>")
def pipeline_status(sid: str):
    session = orch.get_session(sid)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify({
        "status": session.get("status", "idle"),
        "error":  session.get("error"),
    })


# ─── Pipeline: resume (Phase 2) ───────────────────────────────────────────────
@app.post("/api/pipeline/resume/<sid>")
def pipeline_resume(sid: str):
    session = orch.get_session(sid)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    # If already running Phase 2, acknowledge idempotently without error
    if session["status"] == "running":
        return jsonify({"success": True, "status": "running", "message": "Pipeline already running"}), 200

    if session["status"] != "awaiting_keywords":
        return jsonify({"error": f"Pipeline is not paused (status: {session['status']})"}), 400

    body = request.get_json(silent=True) or {}
    selected_keywords = body.get("selected_keywords", [])
    contextual_keywords = body.get("contextual_keywords", [])
    orch.run_phase2(sid, selected_keywords, contextual_keywords=contextual_keywords)
    return jsonify({"success": True, "status": "resumed"})


# ─── Keyword Advisor: Explain in context ──────────────────────────────────────
@app.post("/api/keywords/explain")
def api_explain_keyword():
    body = request.get_json(silent=True) or {}
    keyword = body.get("keyword", "").strip()
    sid = body.get("session_id")
    if not keyword:
        return jsonify({"error": "Keyword is required"}), 400

    jd_data = body.get("jd_data") or {}
    cv_data = body.get("cv_data") or {}
    if sid:
        session = orch.get_session(sid)
        if session:
            jd_data = session.get("jd_data") or jd_data
            cv_data = session.get("cv_data") or cv_data

    result = explain_keyword(keyword, jd_data, cv_data)
    return jsonify(result)


# ─── Keyword Advisor: Align user experience ──────────────────────────────────
@app.post("/api/keywords/align")
def api_align_experience():
    body = request.get_json(silent=True) or {}
    keyword = body.get("keyword", "").strip()
    user_exp = body.get("user_experience", "").strip()
    sid = body.get("session_id")
    if not keyword or not user_exp:
        return jsonify({"error": "Both keyword and user_experience are required"}), 400

    jd_data = body.get("jd_data") or {}
    cv_data = body.get("cv_data") or {}
    if sid:
        session = orch.get_session(sid)
        if session:
            jd_data = session.get("jd_data") or jd_data
            cv_data = session.get("cv_data") or cv_data

    result = align_experience(keyword, user_exp, jd_data, cv_data)
    return jsonify(result)


# ─── Generate Cover Letter on-demand ─────────────────────────────────────────
@app.post("/api/generate-cover-letter/<sid>")
def api_generate_cover_letter(sid: str):
    session = orch.get_session(sid)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    body = request.get_json(silent=True) or {}
    style = body.get("style")
    result = orch.generate_cover_letter_for_session(sid, style)
    return jsonify(result)



# ─── Pipeline: get results ────────────────────────────────────────────────────
@app.get("/api/pipeline/results/<sid>")
def pipeline_results(sid: str):
    session = orch.get_session(sid)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify({
        "status":          session["status"],
        "cv_data":         session["cv_data"],
        "jd_data":         session["jd_data"],
        "gap_data":        session["gap_data"],
        "rewrite_result":  session["rewrite_result"],
        "cover_letter":    session["cover_letter_result"],
    })


# ─── Compile LaTeX → PDF ──────────────────────────────────────────────────────
@app.post("/api/compile-latex")
def compile_latex_route():
    body   = request.get_json(silent=True) or {}
    source = body.get("latex_source", "")
    if not source:
        return jsonify({"error": "No LaTeX source provided"}), 400

    result = compile_latex(source)
    if result["success"]:
        pdf_b64 = base64.b64encode(result["pdf_bytes"]).decode()
        return jsonify({"success": True, "pdf_base64": pdf_b64})
    else:
        return jsonify({"success": False, "error": result["error"]}), 422


# ─── Career Advisor Chat ──────────────────────────────────────────────────────
@app.post("/api/chat")
def chat():
    body    = request.get_json(silent=True) or {}
    message = body.get("message", "").strip()
    history = body.get("history", [])
    sid     = body.get("session_id")
    context = {}
    if sid:
        session = orch.get_session(sid)
        if session:
            context = {
                "cv_data":  session.get("cv_data", {}),
                "jd_data":  session.get("jd_data", {}),
                "gap_data": session.get("gap_data", {}),
            }
    if not message:
        return jsonify({"error": "No message provided"}), 400

    reply = advisor_chat(message, history, context)
    return jsonify({"reply": reply})


# ─── Serve Frontend ───────────────────────────────────────────────────────────
DIST_DIR = os.path.join(os.path.dirname(__file__), "dist")
if not os.path.exists(DIST_DIR):
    DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(DIST_DIR, path)):
        return send_from_directory(DIST_DIR, path)
    if os.path.exists(os.path.join(DIST_DIR, "index.html")):
        return send_from_directory(DIST_DIR, "index.html")
    return jsonify({
        "status": "online",
        "service": "ATS CV Optimizer API",
        "message": "Backend API is running. Frontend static build not found."
    }), 200


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=Config.DEBUG, port=5000)

