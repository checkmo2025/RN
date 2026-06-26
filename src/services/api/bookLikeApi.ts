import type { BookItem } from './bookApi';

export type LikedBook = {
  id: string;
  isbn: string;
  bookId?: number;
  title: string;
  author: string;
  description?: string;
  imgUrl?: string;
  likedAt: number;
};

type LikedBooksListener = (books: LikedBook[]) => void;
type BookLikeStateChange = {
  likeId: string;
  liked: boolean;
  book?: Pick<BookItem, 'isbn' | 'bookId' | 'title' | 'author' | 'imgUrl'>;
};
type BookLikeStateListener = (change: BookLikeStateChange) => void;

const likedBooksById = new Map<string, LikedBook>();
const likedBooksListeners = new Set<LikedBooksListener>();
const bookLikeStateListeners = new Set<BookLikeStateListener>();

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBookLikeId(book: Pick<BookItem, 'isbn' | 'bookId' | 'title'>): string | null {
  const isbn = normalizeText(book.isbn);
  if (isbn.length > 0) return `isbn:${isbn}`;

  if (typeof book.bookId === 'number' && Number.isFinite(book.bookId) && book.bookId > 0) {
    return `bookId:${book.bookId}`;
  }

  const title = normalizeText(book.title);
  if (title.length > 0) return `title:${title}`;
  return null;
}

function snapshotLikedBooks(): LikedBook[] {
  return Array.from(likedBooksById.values()).sort((a, b) => b.likedAt - a.likedAt);
}

function notifyLikedBooksChanged() {
  const next = snapshotLikedBooks();
  likedBooksListeners.forEach((listener) => listener(next));
}

function notifyBookLikeStateChanged(
  likeId: string,
  liked: boolean,
  book?: BookLikeStateChange['book'],
) {
  bookLikeStateListeners.forEach((listener) => listener({ likeId, liked, book }));
}

export function resolveBookLikeId(book: Pick<BookItem, 'isbn' | 'bookId' | 'title'>): string | null {
  return toBookLikeId(book);
}

export function isBookLiked(book: Pick<BookItem, 'isbn' | 'bookId' | 'title'>): boolean {
  const id = toBookLikeId(book);
  if (!id) return false;
  return likedBooksById.has(id);
}

export async function fetchLikedBooks(): Promise<LikedBook[]> {
  return snapshotLikedBooks();
}

export async function toggleBookLike(book: BookItem): Promise<boolean> {
  const id = toBookLikeId(book);
  if (!id) return false;

  if (likedBooksById.has(id)) {
    likedBooksById.delete(id);
    notifyLikedBooksChanged();
    notifyBookLikeStateChanged(id, false, book);
    return false;
  }

  const likedBook: LikedBook = {
    id,
    isbn: normalizeText(book.isbn),
    bookId: book.bookId,
    title: normalizeText(book.title) || '책 제목',
    author: normalizeText(book.author) || '작가 미상',
    description: normalizeText(book.description),
    imgUrl: normalizeText(book.imgUrl) || undefined,
    likedAt: Date.now(),
  };

  likedBooksById.set(id, likedBook);
  notifyLikedBooksChanged();
  notifyBookLikeStateChanged(id, true, book);
  return true;
}

export function subscribeLikedBooks(listener: LikedBooksListener): () => void {
  likedBooksListeners.add(listener);
  return () => {
    likedBooksListeners.delete(listener);
  };
}

export function publishBookLikeState(
  book: Pick<BookItem, 'isbn' | 'bookId' | 'title' | 'author' | 'imgUrl'>,
  liked: boolean,
): void {
  const id = toBookLikeId(book);
  if (!id) return;
  notifyBookLikeStateChanged(id, liked, book);
}

export function subscribeBookLikeState(listener: BookLikeStateListener): () => void {
  bookLikeStateListeners.add(listener);
  return () => {
    bookLikeStateListeners.delete(listener);
  };
}
