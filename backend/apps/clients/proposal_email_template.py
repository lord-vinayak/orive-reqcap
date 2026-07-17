# ============================================================
# Proposal Email
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}
# ============================================================

SUBJECT = "Product Proposal for {brand_name} – Ready for Your Review"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Please find attached the product proposal for {brand_name} for your review.</p>

  <p>
    This covers the complete scope of what we'll build together — from formulation to shelf. Take your time going through it, and reach out with any questions. We'd love to walk you through it.
  </p>

  <p>
    For information on Product | Packaging | Terms &amp; Condition | Payment Details and more - <a href="https://shorturl.at/roha4">https://shorturl.at/roha4</a>
  </p>

  <p>Attachment: Costing &amp; Proposal – {brand_name}</p>

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

Please find attached the product proposal for {brand_name} for your review.

This covers the complete scope of what we'll build together — from formulation to shelf. Take your time going through it, and reach out with any questions. We'd love to walk you through it.

For information on Product | Packaging | Terms & Condition | Payment Details and more - https://shorturl.at/roha4

Attachment: Costing & Proposal – {brand_name}

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
