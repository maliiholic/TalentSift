from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from signup.models import Profile,User
from .JWT import CustomJWTAuthentication 
from django.db.models import Count, Sum
from signup.models import Job, Subscription, Profit
from django.core.paginator import Paginator
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status


def _safe_file_url(request, file_field):
    if not file_field:
        return None

    try:
        file_url = file_field.url
    except Exception:
        file_url = str(file_field)

    if not file_url:
        return None

    if file_url.startswith('http://') or file_url.startswith('https://'):
        return file_url

    return request.build_absolute_uri(file_url)

@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_data(request):

    if not request.user.is_authenticated:
        return Response({"error": "User not authenticated."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        profile = Profile.objects.get(user=request.user)

        profile_picture_url = _safe_file_url(request, profile.profile_picture)


        user_data = {
            "first_name": profile.first_name,
            "email": request.user.email,
            "profile_picture": profile_picture_url,
        }
        return Response({"user_data": user_data}, status=status.HTTP_200_OK)

    except Profile.DoesNotExist:
        return Response({"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)




@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_role(request):
    user_role_param = request.query_params.get('role')
    user = request.user  
    if not user_role_param or not user:
        return Response(
            {'error': 'User role or user ID not provided.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        resolved_role = 'admin' if user.is_staff or user.is_superuser or user.role == 'admin' else 'user'

        if resolved_role == 'user':
            if user_role_param == 'Guest':
                return Response({'role': 'Candidate'}, status=status.HTTP_200_OK)
            elif user_role_param == 'admin':
                return Response({'role': 'admin'}, status=status.HTTP_200_OK)
            elif user_role_param == 'Candidate':
                return Response({'role': 'Candidate'}, status=status.HTTP_200_OK)
            elif user_role_param == 'Recruiter':
                return Response({'role': 'Recruiter'}, status=status.HTTP_200_OK)
            else:
                return Response({'role': 'Guest'}, status=status.HTTP_400_BAD_REQUEST)
        if resolved_role == 'admin':
            if user_role_param == 'Guest':
                return Response({'role': 'admin'}, status=status.HTTP_200_OK)
            if user_role_param == 'admin':
                return Response({'role': 'admin'}, status=status.HTTP_200_OK)
        else:
            return Response({'role': 'Guest'}, status=status.HTTP_200_OK) 

    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)



@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_dashboard(request):
    """Return aggregated stats for the Admin dashboard."""
    user = request.user
    if not (user.is_staff or user.is_superuser):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    try:
        # Basic counts
        user_count = User.objects.count()
        total_jobs = Job.objects.count()
        total_subscriptions = Subscription.objects.count()

        # Profit sum (fallback to 0)
        profit_agg = Profit.objects.aggregate(total=Sum('net_profit'))
        total_net_profit = float(profit_agg['total'] or 0)

        # Jobs by category
        jobs_by_category_qs = Job.objects.values('skills').annotate(count=Count('id'))
        jobs_by_category = [{'skills': item['skills'], 'count': item['count']} for item in jobs_by_category_qs]

        # Jobs by workplace type
        jobs_by_workplace_qs = Job.objects.values('workplace_type').annotate(count=Count('id'))
        jobs_by_workplace = [{'workplace_type': item['workplace_type'], 'count': item['count']} for item in jobs_by_workplace_qs]

        # Jobs by preference (employment_type)
        jobs_by_preference_qs = Job.objects.values('employment_type').annotate(count=Count('id'))
        jobs_by_preference = [{'employment_type': item['employment_type'], 'count': item['count']} for item in jobs_by_preference_qs]

        # Jobs per day (last 7 days)
        from django.utils import timezone
        from datetime import timedelta
        today = timezone.now().date()
        last_7 = [today - timedelta(days=i) for i in range(6, -1, -1)]
        jobs_post = []
        for d in last_7:
            count = Job.objects.filter(created_at__date=d).count()
            jobs_post.append({'day': d.strftime('%Y-%m-%d'), 'count': count})

        data = {
            'user_count': user_count,
            'total_jobs': total_jobs,
            'total_subscriptions': total_subscriptions,
            'total_net_profit': total_net_profit,
            'jobs_by_category': jobs_by_category,
            'jobs_by_workplace': jobs_by_workplace,
            'jobs_by_preference': jobs_by_preference,
            'Jobs_post': jobs_post,
        }

        return Response(data, status=200)

    except Exception as e:
        return Response({'error': 'Failed to build dashboard', 'details': str(e)}, status=500)



@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def all_users(request):
    user = request.user
    if not (user.is_staff or user.is_superuser):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    page = int(request.GET.get('page', 1))
    email = request.GET.get('email', '').strip()
    users_qs = User.objects.all().order_by('-id')
    if email:
        users_qs = users_qs.filter(email__icontains=email)

    paginator = Paginator(users_qs, 10)
    page_obj = paginator.get_page(page)

    results = [{'id': u.id, 'email': u.email, 'role': u.role, 'is_staff': u.is_staff} for u in page_obj.object_list]

    return Response({'count': paginator.count, 'results': results}, status=200)


@api_view(['DELETE'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_user(request, user_id):
    user = request.user
    if not (user.is_staff or user.is_superuser):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    try:
        u = User.objects.get(id=user_id)
        u.delete()
        return Response({'message': 'User deleted'}, status=200)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)


@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def subscribers(request):
    user = request.user
    if not (user.is_staff or user.is_superuser):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    page = int(request.GET.get('page', 1))
    email = request.GET.get('email', '').strip()

    subs_qs = Subscription.objects.select_related('user').all().order_by('-id')
    if email:
        subs_qs = subs_qs.filter(user__email__icontains=email)

    paginator = Paginator(subs_qs, 10)
    page_obj = paginator.get_page(page)

    results = [
        {
            'id': s.id,
            'email': s.user.email if s.user else None,
            'subscription': s.type,
            'start_date': s.start_date,
            'end_date': s.end_date,
        }
        for s in page_obj.object_list
    ]

    return Response({'count': paginator.count, 'results': results}, status=200)


@api_view(['DELETE'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_subscription(request, sub_id):
    user = request.user
    if not (user.is_staff or user.is_superuser):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    try:
        s = Subscription.objects.get(id=sub_id)
        s.delete()
        return Response({'message': 'Subscription deleted'}, status=200)
    except Subscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=404)