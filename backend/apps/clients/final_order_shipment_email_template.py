# ============================================================
# Final Order Shipment Email with Final Invoice
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {product_name}, {final_payment_amount},
#   {payment_completion_date}, {sku_details}, {shipment_mode}, {insurance_status}
# ============================================================

SUBJECT = "Final Invoice & Shipment Readiness - {product_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for partnering with Skinovation Sciences for your production batch.</p>

  <p>
    We are pleased to inform you that your order for <strong>{product_name}</strong> has reached the final
    dispatch readiness stage. Please find attached the final invoice and payment summary for your reference.
  </p>

  <table style="border-collapse: collapse; width: 100%; margin: 12px 0;">
    <tr>
      <td style="padding: 6px 12px 6px 0; font-weight: 600; white-space: nowrap; width: 220px;">Final Payment Due</td>
      <td style="padding: 6px 0;">Rs. {final_payment_amount}</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Payment Completion Date</td>
      <td style="padding: 6px 0;">{payment_completion_date}</td>
    </tr>
    <tr>
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Order / SKU Details</td>
      <td style="padding: 6px 0;">{sku_details}</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Dispatch Status</td>
      <td style="padding: 6px 0;">Ready for shipment post payment clearance</td>
    </tr>
    <tr>
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Shipment Mode</td>
      <td style="padding: 6px 0;">{shipment_mode}</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Insurance Status</td>
      <td style="padding: 6px 0;">{insurance_status}</td>
    </tr>
  </table>

  <p>
    To ensure smooth operational closure and timely dispatch, we request you to kindly complete the remaining
    payment by <strong>{payment_completion_date}</strong>. Once the payment is cleared and shipment formalities
    are completed, your consignment will be released for dispatch.
  </p>

  <p>
    Our team has completed the required production, filling, packing, and quality checks as per the approved
    order scope. Shipment details, tracking information, and dispatch documents will be shared with you once
    the order is handed over to the logistics partner.
  </p>

  <p>
    We appreciate the trust you have placed in Skinovation Sciences and look forward to seeing your products
    move successfully into the market.
  </p>

  <p>Best Wishes,<br/>
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

TEXT_BODY = """\
Dear {client_name},

Thank you for partnering with Skinovation Sciences for your production batch.

We are pleased to inform you that your order for {product_name} has reached the final dispatch readiness stage. Please find attached the final invoice and payment summary for your reference.

Final Payment Due: Rs. {final_payment_amount}
Payment Completion Date: {payment_completion_date}
Order / SKU Details: {sku_details}
Dispatch Status: Ready for shipment post payment clearance
Shipment Mode: {shipment_mode}
Insurance Status: {insurance_status}

To ensure smooth operational closure and timely dispatch, we request you to kindly complete the remaining payment by {payment_completion_date}. Once the payment is cleared and shipment formalities are completed, your consignment will be released for dispatch.

Our team has completed the required production, filling, packing, and quality checks as per the approved order scope. Shipment details, tracking information, and dispatch documents will be shared with you once the order is handed over to the logistics partner.

We appreciate the trust you have placed in Skinovation Sciences and look forward to seeing your products move successfully into the market.

Best Wishes,
Team Skinovation Sciences
"""
