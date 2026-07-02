# ============================================================
# Packaging Payment Confirmation Email
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {product_name}, {payment_amount}, {date_of_receipt}
# ============================================================

SUBJECT = "Packaging Payment Confirmation - {product_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for sharing the packaging payment confirmation.</p>

  <p>We confirm receipt of the packaging payment for <strong>{product_name}</strong>.</p>

  <table style="border-collapse: collapse; width: 100%; margin: 12px 0;">
    <tr>
      <td style="padding: 6px 12px 6px 0; font-weight: 600; white-space: nowrap; width: 220px;">Payment Amount Received</td>
      <td style="padding: 6px 0;">Rs. {payment_amount}</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Date of Receipt</td>
      <td style="padding: 6px 0;">{date_of_receipt}</td>
    </tr>
    <tr>
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Payment Type</td>
      <td style="padding: 6px 0;">Packaging Procurement Payment</td>
    </tr>
  </table>

  <p>
    Based on this confirmation, our team will now initiate the packaging procurement process as per the approved
    packaging type, MOQ, cost, and specifications.
  </p>

  <p>
    The procurement workflow will include vendor coordination, packaging order placement, delivery follow-up, and
    internal quality check once the packaging material is received.
  </p>

  <p>
    We will keep you updated on the procurement status and inform you once the packaging material is dispatched
    or received at the manufacturing facility.
  </p>

  <p>
    Timely packaging availability is critical for smooth production planning, filling, final packing, and dispatch
    execution.
  </p>

  <p>Best Wishes,<br/>
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

TEXT_BODY = """\
Dear {client_name},

Thank you for sharing the packaging payment confirmation.

We confirm receipt of the packaging payment for {product_name}.

Payment Amount Received: Rs. {payment_amount}
Date of Receipt: {date_of_receipt}
Payment Type: Packaging Procurement Payment

Based on this confirmation, our team will now initiate the packaging procurement process as per the approved packaging type, MOQ, cost, and specifications.

The procurement workflow will include vendor coordination, packaging order placement, delivery follow-up, and internal quality check once the packaging material is received.

We will keep you updated on the procurement status and inform you once the packaging material is dispatched or received at the manufacturing facility.

Timely packaging availability is critical for smooth production planning, filling, final packing, and dispatch execution.

Best Wishes,
Team Skinovation Sciences
"""
