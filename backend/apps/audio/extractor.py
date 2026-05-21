"""Hybrid transcript → structured product fields extractor.

1) Run a fast keyword-matching pass against the known dropdown vocabularies.
2) Send the (transcript + remaining-unknown fields) to Groq for cleanup.
"""
import json
import re
from django.conf import settings


VOCAB = {
    'body_part': ['Face', 'Body', 'Hair', 'Lip', 'Eye'],
    'category': ['Wash', 'Moisturizer', 'Serum', 'Toner', 'Mask',
                 'Sunscreen', 'Scrub', 'Oil', 'Shampoo', 'Conditioner', 'Spray'],
    'sub_category_by_category': {
        'Wash': ['Foaming', 'Gel', 'Creamy', 'Gel with beads', 'Pearly', 'Transparent', 'Gloss'],
        'Moisturizer': ['Gel', 'Gel Cream', 'Cream - light', 'Cream - thick', 'Lotion', 'Balm'],
        'Serum': ['Water Based', 'Oil Based'],
        'Toner': ['Water', 'Milky'],
        'Mask': ['Clay', 'Cream'],
        'Sunscreen': ['Spray', 'Gel', 'Gel Cream', 'Cream - light', 'Cream - thick', 'Lotion'],
        'Scrub': ['Physical', 'Chemical'],
        'Oil': ['Light Weight', 'Normal'],
        'Shampoo': ['Pearly', 'Transparent', 'Gel', 'Creamy'],
        'Conditioner': ['Lotion', 'Cream - light', 'Cream - thick'],
        'Spray': ['Mist', 'Deodorant'],
    },
    'key_benefits_by_body': {
        'Face': ['Acne', 'Pigmentation', 'Glow', 'Skin Lightening', 'Aging',
                 'Wrinkle', 'Hydration', 'Barrier Repair', 'Dark Circle'],
        'Body': ['Acne', 'Pigmentation', 'Glow', 'Skin Lightening', 'Aging',
                 'Wrinkle', 'Hydration', 'Barrier Repair'],
        'Lip': ['Acne', 'Pigmentation', 'Glow', 'Hydration'],
        'Eye': ['Dark Circle', 'Aging', 'Wrinkle', 'Hydration'],
        'Hair': ['Dandruff', 'Thinning', 'Greying', 'Growth', 'Hydration', 'Frizz', 'Bond Repair'],
    },
    'sizes': ['8', '15', '30', '50', '100', '150', '200'],
    'packaging': ['Jar', 'Bottle', 'Tube'],
}


def _keyword_pass(transcript: str) -> dict:
    t = transcript.lower()
    result = {}

    for label in VOCAB['body_part']:
        if re.search(rf'\b{label.lower()}\b', t):
            result['body_part'] = label
            break

    for label in VOCAB['category']:
        if re.search(rf'\b{label.lower()}\b', t):
            result['category'] = label
            break

    if 'category' in result:
        for sub in VOCAB['sub_category_by_category'].get(result['category'], []):
            if sub.lower() in t:
                result['sub_category'] = sub
                break

    if 'body_part' in result:
        kbs = []
        for kb in VOCAB['key_benefits_by_body'].get(result['body_part'], []):
            if kb.lower() in t:
                kbs.append(kb)
        if kbs:
            result['key_benefits'] = kbs

    # size: look for "30 ml", "100ml", "size 50"
    size_match = re.search(r'(\d+)\s*(ml|gm|g)\b', t) or re.search(r'size\s*(\d+)', t)
    if size_match and size_match.group(1) in VOCAB['sizes']:
        result['size'] = size_match.group(1)

    for pkg in VOCAB['packaging']:
        if pkg.lower() in t:
            result['packaging_type'] = pkg
            break

    # MRP: "mrp 500", "rupees 800", "₹1200"
    mrp = (
        re.search(r'mrp[^\d]*(\d+)', t)
        or re.search(r'(?:rs|rupees|₹)\s*(\d+)', t)
        or re.search(r'(\d+)\s*rupees', t)
    )
    if mrp:
        try:
            result['planned_mrp'] = float(mrp.group(1))
        except ValueError:
            pass

    if re.search(r'\bcolor(ed)?\b|\bwith color\b', t):
        result['has_color'] = True
    elif re.search(r'\bno color\b|\bcolorless\b', t):
        result['has_color'] = False

    if re.search(r'\bfragrance\b|\bperfumed\b|\bscented\b', t):
        result['has_fragrance'] = True
    elif re.search(r'\bno fragrance\b|\bunscented\b|\bfragrance free\b', t):
        result['has_fragrance'] = False

    return result


def _groq_pass(transcript: str, partial: dict) -> dict:
    """Ask Groq to fill in remaining fields and clean up."""
    if not settings.GROQ_API_KEY:
        return partial

    try:
        from groq import Groq
    except ImportError:
        return partial

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
    except Exception:
        return partial

    system = (
        "You extract structured skincare product requirements from a sales call transcript. "
        "Return ONLY a single JSON object. No prose. No code fences. "
        "Use ONLY these allowed values for each field:\n"
        f"- body_part: {VOCAB['body_part']}\n"
        f"- category: {VOCAB['category']}\n"
        f"- sub_category (depends on category): {VOCAB['sub_category_by_category']}\n"
        f"- key_benefits (array, depends on body_part): {VOCAB['key_benefits_by_body']}\n"
        f"- size (string, one of): {VOCAB['sizes']}\n"
        f"- packaging_type: {VOCAB['packaging']}\n"
        "- planned_mrp: number, in INR\n"
        "- specific_ingredient: free text\n"
        "- benchmark_product: free text (brand/product name client referenced)\n"
        "- has_color: boolean | null\n"
        "- color_details: free text\n"
        "- has_fragrance: boolean | null\n"
        "- fragrance_details: free text\n\n"
        "If a value isn't clearly stated, OMIT the key. Do NOT invent."
    )

    user = (
        f"Transcript:\n{transcript}\n\n"
        f"Already extracted (you may overwrite if confident):\n{json.dumps(partial)}"
    )

    try:
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {'role': 'system', 'content': system},
                {'role': 'user', 'content': user},
            ],
            temperature=0.1,
            response_format={'type': 'json_object'},
            max_tokens=600,
        )
        content = resp.choices[0].message.content
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return partial


def extract_fields(transcript: str) -> dict:
    if not transcript or not transcript.strip():
        return {}
    partial = _keyword_pass(transcript)
    enriched = _groq_pass(transcript, partial)
    # Keyword results take precedence if Groq is unavailable / fails
    merged = {**enriched, **{k: v for k, v in partial.items() if v}}
    return merged
