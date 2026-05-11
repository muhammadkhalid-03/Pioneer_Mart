"""Queryset filters for listing list/search endpoints."""

from __future__ import annotations

import django_filters
from django.db.models import Exists, OuterRef, QuerySet

from items.models import Listing
from purchase_requests.models import PurchaseRequest


class ListingFilter(django_filters.FilterSet):
    price_min = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    price_max = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    has_purchase_requests = django_filters.BooleanFilter(
        method="filter_has_purchase_requests",
    )

    class Meta:
        model = Listing
        fields = ["category"]

    def filter_has_purchase_requests(
        self, queryset: QuerySet[Listing], name: str, value: bool
    ) -> QuerySet[Listing]:
        qs = queryset.annotate(
            has_active_pr=Exists(
                PurchaseRequest.objects.filter(
                    listing_id=OuterRef("pk"),
                    is_active=True,
                )
            )
        )
        if value:
            return qs.filter(has_active_pr=True)
        return qs
