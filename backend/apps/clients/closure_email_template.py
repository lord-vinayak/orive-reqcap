# ============================================================
# Closure Email Template — final touchpoint before stepping back
# Edit this file to change email content — no code changes needed.
#
# Available tokens (use {token_name} in SUBJECT, HTML_BODY, TEXT_BODY):
#   {client_name}   — client's full name
#   {company_name}  — client's company name (or empty string if not set)
#   {sent_by_name}  — name of the person sending the email
# ============================================================

SUBJECT = "Should we close your file? 😊"

# ── HTML version (shown in modern email clients) ─────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Hi {client_name},</p>

  <p>
    I don't want to keep nudging if the timing isn't right — so this will be my last note for now.
  </p>

  <p>
    Before we step back, just know this: the hardest part of building a skincare brand is getting the product right. That's exactly where we specialize — customized, personalized formulations, backed by end-to-end support from R&amp;D to shelf.
  </p>

  <p>
    If your brand plans are on pause, no problem at all. Just hit reply with a "later" and I'll check back in a few months. And if you're ready now — even better. 😊
  </p>

  <p>Either way, wishing you the very best on your brand journey!</p>

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

I don't want to keep nudging if the timing isn't right — so this will be my last note for now.

Before we step back, just know this: the hardest part of building a skincare brand is getting the product right. That's exactly where we specialize — customized, personalized formulations, backed by end-to-end support from R&D to shelf.

If your brand plans are on pause, no problem at all. Just hit reply with a "later" and I'll check back in a few months. And if you're ready now — even better. 😊

Either way, wishing you the very best on your brand journey!

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
