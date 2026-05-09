"""Utility: parse uploaded CV files (PDF, TXT, TEX, MD)."""
import os
import pdfplumber


def parse_file(filepath: str, filename: str) -> dict:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return _parse_pdf(filepath)
    elif ext in (".tex", ".txt", ".md"):
        return _parse_text(filepath, ext)
    raise ValueError(f"Unsupported file type: {ext}")


def _parse_pdf(filepath: str) -> dict:
    text = ""
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n\n"
    return {"text": text.strip(), "format": "pdf", "is_latex": False}


def _parse_text(filepath: str, ext: str) -> dict:
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    return {"text": content, "format": ext.lstrip("."), "is_latex": ext == ".tex"}
