from django.apps import AppConfig


class ActivitiesConfig(AppConfig):
    name = 'apps.activities'
    label = 'activities'


    def ready(self):
        import apps.activities.signals  # noqa: F401
