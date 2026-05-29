import os

from django.db import models
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils.deconstruct import deconstructible


def _cloudinary_image_storage():
    try:
        from cloudinary_storage.storage import MediaCloudinaryStorage
        return MediaCloudinaryStorage()
    except Exception:
        from django.core.files.storage import FileSystemStorage
        return FileSystemStorage()


def _cloudinary_raw_storage():
    try:
        from cloudinary_storage.storage import RawMediaCloudinaryStorage
        return RawMediaCloudinaryStorage()
    except Exception:
        from django.core.files.storage import FileSystemStorage
        return FileSystemStorage()


try:
    from cloudinary_storage.storage import RawMediaCloudinaryStorage

    @deconstructible
    class AuthenticatedRawCloudinaryStorage(RawMediaCloudinaryStorage):
        def _upload(self, name, content):
            import cloudinary.uploader

            options = {
                'use_filename': True,
                'unique_filename': False,
                'type': 'authenticated',
                'resource_type': self._get_resource_type(name),
                'tags': self.TAG,
            }
            folder = os.path.dirname(name)
            if folder:
                options['folder'] = folder
            return cloudinary.uploader.upload(content, **options)

        def _get_url(self, name):
            import cloudinary

            name = self._prepend_prefix(name)
            cloudinary_resource = cloudinary.CloudinaryResource(
                name,
                type='authenticated',
                default_resource_type=self._get_resource_type(name),
            )
            return cloudinary_resource.build_url(sign_url=True)

        def delete(self, name):
            import cloudinary.uploader

            response = cloudinary.uploader.destroy(
                name,
                invalidate=True,
                resource_type=self._get_resource_type(name),
                type='authenticated',
            )
            return response['result'] == 'ok'

        def exists(self, name):
            import requests

            url = self._get_url(name)
            response = requests.head(url)
            if response.status_code == 404:
                return False
            response.raise_for_status()
            return True

        def size(self, name):
            import requests

            url = self._get_url(name)
            response = requests.head(url)
            if response.status_code == 200:
                return int(response.headers['content-length'])
            return None

        def _open(self, name, mode='rb'):
            import requests
            from django.core.files.base import ContentFile

            url = self._get_url(name)
            response = requests.get(url)
            if response.status_code == 404:
                raise IOError
            response.raise_for_status()
            file = ContentFile(response.content)
            file.name = name
            file.mode = mode
            return file

except Exception:
    from django.core.files.storage import FileSystemStorage

    class AuthenticatedRawCloudinaryStorage(FileSystemStorage):
        pass


IMAGE_STORAGE = _cloudinary_image_storage()
RAW_STORAGE = _cloudinary_raw_storage()
AUTHENTICATED_RESUME_STORAGE = AuthenticatedRawCloudinaryStorage()

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('admin', 'Admin'),
    ]
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []   

    # Adding related_name to avoid clashes
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_set',  # Custom related_name
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_permissions_set',  # Custom related_name
        blank=True
    )

    def __str__(self):
        return self.email

    def set_password(self, raw_password):
        """Hashes the password and stores it."""
        self.password = make_password(raw_password)  # Hash the password


class Profile(models.Model):
    # ForeignKey from User to Profile (One-to-One relationship)
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    first_name = models.CharField(max_length=50, blank=True, null=True)
    last_name = models.CharField(max_length=50, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    linkedin_link = models.URLField(blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    profile_picture = models.ImageField(storage=IMAGE_STORAGE, upload_to='profile_pictures/', null=True, blank=True)
    bio = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Profile of {self.first_name} {self.last_name} ({self.user.email})"


class Candidate(models.Model):
    profile = models.OneToOneField(Profile, on_delete=models.CASCADE, primary_key=True)
    score = models.FloatField(default=0)
    education = models.TextField(blank=True, null=True)
    resume = models.FileField(storage=AUTHENTICATED_RESUME_STORAGE, upload_to='resumes/', null=True, blank=True)
    skills = models.TextField(blank=True, null=True)
    github_link = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"Candidate: {self.profile.user.email}"


class Recruiter(models.Model):
    profile = models.OneToOneField(Profile, on_delete=models.CASCADE, primary_key=True)
    company_name = models.CharField(max_length=255)
    company_website = models.URLField()

    def __str__(self):
        return f"Recruiter: {self.company_name} ({self.profile.user.email})"


class Subscription(models.Model):
    SUBSCRIPTION_TYPE_CHOICES = [
        ('ai', 'AI'),
        ('practice', 'Practice'),
        ('both', 'Both'),
    ]

    # Allow users to have multiple subscriptions of different types
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    type = models.CharField(max_length=10, choices=SUBSCRIPTION_TYPE_CHOICES, null=True, blank=True)

    class Meta:
        unique_together = ('user', 'type')  # Ensure a user can only have one subscription of each type

    def __str__(self):
        return f"Subscription for {self.user.email} ({self.get_type_display()})"



class Job(models.Model):
    WORKPLACE_TYPE_CHOICES = [
    ('Remote', 'Remote'),
    ('On site', 'On site'),
    ('Hybrid', 'Hybrid'),
]

    EMPLOYMENT_TYPE_CHOICES = [
    ('Full-time', 'Full-time'),
    ('Part-time', 'Part-time'),
    ('Contract', 'Contract'),
    ('Temporary','Temporary'),
    ('Internship','Internship')
]

    # In your models.py file
    SKILLS_CHOICES = [
    ('Front-end', 'Front-end'),
    ('Back-end', 'Back-end'),
    ('Full Stack', 'Full Stack'),
    ('App Development', 'App Development'),
    ('DB Administrator', 'DB Administrator')
]



    INTERVIEW_TYPE_CHOICES = [
        ('ai', 'AI'),
        ('manual', 'Manual'),
    ]

    job_name = models.CharField(max_length=255)
    workplace_type = models.CharField(max_length=10, choices=WORKPLACE_TYPE_CHOICES)
    job_location = models.CharField(max_length=255)
    employment_type = models.CharField(max_length=10, choices=EMPLOYMENT_TYPE_CHOICES)
    description = models.TextField()
    skills = models.CharField(max_length=20, choices=SKILLS_CHOICES)  # Corrected choices field
    interview_type = models.CharField(max_length=10, choices=INTERVIEW_TYPE_CHOICES)

    recruiter = models.ForeignKey('Recruiter', on_delete=models.CASCADE, related_name='jobs')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        company_name = getattr(self.recruiter, "company_name", "Unknown Company")
        return f"{self.job_name} at {company_name}"

class Profit(models.Model):
    id = models.AutoField(primary_key=True)
    net_profit = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Profit ID: {self.id}, Net Profit: {self.net_profit}"




class Report(models.Model):
    job = models.ForeignKey('Job', on_delete=models.CASCADE, related_name='reports')
    feedback = models.TextField()  # Feedback field
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # Allow multiple reports per user

    def __str__(self):
        return f"Report for {self.job.job_name} - Feedback: {self.feedback[:30]}..."


class JobApplication(models.Model):
    APPLICATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('shortlisted', 'Shortlisted'),
        ('rejected', 'Rejected'),
    ]

    job = models.ForeignKey('Job', on_delete=models.CASCADE, related_name='applications')
    candidate = models.ForeignKey('Candidate', on_delete=models.CASCADE, related_name='applications')
    resume = models.FileField(storage=AUTHENTICATED_RESUME_STORAGE, upload_to='applications/resumes/', null=True, blank=True)
    cover_letter = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=APPLICATION_STATUS_CHOICES, default='pending')
    # Screening fields added for AI interview screening
    screening_score = models.FloatField(null=True, blank=True)  # 0-10 scale
    SCREENING_STATUS_CHOICES = [
        ('not_started', 'Not started'),
        ('in_progress', 'In progress'),
        ('passed', 'Passed'),
        ('failed', 'Failed'),
    ]
    screening_status = models.CharField(max_length=20, choices=SCREENING_STATUS_CHOICES, default='not_started')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('job', 'candidate')

    def __str__(self):
        return f"{self.candidate.profile.user.email} -> {self.job.job_name}"


class UserNotification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    application = models.ForeignKey(JobApplication, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Notification for {self.recipient.email}: {self.title}"


