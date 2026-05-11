"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from rest_framework.schemas import get_schema_view


urlpatterns = [
    path("api/schema/", get_schema_view(title="Pioneer Mart API"), name="api-schema"),
    path("api/v1/auth/", include("otpauth.urls")),
    path("api/v1/", include("items.urls")),
    path("api/v1/", include("categories.urls")),
    path("api/v1/", include("userprofile.urls")),
    path("api/v1/", include("purchase_requests.urls")),
    path("api/v1/", include("chat.urls")),
    path("api/v1/", include("report.urls")),
    path("api/v1/", include("notifications.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
