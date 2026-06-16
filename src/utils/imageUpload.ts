import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { showToast } from './toast';

export function inferMimeType(fileName?: string, fallback?: string): string {
  if (typeof fallback === 'string' && fallback.startsWith('image/')) return fallback;
  const extension = fileName?.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

type PresignedMeta = { presignedUrl: string; imageUrl: string };
type GetPresignedUrl = (
  fileName: string,
  contentType: string,
) => Promise<PresignedMeta | null | undefined>;

export async function uploadImageFromUri(
  uri: string,
  fileName: string,
  contentType: string,
  getPresignedUrl: GetPresignedUrl,
): Promise<string | null> {
  const uploadMeta = await getPresignedUrl(fileName, contentType);
  if (!uploadMeta?.presignedUrl || !uploadMeta.imageUrl) {
    showToast('이미지 업로드 준비에 실패했습니다.');
    return null;
  }

  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();
  const uploadResponse = await fetch(uploadMeta.presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  if (!uploadResponse.ok) {
    showToast('이미지 업로드에 실패했습니다.');
    return null;
  }

  return uploadMeta.imageUrl;
}

export async function pickAndUploadImage(
  getPresignedUrl: GetPresignedUrl,
  fileNamePrefix = 'image',
): Promise<string | null> {
  if (Platform.OS !== 'android') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('사진 접근 권한이 필요합니다.');
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.9,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const fileName = asset.fileName ?? `${fileNamePrefix}_${Date.now()}.jpg`;
  const contentType = inferMimeType(fileName, asset.mimeType);

  return uploadImageFromUri(asset.uri, fileName, contentType, getPresignedUrl);
}
