"""Build a formatted XLSX proposal."""
import io
from datetime import date
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter


MUSTARD = 'D4A017'
LIGHT_GREY = 'F5F5F5'
BLACK = '000000'

THIN = Side(border_style='thin', color='999999')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def build_proposal_xlsx(proposal):
    """Return bytes of a formatted .xlsx for the given Proposal."""
    wb = Workbook()
    ws = wb.active
    ws.title = 'Proposal'

    req = proposal.requirement
    client = req.client
    items = list(proposal.items.select_related('catalog_item').order_by('sort_order'))

    # Row 1: Logo placeholder (image embed via Pillow optional; keep cell merged)
    ws.merge_cells('A1:H1')
    ws['A1'] = 'SKINOVATION SCIENCES'
    ws['A1'].font = Font(name='Aptos', size=18, bold=True, color=BLACK)
    ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws['A1'].fill = PatternFill('solid', fgColor=MUSTARD)
    ws.row_dimensions[1].height = 36

    # Row 2: Header
    ws.merge_cells('A2:H2')
    ws['A2'] = 'Product Proposal'
    ws['A2'].font = Font(name='Aptos', size=14, bold=True, color=BLACK)
    ws['A2'].alignment = Alignment(horizontal='center', vertical='center')
    ws['A2'].fill = PatternFill('solid', fgColor=LIGHT_GREY)
    ws.row_dimensions[2].height = 28

    # Row 3: Date
    ws['A3'] = 'Date'
    ws['B3'] = date.today().isoformat()
    ws['A3'].font = Font(name='Aptos', bold=True)
    ws['B3'].font = Font(name='Aptos')

    # Rows 4-6: Client Info
    ws['A4'] = 'Client Name'
    ws['B4'] = client.name
    ws['A5'] = 'Phone'
    ws['B5'] = client.phone_no
    ws['A6'] = 'POC'
    ws['B6'] = client.poc.name if client.poc else ''
    for r in range(4, 7):
        ws.cell(row=r, column=1).font = Font(name='Aptos', bold=True)
        ws.cell(row=r, column=2).font = Font(name='Aptos')

    # Row 8: Spacer + Column headers (catalog row columns)
    header_row = 8
    columns = [
        ('Body Part', 'body_part'),
        ('Product Type', 'product_type'),
        ('Sub Product Type', 'sub_product_type'),
        ('Key Benefits', '__kb__'),
        ('Specific Ingredients', 'specific_ingredients'),
        ('Size', 'size'),
        ('Packaging', 'packaging_type'),
        ('Potential MRP', 'potential_mrp'),
    ]
    for i, (label, _) in enumerate(columns, start=1):
        cell = ws.cell(row=header_row, column=i, value=label)
        cell.font = Font(name='Aptos', bold=True, color=BLACK)
        cell.fill = PatternFill('solid', fgColor=MUSTARD)
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = BORDER
    ws.row_dimensions[header_row].height = 28

    # Data rows
    for idx, item in enumerate(items, start=1):
        c = item.catalog_item
        kb = ', '.join(t for t in [c.kb_tag1, c.kb_tag2, c.kb_tag3] if t)
        values = [
            c.body_part, c.product_type, c.sub_product_type, kb,
            c.specific_ingredients, c.size, c.packaging_type,
            float(c.potential_mrp) if c.potential_mrp is not None else '',
        ]
        for i, val in enumerate(values, start=1):
            cell = ws.cell(row=header_row + idx, column=i, value=val)
            cell.font = Font(name='Aptos')
            cell.alignment = Alignment(vertical='center', wrap_text=True)
            cell.border = BORDER
            if idx % 2 == 0:
                cell.fill = PatternFill('solid', fgColor=LIGHT_GREY)

    # Column widths
    widths = [14, 16, 18, 26, 32, 10, 14, 14]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
