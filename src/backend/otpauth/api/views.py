from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from core.api import domain_error_response
from core.exceptions import DomainError
from otpauth.serializers import (
    ContactFormSerializer,
    EmailSerializer,
    OTPVerificationSerializer,
)
from otpauth.services.auth import request_otp, send_contact_message, verify_otp


class RequestOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_otp(
            email=serializer.validated_data["email"],
            remote_addr=request.META.get("REMOTE_ADDR"),
        )
        return Response(
            {"detail": "OTP sent to your email."}, status=status.HTTP_200_OK
        )


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = verify_otp(
                email=serializer.validated_data["email"],
                otp_code=serializer.validated_data["otp"],
            )
        except DomainError as exc:
            return domain_error_response(exc)
        return Response(payload, status=status.HTTP_200_OK)


class RefreshTokenView(TokenRefreshView):
    permission_classes = [AllowAny]


class ContactFormView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ContactFormSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            send_contact_message(
                description=serializer.validated_data["description"],
                user_email=serializer.validated_data["user_email"],
            )
        except Exception:
            return Response(
                {"detail": "Failed to send message. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(
            {"detail": "Your message has been sent successfully"},
            status=status.HTTP_200_OK,
        )
