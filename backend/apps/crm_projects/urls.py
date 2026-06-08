from rest_framework.routers import DefaultRouter
from .views import (
    CRMProjectViewSet, ProjectNoteViewSet, ProjectFileViewSet,
    KeyLearningViewSet, ProjectMilestoneViewSet, ProjectPaymentViewSet,
    TaskListViewSet, StandaloneTaskViewSet, TaskCommentViewSet, ResampleNoteViewSet,
)

router = DefaultRouter()
router.register(r'projects', CRMProjectViewSet, basename='crm-project')
router.register(r'project-notes', ProjectNoteViewSet, basename='crm-project-note')
router.register(r'project-files', ProjectFileViewSet, basename='crm-project-file')
router.register(r'key-learnings', KeyLearningViewSet, basename='crm-key-learning')
router.register(r'project-milestones', ProjectMilestoneViewSet, basename='crm-project-milestone')
router.register(r'project-payments', ProjectPaymentViewSet, basename='crm-project-payment')
router.register(r'tasks', TaskListViewSet, basename='crm-tasks')
router.register(r'standalone-tasks', StandaloneTaskViewSet, basename='crm-standalone-tasks')
router.register(r'task-comments', TaskCommentViewSet, basename='crm-task-comments')
router.register(r'resample-notes', ResampleNoteViewSet, basename='crm-resample-notes')

urlpatterns = router.urls
