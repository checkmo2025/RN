import assert from 'node:assert/strict';
import test from 'node:test';

import { validateDraftObject } from './draft.mjs';

function validDraft() {
  return {
    version: 1,
    generatedAt: '2026-08-09T19:00:00+09:00',
    sourceCheckedAt: '2026-08-09T19:00:00+09:00',
    items: [
      {
        id: 'news-20260809-01',
        workflowStatus: 'DRAFT',
        category: '북페어',
        region: '강원',
        progressStatus: '개최예정',
        title: '공식 행사 제목',
        content: '검증된 공식 행사 소개입니다.',
        eventStartAt: '2026-09-01',
        eventEndAt: '2026-09-02',
        applicationDeadline: null,
        publishStartAt: '2026-08-09',
        publishEndAt: '2026-09-02',
        originalLink: 'https://example.org/event',
        carousel: 'GENERAL',
        thumbnail: {
          plan: 'GENERATED',
          sourceUrl: null,
          localPath: null,
          rightsNote: '승인 후 책모 전용 이미지를 제작',
        },
        imageFiles: [],
        source: {
          publisher: '공식 기관',
          pageUrl: 'https://example.org/event',
          checkedAt: '2026-08-09T19:00:00+09:00',
          evidence: '공식 페이지에서 직접 검증',
        },
      },
    ],
  };
}

test('validates a complete news draft', () => {
  const result = validateDraftObject(validDraft());
  assert.equal(result.items[0].title, '공식 행사 제목');
});

test('rejects duplicate source links', () => {
  const draft = validDraft();
  draft.items.push({
    ...draft.items[0],
    id: 'news-20260809-02',
    title: '다른 공식 행사 제목',
  });
  assert.throws(() => validateDraftObject(draft), /중복 원문 링크/);
});

test('rejects a title longer than the API limit', () => {
  const draft = validDraft();
  draft.items[0].title = '가'.repeat(41);
  assert.throws(() => validateDraftObject(draft), /40자 이하/);
});

test('rejects a reversed publish range', () => {
  const draft = validDraft();
  draft.items[0].publishStartAt = '2026-09-03';
  assert.throws(() => validateDraftObject(draft), /게시 종료일이 시작일보다 빠릅니다/);
});
