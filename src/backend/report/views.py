"""Compatibility re-export for report API endpoints."""

from report.api.views import UserReportedItemsView, toggle_report

__all__ = ["toggle_report", "UserReportedItemsView"]
