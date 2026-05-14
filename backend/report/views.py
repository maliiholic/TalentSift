from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from signup.models import Job, Report
from getUserData.JWT import CustomJWTAuthentication
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator

@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def create_report(request):
    # Get job_id and feedback from the request body
    job_id = request.data.get('job_id')
    feedback = request.data.get('feedback')

    # Ensure job_id is provided in the request
    if not job_id:
        return Response({"error": "Job ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    # Ensure feedback is provided in the request
    if not feedback:
        return Response({"error": "Feedback is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Check if the job exists
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    # Check if a report already exists for this job and user
    if Report.objects.filter(job=job, user=request.user).exists():
        return Response({"message": "You have already submitted a report for this job"}, status=status.HTTP_200_OK)

    # Create a new report for the job with feedback and user association
    report = Report.objects.create(job=job, feedback=feedback, user=request.user)

    return Response(
        {
            "message": "Report created successfully",
            "report_id": report.id,
            "feedback": report.feedback,
            "user_id": report.user.id,
        },
        status=status.HTTP_201_CREATED
    )


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def check_report_status(request, job_id):
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    report_exists = Report.objects.filter(job=job, user=request.user).exists()

    if report_exists:
        return Response({"message": "Yes"}, status=status.HTTP_200_OK)
    else:
        return Response({"message": "No"}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def load_reported_jobs(request):
    """Load all jobs that have reports with pagination"""
    try:
        page = request.GET.get('page', 1)
        title = request.GET.get('title', '')
        
        # Get jobs that have reports
        reported_jobs_queryset = Job.objects.filter(reports__isnull=False).distinct()
        
        # Filter by job title if search term is provided
        if title:
            reported_jobs_queryset = reported_jobs_queryset.filter(job_name__icontains=title)
        
        # Get all reports for pagination info
        all_reports = Report.objects.all()
        
        # Paginate
        paginator = Paginator(reported_jobs_queryset, 10)
        page_obj = paginator.get_page(page)
        
        # Serialize the jobs with their report feedback
        reported_jobs_data = []
        for job in page_obj:
            job_reports = job.reports.all()
            feedback_list = [report.feedback for report in job_reports]
            
            reported_jobs_data.append({
                'id': job.id,
                'job_id': job.id,
                'job_name': job.job_name,
                'job_location': job.job_location,
                'skills': job.skills,
                'company_name': job.recruiter.company_name if hasattr(job.recruiter, 'company_name') else 'Unknown',
                'workplace_type': job.workplace_type,
                'employment_type': job.employment_type,
                'description': job.description,
                'feedback': feedback_list
            })
        
        return Response({
            'count': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'results': {
                'reported_jobs': reported_jobs_data
            }
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_job_and_reports(request, job_id):
    """Delete a job and all its associated reports"""
    try:
        job = Job.objects.get(id=job_id)
        # Delete all reports associated with this job
        job.reports.all().delete()
        # Delete the job
        job.delete()
        return Response({
            'message': 'Job and associated reports deleted successfully'
        }, status=status.HTTP_200_OK)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_report(request, report_id):
    """Delete a single report"""
    try:
        report = Report.objects.get(id=report_id)
        report.delete()
        return Response({
            'message': 'Report deleted successfully'
        }, status=status.HTTP_200_OK)
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
