#!/usr/bin/env python3
"""
Deployment script to update the ATS CV Optimizer backend on Google Cloud Run.

Target Service: ats-cv-system
Target Region:  us-central1
Project ID:     cveditor-488108
Live URL:       https://ats-cv-system-515021027820.us-central1.run.app/
"""

import os
import sys
import shutil
import argparse
import subprocess
from pathlib import Path

# --- Configuration Defaults ---
DEFAULT_PROJECT = "cveditor-488108"
DEFAULT_REGION = "us-central1"
DEFAULT_SERVICE = "ats-cv-system"
DEFAULT_SOURCE = "backend"
DEFAULT_TIMEOUT = "600"
DEFAULT_MEMORY = "1Gi"
DEFAULT_CPU = "1"

# ANSI Colors for terminal output
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"


def log_info(msg: str):
    print(f"{CYAN}{BOLD}[INFO]{RESET} {msg}")


def log_success(msg: str):
    print(f"{GREEN}{BOLD}[SUCCESS]{RESET} {msg}")


def log_warning(msg: str):
    print(f"{YELLOW}{BOLD}[WARNING]{RESET} {msg}")


def log_error(msg: str):
    print(f"{RED}{BOLD}[ERROR]{RESET} {msg}")


def get_gcloud_executable() -> str:
    """Find the gcloud executable path on Windows or Unix."""
    gcloud_path = shutil.which("gcloud")
    if not gcloud_path and os.name == "nt":
        # Check standard Windows paths if not in PATH
        candidates = [
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"),
            r"C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
            r"C:\Program Files\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
        ]
        for c in candidates:
            if os.path.exists(c):
                return c
    return gcloud_path or "gcloud"


def parse_env_file(env_path: Path) -> dict:
    """Parse backend/.env without requiring external dependencies."""
    env_vars = {}
    if not env_path.exists():
        log_warning(f"No .env file found at {env_path}")
        return env_vars

    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                env_vars[key] = val
    return env_vars


def run_command(cmd: list, check: bool = True, stream_output: bool = True, cwd: str = None) -> subprocess.CompletedProcess:
    """Run a system command, streaming stdout/stderr in real-time."""
    if stream_output:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
            cwd=cwd,
        )
        output_lines = []
        for line in process.stdout:
            print(line, end="", flush=True)
            output_lines.append(line)
        process.wait()
        if check and process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, cmd, "".join(output_lines))
        return subprocess.CompletedProcess(cmd, process.returncode, "".join(output_lines))
    else:
        return subprocess.run(cmd, check=check, capture_output=True, text=True, cwd=cwd)


def prepare_frontend(root_dir: Path, source_path: Path, skip_build: bool = False):
    """Build React frontend and copy dist into backend/dist so Cloud Run serves the UI."""
    frontend_dir = root_dir / "frontend"
    frontend_dist = frontend_dir / "dist"
    backend_dist = source_path / "dist"

    if not skip_build and frontend_dir.exists():
        npm_bin = shutil.which("npm.cmd") or shutil.which("npm")
        if npm_bin:
            log_info("Building React frontend (npm run build)...")
            try:
                run_command([npm_bin, "run", "build"], cwd=str(frontend_dir), check=True, stream_output=False)
                log_success("Frontend build completed.")
            except Exception as e:
                log_warning(f"Frontend build error: {e}. Checking for existing dist folder...")

    if frontend_dist.exists():
        log_info(f"Syncing frontend dist -> {backend_dist}...")
        if backend_dist.exists():
            shutil.rmtree(backend_dist)
        shutil.copytree(frontend_dist, backend_dist)
        log_success("Frontend static assets bundled into backend deployment.")
    else:
        log_warning("No frontend dist folder found. Cloud Run will only serve API endpoints.")


def check_prerequisites(gcloud_bin: str, project_id: str):
    """Verify that gcloud is authenticated and project is set."""
    log_info("Checking Google Cloud CLI and authentication...")
    try:
        res = run_command([gcloud_bin, "--version"], check=False, stream_output=False)
        if res.returncode != 0:
            log_error("gcloud is installed but returned an error.")
            sys.exit(1)
    except FileNotFoundError:
        log_error("gcloud CLI not found. Please install Google Cloud SDK or ensure it's in your PATH.")
        sys.exit(1)

    # Check active authenticated account
    try:
        auth_res = run_command([gcloud_bin, "auth", "list", "--filter=status:ACTIVE", "--format=value(account)"],
                               check=False, stream_output=False)
        active_account = auth_res.stdout.strip()
        if active_account:
            log_info(f"Authenticated GCP Account: {BOLD}{active_account}{RESET}")
        else:
            log_warning("No active GCP account found. You may need to run: gcloud auth login")
    except Exception as e:
        log_warning(f"Could not verify active account: {e}")

    # Set project
    log_info(f"Configuring active project to: {BOLD}{project_id}{RESET}")
    run_command([gcloud_bin, "config", "set", "project", project_id], check=False, stream_output=False)


def main():
    parser = argparse.ArgumentParser(
        description="Deploy ATS CV Optimizer backend updates to Google Cloud Run."
    )
    parser.add_argument("--project", default=DEFAULT_PROJECT, help=f"GCP Project ID (default: {DEFAULT_PROJECT})")
    parser.add_argument("--region", default=DEFAULT_REGION, help=f"Cloud Run Region (default: {DEFAULT_REGION})")
    parser.add_argument("--service", default=DEFAULT_SERVICE, help=f"Cloud Run Service Name (default: {DEFAULT_SERVICE})")
    parser.add_argument("--source", default=DEFAULT_SOURCE, help=f"Source directory (default: {DEFAULT_SOURCE})")
    parser.add_argument("--timeout", default=DEFAULT_TIMEOUT, help=f"Request timeout in seconds (default: {DEFAULT_TIMEOUT})")
    parser.add_argument("--memory", default=DEFAULT_MEMORY, help=f"Memory allocation (default: {DEFAULT_MEMORY})")
    parser.add_argument("--cpu", default=DEFAULT_CPU, help=f"CPU count (default: {DEFAULT_CPU})")
    parser.add_argument("--dry-run", action="store_true", help="Print the command without executing deployment")
    parser.add_argument("--no-env", action="store_true", help="Do not inject environment variables from backend/.env")
    parser.add_argument("--skip-build", action="store_true", help="Skip npm run build and use existing dist")

    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parent
    source_path = root_dir / args.source
    env_file = source_path / ".env"

    if not source_path.exists():
        log_error(f"Source directory '{source_path}' does not exist.")
        sys.exit(1)

    # Bundle frontend static assets into backend/dist
    if not args.dry_run:
        prepare_frontend(root_dir, source_path, args.skip_build)

    print("=" * 70)
    print(f"{BOLD}{CYAN}  ATS CV Optimizer -- Cloud Run Deployment  {RESET}")
    print("=" * 70)
    print(f"  Service:   {BOLD}{args.service}{RESET}")
    print(f"  Region:    {BOLD}{args.region}{RESET}")
    print(f"  Project:   {BOLD}{args.project}{RESET}")
    print(f"  Source:    {BOLD}{source_path}{RESET}")
    print(f"  Timeout:   {BOLD}{args.timeout}s{RESET}")
    print(f"  Memory:    {BOLD}{args.memory}{RESET}")
    print("=" * 70)

    gcloud_bin = get_gcloud_executable()

    if not args.dry_run:
        check_prerequisites(gcloud_bin, args.project)

    # Collect environment variables to update
    env_vars_to_set = []
    if not args.no_env and env_file.exists():
        parsed = parse_env_file(env_file)
        # Prioritize key backend configuration
        for key in ["GEMINI_API_KEY", "GEMINI_MODEL", "SECRET_KEY"]:
            if key in parsed and parsed[key]:
                env_vars_to_set.append(f"{key}={parsed[key]}")
        # Always set production DEBUG mode
        env_vars_to_set.append("DEBUG=false")

    # Build gcloud run deploy command
    cmd = [
        gcloud_bin, "run", "deploy", args.service,
        "--source", str(source_path),
        "--project", args.project,
        "--region", args.region,
        "--platform", "managed",
        "--allow-unauthenticated",
        "--timeout", args.timeout,
        "--memory", args.memory,
        "--cpu", args.cpu,
    ]

    # Use --update-env-vars to preserve other Cloud Run environment variables (e.g. CV_BUCKET_NAME)
    if env_vars_to_set:
        cmd.extend(["--update-env-vars", ",".join(env_vars_to_set)])

    log_info("Deploy command:")
    # Display safe version masking API key in logs
    safe_cmd_str = " ".join(cmd)
    if "GEMINI_API_KEY=" in safe_cmd_str:
        import re
        safe_cmd_str = re.sub(r"GEMINI_API_KEY=[^, ]+", "GEMINI_API_KEY=********", safe_cmd_str)
    print(f"{YELLOW}{safe_cmd_str}{RESET}\n")

    if args.dry_run:
        log_info("Dry run complete. Exiting without deploying.")
        return

    log_info("Deploying updated backend to Google Cloud Run (this builds via Cloud Build)...")
    try:
        run_command(cmd, check=True, stream_output=True)
        log_success("Deployment completed successfully!")
    except subprocess.CalledProcessError as e:
        log_error(f"Deployment failed with exit code {e.returncode}.")
        sys.exit(e.returncode)

    # Fetch live service details
    try:
        log_info("Retrieving live service URL...")
        url_res = run_command(
            [gcloud_bin, "run", "services", "describe", args.service, "--region", args.region, "--format=value(status.url)"],
            check=False, stream_output=False
        )
        url = url_res.stdout.strip()
        if url:
            print("\n" + "=" * 70)
            log_success(f"App is updated and live at: {BOLD}{url}{RESET}")
            print(f"  Primary access URL: {BOLD}https://{args.service}-515021027820.{args.region}.run.app/{RESET}")
            print("=" * 70 + "\n")
    except Exception as e:
        log_warning(f"Could not retrieve service URL: {e}")


if __name__ == "__main__":
    main()
