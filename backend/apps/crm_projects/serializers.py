from datetime import date
from rest_framework import serializers
from .models import (
    CRMProject, StageCompletion, SubStageCompletion,
    ProjectNote, ProjectFile, ProjectMilestone, KeyLearning, ProjectPayment,
    StandaloneTask, TaskComment, ResampleNote,
    TASK_STATUS_CHOICES,
)
from .stage_definitions import STAGE_DISPLAY_MAP


class StageCompletionSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.CharField(source='completed_by.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)

    class Meta:
        model = StageCompletion
        fields = [
            'id', 'stage_key', 'is_complete', 'completed_at', 'completed_by', 'completed_by_name',
            'assigned_to', 'assigned_to_name', 'assigned_at', 'task_status',
        ]
        read_only_fields = ['id', 'completed_by', 'completed_by_name', 'completed_at',
                            'assigned_to_name', 'assigned_at']


class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True, default=None)
    author_email = serializers.EmailField(source='author.email', read_only=True, default=None)

    class Meta:
        model = TaskComment
        fields = [
            'id', 'stage_task', 'standalone_task',
            'text', 'author', 'author_name', 'author_email',
            'created_at', 'updated_at', 'edited',
        ]
        read_only_fields = ['id', 'author', 'author_name', 'author_email', 'created_at', 'updated_at', 'edited']

    def validate(self, data):
        stage_task = data.get('stage_task', getattr(self.instance, 'stage_task', None))
        standalone_task = data.get('standalone_task', getattr(self.instance, 'standalone_task', None))
        if not stage_task and not standalone_task:
            raise serializers.ValidationError('Either stage_task or standalone_task is required.')
        if stage_task and standalone_task:
            raise serializers.ValidationError('Provide only one of stage_task or standalone_task.')
        return data

    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError('Comment cannot be empty.')
        return value.strip()


class ResampleNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = ResampleNote
        fields = ['id', 'project', 'cycle_from', 'reason', 'author_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'project', 'cycle_from', 'author_name', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        if obj.author:
            return getattr(obj.author, 'name', None) or obj.author.email
        return None

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError('Reason cannot be empty.')
        return value.strip()


class TaskItemSerializer(serializers.ModelSerializer):
    """Flat task row for stage-linked tasks (Task Tracker page)."""
    task_type = serializers.SerializerMethodField()
    stage_display = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    project_id = serializers.UUIDField(source='project.id', read_only=True)
    project_no = serializers.CharField(source='project.project_no', read_only=True)
    client_name = serializers.CharField(source='project.client.name', read_only=True)
    client_phone = serializers.CharField(source='project.client.phone_no', read_only=True)
    client_lead_status = serializers.CharField(source='project.client.lead_status', read_only=True)
    client_lead_sub_status = serializers.CharField(source='project.client.lead_sub_status', read_only=True)
    assigned_to_id = serializers.UUIDField(source='assigned_to.id', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    assigned_to_user_id = serializers.SerializerMethodField()
    assigned_by_user_id = serializers.SerializerMethodField()
    task_status_display = serializers.SerializerMethodField()
    last_updated_by_name = serializers.SerializerMethodField()
    latest_comment = serializers.SerializerMethodField()

    class Meta:
        model = StageCompletion
        fields = [
            'id', 'task_type', 'stage_key', 'stage_display', 'title',
            'project_id', 'project_no', 'client_name', 'client_phone',
            'client_lead_status', 'client_lead_sub_status',
            'assigned_to_id', 'assigned_to_name', 'assigned_to_user_id', 'assigned_by_user_id', 'assigned_at',
            'priority', 'planned_closure_date', 'actual_closure_date',
            'task_status', 'task_status_display',
            'last_updated_at', 'last_updated_by_name',
            'latest_comment',
        ]

    def get_task_type(self, obj):
        return 'stage'

    def get_assigned_to_user_id(self, obj):
        if obj.assigned_to and obj.assigned_to.user_id:
            return str(obj.assigned_to.user_id)
        return None

    def get_assigned_by_user_id(self, obj):
        return str(obj.assigned_by_id) if obj.assigned_by_id else None

    def get_stage_display(self, obj):
        return STAGE_DISPLAY_MAP.get(obj.stage_key, obj.stage_key)

    def get_title(self, obj):
        return STAGE_DISPLAY_MAP.get(obj.stage_key, obj.stage_key)

    def get_task_status_display(self, obj):
        return dict(TASK_STATUS_CHOICES).get(obj.task_status, obj.task_status)

    def get_last_updated_by_name(self, obj):
        if obj.last_updated_by:
            return getattr(obj.last_updated_by, 'name', None) or obj.last_updated_by.email
        return None

    def get_latest_comment(self, obj):
        comments = getattr(obj, 'prefetched_comments', None)
        comment = comments[0] if comments else None
        if not comment:
            return None
        return {
            'id': str(comment.id),
            'text': comment.text,
            'author_name': getattr(comment.author, 'name', None) if comment.author else None,
            'created_at': comment.created_at.isoformat(),
            'edited': comment.edited,
        }


class StandaloneTaskSerializer(serializers.ModelSerializer):
    """Serializer for standalone tasks created directly from Task Tracker."""
    task_type = serializers.SerializerMethodField()
    project_id = serializers.UUIDField(source='project.id', read_only=True)
    project_no = serializers.CharField(source='project.project_no', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_phone = serializers.CharField(source='client.phone_no', read_only=True)
    client_lead_status = serializers.CharField(source='client.lead_status', read_only=True)
    client_lead_sub_status = serializers.CharField(source='client.lead_sub_status', read_only=True)
    assigned_to_id = serializers.UUIDField(source='assigned_to.id', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    assigned_to_user_id = serializers.SerializerMethodField()
    assigned_by_user_id = serializers.SerializerMethodField()
    task_status_display = serializers.SerializerMethodField()
    last_updated_by_name = serializers.SerializerMethodField()
    latest_comment = serializers.SerializerMethodField()
    # Input-only fields (not model fields — resolved in create/update)
    project_input = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    client_input = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)
    assigned_to_input = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = StandaloneTask
        fields = [
            'id', 'task_type', 'title',
            'project_id', 'project_no',
            'client_name', 'client_phone',
            'client_lead_status', 'client_lead_sub_status',
            'assigned_to_id', 'assigned_to_name', 'assigned_to_user_id', 'assigned_by_user_id', 'assigned_at',
            'priority', 'planned_closure_date', 'actual_closure_date',
            'task_status', 'task_status_display',
            'last_updated_at', 'last_updated_by_name',
            'latest_comment', 'created_at',
            # write-only inputs
            'project_input', 'client_input', 'assigned_to_input',
        ]
        read_only_fields = ['id', 'assigned_at', 'created_at', 'last_updated_at']

    def get_task_type(self, obj):
        return 'standalone'

    def get_assigned_to_user_id(self, obj):
        if obj.assigned_to and obj.assigned_to.user_id:
            return str(obj.assigned_to.user_id)
        return None

    def get_assigned_by_user_id(self, obj):
        return str(obj.assigned_by_id) if obj.assigned_by_id else None

    def get_task_status_display(self, obj):
        return dict(TASK_STATUS_CHOICES).get(obj.task_status, obj.task_status)

    def get_last_updated_by_name(self, obj):
        if obj.last_updated_by:
            return getattr(obj.last_updated_by, 'name', None) or obj.last_updated_by.email
        return None

    def get_latest_comment(self, obj):
        comments = getattr(obj, 'prefetched_comments', None)
        comment = comments[0] if comments else None
        if not comment:
            return None
        return {
            'id': str(comment.id),
            'text': comment.text,
            'author_name': getattr(comment.author, 'name', None) if comment.author else None,
            'created_at': comment.created_at.isoformat(),
            'edited': comment.edited,
        }

    def _resolve_related(self, validated_data):
        from apps.clients.models import Client
        from apps.crm_master_data.models import InternalTeamMember

        project_id = validated_data.pop('project_input', None)
        if project_id:
            try:
                validated_data['project'] = CRMProject.objects.get(id=project_id)
            except CRMProject.DoesNotExist:
                pass

        client_phone = validated_data.pop('client_input', None)
        if client_phone:
            try:
                validated_data['client'] = Client.objects.get(phone_no=client_phone)
            except Client.DoesNotExist:
                pass

        assigned_to_id = validated_data.pop('assigned_to_input', None)
        if assigned_to_id:
            try:
                validated_data['assigned_to'] = InternalTeamMember.objects.get(id=assigned_to_id)
            except InternalTeamMember.DoesNotExist:
                pass

        return validated_data

    def create(self, validated_data):
        validated_data = self._resolve_related(validated_data)
        return StandaloneTask.objects.create(**validated_data)

    def update(self, instance, validated_data):
        validated_data = self._resolve_related(validated_data)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ProjectNoteSerializer(serializers.ModelSerializer):
    added_by_name = serializers.CharField(source='added_by.name', read_only=True)
    added_by_email = serializers.EmailField(source='added_by.email', read_only=True)

    class Meta:
        model = ProjectNote
        fields = [
            'id', 'project', 'stage_key', 'sub_stage_key',
            'text', 'added_by', 'added_by_name', 'added_by_email', 'created_at',
        ]
        read_only_fields = ['id', 'added_by', 'added_by_name', 'added_by_email', 'created_at']

    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError('Note text cannot be empty.')
        return value.strip()


class ProjectFileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)

    class Meta:
        model = ProjectFile
        fields = [
            'id', 'project', 'stage_key', 'sub_stage_key',
            'drive_file_id', 'drive_url', 'filename', 'file_type',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = ['id', 'milestone_key', 'milestone_display', 'planned_date', 'actual_date', 'status']
        read_only_fields = ['id', 'milestone_key', 'milestone_display', 'planned_date', 'status']


class KeyLearningSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = KeyLearning
        fields = ['id', 'project', 'text', 'tags', 'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']


SUB_TYPE_LABELS = {
    'manufacturing': 'Manufacturing', 'logistics': 'Logistics',
    'derma_testing': 'Derma Testing', 'batch_testing': 'Batch Testing',
    'packaging': 'Packaging', 'printing': 'Printing',
    'samples': 'Samples', 'others': 'Others',
    'sample': 'Sample', 'production': 'Production',
    'design': 'Design', 'testing': 'Testing',
}


class ProjectPaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    sub_type_display = serializers.SerializerMethodField()
    is_settled = serializers.SerializerMethodField()
    settlement = serializers.PrimaryKeyRelatedField(read_only=True)
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True, default=None)
    vendor_vid = serializers.CharField(source='vendor.vendor_id', read_only=True, default=None)
    manufacturer_name = serializers.CharField(source='manufacturer.company_name', read_only=True, default=None)
    manufacturer_vid = serializers.CharField(source='manufacturer.vendor_id', read_only=True, default=None)
    project_no = serializers.CharField(source='project.project_no', read_only=True)
    project_client_name = serializers.CharField(source='project.client.name', read_only=True)

    class Meta:
        model = ProjectPayment
        fields = [
            'id', 'project', 'project_no', 'project_client_name',
            'payment_date', 'direction', 'sub_type', 'sub_type_display', 'amount',
            'vendor', 'vendor_name', 'vendor_vid',
            'manufacturer', 'manufacturer_name', 'manufacturer_vid',
            'settlement', 'is_settled',
            'comments', 'invoice_drive_id', 'invoice_drive_url', 'invoice_filename',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'created_at', 'updated_at',
            'invoice_drive_id', 'invoice_drive_url', 'invoice_filename',
            'sub_type_display', 'vendor_name', 'vendor_vid',
            'manufacturer_name', 'manufacturer_vid', 'project_no', 'project_client_name',
            'settlement', 'is_settled',
        ]

    def get_sub_type_display(self, obj):
        return SUB_TYPE_LABELS.get(obj.sub_type, obj.sub_type)

    def get_is_settled(self, obj):
        return obj.is_settled

    def validate(self, attrs):
        if self.instance and self.instance.is_settled:
            raise serializers.ValidationError('Settled entries cannot be edited.')
        return attrs


class VendorMiniSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    vendor_id = serializers.CharField()
    company_name = serializers.CharField()
    city = serializers.CharField()


class ManufacturerMiniSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    vendor_id = serializers.CharField()
    company_name = serializers.CharField()
    city = serializers.CharField()


class CRMProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list/dashboard views."""
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_company = serializers.CharField(source='client.company_name', read_only=True)
    client_phone = serializers.CharField(source='client.phone_no', read_only=True)
    client_lead_status = serializers.CharField(source='client.lead_status', read_only=True)
    client_lead_sub_status = serializers.CharField(source='client.lead_sub_status', read_only=True)
    sales_poc_name = serializers.CharField(source='sales_poc.name', read_only=True)
    formulation_poc_name = serializers.CharField(source='formulation_poc.name', read_only=True)
    manufacturers = ManufacturerMiniSerializer(many=True, read_only=True)
    designers = VendorMiniSerializer(many=True, read_only=True)
    packaging_vendors = VendorMiniSerializer(many=True, read_only=True)
    printers = VendorMiniSerializer(many=True, read_only=True)
    batch_testing_vendors = VendorMiniSerializer(many=True, read_only=True)
    derma_testing_vendors = VendorMiniSerializer(many=True, read_only=True)
    progress_percentage = serializers.IntegerField(read_only=True)
    has_delays = serializers.SerializerMethodField()
    next_milestone = serializers.SerializerMethodField()

    class Meta:
        model = CRMProject
        fields = [
            'id', 'project_no', 'client', 'client_name', 'client_company', 'client_phone',
            'client_lead_status', 'client_lead_sub_status',
            'no_of_products', 'moq', 'phase', 'project_stage',
            'manufacturers', 'designers', 'packaging_vendors',
            'printers', 'batch_testing_vendors', 'derma_testing_vendors',
            'sales_poc', 'sales_poc_name', 'formulation_poc', 'formulation_poc_name',
            'sample_booked_date', 'start_date', 'created_at',
            'progress_percentage', 'has_delays', 'next_milestone',
            'source_requirement',
        ]
        read_only_fields = ['id', 'project_no', 'start_date', 'created_at', 'phase', 'project_stage']

    def get_has_delays(self, obj):
        return any(m.status == 'delayed' for m in obj.milestones.all())

    def get_next_milestone(self, obj):
        candidates = [
            m for m in obj.milestones.all()
            if m.actual_date is None and m.status in ('on_track', 'at_risk')
        ]
        if not candidates:
            return None
        milestone = min(candidates, key=lambda m: m.planned_date or date(9999, 12, 31))
        return {'key': milestone.milestone_key, 'display': milestone.milestone_display,
                'planned_date': milestone.planned_date}


class CRMProjectDetailSerializer(CRMProjectListSerializer):
    """Full serializer for project detail view."""
    stage_completions = StageCompletionSerializer(many=True, read_only=True)
    notes = ProjectNoteSerializer(many=True, read_only=True)
    files = ProjectFileSerializer(many=True, read_only=True)
    milestones = ProjectMilestoneSerializer(many=True, read_only=True)
    key_learnings = KeyLearningSerializer(many=True, read_only=True)
    delayed_count = serializers.SerializerMethodField()
    at_risk_count = serializers.SerializerMethodField()

    class Meta(CRMProjectListSerializer.Meta):
        fields = CRMProjectListSerializer.Meta.fields + [
            'resample_cycle', 'order_advance_received', 'order_booked',
            'stage_completions', 'notes', 'files', 'milestones', 'key_learnings',
            'delayed_count', 'at_risk_count',
        ]

    def get_delayed_count(self, obj):
        return sum(1 for m in obj.milestones.all() if m.status == 'delayed')

    def get_at_risk_count(self, obj):
        return sum(1 for m in obj.milestones.all() if m.status == 'at_risk')


class CRMProjectWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMProject
        fields = [
            'id', 'project_no', 'client', 'no_of_products', 'moq',
            'manufacturers', 'designers', 'packaging_vendors',
            'printers', 'batch_testing_vendors', 'derma_testing_vendors',
            'sales_poc', 'formulation_poc', 'sample_booked_date',
            'source_requirement',
        ]
        read_only_fields = ['id', 'project_no']

    M2M_FIELDS = [
        'manufacturers', 'designers', 'packaging_vendors',
        'printers', 'batch_testing_vendors', 'derma_testing_vendors',
    ]

    def create(self, validated_data):
        user = self.context['request'].user
        m2m_data = {f: validated_data.pop(f, []) for f in self.M2M_FIELDS}
        project = CRMProject.objects.create(created_by=user, **validated_data)
        for field, values in m2m_data.items():
            getattr(project, field).set(values)
        return project

    def update(self, instance, validated_data):
        m2m_data = {f: validated_data.pop(f, None) for f in self.M2M_FIELDS}
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        for field, values in m2m_data.items():
            if values is not None:
                getattr(instance, field).set(values)
        return instance
