#!/usr/bin/env node
'use strict';
require('dotenv').config();

const { generateEmail } = require('./generate-email');
const { verify, send }  = require('./mailer');
const fs = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────
const CRM_URL     = process.env.CRM_URL || 'http://localhost:3001';
const CRM_CODE    = process.env.CRM_ACCESS_CODE;
const IONOS_EMAIL = process.env.IONOS_EMAIL;
const FROM_NAME   = process.env.FROM_NAME || 'AToure Consulting';
const DELAY_MS    = parseInt(process.env.EMAIL_DELAY_MS || '4000', 10);

// ── Args ──────────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const SEND_ALL  = args.includes('--all');
const sectorArg = args.find(a => a.startsWith('--sector='));
const SECTORS   = sectorArg
  ? sectorArg.replace('--sector=', '').split(',').map(s => s.trim())
  : [];
const limitArg  = args.find(a => a.startsWith('--limit='));
const LIMIT     = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

// ── Validate ──────────────────────────────────────────────────────────────────
function fail(msg) { console.error(`\n  ✖  ${msg}\n`); process.exit(1); }

if (!CRM_CODE)                      fail('CRM_ACCESS_CODE not set in .env');
if (!IONOS_EMAIL)                   fail('IONOS_EMAIL not set in .env');
if (!process.env.IONOS_PASSWORD)    fail('IONOS_PASSWORD not set in .env');
if (!process.env.ANTHROPIC_API_KEY) fail('ANTHROPIC_API_KEY not set in .env');
if (!SEND_ALL && SECTORS.length === 0) {
  console.log(`
  Usage:
    node send-campaign.js --sector="Hospitality,Fashion"   filter by sector(s)
    node send-campaign.js --all                             all contacts with email
    node send-campaign.js --sector="Media" --limit=3        test with 3 contacts

  Add --dry-run to generate and preview emails without sending them.
  Sectors must match what is stored in your CRM (check the Sector field).
`);
  process.exit(1);
}

// ── CRM ───────────────────────────────────────────────────────────────────────
async function crmAuth() {
  const res  = await fetch(`${CRM_URL}/api/auth`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ code: CRM_CODE }),
  });
  const data = await res.json();
  if (!data.token) fail('CRM auth failed: ' + (data.error || 'no token returned'));
  return data.token;
}

async function fetchContacts(token) {
  const res  = await fetch(`${CRM_URL}/api/contacts?pageSize=500`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  let contacts = (data.contacts || []).filter(c => c.email);

  if (!SEND_ALL && SECTORS.length > 0) {
    const lower = SECTORS.map(s => s.toLowerCase());
    contacts = contacts.filter(c =>
      lower.some(s => (c.sector || '').toLowerCase().includes(s))
    );
  }

  return contacts.slice(0, LIMIT);
}

// ── Util ──────────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 19);

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n  AToure Consulting — Email Campaign Runner');
  console.log('  ' + '─'.repeat(46));
  if (DRY_RUN) console.log('  MODE: DRY RUN — emails generated but not sent\n');

  process.stdout.write('  Authenticating with CRM... ');
  const token = await crmAuth();
  console.log('✓');

  const sectorLabel = SECTORS.length ? `[${SECTORS.join(', ')}]` : '[all sectors]';
  process.stdout.write(`  Fetching contacts ${sectorLabel}... `);
  const contacts = await fetchContacts(token);
  console.log(`✓  ${contacts.length} contact${contacts.length === 1 ? '' : 's'} with email\n`);

  if (contacts.length === 0) {
    console.log('  No contacts matched. Sector names must match what is in your CRM.\n');
    process.exit(0);
  }

  if (!DRY_RUN) {
    console.log(`  About to send ${contacts.length} personalised email${contacts.length === 1 ? '' : 's'} from ${IONOS_EMAIL}`);
    console.log('  Press Ctrl+C within 5 seconds to cancel...\n');
    await sleep(5000);
    process.stdout.write('  Verifying SMTP connection... ');
    await verify();
    console.log('✓\n');
  }

  const log = [];
  let sent = 0, failed = 0;

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const firstName = c.firstName || (c.name || '').split(' ')[0] || '';
    const label     = `${c.name || c.email} (${c.company || c.sector || '—'})`;
    const num       = `[${i + 1}/${contacts.length}]`;

    process.stdout.write(`  ${num} Generating for ${label}... `);

    let subject, body;
    try {
      ({ subject, body } = await generateEmail({
        firstName,
        company: c.company,
        sector:  c.sector,
        city:    c.city,
        notes:   c.notes,
        profile: c.profile,
      }));
      console.log('✓');
    } catch (err) {
      console.log(`✖  ${err.message}`);
      log.push({ status: 'ai-failed', name: c.name, email: c.email, error: err.message });
      failed++;
      continue;
    }

    if (DRY_RUN) {
      const border = '  ' + '─'.repeat(54);
      console.log(border);
      console.log(`  To:      ${c.name} <${c.email}>`);
      console.log(`  Subject: ${subject}`);
      console.log(border);
      console.log(body.split('\n').map(l => '  ' + l).join('\n'));
      console.log(border + '\n');
      log.push({ status: 'preview', name: c.name, email: c.email, subject });
      continue;
    }

    try {
      await send({
        toName:    c.name,
        toEmail:   c.email,
        fromName:  FROM_NAME,
        fromEmail: IONOS_EMAIL,
        subject,
        body,
      });
      console.log(`         [${stamp()}] ✓ sent`);
      log.push({
        status:    'sent',
        name:      c.name,
        email:     c.email,
        company:   c.company,
        subject,
        timestamp: new Date().toISOString(),
      });
      sent++;
    } catch (err) {
      console.log(`         [${stamp()}] ✖ failed: ${err.message}`);
      log.push({ status: 'failed', name: c.name, email: c.email, error: err.message });
      failed++;
    }

    if (i < contacts.length - 1) await sleep(DELAY_MS);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('  ' + '─'.repeat(46));
  if (DRY_RUN) {
    console.log(`  Preview complete — ${contacts.length} email${contacts.length === 1 ? '' : 's'} generated.`);
    console.log('  Remove --dry-run to send.\n');
  } else {
    console.log(`  Done: ${sent} sent, ${failed} failed.`);
    const logFile = `campaign-log-${new Date().toISOString().slice(0, 10)}.json`;
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
    console.log(`  Log saved → ${logFile}\n`);
  }
}

main().catch(err => {
  console.error('\n  ✖  Fatal:', err.message);
  process.exit(1);
});
