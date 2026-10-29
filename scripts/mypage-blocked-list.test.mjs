import assert from 'node:assert/strict';
import test from 'node:test';
import { source, listAttribute, evaluate, elements } from './list-render-test-helpers.mjs';
const file = source('src/screens/MyPageScreen.tsx');
const attr = (name) => listAttribute(file, 'data={blockedMembers}', name);
test('keeps blocked members, identity, nickname and unblock action', () => {
  const items = [{ memberId: 1, nickname: '첫 회원' }, { memberId: 2, nickname: '다음 회원' }];
  const calls = [];
  assert.equal(evaluate(attr('data'), { blockedMembers: items }), items);
  const render = evaluate(attr('renderItem'), { handleUnblockMember: (name) => calls.push(name) });
  assert.deepEqual(items.map(evaluate(attr('keyExtractor'))), ['1', '2']);
  for (const item of items) {
    const nodes = elements(render({ item }));
    assert.ok(nodes.some((node) => node.props.children === item.nickname));
    nodes.find((node) => node.type === 'Pressable').props.onPress();
  }
  assert.deepEqual(calls, items.map((item) => item.nickname));
});
test('keeps settings header including loading, empty state and navigation', () => {
  const header = { loading: true };
  assert.equal(evaluate(attr('ListHeaderComponent'), { renderSettingDetail: () => header }), header);
  assert.match(file.text, /if \(showSettings && selectedSetting === 'blocked'\)/);
  const branch = file.text.slice(file.text.indexOf("if (selectedSetting === 'blocked')"), file.text.indexOf("if (selectedSetting === 'notifications')"));
  assert.match(branch, /loadingBlockedMembers/);
  assert.match(branch, /!loadingBlockedMembers && blockedMembers.length === 0/);
  assert.match(branch, /차단한 사용자가 없습니다/);
  assert.match(branch, /\{back\}/);
  assert.doesNotMatch(file.text, /blockedMembers\.map/);
});
