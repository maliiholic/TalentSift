from django.db import models
from signup.models import User

class PracticeTopic(models.Model):
    """Available practice topics (e.g. Frontend, Backend, etc.)"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=10, blank=True, null=True)  # emoji or icon name
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = "Practice Topics"

    def __str__(self):
        return self.name


class PracticeSession(models.Model):
    """One practice session attempt by a candidate"""
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    TYPE_CHOICES = [
        ('mcq', 'Multiple Choice'),
        ('text', 'Text Answer'),
        ('mixed', 'Mixed'),
    ]

    candidate = models.ForeignKey(User, on_delete=models.CASCADE, related_name='practice_sessions')
    topic = models.ForeignKey(PracticeTopic, on_delete=models.SET_NULL, null=True)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    total_questions = models.IntegerField()
    score = models.FloatField(null=True, blank=True)  # Average of all question scores
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Session {self.id} - {self.candidate.email} - {self.topic.name}"


class PracticeQuestion(models.Model):
    """Individual question in a session"""
    TYPE_CHOICES = [
        ('mcq', 'Multiple Choice'),
        ('text', 'Text Answer'),
    ]

    session = models.ForeignKey(PracticeSession, on_delete=models.CASCADE, related_name='questions')
    order = models.IntegerField()  # 1, 2, 3...
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    options = models.JSONField(null=True, blank=True)  # For MCQ: ["option1", "option2", "option3", "option4"]
    correct_option = models.CharField(max_length=500, null=True, blank=True)  # For MCQ: the correct answer text
    evaluation_rubric = models.TextField(null=True, blank=True)  # For text: what a good answer covers
    rubric_embedding = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        unique_together = ('session', 'order')

    def __str__(self):
        return f"Q{self.order} - {self.session.id}"


class PracticeAttempt(models.Model):
    """Candidate's answer to a question"""
    question = models.OneToOneField(PracticeQuestion, on_delete=models.CASCADE, related_name='attempt')
    user_answer = models.TextField()
    
    # For MCQ
    is_correct = models.BooleanField(null=True, blank=True)
    
    # For Text
    ai_score = models.FloatField(null=True, blank=True)  # 0-10
    ai_feedback_good = models.TextField(null=True, blank=True)
    ai_feedback_missing = models.TextField(null=True, blank=True)
    ai_model_answer = models.TextField(null=True, blank=True)
    # Embeddings / similarity (optional)
    user_answer_embedding = models.JSONField(null=True, blank=True)
    similarity_score = models.FloatField(null=True, blank=True)
    
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attempt on Q{self.question.order} - Session {self.question.session.id}"


class PracticeSessionAnalytics(models.Model):
    """Stored analytics summary for a completed practice session."""
    session = models.OneToOneField(PracticeSession, on_delete=models.CASCADE, related_name='analytics')
    total_questions = models.IntegerField(default=0)
    attempted_questions = models.IntegerField(default=0)
    mcq_questions = models.IntegerField(default=0)
    text_questions = models.IntegerField(default=0)
    correct_mcq = models.IntegerField(default=0)
    average_ai_score = models.FloatField(null=True, blank=True)
    average_similarity = models.FloatField(null=True, blank=True)
    completion_time_seconds = models.IntegerField(null=True, blank=True)
    strengths = models.JSONField(null=True, blank=True)
    improvement_areas = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Analytics for session {self.session.id}"
