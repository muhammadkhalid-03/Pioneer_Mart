import { Platform } from "react-native";

function normalizeImageUri(uri: string): string {
  if (Platform.OS !== "android") {
    return uri.replace("file://", "");
  }

  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    return uri;
  }

  return `file://${uri}`;
}

function inferImageName(uri: string, fallbackName: string): string {
  const lastSegment = uri.split("/").pop()?.split("?")[0] ?? "";
  if (!lastSegment || !lastSegment.includes(".")) {
    return fallbackName;
  }
  return lastSegment;
}

function inferImageType(fileName: string): string {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".png")) {
    return "image/png";
  }
  return "image/jpeg";
}

export function createImageFormValue(
  uri: string,
  fallbackName = "image.jpg",
): Blob {
  const fileName = inferImageName(uri, fallbackName);

  return {
    uri: normalizeImageUri(uri),
    name: fileName,
    type: inferImageType(fileName),
  } as unknown as Blob;
}
