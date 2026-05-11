from django.conf import settings
from rest_framework import serializers

from report.models import ItemReport
from django.contrib.auth.models import User
from .models import ItemImage, Listing


# new serializer for the ItemImage model
class ItemImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ItemImage
        fields = ["id", "image", "image_url"]

    # to fix the weird url error wtih s3
    def get_image_url(self, obj):
        if obj.image:
            return f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{obj.image.name}"
        return None


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username")


class ItemSerializer(serializers.ModelSerializer):
    # This is a read only field
    is_favorited = serializers.SerializerMethodField()
    is_reported = serializers.SerializerMethodField()

    # override the image field
    image_url = serializers.SerializerMethodField()

    # new field for additional images
    additional_images = ItemImageSerializer(many=True, read_only=True)
    purchase_requesters = serializers.SerializerMethodField()
    purchase_request_count = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id",
            "title",
            "category",
            "category_name",
            "description",
            "price",
            "image",
            "image_url",  # to fix the weird url error wtih s3
            "additional_images",
            "is_sold",
            "seller",
            "seller_name",
            "created_at",
            "is_favorited",
            "is_reported",
            "purchase_request_count",
            "purchase_requesters",
        ]  # get all fields
        read_only_fields = [
            "id",
            "seller",
            "seller_name",
            "category_name",
            "created_at",
            "image_url",
        ]

    # to fix the weird url error wtih s3
    def get_image_url(self, obj):
        if obj.image:
            return f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{obj.image.name}"
        return None

    def get_is_favorited(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        if not hasattr(self, "_favorite_ids"):
            self._favorite_ids = set(
                request.user.profile.favorites.values_list("pk", flat=True)
            )
        return obj.pk in self._favorite_ids

    def get_is_reported(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if not hasattr(self, "_reported_ids"):
            self._reported_ids = set(
                ItemReport.objects.filter(reporter=request.user).values_list(
                    "item_id", flat=True
                )
            )
        return obj.pk in self._reported_ids

    def get_purchase_requesters(self, obj):
        requesters = obj.get_purchase_requesters()
        return UserMiniSerializer(requesters, many=True).data

    def get_purchase_request_count(self, obj):
        return obj.get_purchase_request_count()
