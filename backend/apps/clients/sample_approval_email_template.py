# ============================================================
# Sample Approval Email Template
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {sample_number}, {product_name}
# ============================================================

SUBJECT = "Sample Approval Confirmation - Sample No. {sample_number} Approved"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for confirming your approval of the sample for <strong>{product_name}</strong>.</p>

  <p>
    We are pleased to note that <strong>Sample No. {sample_number}</strong> has been approved from your end.
    Based on this confirmation, the approved sample will now be considered as the final reference sample for further order planning and production alignment.
  </p>

  <p>
    At this stage, we request you to kindly confirm the final order details, including SKU name, pack size, quantity, packaging preference, label/artwork readiness, and any final compliance or claim-related inputs.
  </p>

  <p>
    Please note that any major change requested after sample approval, including changes in texture, fragrance, colour, active positioning, product claims, or formulation direction, may require additional review and may impact timelines, cost, or development scope.
  </p>

  <p>
    Once the order details are finalized, we will move ahead with the order initiation process and share the required commercial documents for the next stage.
  </p>

  <p>Best Wishes,<br/>
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

TEXT_BODY = """\
Dear {client_name},

Thank you for confirming your approval of the sample for {product_name}.

We are pleased to note that Sample No. {sample_number} has been approved from your end. Based on this confirmation, the approved sample will now be considered as the final reference sample for further order planning and production alignment.

At this stage, we request you to kindly confirm the final order details, including SKU name, pack size, quantity, packaging preference, label/artwork readiness, and any final compliance or claim-related inputs.

Please note that any major change requested after sample approval, including changes in texture, fragrance, colour, active positioning, product claims, or formulation direction, may require additional review and may impact timelines, cost, or development scope.

Once the order details are finalized, we will move ahead with the order initiation process and share the required commercial documents for the next stage.

Best Wishes,
Team Skinovation Sciences
"""
