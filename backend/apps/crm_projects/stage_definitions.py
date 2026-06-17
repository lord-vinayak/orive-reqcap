"""
Two-phase CRM project lifecycle:
  1. Sample Phase  — pre-loop → resample loop (max 3 cycles) → post-approval
  2. Order Phase   — 6 sequential sections unlocked after order is booked

Stage keys for resample cycle 1 have no suffix.
Cycle 2 and 3 use _c2 / _c3 suffix (created on-demand when a resample is initiated).
"""

MAX_RESAMPLE_CYCLES = 10

# ── Sample Phase ──────────────────────────────────────────────────────────────

SAMPLE_PRE_LOOP = [
    {'key': 'invoice_pending',       'display': 'Invoice Pending'},
    {'key': 'sample_invoice_shared', 'display': 'Invoice Shared'},
    {'key': 'sample_booked',         'display': 'Sample Booked'},
]

# Base keys for the resample loop — suffixed at runtime for cycles 2+.
# `sample_approved` is a Yes/No gate rendered differently in the UI.
RESAMPLE_LOOP_BASE = [
    {'key': 'formula_pending',          'display': 'Formula Pending'},
    {'key': 'formula_made',             'display': 'Formula Made'},
    {'key': 'formula_reviewed',         'display': 'Formula Reviewed'},
    {'key': 'sample_in_pipeline',       'display': 'Sample in Pipeline'},
    {'key': 'sample_created',           'display': 'Sample Created'},
    {'key': 'shipment_created',         'display': 'Shipment Created'},
    {'key': 'shipment_picked',          'display': 'Shipment Picked'},
    {'key': 'shipment_delivered',       'display': 'Shipment Delivered'},
    {'key': 'sample_feedback_captured', 'display': 'User Testing'},
    {'key': 'sample_approved',          'display': 'Sample Approved', 'is_approval_gate': True},
]

SAMPLE_POST_APPROVAL = [
    {'key': 'sample_images_saved',  'display': 'Sample Images Saved in Drive'},
    {'key': 'sample_formula_saved', 'display': 'Sample Formula Received and Saved in Drive'},
]

# ── Order Phase ───────────────────────────────────────────────────────────────

ORDER_PHASE_SECTIONS = [
    {
        'key': 'packaging',
        'display': 'Packaging',
        'stages': [
            {'key': 'pkg_req_captured',    'display': 'Packaging Requirement Captured'},
            {'key': 'pkg_quotes_taken',    'display': 'Packaging Quotes Taken'},
            {'key': 'pkg_approved_client', 'display': 'Packaging Approved by Client'},
            {'key': 'pkg_samples_ordered', 'display': 'Packaging Samples Ordered (Client, SS, Printer, KLD)'},
            {'key': 'pkg_po_taken',        'display': 'Packaging PO / Quotation Taken'},
            {'key': 'pkg_ordered',         'display': 'Packaging Order Placed'},
            {'key': 'pkg_dispatched',      'display': 'Packaging Dispatched (Handle with Care Checked)'},
            {'key': 'pkg_evaluated',       'display': 'Packaging Evaluated on Receive'},
            {'key': 'pkg_inventory_done',  'display': 'Packaging Entry Done in Inventory Tracker'},
        ],
    },
    {
        'key': 'content',
        'display': 'Content',
        'stages': [
            {'key': 'content_inci_created',         'display': 'INCI List Created'},
            {'key': 'content_inci_approved',         'display': 'INCI List Approved'},
            {'key': 'content_created',               'display': 'Content Created (Claims, Ingredients)'},
            {'key': 'content_label_reviewed',        'display': 'Content Reviewed – Label'},
            {'key': 'content_monocarton_reviewed',   'display': 'Content Reviewed – Mono Carton'},
        ],
    },
    {
        'key': 'design_printing',
        'display': 'Design & Printing',
        'stages': [
            {'key': 'design_group_created',   'display': 'Design Group Created'},
            {'key': 'design_created',          'display': 'Design Created'},
            {'key': 'design_sample_boxes',     'display': 'Sample Boxes Made'},
            {'key': 'design_approved_client',  'display': 'Approved by Client'},
            {'key': 'design_quote_taken',      'display': 'Design Quote & Timelines Taken from Printer'},
            {'key': 'printing_initiated',      'display': 'Printing Initiated'},
            {'key': 'printing_delivered',      'display': 'Printing Material Delivered'},
            {'key': 'printing_inventory',      'display': 'Printing Inventory Maintained'},
        ],
    },
    {
        'key': 'production',
        'display': 'Production',
        # batch_initiated and batch_passed can be reset in-place on batch failure
        'stages': [
            {'key': 'batch_initiated',     'display': 'Batch Testing Initiated'},
            {'key': 'batch_passed',        'display': 'Batch Testing Passed'},
            {'key': 'filling_initiated',   'display': 'Filling Initiated'},
            {'key': 'filling_videos',      'display': 'Videos Taken While Filling'},
            {'key': 'report_shared',       'display': 'Report Shared with Client'},
            {'key': 'bmr_captured',        'display': 'BMR Captured'},
            {'key': 'derma_initiated',     'display': 'Derma Testing Initiated'},
            {'key': 'derma_sample_sent',   'display': 'Sample Sent for Testing'},
            {'key': 'derma_completed',     'display': 'Derma Testing Completed'},
            {'key': 'derma_docs_sent',     'display': 'Documents Sent to Client'},
            {'key': 'ctri_captured',       'display': 'CTRI Document in Internal Tracker'},
            {'key': 'client_feedback',     'display': 'Client Feedback Captured on Google'},
        ],
    },
    {
        'key': 'shipment',
        'display': 'Shipment',
        'stages': [
            {'key': 'shipment_dimensions', 'display': 'Boxes and Dimensions Taken'},
            {'key': 'shipment_hwc',        'display': 'Handle with Care Checked'},
            {'key': 'shipment_eway',       'display': 'E-way Bill Created'},
            {'key': 'shipment_insurance',  'display': 'Insurance Booked'},
            {'key': 'shipment_booked',     'display': 'Shipment Booked'},
            {'key': 'shipment_tracking',   'display': 'Tracking Details Shared with Client'},
            {'key': 'shipment_delivered',  'display': 'Shipment Delivered (Tracked and Confirmed)'},
        ],
    },
    {
        'key': 'compliances',
        'display': 'Compliances',
        'stages': [
            {'key': 'compliance_mou_created',   'display': 'MOU Created'},
            {'key': 'compliance_mou_signed',     'display': 'MOU Signed'},
            {'key': 'compliance_fda_client',     'display': 'FDA Approval Taken from Client'},
            {'key': 'compliance_fda_sent',       'display': 'FDA Documents Sent to Manufacturer'},
            {'key': 'compliance_fda_received',   'display': 'FDA Document Received'},
        ],
    },
]

BATCH_RESET_KEYS = ['batch_initiated', 'batch_passed']

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_loop_key(base_key: str, cycle: int) -> str:
    """Return the stage key for a given resample cycle (cycle 1 = no suffix)."""
    return base_key if cycle == 1 else f'{base_key}_c{cycle}'


def get_loop_stage_keys_for_cycle(cycle: int) -> list:
    """Return all loop stage keys for a given cycle number."""
    return [{'key': get_loop_key(s['key'], cycle), 'display': s['display'],
             **({k: v for k, v in s.items() if k not in ('key', 'display')})}
            for s in RESAMPLE_LOOP_BASE]


def get_all_initial_stage_keys() -> list:
    """
    All stage keys to pre-create as StageCompletion rows on project creation.
    Includes: sample pre-loop, cycle-1 loop, post-approval, all order phase stages.
    Cycle 2 and 3 loop stages are created on-demand when resampling is initiated.
    """
    keys = []
    keys += [s['key'] for s in SAMPLE_PRE_LOOP]
    keys += [s['key'] for s in RESAMPLE_LOOP_BASE]          # cycle 1 (no suffix)
    keys += [s['key'] for s in SAMPLE_POST_APPROVAL]
    for section in ORDER_PHASE_SECTIONS:
        keys += [s['key'] for s in section['stages']]
    return keys


ALL_INITIAL_STAGE_KEYS = get_all_initial_stage_keys()

ALL_ORDER_STAGE_KEYS = [
    s['key']
    for section in ORDER_PHASE_SECTIONS
    for s in section['stages']
]

SAMPLE_TOTAL_STAGES = len(SAMPLE_PRE_LOOP) + len(RESAMPLE_LOOP_BASE) + len(SAMPLE_POST_APPROVAL)
ORDER_TOTAL_STAGES = len(ALL_ORDER_STAGE_KEYS)  # 46

# Flat map of stage_key → human display name (all cycles included).
STAGE_DISPLAY_MAP: dict[str, str] = {}
for _s in SAMPLE_PRE_LOOP:
    STAGE_DISPLAY_MAP[_s['key']] = _s['display']
for _s in RESAMPLE_LOOP_BASE:
    for _c in range(1, MAX_RESAMPLE_CYCLES + 1):
        STAGE_DISPLAY_MAP[get_loop_key(_s['key'], _c)] = _s['display']
for _s in SAMPLE_POST_APPROVAL:
    STAGE_DISPLAY_MAP[_s['key']] = _s['display']
for _sec in ORDER_PHASE_SECTIONS:
    for _s in _sec['stages']:
        STAGE_DISPLAY_MAP[_s['key']] = _s['display']
