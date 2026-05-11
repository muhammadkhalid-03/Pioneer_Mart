from django.db.models import Count, Max, Q, QuerySet

from chat.models import ChatRoom, Message


def chat_rooms_for_user(user) -> QuerySet[ChatRoom]:
    return (
        ChatRoom.objects.filter(Q(user1=user) | Q(user2=user))
        .select_related("user1", "user2")
        .annotate(
            unread_count=Count(
                "messages",
                filter=Q(messages__is_read=False) & ~Q(messages__sender=user),
            ),
            last_message_time=Max("messages__timestamp"),
        )
        .order_by("-last_message_time", "-created_at")
    )


def unread_message_count_for_user(user) -> int:
    return (
        Message.objects.filter(
            Q(room__user1=user) | Q(room__user2=user),
            is_read=False,
        )
        .exclude(sender=user)
        .count()
    )


def ordered_room_messages(*, room, after_id: int | None = None):
    queryset = (
        Message.objects.filter(room=room).select_related("sender").order_by("timestamp")
    )
    if after_id is not None:
        queryset = queryset.filter(pk__gt=after_id)
    return queryset
