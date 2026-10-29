import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { source, evaluate, elements, listAttribute } from './list-render-test-helpers.mjs';
const file = source('src/screens/UserProfileScreen.tsx');
const declaration = (name) => file.nodes.find((node) => ts.isVariableDeclaration(node) && node.name.getText(file.ast) === name).initializer;
const attr = (name) => listAttribute(file, 'data={showStoryRows', name);
test('keeps accessible group name, visit target and menu coordinates', () => {
  const item = { id: 'g1', clubId: 11, name: '공개 모임' }, calls = [];
  const render = evaluate(declaration('renderGroupItem').arguments[0].getText(file.ast), {
    handleVisitGroupByClubId: (id) => calls.push(id), handleOpenGroupMenu: (...args) => calls.push(args),
  });
  const nodes = elements(render({ item }));
  assert.equal(nodes[0].props.accessibilityLabel, '공개 모임 방문하기');
  nodes[0].props.onPress();
  nodes.find((node) => node.props.hitSlop === 8).props.onPress({ stopPropagation: () => calls.push('stop'), nativeEvent: { pageX: 5, pageY: 6 } });
  assert.deepEqual(calls, [11, 'stop', [5, 6, 11]]);
});
test('keeps loading mask and refresh behavior while routing group data to the root list', () => {
  const groups = [{ id: 'g' }];
  for (const [profileLoading, refreshing, expected] of [[false, false, true], [true, false, false], [true, true, true]]) {
    assert.equal(evaluate(declaration('showGroupRows').getText(file.ast), { activeTab: '모임', groups, profileLoading, refreshing }), expected);
  }
  assert.equal(evaluate(attr('data'), { showStoryRows: false, showBookRows: false, showGroupRows: true, groups }), groups);
  assert.equal(evaluate(attr('keyExtractor'), { showBookRows: false })({ id: 'g' }), 'group-g');
  assert.doesNotMatch(file.text, /groups\.map/);
  assert.match(attr('refreshControl'), /onRefresh=\{handleRefresh\}/);
  assert.match(file.text, /공개된 모임이 없습니다/);
});
