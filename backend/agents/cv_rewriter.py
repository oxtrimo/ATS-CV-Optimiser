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
Rewrite the CV below to incorporate the selected keywords naturally and cohesively.

CRITICAL SYNTHESIS & ANTI-REPETITION RULES:
1. NEVER fabricate or invent experiences, skills, or qualifications not in the original CV or candidate notes.
2. HOLISTIC MULTI-KEYWORD SYNTHESIS (NO 1-LINE-PER-KEYWORD):
   - Analyze ALL candidate experience notes and selected keywords as a cohesive portfolio.
   - Group keywords that share the same project, tech stack, or functional context (e.g., Docker + Kubernetes + CI/CD; React + TypeScript + Redux; Python + Pandas + SQL).
   - Create unified, impactful sentences that naturally weave MULTIPLE keywords together into a single accomplishment or responsibility, instead of adding a separate bullet point for each keyword.
3. STRICT ANTI-REPETITION & DE-DUPLICATION:
   - NEVER create multiple sentences or bullet points that cover the same topic, tool, or project.
   - If the candidate mentioned the same experience in multiple notes, or if the original CV already touches upon the project/topic, synthesize the information into a single concise mention.
4. REFINING & STRENGTHENING EXISTING CV SENTENCES:
   - Compile the candidate's notes with the existing text in their CV.
   - Rather than creating weak or separate new lines, refine their existing CV sentences to make them punchier, more professional, and significantly stronger, elevating overall impact while seamlessly weaving in the keywords they mentioned in their notes.
5. {format_rule}
6. Tone: {tone_desc}
7. Use standard ATS-friendly section headings (Experience, Education, Skills, etc.).
8. Quantify achievements where existing data allows, preserving professional authenticity.

Original CV:
---
{cv_text}
---

Job Title: {job_title}
Keywords to incorporate: {keywords}
Key Requirements: {requirements}

{contextual_section}

Return ONLY valid JSON:
{{
  "rewritten_cv": "<full rewritten CV — LaTeX if original was LaTeX, otherwise plain text>",
  "changes_made": [],
  "keywords_incorporated": [],
  "keywords_skipped": [],
  "new_score_estimate": <0-100>
}}"""


def rewrite_cv(cv_text: str, cv_data: dict, jd_data: dict,
               selected_keywords: list, tone: str,
               contextual_keywords: list = None) -> dict:
    is_latex = cv_data.get("is_latex", False)
    format_rule = (
        "The original CV is LaTeX — preserve ALL LaTeX commands and structure; "
        "modify only text content inside LaTeX commands."
        if is_latex else
        "Preserve the original CV layout and section structure."
    )
    tone_desc = _TONES.get(tone, _TONES["balanced"])

    contextual_section = ""
    if contextual_keywords:
        lines = [
            "Candidate-Provided Real Experience Notes for Missing Keywords:",
            "Analyze these notes as a whole. Cluster related keywords and synthesize unified, multi-keyword statements instead of one line per keyword:",
        ]
        for ck in contextual_keywords:
            kw = ck.get("keyword", "")
            ctx = ck.get("user_context", "")
            if ctx:
                lines.append(f"- Keyword: \"{kw}\" | Candidate Context/Experience: {ctx}")
            else:
                lines.append(f"- Keyword: \"{kw}\"")
        contextual_section = "\n".join(lines)

    try:
        prompt = _PROMPT.format(
            format_rule=format_rule,
            tone_desc=tone_desc,
            cv_text=cv_text[:5000],
            job_title=jd_data.get("job_title", "N/A"),
            keywords=selected_keywords,
            requirements=jd_data.get("required_skills", [])[:10],
            contextual_section=contextual_section,
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
