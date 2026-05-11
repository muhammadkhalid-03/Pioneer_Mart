from django.apps import apps
from django.contrib.admin.models import LogEntry
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.contrib.auth.models import Group
from django.db import transaction, connection
from chat.models import Message, ChatRoom
from categories.management.commands.seed_categories import DEFAULT_CATEGORY_NAMES
from categories.models import Category
from items.models import ItemImage, Listing
from notifications.models import Notification, UserPushToken
from otpauth.models import OTP
from purchase_requests.models import PurchaseRequest
from report.models import ItemReport
from userprofile.models import UserProfile
from django.contrib.sessions.models import Session


class Command(BaseCommand):
    help = "Wipe all data except seeded categories and reset sequences safely"

    def reset_sequences(self):
        """Reset PostgreSQL sequences to each table's current max primary key."""
        if connection.vendor != "postgresql":
            self.stdout.write(
                self.style.WARNING(
                    f"Skipping sequence reset for unsupported database vendor: {connection.vendor}"
                )
            )
            return

        sequence_models = []
        for model in apps.get_models(include_auto_created=True):
            if not model._meta.managed or model._meta.proxy:
                continue

            pk = model._meta.pk
            if pk is None:
                continue

            if pk.get_internal_type() not in {"AutoField", "BigAutoField", "SmallAutoField"}:
                continue

            sequence_models.append(model)

        with connection.cursor() as cursor:
            for model in sequence_models:
                table_name = model._meta.db_table
                pk_column = model._meta.pk.column
                cursor.execute(
                    """
                    SELECT setval(
                        pg_get_serial_sequence(%s, %s),
                        COALESCE((SELECT MAX("{pk_column}") FROM "{table_name}"), 1),
                        EXISTS(SELECT 1 FROM "{table_name}")
                    )
                    """.format(pk_column=pk_column, table_name=table_name),
                    [table_name, pk_column],
                )
                self.stdout.write(f"Reset sequence for: {table_name}")

    def delete_item_media(self):
        self.stdout.write("Deleting listing images from storage...")
        for image_name in Listing.objects.exclude(image="").values_list("image", flat=True):
            if image_name:
                Listing._meta.get_field("image").storage.delete(image_name)

        self.stdout.write("Deleting additional item images from storage...")
        for image_name in ItemImage.objects.exclude(image="").values_list("image", flat=True):
            if image_name:
                ItemImage._meta.get_field("image").storage.delete(image_name)

    @transaction.atomic
    def handle(self, *args, **kwargs):
        admin_users = User.objects.filter(is_superuser=True)
        admin_ids = list(admin_users.values_list("id", flat=True))

        self.stdout.write("Preserving seeded categories only...")
        Category.objects.exclude(name__in=DEFAULT_CATEGORY_NAMES).delete()

        self.delete_item_media()

        # Delete in the proper order to avoid foreign key constraint errors
        self.stdout.write("Deleting sessions...")
        Session.objects.all().delete()

        self.stdout.write("Deleting admin log entries...")
        LogEntry.objects.all().delete()

        self.stdout.write("Deleting chat messages...")
        Message.objects.all().delete()

        self.stdout.write("Deleting chat rooms...")
        ChatRoom.objects.all().delete()

        self.stdout.write("Deleting item images...")
        ItemImage.objects.all().delete()

        self.stdout.write("Deleting additional images...")
        # Handle the items_listing_additional_images table (many-to-many relationship)
        Listing.additional_images.through.objects.all().delete()

        self.stdout.write("Deleting listings...")
        Listing.objects.all().delete()

        self.stdout.write("Deleting notifications...")
        Notification.objects.all().delete()

        self.stdout.write("Deleting push tokens...")
        UserPushToken.objects.all().delete()

        self.stdout.write("Deleting purchase requests...")
        PurchaseRequest.objects.all().delete()

        self.stdout.write("Deleting item reports...")
        ItemReport.objects.all().delete()

        self.stdout.write("Deleting OTPs...")
        OTP.objects.all().delete()

        self.stdout.write("Deleting userprofile favorites...")
        # Handle the userprofile_userprofile_favorites table (many-to-many relationship)
        UserProfile.favorites.through.objects.all().delete()

        self.stdout.write("Deleting non-admin user profiles...")
        UserProfile.objects.exclude(user_id__in=admin_ids).delete()

        self.stdout.write("Deleting groups...")
        Group.objects.all().delete()

        self.stdout.write("Deleting non-admin users...")
        User.objects.exclude(id__in=admin_ids).delete()

        self.stdout.write("Resetting sequences...")
        self.reset_sequences()

        self.stdout.write(
            self.style.SUCCESS(
                "Wipe complete. Seeded categories and admin users preserved, files deleted, and sequences reset."
            )
        )
