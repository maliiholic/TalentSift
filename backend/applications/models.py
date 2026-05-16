from django.db import models
from django.conf import settings
from signup.models import JobApplication


class InterviewSession(models.Model):
    """An AI screening session associated with a JobApplication."""
    job_application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, related_name='interview_sessions')
    candidate = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[('in_progress', 'In Progress'), ('passed', 'Passed'), ('failed', 'Failed')], default='in_progress')
    final_score = models.FloatField(null=True, blank=True)  # 0-10 scale
    questions = models.JSONField(null=True, blank=True)  # list of question dicts (text, type, options, correct, rubric)
    attempts = models.JSONField(null=True, blank=True)   # list of attempt dicts (order, answer, score, feedback)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_limit_seconds = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"InterviewSession {self.id} - App {self.job_application.id} - {self.candidate.email}"


class Interview(models.Model):
    """Represents a scheduled HR interview for a JobApplication."""
    TYPES = [('onsite', 'Onsite'), ('virtual', 'Virtual'), ('phone', 'Phone')]
    STATUS = [('scheduled', 'Scheduled'), ('rescheduled', 'Rescheduled'), ('cancelled', 'Cancelled'), ('completed', 'Completed')]

    job_application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, related_name='interviews')
    scheduled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='scheduled_interviews')
    start = models.DateTimeField()
    end = models.DateTimeField()
    interview_type = models.CharField(max_length=20, choices=TYPES, default='virtual')
    location = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS, default='scheduled')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Interview {self.id} for App {self.job_application.id} at {self.start.isoformat()}"


class InterviewFeedback(models.Model):
    interview = models.ForeignKey(Interview, on_delete=models.CASCADE, related_name='feedbacks')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    rating = models.IntegerField(null=True, blank=True)  # 1-5
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback {self.id} for Interview {self.interview.id}"
