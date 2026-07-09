# ============================================================
# Invoice Email Template (packaging, printing, order)
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}, {payment_type}, {amount}, {date}
# ============================================================

SUBJECT = "{payment_type} Invoice - {brand_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>
    Please find attached the invoice for your {payment_type}. Kindly process the payment so we can proceed further.
  </p>

  <p>Payment summary below</p>
  <p>
    Payment Amount: Rs. {amount}<br/>
    Payment Type: {payment_type}<br/>
    Date of Invoice: {date}
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

TEXT_BODY = """\
Dear {client_name},

Please find attached the invoice for your {payment_type}. Kindly process the payment so we can proceed further.

Payment summary below
Payment Amount: Rs. {amount}
Payment Type: {payment_type}
Date of Invoice: {date}

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
