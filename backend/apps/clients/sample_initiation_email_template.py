# ============================================================
# Sample Detail Confirmation & Initiation Email Template
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}
# ============================================================

SUBJECT = "Your Sample Details – Please Review & Approve | {brand_name}"

# ── HTML version (shown in modern email clients) ─────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for booking your sample with us!</p>

  <p>
    Attached are your sample details. Please go through them carefully — your sample will be made exactly as per this document.
  </p>

  <p><strong>What we need from you:</strong></p>
  <ol>
    <li><strong>Approve over email</strong> — reply confirming the details, or let us know if any changes are required (changes must be confirmed on email).</li>
    <li><strong>Confirm your fragrance</strong> — from the attached fragrance notes, if not done already.</li>
    <li><strong>Make the payment</strong> — to initiate sample development.</li>
  </ol>

  <p>
    <strong>Important:</strong> Please make payments only to our official bank account or via the QR code shared with you. Payments made to any phone number will not be acknowledged.
  </p>

  <p>
    <strong>Timelines:</strong> Once your sample is booked (payment received), it takes 3–4 weeks to process. We'll share tracking details as soon as it ships.
  </p>

  <p>
    <strong>One more thing:</strong> When you receive your sample, please note the Sample Number printed on it — this unique number is required at the time of production.
  </p>

  <p>Attachments: Sample Details | Fragrance Notes</p>

  <p>Best Wishes,<br/>
  <strong>Team Skinovation Sciences</strong><br/>
  Your Skincare Brand Architect – Idea to Shelf</p>

  <p>
    Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch
  </p>

  <p>
    For more information on product and process pls refer to this link - <a href="https://shorturl.at/roha4">https://shorturl.at/roha4</a>
  </p>

  <p>
    Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
  </p>

</body>
</html>
"""

# ── Plain-text fallback ───────────────────────────────────────────────────────
TEXT_BODY = """\
Dear {client_name},

Thank you for booking your sample with us!

Attached are your sample details. Please go through them carefully — your sample will be made exactly as per this document.

What we need from you:
1. Approve over email — reply confirming the details, or let us know if any changes are required (changes must be confirmed on email).
2. Confirm your fragrance — from the attached fragrance notes, if not done already.
3. Make the payment — to initiate sample development.

Important: Please make payments only to our official bank account or via the QR code shared with you. Payments made to any phone number will not be acknowledged.

Timelines: Once your sample is booked (payment received), it takes 3–4 weeks to process. We'll share tracking details as soon as it ships.

One more thing: When you receive your sample, please note the Sample Number printed on it — this unique number is required at the time of production.

Attachments: Sample Details | Fragrance Notes

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
