# ============================================================
# Sample Initiation Email Template
# Edit this file to change email content — no code changes needed.
#
# Available tokens (use {token_name} in SUBJECT, HTML_BODY, TEXT_BODY):
#   {client_name}   — client's full name
#   {company_name}  — client's company name (or empty string if not set)
#   {sent_by_name}  — name of the person sending the email
# ============================================================

SUBJECT = "Sample Initiation Invoice & Sample Detail Confirmation"

# ── HTML version (shown in modern email clients) ─────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>
    Thank you for confirming your interest in initiating the sample development process with Skinovation Sciences.
  </p>

  <p>
    Please find attached the sample initiation invoice along with the Sample Details Sheet for the product samples to be developed.
  </p>

  <p>
    The attached sheet captures key product-level inputs such as product name, category, texture, key benefits, active ingredients, fragrance preference, colour preference, packaging direction, benchmark reference, quantity expectations, and other execution details required by our formulation and project team.
  </p>

  <p>
    We request you to kindly review the attached Sample Details Sheet carefully and provide your confirmation, so that the samples can be developed accordingly and aligned with the approved product brief.
  </p>

  <p>
    The sample initiation payment may be processed under either of the following models, as applicable to your project:
  </p>
  <ul>
    <li>Sample development payment only</li>
    <li>10% advance payment against the final order value, which will confirm priority sample development and order booking alignment</li>
  </ul>

  <p>
    Upon receipt of the payment confirmation and approval of the Sample Details Sheet, our team will initiate the internal workflow for formulation review, ingredient mapping, sample planning, and execution scheduling.
  </p>

  <p>
    We request you to kindly share the payment confirmation screenshot once processed, along with confirmation on the attached Sample Details Sheet.
  </p>

  <p>Best Wishes,<br/>
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

# ── Plain-text fallback ───────────────────────────────────────────────────────
TEXT_BODY = """\
Dear {client_name},

Thank you for confirming your interest in initiating the sample development process with Skinovation Sciences.

Please find attached the sample initiation invoice along with the Sample Details Sheet for the product samples to be developed.

The attached sheet captures key product-level inputs such as product name, category, texture, key benefits, active ingredients, fragrance preference, colour preference, packaging direction, benchmark reference, quantity expectations, and other execution details required by our formulation and project team.

We request you to kindly review the attached Sample Details Sheet carefully and provide your confirmation, so that the samples can be developed accordingly and aligned with the approved product brief.

The sample initiation payment may be processed under either of the following models, as applicable to your project:
- Sample development payment only
- 10% advance payment against the final order value, which will confirm priority sample development and order booking alignment

Upon receipt of the payment confirmation and approval of the Sample Details Sheet, our team will initiate the internal workflow for formulation review, ingredient mapping, sample planning, and execution scheduling.

We request you to kindly share the payment confirmation screenshot once processed, along with confirmation on the attached Sample Details Sheet.

Best Wishes,
Team Skinovation Sciences
"""
