from django.apps import AppConfig


class CrmMasterDataConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.crm_master_data'

    def ready(self):
        import apps.crm_master_data.signals  # noqa: F401
