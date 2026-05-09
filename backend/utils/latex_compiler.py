"""Utility: compile LaTeX source to PDF using pdflatex."""
import subprocess
import os
import shutil
import tempfile


def compile_latex(latex_source: str) -> dict:
    if not shutil.which("pdflatex"):
        return {
            "success": False, "pdf_bytes": None,
            "error": "pdflatex not found. Install MiKTeX or TeX Live.",
        }
    tmpdir = tempfile.mkdtemp()
    try:
        tex_path = os.path.join(tmpdir, "cv.tex")
        pdf_path = os.path.join(tmpdir, "cv.pdf")
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex_source)

        run_args = [
            "pdflatex", "-interaction=nonstopmode",
            "-output-directory", tmpdir, tex_path,
        ]
        for _ in range(2):  # run twice for cross-references
            result = subprocess.run(
                run_args, capture_output=True, text=True, timeout=60, cwd=tmpdir
            )

        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                return {"success": True, "pdf_bytes": f.read(), "error": None}
        else:
            return {
                "success": False, "pdf_bytes": None,
                "error": result.stdout[-2000:] or "Compilation failed.",
            }
    except subprocess.TimeoutExpired:
        return {"success": False, "pdf_bytes": None, "error": "LaTeX compilation timed out."}
    except Exception as e:
        return {"success": False, "pdf_bytes": None, "error": str(e)}
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
