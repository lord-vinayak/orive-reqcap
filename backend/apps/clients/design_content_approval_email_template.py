# ============================================================
# Design & Content Approval Email
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}
# ============================================================

SUBJECT = "Design Files Ready – Please Review & Approve | {brand_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Your design files are ready! Please find them attached.</p>

  <p><strong>What we need from you:</strong></p>
  <ol>
    <li><strong>Review the design files carefully</strong> — check for any errors in text, spellings, claims, ingredients, and details.</li>
    <li><strong>Give your confirmation over email</strong> — once we receive your approval, the files will be sent for printing.</li>
  </ol>

  <p>Printing timeline: 15–20 days.</p>

  <p>
    Also attached is the design invoice. Printing will be initiated once we have both your design confirmation and payment.
  </p>

  <p>
    <strong>Important:</strong> Please make payments only to our official bank account or via the QR code shared with you. Payments made to any phone number will not be acknowledged.
  </p>

  <p>Attachments: Design Files | Design Invoice</p>

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

TEXT_BODY = """\
Dear {client_name},

Your design files are ready! Please find them attached.

What we need from you:
1. Review the design files carefully — check for any errors in text, spellings, claims, ingredients, and details.
2. Give your confirmation over email — once we receive your approval, the files will be sent for printing.

Printing timeline: 15–20 days.

Also attached is the design invoice. Printing will be initiated once we have both your design confirmation and payment.

Important: Please make payments only to our official bank account or via the QR code shared with you. Payments made to any phone number will not be acknowledged.

Attachments: Design Files | Design Invoice

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
