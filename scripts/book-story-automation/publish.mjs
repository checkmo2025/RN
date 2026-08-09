import {
  authProfileDisplayName,
  authProfileForPersona,
  AutomationAuthError,
} from './auth-client.mjs';
import { findExistingStory, publishBookStory, selectQueueBook } from './book-story-client.mjs';
import { readDraft, validateDraft } from './draft.mjs';
import { queuePersonaFromArgs, readQueue, updateQueueItem } from './queue.mjs';

const shouldPublish = process.argv.includes('--confirm');
let activeQueue = null;
let activeItem = null;

function publishedAt() {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

async function main() {
  const desiredPersona = queuePersonaFromArgs(process.argv.slice(2));
  activeQueue = await readQueue(undefined, desiredPersona);
  activeItem = activeQueue.nextItem;
  const draft = await readDraft();
  const validation = validateDraft(draft, activeItem);
  const book = await selectQueueBook(activeItem);
  const authProfile = authProfileForPersona(activeItem.persona);

  console.log(`책 확인: ${book.title} / ${book.author} / ${book.isbn}`);
  console.log(`게시 계정: ${authProfileDisplayName(authProfile)} 계정`);
  console.log(`제목: ${draft.title} (${validation.titleLength}자)`);
  console.log(`본문: ${validation.descriptionLength}자 / ${activeItem.persona}`);
  console.log('금칙어·이모지·분량 검사를 통과했습니다.');

  if (!shouldPublish) {
    console.log('미리보기만 완료했습니다. 실제 게시하려면 npm run book-story:publish를 실행해 주세요.');
    return;
  }

  const existingStory = await findExistingStory(book.isbn, draft.title, authProfile);
  if (existingStory) {
    throw new AutomationAuthError(
      `같은 책과 제목의 내 게시물(${existingStory.bookStoryId}번)이 이미 있어 중복 게시를 중단했습니다.`,
    );
  }

  const bookStoryId = await publishBookStory(
    {
      isbn: book.isbn,
      title: draft.title,
      description: draft.description,
    },
    authProfile,
  );
  await updateQueueItem(activeQueue, activeItem, {
    status: '완료',
    result: `게시 완료 · 책이야기 ID ${bookStoryId} · ${publishedAt()}`,
  });

  console.log(`책이야기 ${bookStoryId}번 게시와 서버 검증을 완료했습니다.`);
  console.log('자동화 목록의 작성 여부를 완료로 변경했습니다.');
}

main().catch(async (error) => {
  const message =
    error instanceof AutomationAuthError ? error.message : '책이야기 처리 중 오류가 발생했습니다.';
  console.error(`오류: ${message}`);

  if (shouldPublish && activeQueue && activeItem) {
    try {
      await updateQueueItem(activeQueue, activeItem, {
        status: '작성전',
        result: `게시 실패 · ${message}`,
      });
    } catch {
      console.error('자동화 목록에 실패 사유를 기록하지 못했습니다.');
    }
  }
  process.exitCode = 1;
});
