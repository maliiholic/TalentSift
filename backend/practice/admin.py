from django.contrib import admin
from .models import PracticeTopic, PracticeSession, PracticeQuestion, PracticeAttempt

@admin.register(PracticeTopic)
class PracticeTopicAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(PracticeSession)
class PracticeSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'candidate', 'topic', 'difficulty', 'status', 'score', 'created_at')
    list_filter = ('status', 'difficulty', 'question_type', 'created_at')
    search_fields = ('candidate__email', 'topic__name')
    readonly_fields = ('created_at', 'completed_at')


@admin.register(PracticeQuestion)
class PracticeQuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'order', 'question_type')
    list_filter = ('question_type', 'session')
    search_fields = ('question_text',)


@admin.register(PracticeAttempt)
class PracticeAttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'question', 'is_correct', 'ai_score', 'submitted_at')
    list_filter = ('submitted_at', 'is_correct')
    readonly_fields = ('submitted_at',)
