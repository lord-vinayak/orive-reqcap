# ============================================================
# Shipment Details Email
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}, {shipment_type}, {tracking_link}
# ============================================================

SUBJECT = "Your Products Are on the Way! | {brand_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Great news — your products have been dispatched!</p>

  <p>Shipment type: {shipment_type}</p>

  <p>Tracking link: <a href="{tracking_link}">{tracking_link}</a></p>

  <p>
    Please track your shipment using the link above. Reach out if you need anything at all — we're always here.
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

Great news — your products have been dispatched!

Shipment type: {shipment_type}

Tracking link: {tracking_link}

Please track your shipment using the link above. Reach out if you need anything at all — we're always here.

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
