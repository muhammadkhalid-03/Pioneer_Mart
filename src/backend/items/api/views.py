from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.api import domain_error_response
from core.exceptions import DomainError
from items.models import Listing
from items.filters import ListingFilter
from items.permissions import IsSellerOrReadOnly
from items.selectors.listings import (
    favorite_listings_for_user,
    listings_for_seller,
    randomized_listing_feed,
    searchable_listings,
)
from items.serializers import ItemSerializer
from items.services.listings import (
    create_listing_with_images,
    delete_listing,
    mark_listing_as_available,
    mark_listing_as_sold,
    toggle_listing_favorite,
    update_listing_with_images,
)
from items.services.moderation import moderate_image, moderate_text
from purchase_requests.serializers import PurchaseRequestSerializer
from purchase_requests.services.purchase_requests import create_purchase_request


class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsSellerOrReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ListingFilter
    search_fields = ["title", "description", "category__name"]
    ordering_fields = ["created_at", "price", "title"]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if self.action == "retrieve":
            return Listing.objects.all()
        if self.action == "list":
            q_text = self.request.query_params.get("q", "").strip()
            if q_text:
                return searchable_listings()
            seed_param = self.request.query_params.get("seed")
            try:
                seed = int(seed_param) if seed_param is not None else None
            except ValueError:
                seed = None
            return randomized_listing_feed(seed=seed)
        return searchable_listings()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = create_listing_with_images(
            serializer=serializer,
            seller=request.user,
            additional_images=request.FILES.getlist("additional_images"),
        )
        output_serializer = self.get_serializer(listing)
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        listing = self.get_object()
        serializer = self.get_serializer(
            listing,
            data=request.data,
            partial=kwargs.pop("partial", False),
        )
        serializer.is_valid(raise_exception=True)
        try:
            updated_listing = update_listing_with_images(
                serializer=serializer,
                listing=listing,
                additional_images=request.FILES.getlist("additional_images"),
            )
        except DomainError as exc:
            return domain_error_response(exc)
        return Response(self.get_serializer(updated_listing).data)

    @action(detail=True, methods=["post"], url_path="mark-available")
    def unmark_sold(self, request, pk=None):
        try:
            listing = mark_listing_as_available(
                listing=self.get_object(), actor=request.user
            )
        except DomainError as exc:
            return domain_error_response(exc)
        return Response(
            {"detail": f"{listing.title} is now available."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="mark-sold")
    def mark_sold(self, request, pk=None):
        try:
            listing = mark_listing_as_sold(
                listing=self.get_object(), actor=request.user
            )
        except DomainError as exc:
            return domain_error_response(exc)
        return Response(
            {"detail": f"{listing.title} was marked as sold."},
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="favorite-toggle",
    )
    def toggle_favorite(self, request, pk=None):
        is_favorited = toggle_listing_favorite(
            listing=self.get_object(),
            user_profile=request.user.profile,
        )
        message = (
            "Listing added to favorites."
            if is_favorited
            else "Listing removed from favorites."
        )
        return Response({"message": message, "is_favorited": is_favorited})

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="favorites",
    )
    def favorites(self, request):
        queryset = favorite_listings_for_user(request.user)
        return self._paginated_queryset_response(self.filter_queryset(queryset))

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="favorites/search",
    )
    def search_favorites(self, request):
        queryset = favorite_listings_for_user(request.user)
        query = request.query_params.get("query", "").strip()
        if query:
            queryset = self._apply_text_search(queryset, query)
        return self._paginated_queryset_response(self.filter_queryset(queryset))

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="search",
    )
    def search_items(self, request, pk=None):
        queryset = searchable_listings()
        query = request.query_params.get("query", "").strip()
        if query:
            queryset = self._apply_text_search(queryset, query)
        return self._paginated_queryset_response(self.filter_queryset(queryset))

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="mine",
    )
    def my_items(self, request):
        queryset = listings_for_seller(request.user)
        return self._paginated_queryset_response(self.filter_queryset(queryset))

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="mine/search",
    )
    def search_my_items(self, request):
        queryset = listings_for_seller(request.user)
        query = request.query_params.get("query", "").strip()
        if query:
            queryset = self._apply_text_search(queryset, query)
        return self._paginated_queryset_response(self.filter_queryset(queryset))

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="purchase-requests",
    )
    def request_purchase(self, request, pk=None):
        try:
            purchase_request = create_purchase_request(
                listing=self.get_object(),
                requester=request.user,
            )
        except DomainError as exc:
            return domain_error_response(exc)
        serializer = PurchaseRequestSerializer(
            purchase_request,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=False,
        methods=["post"],
        parser_classes=[JSONParser],
        permission_classes=[IsAuthenticated],
        url_path="moderate-text",
    )
    def moderate_text_action(self, request):
        text = str(request.data.get("text", ""))
        if not text.strip():
            return Response(
                {"detail": "No text provided."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            result = moderate_text(text=text)
        except DomainError as exc:
            return domain_error_response(exc)
        return Response({"status": "ok", "result": result})

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        parser_classes=[MultiPartParser, FormParser],
        url_path="moderate-image",
    )
    def moderate_image_action(self, request):
        image = request.FILES.get("image")
        if not image:
            return Response(
                {"detail": "No image provided."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            result = moderate_image(image_file=image)
        except DomainError as exc:
            return domain_error_response(exc)
        return Response({"status": "ok", "result": result})

    def destroy(self, request, *args, **kwargs):
        try:
            delete_listing(listing=self.get_object(), actor=request.user)
        except DomainError as exc:
            return domain_error_response(exc)
        return Response({"success": "Listing deleted."}, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        return self._paginated_queryset_response(
            self.filter_queryset(self.get_queryset())
        )

    def _apply_text_search(self, queryset, query: str):
        return queryset.filter(
            Q(title__icontains=query)
            | Q(description__icontains=query)
            | Q(category__name__icontains=query)
        )

    def _paginated_queryset_response(self, queryset):
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)
