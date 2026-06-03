from rest_framework.routers import DefaultRouter
from .views import (
    CRMProjectViewSet, ProjectNoteViewSet, ProjectFileViewSet,
    KeyLearningViewSet, ProjectMilestoneViewSet, ProjectPaymentViewSet,
)

router = DefaultRouter()
router.register(r'projects', CRMProjectViewSet, basename='crm-project')
router.register(r'project-notes', ProjectNoteViewSet, basename='crm-project-note')
router.register(r'project-files', ProjectFileViewSet, basename='crm-project-file')
router.register(r'key-learnings', KeyLearningViewSet, basename='crm-key-learning')
router.register(r'project-milestones', ProjectMilestoneViewSet, basename='crm-project-milestone')
router.register(r'project-payments', ProjectPaymentViewSet, basename='crm-project-payment')

urlpatterns = router.urls
