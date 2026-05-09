"""Agent 5: Cover Letter Generator."""
import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)
_model = genai.GenerativeModel(Config.GEMINI_MODEL)

_STYLES = {
    "professional": "formal and polished, suitable for traditional corporate environments",
    "conversational": "warm and conversational, revealing personality while remaining professional",
    "technical": "highly technical, emphasising specific tools, metrics, and engineering impact",
}

_PROMPT = """You are an expert career coach. Write a compelling, tailored cover letter.

Style: {style_desc}

Candidate:
  Name: {name}
  Skills: {skills}
  Recent Experience: {experience}
  Education: {education}
  Summary: {summary}

Target Role:
  Title: {job_title}
  Company: {company}
  Key Requirements: {requirements}
  Responsibilities: {responsibilities}

Write a 3-4 paragraph cover letter that:
1. Opens with a compelling, specific hook (not "I am writing to apply for…")
2. Connects the candidate's concrete experience to the role's key needs
3. Demonstrates genuine enthusiasm for the company/role
4. Closes with a confident call to action

Return ONLY valid JSON:
{{
  "cover_letter": "<full cover letter text>",
  "subject_line": "<suggested email subject>"
}}"""


def generate_cover_letter(cv_data: dict, jd_data: dict, style: str) -> dict:
    style_desc = _STYLES.get(style, _STYLES["professional"])
    try:
        prompt = _PROMPT.format(
            style_desc=style_desc,
            name=cv_data.get("name", "Candidate"),
            skills=cv_data.get("skills", [])[:12],
            experience=json.dumps(cv_data.get("experience", [])[:2]),
            education=json.dumps(cv_data.get("education", [])[:1]),
            summary=cv_data.get("summary", ""),
            job_title=jd_data.get("job_title", "the position"),
            company=jd_data.get("company", "the company"),
            requirements=jd_data.get("required_skills", [])[:8],
            responsibilities=jd_data.get("responsibilities", [])[:5],
        )
        response = _model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(_strip_fences(response.text))
    except Exception as e:
        return {"cover_letter": "", "subject_line": "", "error": str(e)}


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return text.strip()
