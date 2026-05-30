"""Build a formatted XLSX Client Costing.

Reads from each item's merged catalog/snapshot view so user-edits to costing cells
are honored. Also embeds the company logo (frontend/public/logo.png) at the
top-left of the sheet (item #2).
"""
import io
import os
from datetime import date
from pathlib import Path
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XlsxImage
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter


MUSTARD = 'D4A017'
LIGHT_GREY = 'F5F5F5'
BLACK = '000000'

THIN = Side(border_style='thin', color='999999')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


# Resolve the logo file at backend/.. /frontend/public/logo.png
# backend/apps/proposals/xlsx_export.py  ->  go up 3, then frontend/public/logo.png
_HERE = Path(__file__).resolve()
_LOGO_CANDIDATES = [
    _HERE.parents[3] / 'frontend' / 'public' / 'logo.png',
    _HERE.parents[3] / 'frontend' / 'dist' / 'logo.png',
]


def _find_logo():
    for p in _LOGO_CANDIDATES:
        if p.exists():
            return str(p)
    # Fall back to env var override if deployment has a different layout.
    env_path = os.environ.get('SKINOVATION_LOGO_PATH')
    if env_path and Path(env_path).exists():
        return env_path
    return None


def _merged(item):
    """Return a dict of effective field values: catalog defaults overlaid by snapshot."""
    out = {}
    c = item.catalog_item
    if c:
        for f in [
            'body_part', 'product_type', 'sub_product_type',
            'kb_tag1', 'kb_tag2', 'kb_tag3',
            'specific_ingredients', 'color', 'fragrance', 'size', 'packaging_type',
            'rate_category', 'per_kg_rate', 'manufacturing_cost', 'rate_per_unit',
            'tentative_packaging_cost', 'label_cost', 'tentative_monocarton_cost',
            'total_cost', 'potential_mrp',
        ]:
            out[f] = getattr(c, f, None)
    for k, v in (item.snapshot or {}).items():
        if v is not None and v != '':
            out[k] = v
    return out


def _dec(val):
    """Coerce a numeric/string/decimal/None into float-or-empty for an Excel cell."""
    if val is None or val == '':
        return ''
    try:
        return float(val)
    except (TypeError, ValueError):
        return val


def build_proposal_xlsx(proposal):
    """Return bytes of a formatted .xlsx for the given Client Costing."""
    wb = Workbook()
    ws = wb.active
    ws.title = 'Client Costing'

    req = proposal.requirement
    client = req.client
    items = list(proposal.items.select_related('catalog_item').order_by('sort_order'))

    # Row 1: Logo (top-left) + company name banner.
    # We leave A1 small for the logo image and put the title in B1:N1.
    ws.row_dimensions[1].height = 54

    logo_path = _find_logo()
    if logo_path:
        try:
            img = XlsxImage(logo_path)
            # Resize so it fits the header row.
            img.width = 70
            img.height = 70
            ws.add_image(img, 'A1')
        except Exception:
            # If openpyxl can't embed the image (e.g. corrupt), continue without it.
            pass

    ws.merge_cells('B1:N1')
    ws['B1'] = 'SKINOVATION SCIENCES'
    ws['B1'].font = Font(name='Aptos', size=18, bold=True, color=BLACK)
    ws['B1'].alignment = Alignment(horizontal='center', vertical='center')
    ws['B1'].fill = PatternFill('solid', fgColor=MUSTARD)
    # Fill A1 with the same colour so the banner looks continuous behind the logo.
    ws['A1'].fill = PatternFill('solid', fgColor=MUSTARD)

    # Row 2: Sub-title
    ws.merge_cells('A2:N2')
    ws['A2'] = 'Client Costing'
    ws['A2'].font = Font(name='Aptos', size=14, bold=True, color=BLACK)
    ws['A2'].alignment = Alignment(horizontal='center', vertical='center')
    ws['A2'].fill = PatternFill('solid', fgColor=LIGHT_GREY)
    ws.row_dimensions[2].height = 28

    # Rows 3-6: Date + client info
    ws['A3'] = 'Date'
    ws['B3'] = date.today().isoformat()
    ws['A4'] = 'Client Name'
    ws['B4'] = client.name
    ws['A5'] = 'Phone'
    ws['B5'] = client.phone_no
    ws['A6'] = 'Point of Contact'
    ws['B6'] = client.poc.name if client.poc else ''
    for r in range(3, 7):
        ws.cell(row=r, column=1).font = Font(name='Aptos', bold=True)
        ws.cell(row=r, column=2).font = Font(name='Aptos')

    # Row 8: Column headers
    header_row = 8
    columns = [
        ('Body Part',                  'body_part'),
        ('Product Type',               'product_type'),
        ('Sub Product Type',           'sub_product_type'),
        ('Key Benefits',               '__kb__'),
        ('Specific Ingredients',       'specific_ingredients'),
        ('Color',                      'color'),
        ('Fragrance',                  'fragrance'),
        ('Size',                       'size'),
        ('Packaging',                  'packaging_type'),
        ('Rate Category',              'rate_category'),
        ('Per KG Rate',                'per_kg_rate'),
        ('Manufacturing Cost',         'manufacturing_cost'),
        ('Rate Per Unit',              'rate_per_unit'),
        ('Tentative Packaging Cost',   'tentative_packaging_cost'),
        ('Label Cost',                 'label_cost'),
        ('Tentative Monocarton Cost',  'tentative_monocarton_cost'),
        ('Total Cost',                 'total_cost'),
        ('Potential MRP',              'potential_mrp'),
    ]
    for i, (label, _) in enumerate(columns, start=1):
        cell = ws.cell(row=header_row, column=i, value=label)
        cell.font = Font(name='Aptos', bold=True, color=BLACK)
        cell.fill = PatternFill('solid', fgColor=MUSTARD)
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = BORDER
    ws.row_dimensions[header_row].height = 28

    # Data rows — pull from merged catalog+snapshot view.
    for idx, item in enumerate(items, start=1):
        m = _merged(item)
        kb = ', '.join(str(m.get(k) or '') for k in ('kb_tag1', 'kb_tag2', 'kb_tag3')
                       if m.get(k))
        values = [
            m.get('body_part') or '',
            m.get('product_type') or '',
            m.get('sub_product_type') or '',
            kb,
            m.get('specific_ingredients') or '',
            m.get('color') or '',
            m.get('fragrance') or '',
            m.get('size') or '',
            m.get('packaging_type') or '',
            m.get('rate_category') or '',
            _dec(m.get('per_kg_rate')),
            _dec(m.get('manufacturing_cost')),
            _dec(m.get('rate_per_unit')),
            _dec(m.get('tentative_packaging_cost')),
            _dec(m.get('label_cost')),
            _dec(m.get('tentative_monocarton_cost')),
            _dec(m.get('total_cost')),
            _dec(m.get('potential_mrp')),
        ]
        for i, val in enumerate(values, start=1):
            cell = ws.cell(row=header_row + idx, column=i, value=val)
            cell.font = Font(name='Aptos')
            cell.alignment = Alignment(vertical='center', wrap_text=True)
            cell.border = BORDER
            if idx % 2 == 0:
                cell.fill = PatternFill('solid', fgColor=LIGHT_GREY)

    widths = [14, 16, 18, 26, 32, 12, 12, 10, 14, 14, 14, 18, 14, 22, 14, 22, 14, 14]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
