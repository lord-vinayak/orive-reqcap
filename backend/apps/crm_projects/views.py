from datetime import date, timedelta
from django.db.models import Q
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    CRMProject, StageCompletion, SubStageCompletion,
    ProjectNote, ProjectFile, ProjectMilestone, KeyLearning, _add_weekdays,
)
from .serializers import (
    CRMProjectListSerializer, CRMProjectDetailSerializer, CRMProjectWriteSerializer,
    SubStageCompletionSerializer, ProjectNoteSerializer, ProjectFileSerializer,
    ProjectMilestoneSerializer, KeyLearningSerializer,
)
from .stage_definitions import STAGE_DEFINITIONS, STAGE_KEY_TO_INDEX


def _build_milestones(project: CRMProject):
    """Create/refresh ProjectMilestone rows when sample_booked_date is set."""
    if not project.sample_booked_date:
        return
    day0 = project.sample_booked_date
    rules = [
        ('sample_transit', 'Sample Transit', day0, 14),
    ]
    milestones_to_create = []
    for key, display, trigger, offset in rules:
        planned = _add_weekdays(trigger, offset)
        milestones_to_create.append(
            ProjectMilestone(
                project=project,
                milestone_key=key,
                milestone_display=display,
                planned_date=planned,
            )
        )
    # Use update_or_create to avoid duplicates
    for m in milestones_to_create:
        obj, _ = ProjectMilestone.objects.update_or_create(
            project=project,
            milestone_key=m.milestone_key,
            defaults={
                'milestone_display': m.milestone_display,
                'planned_date': m.planned_date,
            },
        )
        obj.refresh_status()
        obj.save(update_fields=['status'])


def _refresh_milestone_statuses(project: CRMProject):
    """Recalculate RAG flags on all project milestones."""
    for m in project.milestones.all():
        m.refresh_status()
        m.save(update_fields=['status'])


def _check_stage_complete(project: CRMProject, stage_key: str):
    """
    Mark a stage complete if all mandatory sub-stages are checked.
    Returns True if stage transitioned to complete.
    """
    stage_def = next((s for s in STAGE_DEFINITIONS if s['key'] == stage_key), None)
    if not stage_def:
        return False

    mandatory_keys = [ss['key'] for ss in stage_def['sub_stages'] if ss['mandatory']]

    if not mandatory_keys:
        # Stage with no sub-stages — user controls completion directly
        return False

    completed_keys = set(
        SubStageCompletion.objects.filter(
            project=project, stage_key=stage_key, completed=True
        ).values_list('sub_stage_key', flat=True)
    )
    all_mandatory_done = all(k in completed_keys for k in mandatory_keys)

    sc, _ = StageCompletion.objects.get_or_create(project=project, stage_key=stage_key)
    if all_mandatory_done and not sc.is_complete:
        sc.is_complete = True
        sc.completed_at = date.today()
        sc.save(update_fields=['is_complete', 'completed_at'])
        return True
    elif not all_mandatory_done and sc.is_complete:
        sc.is_complete = False
        sc.completed_at = None
        sc.save(update_fields=['is_complete', 'completed_at'])
    return False


class CRMProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['project_no', 'client__name', 'client__company_name', 'client__phone_no']
    ordering_fields = ['created_at', 'project_stage', 'start_date']

    def get_queryset(self):
        qs = CRMProject.objects.select_related(
            'client', 'sales_poc', 'formulation_poc', 'manufacturer', 'created_by'
        ).prefetch_related(
            'stage_completions', 'milestones'
        )
        stage = self.request.query_params.get('stage')
        if stage:
            qs = qs.filter(project_stage=stage)
        client = self.request.query_params.get('client')
        if client:
            qs = qs.filter(client__phone_no=client)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return CRMProjectListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CRMProjectWriteSerializer
        return CRMProjectDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        _refresh_milestone_statuses(instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        project = serializer.save()
        if project.sample_booked_date:
            _build_milestones(project)

    def perform_update(self, serializer):
        old_date = serializer.instance.sample_booked_date
        project = serializer.save()
        if project.sample_booked_date and project.sample_booked_date != old_date:
            _build_milestones(project)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admin can delete.'}, status=403)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Aggregate stats for the dashboard."""
        qs = CRMProject.objects.all()
        stage_distribution = {}
        for s in STAGE_DEFINITIONS:
            count = qs.filter(project_stage=s['key']).count()
            stage_distribution[s['display']] = count

        delayed_projects = CRMProject.objects.filter(
            milestones__status='delayed'
        ).distinct().count()

        pipeline = {
            'proposal': qs.filter(project_stage='proposal').count(),
            'sample_in_pipeline': SubStageCompletion.objects.filter(
                stage_key='sample', sub_stage_key='in_pipeline', completed=True
            ).values('project').distinct().count(),
            'packaging': qs.filter(project_stage='packaging').count(),
        }

        return Response({
            'stage_distribution': stage_distribution,
            'total_projects': qs.count(),
            'delayed_projects': delayed_projects,
            'pipeline': pipeline,
        })

    @action(detail=False, methods=['get'])
    def health_table(self, request):
        """Project health table for dashboard — lightweight."""
        qs = self.get_queryset().prefetch_related('milestones', 'stage_completions')
        serializer = CRMProjectListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='toggle-sub-stage')
    def toggle_sub_stage(self, request, pk=None):
        """Check/uncheck a sub-stage step."""
        project = self.get_object()
        stage_key = request.data.get('stage_key')
        sub_stage_key = request.data.get('sub_stage_key')
        completed = request.data.get('completed', True)

        if not stage_key or not sub_stage_key:
            return Response({'detail': 'stage_key and sub_stage_key required.'}, status=400)

        ssc, _ = SubStageCompletion.objects.get_or_create(
            project=project, stage_key=stage_key, sub_stage_key=sub_stage_key
        )
        ssc.completed = completed
        ssc.completed_at = date.today() if completed else None
        ssc.completed_by = request.user if completed else None
        ssc.save(update_fields=['completed', 'completed_at', 'completed_by'])

        _check_stage_complete(project, stage_key)

        return Response(SubStageCompletionSerializer(ssc).data)

    @action(detail=True, methods=['post'], url_path='complete-stage')
    def complete_stage(self, request, pk=None):
        """Manually mark a no-sub-stage stage as complete/incomplete."""
        project = self.get_object()
        stage_key = request.data.get('stage_key')
        is_complete = request.data.get('is_complete', True)

        sc, _ = StageCompletion.objects.get_or_create(project=project, stage_key=stage_key)
        sc.is_complete = is_complete
        sc.completed_at = date.today() if is_complete else None
        sc.completed_by = request.user if is_complete else None
        sc.save(update_fields=['is_complete', 'completed_at', 'completed_by'])

        return Response(StageCompletion.objects.filter(pk=sc.pk).values().first())

    @action(detail=True, methods=['get'], url_path='similar-learnings')
    def similar_learnings(self, request, pk=None):
        """Surface key learnings from similar projects (same client or manufacturer)."""
        project = self.get_object()
        similar_qs = KeyLearning.objects.filter(
            Q(project__client=project.client) |
            Q(project__manufacturer=project.manufacturer, project__manufacturer__isnull=False)
        ).exclude(
            project=project
        ).select_related('project', 'created_by').order_by('-created_at')[:20]
        serializer = KeyLearningSerializer(similar_qs, many=True)
        return Response(serializer.data)


class ProjectNoteViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # append-only

    def get_queryset(self):
        qs = ProjectNote.objects.select_related('added_by')
        project_id = self.request.query_params.get('project')
        stage_key = self.request.query_params.get('stage_key')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if stage_key:
            qs = qs.filter(stage_key=stage_key)
        return qs

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)


class ProjectFileViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ProjectFile.objects.select_related('uploaded_by')
        project_id = self.request.query_params.get('project')
        stage_key = self.request.query_params.get('stage_key')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if stage_key:
            qs = qs.filter(stage_key=stage_key)
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admin can delete.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class KeyLearningViewSet(viewsets.ModelViewSet):
    serializer_class = KeyLearningSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = KeyLearning.objects.select_related('project', 'created_by')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admin can delete.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class ProjectMilestoneViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = ProjectMilestone.objects.all()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def partial_update(self, request, *args, **kwargs):
        """Allow updating actual_date; status recalculated automatically."""
        instance = self.get_object()
        actual_date = request.data.get('actual_date')
        if actual_date:
            instance.actual_date = actual_date
            instance.refresh_status()
            instance.save(update_fields=['actual_date', 'status'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
