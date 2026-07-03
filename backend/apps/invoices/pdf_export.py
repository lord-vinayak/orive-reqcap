"""ReportLab PDF builder for Skinovation invoices.

Four template variants share the same header/footer; only the line-item
column set differs.  Entry point: build_invoice_pdf(invoice) -> bytes.
"""
import io
import os
from decimal import Decimal
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable,
)
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

# ── Brand colours ────────────────────────────────────────────────────────────
MUSTARD   = colors.HexColor('#D6AE4D')
DARK_GOLD = colors.HexColor('#B8860B')
LIGHT_BG  = colors.HexColor('#FFFCF3')
BLACK     = colors.black
WHITE     = colors.white
GREY_TEXT = colors.HexColor('#555555')

# ── Company constants ─────────────────────────────────────────────────────────
COMPANY_NAME   = 'SKINOVATION RESEARCH PVT LTD'
COMPANY_GSTIN  = 'GSTIN: 06ABSCS5282N1ZF'
COMPANY_ADDR   = 'JMD Megapolis IT Park, Cabin No.21 Unit No.419, Sohna Road, Gurugram, Haryana, 122018'
BANK_DETAILS   = 'Bank Details: Bank of Baroda, Gurgaon, Current A/c - 33710200000413, IFSC CODE : BARB0SOHNAR'
UDYAM          = 'UDYAM-HR-05-0177805'
PAYMENT_LINK   = 'razorpay.me/@skinovationsciences'

PDF_MIME = 'application/pdf'

# ── Logo resolution (same logic as xlsx_export.py) ───────────────────────────
_HERE = Path(__file__).resolve()
_LOGO_CANDIDATES = [
    _HERE.parents[2] / 'logo.png',
    _HERE.parents[3] / 'frontend' / 'public' / 'logo.png',
    _HERE.parents[3] / 'frontend' / 'dist' / 'logo.png',
]


def _find_logo():
    for p in _LOGO_CANDIDATES:
        if p.exists():
            return str(p)
    env_path = os.environ.get('SKINOVATION_LOGO_PATH')
    if env_path and Path(env_path).exists():
        return env_path
    return None


# ── Column specs per invoice type ────────────────────────────────────────────
# Each spec: (header_label, item_key, col_width_mm)
# item_key None → computed column
COLUMN_SPECS = {
    'service': [
        ('Item',        'item_name',    60),
        ('HSN',         'hsn',          20),
        ('Rate / Item', 'rate_per_item',28),
        ('Qty',         'qty',          14),
        ('Amount',      '_amount',      28),
        ('Payable',     '_amount',      28),
    ],
    'product_batch': [
        ('Item',        'item_name',    44),
        ('Batch No',    'batch_no',     18),
        ('Exp Date',    'exp_date',     18),
        ('Size (in ml)','size_ml',      18),
        ('HSN',         'hsn',          16),
        ('Rate / Item', 'rate_per_item',22),
        ('Qty',         'qty',          12),
        ('Amount',      '_amount',      22),
    ],
    'product_simple': [
        ('Item',        'item_name',    70),
        ('Rate / Item', 'rate_per_item',30),
        ('Qty',         'qty',          16),
        ('Amount',      '_amount',      28),
        ('Payable',     '_amount',      34),
    ],
    'service_size': [
        ('Item',        'item_name',    56),
        ('Size (in ml)','size_ml',      22),
        ('HSN',         'hsn',          18),
        ('Rate / Item', 'rate_per_item',26),
        ('Qty',         'qty',          14),
        ('Payable',     '_amount',      32),
    ],
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _d(val):
    try:
        return Decimal(str(val))
    except Exception:
        return Decimal('0')


def _fmt(val):
    """Format decimal as ₹ X,XX,XXX.XX (Indian style)."""
    d = _d(val)
    # Simple formatting — locale not available in all envs
    return f'Rs. {d:,.2f}'


def _get_cell(item, key):
    if key == '_amount':
        return _fmt(_d(item.get('rate_per_item', 0)) * _d(item.get('qty', 0)))
    v = item.get(key, '')
    if v is None or v == '':
        return '0'
    return str(v)


# ── Main builder ─────────────────────────────────────────────────────────────

def build_invoice_pdf(invoice) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=12*mm, rightMargin=12*mm,
        topMargin=10*mm, bottomMargin=10*mm,
    )
    styles = getSampleStyleSheet()
    w = A4[0] - 24*mm  # usable width

    story = []
    story += _build_header(w, styles)
    story += _build_invoice_meta(invoice, w, styles)
    story += _build_bill_to(invoice, w, styles)
    story += _build_items_table(invoice, w, styles)
    story += _build_footer(invoice, w, styles)

    doc.build(story)
    return buf.getvalue()


# ── Section builders ─────────────────────────────────────────────────────────

def _build_header(w, styles):
    """Company name + contact block on left, logo on right."""
    logo_path = _find_logo()

    name_style = ParagraphStyle(
        'CoName', parent=styles['Normal'],
        fontSize=16, textColor=MUSTARD, fontName='Helvetica-Bold', leading=20,
    )
    info_style = ParagraphStyle(
        'CoInfo', parent=styles['Normal'],
        fontSize=8, textColor=BLACK, leading=11,
    )
    bold_info = ParagraphStyle(
        'CoInfoB', parent=styles['Normal'],
        fontSize=8, textColor=BLACK, fontName='Helvetica-Bold', leading=11,
    )

    left = [
        Paragraph(COMPANY_NAME, name_style),
        Paragraph(COMPANY_GSTIN, info_style),
        Paragraph(COMPANY_ADDR, info_style),
        Paragraph(BANK_DETAILS, info_style),
        Paragraph(
            f'<b>{UDYAM}</b>    Payment Link:  '
            f'<font color="#1155CC"><u>{PAYMENT_LINK}</u></font>',
            bold_info,
        ),
    ]

    if logo_path:
        logo_img = Image(logo_path, width=22*mm, height=22*mm, kind='proportional')
        right_cell = logo_img
    else:
        right_cell = Paragraph('', styles['Normal'])

    left_w = w - 26*mm
    tbl = Table([[left, right_cell]], colWidths=[left_w, 26*mm])
    tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN',  (1, 0), (1, 0),  'RIGHT'),
        ('LEFTPADDING',  (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING',   (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 2),
    ]))
    return [tbl, Spacer(1, 2*mm)]


def _build_invoice_meta(invoice, w, styles):
    """INVOICE # | blank | DATE row."""
    label_s = ParagraphStyle('MetaLabel', parent=styles['Normal'],
                              fontSize=8, textColor=MUSTARD, fontName='Helvetica-Bold')
    val_s   = ParagraphStyle('MetaVal',   parent=styles['Normal'],
                              fontSize=8, textColor=BLACK)

    d = invoice.date
    date_str = f"{d.day}-{d.month}-{d.year}"

    row = [
        [Paragraph('INVOICE #', label_s), Paragraph(invoice.invoice_number, val_s)],
        Paragraph('', styles['Normal']),
        [Paragraph('DATE', label_s), Paragraph(date_str, val_s)],
    ]

    left_w  = w * 0.35
    mid_w   = w * 0.35
    right_w = w * 0.30

    inner_left  = Table([[Paragraph('INVOICE #', label_s), Paragraph(invoice.invoice_number, val_s)]],
                         colWidths=[20*mm, left_w - 20*mm])
    inner_right = Table([[Paragraph('DATE', label_s), Paragraph(date_str, val_s)]],
                         colWidths=[12*mm, right_w - 12*mm])

    for t in (inner_left, inner_right):
        t.setStyle(TableStyle([
            ('LEFTPADDING',  (0,0),(-1,-1), 0),
            ('RIGHTPADDING', (0,0),(-1,-1), 0),
            ('TOPPADDING',   (0,0),(-1,-1), 0),
            ('BOTTOMPADDING',(0,0),(-1,-1), 0),
        ]))

    outer = Table([[inner_left, '', inner_right]], colWidths=[left_w, mid_w, right_w])
    outer.setStyle(TableStyle([
        ('BOX',    (0,0),(-1,-1), 0.5, colors.black),
        ('INNERGRID',(0,0),(-1,-1), 0.5, colors.black),
        ('BACKGROUND', (0,0),(-1,-1), LIGHT_BG),
        ('VALIGN', (0,0),(-1,-1), 'MIDDLE'),
        ('TOPPADDING',   (0,0),(-1,-1), 2),
        ('BOTTOMPADDING',(0,0),(-1,-1), 2),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
    ]))
    return [outer, Spacer(1, 0.5*mm)]


def _build_bill_to(invoice, w, styles):
    """Bill To / Billing Address / Shipping Address block + Eway Bill."""
    hdr_s  = ParagraphStyle('BillHdr',  parent=styles['Normal'],
                             fontSize=8, fontName='Helvetica-Bold', textColor=BLACK)
    lbl_s  = ParagraphStyle('BillLbl',  parent=styles['Normal'],
                             fontSize=8, fontName='Helvetica-Bold', textColor=MUSTARD)
    val_s  = ParagraphStyle('BillVal',  parent=styles['Normal'],
                             fontSize=8, textColor=BLACK)
    bold_s = ParagraphStyle('BillBold', parent=styles['Normal'],
                             fontSize=8, fontName='Helvetica-Bold', textColor=BLACK)

    col1_w = w * 0.35
    col2_w = w * 0.325
    col3_w = w * 0.325

    # Header row
    hdr_row = [
        Paragraph('BILL TO', hdr_s),
        Paragraph('BILLING ADDRESS', hdr_s),
        Paragraph('SHIPPING ADDRESS', hdr_s),
    ]

    rows = [hdr_row]

    def _lbl_val(label, value, label_style=lbl_s, val_style=val_s):
        return Table(
            [[Paragraph(label, label_style), Paragraph(str(value), val_style)]],
            colWidths=[col1_w * 0.45, col1_w * 0.55],
        )

    # CLIENT row
    client_lbl = 'CLIENT NAME' if invoice.invoice_type == 'product_simple' else 'CLIENT'
    comp_lbl   = 'COMPANY NAME' if invoice.invoice_type == 'product_simple' else 'COMPANY'

    rows.append([
        Table([
            [Paragraph(client_lbl, lbl_s), Paragraph(invoice.client_name, bold_s)],
            [Paragraph(comp_lbl,   lbl_s), Paragraph(invoice.company_name or '0', val_s)],
            [Paragraph('GSTIN:',   lbl_s), Paragraph(invoice.client_gstin or '0', val_s)],
        ], colWidths=[col1_w * 0.4, col1_w * 0.6]),
        Paragraph(invoice.billing_address or '0', val_s),
        Paragraph(invoice.shipping_address or '0', val_s),
    ])

    outer = Table(rows, colWidths=[col1_w, col2_w, col3_w])
    outer.setStyle(TableStyle([
        ('BOX',      (0,0),(-1,-1), 0.5, colors.black),
        ('INNERGRID',(0,0),(-1,-1), 0.5, colors.black),
        ('BACKGROUND',(0,0),(2,0),  LIGHT_BG),
        ('FONTNAME', (0,0),(2,0),   'Helvetica-Bold'),
        ('VALIGN',   (0,0),(-1,-1), 'TOP'),
        ('TOPPADDING',   (0,0),(-1,-1), 2),
        ('BOTTOMPADDING',(0,0),(-1,-1), 2),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
    ]))

    # Eway Bill row
    eway_tbl = Table(
        [[Paragraph('Eway Bill No', lbl_s), Paragraph(invoice.eway_bill_no or 'XX', val_s)]],
        colWidths=[25*mm, w - 25*mm],
    )
    eway_tbl.setStyle(TableStyle([
        ('BOX',     (0,0),(-1,-1), 0.5, colors.black),
        ('TOPPADDING',   (0,0),(-1,-1), 2),
        ('BOTTOMPADDING',(0,0),(-1,-1), 2),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
    ]))

    return [outer, eway_tbl, Spacer(1, 1*mm)]


def _build_items_table(invoice, w, styles):
    """Line items table — columns vary by invoice type."""
    specs = COLUMN_SPECS[invoice.invoice_type]
    col_widths = [s[2]*mm for s in specs]
    # Scale proportionally to fit width
    total_spec = sum(col_widths)
    col_widths = [cw * w / total_spec for cw in col_widths]

    hdr_s = ParagraphStyle('IHdr', parent=styles['Normal'],
                            fontSize=8, fontName='Helvetica-Bold', textColor=MUSTARD)
    cell_s = ParagraphStyle('ICell', parent=styles['Normal'], fontSize=8, textColor=BLACK)
    num_s  = ParagraphStyle('INum',  parent=styles['Normal'],
                             fontSize=8, textColor=MUSTARD, alignment=TA_RIGHT)

    header_row = [Paragraph(s[0], hdr_s) for s in specs]
    data = [header_row]

    items = invoice.items or []
    for item in items:
        row = []
        for label, key, _ in specs:
            raw = _get_cell(item, key)
            if key in ('rate_per_item', '_amount') or (key == 'qty' and raw != '0'):
                row.append(Paragraph(raw if key == '_amount' else (f'Rs. {_d(raw):,.2f}' if key == "rate_per_item" else raw), num_s))
            else:
                row.append(Paragraph(raw, cell_s))
        data.append(row)

    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    style = TableStyle([
        ('BOX',       (0,0),(-1,-1), 0.5, colors.black),
        ('INNERGRID', (0,0),(-1,-1), 0.3, colors.HexColor('#CCCCCC')),
        ('BACKGROUND',(0,0),(-1,0),  LIGHT_BG),
        ('LINEBELOW', (0,0),(-1,0),  0.5, MUSTARD),
        ('VALIGN',    (0,0),(-1,-1), 'MIDDLE'),
        ('TOPPADDING',   (0,0),(-1,-1), 2),
        ('BOTTOMPADDING',(0,0),(-1,-1), 2),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
    ])
    tbl.setStyle(style)
    return [tbl, Spacer(1, 0.5*mm)]


def _build_footer(invoice, w, styles):
    """Sum Total, SGST, CGST, IGST, Net Payable, optional extras."""
    lbl_s  = ParagraphStyle('FLbl', parent=styles['Normal'],
                             fontSize=8, fontName='Helvetica-Bold', textColor=MUSTARD)
    val_s  = ParagraphStyle('FVal', parent=styles['Normal'],
                             fontSize=8, textColor=BLACK, alignment=TA_RIGHT)
    bold_s = ParagraphStyle('FBold', parent=styles['Normal'],
                             fontSize=8, fontName='Helvetica-Bold', textColor=BLACK, alignment=TA_RIGHT)

    items = invoice.items or []
    sum_total = sum(_d(it.get('rate_per_item', 0)) * _d(it.get('qty', 0)) for it in items)

    sgst = sum_total * _d(invoice.sgst_rate) / 100
    cgst = sum_total * _d(invoice.cgst_rate) / 100
    igst = sum_total * _d(invoice.igst_rate) / 100
    net  = sum_total + sgst + cgst + igst

    label_w = w * 0.75
    val_w   = w * 0.25

    def _row(label, value, bold=False):
        return [
            Paragraph(label, lbl_s),
            Paragraph(value, bold_s if bold else val_s),
        ]

    data = [
        _row('Sum Total Amount', _fmt(sum_total)),
        _row(f'SGST', f'{invoice.sgst_rate}%    {_fmt(sgst)}'),
        _row(f'CGST', f'{invoice.cgst_rate}%    {_fmt(cgst)}'),
        _row(f'IGST', f'{invoice.igst_rate}%    {_fmt(igst)}'),
        _row('Net Payable', _fmt(net), bold=True),
    ]

    if invoice.invoice_type == 'product_simple' and _d(invoice.shipping_cost):
        net_with_ship = net + _d(invoice.shipping_cost)
        data.insert(-1, _row('Shipping', _fmt(invoice.shipping_cost)))
        data[-1] = _row('Net Payable', _fmt(net_with_ship), bold=True)

    if invoice.invoice_type == 'product_batch' and _d(invoice.advance_rate):
        advance_amt = net * _d(invoice.advance_rate) / 100
        data.append(_row(f'Advance to be paid', f'{invoice.advance_rate}%    {_fmt(advance_amt)}'))

    tbl = Table(data, colWidths=[label_w, val_w])
    tbl.setStyle(TableStyle([
        ('BOX',       (0,0),(-1,-1), 0.5, colors.black),
        ('INNERGRID', (0,0),(-1,-1), 0.3, colors.HexColor('#CCCCCC')),
        ('BACKGROUND',(0,-1),(-1,-1), LIGHT_BG),
        ('LINEABOVE', (0,-1),(-1,-1), 0.5, MUSTARD),
        ('TOPPADDING',   (0,0),(-1,-1), 2),
        ('BOTTOMPADDING',(0,0),(-1,-1), 2),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
        ('VALIGN',    (0,0),(-1,-1), 'MIDDLE'),
    ]))
    return [tbl]
