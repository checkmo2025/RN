import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMyClubs,
  fetchRecommendedClubs,
  searchClubs,
  type ClubSearchInputFilter,
  type ClubSearchOutputFilter,
} from '../../services/api/clubApi';
import { ApiError } from '../../services/api/http';
import { useLanguage } from '../../contexts/LanguageContext';
import { showToast } from '../../utils/toast';
import {
  mapMyClubToGroup,
  mapSearchClubToGroup,
  MEETING_SEARCH_KEYWORD_MAX_LENGTH,
} from './helpers';
import { resolveMeetingSearchErrorMessage } from './mappers';
import type { Group, MeetingInputFilter } from './types';

export function useMeetingDiscover({
  search,
  activeInputFilter,
  selectedOutputFilter,
  isLoggedIn,
}: {
  search: string;
  activeInputFilter: MeetingInputFilter | null;
  selectedOutputFilter: ClubSearchOutputFilter;
  isLoggedIn: boolean;
}) {
  const { l } = useLanguage();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  const [myGroupsLoading, setMyGroupsLoading] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const discoverSeqRef = useRef(0);

  const loadMyGroups = useCallback(async () => {
    if (!isLoggedIn) {
      setMyGroups([]);
      return;
    }

    setMyGroupsLoading(true);
    try {
      const result = await fetchMyClubs(undefined, { suppressErrorToast: true });
      const mapped = result.items.map(mapMyClubToGroup);
      setMyGroups(mapped);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setMyGroups([]);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast(l('내 모임 목록을 불러오지 못했습니다.'));
      }
      setMyGroups([]);
    } finally {
      setMyGroupsLoading(false);
    }
  }, [isLoggedIn, l]);

  const loadDiscoverGroups = useCallback(async () => {
    const seq = (discoverSeqRef.current += 1);
    const keyword = search.trim();
    if (keyword.length > MEETING_SEARCH_KEYWORD_MAX_LENGTH) {
      setDiscoverGroups([]);
      showToast(l('검색어는 {limit}자 이하여야 합니다.', {
        limit: MEETING_SEARCH_KEYWORD_MAX_LENGTH,
      }));
      return;
    }

    const shouldLoadRecommendations =
      isLoggedIn &&
      keyword.length === 0 &&
      activeInputFilter === null &&
      selectedOutputFilter === 'ALL';

    const inputFilter: ClubSearchInputFilter | undefined =
      activeInputFilter === '모임별'
        ? 'NAME'
        : activeInputFilter === '지역별'
          ? 'REGION'
          : undefined;

    setDiscoverLoading(true);
    try {
      if (shouldLoadRecommendations) {
        const result = await fetchRecommendedClubs({ suppressErrorToast: true });
        if (seq !== discoverSeqRef.current) return;
        setDiscoverGroups(result.items.map(mapSearchClubToGroup));
      } else {
        const mergedItems: Parameters<typeof mapSearchClubToGroup>[0][] = [];
        const seenClubIds = new Set<number>();
        const visitedCursors = new Set<number>();
        let cursorId: number | undefined;

        for (let page = 0; page < 100; page += 1) {
          const response = await searchClubs({
            keyword: keyword.length > 0 ? keyword : undefined,
            inputFilter,
            outputFilter: selectedOutputFilter,
            cursorId,
          });

          response.items.forEach((item) => {
            const clubId = (item as { club?: { clubId?: number } }).club?.clubId;
            if (typeof clubId === 'number') {
              if (seenClubIds.has(clubId)) return;
              seenClubIds.add(clubId);
            }
            mergedItems.push(item);
          });

          if (!response.hasNext || typeof response.nextCursor !== 'number') break;
          if (visitedCursors.has(response.nextCursor)) break;

          visitedCursors.add(response.nextCursor);
          cursorId = response.nextCursor;
        }

        if (seq !== discoverSeqRef.current) return;
        setDiscoverGroups(mergedItems.map(mapSearchClubToGroup));
      }
    } catch (error) {
      if (seq !== discoverSeqRef.current) return;
      setDiscoverGroups([]);
      showToast(
        l(resolveMeetingSearchErrorMessage(error, { recommendation: shouldLoadRecommendations })),
      );
    } finally {
      if (seq === discoverSeqRef.current) setDiscoverLoading(false);
    }
  }, [activeInputFilter, isLoggedIn, l, search, selectedOutputFilter]);

  useEffect(() => {
    void loadMyGroups();
  }, [loadMyGroups]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDiscoverGroups();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadDiscoverGroups]);

  return {
    myGroups,
    setMyGroups,
    discoverGroups,
    setDiscoverGroups,
    myGroupsLoading,
    discoverLoading,
    loadMyGroups,
    loadDiscoverGroups,
  };
}
