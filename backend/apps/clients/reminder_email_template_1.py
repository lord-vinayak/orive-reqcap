# ============================================================
# Reminder Email Template 1 — "couldn't reach you" follow-up
# Edit this file to change email content — no code changes needed.
#
# Available tokens (use {token_name} in SUBJECT, HTML_BODY, TEXT_BODY):
#   {client_name}   — client's full name
#   {company_name}  — client's company name (or empty string if not set)
#   {sent_by_name}  — name of the person sending the email
# ============================================================

SUBJECT = "Tried reaching you — let's find a better time"

# ── HTML version (shown in modern email clients) ─────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Hi {client_name},</p>

  <p>
    I tried giving you a call earlier today but couldn't get through — I know how packed schedules can be!
  </p>

  <p>
    I was hoping to have a quick chat about your skincare brand plans and how we could support you — from customized formulations to complete brand execution.
  </p>

  <p>
    Rather than playing phone tag, would you like to pick a time that suits you? Just reply with a day and time, or share a number and time slot, and I'll call you then.
  </p>

  <p>
    Please feel free to reach out to us via email, call or WhatsApp at your convenience, or let us know a suitable time to connect over a call.
  </p>

  <p>Looking forward to working with you.</p>

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

# ── Plain-text fallback ───────────────────────────────────────────────────────
TEXT_BODY = """\
Hi {client_name},

I tried giving you a call earlier today but couldn't get through — I know how packed schedules can be!

I was hoping to have a quick chat about your skincare brand plans and how we could support you — from customized formulations to complete brand execution.

Rather than playing phone tag, would you like to pick a time that suits you? Just reply with a day and time, or share a number and time slot, and I'll call you then.

Please feel free to reach out to us via email, call or WhatsApp at your convenience, or let us know a suitable time to connect over a call.

Looking forward to working with you.

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
