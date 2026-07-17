# ============================================================
# Sample Approval Email Template
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}, {product1_name}, {sample1_number},
#   {product2_name}, {sample2_number}, {product3_name}, {sample3_number}
#   (product2/3 slots are optional — leave blank if not applicable)
# ============================================================

SUBJECT = "Sample Approved! Confirmation of Sample Code – {brand_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>We're glad your samples are approved — congratulations on this milestone!</p>

  <p>Please review and confirm the approved sample codes, as same will go into production.</p>

  <p>
    Product 1 Name: {product1_name}<br/>
    Sample No: {sample1_number}<br/>
    <br/>
    Product 2 Name: {product2_name}<br/>
    Sample No: {sample2_number}<br/>
    <br/>
    Product 3 Name: {product3_name}<br/>
    Sample No: {sample3_number}
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

We're glad your samples are approved — congratulations on this milestone!

Please review and confirm the approved sample codes, as same will go into production.

Product 1 Name: {product1_name}
Sample No: {sample1_number}

Product 2 Name: {product2_name}
Sample No: {sample2_number}

Product 3 Name: {product3_name}
Sample No: {sample3_number}

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
