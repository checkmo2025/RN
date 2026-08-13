import path from 'node:path';

import { AutomationAuthError } from '../book-story-automation/auth-client.mjs';
import { DEFAULT_DRAFT_PATH, readDraft, saveDraft } from './draft.mjs';
import { uploadLocalImage, validateLocalImageFile } from './image-client.mjs';
import {
  createAndVerifyNews,
  findPotentialDuplicate,
  resolveRequesterEmail,
} from './news-client.mjs';

function optionValue(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

const shouldPublish = process.argv.includes('--confirm');
const configuredDraftPath = optionValue('draft');
const draftPath = configuredDraftPath ? path.resolve(configuredDraftPath) : DEFAULT_DRAFT_PATH;
const selectedIds = new Set(
  (optionValue('ids') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

function safeMessage(error) {
  return error instanceof AutomationAuthError
    ? error.message
    : '소식 처리 중 안전하게 표시할 수 없는 오류가 발생했습니다.';
}

async function validatePublicationImages(item) {
  if (!item.thumbnail.localPath) {
    throw new AutomationAuthError(`${item.id} 대표 이미지가 아직 준비되지 않았습니다.`);
  }
  const thumbnail = await validateLocalImageFile(item.thumbnail.localPath, `${item.id} 대표 이미지`);
  const detailImages = [];
  for (let index = 0; index < item.imageFiles.length; index += 1) {
    detailImages.push(
      await validateLocalImageFile(item.imageFiles[index], `${item.id} 상세 이미지 ${index + 1}`),
    );
  }
  return { thumbnail, detailImages };
}

function printPreview(draft, items) {
  console.log(`소식 초안 ${items.length}개를 검증했습니다.`);
  for (const item of items) {
    const imageState = item.thumbnail.localPath ? '준비됨' : '승인 후 제작 필요';
    console.log(
      `- ${item.id} | ${item.category} | ${item.region} | ${item.progressStatus} | ${item.title} | 이미지 ${imageState}`,
    );
  }
  console.log(`출처 최종 확인: ${draft.sourceCheckedAt}`);
}

async function main() {
  const loaded = await readDraft(draftPath);
  let draft = loaded.draft;
  const items =
    selectedIds.size > 0 ? draft.items.filter((item) => selectedIds.has(item.id)) : draft.items;

  if (selectedIds.size > 0 && items.length !== selectedIds.size) {
    const found = new Set(items.map((item) => item.id));
    const missing = [...selectedIds].filter((id) => !found.has(id));
    throw new AutomationAuthError(`초안에서 승인 ID를 찾지 못했습니다: ${missing.join(', ')}`);
  }
  printPreview(draft, items);

  if (!shouldPublish) {
    console.log('미리보기만 완료했습니다. 서버·키체인·이미지 저장소는 변경하지 않았습니다.');
    console.log('실제 업로드는 승인할 ID를 명시해 npm run news:publish -- --ids=ID1,ID2 로 실행합니다.');
    return;
  }
  if (selectedIds.size === 0) {
    throw new AutomationAuthError('실제 업로드에는 --ids=ID1,ID2 승인 목록이 반드시 필요합니다.');
  }
  const invalidState = items.find((item) => item.workflowStatus !== 'DRAFT');
  if (invalidState) {
    throw new AutomationAuthError(
      `${invalidState.id} 상태가 ${invalidState.workflowStatus}이므로 자동 업로드할 수 없습니다.`,
    );
  }

  const validatedImages = new Map();
  for (const item of items) {
    validatedImages.set(item.id, await validatePublicationImages(item));
  }

  const requesterEmail = await resolveRequesterEmail();
  console.log('관리자 권한과 로그인 계정의 소식 작성자 연결을 확인했습니다.');

  let failed = false;
  for (const item of items) {
    let uploadStarted = false;
    try {
      const duplicate = await findPotentialDuplicate(item);
      if (duplicate) {
        throw new AutomationAuthError(
          `${duplicate.reason}의 기존 소식 ${duplicate.newsId}번을 발견해 업로드를 중단했습니다.`,
        );
      }

      uploadStarted = true;
      const images = validatedImages.get(item.id);
      const thumbnailUrl = await uploadLocalImage(images.thumbnail);
      const imageUrls = [];
      for (const detailImage of images.detailImages) {
        imageUrls.push(await uploadLocalImage(detailImage));
      }

      const newsId = await createAndVerifyNews(item, requesterEmail, { thumbnailUrl, imageUrls });
      draft = {
        ...draft,
        items: draft.items.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                workflowStatus: 'PUBLISHED',
                result: {
                  newsId,
                  publishedAt: new Date().toISOString(),
                  message: '등록 및 관리자·공개 상세 검증 완료',
                },
              }
            : candidate,
        ),
      };
      await saveDraft(draftPath, draft);
      console.log(`${item.id}: 소식 ${newsId}번 등록과 공개 검증을 완료했습니다.`);
    } catch (error) {
      failed = true;
      const message = safeMessage(error);
      console.error(`${item.id}: ${message}`);
      if (uploadStarted) {
        draft = {
          ...draft,
          items: draft.items.map((candidate) =>
            candidate.id === item.id
              ? {
                  ...candidate,
                  workflowStatus: 'NEEDS_REVIEW',
                  result: {
                    reviewedAt: new Date().toISOString(),
                    message,
                  },
                }
              : candidate,
          ),
        };
        await saveDraft(draftPath, draft);
        console.error(`${item.id}: 성공 여부를 재검토해야 하므로 자동 재업로드가 잠겼습니다.`);
      }
    }
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`오류: ${safeMessage(error)}`);
  process.exitCode = 1;
});
