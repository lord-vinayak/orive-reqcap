from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.clients.models import Client

User = get_user_model()


class PipelineSnapshotCountsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="tester@example.com", name="Tester", password="pass1234", role="admin",
        )
        self.api = APIClient()
        self.api.force_authenticate(user=self.user)

    def _make_client(self, phone, lead_status, lead_sub_status=""):
        Client.objects.create(
            phone_no=phone,
            name=f"Client {phone}",
            lead_status=lead_status,
            lead_sub_status=lead_sub_status,
        )

    def test_pipeline_snapshot_counts(self):
        self._make_client("1000000001", "initial_conversation", "initial_conversation__need_follow_up")
        self._make_client("1000000002", "initial_conversation", "initial_conversation__product_requirement_captured")
        self._make_client("1000000003", "proposal", "proposal__requested")
        self._make_client("1000000004", "production", "production__packaging")
        self._make_client("1000000005", "production", "production__content")
        self._make_client("1000000006", "sample", "sample__in_transit")

        res = self.api.get("/api/clients/pipeline-snapshot-counts/")

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["initial_conversation_needs_follow_up"], 1)
        self.assertEqual(data["proposal_requested"], 1)
        self.assertEqual(data["costing_requested"], 0)
        self.assertEqual(data["sample_in_transit"], 1)
        self.assertEqual(data["production_all"], 2)
        self.assertEqual(
            set(data.keys()),
            {
                "initial_conversation_needs_follow_up",
                "proposal_requested",
                "costing_requested",
                "sample_invoice_shared",
                "sample_in_pipeline",
                "sample_in_transit",
                "sample_user_testing",
                "order_invoice_shared",
                "production_all",
            },
        )
