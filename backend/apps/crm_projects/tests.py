from django.test import TestCase
from apps.clients.models import Client
from apps.crm_projects.models import CRMProject, StageCompletion
from apps.crm_projects.stage_definitions import ALL_INITIAL_STAGE_KEYS
from apps.crm_projects.views import _is_pending, _build_stage_status, _ensure_order_phase

class CRMStageCompletionTests(TestCase):
    def setUp(self):
        self.client = Client.objects.create(
            phone_no="1234567890",
            name="Test Client"
        )
        self.project = CRMProject.objects.create(
            client=self.client,
            project_stage="sample_invoice_shared"
        )

    def test_stage_completion_creation(self):
        # Create a StageCompletion row
        sc = StageCompletion.objects.create(
            project=self.project,
            stage_key="pkg_req_captured",
            is_complete=True
        )
        self.assertEqual(sc.stage_key, "pkg_req_captured")
        self.assertTrue(sc.is_complete)

    def test_new_pending_stages_registered(self):
        for key in ('pickup_pending', 'production_pending', 'pkg_pending', 'pkg_order_pending'):
            self.assertIn(key, ALL_INITIAL_STAGE_KEYS)

    def test_pkg_order_pending_logic(self):
        # ticked with next stage not ticked -> pending
        sc = {'pkg_order_pending': True, 'pkg_ordered': False}
        self.assertTrue(_is_pending(self.project, sc, 'pkg_order_pending'))
        # next stage also ticked -> no longer pending
        sc['pkg_ordered'] = True
        self.assertFalse(_is_pending(self.project, sc, 'pkg_order_pending'))

    def test_stage_status_never_locked(self):
        # Free-flow stage completion: no stage should ever report is_locked, even
        # with nothing completed yet.
        status = _build_stage_status(self.project, completion_map={})
        for s in status['sample_phase']['pre_loop']:
            self.assertFalse(s['is_locked'])
        for sec in status['order_phase']['sections']:
            self.assertFalse(sec['is_locked'])
            for s in sec['stages']:
                self.assertFalse(s['is_locked'])
        self.assertFalse(status['order_phase']['locked'])

    def test_completing_order_stage_before_sample_phase_flips_phase(self):
        # Completing an order-phase stage out of order (before the sample phase
        # is done, before order_booked is manually set) must still commit the
        # project to the order phase so dashboard bucketing stays accurate.
        self.assertEqual(self.project.phase, 'sample')
        self.assertFalse(self.project.order_booked)
        _ensure_order_phase(self.project)
        self.project.refresh_from_db()
        self.assertEqual(self.project.phase, 'order')
        self.assertTrue(self.project.order_booked)
