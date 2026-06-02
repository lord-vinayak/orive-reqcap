# ============================================================
# Email Templates for Client Costing (Proposal) emails
# Edit this file to change email content — no code changes needed.
#
# Available tokens (use {token_name} in SUBJECT, HTML_BODY, TEXT_BODY):
#   {client_name}         — client's name
#   {sent_by_name}        — name of the person sending the email
#   {proposal_item_count} — number of items in the proposal
#   {proposal_label}      — e.g. "Client Costing #2"
# ============================================================

SUBJECT = "Product Proposal, Cost & Next Steps for Sample Development"

# ── HTML version (shown in modern email clients) ─────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Greetings from Skinovation Sciences.</p>

  <p>
    As discussed, please find attached your <strong>Product Proposal and Costing</strong>.
    This document captures the complete product direction, including the formulation concept,
    ingredient approach, texture, product feel, and other key details required to develop your skincare product.
  </p>

  <p>
    We request you to kindly <strong>review the proposal carefully and share your approval</strong>.
    This step is important because it ensures that our R&amp;D team proceeds with a clear understanding
    of your product expectations before we begin sampling.
  </p>

  <p>
    Once you are aligned with the proposal and costing, we can move to the next stage, which is
    <strong>sample booking and development</strong>. As part of our process, we offer paid sample support
    one time in which we provide up to 3 iterations, helping clients refine the sample before moving into
    production. This is aligned with our structured product development process where sample approval comes
    before production booking.
  </p>

  <p>You may choose from the following two sampling options:</p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">

    <tr>
      <td style="padding: 14px 16px; background-color: #f9f6ef; border: 1px solid #e0d9c8; border-radius: 6px; vertical-align: top;">
        <p style="margin: 0 0 8px 0;"><strong>1. Standard Sample Process</strong></p>
        <p style="margin: 0 0 6px 0;">The standard sample cost is:</p>
        <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>&#8377;250 per sample + &#8377;150 shipping</strong></p>
        <p style="margin: 0 0 6px 0;">
          This includes up to <strong>3 iterations</strong> of the sample at no additional sample cost.
          Since skincare products may sometimes require small refinements after the first trial,
          these iterations help us adjust minor aspects such as:
        </p>
        <ul style="margin: 6px 0 8px 20px; padding: 0;">
          <li>Colour</li>
          <li>Fragrance</li>
          <li>Texture feel</li>
          <li>Consistency</li>
          <li>Minor product changes</li>
        </ul>
        <p style="margin: 0;">
          This process is suitable if you would like to evaluate the sample, share feedback,
          and fine-tune the product before final approval.
        </p>
      </td>
    </tr>

    <tr><td style="height: 10px; border: none; background: transparent;"></td></tr>

    <tr>
      <td style="padding: 14px 16px; background-color: #f9f6ef; border: 1px solid #e0d9c8; border-radius: 6px; vertical-align: top;">
        <p style="margin: 0 0 8px 0;"><strong>2. Expedited Sample Process</strong></p>
        <p style="margin: 0 0 6px 0;">For faster movement, we also offer an expedited option:</p>
        <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>10% of the Raw Material Cost</strong></p>
        <p style="margin: 0;">
          Under this process, there is no separate sample cost. The sample is provided
          <strong>free of cost</strong> once the expedited booking amount is confirmed.
        </p>
      </td>
    </tr>

  </table>

  <p>
    Additionally, we have attached the <strong>fragrance notes Excel sheet</strong> for your selection.
    Please review the fragrance options and confirm the fragrance note you would like us to use in your sample.
  </p>

  <p>To proceed further, kindly confirm the following:</p>
  <ol style="margin: 8px 0 16px 20px; padding: 0;">
    <li>Approval on the product proposal</li>
    <li>Approval on the costing</li>
    <li>Your preferred fragrance note from the attached Excel</li>
    <li>Your selected sampling option: <strong>Standard</strong> or <strong>Expedited</strong></li>
  </ol>

  <p>
    Once we receive your confirmation, we will move ahead with sample booking and initiate
    the next stage of product development.
  </p>

  <p>Looking forward to your approval.</p>

  <br>
  <p style="margin: 0;">Warm regards,</p>
  <p style="margin: 4px 0 0 0;"><strong>Team Skinovation Sciences</strong></p>
  <p style="margin: 4px 0 0 0; color: #666666; font-size: 13px;">
    Phone/WhatsApp: +91 98184 67515<br>
    Email: hello@skinovationsciences.com
  </p>

</body>
</html>
"""

# ── Plain-text fallback (shown in email clients that block HTML) ─────────────
TEXT_BODY = """\
Dear {client_name},

Greetings from Skinovation Sciences.

As discussed, please find attached your Product Proposal and Costing. This document captures the complete product direction, including the formulation concept, ingredient approach, texture, product feel, and other key details required to develop your skincare product.

We request you to kindly review the proposal carefully and share your approval. This step is important because it ensures that our R&D team proceeds with a clear understanding of your product expectations before we begin sampling.

Once you are aligned with the proposal and costing, we can move to the next stage, which is sample booking and development. As part of our process, we offer paid sample support one time in which we provide up to 3 iterations, helping clients refine the sample before moving into production. This is aligned with our structured product development process where sample approval comes before production booking.

You may choose from the following two sampling options:

1. Standard Sample Process
   The standard sample cost is: Rs.250 per sample + Rs.150 shipping

   This includes up to 3 iterations of the sample at no additional sample cost. Since skincare products may sometimes require small refinements after the first trial, these iterations help us adjust minor aspects such as:
   - Colour
   - Fragrance
   - Texture feel
   - Consistency
   - Minor product changes

   This process is suitable if you would like to evaluate the sample, share feedback, and fine-tune the product before final approval.

2. Expedited Sample Process
   For faster movement, we also offer an expedited option: 10% of the Raw Material Cost.

   Under this process, there is no separate sample cost. The sample is provided free of cost once the expedited booking amount is confirmed.

Additionally, we have attached the fragrance notes Excel sheet for your selection. Please review the fragrance options and confirm the fragrance note you would like us to use in your sample.

To proceed further, kindly confirm the following:
1. Approval on the product proposal
2. Approval on the costing
3. Your preferred fragrance note from the attached Excel
4. Your selected sampling option: Standard or Expedited

Once we receive your confirmation, we will move ahead with sample booking and initiate the next stage of product development.

Looking forward to your approval.

Warm regards,
Team Skinovation Sciences
Phone/WhatsApp: +91 98184 67515
Email: hello@skinovationsciences.com
"""
