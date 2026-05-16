from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('signup', '0004_jobapplication_screening_score_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='InterviewSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('in_progress', 'In Progress'), ('passed', 'Passed'), ('failed', 'Failed')], default='in_progress', max_length=20)),
                ('final_score', models.FloatField(blank=True, null=True)),
                ('questions', models.JSONField(blank=True, null=True)),
                ('attempts', models.JSONField(blank=True, null=True)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('time_limit_seconds', models.IntegerField(blank=True, null=True)),
                ('candidate', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('job_application', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interview_sessions', to='signup.jobapplication')),
            ],
            options={
                'ordering': ['-started_at'],
            },
        ),
    ]
