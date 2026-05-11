import random

from django.db.models import Case, IntegerField, QuerySet, When

from items.models import Listing


def listable_listings() -> QuerySet[Listing]:
    return Listing.objects.filter(is_sold=False)


def randomized_listing_feed(seed: int | None = None) -> QuerySet[Listing]:
    qs = listable_listings()
    if seed is not None:
        ids = list(qs.values_list("id", flat=True))
        if ids:
            rng = random.Random(seed)
            rng.shuffle(ids)
            preserved_order = Case(
                *[When(id=pk, then=pos) for pos, pk in enumerate(ids)],
                output_field=IntegerField(),
            )
            return qs.order_by(preserved_order)
    return qs.order_by("?")


def searchable_listings() -> QuerySet[Listing]:
    return listable_listings().order_by("-created_at")


def favorite_listings_for_user(user) -> QuerySet[Listing]:
    return user.profile.favorites.filter(is_sold=False)


def listings_for_seller(user) -> QuerySet[Listing]:
    return Listing.objects.filter(seller=user).order_by("-created_at")
