from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from signup.models import Job, Recruiter
from getUserData.JWT import CustomJWTAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

class JobPagination(PageNumberPagination):
    page_size = 6  # Number of items per page
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        """
        Custom paginated response to include total count of items.
        """
        return Response({
            'count': self.page.paginator.count,  # Total number of items
            'total_pages': self.page.paginator.num_pages,  # Total number of pages
            'results': data,  # Paginated items,
            'current_page': self.page.number,  # Current page number
        })




class Job_Pagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,  # Total number of items
            'total_pages': self.page.paginator.num_pages,  # Total number of pages
            'current_page': self.page.number,  # Current page number
            'next': self.get_next_link(),  # URL for next page
            'previous': self.get_previous_link(),  # URL for previous page
            'results': data  # Data for the current page
        })




@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_jobs_for_recruiter(request):
    user = request.user  # Authenticated user

    if not user:
        return Response(
            {'error': 'User not authenticated.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        recruiter = Recruiter.objects.get(profile__user=user)
        # Get search term from the query parameters, if available
        search_term = request.GET.get('search', '').strip()
        # Filter jobs based on the search term if provided
        jobs_query = Job.objects.filter(recruiter=recruiter)
        
        if search_term:
            jobs_query = jobs_query.filter(job_name__icontains=search_term)

        paginator = JobPagination()
        paginated_jobs = paginator.paginate_queryset(jobs_query, request)

        job_data = [
            {   'job_id':job.id,
                'job_name': job.job_name,
                'workplace_type': job.workplace_type,
                'job_location': job.job_location,
                'employment_type': job.employment_type,
                'description': job.description,
                'skills': job.skills,
                'interview_type': job.interview_type,
                'company_name': recruiter.company_name,  # Recruiter company name
                'created_at': job.created_at,
                'updated_at': job.updated_at,
            }
            for job in paginated_jobs
        ]

        return paginator.get_paginated_response(job_data)

    except Recruiter.DoesNotExist:
        return Response(
            {'error': 'Recruiter not found for this user.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': 'An unexpected error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_all_jobs(request):
    """
    API to get all jobs, optionally with a search term.
    """

    # Get the search term from the query parameters (if provided)
    search_term = request.GET.get('search', '').strip()

    # Set the page number based on the query parameter
    page = int(request.GET.get('page', 1))  # Default to page 1 if not provided

    try:
        # Start with all jobs, then apply the search filter if provided
        jobs_query = Job.objects.all()

        if search_term:
            jobs_query = jobs_query.filter(job_name__icontains=search_term)

        # Debug: Check how many jobs are returned after filtering

        # Apply pagination
        paginator = Job_Pagination()

        # If there's a search term, reset page to 1 (first page)
        if search_term and page > 1:
            page = 1  # Always go back to the first page when searching

        # Get paginated jobs for the requested page
        paginated_jobs = paginator.paginate_queryset(jobs_query, request)

        # Debug: Check if pagination is correctly applied

        # Prepare job data for the response
        job_data = [
            {
                'job_id': job.id,
                'job_name': job.job_name,
                'workplace_type': job.workplace_type,
                'job_location': job.job_location,
                'employment_type': job.employment_type,
                'description': job.description,
                'skills': job.skills,
                'interview_type': job.interview_type,
                'company_name': job.recruiter.company_name,
                'created_at': job.created_at,
                'updated_at': job.updated_at,
            }
            for job in paginated_jobs
        ]

        # Return the paginated response
        return paginator.get_paginated_response(job_data)

    except Exception as e:
        # Handle any unexpected errors and print the exception details for debugging
        return Response(
            {'error': 'An unexpected error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
