# ============================================================
# Order Booking Invoice Email
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}
# ============================================================

SUBJECT = "Your Order Booking – {brand_name} | Payment Awaited to Confirm"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for proceeding with us — we're excited to bring your products to life!</p>

  <p>
    Please find attached your order booking. Your order will be confirmed once payment is received.
  </p>

  <p>
    <strong>Important:</strong> Please make payments only to our official bank account or via the QR code shared with you. Payments made to any phone number will not be acknowledged.
  </p>

  <p><strong>Please note:</strong></p>
  <ul>
    <li>The exact batch number will be assigned at production closure, aligned to the date of production.</li>
    <li>There is a variance of ±10% during production. The final invoice will be based on actual units made.</li>
    <li>Cost of shipment will be on actuals.</li>
  </ul>

  <p>Attachment: Order Booking – {brand_name}</p>

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

Thank you for proceeding with us — we're excited to bring your products to life!

Please find attached your order booking. Your order will be confirmed once payment is received.

Important: Please make payments only to our official bank account or via the QR code shared with you. Payments made to any phone number will not be acknowledged.

Please note:
- The exact batch number will be assigned at production closure, aligned to the date of production.
- There is a variance of ±10% during production. The final invoice will be based on actual units made.
- Cost of shipment will be on actuals.

Attachment: Order Booking – {brand_name}

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
