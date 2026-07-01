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

  <p>Thank you for connecting with <strong>Skinovation Sciences</strong>.</p>

  <p>
    Skinovation Sciences is India's idea-to-shelf skincare innovation partner, helping founders, doctors, clinics, and emerging brands launch high-quality skincare, haircare, body care, and personal care products through a structured ecosystem covering R&amp;D, formulation, compliance, testing, packaging, manufacturing, and launch support.
  </p>

  <p>For your reference, please find attached our</p>
  <ul>
    <li>Client Deck</li>
    <li>FAQ Document</li>
    <li>Product Catalog</li>
  </ul>

  <p>
    These documents will give you a clear overview of our capabilities, product categories, process flow, timelines, and engagement model.
  </p>

  <p>
    We request you to kindly share your product requirements over email or WhatsApp so our team can evaluate the scope and guide you with the next steps. Alternatively, we would be happy to connect over a call to understand your brand vision, product expectations, MOQ, packaging preference, and launch timeline.
  </p>

  <p>Looking forward to supporting your skincare brand journey.</p>

  <p>Best Wishes,<br/>
  <strong>Team Skinovation Sciences</strong></p>

</body>
</html>
"""

# ── Plain-text fallback ───────────────────────────────────────────────────────
TEXT_BODY = """\
Dear {client_name},

Thank you for connecting with Skinovation Sciences.

Skinovation Sciences is India's idea-to-shelf skincare innovation partner, helping founders, doctors, clinics, and emerging brands launch high-quality skincare, haircare, body care, and personal care products through a structured ecosystem covering R&D, formulation, compliance, testing, packaging, manufacturing, and launch support.

For your reference, please find attached our
- Client Deck
- FAQ Document
- Product Catalog

These documents will give you a clear overview of our capabilities, product categories, process flow, timelines, and engagement model.

We request you to kindly share your product requirements over email or WhatsApp so our team can evaluate the scope and guide you with the next steps. Alternatively, we would be happy to connect over a call to understand your brand vision, product expectations, MOQ, packaging preference, and launch timeline.

Looking forward to supporting your skincare brand journey.

Best Wishes,
Team Skinovation Sciences
"""
