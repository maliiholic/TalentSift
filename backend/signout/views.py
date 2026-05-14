from django.http import JsonResponse
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.permissions import AllowAny

@api_view(['POST'])
@authentication_classes([])
def logout_view(request):
    response = JsonResponse({"message": "Logged out successfully"})
    
    # Clear the access token cookie (works on both localhost and production)
    response.delete_cookie('access', path='/', samesite='Lax')
    response.set_cookie('access', '', httponly=True,
                samesite='Lax',  # Changed from 'None' to work better with localhost
                max_age=0,
                path='/') 
    response["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response["Access-Control-Allow-Credentials"] = "true"
    response["Access-Control-Allow-Headers"] = "content-type"
    return response
