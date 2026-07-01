# ============================================================
# Order Initiation Email - 50% Order Booking
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {brand_name}
# ============================================================

SUBJECT = "Order Initiation - 50% Advance Invoice, MOU & Order Details for {brand_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for confirming your order with Skinovation Sciences.</p>

  <p>
    Please find attached the invoice for the 50% advance payment along with the MOU and order detail document for your review and confirmation.
  </p>

  <p>
    Upon receipt of the 50% advance payment, your order booking will be officially confirmed and the production slot will be secured. This will enable our team to initiate structured execution across formulation finalization, raw material planning, packaging alignment, documentation, testing, and production coordination.
  </p>

  <p>
    The attached order details include the confirmed product scope, SKU details, quantity, pack size, commercial terms, execution responsibilities, and key next steps. We request you to kindly review the attached documents and share your confirmation so that our team can proceed accordingly.
  </p>

  <p>Please also confirm the packaging &amp; printing execution model from the below options:</p>
  <ul>
    <li>To be arranged by the client, or</li>
    <li>To be managed by Skinovation Sciences on behalf of the client.</li>
  </ul>

  <p>
    If you are managing packaging from your end, please refer to the attached Packaging Guidelines Document before finalizing or dispatching the packaging material. This will help ensure packaging compatibility with the formulation, filling process, closure system, labeling, transit handling, and production planning.
  </p>

  <p>
    If Skinovation Sciences manages packaging procurement, packaging payment will be required separately as 100% advance, since this amount is paid directly to the packaging vendor for procurement and processing.
  </p>

  <p>
    We request you to kindly process the 50% advance payment and share the payment confirmation screenshot so our accounts and operations teams can update the system and initiate the next stage of execution.
  </p>

  <p>Best Wishes,<br/>
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

TEXT_BODY = """\
Dear {client_name},

Thank you for confirming your order with Skinovation Sciences.

Please find attached the invoice for the 50% advance payment along with the MOU and order detail document for your review and confirmation.

Upon receipt of the 50% advance payment, your order booking will be officially confirmed and the production slot will be secured. This will enable our team to initiate structured execution across formulation finalization, raw material planning, packaging alignment, documentation, testing, and production coordination.

The attached order details include the confirmed product scope, SKU details, quantity, pack size, commercial terms, execution responsibilities, and key next steps. We request you to kindly review the attached documents and share your confirmation so that our team can proceed accordingly.

Please also confirm the packaging & printing execution model from the below options:
- To be arranged by the client, or
- To be managed by Skinovation Sciences on behalf of the client.

If you are managing packaging from your end, please refer to the attached Packaging Guidelines Document before finalizing or dispatching the packaging material. This will help ensure packaging compatibility with the formulation, filling process, closure system, labeling, transit handling, and production planning.

If Skinovation Sciences manages packaging procurement, packaging payment will be required separately as 100% advance, since this amount is paid directly to the packaging vendor for procurement and processing.

We request you to kindly process the 50% advance payment and share the payment confirmation screenshot so our accounts and operations teams can update the system and initiate the next stage of execution.

Best Wishes,
Team Skinovation Sciences
"""
