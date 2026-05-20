# Email Copywriter — Setup & Usage Prompts

> 4 prompts. Copy-paste into Claude Code one at a time.
>
> **Prompt 0** — Install: moves files from `_email-install/` into the correct workspace locations (run once).
> **Prompt 1A** — Client Setup: builds a voice profile for a client you write for (run once per client).
> **Prompt 1B** — Self Setup: builds a voice profile for yourself / your own brand (run once).
> **Prompt 2** — Write Emails: writes and pushes email drafts to Kit (run every time).

---

## Which path are you?

**Person A — You already have a Claude Code workspace:**
Drop the `_email-install/` folder and this `PROMPTS.md` into your workspace root. Run Prompt 0. It places files into your existing `.claude/skills/`, `.claude/rules/`, etc. without touching anything you already have.

**Person B — Starting from scratch:**
Download the baseline workspace (link in video description). Drop the `_email-install/` folder and this `PROMPTS.md` into that workspace root. Run Prompt 0.

---

## PROMPT 0: Install (One-Time)

> This reads files from `_email-install/` and copies them to the correct workspace locations.
> It will NOT overwrite any existing files. Safe for workspaces that already have `.claude/` content.

```
I need you to install the email copywriting function into this workspace. The source files are in the `_email-install/` folder at the workspace root. Your job is to copy them into the correct locations.

Do this step by step:

STEP 1 — Verify source files exist. List the _email-install/ directory and confirm these files are present:
- _email-install/kit-email-broadcast/SKILL.md
- _email-install/kit-email-broadcast/scripts/kit_broadcast.py
- _email-install/copy-rules.md
- _email-install/routing-email.md
- _email-install/knowledge-template.md
- _email-install/TROUBLESHOOTING.md
- _email-install/example-client/knowledge.md

If any of the first 5 are missing, STOP and tell me. The last 2 (TROUBLESHOOTING.md and example-client/) are optional but recommended.

STEP 2 — Create target directories (only if they don't already exist):
- .claude/skills/kit-email-broadcast/scripts/
- .claude/rules/
- Context/Marketing/
- Clients/_template/context/
- Clients/_example-alex-torres/

STEP 3 — Copy files to their target locations. For EACH file, check if the target already exists FIRST. If it does, SKIP it and tell me. If it doesn't exist, copy it:
- _email-install/kit-email-broadcast/SKILL.md → .claude/skills/kit-email-broadcast/SKILL.md
- _email-install/kit-email-broadcast/scripts/kit_broadcast.py → .claude/skills/kit-email-broadcast/scripts/kit_broadcast.py
- _email-install/copy-rules.md → Context/Marketing/copy-rules.md
- _email-install/routing-email.md → .claude/rules/routing-email.md
- _email-install/knowledge-template.md → Clients/_template/knowledge.md
- _email-install/TROUBLESHOOTING.md → Context/Marketing/TROUBLESHOOTING.md
- _email-install/example-client/knowledge.md → Clients/_example-alex-torres/knowledge.md

STEP 4 — Configure .env:
- If .env doesn't exist, create one. If .env.example exists in the workspace, copy it to .env first, then proceed.
- Check if .env already contains KIT_V4_API_KEY or KIT_V3_API_SECRET. If not, append these lines:

# Kit (ConvertKit) API Keys
# v4 (preferred): Kit > Settings > Developer > API Keys (starts with kit_)
KIT_V4_API_KEY=kit_your_v4_key_here
# v3 (fallback): Kit > Settings > Advanced > API & Webhooks
KIT_V3_API_KEY=your_v3_api_key_here
KIT_V3_API_SECRET=your_v3_api_secret_here

STEP 5 — Detect the correct Python command for this system. Try these in order and use whichever one works:
- py --version
- python3 --version
- python --version
Remember which one worked. Use it for all Python commands going forward.

STEP 6 — Install Python dependencies using the detected Python command:
[detected python] -m pip install requests python-dotenv

STEP 7 — Test Kit connection:
[detected python] .claude/skills/kit-email-broadcast/scripts/kit_broadcast.py test
(This will fail if keys are still placeholder — that's expected. Just confirm the script runs without import errors.)

STEP 8 — Report:
- Which files were copied successfully
- Which files were skipped (already existed)
- Which Python command works on this system
- Whether .env was created or updated
- Kit connection test result
- Remind me to replace placeholder API keys in .env with my real Kit API keys
- Tell me there's an example client profile at Clients/_example-alex-torres/knowledge.md I can reference to see what a completed profile looks like
- Tell me to run Prompt 1A (for a client) or Prompt 1B (for myself) next
```

---

## PROMPT 1A: Client Setup (One-Time Per Client)

> Use this if you're writing emails for someone else (a client, a brand you manage, etc.).

```
Set up a new email copywriting client for me.

First, read these two files for reference:
1. Clients/_template/knowledge.md — this is the format you'll generate
2. Clients/_example-alex-torres/knowledge.md — this is an example of what a completed profile looks like (use it as a quality reference, but do NOT copy any of its content into the new profile)
3. Context/Marketing/copy-rules.md — the quality rules for all copy

Now ask me these questions ONE GROUP AT A TIME. Wait for my answers before the next group.

GROUP 1 — BASICS:
- Client's name?
- Company/brand name?
- What do they sell?
- Price point?
- Website URL?

GROUP 2 — AUDIENCE:
- Target audience? (age, gender, situation)
- Top 3 pain points?
- Top 3 desires?
- Top 3 objections before buying?

GROUP 3 — VOICE:
- How do they talk? (casual/formal, aggressive/supportive, serious/funny)
- 2-3 real examples of how they write or speak (paste content from emails, captions, videos, podcasts — the more the better)
- Profanity? How much and which words?
- Faith, values, or recurring themes?
- Words/phrases they use a lot?
- Words/phrases to NEVER use?

GROUP 4 — PROOF & STORY:
- Their origin story or transformation?
- Real customer/student results with specifics? (or "none yet")
- Other proof? (years in business, revenue, audience size)

GROUP 5 — EMAIL CONFIG:
- Kit account? (yes/no)
- CTA style? (e.g., hyperlinked "Register here", "DM me on Instagram", etc.)
- Email sign-off? (e.g., "- Sarah", "Talk soon, Mike")
- Webinars/events? (title, URL, cadence)
- Typical send time? (e.g., 6am EST)

After all answers:
1. Create the client folder using their name as a lowercase-hyphenated slug (e.g., "Sarah Kim" → Clients/sarah-kim/)
2. Create Clients/{slug}/context/ subfolder
3. Generate knowledge.md from the template, filled with my real answers — match the quality level of the example profile
4. Create voice-context.md in context/ with detailed voice patterns, examples, tone shifts, and writing rules
5. Create email-rules.md in context/ with email-specific rules (CTA style, sign-off, profanity for email, paragraph length, etc.)
6. Tell me the exact client slug you created (I'll need this for Prompt 2)
7. If client has Kit, check .env for their API key and remind me if missing
8. Show summary of everything created

Never invent info I didn't give you. "None yet" = write "No verified results — do not fabricate."
```

---

## PROMPT 1B: Self Setup (One-Time — If YOU Are the Brand)

> Use this if you're writing emails for yourself / your own business.

```
Set up my own brand as the email copywriting profile.

First, read these two files for reference:
1. Clients/_template/knowledge.md — this is the format you'll generate
2. Clients/_example-alex-torres/knowledge.md — this is an example of what a completed profile looks like (use it as a quality reference, but do NOT copy any of its content into my profile)
3. Context/Marketing/copy-rules.md — the quality rules for all copy

Now ask me these questions ONE GROUP AT A TIME. Wait for my answers before the next group.

GROUP 1 — YOUR BUSINESS:
- Your name (or brand name)?
- What do you sell?
- Price point?
- Website URL?
- What industry are you in?

GROUP 2 — YOUR AUDIENCE:
- Who are you selling to? (age, gender, situation)
- Top 3 pain points your audience has?
- Top 3 things your audience wants most?
- Top 3 objections people have before buying from you?

GROUP 3 — YOUR VOICE:
- How do you naturally talk? (casual/formal, aggressive/supportive, serious/funny)
- Paste 2-3 real examples of how you write — emails you've sent, captions you've posted, anything in your actual voice. The more the better.
- Do you curse in your content? How much and which words?
- Do you reference faith, values, or recurring themes?
- Words or phrases you use a lot?
- Words or phrases you'd NEVER use?

GROUP 4 — YOUR STORY & PROOF:
- What's your origin story? How did you get to where you are?
- Do you have real customer/student results? List them with specifics. (or "none yet")
- Other proof? (years in business, revenue, audience size, media features)

GROUP 5 — EMAIL CONFIG:
- Do you have a Kit (ConvertKit) account? (yes/no)
- How do you like your CTAs? (e.g., hyperlinked "Register here", "DM me", etc.)
- How do you sign off emails? (e.g., "- Alex", "Talk soon", etc.)
- Do you run webinars or events? (title, URL, cadence)
- What time do you usually send emails? (e.g., 6am EST)

After all answers:
1. Create my folder using my name as a lowercase-hyphenated slug (e.g., "Alex Torres" → Clients/alex-torres/)
2. Create Clients/{slug}/context/ subfolder
3. Generate knowledge.md from the template, filled with my answers — match the quality level of the example profile
4. Create voice-context.md in context/ with my voice patterns, examples, tone shifts
5. Create email-rules.md in context/ with my email-specific rules
6. Tell me the exact slug you created (I'll need this for Prompt 2)
7. If I have Kit, check .env for my API key and remind me if missing
8. Show summary of everything created

Never invent info I didn't give you. "None yet" = write "No verified results — do not fabricate."
```

---

## PROMPT 2: Write & Draft Emails

> Run this every time you need emails.
> Replace the ALL CAPS parts with your actual info. If you're not sure what your client slug is, just use the client's name and Claude Code will find the right folder.

```
Write email broadcasts for CLIENT NAME and push them to Kit as drafts.

EMAILS NEEDED: (number)
PURPOSE: (what are these emails for?)
AUDIENCE: (who should receive them?)
ANGLES: (what persuasive angles to use, or say "you choose")
CONSTRAINTS: (any restrictions, or say "none")

Steps:
1. List my Clients/ folder to find the right client directory
2. Load that client's knowledge.md + all files in their context/ folder
3. Load Context/Marketing/copy-rules.md
4. Load .claude/skills/kit-email-broadcast/SKILL.md
5. Write the emails in the client's exact voice, applying all copy rules
6. Show me each email: subject line, preview text, full body — then wait for my approval before doing anything else
7. Once I approve, push them to Kit as drafts using the kit_broadcast.py script
8. Report: broadcast IDs, subject lines, which API version was used, draft status

If any errors occur during the Kit push, read Context/Marketing/TROUBLESHOOTING.md before asking me for help.

Never fabricate claims or stories not in the client's files.
```
