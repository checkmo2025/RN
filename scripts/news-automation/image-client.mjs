import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  authenticatedApiRequest,
  AutomationAuthError,
} from '../book-story-automation/auth-client.mjs';
import { resolveWorkspacePath } from './draft.mjs';

const execFileAsync = promisify(execFile);
const MAX_IMAGE_BYTES = 1_000_000;
const MIN_WIDTH = 1040;
const MIN_HEIGHT = 424;
const MIN_ASPECT_RATIO = 2.15;
const MAX_ASPECT_RATIO = 2.75;
const MIME_BY_EXTENSION = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

async function imageDimensions(filePath) {
  try {
    const { stdout } = await execFileAsync('/usr/bin/sips', [
      '-g',
      'pixelWidth',
      '-g',
      'pixelHeight',
      filePath,
    ]);
    const width = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const height = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1]);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) throw new Error();
    return { width, height };
  } catch {
    throw new AutomationAuthError(`이미지 크기를 확인하지 못했습니다: ${path.basename(filePath)}`);
  }
}

export async function validateLocalImageFile(configuredPath, label = '이미지') {
  const filePath = resolveWorkspacePath(configuredPath);
  let info;
  try {
    info = await stat(filePath);
  } catch {
    throw new AutomationAuthError(`${label} 파일을 찾지 못했습니다: ${configuredPath}`);
  }
  if (!info.isFile()) throw new AutomationAuthError(`${label} 경로가 파일이 아닙니다.`);
  if (info.size > MAX_IMAGE_BYTES) {
    throw new AutomationAuthError(
      `${label}는 1MB 이하여야 합니다. 현재 ${Math.ceil(info.size / 1024)}KB입니다.`,
    );
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_BY_EXTENSION.get(extension);
  if (!contentType) {
    throw new AutomationAuthError(`${label}는 JPG, PNG 또는 WebP 파일이어야 합니다.`);
  }

  const { width, height } = await imageDimensions(filePath);
  const ratio = width / height;
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    throw new AutomationAuthError(
      `${label}는 최소 ${MIN_WIDTH}×${MIN_HEIGHT}px이어야 합니다. 현재 ${width}×${height}px입니다.`,
    );
  }
  if (ratio < MIN_ASPECT_RATIO || ratio > MAX_ASPECT_RATIO) {
    throw new AutomationAuthError(
      `${label} 가로세로 비율은 2.15~2.75여야 합니다. 현재 ${ratio.toFixed(2)}입니다.`,
    );
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    contentType,
    bytes: info.size,
    width,
    height,
  };
}

export async function uploadLocalImage(validatedImage) {
  const payload = await authenticatedApiRequest('/image/NOTICE/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalFileName: validatedImage.fileName,
      contentType: validatedImage.contentType,
    }),
  });
  const presignedUrl = payload?.result?.presignedUrl;
  const imageUrl = payload?.result?.imageUrl;
  if (typeof presignedUrl !== 'string' || typeof imageUrl !== 'string') {
    throw new AutomationAuthError('이미지 업로드 주소를 서버에서 확인하지 못했습니다.');
  }

  const body = await readFile(validatedImage.filePath);
  let response;
  try {
    response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': validatedImage.contentType },
      body,
    });
  } catch {
    throw new AutomationAuthError('이미지 저장소에 연결하지 못했습니다.');
  }
  if (!response.ok) {
    throw new AutomationAuthError(`이미지 업로드에 실패했습니다. (HTTP ${response.status})`);
  }
  return imageUrl;
}
