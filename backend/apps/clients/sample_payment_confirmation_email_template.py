# ============================================================
# Sample Payment Confirmation Email Template
# Edit this file to change email content — no code changes needed.
#
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {product_name}, {payment_amount},
#                           {date_of_receipt}, {payment_type}
# ============================================================

SUBJECT = "Sample Payment Received - Sample Development Initiated"

# ── HTML version ──────────────────────────────────────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for sharing the payment confirmation.</p>

  <p>We confirm receipt of the sample initiation payment for <strong>{product_name}</strong>.</p>

  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr>
      <td style="padding: 4px 16px 4px 0; color: #666666; white-space: nowrap;">Payment Amount Received:</td>
      <td style="padding: 4px 0;"><strong>Rs. {payment_amount}</strong></td>
    </tr>
    <tr>
      <td style="padding: 4px 16px 4px 0; color: #666666; white-space: nowrap;">Date of Receipt:</td>
      <td style="padding: 4px 0;"><strong>{date_of_receipt}</strong></td>
    </tr>
    <tr>
      <td style="padding: 4px 16px 4px 0; color: #666666; white-space: nowrap;">Payment Type:</td>
      <td style="padding: 4px 0;"><strong>{payment_type}</strong></td>
    </tr>
  </table>

  <p>Your project has now been moved into our sample development workflow.</p>

  <p>
    Our internal team will proceed with formulation planning, ingredient alignment, sample preparation, and quality review as per the approved Sample Details Sheet shared and confirmed by you.
  </p>

  <p>
    Any final inputs related to texture, fragrance, colour, packaging compatibility, benchmark products, or ingredient preferences should be shared at this stage to ensure better alignment during sample development.
  </p>

  <p>Our team will keep you updated on the next steps and sample readiness timeline.</p>

  <p>Best Wishes,<br/>
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

# ── Plain-text fallback ───────────────────────────────────────────────────────
TEXT_BODY = """\
Dear {client_name},

Thank you for sharing the payment confirmation.

We confirm receipt of the sample initiation payment for {product_name}.

Payment Amount Received: Rs. {payment_amount}
Date of Receipt: {date_of_receipt}
Payment Type: {payment_type}

Your project has now been moved into our sample development workflow.

Our internal team will proceed with formulation planning, ingredient alignment, sample preparation, and quality review as per the approved Sample Details Sheet shared and confirmed by you.

Any final inputs related to texture, fragrance, colour, packaging compatibility, benchmark products, or ingredient preferences should be shared at this stage to ensure better alignment during sample development.

Our team will keep you updated on the next steps and sample readiness timeline.

Best Wishes,
Team Skinovation Sciences
"""
