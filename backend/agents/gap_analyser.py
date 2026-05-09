"""Agent 3: ATS Gap Analyser — scores CV vs JD and finds missing keywords."""
import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)
_model = genai.GenerativeModel(Config.GEMINI_MODEL)

_PROMPT = """You are an ATS (Applicant Tracking System) expert.
Analyse the match between the CV and job description below and return ONLY valid JSON.

CV Skills: {cv_skills}
CV Experience (summary): {cv_experience}
CV Education: {cv_education}

Job Title: {job_title}
Required Keywords: {required_keywords}
Required Skills: {required_skills}
Tools/Technologies: {tools}
Preferred Skills: {preferred_skills}

CV Text excerpt:
{cv_excerpt}

Return this JSON schema exactly:
{{
  "overall_score": <0-100>,
  "score_breakdown": {{
    "keywords_match": <0-100>,
    "skills_match": <0-100>,
    "experience_match": <0-100>,
    "education_match": <0-100>
  }},
  "matched_keywords": [],
  "missing_critical_keywords": [
    {{"keyword": "", "importance": "critical|high|medium",
      "reason": "", "suggestion": ""}}
  ],
  "missing_preferred_keywords": [
    {{"keyword": "", "importance": "medium|low",
      "reason": "", "suggestion": ""}}
  ],
  "strengths": [],
  "gaps": [],
  "ats_tips": []
}}
Return ONLY valid JSON."""


def analyse_gaps(cv_data: dict, jd_data: dict, cv_text: str) -> dict:
    try:
        prompt = _PROMPT.format(
            cv_skills=cv_data.get("skills", []),
            cv_experience=json.dumps(cv_data.get("experience", [])[:3]),
            cv_education=json.dumps(cv_data.get("education", [])[:2]),
            job_title=jd_data.get("job_title", "N/A"),
            required_keywords=jd_data.get("required_keywords", []),
            required_skills=jd_data.get("required_skills", []),
            tools=jd_data.get("tools_technologies", []),
            preferred_skills=jd_data.get("preferred_skills", []),
            cv_excerpt=cv_text[:3000],
        )
        response = _model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(_strip_fences(response.text))
    except Exception as e:
        return {
            "overall_score": 0,
            "score_breakdown": {"keywords_match": 0, "skills_match": 0,
                                "experience_match": 0, "education_match": 0},
            "missing_critical_keywords": [],
            "missing_preferred_keywords": [],
            "matched_keywords": [],
            "strengths": [], "gaps": [], "ats_tips": [],
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
