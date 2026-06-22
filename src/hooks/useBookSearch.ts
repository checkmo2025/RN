import { useCallback, useEffect, useRef, useState } from 'react';

import { searchBooks, type BookItem } from '../services/api/bookApi';
import { ApiError } from '../services/api/http';
import { showToast } from '../utils/toast';

// 검색 체감 속도 단축: 타이핑 중 prefetch + 클라 TTL 캐시 + 이전 요청 abort
// 계획 문서: docs/documents/book-search-latency-plan.md
const PREFETCH_DELAY_MS = 400;
const MIN_QUERY_LENGTH = 2;
const CACHE_TTL_MS = 3 * 60 * 1000;
const CACHE_MAX_ENTRIES = 30;

type CacheEntry = {
  items: BookItem[];
  hasNext: boolean;
  currentPage: number;
  ts: number;
};

// 모듈 레벨 캐시(헤더/책이야기/책장 재사용 시 공유). 정규화 키워드 → 결과.
const searchCache = new Map<string, CacheEntry>();

function normalizeKeyword(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

function apiKeyword(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function resultKey(book: BookItem): string {
  if (book.isbn) return book.isbn;
  if (typeof book.bookId === 'number') return `id-${book.bookId}`;
  return `${book.title}-${book.author}`;
}

function readCache(key: string): CacheEntry | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry;
}

function writeCache(key: string, entry: CacheEntry): void {
  searchCache.set(key, entry);
  if (searchCache.size > CACHE_MAX_ENTRIES) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
}

export function useBookSearch() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [searchedKeyword, setSearchedKeyword] = useState('');
  const [results, setResults] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const requestRef = useRef<AbortController | null>(null);
  const prefetchRef = useRef<AbortController | null>(null);
  const lastPrefetchRef = useRef<string>('');

  // 입력 멈춤 후 디바운스 prefetch (캐시 워밍)
  useEffect(() => {
    const norm = normalizeKeyword(query);
    if (norm.length < MIN_QUERY_LENGTH) return;
    if (readCache(norm)) return; // 이미 캐시 있음
    if (lastPrefetchRef.current === norm) return; // 직전 prefetch와 동일

    const timer = setTimeout(() => {
      const controller = new AbortController();
      prefetchRef.current?.abort();
      prefetchRef.current = controller;
      lastPrefetchRef.current = norm;
      void (async () => {
        try {
          const result = await searchBooks(apiKeyword(query), 1, { signal: controller.signal });
          if (controller.signal.aborted) return;
          writeCache(norm, {
            items: result.items,
            hasNext: result.hasNext,
            currentPage: result.currentPage,
            ts: Date.now(),
          });
        } catch {
          // prefetch 실패(취소 포함)는 조용히 무시. 동일 키워드 재시도 허용.
          if (lastPrefetchRef.current === norm) lastPrefetchRef.current = '';
        }
      })();
    }, PREFETCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const search = useCallback(async (rawKeyword: string) => {
    const kw = apiKeyword(rawKeyword);
    if (!kw) {
      requestRef.current?.abort();
      setSearched(false);
      setSearchedKeyword('');
      setResults([]);
      setHasNext(false);
      setCurrentPage(1);
      setLoadingMore(false);
      return;
    }

    const norm = normalizeKeyword(rawKeyword);
    setSearched(true);
    setSearchedKeyword(kw);
    setLoadingMore(false);

    // 캐시 히트 → 즉시 표시
    const cached = readCache(norm);
    if (cached) {
      setResults(cached.items);
      setHasNext(cached.hasNext);
      setCurrentPage(cached.currentPage);
      setLoading(false);
      return;
    }

    setResults([]);
    setLoading(true);
    setHasNext(false);
    setCurrentPage(1);

    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;

    try {
      const result = await searchBooks(kw, 1, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setResults(result.items);
      setHasNext(result.hasNext);
      setCurrentPage(result.currentPage);
      writeCache(norm, {
        items: result.items,
        hasNext: result.hasNext,
        currentPage: result.currentPage,
        ts: Date.now(),
      });
    } catch (error) {
      if (controller.signal.aborted) return; // 취소된 요청은 무시
      if (error instanceof ApiError) {
        showToast(error.message || '책 검색에 실패했습니다.');
      } else {
        showToast('책 검색에 실패했습니다.');
      }
      setResults([]);
      setHasNext(false);
      setCurrentPage(1);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasNext) return;
    const kw = searchedKeyword.trim();
    if (!kw) return;

    const nextPage = Math.max(1, currentPage + 1);
    setLoadingMore(true);
    try {
      const result = await searchBooks(kw, nextPage);
      setResults((prev) => {
        const seen = new Set(prev.map(resultKey));
        const appended = result.items.filter((item) => {
          const key = resultKey(item);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return appended.length > 0 ? [...prev, ...appended] : prev;
      });
      setHasNext(result.hasNext);
      setCurrentPage(result.currentPage > 0 ? result.currentPage : nextPage);
    } catch (error) {
      if (error instanceof ApiError) {
        showToast(error.message || '검색 결과를 추가로 불러오지 못했습니다.');
      } else {
        showToast('검색 결과를 추가로 불러오지 못했습니다.');
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasNext, searchedKeyword, currentPage]);

  const reset = useCallback(() => {
    requestRef.current?.abort();
    lastPrefetchRef.current = '';
    setQuery('');
    setSearched(false);
    setSearchedKeyword('');
    setResults([]);
    setHasNext(false);
    setCurrentPage(1);
    setLoadingMore(false);
  }, []);

  return {
    query,
    setQuery,
    searched,
    searchedKeyword,
    results,
    loading,
    hasNext,
    loadingMore,
    search,
    loadMore,
    reset,
  };
}
