from django.db import models
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.api import domain_error_response
from core.exceptions import DomainError
from purchase_requests.models import PurchaseRequest
from purchase_requests.selectors.purchase_requests import (
    received_purchase_requests_for_user,
    sent_purchase_requests_for_user,
)
from purchase_requests.serializers import PurchaseRequestSerializer
from purchase_requests.services.purchase_requests import (
    accept_purchase_request,
    cancel_purchase_request,
    decline_purchase_request,
    delete_purchase_request,
)


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    queryset = PurchaseRequest.objects.all()
    serializer_class = PurchaseRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        user = self.request.user
        if self.action == "sent":
            return sent_purchase_requests_for_user(user)
        if self.action == "received":
            return received_purchase_requests_for_user(user)
        return PurchaseRequest.objects.filter(
            models.Q(requester=user) | models.Q(seller=user)
        )

    @action(detail=False, methods=["get"], url_path="sent")
    def sent(self, request):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="received")
    def received(self, request):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        try:
            cancel_purchase_request(
                purchase_request=self.get_object(),
                actor=request.user,
            )
        except DomainError as exc:
            return domain_error_response(exc)
        return Response({"detail": "Purchase request cancelled."})

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        try:
            accept_purchase_request(
                purchase_request=self.get_object(),
                actor=request.user,
            )
        except DomainError as exc:
            return domain_error_response(exc)
        return Response(
            {"detail": "Purchase request accepted"}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="decline")
    def decline(self, request, pk=None):
        try:
            decline_purchase_request(
                purchase_request=self.get_object(),
                actor=request.user,
            )
        except DomainError as exc:
            return domain_error_response(exc)
        return Response({"detail": "Purchase request declined"})

    @action(detail=True, methods=["delete"], url_path="remove")
    def remove(self, request, pk=None):
        try:
            delete_purchase_request(
                purchase_request=self.get_object(),
                actor=request.user,
            )
        except DomainError as exc:
            return domain_error_response(exc)
        return Response(
            {"detail": "Purchase request permanently deleted."},
            status=status.HTTP_200_OK,
        )
