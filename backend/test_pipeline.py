import os
import time
import requests
import json

BASE_URL = "http://localhost:5000/api"
CV_PATH = r"c:\Users\Raj PC\Documents\AI projects\ATS-CV-Optimiser\example\cv example\cv_optimized (1).tex"

def main():
    print("1. Testing Health...")
    r = requests.get(f"{BASE_URL}/health")
    print(r.json())
    
    print("\n2. Uploading CV...")
    with open(CV_PATH, 'rb') as f:
        r = requests.post(f"{BASE_URL}/upload-cv", files={"file": f})
    
    cv_resp = r.json()
    if 'error' in cv_resp:
        print("Upload Error:", cv_resp)
        return
    print("Parsed successfully!")
    cv_text = cv_resp["text"]
    is_latex = cv_resp["is_latex"]
    
    print("\n3. Starting Pipeline...")
    jd_text = """
    Software Engineer
    Required Skills: Python, React, AWS, Docker, Kubernetes.
    Experience: 3+ years in backend development.
    """
    
    start_payload = {
        "cv_text": cv_text,
        "is_latex": is_latex,
        "jd_text": jd_text,
        "preferences": {
            "tone": "balanced",
            "coverLetterStyle": "professional"
        }
    }
    
    r = requests.post(f"{BASE_URL}/pipeline/start", json=start_payload)
    start_resp = r.json()
    if 'error' in start_resp:
        print("Pipeline Start Error:", start_resp)
        return
    
    sid = start_resp["session_id"]
    print("Session ID:", sid)
    
    print("\n4. Waiting for Phase 1 to finish (polling results)...")
    while True:
        r = requests.get(f"{BASE_URL}/pipeline/results/{sid}")
        status = r.json().get("status")
        print(f"Status: {status}")
        if status == "awaiting_keywords":
            break
        elif status == "error":
            print("Pipeline Error:", r.json())
            return
        time.sleep(2)
        
    print("\n5. Getting Gap Data & Resuming Phase 2...")
    res = requests.get(f"{BASE_URL}/pipeline/results/{sid}").json()
    gap_data = res.get("gap_data", {})
    critical_kws = [k["keyword"] for k in gap_data.get("missing_critical_keywords", [])]
    
    print(f"Adding keywords: {critical_kws}")
    r = requests.post(f"{BASE_URL}/pipeline/resume/{sid}", json={"selected_keywords": critical_kws})
    print("Resume response:", r.json())
    
    print("\n6. Waiting for Phase 2 to finish...")
    while True:
        r = requests.get(f"{BASE_URL}/pipeline/results/{sid}")
        status = r.json().get("status")
        print(f"Status: {status}")
        if status == "complete":
            break
        elif status == "error":
            print("Pipeline Error:", r.json())
            return
        time.sleep(2)
        
    print("\n7. Final Results summary:")
    final = requests.get(f"{BASE_URL}/pipeline/results/{sid}").json()
    
    print("Old Score:", gap_data.get("overall_score"))
    print("New Score:", final.get("rewrite_result", {}).get("new_score_estimate"))
    print("Cover Letter snippet:", final.get("cover_letter", {}).get("cover_letter", "")[:100], "...")
    print("SUCCESS!")

if __name__ == "__main__":
    main()
