"""
Kit (ConvertKit) Broadcast API Client
Usage: Called by Claude Code to push email drafts to Kit.

Supports v4 API (preferred) with automatic v3 fallback.
Reads API keys from .env at workspace root.
"""

import requests
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv


def find_workspace_root():
    """Walk up from script location to find workspace root containing .env.
    
    Checks for markers: .env, .claude/, CLAUDE.md, .env.example
    Falls back to: 4 dirs up from script (covers .claude/skills/skill-name/scripts/)
    """
    script_dir = Path(__file__).resolve().parent
    
    # Walk up looking for workspace markers
    current = script_dir
    for _ in range(6):  # don't go more than 6 levels up
        if (current / ".env").exists():
            return current
        if (current / ".claude").is_dir():
            return current
        if (current / "CLAUDE.md").exists():
            return current
        parent = current.parent
        if parent == current:  # hit filesystem root
            break
        current = parent
    
    # Fallback: 4 dirs up from scripts/ (scripts → skill → skills → .claude → root)
    fallback = script_dir.parent.parent.parent.parent
    if fallback.exists():
        return fallback
    
    return script_dir


# Find workspace root and load .env from there
WORKSPACE_ROOT = find_workspace_root()
env_path = WORKSPACE_ROOT / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    # Try current working directory as last resort
    load_dotenv()
    if not os.getenv("KIT_V4_API_KEY") and not os.getenv("KIT_V3_API_SECRET"):
        print(f"WARNING: No .env found. Checked:")
        print(f"  - {env_path}")
        print(f"  - {Path.cwd() / '.env'}")
        print(f"  Create .env with your Kit API keys at: {WORKSPACE_ROOT}")

# --- Config ---

V4_KEY = os.getenv("KIT_V4_API_KEY")
V3_KEY = os.getenv("KIT_V3_API_KEY")
V3_SECRET = os.getenv("KIT_V3_API_SECRET")

V4_BASE = "https://api.kit.com/v4"
V3_BASE = "https://api.convertkit.com/v3"

# Kit's native HTML style tags for v4 content formatting
KIT_STYLE = (
    '<style data-no-inline="true">'
    "@media only screen { .email * { word-break: break-word; } }"
    "@media screen and (max-width: 384px) { .mail-message-content { width: 414px !important; } }"
    ".ck-link { text-decoration: underline; }"
    "</style>"
    "<style>"
    "@media only screen and (max-width:600px) { .ck-mobile-font-size { font-size:50px !important; } }"
    "</style>"
)

FIRST_NAME_VAR_V4 = '{{ subscriber.first_name | default: &quot;Hey&quot; | truncatewords: 1, &quot;&quot; | capitalize }},'
FIRST_NAME_VAR_V3 = '{{ subscriber.first_name | default: "Hey" | truncatewords: 1, "" | capitalize }},'


# --- Auth ---

def auth_v4():
    """Test v4 API auth. Returns (success: bool, headers: dict)."""
    if not V4_KEY:
        return False, {}
    headers = {
        "X-Kit-Api-Key": V4_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    try:
        r = requests.get(f"{V4_BASE}/account", headers=headers, timeout=10)
        if r.status_code == 200:
            acct = r.json()
            print(f"[v4] Authenticated as: {acct.get('name', acct.get('primary_email_address', 'unknown'))}")
            return True, headers
        else:
            print(f"[v4] Auth failed: {r.status_code}")
            return False, {}
    except Exception as e:
        print(f"[v4] Auth error: {e}")
        return False, {}


def auth_v3():
    """Test v3 API auth. Returns success: bool."""
    if not V3_SECRET:
        return False
    try:
        r = requests.get(f"{V3_BASE}/account?api_secret={V3_SECRET}", timeout=10)
        if r.status_code == 200:
            acct = r.json()
            print(f"[v3] Authenticated as: {acct.get('name', acct.get('primary_email_address', 'unknown'))}")
            return True
        else:
            print(f"[v3] Auth failed: {r.status_code}")
            return False
    except Exception as e:
        print(f"[v3] Auth error: {e}")
        return False


# --- Content Formatting ---

def format_v4(paragraphs):
    """Convert paragraph list into Kit's native v4 HTML format.
    
    Args:
        paragraphs: List of strings. First should be the name variable.
                    Use HTML entities in body: &#x27; for ', &quot; for "
    Returns:
        Formatted HTML string ready for Kit v4 API.
    """
    ps = "".join(f'<p class="">{p}</p>' for p in paragraphs)
    return (
        KIT_STYLE
        + '<table cellPadding="0" cellSpacing="0" style="width:100%;margin:0 auto">'
        + "<tbody><tr><td>"
        + ps
        + '<p class="">\u200b</p>'
        + "</td></tr></tbody></table>"
    )


def format_v3(paragraphs):
    """Convert paragraph list into simple HTML for Kit v3 API.
    
    Args:
        paragraphs: List of strings. First should be the name variable.
                    Use literal characters (no HTML entities needed).
    Returns:
        Simple HTML string ready for Kit v3 API.
    """
    return "\n\n".join(f"<p>{p}</p>" for p in paragraphs)


# --- Broadcast Operations ---

def create_broadcast_v4(headers, subject, content, template_id=None):
    """Create a broadcast draft via v4 API."""
    payload = {
        "subject": subject,
        "content": content,
        "public": False,
    }
    if template_id:
        payload["email_template_id"] = template_id

    r = requests.post(f"{V4_BASE}/broadcasts", headers=headers, json=payload, timeout=15)

    if r.status_code in [200, 201]:
        b = r.json().get("broadcast", r.json())
        return {"id": b["id"], "api": "v4", "status": "draft created", "subject": subject}
    else:
        print(f"[v4] Create failed: {r.status_code} - {r.text[:300]}")
        return None


def create_broadcast_v3(subject, content, description=""):
    """Create a broadcast draft via v3 API."""
    payload = {
        "api_secret": V3_SECRET,
        "subject": subject,
        "content": content,
        "public": False,
    }
    if description:
        payload["description"] = description

    r = requests.post(f"{V3_BASE}/broadcasts", json=payload, timeout=15)

    if r.status_code in [200, 201]:
        b = r.json().get("broadcast", r.json())
        return {"id": b["id"], "api": "v3", "status": "draft created", "subject": subject}
    else:
        print(f"[v3] Create failed: {r.status_code} - {r.text[:300]}")
        return None


def create_broadcast(subject, paragraphs, description="", template_id=None):
    """Create a Kit broadcast draft with automatic v4/v3 fallback.
    
    Args:
        subject: Plain text subject line (no HTML entities).
        paragraphs: List of paragraph strings (first = name variable).
        description: Optional internal description for Kit dashboard.
        template_id: Optional Kit email template ID (v4 only).
    
    Returns:
        dict with id, api version, status, subject — or error dict.
    """
    # Try v4
    ok, headers = auth_v4()
    if ok:
        content = format_v4(paragraphs)
        result = create_broadcast_v4(headers, subject, content, template_id)
        if result:
            return result

    # Fall back to v3
    if auth_v3():
        # v3 uses literal chars, not HTML entities — convert if needed
        v3_paragraphs = [p.replace("&#x27;", "'").replace("&quot;", '"').replace("&amp;", "&") for p in paragraphs]
        # Swap name variable to v3 format
        if v3_paragraphs and "&quot;" not in v3_paragraphs[0] and "subscriber.first_name" in v3_paragraphs[0]:
            pass  # already v3 format
        elif v3_paragraphs:
            v3_paragraphs[0] = FIRST_NAME_VAR_V3

        content = format_v3(v3_paragraphs)
        result = create_broadcast_v3(subject, content, description)
        if result:
            return result

    return {"status": "failed", "error": "Both v4 and v3 auth failed. Check API keys in .env"}


def set_tag_filter_v4(headers, broadcast_id, tag_id, content, subject):
    """Set audience tag filter on a v4 broadcast."""
    tag_filter = [{"all": [{"type": "tag", "ids": [tag_id]}]}]
    r = requests.put(
        f"{V4_BASE}/broadcasts/{broadcast_id}",
        headers=headers,
        json={"content": content, "subject": subject, "public": False, "subscriber_filter": tag_filter},
        timeout=15,
    )
    if r.status_code in [200, 201]:
        print(f"[v4] Tag filter set: tag ID {tag_id}")
        return True
    else:
        print(f"[v4] Tag filter failed: {r.status_code} - {r.text[:200]}")
        return False


def schedule_broadcast_v4(headers, broadcast_id, send_at_utc, content, subject):
    """Schedule a v4 broadcast for a specific UTC time (ISO8601)."""
    r = requests.put(
        f"{V4_BASE}/broadcasts/{broadcast_id}",
        headers=headers,
        json={"content": content, "subject": subject, "public": False, "send_at": send_at_utc},
        timeout=15,
    )
    if r.status_code in [200, 201]:
        print(f"[v4] Scheduled for: {send_at_utc}")
        return True
    else:
        print(f"[v4] Schedule failed: {r.status_code} - {r.text[:200]}")
        return False


def list_tags_v4(headers):
    """List all tags in the Kit account (v4)."""
    r = requests.get(f"{V4_BASE}/tags", headers=headers, timeout=10)
    if r.status_code == 200:
        tags = r.json().get("tags", [])
        for t in tags:
            print(f"  Tag: {t['name']} (ID: {t['id']})")
        return tags
    else:
        print(f"[v4] List tags failed: {r.status_code}")
        return []


def get_template_id_v4(headers):
    """Look up the email template ID from existing broadcasts (v4)."""
    r = requests.get(f"{V4_BASE}/broadcasts", headers=headers, timeout=10)
    if r.status_code == 200:
        broadcasts = r.json().get("broadcasts", [])
        for b in broadcasts:
            tmpl = b.get("email_template", {})
            if tmpl and tmpl.get("id"):
                print(f"  Found template: ID {tmpl['id']} (from broadcast '{b.get('subject', 'unknown')}')")
                return tmpl["id"]
    print("[v4] No template ID found in existing broadcasts")
    return None


# --- CLI Entry Point ---

if __name__ == "__main__":
    """Quick test: python kit_broadcast.py test"""
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        print("Testing Kit API authentication...")
        print()
        ok_v4, _ = auth_v4()
        ok_v3 = auth_v3()
        print()
        if ok_v4:
            print("v4 API: CONNECTED")
        elif ok_v3:
            print("v4 API: FAILED (will use v3 fallback)")
            print("v3 API: CONNECTED")
        else:
            print("BOTH APIs FAILED. Check your .env file:")
            print("  KIT_V4_API_KEY=kit_...")
            print("  KIT_V3_API_SECRET=...")
    else:
        print("Usage: python kit_broadcast.py test")
        print("This script is primarily called by Claude Code, not run directly.")
