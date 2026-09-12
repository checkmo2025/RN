import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const meetingText = readFileSync(new URL('../src/screens/MeetingScreen.tsx', import.meta.url), 'utf8');
const noticeText = readFileSync(
  new URL('../src/screens/meeting/GroupNoticeView.tsx', import.meta.url),
  'utf8',
);
const stylesText = readFileSync(
  new URL('../src/screens/meeting/meetingStyles.ts', import.meta.url),
  'utf8',
);
const meetingSource = ts.createSourceFile(
  'MeetingScreen.tsx',
  meetingText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const noticeSource = ts.createSourceFile(
  'GroupNoticeView.tsx',
  noticeText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function allNodes(source) {
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return nodes;
}

const rootList = allNodes(meetingSource).find(
  (node) =>
    ts.isJsxSelfClosingElement(node) &&
    node.tagName.getText(meetingSource) === 'FlatList' &&
    node.attributes.getText(meetingSource).includes('currentNoticeComments'),
);
assert.ok(rootList, 'Group home must use the comment-backed FlatList');

const rowType = allNodes(noticeSource).find(
  (node) => ts.isTypeAliasDeclaration(node) && node.name.text === 'GroupNoticeCommentRowProps',
);
const rowFunction = allNodes(noticeSource).find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'GroupNoticeCommentRow',
);
assert.ok(rowType && rowFunction, 'Production comment row must be extractable');

const { outputText } = ts.transpileModule(
  `
    const View = 'View', Text = 'Text', Image = 'Image', Pressable = 'Pressable';
    const DefaultProfileAvatar = 'DefaultProfileAvatar';
    const ImageGallery = 'ImageGallery';
    const MaterialIcons = 'MaterialIcons';
    const styles = new Proxy({}, { get: (_, key) => key });
    const colors = { gray4: 'gray4' };
    const useLanguage = () => ({ l: (text) => text });
    ${rowType.getText(noticeSource)}
    ${rowFunction.getText(noticeSource)}
  `,
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
);
const rowExports = {};
new Function('require', 'exports', outputText)(createRequire(import.meta.url), rowExports);
const renderRow = rowExports.GroupNoticeCommentRow;

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  return node?.props ? [node, ...elements(node.props.children)] : [];
}

const comments = Array.from({ length: 7 }, (_, index) => ({
  id: `comment-${index}`,
  author: `독서회원 ${index + 1}`,
  authorProfileImageUrl: index % 2 ? `profile-${index}` : undefined,
  isAuthor: index === 0,
  date: `2026.09.${String(index + 1).padStart(2, '0')}`,
  content: `댓글 내용 ${index + 1}`,
  imageUrls: index === 2 ? ['image-a', 'image-b'] : [],
}));

test('uses one vertical FlatList and preserves comment identity and order', () => {
  const attributes = rootList.attributes.getText(meetingSource);
  assert.match(
    attributes,
    /data=\{activeTab === 'notice' && selectedNotice && isMember \? currentNoticeComments : \[\]\}/,
  );
  assert.match(attributes, /keyExtractor=\{\(comment\) => comment\.id\}/);
  assert.match(attributes, /renderItem=\{renderNoticeComment\}/);
  assert.doesNotMatch(noticeText, /currentNoticeComments\.map/);

  for (const count of [0, 1, 20, 100, 500]) {
    const items = Array.from({ length: count }, (_, index) => ({ id: `comment-${index}` }));
    assert.deepEqual(items.map((item) => item.id), Array.from({ length: count }, (_, i) => `comment-${i}`));
  }
});

test('keeps non-members from receiving comment rows or list state', () => {
  const attributes = rootList.attributes.getText(meetingSource);
  assert.match(
    attributes,
    /data=\{activeTab === 'notice' && selectedNotice && isMember \? currentNoticeComments : \[\]\}/,
  );
  assert.match(attributes, /activeTab === 'notice' && selectedNotice && isMember \? \(/);
  assert.match(noticeText, /공지사항은 독서 모임의 회원이 되신 후 조회 가능합니다\./);
});

test('preserves comment text, profile targets, menu target and image viewer payload', () => {
  for (const comment of comments) {
    const navigations = [];
    const menus = [];
    const viewers = [];
    const event = { nativeEvent: { pageX: 12, pageY: 34 } };
    const row = renderRow({
      comment,
      navigation: { navigate: (...args) => navigations.push(args) },
      setPhotoViewer: (viewer) => viewers.push(viewer),
      handlePressCommentMenu: (...args) => menus.push(args),
    });
    const rowElements = elements(row);
    const texts = rowElements
      .filter((element) => element.type === 'Text')
      .map((element) => element.props.children);
    assert.deepEqual(
      texts,
      [comment.author, ...(comment.isAuthor ? ['작성자'] : []), comment.date, comment.content],
    );

    const pressables = rowElements.filter((element) => element.type === 'Pressable');
    pressables[0].props.onPress();
    pressables[1].props.onPress();
    pressables[2].props.onPress(event);
    assert.deepEqual(navigations, [
      ['UserProfile', { memberNickname: comment.author, fromScreen: 'Meeting' }],
      ['UserProfile', { memberNickname: comment.author, fromScreen: 'Meeting' }],
    ]);
    assert.deepEqual(menus, [[comment, event]]);

    const gallery = rowElements.find((element) => element.type === 'ImageGallery');
    gallery.props.onPressImage(1);
    assert.deepEqual(viewers, [{ photos: comment.imageUrls, index: 1 }]);
    assert.equal(
      Boolean(rowElements.find((element) => element.type === 'DefaultProfileAvatar')),
      !comment.authorProfileImageUrl,
    );
  }
});

test('keeps loading, error, empty and load-more states after the list', () => {
  const attributes = rootList.attributes.getText(meetingSource);
  for (const text of [
    '댓글을 불러오는 중...',
    '댓글을 불러오지 못했습니다.',
    '등록된 댓글이 없습니다.',
    '불러오는 중...',
  ]) {
    assert.ok(attributes.includes(text));
  }
  assert.match(attributes, /onPress=\{retryNoticeComments\}/);
  assert.match(attributes, /currentNoticeCommentPageState\?\.loadingMore/);
});

test('keeps the existing pagination trigger and programmatic scroll behavior', () => {
  assert.match(
    meetingText,
    /activeTab === 'notice' && selectedNotice\) \{\s*void loadMoreNoticeComments\(selectedNotice\)/,
  );
  assert.match(rootList.attributes.getText(meetingSource), /onScroll=\{handleGroupHomeScroll\}/);
  assert.equal((meetingText.match(/groupHomeScrollRef\.current\?\.scrollToOffset/g) ?? []).length, 3);
  assert.doesNotMatch(meetingText, /groupHomeScrollRef\.current\?\.scrollTo\(/);
});

test('keeps the notice card visually continuous without nesting another vertical list', () => {
  assert.match(noticeText, /styles\.noticeDetailVirtualizedHeader/);
  assert.match(meetingText, /styles\.noticeCommentVirtualizedCell/);
  assert.match(meetingText, /styles\.noticeCommentVirtualizedFooter/);
  assert.match(stylesText, /noticeDetailVirtualizedHeader:[\s\S]*?borderBottomWidth: 0/);
  assert.match(stylesText, /noticeCommentVirtualizedCell:[\s\S]*?borderLeftWidth: 1/);
  assert.match(stylesText, /noticeCommentVirtualizedFooter:[\s\S]*?borderBottomWidth: 1/);
});
