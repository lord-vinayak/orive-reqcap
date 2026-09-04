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
