import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { source, evaluate, elements } from './list-render-test-helpers.mjs';
const meeting = source('src/screens/MeetingScreen.tsx'), file = source('src/screens/meeting/GroupBookshelfView.tsx');
const declaration = (name) => meeting.nodes.find((node) => ts.isVariableDeclaration(node) && node.name.getText(meeting.ast) === name).initializer;
const fn = file.nodes.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'GroupBookshelfRegularPostRow');
const expression = fn.body.statements.find(ts.isReturnStatement).expression.getText(file.ast);
test('keeps completion, pending state, author, content and exact team/post toggle target', () => {
  for (const completed of [false, true]) for (const isPending of [false, true]) {
    const post = { id: 'p1', author: '회원', content: '조 발제', completed, authorProfileImageUrl: 'profile' }, calls = [];
    const row = evaluate(expression, { post, groupId: 'team1', isPending, onToggle: (...args) => calls.push(args) });
    assert.equal(row.props.disabled, isPending);
    assert.ok(elements(row).some((node) => node.props.children === post.content));
    assert.equal(elements(row).find((node) => node.type === 'Image').props.source.uri, 'profile');
    assert.equal(elements(row).find((node) => node.type === 'MaterialIcons').props.color, completed ? '#3FBE78' : undefined);
    row.props.onPress(); assert.deepEqual(calls, [['team1', 'p1']]);
    assert.equal(row.props.style({ pressed: false }).includes('bookshelfGroupPostCardCompleted'), completed);
  }
});
test('only exposes regular posts for the loaded selected group and preserves data order', () => {
  const values = { activeTab: 'bookshelf', isMember: true, workspaceLoaded: true, bookshelfViewMode: 'DETAIL', bookshelfDetailTab: 'REGULAR', selectedBookshelfBook: {}, regularMeetingInfo: {}, selectedRegularGroup: { posts: [{ id: 'p1' }, { id: 'p2' }] }, currentBookshelfDetailLoadState: { regular: 'success' } };
  const gate = declaration('showVirtualizedRegularPosts').getText(meeting.ast);
  assert.equal(evaluate(gate, values), true);
  for (const overrides of [{ isMember: false }, { workspaceLoaded: false }, { selectedRegularGroup: null }, { regularMeetingInfo: null }, { bookshelfDetailTab: 'TOPIC' }, { currentBookshelfDetailLoadState: { regular: 'loading' } }, { currentBookshelfDetailLoadState: { regular: 'idle' } }]) assert.equal(evaluate(gate, { ...values, ...overrides }), false);
  const items = evaluate(declaration('groupHomeListItems').getText(meeting.ast), { ...values, showVirtualizedBookshelfTopics: false, showVirtualizedBookshelfReviews: false, showVirtualizedBookshelfGrid: false, showVirtualizedRegularPosts: true });
  assert.equal(items, values.selectedRegularGroup.posts);
  assert.doesNotMatch(file.text, /selectedRegularGroup.posts.map/);
  assert.match(file.text, /등록된 조 발제가 없습니다/);
});
