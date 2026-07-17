from datetime import date
from rest_framework import serializers
from .models import (
    CRMProject, ProjectVendorLink, StageCompletion, SubStageCompletion,
    ProjectNote, ProjectFile, ProjectMilestone, KeyLearning, ProjectPayment,
    StandaloneTask, TaskComment, ResampleNote,
    TASK_STATUS_CHOICES, project_stage_rag_keys,
)
from .stage_definitions import STAGE_DISPLAY_MAP
from apps.crm_master_data.models import Vendor
from apps.clients.models import Client


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
    assigned_by_name = serializers.SerializerMethodField()
    task_status_display = serializers.SerializerMethodField()
    last_updated_by_name = serializers.SerializerMethodField()
    latest_comment = serializers.SerializerMethodField()

    class Meta:
        model = StageCompletion
        fields = [
            'id', 'task_type', 'stage_key', 'stage_display', 'title',
            'project_id', 'project_no', 'client_name', 'client_phone',
            'client_lead_status', 'client_lead_sub_status',
            'assigned_to_id', 'assigned_to_name', 'assigned_to_user_id',
            'assigned_by_user_id', 'assigned_by_name', 'assigned_at',
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

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return getattr(obj.assigned_by, 'name', None) or obj.assigned_by.email
        return None

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
    assigned_by_name = serializers.SerializerMethodField()
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
            'assigned_to_id', 'assigned_to_name', 'assigned_to_user_id',
            'assigned_by_user_id', 'assigned_by_name', 'assigned_at',
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

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return getattr(obj.assigned_by, 'name', None) or obj.assigned_by.email
        return None

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
    project_no = serializers.CharField(source='project.project_no', read_only=True, default=None)
    project_client_name = serializers.CharField(source='project.client.name', read_only=True, default=None)
    clients = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(), many=True, required=False,
    )
    client_names = serializers.SerializerMethodField()

    class Meta:
        model = ProjectPayment
        fields = [
            'id', 'project', 'project_no', 'project_client_name',
            'clients', 'client_names',
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
            'client_names', 'settlement', 'is_settled',
        ]

    def get_client_names(self, obj):
        return [c.name for c in obj.clients.all()]

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
    vendor_assignments = serializers.SerializerMethodField()
    progress_percentage = serializers.IntegerField(read_only=True)
    has_delays = serializers.SerializerMethodField()
    overall_status = serializers.SerializerMethodField()
    next_milestone = serializers.SerializerMethodField()

    class Meta:
        model = CRMProject
        fields = [
            'id', 'project_no', 'client', 'client_name', 'client_company', 'client_phone',
            'client_lead_status', 'client_lead_sub_status',
            'no_of_products', 'moq', 'phase', 'project_stage',
            'manufacturers', 'vendor_assignments',
            'sales_poc', 'sales_poc_name', 'formulation_poc', 'formulation_poc_name',
            'sample_booked_date', 'start_date', 'created_at',
            'progress_percentage', 'has_delays', 'overall_status', 'next_milestone',
            'source_requirement',
        ]
        read_only_fields = ['id', 'project_no', 'start_date', 'created_at', 'phase', 'project_stage']

    def get_has_delays(self, obj):
        return bool(project_stage_rag_keys(obj)['red'])

    def get_overall_status(self, obj):
        rag = project_stage_rag_keys(obj)
        if rag['red']:
            return 'delayed'
        if rag['amber']:
            return 'at_risk'
        return 'on_track'

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

    def get_vendor_assignments(self, obj):
        from apps.crm_master_data.models import VendorCategory
        cat_map = {c.slug: c.name for c in VendorCategory.objects.all()}
        return [
            {
                'id': str(link.vendor.id),
                'vendor_id': link.vendor.vendor_id,
                'company_name': link.vendor.company_name,
                'city': link.vendor.city,
                'category_slug': link.vendor.vendor_type,
                'category_name': cat_map.get(link.vendor.vendor_type, link.vendor.vendor_type.replace('_', ' ').title()),
            }
            for link in obj.vendor_links.select_related('vendor').all()
        ]


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
    vendor_ids = serializers.PrimaryKeyRelatedField(
        queryset=Vendor.objects.all(), many=True, required=False, write_only=True,
    )

    class Meta:
        model = CRMProject
        fields = [
            'id', 'project_no', 'client', 'no_of_products', 'moq',
            'manufacturers', 'vendor_ids',
            'sales_poc', 'formulation_poc', 'sample_booked_date',
            'source_requirement',
        ]
        read_only_fields = ['id', 'project_no']

    def create(self, validated_data):
        user = self.context['request'].user
        vendor_objs = validated_data.pop('vendor_ids', [])
        manufacturers = validated_data.pop('manufacturers', [])
        project = CRMProject.objects.create(created_by=user, **validated_data)
        project.manufacturers.set(manufacturers)
        ProjectVendorLink.objects.bulk_create(
            [ProjectVendorLink(project=project, vendor=v) for v in vendor_objs],
            ignore_conflicts=True,
        )
        return project

    def update(self, instance, validated_data):
        vendor_objs = validated_data.pop('vendor_ids', None)
        manufacturers = validated_data.pop('manufacturers', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if manufacturers is not None:
            instance.manufacturers.set(manufacturers)
        if vendor_objs is not None:
            instance.vendor_links.all().delete()
            ProjectVendorLink.objects.bulk_create(
                [ProjectVendorLink(project=instance, vendor=v) for v in vendor_objs],
                ignore_conflicts=True,
            )
        return instance
