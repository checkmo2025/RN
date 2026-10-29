import assert from 'node:assert/strict';
import test from 'node:test';
import { source, evaluate, elements, listAttribute } from './list-render-test-helpers.mjs';
const file = source('src/screens/MeetingScreen.tsx');
const attr = (name) => listAttribute(file, 'data={voteVotersModal.voters}', name);
test('keeps voter order, duplicate nickname keys, avatar fallback and profile target', () => {
  const voters = [{ nickname: '회원', profileImageUrl: 'avatar' }, { nickname: '회원' }], calls = [];
  assert.equal(evaluate(attr('data'), { voteVotersModal: { voters } }), voters);
  const render = evaluate(attr('renderItem'), { handlePressVoteVoterProfile: (name) => calls.push(name) });
  assert.deepEqual(voters.map(evaluate(attr('keyExtractor'))), ['회원-0', '회원-1']);
  voters.forEach((item, index) => {
    const row = render({ item, index }), nodes = elements(row);
    assert.equal(row.props.accessibilityLabel, '회원 프로필 보기');
    assert.equal(nodes.some((node) => node.type === 'DefaultProfileAvatar'), !item.profileImageUrl);
    assert.equal(nodes.find((node) => node.type === 'Image')?.props.source.uri, item.profileImageUrl);
    row.props.onPress();
  });
  assert.deepEqual(calls, ['회원', '회원']);
});
test('keeps empty message, modal title/close and suspension during profile navigation', () => {
  assert.equal(evaluate(attr('ListEmptyComponent')).props.children, '아직 투표자가 없습니다.');
  assert.match(file.text, /visible=\{Boolean\(voteVotersModal\) && !voteVotersModalSuspended\}/);
  assert.match(file.text, /onClose=\{\(\) => setVoteVotersModal\(null\)\}/);
  assert.match(file.text, /\{voteVotersModal.optionLabel\}/);
  assert.doesNotMatch(file.text, /voteVotersModal.voters.map/);
});
