# ============================================================
# Reminder Email Template 2 — quick follow-up nudge
# Edit this file to change email content — no code changes needed.
#
# Available tokens (use {token_name} in SUBJECT, HTML_BODY, TEXT_BODY):
#   {client_name}   — client's full name
#   {company_name}  — client's company name (or empty string if not set)
#   {sent_by_name}  — name of the person sending the email
# ============================================================

SUBJECT = "Quick follow-up — your skincare brand idea"

# ── HTML version (shown in modern email clients) ─────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Hi {client_name},</p>

  <p>
    Just floating my earlier email back to the top of your inbox — I know how busy things get!
  </p>

  <p>
    We'd love to learn more about the brand you're envisioning. Whether you're still exploring or ready to dive in, a quick 15-minute chat could give you real clarity on formulations, timelines, and costs — no strings attached.
  </p>

  <p>
    With 500+ market-ready formulas and access to 1000+ globally patented actives, chances are we already have a head start on what you're dreaming up.
  </p>

  <p>Would this week or next work for a quick call?</p>

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

Just floating my earlier email back to the top of your inbox — I know how busy things get!

We'd love to learn more about the brand you're envisioning. Whether you're still exploring or ready to dive in, a quick 15-minute chat could give you real clarity on formulations, timelines, and costs — no strings attached.

With 500+ market-ready formulas and access to 1000+ globally patented actives, chances are we already have a head start on what you're dreaming up.

Would this week or next work for a quick call?

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
