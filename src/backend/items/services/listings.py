from __future__ import annotations

from core.exceptions import DomainPermissionError, DomainValidationError
from items.models import ItemImage, Listing
from purchase_requests.models import PurchaseRequest


def create_listing_with_images(*, serializer, seller, additional_images) -> Listing:
    listing = serializer.save(seller=seller)
    _replace_additional_images(listing=listing, additional_images=additional_images)
    return listing


def update_listing_with_images(
    *, serializer, listing: Listing, additional_images
) -> Listing:
    updated_listing = serializer.save()
    old_images = list(updated_listing.additional_images.all())
    updated_listing.additional_images.clear()
    for old_image in old_images:
        if not old_image.listings.exists():
            old_image.image.delete(save=False)
            old_image.delete()
    _replace_additional_images(
        listing=updated_listing,
        additional_images=additional_images,
    )
    return updated_listing


def mark_listing_as_sold(*, listing: Listing, actor) -> Listing:
    if listing.seller != actor:
        raise DomainPermissionError("You are not the seller of this listing.")
    if listing.is_sold:
        raise DomainValidationError("Listing is already marked as sold.")
    listing.is_sold = True
    listing.save(update_fields=["is_sold"])
    PurchaseRequest.objects.filter(listing=listing).exclude(status="accepted").update(
        is_active=False,
        status="declined",
    )
    return listing


def mark_listing_as_available(*, listing: Listing, actor) -> Listing:
    if listing.seller != actor:
        raise DomainPermissionError("You are not the seller of this listing.")
    if not listing.is_sold:
        raise DomainValidationError("Listing is already marked as available.")
    listing.is_sold = False
    listing.save(update_fields=["is_sold"])
    return listing


def toggle_listing_favorite(*, listing: Listing, user_profile) -> bool:
    if user_profile.favorites.filter(pk=listing.pk).exists():
        user_profile.favorites.remove(listing)
        return False
    user_profile.favorites.add(listing)
    return True


def delete_listing(*, listing: Listing, actor) -> None:
    if listing.seller != actor:
        raise DomainPermissionError(
            "You do not have permission to delete this listing."
        )
    listing.delete()


def _replace_additional_images(*, listing: Listing, additional_images) -> None:
    for uploaded_image in additional_images:
        image_record = ItemImage.objects.create(image=uploaded_image)
        listing.additional_images.add(image_record)
