# ============================================================
# Packaging Confirmation Email
# Base tokens: {client_name}, {company_name}, {sent_by_name}
# Template-specific tokens: {product_name}, {packaging_type}, {pack_size},
#   {moq}, {unit_cost}, {total_cost}, {printing_scope}, {procurement_timeline}
# ============================================================

SUBJECT = "Packaging Confirmation, MOQ, Costing & Invoice - {product_name}"

HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Thank you for confirming the packaging direction for {product_name}.</p>

  <p>
    Please find attached the packaging confirmation details, including packaging type, specification, MOQ, cost,
    vendor-level terms, and the packaging invoice for your review.
  </p>

  <p>The selected packaging details are as follows:</p>

  <table style="border-collapse: collapse; width: 100%; margin: 12px 0;">
    <tr>
      <td style="padding: 6px 12px 6px 0; font-weight: 600; white-space: nowrap; width: 220px;">Product Name</td>
      <td style="padding: 6px 0;">{product_name}</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Packaging Type</td>
      <td style="padding: 6px 0;">{packaging_type}</td>
    </tr>
    <tr>
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Pack Size</td>
      <td style="padding: 6px 0;">{pack_size}</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">MOQ</td>
      <td style="padding: 6px 0;">{moq}</td>
    </tr>
    <tr>
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Unit Cost</td>
      <td style="padding: 6px 0;">Rs. {unit_cost}</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Total Packaging Cost</td>
      <td style="padding: 6px 0;">Rs. {total_cost}</td>
    </tr>
    <tr>
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Printing / Label Scope</td>
      <td style="padding: 6px 0;">{printing_scope}</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 6px 12px 6px 0; font-weight: 600;">Expected Procurement Timeline</td>
      <td style="padding: 6px 0;">{procurement_timeline}</td>
    </tr>
  </table>

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
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

TEXT_BODY = """\
Dear {client_name},

Thank you for confirming the packaging direction for {product_name}.

Please find attached the packaging confirmation details, including packaging type, specification, MOQ, cost, vendor-level terms, and the packaging invoice for your review.

The selected packaging details are as follows:

Product Name: {product_name}
Packaging Type: {packaging_type}
Pack Size: {pack_size}
MOQ: {moq}
Unit Cost: Rs. {unit_cost}
Total Packaging Cost: Rs. {total_cost}
Printing / Label Scope: {printing_scope}
Expected Procurement Timeline: {procurement_timeline}

As packaging procurement is vendor-linked, the packaging amount is payable as 100% advance before procurement is initiated. Once payment is received, our team will coordinate with the vendor for procurement, inspection, and delivery alignment.

Please note that packaging timelines may vary depending on vendor stock availability, printing requirements, mould availability, and transit conditions. For glass packaging, a standard transit or handling breakage tolerance may apply as per industry norms.

We request you to kindly review the attached packaging details and process the payment so that procurement can be initiated without delay.

Best Wishes,
Team Skinovation Sciences
"""
