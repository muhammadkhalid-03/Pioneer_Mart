from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from chat.models import ChatRoom, Message
from django.urls import reverse
from notifications.models import Notification


class ChatRoomTestCase(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username="user1", password="pass1")
        self.user2 = User.objects.create_user(username="user2", password="pass2")
        self.client.force_authenticate(user=self.user1)
        self.room = ChatRoom.objects.create(
            user1=self.user1, user2=self.user2, item_id=1
        )

    def test_create_chat_room(self):
        self.assertEqual(ChatRoom.objects.count(), 1)
        self.assertEqual(self.room.user1, self.user1)
        self.assertEqual(self.room.user2, self.user2)
        self.assertEqual(self.room.item_id, 1)

    def test_get_room_list(self):
        url = reverse("room_list")  # now matches your urls.py
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("rooms", response.data)

    def test_get_or_create_room(self):
        # First, make sure this view has a `name=` in urls.py!
        url = reverse("get_or_create_room")
        response = self.client.get(
            url,
            {"other_user_id": self.user2.pk, "listing_id": 1},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("room", response.data)


class MessageTestCase(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username="user1", password="pass1")
        self.user2 = User.objects.create_user(username="user2", password="pass2")
        self.user3 = User.objects.create_user(username="user3", password="pass3")
        self.room = ChatRoom.objects.create(
            user1=self.user1, user2=self.user2, item_id=1
        )
        self.message = Message.objects.create(
            room=self.room, sender=self.user1, receiver=self.user2, content="Hello!"
        )

    def test_message_creation(self):
        self.assertEqual(Message.objects.count(), 1)
        self.assertEqual(self.message.content, "Hello!")
        self.assertFalse(self.message.is_read)

    def test_mark_as_read(self):
        self.message.mark_as_read()
        self.assertTrue(self.message.is_read)
        self.assertIsNotNone(self.message.read_at)

    def test_send_message_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("send_message", kwargs={"room_id": self.room.pk})
        response = self.client.post(
            url,
            {"content": "Second message", "receiver_id": self.user2.pk},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["content"], "Second message")
        self.assertEqual(response.data["sender"]["id"], self.user1.pk)
        self.assertTrue(
            Message.objects.filter(
                room=self.room, sender=self.user1, receiver=self.user2
            ).exists()
        )

    def test_send_message_rejects_non_participant(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("send_message", kwargs={"room_id": self.room.pk})
        response = self.client.post(
            url,
            {"content": "Invalid", "receiver_id": self.user3.pk},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_chat_history_supports_incremental_fetch(self):
        self.client.force_authenticate(user=self.user2)
        second_message = Message.objects.create(
            room=self.room,
            sender=self.user1,
            receiver=self.user2,
            content="Second",
        )
        Message.objects.create(
            room=self.room,
            sender=self.user2,
            receiver=self.user1,
            content="Third",
        )

        url = reverse("chat_history", kwargs={"room_id": self.room.pk})
        response = self.client.get(url, {"after_id": second_message.pk})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["messages"]), 1)
        self.assertEqual(response.data["messages"][0]["content"], "Third")

    def test_chat_history_marks_unread_messages_as_read(self):
        self.client.force_authenticate(user=self.user2)
        url = reverse("chat_history", kwargs={"room_id": self.room.pk})
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.message.refresh_from_db()
        self.assertTrue(self.message.is_read)
        self.assertIsNotNone(self.message.read_at)

    def test_new_messages_create_notifications(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("send_message", kwargs={"room_id": self.room.pk})
        response = self.client.post(
            url,
            {"content": "Notification test", "receiver_id": self.user2.pk},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Notification.objects.count(), 1)
