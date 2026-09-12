import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

// Execute the screen's real render expressions; native layout and hook scheduling are excluded.
const source = ts.createSourceFile('UserProfileScreen.tsx', readFileSync(
  new URL('../src/screens/UserProfileScreen.tsx', import.meta.url), 'utf8',
), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const screen = source.statements.find((node) => node.name?.text === 'UserProfileScreen');
const declarations = screen.body.statements.filter(ts.isVariableStatement);
const start = declarations.findIndex((node) => node.declarationList.declarations[0].name.text === 'handleOpenStoryDetail');
const end = declarations.findIndex((node) => node.declarationList.declarations[0].name.text === 'renderTabContent');
assert.ok(start >= 0 && end > start, 'Screen render declarations must be present');
const nodes = [];
function visit(node) { nodes.push(node); ts.forEachChild(node, visit); }
visit(screen);
const mainList = nodes.find((node) => ts.isJsxSelfClosingElement(node)
  && node.tagName.getText(source) === 'FlatList'
  && node.attributes.getText(source).includes('showBookRows'));
assert.ok(mainList, 'Public library must use the main virtualized list');
const props = mainList.attributes.properties.filter((node) =>
  ['data', 'keyExtractor', 'renderItem'].includes(node.name?.text));
const status = nodes.find((node) => ts.isJsxElement(node)
  && node.openingElement.attributes.getText(source).includes('showGridStatus'));
assert.ok(status, 'Main list status must be present');
const { outputText } = ts.transpileModule(`
  export function render({ books = [], stories = [], groups = [], activeTab = '서재',
    loadingBooks = false, profileLoading = false, refreshing = false, navigation } = {}) {
    const useMemo = (fn) => fn(), useCallback = (fn) => fn;
    const l = (text) => text, loadingGroups = false;
    const styles = new Proxy({}, { get: (_, key) => key });
    const colors = {}, BOOK_DEFAULT_IMAGE = 'default-cover';
    const View = 'View', Text = 'Text', Pressable = 'Pressable', Image = 'Image';
    const SkeletonBox = 'SkeletonBox', MaterialIcons = 'MaterialIcons';
    const LikeIcon = 'LikeIcon', CommentIcon = 'CommentIcon', FlatList = 'FlatList';
    ${declarations.slice(start, end + 1).map((node) => node.getText(source)).join('\n')}
    return { list: <FlatList ${props.map((node) => node.getText(source)).join(' ')} />,
      status: ${status.getText(source)} };
  }
`, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
const exports = {};
new Function('require', 'exports', outputText)(createRequire(import.meta.url), exports);
const { render } = exports;
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  return node?.props ? [node, ...elements(node.props.children)] : [];
}
const renderedCards = (list) => list.props.data.flatMap((item, index) =>
  elements(list.props.renderItem({ item, index })).filter((node) => node.type === 'Pressable'));
const books = Array.from({ length: 7 }, (_, i) => ({ id: `id-${i}`, isbn: `isbn-${i}`,
  bookId: i + 1, title: `제목 ${i}`, author: `저자 ${i}`, imageUrl: i ? `cover-${i}` : undefined }));

test('keeps book identity and order, including incomplete final rows and large libraries', () => {
  for (const count of [0, 1, 2, 3, 4, 7, 19, 100, 500]) {
    const items = Array.from({ length: count }, (_, i) => ({ ...books[i % 7], id: `id-${i}` }));
    const { list } = render({ books: items });
    assert.deepEqual(list.props.data.flat(), items);
    list.props.data.flat().forEach((book, index) => assert.equal(book, items[index]));
    assert.ok(list.props.data.every((row) => row.length >= 1 && row.length <= 3));
    assert.deepEqual(renderedCards(list).map((node) => node.key), items.map((book) => book.id));
  }
});

test('preserves displayed text, cover fallback, badge and book detail payload for every card', () => {
  const navigations = [];
  const { list } = render({ books, navigation: { navigate: (...args) => navigations.push(args) } });
  renderedCards(list).forEach((card, index) => {
    const children = elements(card);
    assert.deepEqual(children.filter((node) => node.type === 'Text').map((node) =>
      [node.props.children, node.props.numberOfLines]), [[books[index].title, 1], [books[index].author, 1]]);
    assert.equal(children.find((node) => node.type === 'Image').props.source.uri, books[index].imageUrl || 'default-cover');
    assert.equal(children.find((node) => node.type === 'MaterialIcons').props.name, 'favorite');
    card.props.onPress();
  });
  assert.deepEqual(navigations, books.map(({ isbn, bookId, title, author, imageUrl }) =>
    ['Tabs', { screen: 'Home', params: { openSearchBook: { isbn, bookId, title, author, imgUrl: imageUrl } } }]));
});

test('empty library shows the original message only after loading', () => {
  for (const loadingBooks of [false, true]) {
    const { list, status } = render({ loadingBooks });
    assert.equal(list.props.data.length, 0);
    assert.deepEqual(elements(status).filter((node) => node.type === 'Text').map((node) => node.props.children),
      loadingBooks ? [] : ['공개된 서재가 없습니다.']);
    assert.equal(elements(status).filter((node) => node.type === 'SkeletonBox' && node.props.style === 'bookThumb').length,
      loadingBooks ? 6 : 0);
  }
});

test('refresh retains old books together with all six library skeletons', () => {
  for (const profileLoading of [false, true]) {
    const { list, status } = render({ books, refreshing: true, loadingBooks: true, profileLoading });
    assert.deepEqual(list.props.data.flat(), books);
    assert.equal(elements(status).filter((node) => node.type === 'SkeletonBox' && node.props.style === 'bookThumb').length, 6);
  }
});

test('initial profile loading masks both the library and its empty message', () => {
  const { list, status } = render({ books, profileLoading: true, loadingBooks: true });
  assert.equal(list.props.data.length, 0);
  assert.equal(elements(status).filter((node) => node.type === 'SkeletonBox').length, 3);
  assert.equal(elements(status).filter((node) => node.type === 'Text').length, 0);
});

test('tab selection uses story rows or group content without leaking books', () => {
  const stories = [{ id: 'id-0', remoteId: 42, title: '책 이야기', excerpt: '본문', likes: 1, comments: 2 }];
  const navigations = [];
  const library = render({ books }).list;
  const story = render({ books, stories, activeTab: '책 이야기', navigation: { navigate: (...args) => navigations.push(args) } }).list;
  assert.deepEqual(story.props.data.flat(), stories);
  assert.notEqual(library.props.keyExtractor(library.props.data[0]), story.props.keyExtractor(story.props.data[0]));
  renderedCards(story)[0].props.onPress();
  assert.deepEqual(navigations, [['Tabs', { screen: 'Story', params: { openStoryId: 42 } }]]);
  const groups = render({ books, activeTab: '모임' });
  assert.equal(groups.list.props.data.length, 0);
  assert.ok(elements(groups.status).some((node) => node.props.children === '공개된 모임이 없습니다.'));
});
