import axios from "axios";

const DEFAULT_ERROR_MESSAGE =
  "Something went wrong in PioneerMart. Please try again in a moment.";
const NETWORK_ERROR_MESSAGE =
  "We're having trouble connecting right now. Please try again in a moment.";

function normalizeDetail(detail: unknown): string | null {
  if (typeof detail === "string") {
    const t = detail.trim();
    return t.length > 0 ? t : null;
  }
  if (Array.isArray(detail)) {
    const parts: string[] = [];
    for (const item of detail) {
      if (typeof item === "string") {
        const t = item.trim();
        if (t) parts.push(t);
      }
    }
    if (parts.length > 0) return parts.join(" ");
  }
  return null;
}

/** First validation-style message from flat field keys (e.g. DRF `{ title: ["…"] }`). */
function firstFieldErrorMessage(obj: Record<string, unknown>): string | null {
  const skip = new Set(["detail", "error", "message", "errors"]);
  for (const [key, val] of Object.entries(obj)) {
    if (skip.has(key)) continue;
    const n = normalizeDetail(val);
    if (n) return n;
  }
  return null;
}

/**
 * Reads a human-readable message from API JSON if present.
 * Supports Pioneer Mart `{ error }`, DRF `{ detail }`, `{ message }`,
 * `{ non_field_errors }`, `{ errors: { … } }`, and per-field arrays.
 */
export function extractApiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;

  if (typeof d.error === "string") {
    const t = d.error.trim();
    if (t) return t;
  }
  if (typeof d.message === "string") {
    const t = d.message.trim();
    if (t) return t;
  }

  const fromDetail = normalizeDetail(d.detail);
  if (fromDetail) return fromDetail;

  if (Array.isArray(d.non_field_errors)) {
    const m = normalizeDetail(d.non_field_errors);
    if (m) return m;
  }

  if (d.errors && typeof d.errors === "object" && !Array.isArray(d.errors)) {
    const first = Object.values(d.errors as Record<string, unknown>)[0];
    const m = normalizeDetail(first);
    if (m) return m;
  }

  return firstFieldErrorMessage(d);
}

/** Server message when available, otherwise `fallback` (e.g. moderation copy). */
export function messageFromApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response?.data !== undefined) {
    const extracted = extractApiErrorMessage(error.response.data);
    if (extracted) return extracted;
  }
  return fallback;
}

function statusFallbackMessage(status: number): string {
  switch (status) {
    case 400:
      return "Something looks off with that request. Please review it and try again.";
    case 401:
      return "Your PioneerMart session has ended. Please sign in again.";
    case 403:
      return "That action isn’t available for your account.";
    case 404:
      return "We couldn’t find what you were looking for.";
    case 422:
      return "Some information needs another look. Please review it and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "PioneerMart is having trouble right now. Please try again in a moment.";
    default:
      return DEFAULT_ERROR_MESSAGE;
  }
}

/**
 * Prefer the API response body (`error`, `detail`, field errors), then map by HTTP status.
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return NETWORK_ERROR_MESSAGE;
    }
    const extracted = extractApiErrorMessage(error.response.data);
    if (extracted) return extracted;
    return statusFallbackMessage(error.response.status);
  }
  return DEFAULT_ERROR_MESSAGE;
};
