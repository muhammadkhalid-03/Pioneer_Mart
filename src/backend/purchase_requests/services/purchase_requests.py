from __future__ import annotations

from core.exceptions import DomainPermissionError, DomainValidationError
from notifications.services.notifications import create_purchase_request_notification
from purchase_requests.models import PurchaseRequest


def create_purchase_request(*, listing, requester) -> PurchaseRequest:
    if listing.is_sold:
        raise DomainValidationError("This item has already been sold.")
    if listing.seller == requester:
        raise DomainValidationError("You cannot purchase your own item.")
    if PurchaseRequest.objects.filter(
        listing=listing, requester=requester, is_active=True
    ).exists():
        raise DomainValidationError("You have already requested to purchase this item.")

    purchase_request = PurchaseRequest.objects.create(
        listing=listing,
        requester=requester,
        seller=listing.seller,
        is_active=True,
    )
    create_purchase_request_notification(
        recipient=listing.seller,
        item_name=listing.title,
        requester_name=requester.username,
    )
    return purchase_request


def cancel_purchase_request(
    *, purchase_request: PurchaseRequest, actor
) -> PurchaseRequest:
    if purchase_request.requester != actor:
        raise DomainPermissionError("You cannot cancel someone else's purchase request")
    purchase_request.status = "cancelled"
    purchase_request.is_active = False
    purchase_request.save(update_fields=["status", "is_active"])
    return purchase_request


def accept_purchase_request(
    *, purchase_request: PurchaseRequest, actor
) -> PurchaseRequest:
    if purchase_request.listing.seller != actor:
        raise DomainPermissionError(
            "You cannot accept purchase requests for items you don't own"
        )

    purchase_request.status = "accepted"
    purchase_request.is_active = False
    purchase_request.save(update_fields=["status", "is_active"])

    listing = purchase_request.listing
    listing.is_sold = True
    listing.save(update_fields=["is_sold"])

    PurchaseRequest.objects.filter(listing=listing).exclude(
        pk=purchase_request.pk
    ).update(
        is_active=False,
        status="declined",
    )
    return purchase_request


def decline_purchase_request(
    *, purchase_request: PurchaseRequest, actor
) -> PurchaseRequest:
    if purchase_request.listing.seller != actor:
        raise DomainPermissionError(
            "You cannot decline purchase requests for items you don't own"
        )

    purchase_request.status = "declined"
    purchase_request.is_active = False
    purchase_request.save(update_fields=["status", "is_active"])
    return purchase_request


def delete_purchase_request(*, purchase_request: PurchaseRequest, actor) -> None:
    if purchase_request.requester != actor:
        raise DomainPermissionError("You cannot delete someone else's purchase request")
    purchase_request.delete()
