"""
Orchestrator: controls the sequential multi-agent pipeline.
Stores per-session state so the pipeline can pause at keyword-selection step.
"""
import uuid
import threading
from agents.cv_parser    import parse_cv
from agents.jd_extractor import extract_jd
from agents.gap_analyser  import analyse_gaps
from agents.cv_rewriter   import rewrite_cv
from agents.cover_letter  import generate_cover_letter

# In-memory session store  { session_id -> session_dict }
_sessions: dict[str, dict] = {}
_lock = threading.Lock()


# ─── Session helpers ──────────────────────────────────────────────────────────

def create_session() -> str:
    sid = str(uuid.uuid4())
    with _lock:
        _sessions[sid] = {
            "status": "idle",
            "step": 0,
            "cv_text": "",
            "cv_data": {},
            "jd_text": "",
            "jd_data": {},
            "gap_data": {},
            "rewrite_result": {},
            "cover_letter_result": {},
            "preferences": {},
            "events": [],          # SSE event queue
            "error": None,
        }
    return sid


def get_session(sid: str) -> dict | None:
    return _sessions.get(sid)


def _push_event(sid: str, event: dict):
    with _lock:
        _sessions[sid]["events"].append(event)


def pop_events(sid: str) -> list:
    with _lock:
        events = _sessions[sid]["events"][:]
        _sessions[sid]["events"] = []
    return events


# ─── Pipeline stages ──────────────────────────────────────────────────────────

def run_phase1(sid: str, cv_text: str, is_latex: bool,
               jd_text: str, preferences: dict):
    """Phase 1: parse CV + JD, then run gap analysis. Pauses for keyword selection."""
    with _lock:
        s = _sessions[sid]
        s["cv_text"]     = cv_text
        s["jd_text"]     = jd_text
        s["preferences"] = preferences
        s["status"]      = "running"

    def _run():
        try:
            # Agent 1 — CV Parser
            _push_event(sid, {"agent": "cv_parser", "status": "running"})
            cv_data = parse_cv(cv_text, is_latex)
            with _lock:
                _sessions[sid]["cv_data"] = cv_data
            _push_event(sid, {"agent": "cv_parser", "status": "done",
                               "data": {"name": cv_data.get("name", ""),
                                        "skills_count": len(cv_data.get("skills", []))}})

            # Agent 2 — JD Extractor
            _push_event(sid, {"agent": "jd_extractor", "status": "running"})
            jd_data = extract_jd(jd_text)
            with _lock:
                _sessions[sid]["jd_data"] = jd_data
            _push_event(sid, {"agent": "jd_extractor", "status": "done",
                               "data": {"job_title": jd_data.get("job_title", "")}})

            # Agent 3 — Gap Analyser
            _push_event(sid, {"agent": "gap_analyser", "status": "running"})
            gap_data = analyse_gaps(cv_data, jd_data, cv_text)
            with _lock:
                _sessions[sid]["gap_data"] = gap_data
                _sessions[sid]["status"]   = "awaiting_keywords"
            _push_event(sid, {"agent": "gap_analyser", "status": "done",
                               "data": gap_data})
            _push_event(sid, {"agent": "pipeline", "status": "awaiting_keywords"})

        except Exception as e:
            with _lock:
                _sessions[sid]["status"] = "error"
                _sessions[sid]["error"]  = str(e)
            _push_event(sid, {"agent": "pipeline", "status": "error", "error": str(e)})

    threading.Thread(target=_run, daemon=True).start()


def run_phase2(sid: str, selected_keywords: list):
    """Phase 2: rewrite CV + generate cover letter with user-chosen keywords."""
    with _lock:
        s = _sessions[sid]
        s["status"] = "running"
        cv_text      = s["cv_text"]
        cv_data      = s["cv_data"]
        jd_data      = s["jd_data"]
        preferences  = s["preferences"]

    tone  = preferences.get("tone", "balanced")
    style = preferences.get("coverLetterStyle", "professional")

    def _run():
        try:
            # Agent 4 — CV Rewriter
            _push_event(sid, {"agent": "cv_rewriter", "status": "running"})
            rewrite_result = rewrite_cv(cv_text, cv_data, jd_data,
                                        selected_keywords, tone)
            with _lock:
                _sessions[sid]["rewrite_result"] = rewrite_result
            _push_event(sid, {"agent": "cv_rewriter", "status": "done",
                               "data": {
                                   "new_score": rewrite_result.get("new_score_estimate", 0),
                                   "keywords_added": rewrite_result.get("keywords_incorporated", []),
                               }})

            # Agent 5 — Cover Letter
            _push_event(sid, {"agent": "cover_letter", "status": "running"})
            cl_result = generate_cover_letter(cv_data, jd_data, style)
            with _lock:
                _sessions[sid]["cover_letter_result"] = cl_result
                _sessions[sid]["status"] = "complete"
            _push_event(sid, {"agent": "cover_letter", "status": "done"})
            _push_event(sid, {"agent": "pipeline", "status": "complete"})

        except Exception as e:
            with _lock:
                _sessions[sid]["status"] = "error"
                _sessions[sid]["error"]  = str(e)
            _push_event(sid, {"agent": "pipeline", "status": "error", "error": str(e)})

    threading.Thread(target=_run, daemon=True).start()
