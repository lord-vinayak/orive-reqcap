from datetime import date, timedelta
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    CRMProject, StageCompletion, SubStageCompletion,
    ProjectNote, ProjectFile, ProjectMilestone, KeyLearning, ProjectPayment, _add_weekdays,
)
from .serializers import (
    CRMProjectListSerializer, CRMProjectDetailSerializer, CRMProjectWriteSerializer,
    StageCompletionSerializer, ProjectNoteSerializer, ProjectFileSerializer,
    ProjectMilestoneSerializer, KeyLearningSerializer, ProjectPaymentSerializer,
    TaskItemSerializer,
)
from .stage_definitions import (
    SAMPLE_PRE_LOOP, RESAMPLE_LOOP_BASE, SAMPLE_POST_APPROVAL,
    ORDER_PHASE_SECTIONS, SAMPLE_TOTAL_STAGES, ORDER_TOTAL_STAGES,
    MAX_RESAMPLE_CYCLES, BATCH_RESET_KEYS, STAGE_DISPLAY_MAP,
    get_loop_key, get_loop_stage_keys_for_cycle, ALL_INITIAL_STAGE_KEYS,
)
from .consumers import broadcast_task_update


# ── Milestone helpers ─────────────────────────────────────────────────────────

def _build_milestones(project: CRMProject):
    if not project.sample_booked_date:
        return
    day0 = project.sample_booked_date
    rules = [('sample_transit', 'Sample Transit', day0, 14)]
    for key, display, trigger, offset in rules:
        planned = _add_weekdays(trigger, offset)
        obj, _ = ProjectMilestone.objects.update_or_create(
            project=project, milestone_key=key,
            defaults={'milestone_display': display, 'planned_date': planned},
        )
        obj.refresh_status()
        obj.save(update_fields=['status'])


def _refresh_milestone_statuses(project: CRMProject):
    for m in project.milestones.all():
        m.refresh_status()
        m.save(update_fields=['status'])


# ── Stage status computation ──────────────────────────────────────────────────

def _build_stage_status(project: CRMProject, completion_map: dict) -> dict:
    """
    Compute the full stage status payload for a project.
    `completion_map`: {stage_key: StageCompletion} for all rows belonging to this project.
    """

    def _stage_info(key: str, display: str, prev_complete: bool, extra: dict = None) -> dict:
        sc = completion_map.get(key)
        is_complete = sc.is_complete if sc else False
        return {
            'key': key,
            'display': display,
            **(extra or {}),
            'is_complete': is_complete,
            'is_locked': not prev_complete,
            'completed_at': sc.completed_at.isoformat() if sc and sc.completed_at else None,
            'completed_by_name': (
                getattr(sc.completed_by, 'name', None) or
                getattr(sc.completed_by, 'email', None)
            ) if sc and sc.completed_by else None,
            'assigned_to_id': str(sc.assigned_to_id) if sc and sc.assigned_to_id else None,
            'assigned_to_name': sc.assigned_to.name if sc and sc.assigned_to else None,
            'task_status': sc.task_status if sc else 'not_started',
        }

    cycle = project.resample_cycle

    # -- Sample pre-loop --
    pre_loop = []
    prev = True  # first stage is never locked
    for s in SAMPLE_PRE_LOOP:
        info = _stage_info(s['key'], s['display'], prev)
        pre_loop.append(info)
        prev = info['is_complete']

    pre_loop_complete = all(s['is_complete'] for s in pre_loop)

    # -- Resample loop cycles --
    loop_cycles = []
    global_prev = pre_loop_complete  # carries across cycles in terms of availability

    for c in range(1, cycle + 1):
        stages = []
        cycle_prev = global_prev  # first stage of this cycle locked if pre-loop not done
        is_active = (c == cycle)
        for s in RESAMPLE_LOOP_BASE:
            key = get_loop_key(s['key'], c)
            extra = {'is_approval_gate': True} if s.get('is_approval_gate') else {}
            info = _stage_info(key, s['display'], cycle_prev, extra)
            stages.append(info)
            cycle_prev = info['is_complete']
        loop_cycles.append({'cycle': c, 'is_active': is_active, 'stages': stages})

    # Current cycle's approval gate
    approval_key = get_loop_key('sample_approved', cycle)
    approval_complete = completion_map.get(approval_key) and completion_map[approval_key].is_complete

    # All loop stages in current cycle done (including approval)
    current_cycle_stages = next(lc for lc in loop_cycles if lc['is_active'])['stages']
    current_cycle_complete = all(s['is_complete'] for s in current_cycle_stages)

    # -- Post-approval --
    show_post_approval = approval_complete  # only show after sample approved = Yes
    post_prev = approval_complete
    post_approval = []
    for s in SAMPLE_POST_APPROVAL:
        info = _stage_info(s['key'], s['display'], post_prev)
        post_approval.append(info)
        post_prev = info['is_complete']

    post_approval_complete = all(s['is_complete'] for s in post_approval) if show_post_approval else False
    sample_phase_complete = post_approval_complete  # sample phase done when post-approval done

    # -- Order phase sections --
    order_locked = not project.order_booked
    order_sections = []
    section_prev_complete = not order_locked  # first section unlocked only after order booked

    for sec in ORDER_PHASE_SECTIONS:
        is_section_locked = order_locked or not section_prev_complete
        stage_prev = not is_section_locked
        sec_stages = []
        for s in sec['stages']:
            info = _stage_info(s['key'], s['display'], stage_prev)
            sec_stages.append(info)
            stage_prev = info['is_complete']
        is_section_complete = all(s['is_complete'] for s in sec_stages)
        order_sections.append({
            'key': sec['key'],
            'display': sec['display'],
            'is_locked': is_section_locked,
            'is_section_complete': is_section_complete,
            'stages': sec_stages,
        })
        section_prev_complete = is_section_complete

    # -- Progress --
    completed_keys = {k for k, sc in completion_map.items() if sc.is_complete}
    sample_done = (
        sum(1 for s in SAMPLE_PRE_LOOP if s['key'] in completed_keys) +
        sum(1 for s in RESAMPLE_LOOP_BASE if get_loop_key(s['key'], cycle) in completed_keys) +
        sum(1 for s in SAMPLE_POST_APPROVAL if s['key'] in completed_keys)
    )
    order_done = sum(
        1 for sec in ORDER_PHASE_SECTIONS for s in sec['stages'] if s['key'] in completed_keys
    )
    total = SAMPLE_TOTAL_STAGES + ORDER_TOTAL_STAGES
    overall_pct = round(((sample_done + order_done) / total) * 100)

    return {
        'phase': project.phase,
        'resample_cycle': cycle,
        'max_cycles': MAX_RESAMPLE_CYCLES,
        'order_advance_received': project.order_advance_received,
        'order_booked': project.order_booked,
        'sample_phase_complete': sample_phase_complete,
        'sample_phase': {
            'pre_loop': pre_loop,
            'loop_cycles': loop_cycles,
            'post_approval': post_approval,
            'show_post_approval': show_post_approval,
        },
        'order_phase': {
            'locked': order_locked,
            'sections': order_sections,
        },
        'progress': {
            'sample_done': sample_done,
            'sample_total': SAMPLE_TOTAL_STAGES,
            'order_done': order_done,
            'order_total': ORDER_TOTAL_STAGES,
            'overall_pct': overall_pct,
        },
    }


# ── ViewSet ───────────────────────────────────────────────────────────────────

class CRMProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['project_no', 'client__name', 'client__company_name', 'client__phone_no']
    ordering_fields = ['created_at', 'phase', 'start_date']

    def get_queryset(self):
        qs = CRMProject.objects.select_related(
            'client', 'sales_poc', 'formulation_poc', 'created_by'
        ).prefetch_related(
            'stage_completions', 'milestones',
            'manufacturers', 'designers', 'packaging_vendors',
            'printers', 'batch_testing_vendors', 'derma_testing_vendors',
        )
        phase = self.request.query_params.get('phase')
        if phase:
            qs = qs.filter(phase=phase)
        # Legacy: keep ?stage= filter working by mapping to project_stage
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
        # Pre-create all StageCompletion rows
        StageCompletion.objects.bulk_create([
            StageCompletion(project=project, stage_key=k)
            for k in ALL_INITIAL_STAGE_KEYS
        ])
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

    # ── Stage status endpoint ─────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='stage-status')
    def stage_status(self, request, pk=None):
        """Return the full computed stage structure with lock states."""
        project = self.get_object()
        completion_map = {
            sc.stage_key: sc
            for sc in project.stage_completions.select_related('completed_by', 'assigned_to').all()
        }
        return Response(_build_stage_status(project, completion_map))

    # ── Stage completion ──────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='complete-stage')
    def complete_stage(self, request, pk=None):
        """Mark a flat stage complete or incomplete."""
        project = self.get_object()
        stage_key = request.data.get('stage_key', '').strip()
        is_complete = bool(request.data.get('is_complete', True))

        if not stage_key:
            return Response({'detail': 'stage_key is required.'}, status=400)

        sc, _ = StageCompletion.objects.get_or_create(project=project, stage_key=stage_key)
        sc.is_complete = is_complete
        sc.completed_at = timezone.now() if is_complete else None
        sc.completed_by = request.user if is_complete else None
        sc.save(update_fields=['is_complete', 'completed_at', 'completed_by'])

        # Update project_stage display field to the current active stage key
        if is_complete:
            project.project_stage = stage_key
            project.save(update_fields=['project_stage', 'updated_at'])

        return Response(StageCompletionSerializer(sc).data)

    # ── Sample approval gate ──────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='approve-sample')
    def approve_sample(self, request, pk=None):
        """
        Mark sample as approved (Yes) or rejected (No).
        Rejection initiates the next resample cycle if cycles remain.
        """
        project = self.get_object()
        approved = request.data.get('approved')
        if approved is None:
            return Response({'detail': 'approved (bool) is required.'}, status=400)

        cycle = project.resample_cycle
        approval_key = get_loop_key('sample_approved', cycle)

        if approved:
            sc, _ = StageCompletion.objects.get_or_create(project=project, stage_key=approval_key)
            sc.is_complete = True
            sc.completed_at = timezone.now()
            sc.completed_by = request.user
            sc.save(update_fields=['is_complete', 'completed_at', 'completed_by'])
            project.project_stage = approval_key
            project.save(update_fields=['project_stage', 'updated_at'])
        else:
            if cycle >= MAX_RESAMPLE_CYCLES:
                return Response(
                    {'detail': f'Maximum resample cycles ({MAX_RESAMPLE_CYCLES}) reached.'},
                    status=400,
                )
            # Mark current approval as explicitly not complete (stays False)
            sc, _ = StageCompletion.objects.get_or_create(project=project, stage_key=approval_key)
            sc.is_complete = False
            sc.save(update_fields=['is_complete'])

            # Create next cycle's stage rows
            next_cycle = cycle + 1
            new_stages = get_loop_stage_keys_for_cycle(next_cycle)
            StageCompletion.objects.bulk_create(
                [StageCompletion(project=project, stage_key=s['key']) for s in new_stages],
                ignore_conflicts=True,
            )
            project.resample_cycle = next_cycle
            project.project_stage = get_loop_key('formula_made', next_cycle)
            project.save(update_fields=['resample_cycle', 'project_stage', 'updated_at'])

        completion_map = {
            sc.stage_key: sc
            for sc in project.stage_completions.select_related('completed_by', 'assigned_to').all()
        }
        return Response(_build_stage_status(project, completion_map))

    # ── Order gate ────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='set-order-gate')
    def set_order_gate(self, request, pk=None):
        """Set order advance received and order booked status."""
        project = self.get_object()
        order_advance = bool(request.data.get('order_advance_received', False))
        order_booked = bool(request.data.get('order_booked', False))

        project.order_advance_received = order_advance
        project.order_booked = order_booked
        if order_booked:
            project.phase = 'order'
            project.project_stage = 'pkg_req_captured'
        project.save(update_fields=['order_advance_received', 'order_booked', 'phase', 'project_stage', 'updated_at'])

        completion_map = {
            sc.stage_key: sc
            for sc in project.stage_completions.select_related('completed_by', 'assigned_to').all()
        }
        return Response(_build_stage_status(project, completion_map))

    # ── Batch testing reset ───────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='reset-batch')
    def reset_batch(self, request, pk=None):
        """Reset batch testing stages in-place (batch failure)."""
        project = self.get_object()
        StageCompletion.objects.filter(
            project=project, stage_key__in=BATCH_RESET_KEYS
        ).update(is_complete=False, completed_at=None, completed_by=None)

        completion_map = {
            sc.stage_key: sc
            for sc in project.stage_completions.select_related('completed_by', 'assigned_to').all()
        }
        return Response(_build_stage_status(project, completion_map))

    # ── Dashboard & health ────────────────────────────────────────────────────

    # ── Task assignment ───────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='assign-stage')
    def assign_stage(self, request, pk=None):
        """Assign a stage task to an InternalTeamMember."""
        project = self.get_object()
        stage_key = request.data.get('stage_key', '').strip()
        assigned_to_id = request.data.get('assigned_to')

        if not stage_key:
            return Response({'detail': 'stage_key is required.'}, status=400)
        if not assigned_to_id:
            return Response({'detail': 'assigned_to is required.'}, status=400)

        try:
            from apps.crm_master_data.models import InternalTeamMember
            member = InternalTeamMember.objects.get(id=assigned_to_id)
        except (InternalTeamMember.DoesNotExist, Exception):
            return Response({'detail': 'Team member not found.'}, status=400)

        sc, _ = StageCompletion.objects.get_or_create(project=project, stage_key=stage_key)
        sc.assigned_to = member
        sc.assigned_at = timezone.now()
        sc.assigned_by = request.user
        sc.save(update_fields=['assigned_to', 'assigned_at', 'assigned_by'])

        sc.refresh_from_db()
        sc.assigned_to  # ensure cached

        task_payload = {
            'id': str(sc.id),
            'stage_key': sc.stage_key,
            'stage_display': STAGE_DISPLAY_MAP.get(sc.stage_key, sc.stage_key),
            'project_id': str(project.id),
            'project_no': project.project_no,
            'client_name': project.client.name,
            'client_phone': project.client.phone_no,
            'assigned_to_id': str(member.id),
            'assigned_to_name': member.name,
            'assigned_at': sc.assigned_at.isoformat(),
            'task_status': sc.task_status,
            'task_status_display': dict(sc._meta.get_field('task_status').choices).get(sc.task_status, sc.task_status),
        }
        broadcast_task_update(task_payload)
        return Response(task_payload)

    @action(detail=True, methods=['patch'], url_path='task-status')
    def task_status_update(self, request, pk=None):
        """Update the task_status for a stage."""
        project = self.get_object()
        stage_key = request.data.get('stage_key', '').strip()
        new_status = request.data.get('task_status', '').strip()

        valid_statuses = ['not_started', 'wip', 'pending', 'closed']
        if not stage_key:
            return Response({'detail': 'stage_key is required.'}, status=400)
        if new_status not in valid_statuses:
            return Response({'detail': f'task_status must be one of {valid_statuses}.'}, status=400)

        try:
            sc = StageCompletion.objects.select_related(
                'assigned_to', 'project__client'
            ).get(project=project, stage_key=stage_key)
        except StageCompletion.DoesNotExist:
            return Response({'detail': 'Stage not found for this project.'}, status=404)

        sc.task_status = new_status
        sc.save(update_fields=['task_status'])

        task_payload = {
            'id': str(sc.id),
            'stage_key': sc.stage_key,
            'stage_display': STAGE_DISPLAY_MAP.get(sc.stage_key, sc.stage_key),
            'project_id': str(project.id),
            'project_no': project.project_no,
            'client_name': project.client.name,
            'client_phone': project.client.phone_no,
            'assigned_to_id': str(sc.assigned_to_id) if sc.assigned_to_id else None,
            'assigned_to_name': sc.assigned_to.name if sc.assigned_to else None,
            'assigned_at': sc.assigned_at.isoformat() if sc.assigned_at else None,
            'task_status': sc.task_status,
            'task_status_display': dict(sc._meta.get_field('task_status').choices).get(sc.task_status, sc.task_status),
        }
        broadcast_task_update(task_payload)
        return Response(task_payload)

    # ── Dashboard & health ────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        qs = CRMProject.objects.all()
        delayed_projects = CRMProject.objects.filter(
            milestones__status='delayed'
        ).distinct().count()
        pipeline = {
            'sample_in_progress': qs.filter(phase='sample').count(),
            'order_in_progress': qs.filter(phase='order').count(),
            'sample_approved': qs.filter(
                phase='sample', order_booked=False,
                resample_cycle__gte=1,
            ).filter(
                stage_completions__stage_key='sample_approved',
                stage_completions__is_complete=True,
            ).distinct().count(),
        }
        return Response({
            'stage_distribution': {
                'Sample Phase': qs.filter(phase='sample').count(),
                'Order Phase': qs.filter(phase='order').count(),
            },
            'total_projects': qs.count(),
            'delayed_projects': delayed_projects,
            'pipeline': pipeline,
        })

    @action(detail=False, methods=['get'])
    def health_table(self, request):
        qs = self.get_queryset().prefetch_related('milestones', 'stage_completions')
        serializer = CRMProjectListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='similar-learnings')
    def similar_learnings(self, request, pk=None):
        project = self.get_object()
        manufacturer_ids = list(project.manufacturers.values_list('id', flat=True))
        q = Q(project__client=project.client)
        if manufacturer_ids:
            q |= Q(project__manufacturers__id__in=manufacturer_ids)
        similar_qs = KeyLearning.objects.filter(q).exclude(
            project=project
        ).select_related('project', 'created_by').distinct().order_by('-created_at')[:20]
        return Response(KeyLearningSerializer(similar_qs, many=True).data)


# ── Supporting ViewSets ───────────────────────────────────────────────────────

class ProjectNoteViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

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
        instance = self.get_object()
        actual_date = request.data.get('actual_date')
        if actual_date:
            instance.actual_date = actual_date
            instance.refresh_status()
            instance.save(update_fields=['actual_date', 'status'])
        return Response(self.get_serializer(instance).data)


class TaskListViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only view of all assigned stage tasks across all projects."""
    serializer_class = TaskItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            StageCompletion.objects
            .filter(assigned_to__isnull=False)
            .select_related(
                'project', 'project__client',
                'assigned_to', 'assigned_by',
            )
            .order_by('-assigned_at')
        )


class ProjectPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = ProjectPayment.objects.select_related(
            'created_by', 'project__client', 'vendor', 'manufacturer'
        )
        project_id = self.request.query_params.get('project')
        vendor_id = self.request.query_params.get('vendor')
        manufacturer_id = self.request.query_params.get('manufacturer')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        if manufacturer_id:
            qs = qs.filter(manufacturer_id=manufacturer_id)
        return qs

    def _handle_invoice(self, instance, request):
        invoice_file = request.FILES.get('invoice')
        if not invoice_file:
            return
        from apps.files.drive_service import upload_file
        try:
            result = upload_file(
                file_bytes=invoice_file.read(),
                filename=invoice_file.name,
                mimetype=invoice_file.content_type or 'application/octet-stream',
                client_name=instance.project.client.name,
                subfolder='Invoices',
            )
            instance.invoice_drive_id = result['drive_file_id']
            instance.invoice_drive_url = result['drive_url']
            instance.invoice_filename = invoice_file.name
            instance.save(update_fields=['invoice_drive_id', 'invoice_drive_url', 'invoice_filename'])
        except Exception:
            pass

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self._handle_invoice(instance, self.request)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._handle_invoice(instance, self.request)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admin can delete payments.'}, status=403)
        return super().destroy(request, *args, **kwargs)
