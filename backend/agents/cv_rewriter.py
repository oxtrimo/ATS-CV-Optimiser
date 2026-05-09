"""Agent 4: CV Rewriter — rewrites the CV with selected keywords, preserving format."""
import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)
_model = genai.GenerativeModel(Config.GEMINI_MODEL)

_TONES = {
    "formal": "formal and professional, suitable for corporate/traditional industries",
    "balanced": "balanced — professional yet approachable",
    "achievement": "achievement-focused, emphasising quantifiable results and impact",
}

_PROMPT = """You are an expert CV writer and ATS optimisation specialist.
Rewrite the CV below to incorporate the selected keywords naturally.

STRICT RULES:
1. NEVER fabricate or invent experiences, skills, or qualifications not in the original CV.
2. Only incorporate keywords that can be genuinely tied to real existing experience.
3. {format_rule}
4. Tone: {tone_desc}
5. Use standard ATS-friendly section headings (Experience, Education, Skills, etc.).
6. Quantify achievements where existing data allows.

Original CV:
---
{cv_text}
---

Job Title: {job_title}
Keywords to incorporate: {keywords}
Key Requirements: {requirements}

Return ONLY valid JSON:
{{
  "rewritten_cv": "<full rewritten CV — LaTeX if original was LaTeX, otherwise plain text>",
  "changes_made": [],
  "keywords_incorporated": [],
  "keywords_skipped": [],
  "new_score_estimate": <0-100>
}}"""


def rewrite_cv(cv_text: str, cv_data: dict, jd_data: dict,
               selected_keywords: list, tone: str) -> dict:
    is_latex = cv_data.get("is_latex", False)
    format_rule = (
        "The original CV is LaTeX — preserve ALL LaTeX commands and structure; "
        "modify only text content inside LaTeX commands."
        if is_latex else
        "Preserve the original CV layout and section structure."
    )
    tone_desc = _TONES.get(tone, _TONES["balanced"])
    try:
        prompt = _PROMPT.format(
            format_rule=format_rule,
            tone_desc=tone_desc,
            cv_text=cv_text[:5000],
            job_title=jd_data.get("job_title", "N/A"),
            keywords=selected_keywords,
            requirements=jd_data.get("required_skills", [])[:10],
        )
        response = _model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(_strip_fences(response.text))
    except Exception as e:
        return {
            "rewritten_cv": cv_text,
            "changes_made": [],
            "keywords_incorporated": [],
            "keywords_skipped": [],
            "new_score_estimate": 0,
            "error": str(e),
        }


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return text.strip()
