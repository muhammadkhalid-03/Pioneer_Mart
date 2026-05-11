"""Filters for the current user's ItemReport rows (scoped to nested Listing)."""

from __future__ import annotations

import django_filters
from django.db.models import Exists, OuterRef, QuerySet

from purchase_requests.models import PurchaseRequest

from report.models import ItemReport


class ReportMineFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name="item__category")
    price_min = django_filters.NumberFilter(field_name="item__price", lookup_expr="gte")
    price_max = django_filters.NumberFilter(field_name="item__price", lookup_expr="lte")
    has_purchase_requests = django_filters.BooleanFilter(
        method="filter_has_purchase_requests",
    )

    class Meta:
        model = ItemReport
        fields: list[str] = []

    def filter_has_purchase_requests(
        self, queryset: QuerySet[ItemReport], name: str, value: bool
    ) -> QuerySet[ItemReport]:
        qs = queryset.annotate(
            has_active_pr=Exists(
                PurchaseRequest.objects.filter(
                    listing_id=OuterRef("item_id"),
                    is_active=True,
                )
            )
        )
        if value:
            return qs.filter(has_active_pr=True)
        return qs
