from rest_framework import serializers
from .models import (
    CRMProject, StageCompletion, SubStageCompletion,
    ProjectNote, ProjectFile, ProjectMilestone, KeyLearning, ProjectPayment,
    TASK_STATUS_CHOICES,
)
from .stage_definitions import ALL_INITIAL_STAGE_KEYS, STAGE_DISPLAY_MAP


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


class TaskItemSerializer(serializers.ModelSerializer):
    """Flat task row for the Task Tracker page."""
    stage_display = serializers.SerializerMethodField()
    project_id = serializers.UUIDField(source='project.id', read_only=True)
    project_no = serializers.CharField(source='project.project_no', read_only=True)
    client_name = serializers.CharField(source='project.client.name', read_only=True)
    client_phone = serializers.CharField(source='project.client.phone_no', read_only=True)
    assigned_to_id = serializers.UUIDField(source='assigned_to.id', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    task_status_display = serializers.SerializerMethodField()

    class Meta:
        model = StageCompletion
        fields = [
            'id', 'stage_key', 'stage_display',
            'project_id', 'project_no', 'client_name', 'client_phone',
            'assigned_to_id', 'assigned_to_name', 'assigned_at',
            'task_status', 'task_status_display',
        ]

    def get_stage_display(self, obj):
        return STAGE_DISPLAY_MAP.get(obj.stage_key, obj.stage_key)

    def get_task_status_display(self, obj):
        return dict(TASK_STATUS_CHOICES).get(obj.task_status, obj.task_status)


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
            'comments', 'invoice_drive_id', 'invoice_drive_url', 'invoice_filename',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'created_at', 'updated_at',
            'invoice_drive_id', 'invoice_drive_url', 'invoice_filename',
            'sub_type_display', 'vendor_name', 'vendor_vid',
            'manufacturer_name', 'manufacturer_vid', 'project_no', 'project_client_name',
        ]

    def get_sub_type_display(self, obj):
        return SUB_TYPE_LABELS.get(obj.sub_type, obj.sub_type)


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
            'id', 'project_no', 'client', 'client_name', 'client_company',
            'no_of_products', 'moq', 'phase', 'project_stage',
            'manufacturers', 'designers', 'packaging_vendors',
            'printers', 'batch_testing_vendors', 'derma_testing_vendors',
            'sales_poc', 'sales_poc_name', 'formulation_poc', 'formulation_poc_name',
            'sample_booked_date', 'start_date', 'created_at',
            'progress_percentage', 'has_delays', 'next_milestone',
        ]
        read_only_fields = ['id', 'project_no', 'start_date', 'created_at', 'phase', 'project_stage']

    def get_has_delays(self, obj):
        return obj.milestones.filter(status='delayed').exists()

    def get_next_milestone(self, obj):
        milestone = obj.milestones.filter(
            actual_date__isnull=True, status__in=['on_track', 'at_risk']
        ).order_by('planned_date').first()
        if not milestone:
            return None
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
        return obj.milestones.filter(status='delayed').count()

    def get_at_risk_count(self, obj):
        return obj.milestones.filter(status='at_risk').count()


class CRMProjectWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMProject
        fields = [
            'id', 'project_no', 'client', 'no_of_products', 'moq',
            'manufacturers', 'designers', 'packaging_vendors',
            'printers', 'batch_testing_vendors', 'derma_testing_vendors',
            'sales_poc', 'formulation_poc', 'sample_booked_date',
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
        StageCompletion.objects.bulk_create([
            StageCompletion(project=project, stage_key=k)
            for k in ALL_INITIAL_STAGE_KEYS
        ])
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
