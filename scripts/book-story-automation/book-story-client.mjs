import {
  authenticatedApiRequest,
  AutomationAuthError,
  publicApiRequest,
} from './auth-client.mjs';

function normalize(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function looselyMatches(expected, actual) {
  const left = normalize(expected);
  const right = normalize(actual);
  return Boolean(left && right && (left.includes(right) || right.includes(left)));
}

async function searchBooks(keyword) {
  const query = new URLSearchParams({ keyword, page: '1' });
  const payload = await publicApiRequest(`/books/search?${query}`);
  const books = payload?.result?.detailInfoList;
  if (!Array.isArray(books)) {
    throw new AutomationAuthError('책 검색 결과 형식을 확인하지 못했습니다.');
  }
  return books;
}

async function getBook(isbn) {
  const payload = await publicApiRequest(`/books/${encodeURIComponent(isbn)}`);
  if (!payload?.result) throw new AutomationAuthError('ISBN에 해당하는 책을 찾지 못했습니다.');
  return payload.result;
}

function validateSelectedBook(book, item) {
  if (!/^\d{13}$/.test(book?.isbn ?? '')) {
    throw new AutomationAuthError('선택된 책의 ISBN이 13자리 숫자가 아닙니다.');
  }
  if (!looselyMatches(item.bookTitle, book.title ?? '')) {
    throw new AutomationAuthError(`선택된 책 제목이 목록과 다릅니다: ${book.title ?? '제목 없음'}`);
  }
  if (!looselyMatches(item.author, book.author ?? '')) {
    throw new AutomationAuthError(`선택된 책 저자가 목록과 다릅니다: ${book.author ?? '저자 없음'}`);
  }
  return book;
}

export async function selectQueueBook(item) {
  const books = await searchBooks(`${item.bookTitle} ${item.author}`);

  if (item.isbn) {
    if (!/^\d{13}$/.test(item.isbn)) {
      throw new AutomationAuthError('목록의 ISBN은 13자리 숫자여야 합니다.');
    }
    const searched = books.find((book) => book.isbn === item.isbn);
    const selected = searched ?? (await getBook(item.isbn));
    return validateSelectedBook(selected, item);
  }

  const candidates = books.filter(
    (book) => looselyMatches(item.bookTitle, book.title ?? '') && looselyMatches(item.author, book.author ?? ''),
  );
  if (candidates.length !== 1) {
    throw new AutomationAuthError(
      `책을 하나로 확정하지 못했습니다. 일치 후보 ${candidates.length}권—목록에 ISBN 13자리를 입력해 주세요.`,
    );
  }
  return validateSelectedBook(candidates[0], item);
}

export async function findExistingStory(isbn, title) {
  const payload = await authenticatedApiRequest('/book-stories/me', { method: 'GET' });
  const stories = payload?.result?.basicInfoList;
  if (!Array.isArray(stories)) return null;
  return (
    stories.find(
      (story) =>
        String(story?.bookInfo?.bookId ?? '') === isbn &&
        normalize(story?.bookStoryTitle ?? '') === normalize(title),
    ) ?? null
  );
}

export async function publishBookStory({ isbn, title, description }) {
  const payload = await authenticatedApiRequest('/book-stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isbn, title, description, imageUrls: [], status: 'PUBLISHED' }),
  });
  const bookStoryId = Number(payload?.result);
  if (!Number.isSafeInteger(bookStoryId) || bookStoryId <= 0) {
    throw new AutomationAuthError('게시 응답에서 책이야기 번호를 확인하지 못했습니다.');
  }

  const verification = await authenticatedApiRequest(`/book-stories/${bookStoryId}`, {
    method: 'GET',
  });
  const story = verification?.result;
  if (
    Number(story?.bookStoryId) !== bookStoryId ||
    String(story?.bookInfo?.bookId ?? '') !== isbn ||
    normalize(story?.bookStoryTitle ?? '') !== normalize(title) ||
    story?.status !== 'PUBLISHED'
  ) {
    throw new AutomationAuthError(
      `책이야기 ${bookStoryId}번이 생성됐지만 게시 상태 검증에 실패했습니다. 목록은 작성전으로 유지합니다.`,
    );
  }
  return bookStoryId;
}
