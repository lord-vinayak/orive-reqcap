# ============================================================
# Sample Initiation Email Template
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}
# ============================================================

SUBJECT = "Sample Initiation Invoice & Sample Detail Confirmation - {brand_name}"

# ── HTML version (shown in modern email clients) ─────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>
    Thank you for confirming your interest in initiating the sample development process with Skinovation Sciences.
  </p>

  <p>Please find attached</p>
  <ol>
    <li>Sample Sheet</li>
    <li>Sample invoice</li>
  </ol>

  <p>
    Please go through the Sample Sheet in detail, review and confirm the information captured for each product. This is very critical as the sample will be made as per the attached specifications.
  </p>

  <p>
    Also, please clear the sample invoice to book your sample.
  </p>

  <p>
    <strong>Please Note:</strong> The payment should be made only to the bank account details in the invoice. Any payments made on the phone number will not be considered.
  </p>

  <p>
    We request you to kindly share the payment confirmation screenshot once processed.
  </p>

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

Thank you for confirming your interest in initiating the sample development process with Skinovation Sciences.

Please find attached
1. Sample Sheet
2. Sample invoice

Please go through the Sample Sheet in detail, review and confirm the information captured for each product. This is very critical as the sample will be made as per the attached specifications.

Also, please clear the sample invoice to book your sample.

Please Note: The payment should be made only to the bank account details in the invoice. Any payments made on the phone number will not be considered.

We request you to kindly share the payment confirmation screenshot once processed.

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
