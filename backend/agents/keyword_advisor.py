"""
Agent: Keyword Advisor — contextual keyword explanation & transferable experience alignment.
"""
import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)
_model = genai.GenerativeModel(Config.GEMINI_MODEL)

_EXPLAIN_PROMPT = """You are a senior tech recruiter and industry career coach.
Explain the following ATS keyword in the direct context of the targeted job role and hiring company.

Keyword: "{keyword}"
Target Job Title: {job_title}
Target Company: {company}
Role Responsibilities & Requirements:
{role_context}

Your explanation must be clear, practical, and empathetic. Help the candidate quickly understand:
1. What this keyword means in everyday practice for this specific role (1-2 sentences).
2. Common equivalent tools, frameworks, or alternate tasks they might have actually done under a different name.

Return ONLY valid JSON matching this schema:
{{
  "keyword": "{keyword}",
  "role_context": "<1-2 sentences explaining what this means in the day-to-day of this specific role>",
  "equivalents": "<example tools, tasks, or synonyms where someone has transferable skill without knowing the exact buzzword>",
  "self_check_question": "<a single crisp question helping the user assess: 'Have you ever...' >"
}}
"""

_ALIGN_PROMPT = """You are an expert career strategist and ATS CV specialist.
A job applicant is applying for the following role:
Job Title: {job_title}
Company: {company}

The applicant's CV was flagged as missing this ATS keyword: "{keyword}".
Instead of fabricating, the applicant provided their own authentic experience/notes:
Applicant Notes: "{user_experience}"

Applicant's Current CV Summary/Skills:
{cv_summary}

Your task:
1. Objectively assess whether the applicant's experience is genuinely aligned or transferable to this keyword.
2. If aligned or partially aligned: Frame an authentic, impactful CV bullet point that highlights their true experience while honestly incorporating the keyword or its domain concept (DO NOT lie or exaggerate beyond what the applicant described).
3. If not aligned at all (e.g., completely unrelated or false claim): Politely advise against adding it to protect credibility in interviews.

Return ONLY valid JSON:
{{
  "keyword": "{keyword}",
  "is_aligned": true | false,
  "alignment_type": "direct" | "transferable" | "stretch" | "unrelated",
  "feedback": "<concise explanation of why this aligns or why it's a stretch>",
  "suggested_bullet": "<professionally crafted ATS bullet point using action verbs and metrics if provided, or empty string if not aligned>",
  "recommended_section": "<Experience | Skills | Projects>"
}}
"""


def explain_keyword(keyword: str, jd_data: dict, cv_data: dict = None) -> dict:
    """Explains a keyword in context of the target job description."""
    try:
        role_context = (
            f"Requirements: {jd_data.get('required_skills', [])[:5]}\n"
            f"Responsibilities: {jd_data.get('responsibilities', [])[:4]}"
        )
        prompt = _EXPLAIN_PROMPT.format(
            keyword=keyword,
            job_title=jd_data.get("job_title", "Target Role"),
            company=jd_data.get("company", "the hiring company"),
            role_context=role_context
        )
        response = _model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(_strip_fences(response.text))
    except Exception as e:
        return {
            "keyword": keyword,
            "role_context": f"Relevant technical requirement for {jd_data.get('job_title', 'the role')}.",
            "equivalents": "Related industry tools or practical workflow experience.",
            "self_check_question": f"Have you had hands-on experience or project exposure to {keyword}?",
            "error": str(e)
        }


def align_experience(keyword: str, user_experience: str, jd_data: dict, cv_data: dict = None) -> dict:
    """Analyzes candidate notes to validate transferable alignment and construct an authentic bullet point."""
    try:
        cv_summary = ""
        if cv_data:
            cv_summary = f"Skills: {cv_data.get('skills', [])[:8]}\nRecent: {json.dumps(cv_data.get('experience', [])[:2])}"

        prompt = _ALIGN_PROMPT.format(
            keyword=keyword,
            job_title=jd_data.get("job_title", "Target Role"),
            company=jd_data.get("company", "the hiring company"),
            user_experience=user_experience,
            cv_summary=cv_summary[:1500]
        )
        response = _model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(_strip_fences(response.text))
    except Exception as e:
        return {
            "keyword": keyword,
            "is_aligned": True,
            "alignment_type": "transferable",
            "feedback": "Could not run detailed validation, but framed your note into a professional bullet point.",
            "suggested_bullet": f"Leveraged {keyword} concepts to {user_experience.strip().rstrip('.')}.",
            "recommended_section": "Experience",
            "error": str(e)
        }


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return text.strip()
