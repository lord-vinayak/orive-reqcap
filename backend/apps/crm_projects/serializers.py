from datetime import date
from rest_framework import serializers
from .models import (
    CRMProject, StageCompletion, SubStageCompletion,
    ProjectNote, ProjectFile, ProjectMilestone, KeyLearning,
)
from .stage_definitions import STAGE_DEFINITIONS, STAGE_KEY_TO_INDEX


class SubStageCompletionSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.CharField(source='completed_by.name', read_only=True)

    class Meta:
        model = SubStageCompletion
        fields = [
            'id', 'stage_key', 'sub_stage_key',
            'completed', 'completed_at', 'completed_by', 'completed_by_name',
        ]
        read_only_fields = ['id', 'completed_by', 'completed_by_name', 'completed_at']


class StageCompletionSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.CharField(source='completed_by.name', read_only=True)

    class Meta:
        model = StageCompletion
        fields = ['id', 'stage_key', 'is_complete', 'completed_at', 'completed_by', 'completed_by_name']
        read_only_fields = ['id', 'completed_by', 'completed_by_name', 'completed_at']


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
        fields = [
            'id', 'milestone_key', 'milestone_display',
            'planned_date', 'actual_date', 'status',
        ]
        read_only_fields = ['id', 'milestone_key', 'milestone_display', 'planned_date', 'status']


class KeyLearningSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = KeyLearning
        fields = ['id', 'project', 'text', 'tags', 'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']


class CRMProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list/dashboard views."""
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_company = serializers.CharField(source='client.company_name', read_only=True)
    sales_poc_name = serializers.CharField(source='sales_poc.name', read_only=True)
    formulation_poc_name = serializers.CharField(source='formulation_poc.name', read_only=True)
    manufacturer_name = serializers.CharField(source='manufacturer.company_name', read_only=True)
    progress_percentage = serializers.IntegerField(read_only=True)
    has_delays = serializers.SerializerMethodField()
    next_milestone = serializers.SerializerMethodField()

    class Meta:
        model = CRMProject
        fields = [
            'id', 'project_no', 'client', 'client_name', 'client_company',
            'no_of_products', 'moq', 'manufacturer', 'manufacturer_name',
            'project_stage', 'sales_poc', 'sales_poc_name',
            'formulation_poc', 'formulation_poc_name',
            'sample_booked_date', 'start_date', 'created_at',
            'progress_percentage', 'has_delays', 'next_milestone',
        ]
        read_only_fields = ['id', 'project_no', 'start_date', 'created_at']

    def get_has_delays(self, obj):
        return obj.milestones.filter(status='delayed').exists()

    def get_next_milestone(self, obj):
        milestone = obj.milestones.filter(
            actual_date__isnull=True, status__in=['on_track', 'at_risk']
        ).order_by('planned_date').first()
        if not milestone:
            return None
        return {'key': milestone.milestone_key, 'display': milestone.milestone_display, 'planned_date': milestone.planned_date}


class CRMProjectDetailSerializer(CRMProjectListSerializer):
    """Full serializer with all nested data for project detail view."""
    stage_completions = StageCompletionSerializer(many=True, read_only=True)
    sub_stage_completions = SubStageCompletionSerializer(many=True, read_only=True)
    notes = ProjectNoteSerializer(many=True, read_only=True)
    files = ProjectFileSerializer(many=True, read_only=True)
    milestones = ProjectMilestoneSerializer(many=True, read_only=True)
    key_learnings = KeyLearningSerializer(many=True, read_only=True)
    stage_definitions = serializers.SerializerMethodField()
    delayed_count = serializers.SerializerMethodField()
    at_risk_count = serializers.SerializerMethodField()

    class Meta(CRMProjectListSerializer.Meta):
        fields = CRMProjectListSerializer.Meta.fields + [
            'stage_completions', 'sub_stage_completions',
            'notes', 'files', 'milestones', 'key_learnings',
            'stage_definitions', 'delayed_count', 'at_risk_count',
        ]

    def get_stage_definitions(self, obj):
        return STAGE_DEFINITIONS

    def get_delayed_count(self, obj):
        return obj.milestones.filter(status='delayed').count()

    def get_at_risk_count(self, obj):
        return obj.milestones.filter(status='at_risk').count()


class CRMProjectWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMProject
        fields = [
            'id', 'project_no',
            'client', 'no_of_products', 'moq', 'manufacturer',
            'project_stage', 'sales_poc', 'formulation_poc', 'sample_booked_date',
        ]
        read_only_fields = ['id', 'project_no']

    def validate_client(self, value):
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        project = CRMProject.objects.create(created_by=user, **validated_data)
        # Initialise StageCompletion rows for all 16 stages
        StageCompletion.objects.bulk_create([
            StageCompletion(project=project, stage_key=s['key'])
            for s in STAGE_DEFINITIONS
        ])
        return project
