"""
Hard-cutover migration: wipes old 16-stage system and initialises the new two-phase tracker.

Changes:
- CRMProject: adds phase, resample_cycle, order_advance_received, order_booked
- CRMProject.project_stage: removes choices constraint, bumps max_length to 60
- StageCompletion.stage_key: removes choices constraint, bumps max_length to 50
- All existing StageCompletion and SubStageCompletion rows are deleted
- Fresh StageCompletion rows are created for every project using ALL_INITIAL_STAGE_KEYS
- Existing ProjectNote rows with old stage keys are moved to project-level notes (stage_key='')
"""
from django.db import migrations, models

ALL_INITIAL_STAGE_KEYS = [
    # Sample pre-loop
    'sample_invoice_shared', 'sample_booked', 'sample_payment_received',
    # Sample loop (cycle 1)
    'formula_made', 'formula_reviewed', 'sample_made',
    'sample_shipped', 'sample_feedback_captured', 'sample_approved',
    # Sample post-approval
    'sample_images_saved', 'sample_formula_saved',
    # Packaging
    'pkg_req_captured', 'pkg_quotes_taken', 'pkg_approved_client',
    'pkg_samples_ordered', 'pkg_po_taken', 'pkg_ordered',
    'pkg_dispatched', 'pkg_evaluated', 'pkg_inventory_done',
    # Content
    'content_inci_created', 'content_inci_approved', 'content_created',
    'content_label_reviewed', 'content_monocarton_reviewed',
    # Design & Printing
    'design_group_created', 'design_created', 'design_sample_boxes',
    'design_approved_client', 'design_quote_taken',
    'printing_initiated', 'printing_delivered', 'printing_inventory',
    # Production
    'batch_initiated', 'batch_passed',
    'filling_initiated', 'filling_videos', 'report_shared', 'bmr_captured',
    'derma_initiated', 'derma_sample_sent', 'derma_completed',
    'derma_docs_sent', 'ctri_captured', 'client_feedback',
    # Shipment
    'shipment_dimensions', 'shipment_hwc', 'shipment_eway',
    'shipment_insurance', 'shipment_booked', 'shipment_tracking', 'shipment_delivered',
    # Compliances
    'compliance_mou_created', 'compliance_mou_signed', 'compliance_fda_client',
    'compliance_fda_sent', 'compliance_fda_received',
]

# Old stage keys that are now invalid — notes with these will be moved to project level
OLD_STAGE_KEYS = {
    'new_lead', 'order_closed', 'lead_closed', 'not_responding',
    'proposal', 'costing', 'sample', 'order_booked', 'packaging',
    'design', 'printing', 'production', 'batch_testing',
    'filling', 'transit', 'derma_testing',
}


def wipe_and_reinitialise(apps, schema_editor):
    CRMProject = apps.get_model('crm_projects', 'CRMProject')
    StageCompletion = apps.get_model('crm_projects', 'StageCompletion')
    SubStageCompletion = apps.get_model('crm_projects', 'SubStageCompletion')
    ProjectNote = apps.get_model('crm_projects', 'ProjectNote')

    # Move old-keyed notes to project-level (preserve text content)
    ProjectNote.objects.filter(stage_key__in=OLD_STAGE_KEYS).update(stage_key='', sub_stage_key='')

    projects = list(CRMProject.objects.all())

    # Bulk delete all old stage rows
    StageCompletion.objects.all().delete()
    SubStageCompletion.objects.all().delete()

    # Create fresh rows for all projects
    new_rows = [
        StageCompletion(project=project, stage_key=key)
        for project in projects
        for key in ALL_INITIAL_STAGE_KEYS
    ]
    StageCompletion.objects.bulk_create(new_rows, ignore_conflicts=True)

    # Reset project fields
    CRMProject.objects.all().update(
        phase='sample',
        resample_cycle=1,
        order_advance_received=False,
        order_booked=False,
        project_stage='sample_invoice_shared',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('crm_projects', '0006_vendor_fk_to_m2m'),
    ]

    operations = [
        # 1. Add new CRMProject fields
        migrations.AddField(
            model_name='crmproject',
            name='phase',
            field=models.CharField(
                choices=[('sample', 'Sample Phase'), ('order', 'Order Phase')],
                db_index=True, default='sample', max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='crmproject',
            name='resample_cycle',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='crmproject',
            name='order_advance_received',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='crmproject',
            name='order_booked',
            field=models.BooleanField(default=False),
        ),

        # 2. Alter project_stage: remove choices, bump max_length
        migrations.AlterField(
            model_name='crmproject',
            name='project_stage',
            field=models.CharField(
                blank=True, db_index=True, default='sample_invoice_shared', max_length=60,
            ),
        ),

        # 3. Alter StageCompletion.stage_key: remove choices, bump max_length
        migrations.AlterField(
            model_name='stagecompletion',
            name='stage_key',
            field=models.CharField(max_length=50),
        ),

        # 4. Data migration: wipe old stage rows, create new ones, reassign old notes
        migrations.RunPython(wipe_and_reinitialise, migrations.RunPython.noop),
    ]
