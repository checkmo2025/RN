import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Load the real API and pagination code without the native HTTP/auth runtime.
function loadTypeScript(path, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function('require', 'exports', outputText)((name) => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    return imports[name];
  }, exports);
  return exports;
}

function createFeedApi(requestJson) {
  return loadTypeScript('../src/services/api/newsApi.ts', {
    './http': { requestJson, unwrapResult: (response) => response.result },
    '../../utils/pagination': loadTypeScript('../src/utils/pagination.ts'),
  });
}

test('collects every page, preserves order and selects deduplicated promotions', async () => {
  const cursors = [];
  const { fetchNewsFeed } = createFeedApi(async (path, options) => {
    assert.equal(path, '/news');
    assert.equal(options.method, 'GET');
    cursors.push(options.query.cursorId);
    return { result: options.query.cursorId === undefined ? {
      basicInfoList: [
        { newsId: 5, title: '일반 소식', carousel: 'GENERAL' },
        { newsId: 4, title: '첫 프로모션', carousel: 'PROMOTION' },
      ],
      hasNext: true,
      nextCursor: 4,
    } : {
      basicInfoList: [
        { newsId: 4, title: '중복 프로모션', carousel: 'PROMOTION' },
        { newsId: 3, title: '다음 페이지 프로모션', carousel: 'PROMOTION', summary: '소개',
          thumbnailUrl: 'https://example.com/news.jpg', originalLink: 'https://example.com/news' },
        { newsId: 2, title: '분류 없는 소식' },
      ],
      hasNext: false,
    } };
  });

  const { items, promotions } = await fetchNewsFeed();
  assert.deepEqual(cursors, [undefined, 4]);
  assert.deepEqual(items.map((item) => item.id), [5, 4, 3, 2]);
  assert.deepEqual(promotions.map((item) => item.id), [4, 3]);
  assert.equal(promotions[0].title, '첫 프로모션');
  assert.equal(promotions[1], items[2]);
  assert.equal(promotions[1].excerpt, '소개');
  assert.equal(promotions[1].thumbnailUrl, 'https://example.com/news.jpg');
  assert.equal(promotions[1].originalLink, 'https://example.com/news');
});

test('returns no promotions for empty or general-only feeds', async () => {
  for (const basicInfoList of [[], [{ newsId: 1, title: '일반', carousel: 'GENERAL' }]]) {
    const { fetchNewsFeed } = createFeedApi(async () => ({ result: { basicInfoList } }));
    const feed = await fetchNewsFeed();
    assert.equal(feed.items.length, basicInfoList.length);
    assert.deepEqual(feed.promotions, []);
  }
});

test('stops when the server repeats a cursor', async () => {
  let calls = 0;
  const { fetchNewsFeed } = createFeedApi(async () => {
    assert.ok(++calls <= 2, 'Repeated cursor must not request another page');
    return { result: {
      basicInfoList: [{ newsId: 1, title: '프로모션', carousel: 'PROMOTION' }],
      hasNext: true,
      nextCursor: 1,
    } };
  });
  const feed = await fetchNewsFeed();
  assert.equal(calls, 2);
  assert.equal(feed.promotions.length, 1);
});

test('stops after 100 pages by default', async () => {
  let calls = 0;
  const { fetchNewsFeed } = createFeedApi(async () => {
    calls += 1;
    return { result: {
      basicInfoList: [{ newsId: calls, title: `소식 ${calls}` }],
      hasNext: true,
      nextCursor: calls,
    } };
  });
  await fetchNewsFeed();
  assert.equal(calls, 100);
});

test('propagates a later page error so screens can keep their fallback handling', async () => {
  const failure = new Error('Network unavailable');
  const { fetchNewsFeed } = createFeedApi(async (_path, { query }) => {
    if (query.cursorId !== undefined) throw failure;
    return { result: {
      basicInfoList: [{ newsId: 1, title: '프로모션', carousel: 'PROMOTION' }],
      hasNext: true,
      nextCursor: 1,
    } };
  });
  await assert.rejects(fetchNewsFeed, (error) => error === failure);
});

test('fetches current data again on refresh', async () => {
  let calls = 0;
  const { fetchNewsFeed } = createFeedApi(async () => ({ result: {
    basicInfoList: [{ newsId: ++calls, title: '프로모션', carousel: 'PROMOTION' }],
  } }));
  assert.equal((await fetchNewsFeed()).promotions[0].id, 1);
  assert.equal((await fetchNewsFeed()).promotions[0].id, 2);
});
