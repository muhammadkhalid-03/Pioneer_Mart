from django.db.models import QuerySet

from purchase_requests.models import PurchaseRequest


def sent_purchase_requests_for_user(user) -> QuerySet[PurchaseRequest]:
    return PurchaseRequest.objects.filter(requester=user)


def received_purchase_requests_for_user(user) -> QuerySet[PurchaseRequest]:
    return PurchaseRequest.objects.filter(listing__seller=user)
