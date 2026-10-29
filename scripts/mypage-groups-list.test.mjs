import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { source, evaluate, elements, listAttribute } from './list-render-test-helpers.mjs';
const file = source('src/screens/MyPageScreen.tsx');
const declaration = (name) => file.nodes.find((node) => ts.isVariableDeclaration(node) && node.name.getText(file.ast) === name).initializer;
const expression = declaration('renderGroupItem').arguments[0].getText(file.ast);
test('keeps group name, visit target and menu coordinates with event propagation stopped', () => {
  const group = { id: 'g1', clubId: 11, name: '독서모임' }, calls = [];
  const render = evaluate(expression, { handleOpenGroupHome: (value) => calls.push(value), setGroupMenu: (value) => calls.push(value) });
  const nodes = elements(render(group));
  assert.ok(nodes.some((node) => node.props.children === group.name));
  nodes[0].props.onPress();
  nodes.find((node) => node.props.hitSlop === 8).props.onPress({ stopPropagation: () => calls.push('stop'), nativeEvent: { pageX: 10, pageY: 20 } });
  assert.deepEqual(calls, [group, 'stop', { group, pageX: 10, pageY: 20 }]);
});
test('only selects group rows for authenticated group tab and preserves all other tab data', () => {
  const data = declaration('mainListItems').getText(file.ast);
  const groups = [{ id: 'g' }], alarms = [], storyRows = [], bookRows = [];
  for (const [activeTab, expected] of [['내 모임', groups], ['내 알림', alarms], ['내 책 이야기', storyRows], ['내 서재', bookRows]]) {
    assert.equal(evaluate(data, { activeTab, isLoggedIn: true, groups, alarms, storyRows, bookRows }), expected);
  }
  assert.deepEqual(evaluate(data, { activeTab: '내 모임', isLoggedIn: false }), []);
  assert.doesNotMatch(file.text, /groups\.map/);
  assert.match(file.text, /!loadingGroups && groups.length === 0/);
  assert.match(listAttribute(file, 'ref={myPageScrollRef}', 'refreshControl'), /await loadMyPageData\(\)/);
});
