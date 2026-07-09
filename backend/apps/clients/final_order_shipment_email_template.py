# ============================================================
# Final Order Shipment Email with Final Invoice
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}
# ============================================================

SUBJECT = "Final Invoice & Shipment Readiness - {brand_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for partnering with Skinovation Sciences for your production batch.</p>

  <p>
    We are pleased to inform you that your order for <strong>{brand_name}</strong> has reached the final
    dispatch readiness stage. Please find attached the final invoice and payment summary for your reference.
  </p>

  <p>
    To ensure smooth operational closure and timely dispatch, we request you to kindly complete the remaining
    payment. Once the payment is cleared and shipment formalities are completed, your consignment will be released
    for dispatch.
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

Thank you for partnering with Skinovation Sciences for your production batch.

We are pleased to inform you that your order for {brand_name} has reached the final dispatch readiness stage. Please find attached the final invoice and payment summary for your reference.

To ensure smooth operational closure and timely dispatch, we request you to kindly complete the remaining payment. Once the payment is cleared and shipment formalities are completed, your consignment will be released for dispatch.

Our team has completed the required production, filling, packing, and quality checks as per the approved order scope. Shipment details, tracking information, and dispatch documents will be shared with you once the order is handed over to the logistics partner.

We appreciate the trust you have placed in Skinovation Sciences and look forward to seeing your products move successfully into the market.

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
