from django.urls import path
from .views import RefreshTokenView, RequestOTPView, VerifyOTPView, ContactFormView

urlpatterns = [
    path("otp/request/", RequestOTPView.as_view(), name="request-otp"),
    path("otp/verify/", VerifyOTPView.as_view(), name="verify-otp"),
    path("contact/", ContactFormView.as_view(), name="contact"),
    path("token/refresh/", RefreshTokenView.as_view(), name="token-refresh"),
]
