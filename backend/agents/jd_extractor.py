"""Agent 2: Job Description Extractor — structures raw JD text."""
import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)
_model = genai.GenerativeModel(Config.GEMINI_MODEL)

_PROMPT = """You are an expert job analyst. Analyse the job description below and return ONLY valid JSON.

Job Description:
---
{jd_text}
---

JSON schema:
{{
  "job_title": "",
  "company": "",
  "location": "",
  "employment_type": "",
  "experience_required": "",
  "required_skills": [],
  "preferred_skills": [],
  "required_keywords": [],
  "responsibilities": [],
  "qualifications": [],
  "industry": "",
  "tools_technologies": [],
  "soft_skills": [],
  "salary": "",
  "summary": ""
}}
Return ONLY valid JSON."""


def extract_jd(jd_text: str) -> dict:
    try:
        prompt = _PROMPT.format(jd_text=jd_text[:6000])
        response = _model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(_strip_fences(response.text))
    except Exception as e:
        return {"error": str(e), "required_keywords": [],
                "required_skills": [], "tools_technologies": []}


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return text.strip()
