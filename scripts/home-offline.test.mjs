import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const text = readFileSync(new URL('../src/screens/HomeScreen.tsx', import.meta.url), 'utf8');
const source = ts.createSourceFile('HomeScreen.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes = [];
function visit(node) {
  nodes.push(node);
  ts.forEachChild(node, visit);
}
visit(source);
const declaration = (name) => nodes.find((node) =>
  ts.isVariableDeclaration(node) && node.name.getText(source) === name);
const callback = declaration('loadPosts').initializer.arguments[0].getText(source);
const initialHasNext = declaration('hasNextPostsRef').initializer.arguments[0].kind === ts.SyntaxKind.TrueKeyword;
const { outputText } = ts.transpileModule(`const loadPosts = ${callback};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
});

class ApiError extends Error {}
const offline = () => new ApiError('네트워크 연결을 확인해 주십시오.');
const page = (ids, hasNext = false, nextCursor = null) => ({
  items: ids.map((id) => ({ id: `post-${id}`, remoteId: id, author: 'reader' })),
  hasNext,
  nextCursor,
});

function harness(fetchPage, isLoggedIn = true) {
  const state = { posts: [], loading: false, loadingMore: false, error: null };
  const calls = [];
  const fetchFeed = async (...args) => {
    calls.push(args);
    return fetchPage(...args);
  };
  const dependencies = {
    accessPolicy: { canViewBookStoryFeed: true },
    loadingPostsRef: { current: false },
    loadingMorePostsRef: { current: false },
    hasNextPostsRef: { current: initialHasNext },
    nextPostsCursorRef: { current: null },
    setLoadingPosts: (value) => { state.loading = value; },
    setLoadingMorePosts: (value) => { state.loadingMore = value; },
    setPostsLoadError: (value) => { state.error = value; },
    setPosts: (update) => { state.posts = update(state.posts); },
    fetchBookStories: fetchFeed,
    fetchGuestAllBookStories: fetchFeed,
    mergeGuestAllBookStoriesCache: () => {},
    mapRemoteStoryToPost: (item) => item,
    isBlockedMemberNickname: () => false,
    isLoggedIn,
    ApiError,
    showToast: () => {},
    resolveApiError: (error, _overrides, fallback) => error.message || fallback,
    l: (value) => value,
  };
  const load = new Function(...Object.keys(dependencies), `${outputText}\nreturn loadPosts;`)(
    ...Object.values(dependencies),
  );
  return { state, calls, load };
}

test('does not request an additional page before the initial load succeeds', async () => {
  const h = harness(async () => page([]));
  await h.load();
  assert.equal(h.calls.length, 0);
});

test('initial loading and pagination cannot run concurrently', async () => {
  let finish;
  const h = harness(() => new Promise((resolve) => { finish = resolve; }));
  const pending = h.load({ reset: true });
  void h.load();
  void h.load({ reset: true });
  assert.equal(h.calls.length, 1);
  finish(page([3], true, 3));
  await pending;
  assert.equal(h.state.loading, false);
});

test('offline failure blocks 20 further end events and stops both loading indicators', async () => {
  for (const loggedIn of [true, false]) {
    const h = harness(async () => { throw offline(); }, loggedIn);
    await h.load({ reset: true });
    for (let i = 0; i < 20; i += 1) await h.load();
    assert.equal(h.calls.length, 1);
    assert.equal(h.state.loading, false);
    assert.equal(h.state.loadingMore, false);
    assert.equal(h.state.error, offline().message);
  }
});

test('manual refresh recovers and resumes ordered, deduplicated pagination', async () => {
  let online = false;
  const h = harness(async (_scope, cursor) => {
    if (!online) throw offline();
    return cursor === undefined ? page([3, 2], true, 2) : page([2, 1]);
  });
  await h.load({ reset: true });
  online = true;
  await h.load({ reset: true, forceRefresh: true });
  assert.equal(h.state.error, null);
  await h.load();
  await h.load();
  assert.deepEqual(h.state.posts.map((post) => post.remoteId), [3, 2, 1]);
  assert.equal(h.calls.length, 3);
  assert.equal(h.calls[2][1], 2);
});

test('later page failure preserves visible posts and waits for manual retry', async () => {
  const h = harness(async (_scope, cursor) => {
    if (cursor !== undefined) throw offline();
    return page([3, 2], true, 2);
  });
  await h.load({ reset: true });
  await h.load();
  for (let i = 0; i < 20; i += 1) await h.load();
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.state.posts.map((post) => post.remoteId), [3, 2]);
  assert.equal(h.state.loadingMore, false);
  assert.equal(h.state.error, offline().message);
});

test('refresh cannot race an in-flight additional page', async () => {
  let finish;
  const h = harness(async (_scope, cursor) => cursor === undefined
    ? page([3], true, 3)
    : new Promise((resolve) => { finish = resolve; }));
  await h.load({ reset: true });
  const pending = h.load();
  await h.load({ reset: true });
  assert.equal(h.calls.length, 2);
  finish(page([2]));
  await pending;
  assert.deepEqual(h.state.posts.map((post) => post.remoteId), [3, 2]);
});

test('successful empty feed ends pagination without an error', async () => {
  const h = harness(async () => page([]));
  await h.load({ reset: true });
  await h.load();
  assert.equal(h.calls.length, 1);
  assert.equal(h.state.error, null);
  assert.deepEqual(h.state.posts, []);
});

test('error UI replaces the empty message and offers an explicit refresh', () => {
  function renderProp(name, state, loadPosts = () => {}) {
    const attr = nodes.find((node) => ts.isJsxAttribute(node) && node.name.getText(source) === name);
    const { outputText } = ts.transpileModule(`const render = () => (${attr.initializer.expression.getText(source)});`, {
      compilerOptions: { jsx: ts.JsxEmit.React },
    });
    const deps = {
      ...state, loadPosts, l: (value) => value,
      View: 'View', Text: 'Text', Pressable: 'Pressable', styles: {},
      React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    };
    return new Function(...Object.keys(deps), `${outputText}\nreturn render();`)(...Object.values(deps));
  }
  const state = { loadingPosts: false, loadingMorePosts: false, postsLoadError: offline().message };
  assert.equal(renderProp('ListEmptyComponent', state), null);
  let retryOptions;
  const footer = renderProp('ListFooterComponent', state, (options) => { retryOptions = options; });
  assert.equal(footer.children[0].children[0], offline().message);
  const button = footer.children[1];
  assert.equal(button.props.accessibilityRole, 'button');
  button.props.onPress();
  assert.deepEqual(retryOptions, { reset: true, forceRefresh: true });
  const loading = renderProp('ListFooterComponent', { ...state, loadingPosts: true, postsLoadError: null });
  assert.equal(loading.children[0], '불러오는 중...');
  assert.equal(renderProp('ListFooterComponent', { ...state, postsLoadError: null }), null);
});
