from rest_framework import serializers

from items.serializers import ItemSerializer
from .models import ItemReport


class ReportedItemSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)

    class Meta:
        model = ItemReport
        fields = ["id", "item", "reason", "created_at", "resolved"]
