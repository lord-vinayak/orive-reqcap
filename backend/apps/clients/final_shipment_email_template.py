# ============================================================
# Final Shipment Email (Final Invoice)
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}
# ============================================================

SUBJECT = "Your Order is Ready! Final Invoice Attached | {brand_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for your order — we're glad to share that your order is ready!</p>

  <p>
    Please find attached the final invoice. Kindly make the payment so we can ship your products right away.
  </p>

  <p>
    <strong>Important:</strong> Please make payments only to our official bank account or via the QR code shared with you. Payments made to any phone number will not be acknowledged.
  </p>

  <p>Attachment: Final Invoice – {brand_name}</p>

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

Thank you for your order — we're glad to share that your order is ready!

Please find attached the final invoice. Kindly make the payment so we can ship your products right away.

Important: Please make payments only to our official bank account or via the QR code shared with you. Payments made to any phone number will not be acknowledged.

Attachment: Final Invoice – {brand_name}

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
