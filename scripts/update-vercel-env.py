import json, urllib.request, urllib.parse

AUTH_PATH = r"C:\Users\Informatica\AppData\Roaming\com.vercel.cli\Data\auth.json"
TEAM_ID = "team_CcgymjMCsecPMFJuSS8fZwbq"
PROJECT_ID = "prj_Zvyznizyv7wKhJvkrCLbdYVfziMj"

NEW_VARS = {
    "NEXT_PUBLIC_SUPABASE_URL": "https://omiodzulmcytponkhras.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9taW9kenVsbWN5dHBvbmtocmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDY2MzYsImV4cCI6MjA5MjI4MjYzNn0.i8vIBm7p6zwCf1OjReCGqx94JYMjxDMPJ0-auJ3Wssk",
    "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9taW9kenVsbWN5dHBvbmtocmFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjcwNjYzNiwiZXhwIjoyMDkyMjgyNjM2fQ.Zdqnc3R12NFZDUL-VNTX_5EpwgmmTdmlsc1hvSCgEuw",
}

with open(AUTH_PATH) as f:
    token = json.load(f)["token"]

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def api(method, path, body=None):
    url = f"https://api.vercel.com{path}?teamId={TEAM_ID}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

# Get existing env vars
print("Fetching current env vars...")
result = api("GET", f"/v10/projects/{PROJECT_ID}/env")
existing = {e["key"]: e["id"] for e in result.get("envs", []) if "SUPABASE" in e["key"]}
print(f"Found existing SUPABASE vars: {list(existing.keys())}")

# Delete old ones and create new ones
for key, var_id in existing.items():
    print(f"  Deleting {key} ({var_id})...")
    try:
        req = urllib.request.Request(
            f"https://api.vercel.com/v10/projects/{PROJECT_ID}/env/{var_id}?teamId={TEAM_ID}",
            headers=headers, method="DELETE"
        )
        urllib.request.urlopen(req)
        print(f"  OK Deleted {key}")
    except Exception as e:
        print(f"  ERR Error deleting {key}: {e}")

# Create new env vars for all environments
targets = ["production", "preview", "development"]
for key, value in NEW_VARS.items():
    print(f"  Creating {key}...")
    try:
        body = {"key": key, "value": value, "type": "encrypted", "target": targets}
        api("POST", f"/v10/projects/{PROJECT_ID}/env", body)
        print(f"  OK Created {key}")
    except Exception as e:
        print(f"  ERR Error creating {key}: {e}")

print("\nDONE Env vars updated!")
