# ============================================================
# Welcome Email Template for new / potential clients
# Edit this file to change email content — no code changes needed.
#
# Available tokens (use {token_name} in SUBJECT, HTML_BODY, TEXT_BODY):
#   {client_name}   — client's full name
#   {company_name}  — client's company name (or empty string if not set)
#   {sent_by_name}  — name of the person sending the email
# ============================================================

SUBJECT = "Skinovation Sciences — Your Skincare Brand Partner"

# ── HTML version (shown in modern email clients) ─────────────────────────────
HTML_BODY = """\
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px;">

  <p>Dear {client_name},</p>

  <p>
    Building a skincare brand is exciting — but let's be honest, it's also overwhelming. That's where we come in.
  </p>

  <p>
    At Skinovation Sciences, we turn your dream skincare brand into reality. Market research, R&amp;D, manufacturing, packaging, design, compliance, clinical testing, digital growth — we handle it all, so you can focus on building your brand. Our clients span PAN India, and here's what they get access to:
  </p>
  <ul>
    <li>500+ new-age, market-ready formulas</li>
    <li>A repository of 1000+ globally patented actives</li>
    <li>A verified network of 100+ vendors</li>
  </ul>

  <p>
    But here's what we believe matters most: getting the product right. It's the hardest, most time-consuming part of the journey — and it's where we roll up our sleeves and work with you on customized, personalized formulations that are truly yours.
  </p>

  <p>And through it all, three values guide us:</p>
  <p>
    🌿 Care for the planet — clean formulations, always<br/>
    📈 Growth — when your brand grows, we grow<br/>
    🤝 Transparency — every term and condition shared upfront, because we're in this for the long haul
  </p>

  <p>
    Let's build something great together. Reply to this email or give us a call — we'd love to build your brand story.
  </p>

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
Dear {client_name},

Building a skincare brand is exciting — but let's be honest, it's also overwhelming. That's where we come in.

At Skinovation Sciences, we turn your dream skincare brand into reality. Market research, R&D, manufacturing, packaging, design, compliance, clinical testing, digital growth — we handle it all, so you can focus on building your brand. Our clients span PAN India, and here's what they get access to:
- 500+ new-age, market-ready formulas
- A repository of 1000+ globally patented actives
- A verified network of 100+ vendors

But here's what we believe matters most: getting the product right. It's the hardest, most time-consuming part of the journey — and it's where we roll up our sleeves and work with you on customized, personalized formulations that are truly yours.

And through it all, three values guide us:
🌿 Care for the planet — clean formulations, always
📈 Growth — when your brand grows, we grow
🤝 Transparency — every term and condition shared upfront, because we're in this for the long haul

Let's build something great together. Reply to this email or give us a call — we'd love to build your brand story.

Best Wishes,
Team Skinovation Sciences
Your Skincare Brand Architect – Idea to Shelf

Brand Ideation • Formulation Development • Packaging Support • Compliance • Private Label Manufacturing • Brand Launch

For more information on product and process pls refer to this link - https://shorturl.at/roha4

Reach out to us at - Hello@skinovationsciences.com | +91-9818467515 | Sector 48, Gurgaon, Haryana
"""
