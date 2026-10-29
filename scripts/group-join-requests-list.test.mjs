import assert from 'node:assert/strict';
import test from 'node:test';
import { source, listAttribute, evaluate, elements } from './list-render-test-helpers.mjs';
const file = source('src/screens/meeting/GroupManagementOverlay.tsx');
const attr = (name) => listAttribute(file, 'data={joinRequests}', name);
test('keeps request identity, content, detail and processing action targets', () => {
  const items = [{ id: 'r1', nickname: '회원', name: '이름', email: 'mail', appliedAt: '오늘', message: '가입 메시지' }];
  assert.equal(evaluate(attr('data'), { joinRequests: items }), items);
  assert.equal(evaluate(attr('keyExtractor'))(items[0]), 'r1');
  const calls = [];
  const render = evaluate(attr('renderItem'), {
    handleOpenJoinRequestProfile: (name) => calls.push(['profile', name]),
    setSelectedJoinRequestMessage: (item) => calls.push(['message', item]),
    setSelectedJoinRequestActionId: (id) => calls.push(['action', id]),
  });
  const nodes = elements(render({ item: items[0] }));
  for (const text of ['회원', '이름', 'mail', '오늘']) assert.ok(nodes.some((node) => node.props.children === text));
  for (const button of nodes.filter((node) => node.type === 'Pressable')) button.props.onPress();
  assert.deepEqual(calls, [['profile', '회원'], ['message', items[0]], ['action', 'r1']]);
});
test('keeps summary count, empty message and pull-to-refresh', () => {
  const header = evaluate(attr('ListHeaderComponent'), { joinRequests: [1, 2] });
  assert.ok(elements(header).some((node) => node.props.children === '대기 2'));
  assert.ok(elements(evaluate(attr('ListEmptyComponent'))).some((node) => node.props.children === '대기 중인 가입 신청이 없습니다.'));
  const calls = [];
  const refresh = evaluate(attr('refreshControl'), { refreshingJoinRequests: true, handleRefreshJoinRequests: () => calls.push('refresh') });
  assert.equal(refresh.props.refreshing, true); refresh.props.onRefresh();
  assert.deepEqual(calls, ['refresh']);
  assert.doesNotMatch(file.text, /joinRequests\.map/);
});
