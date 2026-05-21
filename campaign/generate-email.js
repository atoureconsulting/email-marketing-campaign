'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

let _client;
function client() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const AGENCY_PROFILE = fs.readFileSync(path.join(__dirname, 'atoure-profile.md'), 'utf8');

async function generateEmail({ firstName, company, sector, city, notes, profile }) {
  const greeting = firstName ? `Hi ${firstName}` : 'Hi';

  const contactInfo = [
    company && `Company: ${company}`,
    sector  && `Sector / industry: ${sector}`,
    city    && `City: ${city}`,
    notes   && `CRM notes: ${notes}`,
    profile && `Profile / website: ${profile}`,
  ].filter(Boolean).join('\n');

  const response = await client().messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 700,
    system: `You write personalised cold outreach emails for AToure Consulting.

${AGENCY_PROFILE}

Your task: read the contact's business profile and find the most compelling common ground — the specific angle where what AToure offers intersects with what THIS business genuinely needs. Think creatively. Go beyond the obvious.

Examples of smart angles:
- Hotel in London → touring artists need accommodation; creator stays generate authentic UGC; co-branded cultural events drive bookings
- Fashion boutique → editorial content with our stylists and models; influencer seeding for new collections; launch event talent
- Music venue → talent bookings from our artist roster; co-promotions; support acts
- Restaurant → food and lifestyle content creators; influencer dining experiences; cultural event hosting
- Sports brand → athlete endorsements from our roster; fitness creators; lifestyle content campaigns
- PR or media agency → talent for press events, shoots, press trips; content creation partnerships

Rules:
- Be specific to THIS business — nothing generic or copy-pasted
- 150–200 words for the body, flowing prose, no bullet points or headers
- Warm and professional, not salesy or pushy
- One low-pressure CTA (suggest a short call or a reply to explore further)
- Never open with "I hope this email finds you well" or any cliché
- Do not mention follower counts or use jargon like "influencer marketing"
- Do not invent specific talent names

Output exactly this format — nothing before SUBJECT::
SUBJECT: [subject line]
BODY:
[email body starting with: ${greeting},]`,
    messages: [{ role: 'user', content: `Contact information:\n${contactInfo}` }],
  });

  const raw = response.content[0].text.trim();
  const subjectMatch = raw.match(/^SUBJECT:\s*(.+)$/m);
  const bodyMatch    = raw.match(/^BODY:\s*\n([\s\S]+)$/m);

  return {
    subject: subjectMatch ? subjectMatch[1].trim() : 'Partnership opportunity — AToure Consulting',
    body:    bodyMatch    ? bodyMatch[1].trim()    : raw,
  };
}

module.exports = { generateEmail };
