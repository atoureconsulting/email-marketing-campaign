# Email Copywriting Routing

When the user mentions any of these triggers, follow the corresponding workflow:

| Trigger | Action |
|---------|--------|
| "write emails", "draft emails", "email copy", "broadcast emails" | Load client knowledge.md + context files > Load Context/Marketing/copy-rules.md > Write emails > Present for approval |
| "push to Kit", "draft in Kit", "schedule broadcast", "Kit email" | Load .claude/skills/kit-email-broadcast/SKILL.md > Push emails to Kit API using scripts/kit_broadcast.py |
| "set up client", "new client", "onboard client" | Ask questions group by group > Generate Clients/{slug}/knowledge.md + context files |
| "test Kit", "check Kit connection" | Run the Kit test script (see Python note below) |

## Python Command Detection
Different systems use different Python commands. Before running any Python script, detect which works:
- Try `py` first (Windows)
- Then `python3` (Mac/Linux)
- Then `python` (some systems)
Use whichever one succeeds for all subsequent script calls in the session.

## When Errors Occur
Read `Context/Marketing/TROUBLESHOOTING.md` (if it exists) for common fixes before asking the user for help.

## Always Before Writing Email Copy:
1. Load `Clients/{client-slug}/knowledge.md`
2. Load all files in `Clients/{client-slug}/context/` (if directory exists)
3. Load `Context/Marketing/copy-rules.md`
4. Never fabricate claims, stories, or proof not found in client files

## Copy Quality Hard Rules (all email output):
- NEVER use em dashes (only exception: sign-off "- Name")
- NEVER use banned AI phrases (full list in copy-rules.md)
- NEVER fabricate testimonials, results, or stories
- NEVER write impersonally. Always 1-on-1 voice.
- CHECK for AI patterns: consecutive short sentences, "not just X but Y", triple rhetorical questions

## Email Structure Defaults:
- Opening: Jarring statement, personal story hook, or direct challenge. NEVER generic intros.
- Body: One core idea per email. Short paragraphs (2-4 sentences max). Proof beats claims.
- Closing: Restate core message > Clear CTA (hyperlinked, natural, lowercase) > Optional sign-off.
- ALWAYS start body with subscriber first name variable.
