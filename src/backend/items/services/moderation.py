from __future__ import annotations

import os

import requests

from core.exceptions import DomainValidationError

SE_API_USER = os.getenv("SE_API_USER", "")
SE_SECRET_KEY = os.getenv("SE_SECRET_KEY", "")
SE_WORKFLOW = os.getenv("SE_WORKFLOW", "")

SIGHTENGINE_TEXT_URL = "https://api.sightengine.com/1.0/text/check.json"
SIGHTENGINE_IMAGE_URL = "https://api.sightengine.com/1.0/check-workflow.json"

HIGH_RISK_CATEGORIES = ("profanity", "drug", "extremism", "violence")


def moderate_text(*, text: str) -> dict:
    if not SE_API_USER or not SE_SECRET_KEY:
        return {"status": "success", "skipped": True}

    response = requests.post(
        SIGHTENGINE_TEXT_URL,
        data={
            "text": text,
            "lang": "en",
            "api_user": SE_API_USER,
            "api_secret": SE_SECRET_KEY,
            "mode": "rules",
            "categories": ",".join(HIGH_RISK_CATEGORIES),
        },
        timeout=15,
    )
    result = response.json()

    if result.get("status") == "failure":
        raise DomainValidationError("Text validation failed. Please try again.")

    for category in HIGH_RISK_CATEGORIES:
        matches = result.get(category, {}).get("matches", [])
        if matches and matches[0].get("intensity") == "high":
            raise DomainValidationError(
                "Content contains prohibited material. "
                "Please ensure text is free of profanity, illegal content, "
                "extremism, and violence."
            )
    return result


def moderate_image(*, image_file) -> dict:
    if not SE_API_USER or not SE_SECRET_KEY or not SE_WORKFLOW:
        return {"status": "success", "skipped": True}

    response = requests.post(
        SIGHTENGINE_IMAGE_URL,
        data={
            "workflow": SE_WORKFLOW,
            "api_user": SE_API_USER,
            "api_secret": SE_SECRET_KEY,
        },
        files={"media": image_file},
        timeout=30,
    )
    result = response.json()

    if result.get("status") == "failure":
        raise DomainValidationError("Image validation failed. Please try again.")

    summary = result.get("summary", {})
    if summary.get("action") == "reject":
        reasons = summary.get("reject_reason", [])
        reason_text = (
            reasons[0].get("text", "Image rejected") if reasons else "Image rejected"
        )
        raise DomainValidationError(reason_text)

    return result
