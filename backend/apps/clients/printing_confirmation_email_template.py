# ============================================================
# Printing Confirmation Email
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}
# ============================================================

SUBJECT = "Printing Content Approval & Invoice - {brand_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Please find attached the printing content for {brand_name} along with the printing invoice.</p>

  <p>
    Kindly review the content and share your approval. Kindly review the attached printing files carefully, including product name, net quantity,
    claims, ingredient list, manufacturer details, marketed by details, batch-related placeholders, barcode, MRP,
    expiry details, usage instructions, caution statements, and spelling accuracy.
  </p>

  <p>
    Once the file is approved and payment is received, the printing process will be initiated. Please note that
    after final approval, any correction or change may lead to additional cost and timeline impact, depending on
    vendor stage.
  </p>

  <p>
    Kindly process the printing payment and share the confirmation screenshot so that we can move ahead with
    printing execution.
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

</body>
</html>
"""

TEXT_BODY = """\
Dear {client_name},

Please find attached the printing content for {brand_name} along with the printing invoice.

Kindly review the content and share your approval. Kindly review the attached printing files carefully, including product name, net quantity, claims, ingredient list, manufacturer details, marketed by details, batch-related placeholders, barcode, MRP, expiry details, usage instructions, caution statements, and spelling accuracy.

Once the file is approved and payment is received, the printing process will be initiated. Please note that after final approval, any correction or change may lead to additional cost and timeline impact, depending on vendor stage.

Kindly process the printing payment and share the confirmation screenshot so that we can move ahead with printing execution.

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4
"""
