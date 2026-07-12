"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from getUserData.views import get_user_data, get_user_role, admin_dashboard, all_users, delete_user, subscribers, delete_subscription
from signin.views import decode_jwt, reset_password, send_otp_signin, sign_in, verify_otp_signin
from signup.views import send_otp, signup, verify_otp
from profil.views import update_profile,get_profile
from profil.views import serve_profile_resume
from signout.views import logout_view
from JobList.views import get_jobs_for_recruiter,get_all_jobs
from createjob.views import get_recruiter_company,create_job
from Up_del_ret_job.views import get_job_by_id,update_job,delete_job,get_job_id
from AI_job_title.views import enhance_job_title, generate_job_description
from Check_Ai_subs.views import has_ai_subscription,has_prac_subscription
from report.views import create_report, check_report_status, load_reported_jobs, delete_job_and_reports, delete_report
from checkout.views import create_checkout_session,verify_payment,create_checkout_session_prac,verify_payment_prac
from applications.views import (
    apply_job,
    check_application_status,
    get_notifications,
    mark_notification_read,
    mark_all_notifications_read,
    delete_notification,
    list_applications,
    update_application_status,
    start_interview,
    log_interview_event,
    submit_interview_answer,
    complete_interview,
    interview_status,
    screened_applications,
    serve_application_resume,
)
from applications.views import (
    schedule_interview,
    list_interviews_for_job,
    list_interviews_for_candidate,
    update_interview,
    add_interview_feedback,
)
from chatbot.views import chat_message, chat_clear
from django.http import JsonResponse
from django.db import connection

def health_check(request):
    try:
        # Ping the database to keep Supabase awake
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "ok", "message": "Render and Supabase are awake!"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

urlpatterns = [
    path('health_check/', health_check, name='health_check'),
    path('admin/', admin.site.urls),
    path('signup/', signup, name='signup'),
    path('send_otp/', send_otp, name='send_otp'),
    path('verify_otp/', verify_otp, name='verify_otp'),
    path('login/', sign_in, name='login'),
    path('send-otp_signin/', send_otp_signin, name='send-otp'),
    path('verify_otp_signin/', verify_otp_signin, name='verify-otp'),
    path('reset_password/', reset_password, name='reset-password'),
    path('decode-jwt/', decode_jwt, name='decode_jwt'),
    path('profile/', get_profile, name='get_profile'),
    path('profile/resume/', serve_profile_resume, name='serve_profile_resume'),
    path('update_profile/', update_profile, name='update_profile'),
    path('get_picture/', get_user_data, name='get_user_data'),
    path('get_user_role/', get_user_role, name='get_role'),
    path('dashboard/', admin_dashboard, name='admin_dashboard'),
    path('logout/', logout_view, name='logout'),
    path('get-jobs/', get_jobs_for_recruiter, name='get-jobs'),
    path('get-all-jobs/', get_all_jobs, name='get-all-jobs'),
    path('create-job/', create_job, name='create-job'),
    path('get-recruiter-company/', get_recruiter_company, name='get-recruiter-company'),
    path('get_job/<int:job_id>/', get_job_by_id, name='get_job_by_id'),
    path('updatejob/<int:job_id>/', update_job, name='update_job'),
    path('deletejob/<int:job_id>/', delete_job, name='delete_job'),
    path('get_all_job', get_all_jobs, name='get_all_job'),
    path('all_jobs/', get_all_jobs, name='all_jobs'),
    path('getjobs/',get_jobs_for_recruiter, name='getjobs'),
    path('get_recruiter_company/',get_recruiter_company, name='get_recruiter_company'),
    path('createjob/',create_job, name='create_job'),
    # path('all_jobs/', load_jobs, name='load_jobs'),
    path('job/<int:job_id>/', delete_job, name='delete_job'),
    path('get_jobs/<int:job_id>/', get_job_id, name='get_jobs'),
    path('all_users/', all_users, name='all_users'),
    path('users/<int:user_id>/', delete_user, name='delete_user'),
    path('subscribers/', subscribers, name='subscribers'),
    path('delete_subscription/<int:sub_id>/', delete_subscription, name='delete_subscription'),
    path('generate-job-title/',enhance_job_title, name='generate-job-title'),
    path('generate-job-description/', generate_job_description, name='generate-job-description'),
    path('has-ai-subscription/', has_ai_subscription, name='has_ai_subscription'),
    path('has-prac-subscription/', has_prac_subscription, name='has_prac_subscription'),
    path('create_checkout_session/', create_checkout_session, name='create_checkout_session'),
    path('verify_payment/', verify_payment, name='verify_payment'),
    path('create_checkout_session_prac/', create_checkout_session_prac, name='create_checkout_session_prac'),
    path('verify_payment_prac/', verify_payment_prac, name='verify_payment_prac'),
    path('report/', create_report, name='create_report'),   
    path('load_reports/', load_reported_jobs, name='load_reports'),
    path('delete_job_report/<int:job_id>/', delete_job_and_reports, name='delete_job_and_reports'),
    path('delete_report/<int:report_id>/', delete_report, name='delete_report'),
    path('check_report_status/<int:job_id>/', check_report_status, name='check_report_status'),
    path('apply-job/<int:job_id>/', apply_job, name='apply_job'),
    path('check_application_status/<int:job_id>/', check_application_status, name='check_application_status'),
    path('notifications/', get_notifications, name='notifications'),
    path('notifications/<int:notification_id>/read/', mark_notification_read, name='mark_notification_read'),
    path('notifications/mark-all-read/', mark_all_notifications_read, name='mark_all_notifications_read'),
    path('notifications/mark-all-read', mark_all_notifications_read, name='mark_all_notifications_read_noslash'),
    path('notifications/<int:notification_id>/', delete_notification, name='delete_notification'),
    path('job/<int:job_id>/applications/', list_applications, name='list_applications'),
    path('application/<int:application_id>/status/', update_application_status, name='update_application_status'),
    path('application/<int:application_id>/resume/', serve_application_resume, name='serve_application_resume'),
    path('application/<int:application_id>/start-interview/', start_interview, name='start_interview'),
    path('interview/submit-answer/', submit_interview_answer, name='submit_interview_answer'),
    path('interview/complete/<int:session_id>/', complete_interview, name='complete_interview'),
    path('interview/log-event/', log_interview_event, name='log_interview_event'),
    path('application/<int:application_id>/interview-status/', interview_status, name='interview_status'),
    path('application/<int:application_id>/schedule-interview/', schedule_interview, name='schedule_interview'),
    path('job/<int:job_id>/interviews/', list_interviews_for_job, name='list_interviews_for_job'),
    path('candidate/interviews/', list_interviews_for_candidate, name='list_interviews_for_candidate'),
    path('interview/<int:interview_id>/', update_interview, name='update_interview'),
    path('interview/<int:interview_id>/feedback/', add_interview_feedback, name='add_interview_feedback'),
    path('job/<int:job_id>/screened/', screened_applications, name='screened_applications'),
    path('api/practice/', include('practice.urls')),
    path('api/chat/', chat_message, name='chat_message'),
    path('api/chat/clear/', chat_clear, name='chat_clear'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
