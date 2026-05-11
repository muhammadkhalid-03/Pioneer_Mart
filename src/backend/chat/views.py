"""Compatibility re-export for chat API endpoints."""

from chat.api.views import (
    chat_history,
    delete_room,
    get_or_create_room,
    mark_room_as_read,
    room_list,
    send_message,
    unread_count,
)

__all__ = [
    "room_list",
    "chat_history",
    "send_message",
    "get_or_create_room",
    "mark_room_as_read",
    "unread_count",
    "delete_room",
]
