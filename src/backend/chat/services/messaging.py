from __future__ import annotations

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.utils import timezone

from core.exceptions import (
    DomainNotFoundError,
    DomainPermissionError,
    DomainValidationError,
)
from items.models import Listing
from notifications.services.notifications import create_chat_notification

from chat.models import ChatRoom, Message


def get_room_for_participant(*, room_id: int, user) -> ChatRoom:
    room = ChatRoom.objects.filter(pk=room_id).first()
    if room is None:
        raise DomainNotFoundError("Chat room not found")
    if user not in room.participants():
        raise DomainPermissionError("You don't have access to this room")
    return room


def get_or_create_room(*, requester, other_user_id: int, item_id: int) -> ChatRoom:
    other_user = User.objects.filter(pk=other_user_id).first()
    if other_user is None:
        raise DomainNotFoundError("User not found")
    if other_user.pk == requester.pk:
        raise DomainValidationError("You cannot create a chat room with yourself")

    existing_room = ChatRoom.objects.filter(
        item_id=item_id,
        user1__in=[requester, other_user],
        user2__in=[requester, other_user],
    ).first()
    if existing_room is not None:
        return existing_room

    user1, user2 = sorted(
        [requester, other_user], key=lambda participant: participant.pk or 0
    )
    try:
        return ChatRoom.objects.create(user1=user1, user2=user2, item_id=item_id)
    except IntegrityError:
        return ChatRoom.objects.get(user1=user1, user2=user2, item_id=item_id)


def send_message(*, room: ChatRoom, sender, receiver_id: int, content: str) -> Message:
    if sender not in room.participants():
        raise DomainPermissionError("You don't have access to this room")
    if not content.strip():
        raise DomainValidationError("Message content is required")

    receiver = User.objects.filter(pk=receiver_id).first()
    if receiver is None:
        raise DomainNotFoundError("Receiver not found")
    if receiver not in room.participants():
        raise DomainValidationError("Receiver is not part of this room")
    if receiver == sender:
        raise DomainValidationError("Sender and receiver must be different users")

    message = Message.objects.create(
        room=room,
        sender=sender,
        receiver=receiver,
        content=content.strip(),
    )
    create_chat_notification(
        recipient=receiver,
        item_name=_room_item_title(room),
        sender_name=sender.username,
    )
    return message


def mark_visible_messages_as_read(
    *, room: ChatRoom, reader, after_id: int | None = None
) -> int:
    unread_messages = Message.objects.filter(room=room, is_read=False).exclude(
        sender=reader
    )
    if after_id is not None:
        unread_messages = unread_messages.filter(pk__gt=after_id)
    current_time = timezone.now()
    return unread_messages.update(is_read=True, read_at=current_time)


def delete_room(*, room: ChatRoom, actor) -> None:
    if actor not in room.participants():
        raise DomainPermissionError("Unauthorized")
    room.delete()


def _room_item_title(room: ChatRoom) -> str | None:
    if not room.item_id:
        return None
    return (
        Listing.objects.filter(pk=room.item_id).values_list("title", flat=True).first()
    )
