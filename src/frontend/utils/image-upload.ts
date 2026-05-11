import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export type UploadableImage = {
  uri: string;
  file?: File | null;
  fileName?: string | null;
  mimeType?: string | null;
  existing?: boolean;
};

function normalizeImageUri(uri: string): string {
  if (Platform.OS !== "android") {
    return uri.replace("file://", "");
  }

  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    return uri;
  }

  return `file://${uri}`;
}

function inferImageName(image: UploadableImage, fallbackName: string): string {
  const candidate = image.file?.name || image.fileName;
  if (candidate) {
    return candidate;
  }

  const lastSegment = image.uri.split("/").pop()?.split("?")[0] ?? "";
  if (!lastSegment || !lastSegment.includes(".")) {
    return fallbackName;
  }
  return lastSegment;
}

function inferImageType(image: UploadableImage, fileName: string): string {
  if (image.file?.type) {
    return image.file.type;
  }
  if (image.mimeType) {
    return image.mimeType;
  }

  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".png")) {
    return "image/png";
  }
  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }
  if (normalized.endsWith(".heic")) {
    return "image/heic";
  }
  return "image/jpeg";
}

export function createPickedImage(
  asset: ImagePicker.ImagePickerAsset,
): UploadableImage {
  return {
    uri: asset.uri,
    file:
      Platform.OS === "web" && "file" in asset
        ? ((asset.file as File | undefined) ?? null)
        : null,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    existing: false,
  };
}

export function createCapturedImage(uri: string): UploadableImage {
  return {
    uri,
    existing: false,
  };
}

export function createExistingImage(uri: string): UploadableImage {
  return {
    uri,
    existing: true,
  };
}

export function isExistingImage(image: UploadableImage): boolean {
  return image.existing === true;
}

async function createWebFile(
  image: UploadableImage,
  fallbackName: string,
): Promise<File> {
  if (image.file instanceof File) {
    return image.file;
  }

  const response = await fetch(image.uri);
  if (!response.ok) {
    throw new Error("Failed to read selected image.");
  }

  const blob = await response.blob();
  const fileName = inferImageName(image, fallbackName);
  const mimeType = blob.type || inferImageType(image, fileName);
  return new File([blob], fileName, { type: mimeType });
}

export async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  image: UploadableImage,
  fallbackName = "image.jpg",
): Promise<void> {
  const fileName = inferImageName(image, fallbackName);

  if (Platform.OS === "web") {
    formData.append(fieldName, await createWebFile(image, fallbackName));
    return;
  }

  formData.append(fieldName, {
    uri: normalizeImageUri(image.uri),
    name: fileName,
    type: inferImageType(image, fileName),
  } as unknown as Blob);
}
