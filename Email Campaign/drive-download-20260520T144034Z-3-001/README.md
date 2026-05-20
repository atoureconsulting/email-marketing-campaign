# AI Email Copywriter — Claude Code Add-On

> Write emails in any client's voice and push them to Kit (ConvertKit) as drafts. All from your terminal.

## What This Does

This add-on turns Claude Code into a full email copywriting agent that:

1. **Learns your client's voice** from real examples you provide during setup
2. **Writes emails that sound like them** following strict anti-AI copy rules
3. **Pushes drafts directly to Kit** via API (v4 with automatic v3 fallback), ready to review and send

## What's Included

```
_email-install/                   ← Staging folder (Prompt 0 moves these to the right places)
  kit-email-broadcast/
    SKILL.md                      ← Kit API skill (formatting, auth, endpoints, scheduling)
    scripts/
      kit_broadcast.py            ← Production Python script with v4/v3 auto-fallback
  routing-email.md                ← Auto-loaded routing rules for email tasks
  copy-rules.md                   ← Anti-AI copy quality rules (banned phrases, patterns, etc.)
  knowledge-template.md           ← Template for client profiles
  TROUBLESHOOTING.md              ← Common errors + fixes (Claude Code self-references this)
  example-client/
    knowledge.md                  ← Fictional example showing what a completed profile looks like
PROMPTS.md                        ← The 4 prompts you paste into Claude Code
CONSULTANT.md                     ← Paste into claude.ai for step-by-step installation help
README.md                         ← You're reading this
```

## Installation (5 Minutes)

### Prerequisites
- An IDE with Claude Code installed (VS Code, Antigravity, Cursor, etc.)
- A Kit (ConvertKit) account with API access
- Python 3 installed

### Person A: You already have a Claude Code workspace

1. Extract this zip
2. Copy `_email-install/`, `PROMPTS.md`, and `CONSULTANT.md` into your workspace root
   - This does NOT touch your existing `.claude/` folder — Prompt 0 handles the merge safely
3. Open your workspace in your IDE
4. Open `PROMPTS.md`, copy **Prompt 0**, paste into Claude Code
5. It reads from `_email-install/`, creates directories if needed, copies files into `.claude/skills/`, `.claude/rules/`, `Context/`, and `Clients/` without overwriting anything

### Person B: Starting from scratch

1. Download the baseline workspace (link in video description)
2. Extract this zip
3. Copy `_email-install/`, `PROMPTS.md`, and `CONSULTANT.md` into the baseline workspace root
4. Open the workspace in your IDE
5. Open `PROMPTS.md`, copy **Prompt 0**, paste into Claude Code
6. Same safe installation process

### After Installation

- Copy **Prompt 1A** (for a client) or **Prompt 1B** (for yourself) → set up a voice profile
- Copy **Prompt 2** → write emails and push to Kit (fill in the brief, paste, approve, done)

### Need Help?

If you get stuck at any point, open a new chat on [claude.ai](https://claude.ai) and paste the entire contents of `CONSULTANT.md` as your first message. It turns Claude into a step-by-step installation guide that walks you through every phase and troubleshoots errors.

## Tips

- **More voice examples = better output.** During client setup, paste real emails, captions, video transcripts. 3+ examples minimum.
- **Always review in Kit before sending.** Emails are created as drafts. Check the Kit editor for formatting.
- **v4 tokens can expire.** The system auto-falls back to v3. If both fail, regenerate keys in Kit settings.
- **Test your connection anytime:** `python .claude/skills/kit-email-broadcast/scripts/kit_broadcast.py test`
- **One workspace, unlimited clients.** Each client gets their own folder. Specify which client when writing emails.
- **The `_email-install/` folder can be deleted** after Prompt 0 finishes successfully. The files are now in their correct locations.
