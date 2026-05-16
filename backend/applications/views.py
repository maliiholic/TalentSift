from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from getUserData.JWT import CustomJWTAuthentication
from signup.models import Candidate, Job, JobApplication, Profile, UserNotification


def _get_candidate(request_user):
    profile = Profile.objects.get(user=request_user)
    return Candidate.objects.get(profile=profile)


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def apply_job(request, job_id):
    try:
        job = Job.objects.select_related('recruiter__profile__user').get(id=job_id)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        candidate = _get_candidate(request.user)
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found for this user.'}, status=status.HTTP_404_NOT_FOUND)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    application, created = JobApplication.objects.get_or_create(
        job=job,
        candidate=candidate,
        defaults={
            'cover_letter': request.data.get('cover_letter', ''),
        }
    )

    if not created:
        return Response(
            {'message': 'You have already applied for this job', 'application_id': application.id},
            status=status.HTTP_200_OK
        )

    application.cover_letter = request.data.get('cover_letter', '')

    uploaded_resume = request.FILES.get('resume')
    if uploaded_resume:
        application.resume = uploaded_resume
    elif candidate.resume:
        candidate.resume.open('rb')
        try:
            resume_name = candidate.resume.name.split('/')[-1]
            application.resume.save(resume_name, ContentFile(candidate.resume.read()), save=False)
        finally:
            candidate.resume.close()
    else:
        return Response({'error': 'Resume not found. Please upload it in your profile first.'}, status=status.HTTP_400_BAD_REQUEST)

    application.save()

    recruiter_user = job.recruiter.profile.user
    candidate_name = f"{candidate.profile.first_name or ''} {candidate.profile.last_name or ''}".strip() or request.user.email

    UserNotification.objects.create(
        recipient=recruiter_user,
        application=application,
        title=f'New application for {job.job_name}',
        message=f'{candidate_name} applied for {job.job_name}.',
    )
    UserNotification.objects.create(
        recipient=request.user,
        application=application,
        title=f'Application submitted for {job.job_name}',
        message=f'Your application for {job.job_name} has been submitted successfully.',
    )

    resume_url = request.build_absolute_uri(application.resume.url) if application.resume else None
    return Response(
        {
            'message': 'Application submitted successfully',
            'application_id': application.id,
            'resume': resume_url,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def check_application_status(request, job_id):
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        candidate = _get_candidate(request.user)
    except Exception:
        return Response({'message': 'No'}, status=status.HTTP_200_OK)

    application = JobApplication.objects.filter(job=job, candidate=candidate).first()
    if application:
        return Response({'message': 'Yes', 'application_id': application.id}, status=status.HTTP_200_OK)
    return Response({'message': 'No'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    notifications = UserNotification.objects.select_related(
        'application__job',
        'application__candidate__profile',
        'recipient',
    ).filter(recipient=request.user).order_by('-created_at')

    unread_count = notifications.filter(is_read=False).count()
    data = []

    for notification in notifications:
        application = notification.application
        candidate = application.candidate
        profile = candidate.profile
        resume_url = request.build_absolute_uri(application.resume.url) if application.resume else None
        data.append({
            'id': notification.id,
            'title': notification.title,
            'message': notification.message,
            'is_read': notification.is_read,
            'created_at': notification.created_at,
            'job_id': application.job.id,
            'job_name': application.job.job_name,
            'application_id': application.id,
            'candidate_name': f"{profile.first_name or ''} {profile.last_name or ''}".strip() or candidate.profile.user.email,
            'candidate_email': candidate.profile.user.email,
            'resume_url': resume_url,
            'cover_letter': application.cover_letter,
            'application_status': application.status,
        })

    return Response({'unread_count': unread_count, 'notifications': data}, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        notification = UserNotification.objects.get(id=notification_id, recipient=request.user)
    except UserNotification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    notification.is_read = True
    notification.save(update_fields=['is_read', 'updated_at'])
    return Response({'message': 'Notification marked as read'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def list_applications(request, job_id):
    try:
        job = Job.objects.select_related('recruiter__profile__user').get(id=job_id)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only the recruiter who created the job can list applications
    if not hasattr(job, 'recruiter') or job.recruiter.profile.user != request.user:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    applications = JobApplication.objects.select_related('candidate__profile__user').filter(job=job).order_by('-created_at')
    data = []
    for app in applications:
        profile = app.candidate.profile
        resume_url = request.build_absolute_uri(app.resume.url) if app.resume else None
        data.append({
            'application_id': app.id,
            'candidate_id': app.candidate.profile.user.id,
            'candidate_name': f"{profile.first_name or ''} {profile.last_name or ''}".strip() or app.candidate.profile.user.email,
            'candidate_email': app.candidate.profile.user.email,
            'resume_url': resume_url,
            'cover_letter': app.cover_letter,
            'status': app.status,
            'created_at': app.created_at,
        })

    return Response({'job_id': job.id, 'job_name': job.job_name, 'applications': data}, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_application_status(request, application_id):
    try:
        application = JobApplication.objects.select_related('job__recruiter__profile__user', 'candidate__profile__user').get(id=application_id)
    except JobApplication.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only the recruiter who owns the job can update status
    if application.job.recruiter.profile.user != request.user:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    new_status = request.data.get('status')
    valid_statuses = [choice[0] for choice in JobApplication.APPLICATION_STATUS_CHOICES]
    if not new_status or new_status not in valid_statuses:
        return Response({'error': f"Invalid status. Valid: {', '.join(valid_statuses)}"}, status=status.HTTP_400_BAD_REQUEST)

    application.status = new_status
    application.save(update_fields=['status', 'updated_at'])

    # Notify candidate about status change
    candidate_user = application.candidate.profile.user
    UserNotification.objects.create(
        recipient=candidate_user,
        application=application,
        title=f'Application {new_status} for {application.job.job_name}',
        message=f'Your application for {application.job.job_name} has been marked as {new_status}.',
    )

    return Response({'message': 'Status updated', 'application_id': application.id, 'new_status': new_status}, status=status.HTTP_200_OK)
