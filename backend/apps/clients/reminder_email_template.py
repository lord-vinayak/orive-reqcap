# ============================================================
# Reminder Email Template for clients who didn't respond
# Edit this file to change email content — no code changes needed.
#
# Available tokens (use {token_name} in SUBJECT, HTML_BODY, TEXT_BODY):
#   {client_name}   — client's full name
#   {company_name}  — client's company name (or empty string if not set)
#   {sent_by_name}  — name of the person sending the email
# ============================================================

SUBJECT = "Follow-Up on Your Skincare Product Requirement"

# ── HTML version (shown in modern email clients) ─────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>I hope you are doing well.</p>

  <p>
    We tried reaching you over phone to discuss your skincare product requirement, but were unable to connect.
  </p>

  <p>
    We would be happy to understand your product idea, category, expected quantity, packaging preference, and launch timeline so that our team can guide you with the most suitable formulation and execution pathway.
  </p>

  <p>
    You may share your requirements over email or WhatsApp at your convenience, or let us know a suitable time to connect over a call.
  </p>

  <p>Looking forward to hearing from you and taking this discussion forward.</p>

  <p>Best Wishes,<br/>
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

# ── Plain-text fallback ───────────────────────────────────────────────────────
TEXT_BODY = """\
Dear {client_name},

I hope you are doing well.

We tried reaching you over phone to discuss your skincare product requirement, but were unable to connect.

We would be happy to understand your product idea, category, expected quantity, packaging preference, and launch timeline so that our team can guide you with the most suitable formulation and execution pathway.

You may share your requirements over email or WhatsApp at your convenience, or let us know a suitable time to connect over a call.

Looking forward to hearing from you and taking this discussion forward.

Best Wishes,
Team Skinovation Sciences
"""
