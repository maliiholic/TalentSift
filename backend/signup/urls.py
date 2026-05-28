from django.urls import path

from .views import send_otp, signup, verify_otp

urlpatterns = [
	path("register/", signup, name="register"),
	path("send_otp/", send_otp, name="send_otp"),
	path("verify_otp/", verify_otp, name="verify_otp"),
]