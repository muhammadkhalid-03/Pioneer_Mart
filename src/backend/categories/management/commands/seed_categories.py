from django.core.management.base import BaseCommand

from categories.models import Category

DEFAULT_CATEGORY_NAMES = (
    "Books",
    "Electronics",
    "Furniture",
    "Clothing",
    "Dorm Supplies",
    "Transportation",
    "Services",
    "Other",
)


class Command(BaseCommand):
    help = "Seed default categories into the database."

    def handle(self, *args, **kwargs):
        created_count = 0
        existing_count = 0

        for name in DEFAULT_CATEGORY_NAMES:
            _, created = Category.objects.get_or_create(name=name)
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created category: {name}"))
            else:
                existing_count += 1
                self.stdout.write(f"Already exists: {name}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_count}, already existed {existing_count}."
            )
        )
