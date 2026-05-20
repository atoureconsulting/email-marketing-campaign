# Email Copywriter — Troubleshooting

> Claude Code: read this file when you encounter errors during email copywriting tasks.
> This covers the most common failure modes and their fixes.

---

## Installation Issues

### "_email-install/ folder not found"
The user hasn't placed the staging folder in the workspace root. Ask them to:
1. Re-extract the email-copywriter zip
2. Copy the `_email-install/` folder into the root of their workspace (same level as `.claude/` or `CLAUDE.md`)

### "File already exists, skipping" during installation
This is expected for Person A (existing workspace). It means they already have a file at that path. No action needed unless they want to update it, in which case they should manually delete the old file and re-run Prompt 0.

---

## Python Environment Issues

### "python: command not found" / "python3: command not found"
Different OS conventions:
- **Windows:** Use `py` instead of `python`
- **Mac/Linux:** Use `python3` instead of `python`
- **Detection:** Run `py --version 2>/dev/null || python3 --version 2>/dev/null || python --version 2>/dev/null` to find which works

### "ModuleNotFoundError: No module named 'requests'" or 'dotenv'
Dependencies not installed. Run one of:
- `pip install requests python-dotenv`
- `pip3 install requests python-dotenv`
- `py -m pip install requests python-dotenv` (Windows fallback)
- `python3 -m pip install requests python-dotenv` (Mac fallback)

If pip itself isn't found, the user needs to install Python with pip included (check "Add to PATH" on Windows installer).

---

## Kit API Authentication Issues

### "Both v4 and v3 auth failed"
Check in order:
1. Is `.env` in the workspace root? Run `cat .env` to verify.
2. Are the keys still placeholder values? ("kit_your_v4_key_here" = not configured)
3. Are there extra spaces or quotes around the values? Wrong: `KIT_V4_API_KEY = "kit_abc"` / Right: `KIT_V4_API_KEY=kit_abc`
4. Is the .env file actually being loaded? The script resolves .env from the workspace root (two directories up from the script location). Check if the path is correct.

### "v4 auth failed: 401"
The v4 token has expired. This happens periodically. Two options:
1. Regenerate the v4 token at Kit > Settings > Developer > API Keys, update .env
2. Set up v3 keys as fallback (Kit > Settings > Advanced > API & Webhooks). The system auto-falls back.

### "v3 auth failed" but v4 works (or vice versa)
This is fine. Only one API version needs to work. The auto-fallback handles it.

### "Email layout template not found" (v3 only)
The script tried to pass a template ID that doesn't exist in v3. This shouldn't happen with the bundled script (it omits template_id for v3), but if the user wrote custom code, they need to remove the `email_layout_template` parameter from v3 API calls.

---

## Email Writing Issues

### Claude Code can't find the client's knowledge.md
Check:
1. Does `Clients/{client-slug}/` exist? Run `ls Clients/` to see available clients.
2. Is the slug correct? Slugs are lowercase-hyphenated (e.g., "john-smith", not "John Smith").
3. Was Prompt 1A/1B run for this client? If not, run it first.

### Emails sound generic / don't match the client's voice
The voice profile needs more examples. Ask the user to:
1. Open `Clients/{client-slug}/knowledge.md`
2. Add more voice examples to the "Voice Examples" section (paste real emails, captions, video transcripts)
3. Add more entries to "Words/Phrases to USE" and "Words/Phrases to NEVER USE"
4. Re-run the email writing prompt

### Emails contain em dashes, "game-changer", or other banned patterns
Claude Code should be loading `Context/Marketing/copy-rules.md` before writing. Check:
1. Does the file exist? Run `cat Context/Marketing/copy-rules.md | head -5`
2. Is `.claude/rules/routing-email.md` present? This auto-triggers copy rule loading.
3. If both exist and the issue persists, explicitly remind Claude Code: "Re-read Context/Marketing/copy-rules.md and rewrite without any banned patterns."

---

## Kit Broadcast Issues

### Drafts created but formatting looks wrong in Kit
- **v4 broadcasts:** Should render perfectly with Kit's native HTML format (Arial, 16px, styled paragraphs). If not, the content wasn't wrapped in the Kit style tags. Check that `format_v4()` was used.
- **v3 broadcasts:** Use simpler HTML that inherits the Kit template's default styling. Some visual differences are expected. Edit in Kit's visual editor if needed.

### Can't find the broadcast in Kit dashboard
1. Go to Kit > Broadcasts > Drafts tab (not "Sent")
2. If scheduled, check the Scheduled tab
3. The broadcast ID is reported after creation. Search by subject line.
4. Make sure you're logged into the correct Kit account (relevant for multi-client setups)

### "Only a single filter group is supported" (v4 tag filter error)
The subscriber_filter was built with both `all` and `none` in the same group object. Use only ONE filter type per group:
- Include: `[{"all": [{"type": "tag", "ids": [TAG_ID]}]}]`
- Exclude: `[{"none": [{"type": "tag", "ids": [TAG_ID]}]}]`
Never combine them in one object.

---

## .env Path Resolution

The `kit_broadcast.py` script resolves `.env` by walking up from its own location to find the workspace root. It looks for `.env` in these locations (in order):
1. The workspace root (detected by looking for `.claude/` or `CLAUDE.md` or `.env` in parent directories)
2. The current working directory
3. Two directories up from the script itself (`.claude/skills/kit-email-broadcast/scripts/` → workspace root)

If none of these find `.env`, the script reports "No .env file found" with the paths it checked.
