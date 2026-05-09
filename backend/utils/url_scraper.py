"""Utility: scrape job description text from a URL."""
import requests
from bs4 import BeautifulSoup

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}
_LINKEDIN_DOMAINS = ("linkedin.com", "www.linkedin.com")


def scrape_job_url(url: str) -> dict:
    if any(d in url for d in _LINKEDIN_DOMAINS):
        return {
            "success": False, "text": "",
            "warning": (
                "LinkedIn blocks automated scraping. "
                "Please copy and paste the job description text directly."
            ),
        }
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "header", "footer"]):
            tag.decompose()

        text = ""
        for sel in [".job-description", ".job-details", "#job-description",
                    "[class*='description']", "article", "main"]:
            el = soup.select_one(sel)
            if el:
                text = el.get_text("\n", strip=True)
                if len(text) > 200:
                    break

        if len(text) < 200:
            text = soup.get_text("\n", strip=True)

        lines = [l.strip() for l in text.splitlines() if l.strip()]
        return {"success": True, "text": "\n".join(lines)[:8000], "warning": None}

    except requests.RequestException as e:
        return {"success": False, "text": "", "warning": f"Failed to fetch URL: {e}"}
