from django.contrib import admin
from .models import (
    CRMProject, StageCompletion, SubStageCompletion,
    ProjectNote, ProjectFile, ProjectMilestone, KeyLearning,
)


@admin.register(CRMProject)
class CRMProjectAdmin(admin.ModelAdmin):
    list_display = ('project_no', 'client', 'project_stage', 'start_date', 'created_at')
    list_filter = ('project_stage',)
    search_fields = ('project_no', 'client__name', 'client__phone_no')
    readonly_fields = ('project_no', 'start_date', 'created_at', 'updated_at')


@admin.register(StageCompletion)
class StageCompletionAdmin(admin.ModelAdmin):
    list_display = ('project', 'stage_key', 'is_complete', 'completed_at')
    list_filter = ('is_complete', 'stage_key')


@admin.register(SubStageCompletion)
class SubStageCompletionAdmin(admin.ModelAdmin):
    list_display = ('project', 'stage_key', 'sub_stage_key', 'completed', 'completed_at')
    list_filter = ('stage_key', 'completed')


@admin.register(ProjectNote)
class ProjectNoteAdmin(admin.ModelAdmin):
    list_display = ('project', 'stage_key', 'added_by', 'created_at')
    list_filter = ('stage_key',)
    search_fields = ('text',)


@admin.register(ProjectMilestone)
class ProjectMilestoneAdmin(admin.ModelAdmin):
    list_display = ('project', 'milestone_key', 'planned_date', 'actual_date', 'status')
    list_filter = ('status',)


@admin.register(KeyLearning)
class KeyLearningAdmin(admin.ModelAdmin):
    list_display = ('project', 'created_by', 'created_at')
    search_fields = ('text',)
