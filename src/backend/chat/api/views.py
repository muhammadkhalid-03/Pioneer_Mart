from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from chat.selectors.chat_rooms import (
    chat_rooms_for_user,
    ordered_room_messages,
    unread_message_count_for_user,
)
from chat.serializers import ChatRoomSerializer, MessageSerializer
from chat.services.messaging import (
    delete_room as delete_chat_room,
    get_or_create_room as get_or_create_chat_room,
    get_room_for_participant,
    mark_visible_messages_as_read,
    send_message as send_chat_message,
)
from core.api import domain_error_response
from core.exceptions import DomainError, DomainValidationError


def _parse_int_query_param(raw_value: str | None, field_name: str) -> int:
    if raw_value is None:
        raise DomainValidationError(f"{field_name} is required")
    try:
        return int(raw_value)
    except (TypeError, ValueError) as exc:
        raise DomainValidationError(f"{field_name} must be an integer") from exc


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def room_list(request):
    rooms = chat_rooms_for_user(request.user)
    serializer = ChatRoomSerializer(rooms, many=True)
    return Response({"rooms": serializer.data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    return Response({"unread_count": unread_message_count_for_user(request.user)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_history(request, room_id):
    try:
        room = get_room_for_participant(room_id=room_id, user=request.user)
        after_id_raw = request.query_params.get("after_id")
        after_id = None
        if after_id_raw is not None:
            after_id = _parse_int_query_param(after_id_raw, "after_id")
        messages = ordered_room_messages(room=room, after_id=after_id)
        mark_visible_messages_as_read(room=room, reader=request.user, after_id=after_id)
    except DomainError as exc:
        return domain_error_response(exc)
    serializer = MessageSerializer(messages, many=True)
    return Response({"messages": serializer.data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request, room_id):
    try:
        room = get_room_for_participant(room_id=room_id, user=request.user)
        receiver_id = _parse_int_query_param(
            request.data.get("receiver_id"), "receiver_id"
        )
        message = send_chat_message(
            room=room,
            sender=request.user,
            receiver_id=receiver_id,
            content=str(request.data.get("content", "")),
        )
    except DomainError as exc:
        return domain_error_response(exc)
    serializer = MessageSerializer(message)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_or_create_room(request):
    try:
        room = get_or_create_chat_room(
            requester=request.user,
            other_user_id=_parse_int_query_param(
                request.query_params.get("other_user_id"),
                "other_user_id",
            ),
            item_id=_parse_int_query_param(
                request.query_params.get("listing_id"),
                "listing_id",
            ),
        )
    except DomainError as exc:
        return domain_error_response(exc)
    serializer = ChatRoomSerializer(room)
    return Response({"room": serializer.data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_room_as_read(request, room_id):
    try:
        room = get_room_for_participant(room_id=room_id, user=request.user)
        unread_count = mark_visible_messages_as_read(room=room, reader=request.user)
    except DomainError as exc:
        return domain_error_response(exc)
    return Response(
        {
            "success": True,
            "message": f"Marked {unread_count} messages as read",
            "unread_count": 0,
        }
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_room(request, room_id):
    try:
        room = get_room_for_participant(room_id=room_id, user=request.user)
        delete_chat_room(room=room, actor=request.user)
    except DomainError as exc:
        return domain_error_response(exc)
    return Response({"success": "Chat room deleted successfully"})
