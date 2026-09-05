from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class AuditorRoleChoiceTests(TestCase):
    def test_auditor_is_a_valid_role_choice(self):
        valid_roles = dict(User.ROLE_CHOICES)
        self.assertIn('auditor', valid_roles)
        self.assertEqual(valid_roles['auditor'], 'Auditor')

    def test_can_create_auditor_user(self):
        user = User.objects.create_user(
            email="auditor@example.com", name="Audit Person",
            password="pass1234", role="auditor",
        )
        self.assertEqual(user.role, "auditor")


from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


def _auth_headers(user):
    token = RefreshToken.for_user(user)
    return {"HTTP_AUTHORIZATION": f"Bearer {token.access_token}"}


class AuditorWriteBlockMiddlewareTests(TestCase):
    def setUp(self):
        self.auditor = User.objects.create_user(
            email="auditor2@example.com", name="Auditor Two",
            password="pass1234", role="auditor",
        )
        self.admin = User.objects.create_user(
            email="admin2@example.com", name="Admin Two",
            password="pass1234", role="admin",
        )
        self.api = APIClient()

    def test_auditor_cannot_create_a_client(self):
        headers = _auth_headers(self.auditor)
        res = self.api.post(
            "/api/clients/",
            {"phone_no": "9000000001", "name": "Blocked Client"},
            format="json",
            **headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_auditor_can_still_read(self):
        headers = _auth_headers(self.auditor)
        res = self.api.get("/api/clients/", **headers)
        self.assertEqual(res.status_code, 200)

    def test_non_auditor_can_still_write(self):
        headers = _auth_headers(self.admin)
        res = self.api.post(
            "/api/clients/",
            {"phone_no": "9000000002", "name": "Allowed Client"},
            format="json",
            **headers,
        )
        self.assertEqual(res.status_code, 201)
