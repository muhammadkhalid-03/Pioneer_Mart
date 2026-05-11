from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from report.filters import ReportMineFilter

from core.api import domain_error_response
from core.exceptions import DomainError
from items.models import Listing
from report.selectors.reports import reports_for_user
from report.serializers import ReportedItemSerializer
from report.services.reports import toggle_item_report


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_report(request, item_id):
    listing = get_object_or_404(Listing, pk=item_id)
    try:
        was_created = toggle_item_report(
            listing=listing,
            reporter=request.user,
            reason=request.data.get("reason"),
        )
    except DomainError as exc:
        return domain_error_response(exc)
    if was_created:
        return Response(
            {"success": "Item reported successfully"},
            status=status.HTTP_201_CREATED,
        )
    return Response(
        {"success": "Item unreported successfully"},
        status=status.HTTP_200_OK,
    )


class UserReportedItemsView(ListAPIView):
    serializer_class = ReportedItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        drf_filters.SearchFilter,
        drf_filters.OrderingFilter,
    ]
    filterset_class = ReportMineFilter
    search_fields = ["item__title", "item__description", "item__category__name"]
    ordering_fields = ["item__created_at", "item__price", "item__title", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return reports_for_user(self.request.user).select_related(
            "item",
            "item__category",
        )
