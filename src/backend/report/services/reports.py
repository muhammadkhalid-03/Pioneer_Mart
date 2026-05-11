from __future__ import annotations

from django.db import IntegrityError

from core.exceptions import DomainValidationError
from report.models import ItemReport


def toggle_item_report(*, listing, reporter, reason: str | None):
    if listing.seller == reporter:
        raise DomainValidationError("You cannot report your own item")

    existing_report = ItemReport.objects.filter(
        item=listing,
        reporter=reporter,
    ).first()
    if existing_report is not None:
        existing_report.delete()
        return False

    if not reason:
        raise DomainValidationError("Reason is required when reporting an item")

    try:
        ItemReport.objects.create(item=listing, reporter=reporter, reason=reason)
    except IntegrityError:
        raise DomainValidationError("You have already reported this item")
    return True
