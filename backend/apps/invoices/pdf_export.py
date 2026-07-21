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
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

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

# ── Unicode font for ₹ support ────────────────────────────────────────────────
# Try platform font candidates; fall back to Helvetica if none found.
_FONT_REGULAR_CANDIDATES = [
    Path(r'C:/Windows/Fonts/arial.ttf'),
    Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
    Path('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'),
    Path('/usr/share/fonts/truetype/freefont/FreeSans.ttf'),
]
_FONT_BOLD_CANDIDATES = [
    Path(r'C:/Windows/Fonts/arialbd.ttf'),
    Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
    Path('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'),
    Path('/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'),
]

_FONT      = 'Helvetica'
_FONT_BOLD = 'Helvetica-Bold'
_CURRENCY  = 'Rs. '

def _try_register(name, candidates):
    for p in candidates:
        if p.exists():
            try:
                pdfmetrics.registerFont(TTFont(name, str(p)))
                return True
            except Exception:
                pass
    return False

# ponytail: only upgrade fonts once at import time
if _try_register('_InvFont', _FONT_REGULAR_CANDIDATES) and _try_register('_InvFontBold', _FONT_BOLD_CANDIDATES):
    _FONT      = '_InvFont'
    _FONT_BOLD = '_InvFontBold'
    _CURRENCY  = '₹ '

# ── Logo resolution ───────────────────────────────────────────────────────────
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
COLUMN_SPECS = {
    'service': [
        ('Item',        'item_name',    60),
        ('HSN',         'hsn',          20),
        ('Rate / Item', 'rate_per_item',28),
        ('Qty',         'qty',          14),
        ('Amount',      '_amount',      28),
        ('Payable',     '_payable',      28),
    ],
    'product_batch': [
        ('Item',        'item_name',    44),
        ('Batch No',    'batch_no',     18),
        ('Exp Date',    'exp_date',     18),
        ('Size (in ml)','size_ml',      18),
        ('HSN / SAC',   'hsn',          16),
        ('Rate / Item', 'rate_per_item',22),
        ('Qty',         'qty',          12),
        ('Amount',      '_amount',      22),
    ],
    'product_simple': [
        ('Item',        'item_name',    70),
        ('Rate / Item', 'rate_per_item',30),
        ('Qty',         'qty',          16),
        ('Amount',      '_amount',      28),
        ('Payable',     '_payable',      34),
    ],
    'printing': [
        ('Item',        'item_name',    50),
        ('Size (in ml)','size_ml',      20),
        ('HSN / SAC',   'hsn',          20),
        ('Rate / Item', 'rate_per_item',24),
        ('Qty',         'qty',          14),
        ('Amount',      '_amount',      26),
    ],
    'final': [
        ('Item',        'item_name',    44),
        ('Batch No',    'batch_no',     18),
        ('Exp Date',    'exp_date',     18),
        ('Size (in ml)','size_ml',      18),
        ('HSN',         'hsn',          16),
        ('Rate / Item', 'rate_per_item',22),
        ('Qty',         'qty',          12),
        ('Payable',     '_payable',      22),
    ],
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _d(val):
    try:
        return Decimal(str(val))
    except Exception:
        return Decimal('0')


def _fmt(val):
    """Format decimal as currency (Indian style)."""
    return f'{_CURRENCY}{_d(val):,.2f}'


def _get_cell(item, key):
    if key == '_amount':
        return _fmt(_d(item.get('rate_per_item', 0)) * _d(item.get('qty', 0)))
    if key == '_payable':
        payable = item.get('payable')
        if payable is None or payable == '':
            payable = _d(item.get('rate_per_item', 0)) * _d(item.get('qty', 0))
        return _fmt(payable)
    v = item.get(key, '')
    if v is None or v == '':
        return '0'
    if key == 'rate_per_item':
        return _fmt(_d(v))
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
    if invoice.invoice_type == 'product_batch':
        story += _build_advance_body(invoice, w, styles)
    else:
        story += _build_items_table(invoice.items or [], COLUMN_SPECS[invoice.invoice_type], w, styles)
        story += _build_footer(invoice, w, styles)

    doc.build(story)
    return buf.getvalue()


# ── Section builders ─────────────────────────────────────────────────────────

def _build_header(w, styles):
    """Company name + contact block on left, logo on right."""
    logo_path = _find_logo()

    name_style = ParagraphStyle(
        'CoName', parent=styles['Normal'],
        fontSize=16, textColor=MUSTARD, fontName=_FONT_BOLD, leading=20,
    )
    info_style = ParagraphStyle(
        'CoInfo', parent=styles['Normal'],
        fontSize=8, textColor=BLACK, fontName=_FONT, leading=11,
    )
    bold_info = ParagraphStyle(
        'CoInfoB', parent=styles['Normal'],
        fontSize=8, textColor=BLACK, fontName=_FONT_BOLD, leading=11,
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
                              fontSize=8, textColor=MUSTARD, fontName=_FONT_BOLD)
    val_s   = ParagraphStyle('MetaVal',   parent=styles['Normal'],
                              fontSize=8, textColor=BLACK, fontName=_FONT)

    d = invoice.date
    date_str = f"{d.day}-{d.month}-{d.year}"

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
        ('BACKGROUND', (0,0),(-1,-1), LIGHT_BG),
        ('VALIGN', (0,0),(-1,-1), 'MIDDLE'),
        ('TOPPADDING',   (0,0),(-1,-1), 2),
        ('BOTTOMPADDING',(0,0),(-1,-1), 2),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
    ]))
    return [outer]


def _build_bill_to(invoice, w, styles):
    """Bill To / Billing Address / Shipping Address block + Eway Bill."""
    hdr_s  = ParagraphStyle('BillHdr',  parent=styles['Normal'],
                             fontSize=8, fontName=_FONT_BOLD, textColor=BLACK)
    lbl_s  = ParagraphStyle('BillLbl',  parent=styles['Normal'],
                             fontSize=8, fontName=_FONT_BOLD, textColor=MUSTARD)
    val_s  = ParagraphStyle('BillVal',  parent=styles['Normal'],
                             fontSize=8, textColor=BLACK, fontName=_FONT)
    bold_s = ParagraphStyle('BillBold', parent=styles['Normal'],
                             fontSize=8, fontName=_FONT_BOLD, textColor=BLACK)

    is_final = invoice.invoice_type == 'final'

    if is_final:
        col1_w = w * 0.28
        col2_w = w * 0.24
        col3_w = w * 0.24
        col4_w = w * 0.24
        hdr_row = [
            Paragraph('BILL TO', hdr_s),
            Paragraph('BILLING ADDRESS', hdr_s),
            Paragraph('SHIPPING ADDRESS', hdr_s),
            Paragraph('DISPATCH ADDRESS', hdr_s),
        ]
        data_row = [
            Table([
                [Paragraph('CLIENT',  lbl_s), Paragraph(invoice.client_name, bold_s)],
                [Paragraph('COMPANY', lbl_s), Paragraph(invoice.company_name or '0', val_s)],
                [Paragraph('GSTIN:',  lbl_s), Paragraph(invoice.client_gstin or '0', val_s)],
            ], colWidths=[col1_w * 0.4, col1_w * 0.6]),
            Paragraph(invoice.billing_address or '0', val_s),
            Paragraph(invoice.shipping_address or '0', val_s),
            Paragraph(getattr(invoice, 'dispatch_address', '') or '0', val_s),
        ]
        col_widths = [col1_w, col2_w, col3_w, col4_w]
        hdr_span = (0, 0), (3, 0)
    elif invoice.invoice_type == 'printing':
        col1_w = w * 0.45
        col2_w = w * 0.55
        hdr_row = [
            Paragraph('BILL TO', hdr_s),
            Paragraph('BILLING ADDRESS', hdr_s),
        ]
        data_row = [
            Table([
                [Paragraph('CLIENT',  lbl_s), Paragraph(invoice.client_name, bold_s)],
                [Paragraph('COMPANY', lbl_s), Paragraph(invoice.company_name or '0', val_s)],
                [Paragraph('GSTIN:',  lbl_s), Paragraph(invoice.client_gstin or '0', val_s)],
            ], colWidths=[col1_w * 0.4, col1_w * 0.6]),
            Paragraph(invoice.billing_address or '0', val_s),
        ]
        col_widths = [col1_w, col2_w]
        hdr_span = (0, 0), (1, 0)
    else:
        col1_w = w * 0.35
        col2_w = w * 0.325
        col3_w = w * 0.325
        client_lbl = 'CLIENT NAME' if invoice.invoice_type == 'product_simple' else 'CLIENT'
        comp_lbl   = 'COMPANY NAME' if invoice.invoice_type == 'product_simple' else 'COMPANY'
        hdr_row = [
            Paragraph('BILL TO', hdr_s),
            Paragraph('BILLING ADDRESS', hdr_s),
            Paragraph('SHIPPING ADDRESS', hdr_s),
        ]
        data_row = [
            Table([
                [Paragraph(client_lbl, lbl_s), Paragraph(invoice.client_name, bold_s)],
                [Paragraph(comp_lbl,   lbl_s), Paragraph(invoice.company_name or '0', val_s)],
                [Paragraph('GSTIN:',   lbl_s), Paragraph(invoice.client_gstin or '0', val_s)],
            ], colWidths=[col1_w * 0.4, col1_w * 0.6]),
            Paragraph(invoice.billing_address or '0', val_s),
            Paragraph(invoice.shipping_address or '0', val_s),
        ]
        col_widths = [col1_w, col2_w, col3_w]
        hdr_span = (0, 0), (2, 0)

    outer = Table([hdr_row, data_row], colWidths=col_widths)
    outer.setStyle(TableStyle([
        ('BOX',      (0,0),(-1,-1), 0.5, colors.black),
        ('LINEBELOW',(0,0),(-1,0),  0.5, colors.black),
        ('BACKGROUND', hdr_span[0], hdr_span[1], LIGHT_BG),
        ('FONTNAME',   hdr_span[0], hdr_span[1], _FONT_BOLD),
        ('VALIGN',   (0,0),(-1,-1), 'TOP'),
        ('TOPPADDING',   (0,0),(-1,-1), 2),
        ('BOTTOMPADDING',(0,0),(-1,-1), 2),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
    ]))

    # Advance invoices skip the Eway Bill row (not applicable pre-dispatch)
    if invoice.invoice_type == 'product_batch':
        return [outer]

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

    return [outer, eway_tbl]


def _build_items_table(items, specs, w, styles):
    """Line items table for a given item list — columns come from `specs`."""
    col_widths = [s[2]*mm for s in specs]
    # Scale proportionally to fit width
    total_spec = sum(col_widths)
    col_widths = [cw * w / total_spec for cw in col_widths]

    hdr_s = ParagraphStyle('IHdr', parent=styles['Normal'],
                            fontSize=8, fontName=_FONT_BOLD, textColor=MUSTARD)
    cell_s = ParagraphStyle('ICell', parent=styles['Normal'], fontSize=8, textColor=BLACK, fontName=_FONT)
    num_s  = ParagraphStyle('INum',  parent=styles['Normal'],
                             fontSize=8, textColor=MUSTARD, fontName=_FONT, alignment=TA_LEFT)

    header_row = [Paragraph(s[0], hdr_s) for s in specs]
    data = [header_row]

    for item in items:
        row = []
        for label, key, _ in specs:
            raw = _get_cell(item, key)
            if key in ('rate_per_item', '_amount', '_payable') or (key == 'qty' and raw != '0'):
                row.append(Paragraph(raw, num_s))
            else:
                row.append(Paragraph(raw, cell_s))
        data.append(row)

    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    style = TableStyle([
        ('BOX',       (0,0),(-1,-1), 0.5, colors.black),
        ('LINEBELOW', (0,1),(-1,-2), 0.3, colors.HexColor('#CCCCCC')),
        ('BACKGROUND',(0,0),(-1,0),  LIGHT_BG),
        ('LINEBELOW', (0,0),(-1,0),  0.5, MUSTARD),
        ('VALIGN',    (0,0),(-1,-1), 'MIDDLE'),
        ('TOPPADDING',   (0,0),(-1,-1), 2),
        ('BOTTOMPADDING',(0,0),(-1,-1), 2),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
    ])
    tbl.setStyle(style)
    return [tbl]


def _build_footer(invoice, w, styles):
    """Sum rows — structure varies by invoice type."""
    lbl_s  = ParagraphStyle('FLbl', parent=styles['Normal'],
                             fontSize=8, fontName=_FONT_BOLD, textColor=MUSTARD)
    rate_s = ParagraphStyle('FRate', parent=styles['Normal'],
                             fontSize=8, textColor=GREY_TEXT, fontName=_FONT, alignment=TA_RIGHT)
    val_s  = ParagraphStyle('FVal', parent=styles['Normal'],
                             fontSize=8, textColor=BLACK, fontName=_FONT, alignment=TA_RIGHT)
    bold_s = ParagraphStyle('FBold', parent=styles['Normal'],
                             fontSize=8, fontName=_FONT_BOLD, textColor=BLACK, alignment=TA_RIGHT)

    items = invoice.items or []
    sum_total = sum(_d(it.get('rate_per_item', 0)) * _d(it.get('qty', 0)) for it in items)

    label_w = w * 0.55
    rate_w  = w * 0.15
    val_w   = w * 0.30

    def _row(label, value, rate='', bold=False):
        return [
            Paragraph(label, lbl_s),
            Paragraph(rate, rate_s),
            Paragraph(value, bold_s if bold else val_s),
        ]

    if invoice.invoice_type == 'product_simple':
        shipping = _d(invoice.shipping_cost)
        sgst = sum_total * _d(invoice.sgst_rate) / 100
        cgst = sum_total * _d(invoice.cgst_rate) / 100
        igst = sum_total * _d(invoice.igst_rate) / 100
        net_payable = sum_total + shipping + sgst + cgst + igst
        data = [
            _row('Shipping', _fmt(shipping)),
            _row('Sum Total Amount', _fmt(sum_total)),
            _row('SGST', _fmt(sgst), rate=f'{invoice.sgst_rate}%'),
            _row('CGST', _fmt(cgst), rate=f'{invoice.cgst_rate}%'),
            _row('IGST', _fmt(igst), rate=f'{invoice.igst_rate}%'),
            _row('Net Payable', _fmt(net_payable), bold=True),
        ]
    else:
        sgst = sum_total * _d(invoice.sgst_rate) / 100
        cgst = sum_total * _d(invoice.cgst_rate) / 100
        igst = sum_total * _d(invoice.igst_rate) / 100
        net  = sum_total + sgst + cgst + igst

        data = [
            _row('Sum Total Amount', _fmt(sum_total)),
            _row('SGST', _fmt(sgst), rate=f'{invoice.sgst_rate}%'),
            _row('CGST', _fmt(cgst), rate=f'{invoice.cgst_rate}%'),
            _row('IGST', _fmt(igst), rate=f'{invoice.igst_rate}%'),
            _row('Net Payable', _fmt(net), bold=True),
        ]

        if invoice.invoice_type == 'printing' and _d(invoice.advance_rate):
            advance_amt = net * _d(invoice.advance_rate) / 100
            data.append(_row('Advance to be paid', _fmt(advance_amt), rate=f'{invoice.advance_rate}%'))

        if invoice.invoice_type == 'final':
            shipping = _d(getattr(invoice, 'shipping_cost', 0))
            advance_received = _d(getattr(invoice, 'advance_received', 0))
            total_payable = net + shipping
            net_payable = total_payable - advance_received
            data[-1] = _row('Total Payable', _fmt(total_payable), bold=True)
            if shipping:
                data.insert(-1, _row('Shipping', _fmt(shipping)))
            data.append(_row('Advance Received', _fmt(advance_received)))
            data.append(_row('Net Payable', _fmt(net_payable), bold=True))

    return [_labelval_table(data, label_w, rate_w, val_w)]


def _labelval_table(rows, label_w, rate_w, val_w):
    """Shared styling for the label/rate/amount summary tables (footer, Advance sub-totals).
    `rows` is a list of [label_paragraph, rate_paragraph, value_paragraph] triples, already
    built with the caller's own ParagraphStyles (bold on a row is the caller's choice)."""
    tbl = Table(rows, colWidths=[label_w, rate_w, val_w])
    tbl.setStyle(TableStyle([
        ('BOX',       (0,0),(-1,-1), 0.5, colors.black),
        ('LINEBELOW', (0,0),(-1,-2), 0.3, colors.HexColor('#CCCCCC')),
        ('BACKGROUND',(0,-1),(-1,-1), LIGHT_BG),
        ('LINEABOVE', (0,-1),(-1,-1), 0.5, MUSTARD),
        ('TOPPADDING',   (0,0),(-1,-1), 2),
        ('BOTTOMPADDING',(0,0),(-1,-1), 2),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
        ('VALIGN',    (0,0),(-1,-1), 'MIDDLE'),
    ]))
    return tbl


def _section_bar(label, w, styles):
    """Full-width mustard divider row used to label a sub-section (e.g. 'Product Details', 'Services')."""
    s = ParagraphStyle('SectionBar', parent=styles['Normal'],
                        fontSize=8, fontName=_FONT_BOLD, textColor=MUSTARD)
    tbl = Table([[Paragraph(label, s)]], colWidths=[w])
    tbl.setStyle(TableStyle([
        ('BOX',       (0,0),(-1,-1), 0.5, colors.black),
        ('BACKGROUND',(0,0),(-1,-1), LIGHT_BG),
        ('TOPPADDING',   (0,0),(-1,-1), 3),
        ('BOTTOMPADDING',(0,0),(-1,-1), 3),
        ('LEFTPADDING',  (0,0),(-1,-1), 3),
        ('RIGHTPADDING', (0,0),(-1,-1), 3),
    ]))
    return tbl


ADVANCE_NOTE = (
    'Note: There is a variance of +/-10% in production, Final invoice will be as per actual '
    'units made. Shipment charges on actuals.'
)


def _build_advance_body(invoice, w, styles):
    """Advance invoice — Product Details (+ Processing Charges) / Services / totals.

    Structurally different from every other type: two separate item sub-tables with
    their own sub-totals, a per-unit Processing Charges line, and a fixed disclaimer note.
    """
    lbl_s  = ParagraphStyle('AdvLbl',  parent=styles['Normal'],
                             fontSize=8, fontName=_FONT_BOLD, textColor=MUSTARD)
    rate_s = ParagraphStyle('AdvRate', parent=styles['Normal'],
                             fontSize=8, textColor=GREY_TEXT, fontName=_FONT, alignment=TA_RIGHT)
    val_s  = ParagraphStyle('AdvVal',  parent=styles['Normal'],
                             fontSize=8, textColor=BLACK, fontName=_FONT, alignment=TA_RIGHT)
    bold_s = ParagraphStyle('AdvBold', parent=styles['Normal'],
                             fontSize=8, fontName=_FONT_BOLD, textColor=BLACK, alignment=TA_RIGHT)
    note_s = ParagraphStyle('AdvNote', parent=styles['Normal'],
                             fontSize=7, fontName=_FONT_BOLD, textColor=BLACK, leading=10)

    def _row(label, value, rate='', bold=False):
        return [Paragraph(label, lbl_s), Paragraph(rate, rate_s), Paragraph(value, bold_s if bold else val_s)]

    label_w = w * 0.55
    rate_w  = w * 0.15
    val_w   = w * 0.30

    items = invoice.items or []
    products = [it for it in items if it.get('category') != 'service']
    services = [it for it in items if it.get('category') == 'service']

    total_qty = sum(_d(it.get('qty', 0)) for it in products)
    processing_rate = _d(getattr(invoice, 'processing_charge_rate', 0))
    processing_amt = total_qty * processing_rate
    product_sum = sum(_d(it.get('rate_per_item', 0)) * _d(it.get('qty', 0)) for it in products)

    # Synthetic row so Processing Charges shows inline in the Product Details table,
    # in the same Rate/Qty/Amount columns as every other row.
    processing_row = {
        'item_name': 'Processing Charges',
        'rate_per_item': str(processing_rate),
        'qty': str(total_qty),
    }
    product_total = product_sum + processing_amt

    services_total = sum(_d(it.get('rate_per_item', 0)) * _d(it.get('qty', 1) or 1) for it in services)

    total_payable = product_total + services_total
    sgst = total_payable * _d(invoice.sgst_rate) / 100
    cgst = total_payable * _d(invoice.cgst_rate) / 100
    igst = total_payable * _d(invoice.igst_rate) / 100
    net_payable = total_payable + sgst + cgst + igst
    advance_amt = net_payable * _d(invoice.advance_rate) / 100

    story = []
    story.append(_section_bar('Product Details', w, styles))
    story += _build_items_table(products + [processing_row], COLUMN_SPECS['product_batch'], w, styles)
    story.append(_labelval_table([_row('Product Total', _fmt(product_total), bold=True)], label_w, rate_w, val_w))
    story.append(Spacer(1, 2*mm))

    story.append(_section_bar('Services', w, styles))
    story += _build_items_table(services, COLUMN_SPECS['product_batch'], w, styles)
    story.append(_labelval_table([_row('Services Total', _fmt(services_total), bold=True)], label_w, rate_w, val_w))
    story.append(Spacer(1, 2*mm))

    story.append(_labelval_table([
        _row('Total Payable (Product+Services)', _fmt(total_payable)),
        _row('SGST', _fmt(sgst), rate=f'{invoice.sgst_rate}%'),
        _row('CGST', _fmt(cgst), rate=f'{invoice.cgst_rate}%'),
        _row('IGST', _fmt(igst), rate=f'{invoice.igst_rate}%'),
        _row('Net Payable', _fmt(net_payable), bold=True),
        _row('Advance to be paid', _fmt(advance_amt), rate=f'{invoice.advance_rate}%'),
    ], label_w, rate_w, val_w))
    story.append(Spacer(1, 1*mm))
    story.append(Paragraph(ADVANCE_NOTE, note_s))
    return story
