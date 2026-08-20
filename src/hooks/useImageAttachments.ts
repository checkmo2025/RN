import { useCallback, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import {
  issueImageUploadUrl,
  type ImageUploadType,
} from '../services/api/authApi';
import { inferMimeType, uploadImageFromUri } from '../utils/imageUpload';
import { showToast } from '../utils/toast';
import { useLanguage } from '../contexts/LanguageContext';

const SUPPORTED_EXTENSION_PATTERN = /\.(?:jpe?g|png|webp|gif|heic|heif)$/i;
const SUPPORTED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

export type ImageAttachment = {
  id: string;
  previewUri: string;
  imageUrl?: string;
  local?: {
    uri: string;
    fileName: string;
    contentType: string;
    sourceKey: string;
  };
};

function extensionForContentType(contentType?: string | null): string {
  switch (contentType?.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'jpg';
  }
}

function toLocalAttachment(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
): ImageAttachment | null {
  const sourceKey = asset.assetId?.trim() || asset.uri;
  const fallbackName = `image_${Date.now()}_${index}.${extensionForContentType(asset.mimeType)}`;
  const fileName =
    asset.fileName && SUPPORTED_EXTENSION_PATTERN.test(asset.fileName)
      ? asset.fileName
      : fallbackName;
  const contentType = inferMimeType(fileName, asset.mimeType ?? undefined);
  if (!SUPPORTED_CONTENT_TYPES.has(contentType.toLowerCase())) return null;

  return {
    id: `local-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    previewUri: asset.uri,
    local: {
      uri: asset.uri,
      fileName,
      contentType,
      sourceKey,
    },
  };
}

function toRemoteAttachment(imageUrl: string, index: number): ImageAttachment {
  return {
    id: `remote-${index}-${imageUrl}`,
    previewUri: imageUrl,
    imageUrl,
  };
}

export function useImageAttachments(initialImageUrls: string[] = [], maxCount = 5) {
  const { l } = useLanguage();
  const [baselineUrls, setBaselineUrls] = useState([...initialImageUrls]);
  const [items, setItems] = useState<ImageAttachment[]>(() =>
    initialImageUrls.map(toRemoteAttachment),
  );
  const [isUploading, setIsUploading] = useState(false);

  const isDirty = useMemo(() => {
    if (items.some((item) => item.local && !item.imageUrl)) return true;
    return items.map((item) => item.imageUrl ?? '').join('\n') !== baselineUrls.join('\n');
  }, [baselineUrls, items]);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const reset = useCallback((imageUrls: string[] = []) => {
    setBaselineUrls([...imageUrls]);
    setItems(imageUrls.map(toRemoteAttachment));
  }, []);

  const pickFromLibrary = useCallback(async () => {
    const remaining = Math.max(0, maxCount - items.length);
    if (remaining === 0) {
      showToast(l('이미지는 최대 {limit}개까지 첨부할 수 있습니다.', { limit: maxCount }));
      return;
    }

    if (Platform.OS !== 'android') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast(l('사진 접근 권한이 필요합니다.'));
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      orderedSelection: true,
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) return;

    const existingKeys = new Set(
      items.flatMap((item) => (item.local?.sourceKey ? [item.local.sourceKey] : [])),
    );
    const additions: ImageAttachment[] = [];
    let hasUnsupportedAsset = false;
    result.assets.forEach((asset, index) => {
      const attachment = toLocalAttachment(asset, index);
      if (!attachment) {
        hasUnsupportedAsset = true;
        return;
      }
      const sourceKey = attachment.local?.sourceKey;
      if (!sourceKey || existingKeys.has(sourceKey)) return;
      existingKeys.add(sourceKey);
      additions.push(attachment);
    });

    if (hasUnsupportedAsset) {
      showToast(l('지원하지 않는 이미지 형식은 첨부할 수 없습니다.'));
    }
    if (additions.length === 0) return;
    setItems((current) => [...current, ...additions].slice(0, maxCount));
  }, [items, l, maxCount]);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const move = useCallback((id: string, direction: -1 | 1) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }, []);

  const resolveImageUrls = useCallback(async (uploadType: ImageUploadType): Promise<string[]> => {
    setIsUploading(true);
    try {
      const resolvedUrls: string[] = [];
      for (const item of items) {
        if (item.imageUrl) {
          resolvedUrls.push(item.imageUrl);
          continue;
        }
        if (!item.local) {
          throw new Error('업로드할 이미지 정보를 찾을 수 없습니다.');
        }

        const imageUrl = await uploadImageFromUri(
          item.local.uri,
          item.local.fileName,
          item.local.contentType,
          (fileName, contentType) => issueImageUploadUrl(uploadType, fileName, contentType),
        );
        if (!imageUrl) throw new Error('이미지 업로드에 실패했습니다.');

        resolvedUrls.push(imageUrl);
        setItems((current) =>
          current.map((currentItem) =>
            currentItem.id === item.id
              ? { ...currentItem, imageUrl, previewUri: imageUrl }
              : currentItem,
          ),
        );
      }
      return resolvedUrls;
    } finally {
      setIsUploading(false);
    }
  }, [items]);

  const getIsDirty = useCallback(() => isDirtyRef.current, []);

  return {
    items,
    maxCount,
    isDirty,
    isUploading,
    pickFromLibrary,
    remove,
    move,
    reset,
    resolveImageUrls,
    getIsDirty,
  };
}

export type ImageAttachmentsController = ReturnType<typeof useImageAttachments>;
