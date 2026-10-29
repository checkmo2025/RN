import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { source, evaluate, elements, listAttribute } from './list-render-test-helpers.mjs';
const meeting = source('src/screens/MeetingScreen.tsx'), file = source('src/screens/meeting/GroupBookshelfView.tsx');
const fn = file.nodes.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'GroupBookshelfBookRow');
const declaration = (name) => meeting.nodes.find((node) => ts.isVariableDeclaration(node) && node.name.getText(meeting.ast) === name).initializer;
const expression = fn.body.statements.find(ts.isReturnStatement).expression.getText(file.ast);
test('keeps two-book rows, order, incomplete rows and root list keys', () => {
  for (const count of [0, 1, 2, 3, 7]) {
    const items = Array.from({ length: count }, (_, i) => ({ id: `b${i}` }));
    const rows = evaluate(declaration('bookshelfRows').arguments[0].getText(meeting.ast), { visibleBookshelfItems: items })();
    assert.deepEqual(rows.flat(), items);
    assert.ok(rows.every((row) => row.length > 0 && row.length <= 2));
    const key = evaluate(listAttribute(meeting, 'ref={groupHomeScrollRef}', 'keyExtractor'));
    assert.deepEqual(rows.map(key), rows.map((row) => `bookshelf-row-${row[0].id}`));
    assert.equal(key({ id: 'comment' }), 'comment');
  }
  assert.doesNotMatch(file.text, /visibleBookshelfItems\.map/);
});
test('keeps cover, labels, rating and all detail tab targets', () => {
  const book = { id: 'b1', title: '도서', author: '저자', session: '1기', category: '문학', rating: 4, coverImage: 'cover' }, calls = [];
  const tree = evaluate(expression, { items: [book], openBookshelfDetail: (...args) => calls.push(args), getBookshelfCategoryBadgeStyle: () => 'badge', getStarIconName: () => 'star', formatAverageRating: (n) => String(n) });
  const nodes = elements(tree);
  for (const text of ['도서', '저자', '1기', '문학', '4']) assert.ok(nodes.some((node) => node.props.children === text));
  assert.equal(nodes.find((node) => node.type === 'Image').props.source.uri, 'cover');
  for (const button of nodes.filter((node) => node.type === 'Pressable')) button.props.onPress();
  assert.deepEqual(calls, ['TOPIC', 'TOPIC', 'REVIEW', 'REGULAR'].map((tab) => [book, tab]));
});
test('keeps membership, workspace load and grid mode gates', () => {
  const expression = declaration('showVirtualizedBookshelfGrid').getText(meeting.ast);
  for (const key of ['isMember', 'workspaceLoaded']) {
    assert.equal(evaluate(expression, { activeTab: 'bookshelf', isMember: true, workspaceLoaded: true, bookshelfViewMode: 'GRID', [key]: false }), false);
  }
  assert.equal(evaluate(expression, { activeTab: 'bookshelf', isMember: true, workspaceLoaded: true, bookshelfViewMode: 'DETAIL' }), false);
});
