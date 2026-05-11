from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User

from core.api import domain_error_response
from core.exceptions import DomainError
from userprofile.selectors.users import current_user_queryset
from userprofile.serializers import UserSerializer
from userprofile.services.users import create_basic_user


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.none()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return current_user_queryset(self.request.user)


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    try:
        create_basic_user(email=request.data.get("email", ""))
    except DomainError as exc:
        return domain_error_response(exc)
    return Response(
        {"message": "User created successfully"}, status=status.HTTP_201_CREATED
    )
