"""Agent 1: CV Parser — extracts structured data from raw CV text."""
import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)
_model = genai.GenerativeModel(Config.GEMINI_MODEL)

_PROMPT = """You are an expert CV parser. Analyse the CV below and return ONLY a valid JSON object.

CV:
---
{cv_text}
---

JSON schema:
{{
  "name": "full name",
  "contact": {{"email":"","phone":"","location":"","linkedin":"","github":""}},
  "summary": "professional summary",
  "skills": ["skill1","skill2"],
  "experience": [
    {{"title":"","company":"","duration":"","description":""}}
  ],
  "education": [
    {{"degree":"","institution":"","year":"","grade":""}}
  ],
  "certifications": [],
  "languages": [],
  "projects": [],
  "is_latex": false
}}
Return ONLY valid JSON."""


def parse_cv(cv_text: str, is_latex: bool = False) -> dict:
    try:
        prompt = _PROMPT.format(cv_text=cv_text[:5000])
        response = _model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        text = _strip_fences(response.text)
        data = json.loads(text)
        data["is_latex"] = is_latex
        return data
    except Exception as e:
        return {"name": "Unknown", "skills": [], "experience": [],
                "education": [], "is_latex": is_latex, "error": str(e)}


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return text.strip()
