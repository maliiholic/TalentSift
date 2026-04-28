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
from django.urls import path, include
from signin.views import decode_jwt, reset_password, send_otp_signin, sign_in, verify_otp_signin
from signup.views import send_otp, signup, verify_otp

urlpatterns = [
    path('admin/', admin.site.urls),
    path('signup/', signup, name='signup'),
    path('send_otp/', send_otp, name='send_otp'),
    path('verify_otp/', verify_otp, name='verify_otp'),
    path('login/', sign_in, name='login'),
    path('send-otp_signin/', send_otp_signin, name='send-otp'),
    path('verify_otp_signin/', verify_otp_signin, name='verify-otp'),
    path('reset_password/', reset_password, name='reset-password'),
    path('decode-jwt/', decode_jwt, name='decode_jwt'),
]
