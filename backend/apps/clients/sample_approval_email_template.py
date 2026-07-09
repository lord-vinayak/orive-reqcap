# ============================================================
# Sample Approval Email Template
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}, {product1_name}, {sample1_number},
#   {product2_name}, {sample2_number}, {product3_name}, {sample3_number}
#   (product2/3 slots are optional — leave blank if not applicable)
# ============================================================

SUBJECT = "Sample Approval Confirmation - {brand_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>We are glad to share that the below samples are approved by you.</p>

  <p>
    Kindly review the details below and flag any discrepancies within 2 days, as this exact sample version will go into bulk production. This is critical as same sample version will go in bulk production.
  </p>

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

  <p>
    Please note that any future changes in the sample whether texture, fragrance, color, active positioning, product claims, or formulation direction, may require additional review and may impact timelines, cost, or development scope.
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

We are glad to share that the below samples are approved by you.

Kindly review the details below and flag any discrepancies within 2 days, as this exact sample version will go into bulk production. This is critical as same sample version will go in bulk production.

Product 1 Name: {product1_name}
Sample No: {sample1_number}

Product 2 Name: {product2_name}
Sample No: {sample2_number}

Product 3 Name: {product3_name}
Sample No: {sample3_number}

Please note that any future changes in the sample whether texture, fragrance, color, active positioning, product claims, or formulation direction, may require additional review and may impact timelines, cost, or development scope.

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
