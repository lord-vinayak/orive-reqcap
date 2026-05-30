"""
16-stage architecture for CRM skincare product development lifecycle.
Stage index 0-15. Progress = (completed_stages / 16) * 100.
"""

STAGE_DEFINITIONS = [
    {
        'key': 'new_lead',
        'display': 'New Lead',
        'index': 0,
        'sub_stages': [],
    },
    {
        'key': 'order_closed',
        'display': 'Order Closed',
        'index': 1,
        'sub_stages': [],
    },
    {
        'key': 'lead_closed',
        'display': 'Lead Closed',
        'index': 2,
        'sub_stages': [],
    },
    {
        'key': 'not_responding',
        'display': 'Not Responding',
        'index': 3,
        'sub_stages': [],
    },
    {
        'key': 'proposal',
        'display': 'Proposal',
        'index': 4,
        'sub_stages': [],
    },
    {
        'key': 'costing',
        'display': 'Costing',
        'index': 5,
        'sub_stages': [],
    },
    {
        'key': 'sample',
        'display': 'Sample',
        'index': 6,
        'sub_stages': [
            {'key': 'confirmation_email', 'display': 'Confirmation email sent to client', 'mandatory': True},
            {'key': 'in_pipeline', 'display': 'In Pipeline', 'mandatory': False},
            {'key': 'created_documented', 'display': 'Created, image and video captured and documented', 'mandatory': True},
            {'key': 'transit', 'display': 'Transit', 'mandatory': False},
            {'key': 'delivered', 'display': 'Delivered', 'mandatory': False},
            {'key': 'testing', 'display': 'Testing', 'mandatory': False},
            {'key': 'approved', 'display': 'Approved', 'mandatory': False},
            {'key': 'not_approved', 'display': 'Not Approved', 'mandatory': False},
            {'key': 'invoice_shared', 'display': 'Invoice Shared', 'mandatory': False},
            {'key': 'invoice_pending', 'display': 'Invoice Pending', 'mandatory': False},
        ],
    },
    {
        'key': 'order_booked',
        'display': 'Order Booked',
        'index': 7,
        'sub_stages': [
            {'key': 'mou_shared', 'display': 'MOU Shared', 'mandatory': False},
            {'key': 'fda_from_client', 'display': 'FDA Document Taken from Client', 'mandatory': False},
            {'key': 'fda_for_vendor', 'display': 'FDA Document Created for Vendor', 'mandatory': False},
        ],
    },
    {
        'key': 'packaging',
        'display': 'Packaging',
        'index': 8,
        'sub_stages': [
            {'key': 'not_shared', 'display': 'Not Shared', 'mandatory': True},
            {'key': 'shared', 'display': 'Shared', 'mandatory': True},
            {'key': 'approved', 'display': 'Approved', 'mandatory': True},
            {'key': 'to_be_ordered', 'display': 'To Be Ordered', 'mandatory': True},
            {'key': 'ordered', 'display': 'Ordered', 'mandatory': True},
            {'key': 'delivered_checked', 'display': 'Delivered & Checked', 'mandatory': True},
            {'key': 'managed_by_client', 'display': 'Managed by Client', 'mandatory': True},
            {'key': 'added_to_inventory', 'display': 'Added to Inventory', 'mandatory': True},
        ],
    },
    {
        'key': 'design',
        'display': 'Design',
        'index': 9,
        'sub_stages': [
            {'key': 'inci_list_approved', 'display': 'Inci list approved', 'mandatory': True},
            {'key': 'content_creation', 'display': 'Content Creation', 'mandatory': True},
            {'key': 'batch_no_received', 'display': 'Batch No received', 'mandatory': True},
            {'key': 'mrp_details_received', 'display': 'MRP and other details received', 'mandatory': True},
            {'key': 'packaging_kld_received', 'display': 'Packaging KLD received', 'mandatory': True},
            {'key': 'design_approved', 'display': 'Design approved', 'mandatory': True},
            {'key': 'sample_printed_kld', 'display': 'Sample printed, evaluated as per KLD', 'mandatory': True},
        ],
    },
    {
        'key': 'printing',
        'display': 'Printing',
        'index': 10,
        'sub_stages': [
            {'key': 'shared_for_quotation', 'display': 'Shared for Quotation', 'mandatory': True},
            {'key': 'invoice_paid', 'display': 'Invoice Paid', 'mandatory': True},
            {'key': 'printing_received', 'display': 'Printing Received', 'mandatory': True},
        ],
    },
    {
        'key': 'production',
        'display': 'Production',
        'index': 11,
        'sub_stages': [
            {'key': 'email_to_manufacture', 'display': 'Email to manufacture', 'mandatory': True},
            {'key': 'raw_material_purchased', 'display': 'Raw material purchased', 'mandatory': False},
        ],
    },
    {
        'key': 'batch_testing',
        'display': 'Batch Testing',
        'index': 12,
        'sub_stages': [
            {'key': 'initiated', 'display': 'Initiated', 'mandatory': False},
            {'key': 'invoice_paid', 'display': 'Invoice Paid', 'mandatory': False},
            {'key': 'report_received', 'display': 'Report Received & Documented', 'mandatory': False},
            {'key': 'report_shared_client', 'display': 'Report Shared with Client', 'mandatory': False},
        ],
    },
    {
        'key': 'filling',
        'display': 'Filling',
        'index': 13,
        'sub_stages': [
            {'key': 'video_captured', 'display': 'Video captured while filling', 'mandatory': True},
            {'key': 'box_packing_validated', 'display': 'Box packing for final transit validated', 'mandatory': True},
            {'key': 'dimensions_captured', 'display': 'Dimension and no of boxes captured for logistics', 'mandatory': True},
        ],
    },
    {
        'key': 'transit',
        'display': 'Transit',
        'index': 14,
        'sub_stages': [
            {'key': 'invoice_from_manufacture', 'display': 'Invoice taken from manufacture', 'mandatory': True},
            {'key': 'invoice_for_client', 'display': 'Invoice Created for client', 'mandatory': True},
            {'key': 'transporter_details', 'display': 'Transporter details from logistics person', 'mandatory': True},
            {'key': 'eway_from_manufacture', 'display': 'E-way bill taken from manufacture', 'mandatory': True},
            {'key': 'eway_for_shipment', 'display': 'E-way bill created for shipment', 'mandatory': True},
            {'key': 'invoice_eway_shared', 'display': 'Client invoice and eway bill shared with manufacture for pickup', 'mandatory': True},
        ],
    },
    {
        'key': 'derma_testing',
        'display': 'Derma Testing',
        'index': 15,
        'sub_stages': [
            {'key': 'initiated', 'display': 'Initiated', 'mandatory': False},
            {'key': 'invoice_paid', 'display': 'Invoice Paid', 'mandatory': False},
            {'key': 'ctri_received', 'display': 'CTRI No Received & Documented', 'mandatory': False},
            {'key': 'claim_doc_received', 'display': 'Claim Document Received & Documented', 'mandatory': False},
        ],
    },
]

STAGE_KEY_TO_INDEX = {s['key']: s['index'] for s in STAGE_DEFINITIONS}
STAGE_INDEX_TO_DEF = {s['index']: s for s in STAGE_DEFINITIONS}
STAGE_KEYS = [s['key'] for s in STAGE_DEFINITIONS]
TOTAL_STAGES = len(STAGE_DEFINITIONS)

# Milestone timeline rules (weekday-based offsets from Day 0 = Sample Booked)
MILESTONE_TIMELINE_RULES = {
    'sample_transit': {'trigger': 'sample_booked', 'offset_days': 14},
    'sample_delivered': {'trigger': 'sample_transit', 'offset_days': 7},
    'sample_testing': {'trigger': 'sample_delivered', 'offset_days': 10},
    'packaging_approval': {'trigger': 'sample_approved', 'offset_days': 14},
    'design_start': {'trigger': 'packaging_closure', 'offset_days': 14},
    'printing_start': {'trigger': 'design_closure', 'offset_days': 21},
    'production_start': {'trigger': 'design_closure', 'offset_days': 0},  # parallel with printing
    'batch_testing_start': {'trigger': 'production_complete', 'offset_days': 7},
    'filling_start': {'trigger': 'batch_testing_complete', 'offset_days': 7},
}
