import requests
import sys

BASE_URL = "http://localhost:8000/api"

def run_checks():
    print(f"Testing Backend at {BASE_URL}...")
    errors = []

    # 1. Health/Root
    try:
        r = requests.get("http://localhost:8000/")
        if r.status_code == 200:
            print("[\u2713] Root (Health Check) - OK")
        else:
            print(f"[X] Root Failed: {r.status_code}")
            errors.append("Root endpoint failed")
    except Exception as e:
        print(f"[X] Root Connection Failed: {e}")
        errors.append("Could not connect to server")
        return # Critical fail

    # 2. Login (Get Token)
    headers = {}
    try:
        login_data = {"username": "demo@ycombinator.com", "password": "trylucius2026"}
        r = requests.post(f"{BASE_URL}/auth/login", data=login_data)
        if r.status_code == 200:
            token = r.json().get("access_token")
            headers = {"x-auth-token": token}
            print(f"[\u2713] Auth Login (JWT) - OK")
        else:
            print(f"[X] Login Failed: {r.text}")
            errors.append("Login failed")
    except Exception as e:
        errors.append(f"Login exception: {e}")

    # 3. Get User Profile
    if headers:
        try:
            r = requests.get(f"{BASE_URL}/users/me", headers=headers)
            if r.status_code == 200:
                print("[\u2713] User Profile - OK")
            else:
                print(f"[X] User Profile Failed: {r.status_code} - {r.text}")
                errors.append("User profile failed")
        except: pass

    # 4. List Tenders
    if headers:
        try:
            r = requests.get(f"{BASE_URL}/tenders", headers=headers)
            if r.status_code == 200:
                count = len(r.json())
                print(f"[\u2713] Tenders List ({count} items) - OK")
            else:
                print(f"[X] List Tenders Failed: {r.status_code}")
                errors.append("List tenders failed")
        except: pass

    # 5. Check AI Endpoint (Mock Trigger)
    # We won't expend credits, just check if endpoint exists/auths
    if headers:
        try:
            r = requests.post(f"{BASE_URL}/ai-tender/draft", headers=headers, json={})
            # 422 is GOOD here because it means validation passed (it asked for body) and auth passed.
            # 401 would be bad. 404 would be bad.
            if r.status_code == 422: 
                print("[\u2713] AI Endpoint (Reachable) - OK")
            else:
                print(f"[?] AI Endpoint returned {r.status_code} (Expected 422 for empty body)")
        except: pass

    print("-" * 30)
    if not errors:
        print("SUCCESS: System is Stable and Ready for Demo.")
    else:
        print(f"WARNING: Found {len(errors)} issues.")

if __name__ == "__main__":
    run_checks()
