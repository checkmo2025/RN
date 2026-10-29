import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { source, listAttribute, evaluate, elements } from './list-render-test-helpers.mjs';

const file = source('src/screens/StoryScreen.tsx');
const attr = (name) => listAttribute(file, 'ref={detailScrollRef}', name);
const comment = { id: 'reply-2', remoteId: 2, author: '회원', text: '답글 본문', replyTo: 'parent-1', imageUrls: ['cover'], createdAt: '2026-10-29' };
function row(overrides = {}) {
  const calls = [];
  const values = {
    selectedStory: { author: '회원' }, editingCommentId: null, replyTarget: null,
    relativeNowMillis: 0, language: 'ko', toKstTimeAgoLabel: () => '방금',
    openCommentMenu: (item, event) => calls.push([item.id, event]),
    setImageViewer: (value) => calls.push(value),
    ...overrides,
  };
  return { tree: evaluate(attr('renderItem'), values)({ item: comment }), calls };
}

test('keeps comment array, IDs, refresh and offset-based input focus scrolling', () => {
  const items = [comment, { ...comment, id: '3' }];
  assert.equal(evaluate(attr('data'), { selectedStory: { commentList: items } }), items);
  assert.deepEqual(items.map(evaluate(attr('keyExtractor'))), ['reply-2', '3']);
  assert.match(attr('refreshControl'), /onRefresh=\{handleRefreshSelectedStory\}/);
  assert.doesNotMatch(file.text, /selectedStory\.commentList\.map|detailScrollRef\.current\?\.scrollTo\(/);
  assert.equal((file.text.match(/detailScrollRef\.current\?\.scrollToOffset\(/g) ?? []).length, 3);
});

test('keeps reply text, author badge, menu target and attached image interaction', () => {
  const { tree, calls } = row();
  const nodes = elements(tree);
  assert.ok(nodes.some((node) => node.props.children === 'ㄴ'));
  assert.ok(nodes.some((node) => node.props.children === '작성자'));
  assert.ok(nodes.some((node) => node.props.children === comment.text));
  nodes.find((node) => node.type === 'Pressable').props.onPress('event');
  nodes.find((node) => node.type === 'ImageGallery').props.onPressImage(0);
  assert.deepEqual(calls, [[comment.id, 'event'], { imageUrls: ['cover'], index: 0 }]);
});

test('keeps inline reply and edit composers connected to existing submission and focus handlers', () => {
  for (const editing of [false, true]) {
    const calls = [];
    const { tree } = row({
      editingCommentId: editing ? 2 : null, replyTarget: editing ? null : { commentKey: comment.id },
      inlineReplyInputRef: {}, inlineEditCommentInputRef: {}, commentInput: '작성 중',
      INPUT_LIMITS: { BOOK_STORY_COMMENT: 500 }, commentAttachments: {}, submittingComment: false,
      isCommentSubmitDisabled: false, handleChangeCommentInput: (value) => calls.push(value),
      handleFocusInlineReplyInput: () => calls.push('reply-focus'),
      handleFocusInlineEditCommentInput: () => calls.push('edit-focus'),
      handleSubmitComment: () => calls.push('submit'), cancelEditComment: () => calls.push('cancel'),
    });
    const nodes = elements(tree);
    const input = nodes.find((node) => node.type === 'FormTextInput');
    assert.equal(input.props.value, '작성 중');
    input.props.onChangeText('수정'); input.props.onFocus();
    nodes.find((node) => node.type === 'Pressable' && node.props.onPress && node.props.disabled === false).props.onPress();
    assert.deepEqual(calls, ['수정', editing ? 'edit-focus' : 'reply-focus', 'submit']);
    assert.equal(nodes.some((node) => node.type === 'ImageGallery'), !editing);
  }
});

test('comment focus includes the content padding after nesting the section in the list header', () => {
  const callback = (name) => file.nodes.find((node) => ts.isVariableDeclaration(node) && node.name.getText(file.ast) === name).initializer.arguments[0].getText(file.ast);
  const commentSectionYRef = { current: 0 }, calls = [];
  evaluate(callback('handleCommentSectionLayout'), {
    commentSectionYRef, pendingDetailFocusRef: { current: null },
  })({ nativeEvent: { layout: { y: 300 } } });
  const scroll = evaluate(callback('scrollToCommentSection'), {
    commentSectionYRef, detailScrollRef: { current: { scrollToOffset: (value) => calls.push(value) } },
  });
  assert.equal(scroll(false), true);
  assert.deepEqual(calls, [{ offset: 308, animated: false }]);
});
