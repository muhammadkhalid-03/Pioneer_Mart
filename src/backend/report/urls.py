from django.urls import path
from . import views

urlpatterns = [
    path(
        "listings/<int:item_id>/report-toggle/",
        views.toggle_report,
        name="toggle_report",
    ),
    path(
        "reports/mine/",
        views.UserReportedItemsView.as_view(),
        name="reported_items",
    ),
]
