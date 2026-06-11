# ============================================================
# Welcome Email Template for new / potential clients
# Edit this file to change email content — no code changes needed.
#
# Available tokens (use {token_name} in SUBJECT, HTML_BODY, TEXT_BODY):
#   {client_name}   — client's full name
#   {company_name}  — client's company name (or empty string if not set)
#   {sent_by_name}  — name of the person sending the email
# ============================================================

SUBJECT = "Welcome to Skinovation Sciences"

# ── HTML version (shown in modern email clients) ─────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>Greetings from <strong>Skinovation Sciences</strong>!</p>

  <p>
    We are delighted to connect with you{company_line}.
  </p>

  <p>
    <em><!-- TODO: Replace this placeholder with your actual welcome message content. --></em>
  </p>

  <p>
    Test
  </p>

  <p>
    Test
  </p>

  <p>Warm regards,<br/>
  <strong>{sent_by_name}</strong><br/>
  Skinovation Sciences</p>

</body>
</html>
"""

# ── Plain-text fallback ───────────────────────────────────────────────────────
TEXT_BODY = """\
Dear {client_name},

Greetings from Skinovation Sciences!

We are delighted to connect with you{company_line} and look forward to supporting your journey in developing world-class skincare and personal care products.

TODO: Replace this placeholder with your actual welcome message content.

At Skinovation Sciences, we specialise in end-to-end product development — from formulation and sampling to packaging, testing, and dispatch. Our team is here to help you every step of the way.

Please feel free to reach out to us at any time. We will be happy to schedule a call or share more information about our capabilities.

Warm regards,
{sent_by_name}
Skinovation Sciences
"""
