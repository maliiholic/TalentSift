import random
import string
import time
import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import User, Profile, Candidate
from email_service import send_otp_email

logger = logging.getLogger(__name__)

otp_storage = {}  # Store email as key and {'otp': OTP, 'timestamp': time_created} as value

def generate_otp(length=6):
    """Generate a random OTP of given length."""
    return ''.join(random.choices(string.digits, k=length))



@api_view(['POST'])
def send_otp(request):
    """
    API to send an OTP to a user's email for verification.
    """
    try:
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if a user with this email already exists
        if User.objects.filter(email=email).exists():
            return Response({'message': 'User with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate the OTP and store it with a timestamp
        otp = generate_otp()
        otp_storage[email] = {
            'otp': otp,
            'timestamp': time.time()
        }

        # Construct the email message
        subject = "Your TalentSift OTP"
        message = f"""
Hello {email},

Thank you for signing up with TalentSift. To complete your account setup, please use the One-Time Password (OTP) below to verify your account:

Verification Code:
{otp}

This code is valid for the next 60 seconds. If you did not request this, please disregard this email.

If you have any questions, feel free to reach out to our support team.

Best regards,
The TalentSift Team
    """
        send_otp_email(subject, message, email)
        response_data = {'message': 'OTP sent to your email.'}
        if settings.DEBUG and settings.EMAIL_BACKEND.endswith('locmem.EmailBackend'):
            response_data['debug_otp'] = otp
        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception('Signup OTP failed for %s', request.data.get('email'))
        return Response({'error': 'Failed to send OTP email', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def verify_otp(request):
    email = request.data.get('email')
    otp = request.data.get('otp')

    # Check if OTP exists for the email
    if email in otp_storage:
        stored_otp_data = otp_storage[email]
        stored_otp = stored_otp_data['otp']
        otp_age = time.time() - stored_otp_data['timestamp']  # Calculate OTP age in seconds

        # Verify OTP and check if it’s expired (more than 60 seconds old)
        if otp_age <= 60:
            if stored_otp == otp:
                del otp_storage[email]  # Delete OTP after successful verification
                return Response({'message': 'OTP verified successfully.'})
            else:
                return Response({'message': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            del otp_storage[email]  # Delete expired OTP
            return Response({'message': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'message': 'OTP not found. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def signup(request):
    """Handle user signup after OTP verification."""
    email = request.data.get('email')
    password = request.data.get('password')
    profile_picture = request.FILES.get('profile_picture')

    first_name = request.data.get('first_name', None)
    last_name = request.data.get('last_name', None)
    city = request.data.get('city', None)
    country = request.data.get('country', None)
    phone_number = request.data.get('phone_number', None)

    # Candidate fields
    skills = request.data.get('skills', None)
    education = request.data.get('education', None)
    github_link = request.data.get('github_link', None)
    resume = request.FILES.get('resume', None)  # Resume file upload
    score = request.data.get('score', None)  # Assume score is passed

    if User.objects.filter(email=email).exists():
        return Response({'message': 'User with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    # Create User
    user = User(email=email)
    user.set_password(password)  # Ensure password is hashed
    user.role = 'user'  # Set default role (for Candidate)
    user.save()

    # Create Profile
    profile = Profile(
        user=user,
        first_name=first_name,
        last_name=last_name,
        city=city,
        country=country,
        phone_number=phone_number,
        profile_picture=profile_picture,
    )
    upload_logger = logging.getLogger('talentsift.upload')
    upload_logger = logging.getLogger('talentsift.upload')
    try:
        upload_logger.info('Saving new profile for user email=%s; profile_picture=%s; storage=%s', email, getattr(profile_picture, 'name', None), getattr(__import__('django.core.files.storage', fromlist=['default_storage']).default_storage.__class__, '__name__', 'unknown'))
        profile.save()
    except Exception as e:
        upload_logger.exception('Profile.save() failed during signup for email=%s: %s', email, e)
        return Response({'error': 'Failed to save profile', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Create Candidate (linking the candidate to the profile)
    candidate = Candidate(
        profile=profile,  # Use profile instead of user
        skills=skills,
        education=education,
        github_link=github_link,
        resume=resume,
        score=score if score is not None else 0.0  # Provide a default score if none is passed
    )
    try:
        upload_logger.info('Saving candidate for email=%s; resume=%s; storage=%s', email, getattr(resume, 'name', None), getattr(__import__('django.core.files.storage', fromlist=['default_storage']).default_storage.__class__, '__name__', 'unknown'))
        candidate.save()
    except Exception as e:
        upload_logger.exception('Candidate.save() failed during signup for email=%s: %s', email, e)
        return Response({'error': 'Failed to save candidate', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'message': 'Signup successfully.'}, status=status.HTTP_201_CREATED)
