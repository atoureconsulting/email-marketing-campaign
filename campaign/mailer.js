'use strict';
const nodemailer = require('nodemailer');

let _transport;
function transport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host:   process.env.IONOS_SMTP_HOST || 'smtp.ionos.co.uk',
      port:   587,
      secure: false,
      auth: {
        user: process.env.IONOS_EMAIL,
        pass: process.env.IONOS_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
    });
  }
  return _transport;
}

async function verify() {
  await transport().verify();
}

async function send({ toName, toEmail, fromName, fromEmail, subject, body }) {
  await transport().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to:   toName ? `${toName} <${toEmail}>` : toEmail,
    subject,
    html: toHtml(body, fromName, fromEmail),
    text: body,
  });
}

function toHtml(body, fromName, fromEmail) {
  const paras = body
    .split(/\n\n+/)
    .map(p =>
      `<p style="margin:0 0 20px;font-size:15px;color:#2a2a2a;line-height:1.8;">${p.replace(/\n/g, '<br>')}</p>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:28px 40px;text-align:center;">
            <p style="margin:0;color:#c9a84c;font-size:10px;letter-spacing:5px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:bold;">ATOURE CONSULTING</p>
            <p style="margin:6px 0 0;color:#999;font-size:11px;letter-spacing:2px;font-family:Arial,sans-serif;">Talent &nbsp;·&nbsp; Strategy &nbsp;·&nbsp; Influence</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:44px 40px 12px;">
            ${paras}
          </td>
        </tr>

        <!-- Signature -->
        <tr>
          <td style="padding:0 40px 40px;">
            <p style="margin:0;font-size:13px;color:#555;font-family:Arial,sans-serif;line-height:1.7;">
              ${fromName}<br>
              <a href="mailto:${fromEmail}" style="color:#c9a84c;text-decoration:none;">${fromEmail}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #e8e8e8;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;font-family:Arial,sans-serif;line-height:1.7;">
              AToure Consulting &nbsp;·&nbsp; Talent Management &amp; Brand Partnerships<br>
              You received this because your company was identified as a potential partner.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { verify, send };
