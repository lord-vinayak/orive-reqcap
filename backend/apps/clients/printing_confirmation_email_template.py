# ============================================================
# Printing Confirmation Email
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {product_name}
# ============================================================

SUBJECT = "Printing File Confirmation & Invoice - {product_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for sharing / approving the printing files for <strong>{product_name}</strong>.</p>

  <p>
    Please find attached the confirmed printing files along with the printing invoice for your review and
    payment processing.
  </p>

  <p>
    The attached files may include, as applicable: label artwork, outer carton artwork, sticker / shrink sleeve
    artwork, printing specifications, and final approved content file.
  </p>

  <p>
    We request you to kindly review the attached printing files carefully, including product name, net quantity,
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
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

TEXT_BODY = """\
Dear {client_name},

Thank you for sharing / approving the printing files for {product_name}.

Please find attached the confirmed printing files along with the printing invoice for your review and payment processing.

The attached files may include, as applicable: label artwork, outer carton artwork, sticker / shrink sleeve artwork, printing specifications, and final approved content file.

We request you to kindly review the attached printing files carefully, including product name, net quantity, claims, ingredient list, manufacturer details, marketed by details, batch-related placeholders, barcode, MRP, expiry details, usage instructions, caution statements, and spelling accuracy.

Once the file is approved and payment is received, the printing process will be initiated. Please note that after final approval, any correction or change may lead to additional cost and timeline impact, depending on vendor stage.

Kindly process the printing payment and share the confirmation screenshot so that we can move ahead with printing execution.

Best Wishes,
Team Skinovation Sciences
"""
