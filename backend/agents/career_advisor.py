"""Agent 6: Career Advisor — streaming chat assistant."""
import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)
_model = genai.GenerativeModel(Config.GEMINI_MODEL)

_SYSTEM = """You are an expert AI career advisor embedded in an ATS CV Optimizer tool.
Your role: help candidates improve their CVs, understand ATS systems, prepare for interviews,
and navigate the job application process.

Guidelines:
- Be concise, practical, and encouraging.
- Give specific, actionable advice — not generic platitudes.
- If the user shares context about their CV or target job, tailor your advice to it.
- For ATS questions, explain how ATS systems work in simple terms.
- If asked to rewrite something, do so clearly and mark changes.
- Keep responses under 300 words unless a detailed breakdown is explicitly requested.
"""


def chat(message: str, history: list, context: dict | None = None) -> str:
    """
    Returns advisor reply as plain text.
    history: list of {"role": "user"|"assistant", "content": "..."}
    context: optional dict with cv_data, jd_data, gap_data for context-aware replies
    """
    ctx_block = ""
    if context:
        cv_name = context.get("cv_data", {}).get("name", "")
        job = context.get("jd_data", {}).get("job_title", "")
        score = context.get("gap_data", {}).get("overall_score", "")
        if cv_name or job or score:
            ctx_block = (
                f"\n\n[Session context — Candidate: {cv_name}, "
                f"Target role: {job}, Current ATS score: {score}%]"
            )

    # Build conversation for Gemini
    gemini_history = []
    for msg in history[-10:]:  # last 10 turns to stay within context
        role = "user" if msg["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [msg["content"]]})

    chat_session = _model.start_chat(history=gemini_history)
    full_message = _SYSTEM + ctx_block + "\n\nUser: " + message
    try:
        response = chat_session.send_message(full_message)
        return response.text
    except Exception as e:
        return f"Sorry, I encountered an error: {e}"
