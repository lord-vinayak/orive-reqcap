# ============================================================
# Printing Payment Confirmation Email
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {product_name}, {payment_amount}, {date_of_receipt}
# ============================================================

SUBJECT = "Printing Payment Received - Printing Process Initiated - {product_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for sharing the printing payment confirmation.</p>

  <p>We confirm receipt of the printing payment for <strong>{product_name}</strong>.</p>

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
      <td style="padding: 6px 0;">Printing Execution Payment</td>
    </tr>
  </table>

  <p>
    The approved printing files will now be moved into the printing workflow as per the confirmed specifications.
  </p>

  <p>
    Our team will coordinate with the printing vendor for file processing, print execution, quality review, and
    delivery alignment.
  </p>

  <p>
    Please note that the approved artwork shared by you will be treated as the final print-ready file. Any changes
    requested after printing initiation may require additional cost and may impact the execution timeline.
  </p>

  <p>
    We will update you once the printed material is ready or received for the next stage of production and final
    packaging.
  </p>

  <p>Best Wishes,<br/>
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

TEXT_BODY = """\
Dear {client_name},

Thank you for sharing the printing payment confirmation.

We confirm receipt of the printing payment for {product_name}.

Payment Amount Received: Rs. {payment_amount}
Date of Receipt: {date_of_receipt}
Payment Type: Printing Execution Payment

The approved printing files will now be moved into the printing workflow as per the confirmed specifications.

Our team will coordinate with the printing vendor for file processing, print execution, quality review, and delivery alignment.

Please note that the approved artwork shared by you will be treated as the final print-ready file. Any changes requested after printing initiation may require additional cost and may impact the execution timeline.

We will update you once the printed material is ready or received for the next stage of production and final packaging.

Best Wishes,
Team Skinovation Sciences
"""
