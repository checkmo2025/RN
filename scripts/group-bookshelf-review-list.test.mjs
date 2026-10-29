import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const meetingText = readFileSync(new URL('../src/screens/MeetingScreen.tsx', import.meta.url), 'utf8');
const bookshelfText = readFileSync(
  new URL('../src/screens/meeting/GroupBookshelfView.tsx', import.meta.url),
  'utf8',
);
const meetingSource = ts.createSourceFile(
  'MeetingScreen.tsx', meetingText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
);
const bookshelfSource = ts.createSourceFile(
  'GroupBookshelfView.tsx', bookshelfText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
);

function allNodes(source) {
  const result = [];
  const visit = (node) => {
    result.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

const rootList = allNodes(meetingSource).find(
  (node) =>
    ts.isJsxSelfClosingElement(node) &&
    node.tagName.getText(meetingSource) === 'FlatList' &&
    node.attributes.getText(meetingSource).includes('ref={groupHomeScrollRef}'),
);
assert.ok(rootList, 'Group home root FlatList not found');

const rowFunction = allNodes(bookshelfSource).find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'GroupBookshelfReviewRow',
);
assert.ok(rowFunction, 'Production review row must be extractable');
const { outputText } = ts.transpileModule(
  `
    const View = 'View', Text = 'Text', Image = 'Image', Pressable = 'Pressable';
    const DefaultProfileAvatar = 'DefaultProfileAvatar', MaterialIcons = 'MaterialIcons';
    const styles = new Proxy({}, { get: (_, key) => key });
    const colors = { gray2: 'gray2', gray4: 'gray4', secondary2: 'secondary2' };
    const getStarIconName = (rating, index) => rating >= index + 1 ? 'star' : 'star-border';
    ${rowFunction.getText(bookshelfSource)}
  `,
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
);
const rowExports = {};
new Function('require', 'exports', outputText)(createRequire(import.meta.url), rowExports);
const renderRow = rowExports.GroupBookshelfReviewRow;

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  return node?.props ? [node, ...elements(node.props.children)] : [];
}

test('feeds review items to the existing root FlatList without reordering', () => {
  const attributes = rootList.attributes.getText(meetingSource);
  assert.match(attributes, /data=\{groupHomeListItems\}/);
  assert.match(attributes, /keyExtractor=\{\(item\) => item\.id\}/);
  assert.match(attributes, /renderItem=\{renderGroupHomeListItem\}/);
  assert.match(meetingText, /showVirtualizedBookshelfReviews\s*\? bookshelfReviewItems/);
  assert.doesNotMatch(bookshelfText, /bookshelfReviewItems\.map/);

  for (const count of [0, 1, 20, 100, 500]) {
    const ids = Array.from({ length: count }, (_, index) => `review-${index}`);
    assert.deepEqual([...ids], ids);
  }
});

test('preserves review author, content, rating, avatar and menu target', () => {
  const item = {
    id: 'review-7', remoteId: 7, type: 'REVIEW', author: '책모 회원',
    content: '한줄평 내용', rating: 3, authorProfileImageUrl: 'profile-url',
  };
  const calls = [];
  const event = { nativeEvent: { pageX: 10, pageY: 20 } };
  const row = renderRow({
    item,
    handlePressBookshelfPostMenu: (...args) => calls.push(args),
  });
  const rowElements = elements(row);
  const texts = rowElements
    .filter((element) => element.type === 'Text')
    .map((element) => element.props.children);
  assert.deepEqual(texts, [item.author, item.content]);
  assert.equal(rowElements.find((element) => element.type === 'Image').props.source.uri, 'profile-url');
  assert.deepEqual(
    rowElements.filter((element) => element.type === 'MaterialIcons').map((element) => element.props.name),
    ['more-vert', 'star', 'star', 'star', 'star-border', 'star-border'],
  );
  rowElements.find((element) => element.type === 'Pressable').props.onPress(event);
  assert.deepEqual(calls, [[item, event]]);

  const fallback = renderRow({
    item: { ...item, authorProfileImageUrl: undefined },
    handlePressBookshelfPostMenu: () => {},
  });
  assert.ok(elements(fallback).find((element) => element.type === 'DefaultProfileAvatar'));
});

test('keeps membership, detail-tab and selected-book gates', () => {
  for (const fragment of [
    "activeTab === 'bookshelf'", 'isMember', "bookshelfViewMode === 'DETAIL'",
    "bookshelfDetailTab === 'REVIEW'", 'selectedBookshelfBook !== null',
  ]) {
    assert.ok(meetingText.includes(fragment));
  }
});

test('keeps loading, error, empty and retry states after review rows', () => {
  const footerFunction = allNodes(bookshelfSource).find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'GroupBookshelfReviewFooter',
  );
  assert.ok(footerFunction);
  const footer = footerFunction.getText(bookshelfSource);
  for (const text of [
    '한줄평을 불러오는 중...', '한줄평을 불러오지 못했습니다.', '등록된 한줄평이 없습니다.',
  ]) {
    assert.ok(footer.includes(text));
  }
  assert.match(footer, /onPress=\{onRetry\}/);
  assert.match(meetingText, /retryBookshelfDetailSection\('review'\)/);
});

test('keeps root scrolling, detail focus and topic rendering', () => {
  assert.match(rootList.attributes.getText(meetingSource), /onScroll=\{handleGroupHomeScroll\}/);
  assert.match(meetingText, /item\.type === 'REVIEW'/);
  assert.match(meetingText, /showVirtualizedBookshelfTopics\s*\? bookshelfTopicItems/);
  assert.match(bookshelfText, /bookshelfDetailTab === 'REGULAR'/);
  assert.match(meetingText, /bookshelfDetailTab === 'TOPIC' \|\| bookshelfDetailTab === 'REVIEW'/);
  assert.match(meetingText, /Math\.max\(groupTitleFocusOffset, bookshelfDetailFocusOffset\)/);
});
