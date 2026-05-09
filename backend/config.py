import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB
    UPLOAD_FOLDER  = os.path.join(os.path.dirname(__file__), "uploads")
    SECRET_KEY     = os.getenv("SECRET_KEY", "dev-secret-change-me")
    DEBUG          = os.getenv("DEBUG", "true").lower() == "true"
    FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:5173")
