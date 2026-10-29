import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function evaluate(source, imports = {}) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', output)((name) => imports[name] ?? require(name), exports);
  return exports;
}
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const image = evaluate(read('src/utils/image.ts'), { '../services/api/http': { API_ORIGIN_URL: 'https://api.example.test' } });
let payload;
const requests = [];
const api = evaluate(read('src/services/api/bookApi.ts'), {
  './http': { requestJson: async (...args) => { requests.push(args); return payload; }, unwrapResult: (value) => value.result },
  '../../utils/image': image,
  '../../utils/nickname': { encodeNicknamePathSegment: encodeURIComponent },
});
test('ISBN, YES24 link and both providers’ covers survive normalization; fallback has no link', async () => {
  const isbn = '9788936434595';
  for (const host of ['image.yes24.com', 'image.aladin.co.kr']) {
    payload = { result: { isbn, itemId: 123, title: '책', imgUrl: `https://${host}/cover.jpg`, link: 'https://www.yes24.com/Product/Goods/123' } };
    const result = await api.fetchBookDetail(isbn);
    assert.equal(result.isbn, isbn);
    assert.equal(result.bookId, undefined);
    assert.equal(result.imgUrl, payload.result.imgUrl);
    assert.equal(result.link, payload.result.link);
  }
  payload.result.link = null;
  assert.equal((await api.fetchBookDetail(isbn)).link, undefined);
  assert.equal(requests.at(-1)[0], `/books/${isbn}`);
});
test('empty filtered page keeps server pagination and next request page', async () => {
  payload = { result: { detailInfoList: [], currentPage: 1, hasNext: true, totalResults: 25 } };
  assert.deepEqual(await api.searchBooks('세트', 1), { items: [], currentPage: 1, hasNext: true, totalResults: 25 });
  await api.searchBooks('세트', 2);
  assert.equal(requests.at(-1)[1].query.page, 2);
});
for (const [path, hasNext, loading, loadMore] of [
  ['src/components/common/AppHeader.tsx', 'searchHasNext', 'searchLoadingMore', 'loadMoreSearchResults'],
  ['src/screens/StoryScreen.tsx', 'bookSearchHasNext', 'bookSearchLoadingMore', 'loadMoreBookSearch'],
  ['src/screens/meeting/GroupManagementOverlay.tsx', 'bookshelfBookSearchHasNext', 'bookshelfBookSearchLoadingMore', 'loadMoreBookshelfBookSearch'],
]) {
  test(`${path}: empty page can advance and disables repeated loading`, () => {
    const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let expression;
    const visit = (node) => {
      if (ts.isConditionalExpression(node) && node.condition.getText(source) === hasNext && node.getText(source).includes('다음 검색 결과 보기')) expression = node.getText(source);
      ts.forEachChild(node, visit);
    };
    visit(source);
    assert.ok(expression);
    const { render } = evaluate(`const Pressable='Pressable', Text='Text', styles={}, l=(s)=>s;
      export const render = (${hasNext}, ${loading}, ${loadMore}) => (${expression});`);
    let calls = 0;
    const button = render(true, false, () => { calls++; });
    assert.equal(button.type, 'Pressable');
    button.props.onPress();
    assert.equal(calls, 1);
    assert.equal(render(true, true, () => {}).props.disabled, true);
    assert.equal(render(false, false, () => {}).type, 'Text');
  });
}

test('detail card keeps compose action; external icon opens provider link only when present', () => {
  const source = ts.createSourceFile('AppHeader.tsx', read('src/components/common/AppHeader.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let card, external;
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === 'Pressable') {
      const attrs = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(a => [a.name.getText(source), a.initializer && ts.isJsxExpression(a.initializer) ? a.initializer.expression?.getText(source) : undefined]));
      if (attrs.onPress === '() => openStoryCompose(selectedBook)') card = attrs;
      if (attrs.style?.includes('styles.resultWriteButton') && attrs.onPress?.includes('selectedBook.link')) external = attrs;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(card); assert.ok(external);
  const { actions } = evaluate(`export const actions = (selectedBook, openStoryCompose, openBookUrl) => ({compose: ${card.onPress}, disabled: ${external.disabled}, open: ${external.onPress}});`);
  for (const link of [undefined, 'https://www.yes24.com/Product/Goods/123']) {
    const book = { isbn: '9788936434595', link };
    let composed, opened, stopped = false;
    const a = actions(book, b => { composed = b; }, url => { opened = url; });
    a.compose(); assert.equal(composed, book);
    assert.equal(a.disabled, !link);
    a.open({ stopPropagation: () => { stopped = true; } });
    assert.equal(stopped, true); assert.equal(opened, link);
  }
});
