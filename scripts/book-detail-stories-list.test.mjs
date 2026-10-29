import assert from 'node:assert/strict';
import test from 'node:test';
import { source, evaluate, listAttribute } from './list-render-test-helpers.mjs';
const file = source('src/components/common/AppHeader.tsx');
const attr = (name) => listAttribute(file, 'data={bookStories}', name);
test('keeps story ID/order and card data, current author/subscription and cover fallback', () => {
  const story = { id: 5, nickname: '회원', createdAt: '', viewCount: 4, title: '제목', description: '본문', likeCount: 2, commentCount: 3, liked: true, mine: true, following: true };
  const items = [story];
  assert.equal(evaluate(attr('data'), { bookStories: items }), items);
  assert.equal(evaluate(attr('keyExtractor'))(story), 'book-story-5');
  for (const isLoggedIn of [false, true]) {
    const card = evaluate(attr('renderItem'), { isLoggedIn, selectedBook: { imgUrl: 'fallback' }, relativeNowMillis: 0, language: 'ko', toKstTimeAgoLabel: () => '지금' })({ item: story });
    assert.equal(card.props.title, story.title); assert.equal(card.props.content, story.description);
    assert.equal(card.props.coverImgSrc, 'fallback'); assert.equal(card.props.isAuthor, isLoggedIn);
    assert.equal(card.props.subscribed, isLoggedIn ? undefined : true);
    assert.equal(card.props.commentCount, 3);
  }
});
test('keeps modal-close-before-navigation order and comment focus payload', () => {
  const calls = [];
  const render = evaluate(attr('renderItem'), { isLoggedIn: true, selectedBook: {}, relativeNowMillis: 0, language: 'ko', toKstTimeAgoLabel: () => '', closeSearchPage: () => calls.push('close'), navigation: { navigate: (...args) => calls.push(args) } });
  const card = render({ item: { id: 7 } }); card.props.onPress(); card.props.onPressComment();
  assert.deepEqual(calls, ['close', ['Story', { openStoryId: 7 }], 'close', ['Story', { openStoryId: 7, openStoryFocus: 'comments' }]]);
  assert.match(attr('ListHeaderComponent'), /!bookStoriesLoading && bookStories.length === 0/);
  assert.match(attr('ListHeaderComponent'), /openStoryCompose\(selectedBook\)/);
  assert.match(attr('ListHeaderComponent'), /disabled=\{!selectedBook.link\}/);
  assert.doesNotMatch(file.text, /bookStories\.map/);
  assert.match(file.text, /key="book-search-results"/);
  assert.match(file.text, /key="book-detail-stories"/);
});
