from django.core.files.base import ContentFile
from django.http import FileResponse
from django.core.mail import EmailMultiAlternatives, send_mail
from django.db import models
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from getUserData.JWT import CustomJWTAuthentication
from signup.models import Candidate, Job, JobApplication, Profile, Recruiter, UserNotification
from django.conf import settings
from django.utils import timezone
from datetime import timedelta, timezone as dt_timezone

# Import InterviewSession model and AI helpers
from .models import InterviewSession
from practice.services.gemini import generate_questions, evaluate_text_answer
import logging
import os
from uuid import uuid4
import base64
import html

logger = logging.getLogger(__name__)
from django.utils.dateparse import parse_datetime
from .models import Interview, InterviewFeedback
from django.urls import reverse
from urllib.parse import urljoin
from email_service import send_otp_email


def _get_candidate(request_user):
    profile = Profile.objects.get(user=request_user)
    return Candidate.objects.get(profile=profile)


def _application_resume_url(request, application_id):
    return request.build_absolute_uri(reverse('serve_application_resume', args=[application_id]))


def _inline_resume_response(resume_field, filename):
    resume_field.open('rb')
    response = FileResponse(resume_field, content_type='application/pdf', as_attachment=False, filename=filename)
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def serve_application_resume(request, application_id):
    try:
        application = JobApplication.objects.select_related('candidate__profile__user', 'job__recruiter__profile__user').get(id=application_id)
    except JobApplication.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    is_candidate_owner = application.candidate.profile.user == request.user
    is_recruiter_owner = hasattr(application.job, 'recruiter') and application.job.recruiter.profile.user == request.user
    if not (is_candidate_owner or is_recruiter_owner):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    if not application.resume:
        return Response({'error': 'Resume not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        filename = os.path.basename(application.resume.name) or f'application-{application_id}.pdf'
        return _inline_resume_response(application.resume, filename)
    except Exception as exc:
        logger.exception('Failed to serve application resume for application id=%s: %s', application_id, exc)
        return Response({'error': 'Failed to open resume.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _build_calendar_invite(*, subject, description, location, start_dt, end_dt, organizer_email, organizer_name, recipient_name, recipient_email):
    def _format_ics_dt(value):
        if timezone.is_naive(value):
            value = timezone.make_aware(value, timezone.get_current_timezone())
        return value.astimezone(dt_timezone.utc).strftime('%Y%m%dT%H%M%SZ')

    uid = f"{uuid4()}@talentsift"
    dtstamp = timezone.now().astimezone(dt_timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    dtstart = _format_ics_dt(start_dt)
    dtend = _format_ics_dt(end_dt)
    safe_location = (location or '').replace('\n', ' ').strip() or 'TalentSift Interview'
    safe_description = (description or '').replace('\n', '\\n').strip()

    ics_content = (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//TalentSift//Interview Scheduler//EN\r\n"
        "CALSCALE:GREGORIAN\r\n"
        "METHOD:REQUEST\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{uid}\r\n"
        f"DTSTAMP:{dtstamp}\r\n"
        f"DTSTART:{dtstart}\r\n"
        f"DTEND:{dtend}\r\n"
        f"SUMMARY:{subject}\r\n"
        f"LOCATION:{safe_location}\r\n"
        f"DESCRIPTION:{safe_description}\r\n"
        f"ORGANIZER;CN={organizer_name}:MAILTO:{organizer_email}\r\n"
        f"ATTENDEE;CN={recipient_name};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:MAILTO:{recipient_email}\r\n"
        "STATUS:CONFIRMED\r\n"
        "TRANSP:OPAQUE\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )

    return ics_content


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
        application.resume = candidate.resume
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
        message=f'You successfully applied for {job.job_name}. Click below to take your AI screening interview.',
    )

    resume_url = _application_resume_url(request, application.id) if application.resume else None
    return Response(
        {
            'message': 'Application submitted successfully',
            'application_id': application.id,
            'resume': resume_url,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def start_interview(request, application_id):
    try:
        application = JobApplication.objects.select_related('job').get(id=application_id)
    except JobApplication.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only the candidate who applied can start
    if application.candidate.profile.user != request.user:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    existing_session = InterviewSession.objects.filter(job_application=application).order_by('-started_at').first()

    # If screening has already been finished, never start a new one.
    if application.screening_status in ('passed', 'failed') or (existing_session and existing_session.status in ('passed', 'failed')):
        return Response({
            'message': 'Interview already completed',
            'screening_status': application.screening_status or (existing_session.status if existing_session else None),
            'screening_score': application.screening_score if application.screening_score is not None else (existing_session.final_score if existing_session else None),
            'session_id': existing_session.id if existing_session else None,
            'final_score': existing_session.final_score if existing_session else application.screening_score,
            'passed': (application.screening_status == 'passed') or (existing_session and existing_session.status == 'passed'),
        }, status=status.HTTP_200_OK)

    # Prevent restarting after a completed interview
    if existing_session:
        if existing_session.status == 'in_progress':
            # Normalize timer in case an older session was created with a longer window.
            # Recompute using the current policy so old sessions do not keep the old 1-hour limit.
            job = application.job
            emp = (job.employment_type or '').lower()
            if 'intern' in emp:
                total_questions = 6
            elif 'part' in emp:
                total_questions = 8
            else:
                total_questions = 10
            current_time_limit_seconds = int((total_questions * getattr(settings, 'INTERVIEW_MINUTES_PER_QUESTION', 2.0) * 60) + (getattr(settings, 'INTERVIEW_BUFFER_MINUTES', 5) * 60))
            if existing_session.time_limit_seconds != current_time_limit_seconds:
                existing_session.time_limit_seconds = current_time_limit_seconds
                existing_session.save(update_fields=['time_limit_seconds'])

            questions = existing_session.questions or []
            safe_questions = []
            for idx, q in enumerate(questions, 1):
                q_copy = {k: v for k, v in q.items() if k != 'correct'}
                q_copy['order'] = idx
                safe_questions.append(q_copy)
            return Response({
                'message': 'Interview already in progress',
                'session_id': existing_session.id,
                'questions': safe_questions,
                'time_limit_seconds': current_time_limit_seconds,
                'screening_status': application.screening_status,
                'screening_score': application.screening_score,
            }, status=status.HTTP_200_OK)

        # Completed interview: do not allow retake
        return Response({
            'message': 'Interview already completed',
            'screening_status': application.screening_status,
            'screening_score': application.screening_score,
            'session_id': existing_session.id,
            'final_score': existing_session.final_score,
            'passed': existing_session.status == 'passed',
        }, status=status.HTTP_200_OK)

    # derive topic and difficulty from job
    job = application.job
    topic = job.skills or job.job_name
    # map employment_type to difficulty
    emp = (job.employment_type or '').lower()
    if 'intern' in emp:
        difficulty = 'beginner'
        total_questions = 6
    elif 'part' in emp:
        difficulty = 'intermediate'
        total_questions = 8
    elif 'full' in emp:
        difficulty = 'intermediate'
        total_questions = 10
    else:
        difficulty = 'intermediate'
        total_questions = 10

    # Simple time policy: 2 minutes/question + buffer (overall window)
    time_limit_seconds = int((total_questions * getattr(settings, 'INTERVIEW_MINUTES_PER_QUESTION', 2.0) * 60) + (getattr(settings, 'INTERVIEW_BUFFER_MINUTES', 5) * 60))

    try:
        generated = generate_questions(topic, difficulty, 'mixed', total_questions)
    except Exception as e:
        return Response({'error': 'Question generation failed', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # store session with questions (keep correct answers in DB but don't return them)
    session = InterviewSession.objects.create(
        job_application=application,
        candidate=request.user,
        status='in_progress',
        questions=generated,
        attempts=[],
        time_limit_seconds=time_limit_seconds,
    )

    application.screening_status = 'in_progress'
    application.save(update_fields=['screening_status'])

    # prepare response questions without correct answers
    safe_questions = []
    for idx, q in enumerate(generated, 1):
        q_copy = {k: v for k, v in q.items() if k != 'correct'}
        q_copy['order'] = idx
        safe_questions.append(q_copy)

    return Response({'session_id': session.id, 'questions': safe_questions, 'time_limit_seconds': time_limit_seconds}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def submit_interview_answer(request):
    data = request.data
    session_id = data.get('session_id')
    raw_order = data.get('order', 0)
    try:
        order = int(raw_order)
    except Exception:
        order = 0
    user_answer = data.get('user_answer', '')

    try:
        session = InterviewSession.objects.get(id=session_id)
    except InterviewSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    if session.candidate != request.user:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    # If session already completed, return finished payload so frontend can show result
    if session.status != 'in_progress':
        logger.info(f"Submit called on non-in_progress session {session.id} status={session.status}")
        return Response({'finished': True, 'final_score': session.final_score, 'passed': session.status == 'passed', 'status': session.status}, status=status.HTTP_200_OK)

    # Enforce session time window; if expired, mark failed and return finished payload
    if session.time_limit_seconds:
        deadline = session.started_at + timedelta(seconds=session.time_limit_seconds)
        if timezone.now() > deadline:
            logger.info(f"Session {session.id} expired on submit; auto-failing")
            session.final_score = 0
            session.completed_at = timezone.now()
            session.status = 'failed'
            session.save(update_fields=['final_score', 'completed_at', 'status'])
            app = session.job_application
            app.screening_score = 0
            app.screening_status = 'failed'
            app.save(update_fields=['screening_score', 'screening_status'])

            UserNotification.objects.create(
                recipient=session.candidate,
                application=app,
                title=f'AI Interview Result for {app.job.job_name}',
                message=f'Your AI screening result: 0.0%. Not passed.'
            )

            return Response({'finished': True, 'final_score': 0, 'passed': False, 'message': 'Interview time has expired. Session marked failed.'}, status=status.HTTP_200_OK)

    questions = session.questions or []
    attempts = session.attempts or []

    # If the client omitted order (for example after resuming a session), advance to the next unanswered question.
    if order < 1 or order > len(questions):
        answered_orders = {a.get('order') for a in attempts if isinstance(a, dict)}
        for idx in range(1, len(questions) + 1):
            if idx not in answered_orders:
                order = idx
                break

    if order < 1 or order > len(questions):
        logger.info(f"Invalid question order in submit payload: {raw_order}; attempts={len(attempts)} questions={len(questions)}")
        return Response({'error': 'Invalid question order'}, status=status.HTTP_400_BAD_REQUEST)

    q = questions[order-1]
    q_type = q.get('type', 'text')
    score = 0
    feedback = None

    if q_type == 'mcq':
        correct = q.get('correct')
        is_correct = (user_answer == correct)
        score = 10 if is_correct else 0
        feedback = 'Correct' if is_correct else f'Incorrect. Correct: {correct}'
    else:
        # text evaluation
        try:
            eval_res = evaluate_text_answer(q.get('text') or q.get('question') or '', q.get('rubric') or '', user_answer)
            score = eval_res.get('score', 0)
            feedback = eval_res.get('feedback_good') or eval_res.get('feedback_missing')
        except Exception:
            score = 7
            feedback = 'Evaluation unavailable, scored conservatively.'

    # replace existing attempt for same order
    found = False
    for a in attempts:
        if a.get('order') == order:
            a.update({'user_answer': user_answer, 'score': score, 'feedback': feedback, 'submitted_at': timezone.now().isoformat()})
            found = True
            break
    if not found:
        attempts.append({'order': order, 'user_answer': user_answer, 'score': score, 'feedback': feedback, 'submitted_at': timezone.now().isoformat()})

    session.attempts = attempts
    session.save(update_fields=['attempts'])

    total_questions = len(questions)
    # If this was the last question, finalize the interview automatically
    if order >= total_questions:
        logger.info(f"Auto-completing session {session.id} after last question {order}/{total_questions}")
        # compute final score
        attempt_map = {a['order']: a for a in attempts}
        ssum = 0.0
        for i in range(1, total_questions+1):
            a = attempt_map.get(i)
            ssum += float(a.get('score', 0)) if a else 0.0
        avg = ssum / total_questions if total_questions else 0.0

        session.final_score = avg
        session.completed_at = timezone.now()
        passed = avg >= getattr(settings, 'INTERVIEW_PASS_SCORE', 8.0)
        session.status = 'passed' if passed else 'failed'
        session.save(update_fields=['final_score', 'completed_at', 'status'])

        # update JobApplication
        app = session.job_application
        app.screening_score = avg
        app.screening_status = 'passed' if passed else 'failed'
        app.save(update_fields=['screening_score', 'screening_status'])

        # notify candidate
        UserNotification.objects.create(
            recipient=session.candidate,
            application=app,
            title=f'AI Interview Result for {app.job.job_name}',
            message=f'Your AI screening result: {round(avg*10,1)}%. {"Passed" if passed else "Not passed"}.'
        )

        # notify recruiter only when passed
        if passed:
            recruiter_user = app.job.recruiter.profile.user
            UserNotification.objects.create(
                recipient=recruiter_user,
                application=app,
                title=f'Candidate passed AI screening for {app.job.job_name}',
                message=f'{app.candidate.profile.first_name or app.candidate.profile.user.email} passed AI screening with {round(avg*10,1)}%.'
            )

        return Response({'status': 'success', 'order': order, 'score': score, 'feedback': feedback, 'finished': True, 'final_score': avg, 'passed': passed}, status=status.HTTP_200_OK)

    # not finished yet, return next order info
    return Response({'status': 'success', 'order': order, 'score': score, 'feedback': feedback, 'finished': False, 'next_order': order + 1}, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def complete_interview(request, session_id):
    try:
        session = InterviewSession.objects.get(id=session_id)
    except InterviewSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    if session.candidate != request.user:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    # If already completed, return current final status (idempotent)
    if session.status != 'in_progress':
        logger.info(f"Complete called on non-in_progress session {session.id} status={session.status}")
        return Response({'final_score': session.final_score, 'passed': session.status == 'passed', 'message': 'Interview already completed', 'status': session.status}, status=status.HTTP_200_OK)

    # Enforce time window; timeout means failed screening
    if session.time_limit_seconds:
        deadline = session.started_at + timedelta(seconds=session.time_limit_seconds)
        if timezone.now() > deadline:
            session.final_score = 0
            session.completed_at = timezone.now()
            session.status = 'failed'
            session.save(update_fields=['final_score', 'completed_at', 'status'])
            app = session.job_application
            app.screening_score = 0
            app.screening_status = 'failed'
            app.save(update_fields=['screening_score', 'screening_status'])
            return Response({'final_score': 0, 'passed': False, 'message': 'Interview timed out.'}, status=status.HTTP_200_OK)

    questions = session.questions or []
    attempts = session.attempts or []
    # map attempts by order
    attempt_map = {a['order']: a for a in attempts}
    total = len(questions)
    if total == 0:
        return Response({'error': 'No questions in session'}, status=status.HTTP_400_BAD_REQUEST)

    ssum = 0.0
    for i in range(1, total+1):
        a = attempt_map.get(i)
        ssum += float(a.get('score', 0)) if a else 0.0

    avg = ssum / total

    session.final_score = avg
    session.completed_at = timezone.now()
    passed = avg >= getattr(settings, 'INTERVIEW_PASS_SCORE', 8.0)
    session.status = 'passed' if passed else 'failed'
    session.save(update_fields=['final_score', 'completed_at', 'status'])

    # update JobApplication
    app = session.job_application
    app.screening_score = avg
    app.screening_status = 'passed' if passed else 'failed'
    app.save(update_fields=['screening_score', 'screening_status'])

    # notify candidate
    UserNotification.objects.create(
        recipient=session.candidate,
        application=app,
        title=f'AI Interview Result for {app.job.job_name}',
        message=f'Your AI screening result: {round(avg*10,1)}%. {"Passed" if passed else "Not passed"}.'
    )

    # notify recruiter only when passed
    if passed:
        recruiter_user = app.job.recruiter.profile.user
        UserNotification.objects.create(
            recipient=recruiter_user,
            application=app,
            title=f'Candidate passed AI screening for {app.job.job_name}',
            message=f'{app.candidate.profile.first_name or app.candidate.profile.user.email} passed AI screening with {round(avg*10,1)}%.'
        )

    return Response({'final_score': avg, 'passed': passed}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def interview_status(request, application_id):
    try:
        application = JobApplication.objects.select_related('job', 'candidate__profile__user').get(id=application_id)
    except JobApplication.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    if application.candidate.profile.user != request.user:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    session = InterviewSession.objects.filter(job_application=application).order_by('-started_at').first()
    if not session:
        return Response({
            'status': 'not_started',
            'screening_status': application.screening_status,
            'screening_score': application.screening_score,
        }, status=status.HTTP_200_OK)

    return Response({
        'status': session.status,
        'final_score': session.final_score,
        'screening_status': application.screening_status or session.status,
        'screening_score': application.screening_score if application.screening_score is not None else session.final_score,
        'time_limit_seconds': session.time_limit_seconds,
        'questions': [{k: v for k, v in q.items() if k != 'correct'} for q in (session.questions or [])] if session.status == 'in_progress' else [],
        'session_id': session.id,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def log_interview_event(request):
    """Lightweight endpoint to record client-side interview events (visibilitychange, focus loss, copy attempts).
    For now we log events to server logs for audit and future persistence.
    """
    data = request.data or {}
    session_id = data.get('session_id')
    event = data.get('event')
    details = data.get('details') or {}

    if not session_id or not event:
        return Response({'error': 'session_id and event required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        session = InterviewSession.objects.get(id=session_id)
    except InterviewSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    if session.candidate != request.user:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    # Log event for now; persistent storage can be added later.
    logger.info(f"InterviewEvent session={session.id} user={request.user.email} event={event} details={details}")

    return Response({'message': 'Event recorded'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def schedule_interview(request, application_id):
    """Schedule an HR interview for a given application. Only job owner or staff can schedule."""
    try:
        application = JobApplication.objects.select_related('job__recruiter__profile__user').get(id=application_id)
    except JobApplication.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only recruiter who owns the job or staff can schedule
    if not (hasattr(application.job, 'recruiter') and application.job.recruiter.profile.user == request.user) and not request.user.is_staff:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    start_raw = request.data.get('start')
    interview_type = request.data.get('interview_type', 'virtual')
    location = request.data.get('location', '')
    notes = request.data.get('notes', '')

    if not start_raw:
        return Response({'error': 'Start datetime required (ISO format).'}, status=status.HTTP_400_BAD_REQUEST)

    start_dt = parse_datetime(start_raw)
    if not start_dt:
        return Response({'error': 'Invalid datetime format. Use ISO format.'}, status=status.HTTP_400_BAD_REQUEST)

    # Default interview length: 60 minutes. Keep the form simple by deriving end server-side.
    end_dt = start_dt + timedelta(minutes=60)

    interview = Interview.objects.create(
        job_application=application,
        scheduled_by=request.user,
        start=start_dt,
        end=end_dt,
        interview_type=interview_type,
        location=location,
        notes=notes,
        status='scheduled',
    )

    start_display_dt = timezone.localtime(start_dt) if timezone.is_aware(start_dt) else start_dt
    start_display = start_display_dt.strftime('%A, %B %d, %Y at %I:%M %p %Z')
    end_display_dt = timezone.localtime(end_dt) if timezone.is_aware(end_dt) else end_dt
    end_display = end_display_dt.strftime('%I:%M %p %Z')
    candidate_email = application.candidate.profile.user.email
    candidate_name = application.candidate.profile.first_name or application.candidate.profile.user.get_full_name() or 'there'
    company_name = application.job.recruiter.profile.user.get_full_name() or 'TalentSift'
    interview_type_label = (interview_type or 'virtual').strip().title()
    location_text = location.strip() or 'The interview location/link will be shared in your account.'
    subject = f'Interview scheduled for {application.job.job_name}'
    message = (
        f'Hello {candidate_name},\n\n'
        f'Your interview for {application.job.job_name} has been scheduled.\n\n'
        f'Job: {application.job.job_name}\n'
        f'Company: {company_name}\n'
        f'When: {start_display} to {end_display}\n'
        f'Type: {interview_type_label}\n'
        f'Location: {location_text}\n\n'
        f'Please log in to TalentSift to view the latest details.\n\n'
        f'Best regards,\n'
        f'TalentSift Team'
    )

    UserNotification.objects.create(
        recipient=application.candidate.profile.user,
        application=application,
        title=f'Interview scheduled for {application.job.job_name}',
        message=f'Your interview for {application.job.job_name} has been scheduled on {start_display}.',
    )
    try:
        send_otp_email(subject, message, candidate_email)
    except Exception:
        logger.exception('Failed to send interview email for application id=%s', application.id)
    logger.info(
        'Interview scheduled for application id=%s by user id=%s at %s',
        application.id,
        request.user.id,
        start_display,
    )

    return Response({'message': 'Interview scheduled', 'interview_id': interview.id}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def list_interviews_for_job(request, job_id):
    try:
        job = Job.objects.select_related('recruiter__profile__user').get(id=job_id)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

    if not (hasattr(job, 'recruiter') and job.recruiter.profile.user == request.user) and not request.user.is_staff:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    interviews = Interview.objects.filter(job_application__job=job).select_related('job_application__candidate__profile__user').order_by('-start')
    data = []
    for it in interviews:
        cand = it.job_application.candidate.profile
        data.append({
            'interview_id': it.id,
            'application_id': it.job_application.id,
            'candidate_name': f"{cand.first_name or ''} {cand.last_name or ''}".strip(),
            'start': it.start,
            'end': it.end,
            'type': it.interview_type,
            'location': it.location,
            'status': it.status,
            'notes': it.notes,
        })
    return Response({'job_id': job.id, 'interviews': data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def list_interviews_for_candidate(request):
    # candidate view of their scheduled interviews
    interviews = Interview.objects.filter(job_application__candidate__profile__user=request.user).select_related('job_application__job').order_by('-start')
    data = []
    for it in interviews:
        data.append({
            'interview_id': it.id,
            'application_id': it.job_application.id,
            'job_name': it.job_application.job.job_name,
            'start': it.start,
            'end': it.end,
            'type': it.interview_type,
            'location': it.location,
            'status': it.status,
            'notes': it.notes,
        })
    return Response({'interviews': data}, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_interview(request, interview_id):
    try:
        it = Interview.objects.select_related('job_application__job__recruiter__profile__user').get(id=interview_id)
    except Interview.DoesNotExist:
        return Response({'error': 'Interview not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only scheduler or staff can modify
    if it.scheduled_by != request.user and not request.user.is_staff:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    start_raw = request.data.get('start')
    end_raw = request.data.get('end')
    status_raw = request.data.get('status')
    notes = request.data.get('notes')

    if start_raw:
        start_dt = parse_datetime(start_raw)
        if start_dt:
            it.start = start_dt
    if end_raw:
        end_dt = parse_datetime(end_raw)
        if end_dt:
            it.end = end_dt
    if status_raw:
        it.status = status_raw
    if notes is not None:
        it.notes = notes

    it.save()

    # notify candidate about update
    try:
        candidate_email = it.job_application.candidate.profile.user.email
        subject = f"Interview updated for {it.job_application.job.job_name}"
        message = f"Your interview has been updated: {it.start.isoformat()} to {it.end.isoformat()} - {it.location or it.interview_type}.\nPlease check your dashboard."
        send_mail(subject, message, getattr(settings, 'EMAIL_HOST_USER', None), [candidate_email], fail_silently=True)
    except Exception:
        logger.exception("Failed to send interview update email")

    return Response({'message': 'Interview updated', 'interview_id': it.id}, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def add_interview_feedback(request, interview_id):
    try:
        it = Interview.objects.get(id=interview_id)
    except Interview.DoesNotExist:
        return Response({'error': 'Interview not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only staff or recruiter can add feedback
    if not request.user.is_staff and it.job_application.job.recruiter.profile.user != request.user:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    rating = request.data.get('rating')
    notes = request.data.get('notes', '')

    fb = InterviewFeedback.objects.create(interview=it, reviewer=request.user, rating=rating, notes=notes)

    # mark interview as completed when feedback submitted
    it.status = 'completed'
    it.save(update_fields=['status'])

    return Response({'message': 'Feedback added', 'feedback_id': fb.id}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def screened_applications(request, job_id):
    try:
        job = Job.objects.select_related('recruiter__profile__user').get(id=job_id)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only the recruiter who created the job can list screened applications
    if not hasattr(job, 'recruiter') or job.recruiter.profile.user != request.user:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    apps = JobApplication.objects.select_related('candidate__profile__user').prefetch_related('interviews').filter(job=job, screening_status='passed').order_by('-screening_score')
    data = []
    for app in apps:
        profile = app.candidate.profile
        resume_url = _application_resume_url(request, app.id) if app.resume else None
        latest_interview = app.interviews.select_related('scheduled_by').order_by('-start').first()
        scheduled_by_name = latest_interview.scheduled_by.email if latest_interview and latest_interview.scheduled_by else None
        data.append({
            'application_id': app.id,
            'candidate_name': f"{profile.first_name or ''} {profile.last_name or ''}".strip() or app.candidate.profile.user.email,
            'candidate_email': app.candidate.profile.user.email,
            'resume_url': resume_url,
            'cover_letter': app.cover_letter,
            'status': app.status,
            'screening_score': app.screening_score,
            'screening_status': app.screening_status,
            'applied_at': app.created_at,
            'interview_id': latest_interview.id if latest_interview else None,
            'interview_status': latest_interview.status if latest_interview else None,
            'interview_type': latest_interview.interview_type if latest_interview else None,
            'interview_start': latest_interview.start if latest_interview else None,
            'interview_end': latest_interview.end if latest_interview else None,
            'interview_location': latest_interview.location if latest_interview else None,
            'scheduled_by_name': scheduled_by_name,
        })

    return Response({'job_id': job.id, 'job_name': job.job_name, 'screened_applications': data}, status=status.HTTP_200_OK)


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
    mode = (request.query_params.get('mode') or '').strip().lower()
    notifications = UserNotification.objects.select_related(
        'application__job',
        'application__job__recruiter__profile__user',
        'application__candidate__profile',
        'application__candidate__profile__user',
        'recipient',
    ).filter(recipient=request.user).order_by('-created_at')

    has_recruiter_profile = Recruiter.objects.filter(profile__user=request.user).exists()
    has_candidate_profile = Candidate.objects.filter(profile__user=request.user).exists()

    # Mode-aware visibility keeps recruiter and candidate inboxes separate even for older records.
    if mode == 'recruiter' or (not mode and has_recruiter_profile and not has_candidate_profile):
        notifications = notifications.filter(application__job__recruiter__profile__user=request.user)
    elif mode == 'candidate' or (not mode and has_candidate_profile and not has_recruiter_profile):
        notifications = notifications.filter(application__candidate__profile__user=request.user)
        # Old self-application notices should stay hidden from the candidate inbox.
        notifications = notifications.exclude(title__icontains='application submitted')
        notifications = notifications.exclude(message__icontains='submitted successfully')
    else:
        # If the account has both profiles or the mode is unknown, only keep records that
        # match the logged-in user's actual ownership on the underlying application.
        notifications = notifications.filter(
            models.Q(application__job__recruiter__profile__user=request.user) |
            models.Q(application__candidate__profile__user=request.user)
        )

    unread_count = notifications.filter(is_read=False).count()
    data = []

    for notification in notifications:
        application = notification.application
        candidate = application.candidate
        profile = candidate.profile
        resume_url = _application_resume_url(request, application.id) if application.resume else None
        # build an action URL so frontend can navigate directly
        frontend_base = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3000')
        recruiter_owner = hasattr(application.job, 'recruiter') and application.job.recruiter.profile.user == request.user
        # Recruiters go to the applications list; candidates only get a shortcut when the notification is interview-related.
        if notification.recipient == application.candidate.profile.user:
            notification_text = f'{notification.title} {notification.message}'.lower()
            if any(keyword in notification_text for keyword in ('application submitted', 'ai screening', 'interview')):
                action_url = urljoin(frontend_base + '/', f'Users/Applications/{application.id}/interview')
            else:
                action_url = None
        elif recruiter_owner:
            action_url = urljoin(frontend_base + '/', f'Users/Posts/applications/{application.job.id}')
        else:
            # Defensive fallback for malformed data; do not expose cross-job navigation.
            action_url = None

        data.append({
            'id': notification.id,
            'title': notification.title,
            'message': notification.message,
            'is_read': notification.is_read,
            'created_at': notification.created_at,
            'job_id': application.job.id if recruiter_owner or notification.recipient == application.candidate.profile.user else None,
            'job_name': application.job.job_name,
            'application_id': application.id,
            'candidate_name': f"{profile.first_name or ''} {profile.last_name or ''}".strip() or candidate.profile.user.email,
            'candidate_email': candidate.profile.user.email,
            'resume_url': resume_url,
            'cover_letter': application.cover_letter,
            'application_status': application.status,
            'application_screening_status': application.screening_status,
            'application_screening_score': application.screening_score,
            'action_url': action_url,
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


@api_view(['POST', 'GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    # mark all notifications for the requesting user as read
    updated = UserNotification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'All notifications marked as read', 'updated': updated}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    try:
        notification = UserNotification.objects.get(id=notification_id, recipient=request.user)
    except UserNotification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    notification.delete()
    return Response({'message': 'Notification deleted'}, status=status.HTTP_200_OK)


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

    applications = JobApplication.objects.select_related('candidate__profile__user').prefetch_related('interviews').filter(job=job).order_by('-created_at')
    data = []
    for app in applications:
        try:
            profile = app.candidate.profile
            candidate_user = profile.user
            resume_url = _application_resume_url(request, app.id) if app.resume else None
            latest_interview = app.interviews.select_related('scheduled_by').order_by('-start').first()
            scheduled_by_name = latest_interview.scheduled_by.email if latest_interview and latest_interview.scheduled_by else None
            data.append({
                'application_id': app.id,
                'candidate_id': candidate_user.id,
                'candidate_name': f"{profile.first_name or ''} {profile.last_name or ''}".strip() or candidate_user.email,
                'candidate_email': candidate_user.email,
                'resume_url': resume_url,
                'cover_letter': app.cover_letter,
                'status': app.status,
                'screening_status': app.screening_status,
                'screening_score': app.screening_score,
                'interview_status': latest_interview.status if latest_interview else None,
                'interview_id': latest_interview.id if latest_interview else None,
                'interview_type': latest_interview.interview_type if latest_interview else None,
                'interview_start': latest_interview.start if latest_interview else None,
                'interview_end': latest_interview.end if latest_interview else None,
                'interview_location': latest_interview.location if latest_interview else None,
                'scheduled_by_name': scheduled_by_name,
                'created_at': app.created_at,
            })
        except Exception as e:
            logger.exception(f"Skipping malformed application {app.id}: {e}")
            continue

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
