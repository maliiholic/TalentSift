from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from signup.models import User

class CustomJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, request):
        access_token = request.COOKIES.get('access')

        # Fallback to Authorization header if cookie not present
        if not access_token:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header:
                # Django 3.2+ and some frameworks expose headers via request.headers
                auth_header = getattr(request, 'headers', {}).get('Authorization', '')

            if auth_header and auth_header.startswith('Bearer '):
                access_token = auth_header.split(' ', 1)[1].strip()

        if not access_token:
            print("No access token found in cookies or Authorization header.")
            raise AuthenticationFailed('Authentication credentials were not provided.')

        try:
            print(f"Validating token: {access_token}")  # Debugging
            validated_token = super().get_validated_token(access_token)
            print("Token validated successfully.")
            return validated_token
        except Exception as e:
            print(f"Token validation error: {str(e)}")
            raise AuthenticationFailed(f'Invalid token: {str(e)}')

    def get_user(self, validated_token):
        user_id = validated_token.get('user_id')
        if user_id is None:
            print("User ID not found in token.")
            raise AuthenticationFailed('User ID not found in token.')

        try:
            user = User.objects.get(id=user_id)
            print(f"User found: {user}")
            return user
        except User.DoesNotExist:
            print("User not found in the database.")
            raise AuthenticationFailed('User not found.')

    def authenticate(self, request):
        print("Authenticating request...")
        validated_token = self.get_validated_token(request)
        user = self.get_user(validated_token)
        return (user, validated_token)
