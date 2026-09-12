import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import test, { after } from 'node:test';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const parse = (code) => ts.createSourceFile('source.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function compile(code, imports = {}) {
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function('require', 'exports', outputText)((name) => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    return imports[name];
  }, exports);
  return exports;
}
const httpSource = parse(read('src/services/api/http.ts'));
const http = compile(httpSource.statements.filter((node) =>
  ['ApiError', 'isProfileIncompleteApiError'].includes(node.name?.text)
  || node.declarationList?.declarations[0].name.text === 'PROFILE_INCOMPLETE_MESSAGE')
  .map((node) => node.getText(httpSource)).join('\n'));
const image = compile(read('src/utils/image.ts'), { '../services/api/http': { API_ORIGIN_URL: 'https://api.checkmo.co.kr' } });
const pagination = compile(read('src/utils/pagination.ts'));

function createLoaderFactory(code) {
  const source = parse(code);
  const screen = source.statements.find((node) => node.name?.text === 'UserProfileScreen');
  const loader = screen.body.statements.find((node) =>
    node.declarationList?.declarations[0].name.text === 'loadProfile');
  const helpers = source.statements.filter((node) =>
    ['mapRemoteStoryToCard', 'resolveStoryFeedErrorMessage'].includes(node.name?.text));
  assert.ok(loader && helpers.length === 2);
  return compile(`export function createLoader(env) {
    const { memberNickname, fetchMemberProfile, fetchMemberBookStories, setProfile, setStories,
      showToast, ApiError, PROFILE_INCOMPLETE_MESSAGE, isProfileIncompleteApiError,
      normalizeRemoteImageUrl, collectAllCursorPages } = env;
    const useCallback = (fn) => fn, l = (text) => text;
    ${helpers.map((node) => node.getText(source)).join('\n')}
    ${loader.getText(source)}
    return loadProfile;
  }`).createLoader;
}
// The baseline is the real committed implementation, not a copied test algorithm.
const beforeRef = 'f0d9b77';
const before = createLoaderFactory(execFileSync('git', ['show', `${beforeRef}:src/screens/UserProfileScreen.tsx`], {
  cwd: root, encoding: 'utf8',
}));
const current = createLoaderFactory(read('src/screens/UserProfileScreen.tsx'));
const observations = [];
let mismatches = 0;
const story = (id, title = `글 ${id}`) => ({ id, title, description: `본문 ${id}`, likeCount: id, commentCount: 0,
  bookInfo: { imgUrl: ' https://example.com/cover.jpg ' } });
const page = (items, hasNext = false, nextCursor = null) => ({ items, hasNext, nextCursor });
async function run(factory, getPage, profileFailure) {
  const trace = [];
  let request = 0, error;
  const load = factory({ ...http, ...image, ...pagination, memberNickname: '테스트_회원',
    fetchMemberProfile: async (nickname) => {
      trace.push(['profile-request', nickname]);
      if (profileFailure) throw profileFailure;
      return { nickname };
    },
    fetchMemberBookStories: async (nickname, cursor) => {
      trace.push(['story-request', nickname, cursor]);
      return getPage(request++, cursor);
    },
    setProfile: (value) => trace.push(['profile-state', value]),
    setStories: (value) => trace.push(['story-state', value]),
    showToast: (value) => trace.push(['toast', value]),
  });
  try { await load(); } catch (caught) { error = caught; }
  return { trace, error };
}
async function compare(name, getPage, profileFailure) {
  const old = await run(before, getPage, profileFailure);
  const next = await run(current, getPage, profileFailure);
  try { assert.deepEqual(next, old, `${name}: API, state or error trace changed`); }
  catch (error) { mismatches += 1; throw error; }
  const requests = (result) => result.trace.filter(([event]) => event === 'story-request');
  observations.push({ name, equivalent: true, beforeRequests: requests(old).length,
    afterRequests: requests(next).length, cursors: requests(next).map(([, , cursor]) => String(cursor)),
    ids: next.trace.find(([event]) => event === 'story-state')?.[1].map((item) => item.id),
    toast: next.trace.find(([event]) => event === 'toast')?.[1] });
  return next;
}
test('keeps first duplicate, source order, mapped content and profile-before-story sequence', async () => {
  const result = await compare('normal-duplicates', (index) => [
    page([story(3), story(2)], true, 2), page([story(2, '중복'), story(1)]),
  ][index]);
  assert.deepEqual(result.trace.map(([event]) => event),
    ['profile-request', 'profile-state', 'story-request', 'story-request', 'story-state']);
  assert.deepEqual(result.trace[2], ['story-request', '테스트_회원', undefined]);
  assert.deepEqual(result.trace[4][1], [3, 2, 1].map((id) => ({
    id: `story-${id}`, remoteId: id, title: `글 ${id}`, excerpt: `본문 ${id}`, likes: id, comments: 0,
    imageUrl: 'https://example.com/cover.jpg',
  })));
});
test('empty result finishes after one page', async () => {
  const result = await compare('empty', () => page([]));
  assert.deepEqual(result.trace.at(-1), ['story-state', []]);
  assert.equal(observations.at(-1).afterRequests, 1);
});
test('repeated cursor stops after processing the page that repeats it', async () => {
  const result = await compare('repeated-cursor', (i) => page([story(i + 1)], true, 7));
  assert.equal(observations.at(-1).afterRequests, 2);
  assert.equal(result.trace.at(-1)[1].length, 2);
});
test('non-number cursors stop, while numeric zero remains a valid next cursor', async () => {
  for (const cursor of [undefined, null, '2']) {
    await compare(`invalid-cursor-${String(cursor)}`, () => ({ ...page([story(1)], true), nextCursor: cursor }));
    assert.equal(observations.at(-1).afterRequests, 1);
  }
  await compare('zero-cursor', (i) => i === 0 ? page([story(1)], true, 0) : page([story(2)]));
  assert.deepEqual(observations.at(-1).cursors, ['undefined', '0']);
});
test('never requests page 101 when the server keeps returning next pages', async () => {
  const result = await compare('100-page-limit', (i) => page([story(i + 1)], true, i + 1));
  assert.equal(observations.at(-1).afterRequests, 100);
  assert.equal(result.trace.at(-1)[1].length, 100);
});
test('later-page errors clear partial stories and retain all existing error messages', async () => {
  const errors = [
    [new Error('network'), '책이야기를 불러오지 못했습니다.'],
    [new http.ApiError('server', 401), '로그인 상태를 확인해 주십시오.'],
    [new http.ApiError('server', 403, 'AUTH_403'), '프로필을 완성해 주세요.'],
    [new http.ApiError('server', 403), '접근 권한이 없습니다.'],
    [new http.ApiError('server', 404), '요청한 책이야기를 찾을 수 없습니다.'],
    [new http.ApiError(' 서버 오류 ', 500), '서버 오류'],
  ];
  for (const [failure, message] of errors) {
    const result = await compare(`story-error-${message}`, (i) => {
      if (i) throw failure;
      return page([story(1)], true, 1);
    });
    assert.deepEqual(result.trace.slice(-2), [['story-state', []], ['toast', message]]);
    assert.equal(result.error, undefined);
  }
});
test('profile failure propagates before requesting or replacing stories', async () => {
  const failure = new Error('profile failed');
  const result = await compare('profile-error', () => assert.fail('must not request stories'), failure);
  assert.equal(result.error, failure);
  assert.deepEqual(result.trace, [['profile-request', '테스트_회원']]);
});
test('100 reproducible generated page sequences have identical complete traces', async () => {
  let seed = 20260912;
  const random = (limit) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % limit; };
  for (let i = 0; i < 100; i += 1) {
    const count = 1 + random(12);
    const pages = Array.from({ length: count }, (_, index) => page(
      Array.from({ length: random(8) }, () => story(1 + random(20))),
      index < count - 1, random(10) === 0 ? null : random(15),
    ));
    await compare(`seeded-${i + 1}`, (index) => pages[index]);
  }
});
after(() => {
  if (!process.env.CHECKMO_PAGINATION_REPORT) return;
  writeFileSync(process.env.CHECKMO_PAGINATION_REPORT, JSON.stringify({
    measuredAt: new Date().toISOString(), beforeRef, cases: observations.length,
    mismatches, timingMeasured: false, observations,
  }, null, 2) + '\n');
});
