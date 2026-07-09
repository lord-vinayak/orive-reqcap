# ============================================================
# Packaging Confirmation Email
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}
# ============================================================

SUBJECT = "Packaging Confirmation {brand_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for confirming the packaging direction for {brand_name}.</p>

  <p>
    Please find attached the packaging confirmation details, including packaging type, specification, MOQ, cost, vendor-level terms, and the packaging invoice for your review.
  </p>

  <p>
    As packaging procurement is vendor-linked, the packaging amount is payable as <strong>100% advance</strong>
    before procurement is initiated. Once payment is received, our team will coordinate with the vendor for
    procurement, inspection, and delivery alignment.
  </p>

  <p>
    Please note that packaging timelines may vary depending on vendor stock availability, printing requirements,
    mould availability, and transit conditions. For glass packaging, a standard transit or handling breakage
    tolerance may apply as per industry norms.
  </p>

  <p>
    We request you to kindly review the attached packaging details and process the payment so that procurement
    can be initiated without delay.
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

Thank you for confirming the packaging direction for {brand_name}.

Please find attached the packaging confirmation details, including packaging type, specification, MOQ, cost, vendor-level terms, and the packaging invoice for your review.

As packaging procurement is vendor-linked, the packaging amount is payable as 100% advance before procurement is initiated. Once payment is received, our team will coordinate with the vendor for procurement, inspection, and delivery alignment.

Please note that packaging timelines may vary depending on vendor stock availability, printing requirements, mould availability, and transit conditions. For glass packaging, a standard transit or handling breakage tolerance may apply as per industry norms.

We request you to kindly review the attached packaging details and process the payment so that procurement can be initiated without delay.

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
