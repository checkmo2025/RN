import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const sourceText = readFileSync(
  new URL('../src/screens/meeting/GroupManagementOverlay.tsx', import.meta.url),
  'utf8',
);
const source = ts.createSourceFile(
  'GroupManagementOverlay.tsx',
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const nodes = [];
function visit(node) {
  nodes.push(node);
  ts.forEachChild(node, visit);
}
visit(source);

const memberList = nodes.find(
  (node) =>
    ts.isJsxSelfClosingElement(node) &&
    node.tagName.getText(source) === 'FlatList' &&
    node.attributes.getText(source).includes('data={members}'),
);
assert.ok(memberList, 'Member management must render a FlatList');

const { outputText } = ts.transpileModule(
  `
    export function render({ members = [], refreshingMembers = false, submittingMemberAction = false,
      selectedIds = [], refreshed = [] } = {}) {
      const l = (text, values = {}) => text.replace(/\\{(\\w+)\\}/g, (_, key) => String(values[key] ?? key));
      const styles = new Proxy({}, { get: (_, key) => key });
      const colors = { primary1: 'primary1' };
      const managementScreenContentBottomPadding = 96;
      const View = 'View', Text = 'Text', Image = 'Image', Pressable = 'Pressable';
      const FlatList = 'FlatList', RefreshControl = 'RefreshControl';
      const DefaultProfileAvatar = 'DefaultProfileAvatar';
      const handleRefreshMembers = () => refreshed.push(true);
      const setSelectedMemberActionId = (id) => selectedIds.push(id);
      return ${memberList.getText(source)};
    }
  `,
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
);
const exports = {};
new Function('require', 'exports', outputText)(createRequire(import.meta.url), exports);
const { render } = exports;

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  return node?.props ? [node, ...elements(node.props.children)] : [];
}

const members = Array.from({ length: 7 }, (_, index) => ({
  id: `member-${index}`,
  nickname: `닉네임 ${index}`,
  name: `이름 ${index}`,
  email: `member${index}@example.com`,
  joinedAt: `2026-09-${String(index + 1).padStart(2, '0')}`,
  role: index === 0 ? '개설자' : index === 1 ? '운영진' : '회원',
  profileImageUrl: index % 2 ? `profile-${index}` : undefined,
}));

test('keeps member identity, order and lazy list data for large clubs', () => {
  for (const count of [0, 1, 20, 100, 500]) {
    const items = Array.from({ length: count }, (_, index) => ({
      ...members[index % members.length],
      id: `member-${index}`,
    }));
    const list = render({ members: items });
    assert.equal(list.type, 'FlatList');
    assert.equal(list.props.data, items);
    assert.deepEqual(items.map(list.props.keyExtractor), items.map((member) => member.id));
  }
});

test('preserves member text, role style, profile image and action target', () => {
  const selectedIds = [];
  const list = render({ members, selectedIds });
  members.forEach((member, index) => {
    const card = list.props.renderItem({ item: member, index });
    const cardElements = elements(card);
    const texts = cardElements
      .filter((element) => element.type === 'Text')
      .map((element) => element.props.children);
    assert.deepEqual(texts, [
      member.nickname,
      member.name,
      member.role,
      member.email,
      `가입일 ${member.joinedAt}`,
      '역할 수정',
    ]);
    const image = cardElements.find((element) => element.type === 'Image');
    const avatar = cardElements.find((element) => element.type === 'DefaultProfileAvatar');
    assert.equal(image?.props.source.uri, member.profileImageUrl);
    assert.equal(Boolean(avatar), !member.profileImageUrl);
    cardElements.find(
      (element) =>
        element.type === 'Pressable' &&
        elements(element).some((child) => child.props?.children === '역할 수정'),
    ).props.onPress();
  });
  assert.deepEqual(selectedIds, members.map((member) => member.id));
});

test('preserves empty, disabled and pull-to-refresh states', () => {
  const refreshed = [];
  const empty = render({ refreshingMembers: true, submittingMemberAction: true, refreshed });
  assert.equal(empty.props.ListEmptyComponent.props.children.props.children, '조회된 회원이 없습니다.');
  assert.equal(empty.props.refreshControl.props.refreshing, true);
  empty.props.refreshControl.props.onRefresh();
  assert.deepEqual(refreshed, [true]);

  const populated = render({ members, submittingMemberAction: true });
  members.forEach((member, index) => {
    const button = elements(populated.props.renderItem({ item: member, index })).find(
      (element) => element.type === 'Pressable',
    );
    assert.equal(button.props.disabled, true);
  });
});

test('keeps the original summary copy and count', () => {
  const list = render({ members });
  const texts = elements(list.props.ListHeaderComponent)
    .filter((element) => element.type === 'Text')
    .map((element) => element.props.children);
  assert.deepEqual(texts, [
    '회원 역할 관리',
    '회원 역할을 수정하거나 운영진 권한을 조정할 수 있습니다.',
    `회원 ${members.length}`,
  ]);
});

test('leaves the other management screens on the existing ScrollView', () => {
  assert.match(sourceText, /activeManagementScreen === 'JOIN_REQUESTS'/);
  assert.match(sourceText, /activeManagementScreen === 'EDIT'/);
  assert.match(sourceText, /activeManagementScreen === 'BOOKSHELF_CREATE'/);
  assert.match(sourceText, /\) : \(\s*<ScrollView/);
});
