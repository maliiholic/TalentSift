from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from signup.models import Profile, Candidate, Recruiter, Subscription, User
from getUserData.JWT import CustomJWTAuthentication 
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from django.urls import reverse
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import logging
import os

logger = logging.getLogger('talentsift.upload')


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
def serve_profile_resume(request):
    try:
        profile = Profile.objects.get(user=request.user)
        candidate = Candidate.objects.get(profile=profile)
    except (Profile.DoesNotExist, Candidate.DoesNotExist):
        return Response({'error': 'Resume not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not candidate.resume:
        return Response({'error': 'Resume not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        candidate.resume.open('rb')
        filename = os.path.basename(candidate.resume.name) or 'resume.pdf'
        response = FileResponse(candidate.resume, content_type='application/pdf', as_attachment=False, filename=filename)
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response
    except Exception as exc:
        logger.exception('Failed to serve profile resume for user id=%s: %s', request.user.id, exc)
        return Response({'error': 'Failed to open resume.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_profile(request):
    user = request.user  # Authenticated user

    if not user:
        return Response(
            {'error': 'User not authenticated.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.method == 'GET':
        try:
            # Retrieve user data
            user_data = {
                'email': user.email,
                'role': user.role,
                
            }

            profile = None
            candidate = None
            recruiter = None

            # Retrieve profile data
            try:
                profile = Profile.objects.get(user=request.user)

                profile_data = {
                    'first_name': profile.first_name,
                    'last_name': profile.last_name,
                    'city': profile.city,
                    'country': profile.country,
                    'linkedin_link': profile.linkedin_link,
                    'phone_number': profile.phone_number,
                    'profile_picture': _safe_file_url(request, profile.profile_picture),
                }
            except Profile.DoesNotExist:
                profile_data = None
            user_data['profile'] = profile_data

            # Retrieve candidate data
            if profile is not None:
                try:
                    candidate = Candidate.objects.get(profile=profile)
                    candidate_data = {
                        'score': candidate.score,
                        'education': candidate.education,
                        'resume': request.build_absolute_uri(reverse('serve_profile_resume')) if candidate.resume else None,
                        'skills': candidate.skills,
                        'github_link': candidate.github_link,
                        'experience': profile.bio,
                    }
                except Candidate.DoesNotExist:
                    candidate_data = None
            else:
                candidate_data = None
            user_data['candidate'] = candidate_data

            # Retrieve recruiter data
            if profile is not None:
                try:
                    recruiter = Recruiter.objects.get(profile=profile)
                    recruiter_data = {
                        'company_name': recruiter.company_name,
                        'company_website': recruiter.company_website,
                    }
                except Recruiter.DoesNotExist:
                    recruiter_data = None
            else:
                recruiter_data = None
            user_data['recruiter'] = recruiter_data

            

            return Response(user_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': 'An unexpected error occurred', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['PUT'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user  # Authenticated user
    role = request.data.get('role')
    

    if not user:
        return Response(
            {'error': 'User not authenticated.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        # Retrieve or create the user's profile
        profile, created = Profile.objects.get_or_create(user=user)
        warnings = []

        # Update general profile fields
        profile.first_name = request.data.get('first_name', profile.first_name)
        profile.last_name = request.data.get('last_name', profile.last_name)
        profile.city = request.data.get('city', profile.city)
        profile.country = request.data.get('country', profile.country)
        profile.linkedin_link = request.data.get('linkedin_link', profile.linkedin_link)
        profile.phone_number = request.data.get('phone_number', profile.phone_number)
        profile.bio = request.data.get('bio', profile.bio)

        # Handle profile picture update
        previous_profile_picture = profile.profile_picture
        new_profile_picture = request.FILES.get('profile_picture')

        # Attempt to save profile (save text fields first so partial updates work)
        logger.info("Saving profile for user id=%s, storage=%s, new_profile_picture=%s", user.id, getattr(default_storage.__class__, '__name__', str(default_storage.__class__)), getattr(new_profile_picture, 'name', None))
        try:
            profile.save()
        except Exception as save_error:
            logger.exception('Profile.save() failed for user id=%s: %s', user.id, save_error)
            return Response(
                {'error': 'Failed to save profile data.', 'details': str(save_error)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        if new_profile_picture is not None:
            logger.info('Attempting to save profile_picture for user id=%s; filename=%s', user.id, getattr(new_profile_picture, 'name', None))
            try:
                profile.profile_picture = new_profile_picture
                profile.save()
                logger.info('Saved profile_picture for user id=%s', user.id)
            except Exception as picture_error:
                logger.exception('Profile picture save failed for user id=%s: %s', user.id, picture_error)
                profile.profile_picture = previous_profile_picture
                try:
                    profile.save(update_fields=['profile_picture'])
                except Exception:
                    logger.exception('Failed to roll back profile_picture for user id=%s', user.id)
                warnings.append(f'Profile picture upload failed: {picture_error}')

        # Candidate or Recruiter logic
        candidate = None
        recruiter = None
        if role == 'Candidate' or user.role == 'Candidate':
            candidate, _ = Candidate.objects.get_or_create(profile=profile)
            candidate.skills = request.data.get('skills', candidate.skills)
            candidate.education = request.data.get('education', candidate.education)
            candidate.github_link = request.data.get('github_link', candidate.github_link)
            previous_resume = candidate.resume
            new_resume = request.FILES.get('resume')
            candidate.save()

            if new_resume is not None:
                logger.info('Attempting to save resume for user id=%s; filename=%s', user.id, getattr(new_resume, 'name', None))
                try:
                    candidate.resume = new_resume
                    candidate.save()
                    logger.info('Saved resume for user id=%s', user.id)
                except Exception as resume_error:
                    logger.exception('Resume save failed for user id=%s: %s', user.id, resume_error)
                    candidate.resume = previous_resume
                    try:
                        candidate.save(update_fields=['resume'])
                    except Exception:
                        logger.exception('Failed to roll back resume for user id=%s', user.id)
                    warnings.append(f'Resume upload failed: {resume_error}')

        elif role == 'Recruiter' or user.role == 'Recruiter':
            recruiter, _ = Recruiter.objects.get_or_create(profile=profile)
            recruiter.company_name = request.data.get('company_name', recruiter.company_name)
            recruiter.company_website = request.data.get('company_website', recruiter.company_website)
            recruiter.save()

        # Prepare updated response data
        updated_data = {
            'first_name': profile.first_name,
            'last_name': profile.last_name,
            'city': profile.city,
            'country': profile.country,
            'linkedin_link': profile.linkedin_link,
            'phone_number': profile.phone_number,
            'profile_picture': _safe_file_url(request, profile.profile_picture),
            'skills': candidate.skills if role == 'Candidate' else None,
            'education': candidate.education if role == 'Candidate' else None,
            'github_link': candidate.github_link if role == 'Candidate' else None,
            'resume': request.build_absolute_uri(reverse('serve_profile_resume')) if role == 'Candidate' and candidate.resume else None,
            'bio': profile.bio if role == 'Candidate' else None,
            'company_name': recruiter.company_name if role == 'Recruiter' else None,
            'company_website': recruiter.company_website if role == 'Recruiter' else None,
        }

        response_payload = {'message': 'Profile updated successfully', 'profile': updated_data}
        if warnings:
            response_payload['warnings'] = warnings

        logger.info(
            'Update response for user id=%s: profile_picture_url=%s resume_url=%s',
            user.id,
            updated_data.get('profile_picture'),
            updated_data.get('resume'),
        )

        return Response(response_payload, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': 'An unexpected error occurred while updating', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
