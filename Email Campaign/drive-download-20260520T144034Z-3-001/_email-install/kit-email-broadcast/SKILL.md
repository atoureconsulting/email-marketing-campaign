---
name: kit-email-broadcast
description: Draft, target, and schedule email broadcasts in Kit (ConvertKit) via API
user-invocable: true
argument-hint: "Draft 2 promo emails for [client], push to Kit as drafts"
---

# Kit Email Broadcast Skill

Draft email broadcasts, set audience tags, add hyperlinks, and schedule sends in Kit directly via API. Supports both Kit v4 API and v3 API with automatic fallback.

## When to Use
- User says "draft emails in Kit", "schedule a broadcast", "push emails to Kit", "create Kit emails"
- User wants to write email copy and push it into Kit as drafts or scheduled broadcasts
- User wants to target a specific tag/segment for a broadcast

## Prerequisites

### API Keys
Check `.env` for Kit credentials. This skill supports two API versions:

**v4 API (preferred):**
```
KIT_V4_API_KEY=kit_...
```
Find at: Kit > Settings > Developer > API Keys. Starts with `kit_`.

**v3 API (fallback if v4 token expires):**
```
KIT_V3_API_KEY=your_api_key_here
KIT_V3_API_SECRET=your_api_secret_here
```
Find at: Kit > Settings > Advanced > API & Webhooks.

For multi-client setups, append the client name:
```
KIT_V4_API_KEY_CLIENTNAME=kit_...
KIT_V3_API_SECRET_CLIENTNAME=...
```

If the key is missing, tell the user where to find it and have them add it to `.env`.

### Python Dependencies
```bash
pip install requests python-dotenv
```

### Client Context
Load the client's voice/ICP profile from `Clients/{client-slug}/knowledge.md` before writing copy. Also load any files in `Clients/{client-slug}/context/`. If no profile exists, ask the user for tone/voice guidance.

### Email Copywriting Rules
Read `Context/Marketing/copy-rules.md` before writing any email. Hard rules:
1. NEVER use em dashes (except sign-off "- [NAME]")
2. NEVER speak impersonally. Always 1-on-1 voice.
3. NEVER use bare link placeholders. Write hyperlink-ready text with `<a href="URL">link text</a>`.
4. ALWAYS start every email body with the subscriber first name variable.

---

## Step-by-Step Process

### Step 1: Write the Email Copy
- Load client voice profile
- Load copy quality rules
- Write emails matching client voice, applying all hard rules
- Every email MUST start with the first name variable as its first paragraph
- Present copy to user for approval before pushing to Kit

### Step 2: Get Tag and Schedule Info
Ask user (if not already provided):
- Which tag/segment should receive this email? (or send to all?)
- When should it send? (date + time + timezone) Or leave as draft?

### Step 3: Push to Kit
**Try v4 first. If v4 returns 401 (invalid/expired token), fall back to v3 automatically.**

---

## V4 API (Preferred)

### Authentication
```python
headers = {
    'X-Kit-Api-Key': V4_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}
```

### Test Auth
```python
r = requests.get('https://api.kit.com/v4/account', headers=headers)
if r.status_code != 200:
    print("V4 auth failed, falling back to v3...")
```

### Create Broadcast (v4)

**CRITICAL: Use Kit's native content format.** This is the ONLY format that renders with proper styling (Arial, 16px, #3D3D3D).

```python
# Kit's required style tags (copy exactly)
STYLE = '<style data-no-inline="true">@media only screen { .email * { word-break: break-word; } }@media screen and (max-width: 384px) { .mail-message-content { width: 414px !important; } }.ck-link { text-decoration: underline; }</style><style>@media only screen and (max-width:600px) { .ck-mobile-font-size { font-size:50px !important; }  } </style>'

def kit_format_v4(paragraphs):
    """Convert list of paragraph strings into Kit's native HTML format.
    Each paragraph becomes a <p class=""> tag inside Kit's table wrapper.
    Use HTML entities: &#x27; for apostrophes, &quot; for quotes, &amp; for &
    """
    ps = ''.join(f'<p class="">{p}</p>' for p in paragraphs)
    return STYLE + '<table cellPadding="0" cellSpacing="0" style="width:100%;margin:0 auto"><tbody><tr><td>' + ps + '<p class="">\u200b</p></td></tr></tbody></table>'

# Build paragraph list - first paragraph is ALWAYS the name variable
paragraphs = [
    '{{ subscriber.first_name | default: &quot;Hey&quot; | truncatewords: 1, &quot;&quot; | capitalize }},',
    'First line of email body here.',
    'Second paragraph here.',
    # ... more paragraphs
    '<a href="https://example.com/register">Register for the free masterclass here.</a>',
    '- Creator Name',
]

content = kit_format_v4(paragraphs)

r = requests.post('https://api.kit.com/v4/broadcasts', headers=headers, json={
    'subject': 'Email subject here',
    'content': content,
    'public': False,
    'email_template_id': TEMPLATE_ID  # Look up per client (see below)
})
broadcast_id = r.json()['broadcast']['id']
```

**Subject Line Rules (v4):**
- Subject lines are PLAIN TEXT, not HTML. Never use HTML entities in subjects.
- Use literal characters: apostrophes (`'`), quotes (`"`), ampersands (`&`)
- Wrong: `3 things you&#x27;re wondering` / Right: `3 things you're wondering`

**Content (Body) Format Rules:**
- Wrap ALL content in Kit's style tags + table structure (see above)
- Each paragraph = one `<p class="">` tag
- First paragraph = subscriber first name variable (ALWAYS)
- Last content paragraph = sign-off `- Creator Name`
- Add trailing `<p class="">\u200b</p>` (zero-width space, matches Kit's native format)
- Use HTML entities IN BODY ONLY: `&#x27;` for `'`, `&quot;` for `"`, `&amp;` for `&`
- Bold text: wrap in `<strong>` tags inside `<p>` tags
- Hyperlinks: use `<a href="URL">link text</a>` inside `<p>` tags

### Set Audience Tag Filter (v4)
```python
# Look up tag ID first
r = requests.get('https://api.kit.com/v4/tags', headers=headers)
tag_id = ...  # find matching tag

# Include only subscribers with this tag
tag_filter = [{'all': [{'type': 'tag', 'ids': [tag_id]}]}]

# Apply filter
r = requests.put(f'https://api.kit.com/v4/broadcasts/{broadcast_id}', headers=headers, json={
    'content': content,
    'subject': subject,
    'public': False,
    'subscriber_filter': tag_filter
})
```

**CRITICAL: Only ONE filter type per group.** Kit returns error "Only a single filter group is supported" if you combine `all` + `none` in the same group object. Use ONE of:
- `all`: Logical AND (subscriber must match ALL tags)
- `any`: Logical OR (subscriber matches at least one)
- `none`: Logical NOT (exclude subscribers with these tags)

Do NOT pass `None`/`null` for unused keys. Omit them entirely.

### Schedule the Send (v4)
```python
# Convert user's time to UTC ISO8601
r = requests.put(f'https://api.kit.com/v4/broadcasts/{broadcast_id}', headers=headers, json={
    'content': content,
    'subject': subject,
    'public': False,
    'send_at': '2026-03-03T11:00:00Z'  # 6am EST = 11:00 UTC
})
```

### Look Up Template ID (v4)
```python
# Check an existing broadcast for its template ID
r = requests.get('https://api.kit.com/v4/broadcasts', headers=headers)
# Look at any broadcast's email_template.id field
# Note it in client's knowledge.md for future use
```

### V4 Endpoints
| Action | Method | URL |
|--------|--------|-----|
| List broadcasts | GET | `https://api.kit.com/v4/broadcasts` |
| Get broadcast | GET | `https://api.kit.com/v4/broadcasts/{id}` |
| Create broadcast | POST | `https://api.kit.com/v4/broadcasts` |
| Update broadcast | PUT | `https://api.kit.com/v4/broadcasts/{id}` |
| Delete broadcast | DELETE | `https://api.kit.com/v4/broadcasts/{id}` |
| List tags | GET | `https://api.kit.com/v4/tags` |
| List subscribers | GET | `https://api.kit.com/v4/subscribers` |

---

## V3 API (Fallback)

Use this when v4 returns 401 (expired token). The v3 API uses the API secret for authentication.

### Test Auth
```python
r = requests.get(f'https://api.convertkit.com/v3/account?api_secret={API_SECRET}')
if r.status_code == 200:
    print("V3 auth works")
```

### Create Broadcast (v3)

v3 uses simpler HTML. No Kit-native format wrapper needed. Just use `<p>` tags.

```python
content = """<p>{{ subscriber.first_name | default: "Hey" | truncatewords: 1, "" | capitalize }},</p>

<p>First paragraph here.</p>

<p>Second paragraph here.</p>

<p><a href="https://example.com/register">Register for the free masterclass here.</a></p>

<p>- Creator Name</p>"""

r = requests.post('https://api.convertkit.com/v3/broadcasts', json={
    'api_secret': API_SECRET,
    'subject': 'your subject line here',
    'content': content,
    'description': 'Optional internal description for Kit dashboard',
    'public': False
})
broadcast_id = r.json()['broadcast']['id']
```

**v3 Important Notes:**
- Do NOT pass `email_layout_template` unless you know the exact template ID exists in v3. Omit it entirely for default styling.
- Subject lines use literal characters (same as v4)
- Body content can use simple HTML `<p>` tags and `<a href="">` links
- The `description` field is optional but useful for organizing drafts in the Kit dashboard

### V3 Endpoints
| Action | Method | URL |
|--------|--------|-----|
| Create broadcast | POST | `https://api.convertkit.com/v3/broadcasts` |
| List broadcasts | GET | `https://api.convertkit.com/v3/broadcasts?api_secret={secret}` |
| Get broadcast | GET | `https://api.convertkit.com/v3/broadcasts/{id}?api_secret={secret}` |
| Account info | GET | `https://api.convertkit.com/v3/account?api_secret={secret}` |

---

## Auto-Fallback Pattern

Use this in your script to automatically try v4, then fall back to v3:

```python
import requests, os, json
from dotenv import load_dotenv
load_dotenv()

V4_KEY = os.getenv("KIT_V4_API_KEY")
V3_KEY = os.getenv("KIT_V3_API_KEY")
V3_SECRET = os.getenv("KIT_V3_API_SECRET")

def try_v4_auth():
    if not V4_KEY:
        return False, None
    headers = {'X-Kit-Api-Key': V4_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json'}
    r = requests.get('https://api.kit.com/v4/account', headers=headers)
    return r.status_code == 200, headers

def try_v3_auth():
    if not V3_SECRET:
        return False
    r = requests.get(f'https://api.convertkit.com/v3/account?api_secret={V3_SECRET}')
    return r.status_code == 200

def create_broadcast(subject, body_html, description=""):
    """Create a Kit broadcast draft. Tries v4 first, falls back to v3."""
    # Try v4
    ok, headers = try_v4_auth()
    if ok:
        r = requests.post('https://api.kit.com/v4/broadcasts', headers=headers, json={
            'subject': subject,
            'content': body_html,
            'public': False
        })
        if r.status_code in [200, 201]:
            b = r.json()['broadcast']
            print(f"SUCCESS (v4): ID {b['id']} - '{subject}'")
            return {"id": b['id'], "api": "v4", "status": "draft created"}
        else:
            print(f"v4 create failed: {r.status_code} - {r.text[:200]}")

    # Fall back to v3
    if try_v3_auth():
        r = requests.post('https://api.convertkit.com/v3/broadcasts', json={
            'api_secret': V3_SECRET,
            'subject': subject,
            'content': body_html,
            'description': description,
            'public': False
        })
        if r.status_code in [200, 201]:
            b = r.json()['broadcast']
            print(f"SUCCESS (v3): ID {b['id']} - '{subject}'")
            return {"id": b['id'], "api": "v3", "status": "draft created"}
        else:
            print(f"v3 create failed: {r.status_code} - {r.text[:200]}")

    print("FAILED: Both v4 and v3 auth failed. Check your API keys in .env")
    return {"status": "failed", "error": "Both v4 and v3 auth failed"}
```

---

## Timezone Conversion (Common)
| Timezone | UTC Offset | 6am local = UTC |
|----------|-----------|-----------------|
| EST | -5 | 11:00 |
| CST | -6 | 12:00 |
| MST | -7 | 13:00 |
| PST | -8 | 14:00 |
| GMT | +0 | 06:00 |
| CET | +1 | 05:00 |
| AEST | +10 | 20:00 (prev day) |

---

## Key Principles
- Try v4 API first, auto-fallback to v3 if auth fails
- Always create as **drafts** unless user explicitly says to schedule
- Always start emails with the subscriber first name variable
- Never send a broadcast without user confirmation
- Keep broadcasts in draft until user explicitly approves scheduling
- Report broadcast IDs and status after pushing

## Output Format
After completing, report:
- Broadcast ID(s)
- Subject line(s)
- API version used (v4 or v3)
- Status (draft / scheduled with send time in user's timezone + UTC)
- Target audience (tag name + ID, if set)
- Reminder: check Kit editor to confirm formatting before sending
