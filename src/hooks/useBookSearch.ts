import { useCallback, useEffect, useRef, useState } from 'react';

import { searchBooks, type BookItem } from '../services/api/bookApi';
import { ApiError } from '../services/api/http';
import { showToast } from '../utils/toast';

// 검색 체감 속도 단축: 타이핑 중 prefetch + 클라 TTL 캐시 + 이전 요청 abort
// 계획 문서: docs/archive/(done)book-search-latency-plan.md
const PREFETCH_DELAY_MS = 400;
const MIN_QUERY_LENGTH = 2;
const CACHE_TTL_MS = 3 * 60 * 1000;
const CACHE_MAX_ENTRIES = 30;

type CacheEntry = {
  items: BookItem[];
  hasNext: boolean;
  currentPage: number;
  totalResults: number;
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
  const [totalResults, setTotalResults] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const requestRef = useRef<AbortController | null>(null);
  const loadMoreRequestRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<BookItem[]>([]);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const searchGenerationRef = useRef(0);
  const activeKeywordRef = useRef('');
  const prefetchRef = useRef<AbortController | null>(null);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPrefetchRef = useRef<string>('');

  useEffect(() => {
    return () => {
      searchGenerationRef.current += 1;
      loadingRef.current = false;
      loadingMoreRef.current = false;
      activeKeywordRef.current = '';
      requestRef.current?.abort();
      loadMoreRequestRef.current?.abort();
      prefetchRef.current?.abort();
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    };
  }, []);

  // 입력 멈춤 후 디바운스 prefetch (캐시 워밍)
  useEffect(() => {
    const norm = normalizeKeyword(query);
    if (norm.length < MIN_QUERY_LENGTH) return;
    if (readCache(norm)) return; // 이미 캐시 있음
    if (lastPrefetchRef.current === norm) return; // 직전 prefetch와 동일

    const timer = setTimeout(() => {
      prefetchTimerRef.current = null;
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
            totalResults: result.totalResults,
            ts: Date.now(),
          });
        } catch {
          // prefetch 실패(취소 포함)는 조용히 무시. 동일 키워드 재시도 허용.
          if (lastPrefetchRef.current === norm) lastPrefetchRef.current = '';
        } finally {
          if (prefetchRef.current === controller) prefetchRef.current = null;
        }
      })();
    }, PREFETCH_DELAY_MS);
    prefetchTimerRef.current = timer;

    return () => {
      clearTimeout(timer);
      if (prefetchTimerRef.current === timer) prefetchTimerRef.current = null;
    };
  }, [query]);

  const search = useCallback(async (rawKeyword: string) => {
    const generation = searchGenerationRef.current + 1;
    searchGenerationRef.current = generation;
    requestRef.current?.abort();
    requestRef.current = null;
    loadMoreRequestRef.current?.abort();
    loadMoreRequestRef.current = null;
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
    prefetchRef.current?.abort();
    prefetchRef.current = null;
    loadingRef.current = false;
    loadingMoreRef.current = false;
    setLoadingMore(false);

    const kw = apiKeyword(rawKeyword);
    activeKeywordRef.current = kw;
    if (!kw) {
      setSearched(false);
      setSearchedKeyword('');
      resultsRef.current = [];
      setResults([]);
      setLoading(false);
      setHasNext(false);
      setCurrentPage(1);
      setTotalResults(0);
      return;
    }

    const norm = normalizeKeyword(rawKeyword);
    setSearched(true);
    setSearchedKeyword(kw);

    // 캐시 히트 → 즉시 표시
    const cached = readCache(norm);
    if (cached) {
      resultsRef.current = cached.items;
      setResults(cached.items);
      setHasNext(cached.hasNext);
      setCurrentPage(cached.currentPage);
      setTotalResults(cached.totalResults);
      setLoading(false);
      return;
    }

    resultsRef.current = [];
    setResults([]);
    loadingRef.current = true;
    setLoading(true);
    setHasNext(false);
    setCurrentPage(1);
    setTotalResults(0);

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const result = await searchBooks(kw, 1, { signal: controller.signal });
      if (controller.signal.aborted || searchGenerationRef.current !== generation) return;
      resultsRef.current = result.items;
      setResults(result.items);
      setHasNext(result.hasNext);
      setCurrentPage(result.currentPage);
      setTotalResults(result.totalResults);
      writeCache(norm, {
        items: result.items,
        hasNext: result.hasNext,
        currentPage: result.currentPage,
        totalResults: result.totalResults,
        ts: Date.now(),
      });
    } catch (error) {
      if (controller.signal.aborted || searchGenerationRef.current !== generation) return;
      if (error instanceof ApiError) {
        showToast(error.message || '책 검색에 실패했습니다.');
      } else {
        showToast('책 검색에 실패했습니다.');
      }
      resultsRef.current = [];
      setResults([]);
      setHasNext(false);
      setCurrentPage(1);
      setTotalResults(0);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        loadingRef.current = false;
        if (!controller.signal.aborted && searchGenerationRef.current === generation) {
          setLoading(false);
        }
      }
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loading || loadingMoreRef.current || !hasNext) return;
    const kw = searchedKeyword.trim();
    if (!kw || kw !== activeKeywordRef.current) return;

    const nextPage = Math.max(1, currentPage + 1);
    const generation = searchGenerationRef.current;
    const controller = new AbortController();
    loadingMoreRef.current = true;
    loadMoreRequestRef.current = controller;
    setLoadingMore(true);
    try {
      const result = await searchBooks(kw, nextPage, { signal: controller.signal });
      if (controller.signal.aborted || searchGenerationRef.current !== generation) return;

      const resolvedPage = result.currentPage > 0 ? result.currentPage : nextPage;
      const resolvedTotalResults =
        result.totalResults > 0 ? result.totalResults : totalResults;
      const previousResults = resultsRef.current;
      const seen = new Set(previousResults.map(resultKey));
      const appended = result.items.filter((item) => {
        const key = resultKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const merged =
        appended.length > 0 ? [...previousResults, ...appended] : previousResults;
      resultsRef.current = merged;
      setResults(merged);
      writeCache(normalizeKeyword(kw), {
        items: merged,
        hasNext: result.hasNext,
        currentPage: resolvedPage,
        totalResults: resolvedTotalResults > 0 ? resolvedTotalResults : merged.length,
        ts: Date.now(),
      });
      setHasNext(result.hasNext);
      setCurrentPage(resolvedPage);
      if (result.totalResults > 0) setTotalResults(result.totalResults);
    } catch (error) {
      if (controller.signal.aborted || searchGenerationRef.current !== generation) return;
      if (error instanceof ApiError) {
        showToast(error.message || '검색 결과를 추가로 불러오지 못했습니다.');
      } else {
        showToast('검색 결과를 추가로 불러오지 못했습니다.');
      }
    } finally {
      if (loadMoreRequestRef.current === controller) {
        loadMoreRequestRef.current = null;
        loadingMoreRef.current = false;
        if (searchGenerationRef.current === generation) setLoadingMore(false);
      }
    }
  }, [loading, hasNext, searchedKeyword, currentPage, totalResults]);

  const reset = useCallback(() => {
    searchGenerationRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    loadMoreRequestRef.current?.abort();
    loadMoreRequestRef.current = null;
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
    prefetchRef.current?.abort();
    prefetchRef.current = null;
    loadingRef.current = false;
    loadingMoreRef.current = false;
    activeKeywordRef.current = '';
    lastPrefetchRef.current = '';
    setQuery('');
    setSearched(false);
    setSearchedKeyword('');
    resultsRef.current = [];
    setResults([]);
    setLoading(false);
    setHasNext(false);
    setCurrentPage(1);
    setTotalResults(0);
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
    totalResults,
    loadingMore,
    search,
    loadMore,
    reset,
  };
}
