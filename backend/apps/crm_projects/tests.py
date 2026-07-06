from django.test import TestCase
from apps.clients.models import Client
from apps.crm_projects.models import CRMProject, StageCompletion
from apps.crm_projects.stage_definitions import ALL_INITIAL_STAGE_KEYS

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
