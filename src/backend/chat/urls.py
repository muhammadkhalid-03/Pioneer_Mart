from django.urls import path
from . import views

urlpatterns = [
    path("chat-rooms/", views.room_list, name="room_list"),
    path("chat-rooms/<int:room_id>/messages/", views.chat_history, name="chat_history"),
    path(
        "chat-rooms/<int:room_id>/messages/send/",
        views.send_message,
        name="send_message",
    ),
    path("chat-rooms/resolve/", views.get_or_create_room, name="get_or_create_room"),
    path(
        "chat-rooms/<int:room_id>/read/",
        views.mark_room_as_read,
        name="mark-room-as-read",
    ),
    path("chat-rooms/unread-count/", views.unread_count, name="unread_count"),
    path("chat-rooms/<int:room_id>/", views.delete_room, name="delete_room"),
]
