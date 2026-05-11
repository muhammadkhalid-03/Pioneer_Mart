from report.models import ItemReport


def reports_for_user(user):
    return ItemReport.objects.filter(reporter=user)
