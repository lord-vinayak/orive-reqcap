from django.test import TestCase
from apps.clients.models import Client
from apps.crm_projects.models import CRMProject, StageCompletion, SubStageCompletion
from apps.crm_projects.views import _check_stage_complete

class CRMStageCompletionTests(TestCase):
    def setUp(self):
        self.client = Client.objects.create(
            phone_no="1234567890",
            name="Test Client"
        )
        self.project = CRMProject.objects.create(
            client=self.client,
            project_stage="batch_testing"
        )

    def test_batch_testing_completion_when_all_substages_checked(self):
        # Batch testing has 4 sub-stages, all are non-mandatory (optional)
        sub_stages = [
            'initiated',
            'invoice_paid',
            'report_received',
            'report_shared_client'
        ]
        
        # Complete all 4 sub-stages
        for ss_key in sub_stages:
            SubStageCompletion.objects.create(
                project=self.project,
                stage_key='batch_testing',
                sub_stage_key=ss_key,
                completed=True
            )
            _check_stage_complete(self.project, 'batch_testing')
            
        # Verify the stage is marked complete
        sc = StageCompletion.objects.filter(
            project=self.project,
            stage_key='batch_testing'
        ).first()
        
        self.assertIsNotNone(sc, "StageCompletion object should exist")
        self.assertTrue(sc.is_complete, "Batch testing stage should be marked complete")

    def test_batch_testing_not_complete_when_partial_checked(self):
        # Complete only 2 of the 4 optional sub-stages
        SubStageCompletion.objects.create(
            project=self.project,
            stage_key='batch_testing',
            sub_stage_key='initiated',
            completed=True
        )
        _check_stage_complete(self.project, 'batch_testing')

        sc = StageCompletion.objects.filter(
            project=self.project,
            stage_key='batch_testing'
        ).first()

        # It should either not exist or not be complete
        if sc:
            self.assertFalse(sc.is_complete, "Stage should not be complete if only some sub-stages are checked")
