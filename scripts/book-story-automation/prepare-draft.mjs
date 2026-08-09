import { AutomationAuthError } from './auth-client.mjs';
import { createDraftTemplate, DEFAULT_DRAFT_PATH } from './draft.mjs';
import { readQueue } from './queue.mjs';

async function main() {
  const queue = await readQueue();
  const draftPath = await createDraftTemplate(queue.nextItem, DEFAULT_DRAFT_PATH, {
    overwrite: process.argv.includes('--force'),
  });
  console.log(`초안 틀을 만들었습니다: ${draftPath}`);
  console.log(`${queue.nextItem.bookTitle} / ${queue.nextItem.author} / ${queue.nextItem.persona}`);
}

main().catch((error) => {
  if (error?.code === 'EEXIST') {
    console.error(`오류: 기존 초안이 있습니다. 검토하거나 삭제한 뒤 다시 실행해 주세요: ${DEFAULT_DRAFT_PATH}`);
  } else {
    const message =
      error instanceof AutomationAuthError ? error.message : '초안 준비 중 오류가 발생했습니다.';
    console.error(`오류: ${message}`);
  }
  process.exitCode = 1;
});
