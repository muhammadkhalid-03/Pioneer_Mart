from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from typing import Any, cast
from .models import UserProfile
from .serializers import UserSerializer


class UserProfileModelTest(TestCase):
    def test_profile_created_with_user(self):
        user = User.objects.create_user(
            username="tester", email="tester@test.com", password="pass"
        )
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_profile_str_method(self):
        user = User.objects.create_user(username="john", email="john@test.com")
        profile = UserProfile.objects.get(user=user)
        self.assertEqual(str(profile), "john@test.com's profile")


class UserProfileAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="tester", email="tester@test.com", password="pass"
        )
        self.client.force_authenticate(user=self.user)

    def test_get_user_profile(self):
        response = self.client.get(reverse("user-list"))
        response_data = cast(Any, response).data
        data = cast(dict[str, Any], response_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(data["results"][0]["email"], "tester@test.com")
        self.assertIn("profile", data["results"][0])

    def test_signup_success(self):
        unauthenticated_client = APIClient()
        response = unauthenticated_client.post(
            reverse("user-register"),
            {"email": "newuser@test.com"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="newuser@test.com").exists())

    def test_signup_missing_email(self):
        unauthenticated_client = APIClient()
        response = unauthenticated_client.post(reverse("user-register"), {})
        response_data = cast(Any, response).data
        data = cast(dict[str, Any], response_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(data["error"], "The email field is required")


class UserSerializerTest(TestCase):
    def test_user_serializer_output(self):
        user = User.objects.create_user(username="alice", email="alice@test.com")
        serializer = UserSerializer(user)
        self.assertEqual(serializer.data["email"], "alice@test.com")
        self.assertIn("profile", serializer.data)
