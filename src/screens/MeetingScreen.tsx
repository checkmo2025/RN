import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { colors, radius, spacing, typography } from '../theme';
import { ScreenLayout } from '../components/common/ScreenLayout';
import { MeetingListCard } from '../components/feature/groups/MeetingListCard';
import { MyGroupsDropdownCard } from '../components/feature/groups/MyGroupsDropdownCard';
import { useAuthGate } from '../contexts/AuthGateContext';
import { ApiError } from '../services/api/http';
import {
  checkClubNameDuplicate,
  createClub,
  fetchRecommendedClubs,
  fetchClubHome,
  fetchMyClubs,
  joinClub,
  searchClubs,
  type ClubDetailResult,
  type ClubCategoryCode,
  type ClubParticipantTypeCode,
  type ClubSearchInputFilter,
  type ClubSearchItem,
  type ClubSearchOutputFilter,
} from '../services/api/clubApi';
import { showToast } from '../utils/toast';

type Group = {
  id: string;
  clubId?: number;
  name: string;
  tags: string[];
  topic: string;
  region: string;
  applicationStatus?: string;
  description?: string;
  notice?: string;
  nextSession?: string;
  isPrivate?: boolean;
};

type LinkItem = { text: string; url: string };

const inputFilters = ['모임별', '지역별'] as const;
type MeetingInputFilter = (typeof inputFilters)[number];
const outputFilterOptions: Array<{ label: string; value: ClubSearchOutputFilter }> = [
  { label: '전체', value: 'ALL' },
  { label: '대학생', value: 'STUDENT' },
  { label: '직장인', value: 'WORKER' },
  { label: '온라인', value: 'ONLINE' },
  { label: '동아리', value: 'CLUB' },
  { label: '모임', value: 'MEETING' },
  { label: '대면', value: 'OFFLINE' },
];

const categoryLabelByCode: Record<string, string> = {
  FICTION_POETRY_DRAMA: '소설/시/희곡',
  ESSAY: '에세이',
  HUMANITIES: '인문학',
  SOCIAL_SCIENCE: '사회과학',
  POLITICS_DIPLOMACY_DEFENSE: '정치/외교/국방',
  ECONOMY_MANAGEMENT: '경제/경영',
  SELF_DEVELOPMENT: '자기계발',
  HISTORY_CULTURE: '역사/문화',
  SCIENCE: '과학',
  COMPUTER_IT: '컴퓨터/IT',
  ART_POP_CULTURE: '예술/대중문화',
  TRAVEL: '여행',
  FOREIGN_LANGUAGE: '외국어',
  CHILDREN_BOOKS: '어린이/청소년',
  RELIGION_PHILOSOPHY: '종교/철학',
};

const participantLabelByCode: Record<string, string> = {
  STUDENT: '대학생',
  WORKER: '직장인',
  ONLINE: '온라인',
  CLUB: '동아리',
  MEETING: '모임',
  OFFLINE: '오프라인',
};

const fallbackMyGroups: Group[] = [
  {
    id: 'my-1',
    name: '새벽 독서회',
    tags: ['에세이', '인문학'],
    topic: '모임 대상 · 직장인, 대학생',
    region: '활동 지역 · 서울 영등포구',
    notice: '이번 주는 7시 온라인 모임으로 진행합니다.',
    description: '출근 전 40분 독서와 짧은 토론으로 하루를 여는 모임입니다.',
  },
  {
    id: 'my-2',
    name: '강북 소설 클럽',
    tags: ['소설/시/희곡', '역사/문화'],
    topic: '모임 대상 · 대학생, 직장인',
    region: '활동 지역 · 강북',
    notice: '2월 마지막 주제는 한국 단편 소설입니다.',
    description: '한 달에 두 번 오프라인으로 만나 작품을 깊게 읽습니다.',
  },
  {
    id: 'my-3',
    name: '논픽션 라운지',
    tags: ['사회과학', '정치/외교/국방', '경제/경영'],
    topic: '모임 대상 · 직장인',
    region: '활동 지역 · 서울 마포구',
    description: '시사/경제 논픽션을 읽고 실무 관점으로 토론합니다.',
  },
];

const fallbackDiscoverGroups: Group[] = [
  {
    id: 'g-1',
    name: '복적복적',
    tags: ['여행', '외국어', '어린이/청소년', '종교/철학', '과학', '경제/경영'],
    topic: '모임 대상 · 대학생, 직장인, 동아리, 모임',
    region: '활동 지역 · 강북',
    applicationStatus: '신청 완료',
    notice: '금칙 금칙 머리나 굳지 말고 모임에서 책임지고! 금칙굳적 독서 모임 소개글',
    description:
      '책을 좋아하는 사람들이 모여 각자의 속도로 읽고, 각자의 언어로 생각을 나누는 책 모임입니다. 이 모임은 정답을 찾기보다 질문을 남기는 시간을 소중히 여깁니다. 한 권의 책을 통해 서로의 관점과 경험을 자연스럽게 공유하는 것을 목표로 합니다.',
    nextSession: '이번 모임 바로가기',
    isPrivate: true,
  },
  {
    id: 'g-2',
    name: '독서 사색',
    tags: ['소설/시/희곡', '에세이', '인문학', '사회과학', '정치/외교/국방', '역사/문화'],
    topic: '작품 토론 · 격주',
    region: '온라인',
    notice: '이번 달 주제: 단편 소설로 떠나는 세계 여행',
    description:
      '서로의 해석을 존중하며 깊이 있는 토론을 지향합니다. 처음 오시는 분들도 부담 없이 의견을 나누고 배울 수 있는 공간을 목표로 합니다.',
  },
  {
    id: 'g-3',
    name: '북적북적 IT',
    tags: ['과학', '컴퓨터/IT', '경제/경영', '자기계발', '사회과학', '예술/대중문화'],
    topic: '모임 대상 · 직장인, 대학생, 온라인',
    region: '활동 지역 · 서울 마포구',
    notice: '이번 주는 생성형 AI 책으로 토론합니다.',
    description:
      '기술과 인문학의 접점을 함께 읽고 토론하는 모임입니다. 매주 1권을 읽고 핵심 인사이트를 공유합니다.',
  },
];

function toLabelList(
  values: unknown,
  codeToLabel: Record<string, string>,
): string[] {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => {
      if (typeof value === 'string') {
        return codeToLabel[value] ?? value;
      }

      if (typeof value === 'object' && value !== null) {
        const candidate = value as { code?: unknown; description?: unknown };
        if (typeof candidate.description === 'string' && candidate.description.length > 0) {
          return candidate.description;
        }
        if (typeof candidate.code === 'string') {
          return codeToLabel[candidate.code] ?? candidate.code;
        }
      }

      return null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function mapMyClubToGroup(club: { clubId: number; clubName: string }): Group {
  return {
    id: `club-${club.clubId}`,
    clubId: club.clubId,
    name: club.clubName,
    tags: [],
    topic: '모임 대상 · 정보 없음',
    region: '활동 지역 · 정보 없음',
    applicationStatus: '가입중',
  };
}

function mapClubStatusToApplication(status?: string): string | undefined {
  switch (status) {
    case 'PENDING':
      return '신청 완료 됨';
    case 'MEMBER':
    case 'STAFF':
    case 'OWNER':
      return '가입중';
    default:
      return undefined;
  }
}

function mapSearchClubToGroup(item: ClubSearchItem): Group {
  const rawItem = item as unknown as Record<string, unknown>;
  const clubCandidate =
    rawItem.club && typeof rawItem.club === 'object' ? rawItem.club : rawItem;
  const club = (clubCandidate as ClubDetailResult) ?? {};
  const clubId = typeof club.clubId === 'number' ? club.clubId : undefined;
  const tags = toLabelList(club.category, categoryLabelByCode).slice(0, 6);
  const participants = toLabelList(club.participantTypes, participantLabelByCode);
  const regionText = typeof club.region === 'string' && club.region.trim().length > 0
    ? club.region.trim()
    : '정보 없음';

  return {
    id: clubId ? `club-${clubId}` : `club-${club.name ?? Math.random().toString()}`,
    clubId,
    name: typeof club.name === 'string' && club.name.length > 0 ? club.name : '이름 없는 모임',
    tags,
    topic: participants.length > 0 ? `모임 대상 · ${participants.join(', ')}` : '모임 대상 · 정보 없음',
    region: `활동 지역 · ${regionText}`,
    applicationStatus: mapClubStatusToApplication(item.myStatus),
    description: typeof club.description === 'string' ? club.description : undefined,
    isPrivate: typeof club.open === 'boolean' ? !club.open : undefined,
  };
}

function mapClubHomeDetailToGroup(detail: ClubDetailResult, prev: Group): Group {
  const tags = toLabelList(detail.category, categoryLabelByCode).slice(0, 6);
  const participants = toLabelList(detail.participantTypes, participantLabelByCode);
  const region = typeof detail.region === 'string' && detail.region.trim().length > 0
    ? detail.region.trim()
    : '정보 없음';

  return {
    ...prev,
    clubId: typeof detail.clubId === 'number' ? detail.clubId : prev.clubId,
    name: typeof detail.name === 'string' && detail.name.length > 0 ? detail.name : prev.name,
    tags: tags.length > 0 ? tags : prev.tags,
    topic: participants.length > 0 ? `모임 대상 · ${participants.join(', ')}` : prev.topic,
    region: `활동 지역 · ${region}`,
    description: typeof detail.description === 'string' ? detail.description : prev.description,
    isPrivate: typeof detail.open === 'boolean' ? !detail.open : prev.isPrivate,
  };
}

function filterFallbackDiscoverGroups(keyword: string, filter: MeetingInputFilter | null): Group[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const normalizedFilter = filter;

  return fallbackDiscoverGroups.filter((group) => {
    if (!normalizedKeyword) return true;

    if (normalizedFilter === '모임별') {
      return group.name.toLowerCase().includes(normalizedKeyword);
    }

    if (normalizedFilter === '지역별') {
      return group.region.toLowerCase().includes(normalizedKeyword);
    }

    const tagText = group.tags.join(' ').toLowerCase();
    return (
      group.name.toLowerCase().includes(normalizedKeyword) ||
      group.region.toLowerCase().includes(normalizedKeyword) ||
      tagText.includes(normalizedKeyword)
    );
  });
}

export function MeetingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { requireAuth, isLoggedIn } = useAuthGate();
  const [showCreate, setShowCreate] = useState(false);
  const [createDraftDirty, setCreateDraftDirty] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [applyOpenId, setApplyOpenId] = useState<string | null>(null);
  const [applyReasonById, setApplyReasonById] = useState<Record<string, string>>({});
  const [appliedById, setAppliedById] = useState<Record<string, string>>({});
  const [myGroups, setMyGroups] = useState<Group[]>(fallbackMyGroups);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>(fallbackDiscoverGroups);
  const [myGroupsLoading, setMyGroupsLoading] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [pendingOpenClubId, setPendingOpenClubId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [activeInputFilter, setActiveInputFilter] = useState<MeetingInputFilter | null>(null);
  const [selectedOutputFilter, setSelectedOutputFilter] =
    useState<ClubSearchOutputFilter>('ALL');
  const [outputFilterOpen, setOutputFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const showLeaveDraftAlert = useCallback((onClose: () => void) => {
    if (!(showCreate && createDraftDirty)) {
      onClose();
      return;
    }

    Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '닫기', style: 'destructive', onPress: onClose },
    ]);
  }, [createDraftDirty, showCreate]);

  const closeCreateFlow = useCallback(() => {
    setShowCreate(false);
    setCreateDraftDirty(false);
  }, []);

  const handlePressHeaderLogo = useCallback(() => {
    showLeaveDraftAlert(() => {
      closeCreateFlow();
      setActiveGroup(null);
      navigation.navigate('Home');
    });
  }, [closeCreateFlow, navigation, showLeaveDraftAlert]);

  const selectedOutputFilterLabel =
    outputFilterOptions.find((option) => option.value === selectedOutputFilter)?.label ?? '전체';

  const loadMyGroups = useCallback(async () => {
    if (!isLoggedIn) {
      setMyGroups(fallbackMyGroups);
      return;
    }

    setMyGroupsLoading(true);
    try {
      const result = await fetchMyClubs();
      const mapped = result.items.map(mapMyClubToGroup);
      setMyGroups(mapped);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setMyGroups(fallbackMyGroups);
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast('내 모임 목록을 불러오지 못했습니다.');
      }
    } finally {
      setMyGroupsLoading(false);
    }
  }, [isLoggedIn]);

  const loadDiscoverGroups = useCallback(async () => {
    const keyword = search.trim();
    const shouldLoadRecommendations =
      keyword.length === 0 &&
      activeInputFilter === null &&
      selectedOutputFilter === 'ALL';

    if (!isLoggedIn && !shouldLoadRecommendations) {
      setDiscoverGroups(filterFallbackDiscoverGroups(search, activeInputFilter));
      return;
    }

    const inputFilter: ClubSearchInputFilter | undefined =
      activeInputFilter === '모임별'
        ? 'NAME'
        : activeInputFilter === '지역별'
          ? 'REGION'
          : undefined;

    setDiscoverLoading(true);
    try {
      const result = shouldLoadRecommendations
        ? await fetchRecommendedClubs()
        : await searchClubs({
            keyword: keyword.length > 0 ? keyword : undefined,
            inputFilter,
            outputFilter: selectedOutputFilter,
          });
      setDiscoverGroups(result.items.map(mapSearchClubToGroup));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (shouldLoadRecommendations) {
          setDiscoverGroups(fallbackDiscoverGroups);
        } else {
          setDiscoverGroups(filterFallbackDiscoverGroups(search, activeInputFilter));
        }
        return;
      }
      if (!(error instanceof ApiError)) {
        showToast(
          shouldLoadRecommendations
            ? '추천 모임을 불러오지 못했습니다.'
            : '모임 검색에 실패했습니다.',
        );
      }
    } finally {
      setDiscoverLoading(false);
    }
  }, [activeInputFilter, isLoggedIn, search, selectedOutputFilter]);

  useEffect(() => {
    void loadMyGroups();
  }, [loadMyGroups]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDiscoverGroups();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadDiscoverGroups]);

  useEffect(() => {
    const value = route.params?.openClubId;
    const clubId =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : NaN;
    if (!Number.isInteger(clubId) || clubId <= 0) return;
    setPendingOpenClubId(clubId);
    navigation.setParams({ openClubId: undefined });
  }, [navigation, route.params?.openClubId]);

  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return undefined;

    const unsubscribe = parent.addListener('tabPress', (event: any) => {
      if (!(showCreate && createDraftDirty)) return;

      const targetKey = event?.target;
      const parentState = parent.getState();
      const targetRoute = parentState.routes.find(
        (routeItem: { key: string; name: string }) => routeItem.key === targetKey,
      );
      if (!targetRoute || targetRoute.name === 'Meeting') return;

      event.preventDefault();
      Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
        { text: '취소', style: 'cancel' },
        {
          text: '닫기',
          style: 'destructive',
          onPress: () => {
            closeCreateFlow();
            parent.navigate(targetRoute.name as never);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [closeCreateFlow, createDraftDirty, navigation, showCreate]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event: any) => {
      if (!(showCreate && createDraftDirty)) return;

      event.preventDefault();
      Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
        { text: '취소', style: 'cancel' },
        {
          text: '닫기',
          style: 'destructive',
          onPress: () => {
            closeCreateFlow();
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [closeCreateFlow, createDraftDirty, navigation, showCreate]);

  const visibleDiscoverGroups = useMemo(
    () =>
      discoverGroups.map((group) => ({
        ...group,
        applicationStatus: appliedById[group.id] ?? group.applicationStatus,
      })),
    [appliedById, discoverGroups],
  );

  const openGroupHome = useCallback((group: Group) => {
    setActiveGroup(group);
    if (typeof group.clubId !== 'number') return;
    const clubId = group.clubId;

    const loadHome = async () => {
      try {
        const detail = await fetchClubHome(clubId);
        if (!detail) return;
        setActiveGroup((prev) => {
          if (!prev || prev.id !== group.id) return prev;
          return mapClubHomeDetailToGroup(detail, prev);
        });
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('모임 상세를 불러오지 못했습니다.');
        }
      }
    };

    void loadHome();
  }, []);

  useEffect(() => {
    if (pendingOpenClubId === null) return;
    const targetGroup =
      myGroups.find((group) => group.clubId === pendingOpenClubId) ??
      discoverGroups.find((group) => group.clubId === pendingOpenClubId);
    if (!targetGroup) return;

    requireAuth(() => openGroupHome(targetGroup));
    setPendingOpenClubId(null);
  }, [discoverGroups, myGroups, openGroupHome, pendingOpenClubId, requireAuth]);

  const handleOpenApply = (groupId: string) => {
    requireAuth(() => {
      setApplyOpenId((prev) => (prev === groupId ? null : groupId));
    });
  };

  const handleChangeApplyReason = (groupId: string, value: string) => {
    setApplyReasonById((prev) => ({ ...prev, [groupId]: value }));
  };

  const handleSubmitApply = (group: Group) => {
    requireAuth(() => {
      const reason = (applyReasonById[group.id] ?? '').trim();
      if (!reason) {
        showToast('신청 사유를 입력해주세요.');
        return;
      }
      if (typeof group.clubId !== 'number') {
        showToast('모임 정보를 찾을 수 없습니다.');
        return;
      }
      const clubId = group.clubId;

      const submit = async () => {
        try {
          await joinClub(clubId, reason);
          setAppliedById((prev) => ({ ...prev, [group.id]: '신청 완료 됨' }));
          setApplyOpenId(null);
          setApplyReasonById((prev) => ({ ...prev, [group.id]: '' }));
          showToast('가입 신청이 완료되었습니다.');
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast('가입 신청에 실패했습니다.');
          }
        }
      };

      void submit();
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    const refresh = async () => {
      setSearch('');
      setActiveInputFilter(null);
      setSelectedOutputFilter('ALL');
      setOutputFilterOpen(false);
      setApplyOpenId(null);
      await loadMyGroups();
      setRefreshing(false);
    };

    void refresh();
  };

  if (showCreate) {
    return (
      <ScreenLayout title="모임" onPressLogo={handlePressHeaderLogo}>
        <MeetingCreateFlow
          onClose={closeCreateFlow}
          onDirtyChange={setCreateDraftDirty}
        />
      </ScreenLayout>
    );
  }

  if (activeGroup) {
    return (
      <ScreenLayout title="모임" onPressLogo={handlePressHeaderLogo}>
        <GroupHomeView group={activeGroup} onBack={() => setActiveGroup(null)} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="모임" onPressLogo={handlePressHeaderLogo}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary1}
            colors={[colors.primary1]}
          />
        }
      >
      <Text style={styles.sectionTitle}>독서모임</Text>
      <Pressable
        style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
        onPress={() =>
          requireAuth(() => {
            setCreateDraftDirty(false);
            setShowCreate(true);
          })
        }
      >
        <Text style={styles.createButtonText}>+ 모임 생성하기</Text>
      </Pressable>

      <MyGroupsDropdownCard
        groups={myGroups}
        onPressGroup={(group) => requireAuth(() => openGroupHome(group))}
      />
      {myGroupsLoading ? <Text style={styles.helperText}>내 모임 목록을 불러오는 중...</Text> : null}

      <Text style={styles.sectionTitle}>모임 검색하기</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="검색하기 (모임명, 지역별)"
          placeholderTextColor={colors.gray3}
          style={styles.searchInput}
        />
        <MaterialIcons name="search" size={22} color={colors.gray5} />
      </View>

      <View style={styles.filterRow}>
        <View style={styles.outputFilterWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.outputFilterButton,
              pressed && styles.pressed,
            ]}
            onPress={() => setOutputFilterOpen((prev) => !prev)}
          >
            <Text style={styles.outputFilterText}>{selectedOutputFilterLabel}</Text>
            <MaterialIcons
              name={outputFilterOpen ? 'expand-less' : 'expand-more'}
              size={18}
              color={colors.gray6}
            />
          </Pressable>
          {outputFilterOpen ? (
            <View style={styles.outputFilterMenu}>
              {outputFilterOptions.map((option) => {
                const selected = option.value === selectedOutputFilter;
                return (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.outputFilterItem,
                      selected ? styles.outputFilterItemSelected : null,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      setSelectedOutputFilter(option.value);
                      setOutputFilterOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.outputFilterItemText,
                        selected ? styles.outputFilterItemTextSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {inputFilters.map((filter) => {
          const active = filter === activeInputFilter;
          return (
            <Pressable
              key={filter}
              style={styles.filterChip}
              onPress={() =>
                setActiveInputFilter((prev) => (prev === filter ? null : filter))
              }
              android_ripple={{ color: colors.gray1 }}
            >
              <MaterialIcons
                name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={18}
                color={active ? colors.primary1 : colors.gray4}
              />
              <Text
                style={[
                  styles.filterText,
                  active ? styles.filterTextActive : styles.filterTextInactive,
                ]}
              >
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {search.trim().length === 0 &&
      activeInputFilter === null &&
      selectedOutputFilter === 'ALL' ? (
        <Text style={styles.sectionTitle}>독서 모임 추천</Text>
      ) : null}

      <View style={styles.groupList}>
        {visibleDiscoverGroups.map((group) => (
          <MeetingListCard
            key={group.id}
            name={group.name}
            tags={group.tags}
            topic={group.topic}
            region={group.region}
            isPrivate={group.isPrivate}
            applicationStatus={group.applicationStatus}
            applyOpen={applyOpenId === group.id}
            applyReason={applyReasonById[group.id] ?? ''}
            onPressApply={() => handleOpenApply(group.id)}
            onChangeApplyReason={(value) => handleChangeApplyReason(group.id, value)}
            onSubmitApply={() => handleSubmitApply(group)}
            onPressVisit={() => openGroupHome(group)}
          />
        ))}
        {discoverLoading ? <Text style={styles.helperText}>모임 목록을 불러오는 중...</Text> : null}
        {!discoverLoading && visibleDiscoverGroups.length === 0 ? (
          <View style={styles.emptySearchBox}>
            <Text style={styles.emptySearchText}>검색 결과가 없습니다.</Text>
          </View>
        ) : null}
      </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  createContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  createContent: {
    paddingBottom: spacing.xl * 2,
  },
  createBreadcrumbWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  createBody: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  createButton: {
    backgroundColor: colors.primary1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  createButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body1_3,
    color: colors.gray6,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 30,
  },
  outputFilterWrap: {
    position: 'relative',
    zIndex: 40,
  },
  outputFilterButton: {
    minWidth: 84,
    height: 28,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    backgroundColor: colors.background,
  },
  outputFilterText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  outputFilterMenu: {
    position: 'absolute',
    top: 32,
    left: 0,
    minWidth: 104,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  outputFilterItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray1,
  },
  outputFilterItemSelected: {
    backgroundColor: colors.subbrown4,
  },
  outputFilterItemText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  outputFilterItemTextSelected: {
    color: colors.primary1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  filterText: {
    ...typography.body1_3,
  },
  filterTextActive: {
    color: colors.primary1,
  },
  filterTextInactive: {
    color: colors.gray5,
  },
  groupList: {
    gap: spacing.sm,
  },
  emptySearchBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptySearchText: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  groupCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupName: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  privateBadge: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs / 2,
  },
  tag: {
    backgroundColor: colors.subbrown4,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  tagText: {
    ...typography.body2_3,
    color: colors.gray6,
  },
  groupMeta: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  groupActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  groupButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  outlineButtonText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  primaryButton: {
    backgroundColor: colors.primary1,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.gray2,
  },
  primaryButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  pressed: {
    opacity: 0.7,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepDotActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.primary1,
  },
  stepDotInactive: {
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  stepText: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  stepTextActive: {
    color: colors.white,
  },
  sectionBox: {
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
  },
  helperText: {
    ...typography.body2_3,
    color: colors.gray4,
    lineHeight: 20,
  },
  textArea: {
    height: 124,
    textAlignVertical: 'top',
  },
  logoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkBoxSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray3,
  },
  checkBoxSquareActive: {
    backgroundColor: colors.primary1,
    borderColor: colors.primary1,
  },
  checkboxLabel: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  addLinkButton: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  addLinkText: {
    ...typography.subhead3,
    color: colors.gray5,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  navRowSingle: {
    justifyContent: 'flex-end',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  breadcrumbPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  breadcrumbText: {
    ...typography.body2_2,
    color: colors.gray4,
  },
  breadcrumbActive: {
    color: colors.gray6,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1_3,
    color: colors.gray6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  chipText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  chipTextActive: {
    color: colors.primary1,
  },
  formGroup: {
    gap: spacing.xs,
  },
  dupCheckButton: {
    minWidth: 92,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    backgroundColor: colors.subbrown4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  dupCheckButtonDisabled: {
    opacity: 0.6,
  },
  dupCheckText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  nameCheckText: {
    ...typography.body2_3,
    marginTop: spacing.xs / 2,
  },
  nameCheckSuccessText: {
    color: '#2FA66A',
  },
  nameCheckErrorText: {
    color: colors.likeRed,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  primaryText: {
    ...typography.body1_2,
    color: colors.white,
  },
  buttonFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  buttonGrow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  buttonSingle: {
    minWidth: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  disabledText: {
    color: colors.gray4,
  },
  detailTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  pillNav: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  pillNavItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  pillNavItemActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  pillNavText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  pillNavTextActive: {
    color: colors.primary1,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.md,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.subbrown4,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  noticeText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  detailMain: {
    gap: spacing.md,
  },
  detailImage: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
  },
  detailInfo: {
    gap: spacing.xs,
  },
  metaBlock: {
    gap: spacing.xs / 2,
  },
  metaLabel: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  metaValue: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  detailBody: {
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 22,
  },
  detailButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  noticeBoardCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.md,
  },
  noticeList: {
    gap: spacing.sm,
  },
  noticeItemRow: {
    borderWidth: 1,
    borderColor: colors.subbrown4,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    minHeight: 46,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noticeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    flexShrink: 0,
  },
  noticeTag: {
    height: 28,
    minWidth: 42,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTagPin: {
    backgroundColor: colors.primary1,
    minWidth: 36,
    paddingHorizontal: spacing.xs,
  },
  noticeTagVote: {
    backgroundColor: colors.secondary3,
  },
  noticeTagMeeting: {
    backgroundColor: colors.secondary2,
  },
  noticeTagText: {
    ...typography.body2_2,
    color: colors.white,
  },
  noticeItemTitle: {
    ...typography.body2_2,
    color: colors.gray6,
    flex: 1,
  },
  noticePagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
  },
  noticePageArrow: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  noticePageArrowDisabled: {
    opacity: 0.35,
  },
  noticePageButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  noticePageButtonActive: {
    backgroundColor: colors.subbrown4,
  },
  noticePageText: {
    ...typography.body2_2,
    color: colors.gray4,
  },
  noticePageTextActive: {
    color: colors.primary1,
  },
  noticeDetailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.md,
  },
  noticeDetailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noticeDetailDate: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticeDetailTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  noticeDetailBody: {
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 22,
  },
  noticePollSection: {
    gap: spacing.sm,
  },
  noticePollMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noticePollEndText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticePollMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noticePollMetaPrivacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  noticePollMetaText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticePollOptionList: {
    gap: spacing.xs,
  },
  noticePollOptionRow: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noticePollOptionRowSelected: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  noticePollOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  noticePollOptionText: {
    ...typography.body2_2,
    color: colors.gray6,
    flex: 1,
  },
  noticePollOptionCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  noticePollOptionCountText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  noticePollSubmitButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
    minWidth: 96,
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  noticePollSubmitButtonDisabled: {
    backgroundColor: colors.gray2,
  },
  noticePollSubmitText: {
    ...typography.body1_2,
    color: colors.white,
  },
  noticeDetailImageStrip: {
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
  },
  noticeDetailDivider: {
    height: 1,
    backgroundColor: colors.gray2,
  },
  noticeCommentSection: {
    gap: spacing.sm,
  },
  noticeCommentHeader: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  noticeCommentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noticeCommentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1_3,
    color: colors.gray6,
    backgroundColor: colors.white,
  },
  noticeCommentSubmit: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCommentSubmitText: {
    ...typography.body1_2,
    color: colors.white,
  },
  noticeCommentList: {
    gap: spacing.sm,
  },
  noticeCommentItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
    paddingBottom: spacing.sm,
  },
  noticeCommentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCommentBody: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  noticeCommentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  noticeCommentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noticeCommentAuthor: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  noticeCommentAuthorBadge: {
    borderWidth: 1,
    borderColor: colors.subbrown3,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.subbrown4,
  },
  noticeCommentAuthorBadgeText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  noticeCommentDate: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  noticeCommentMenuButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCommentText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  voteVotersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  voteVotersModalCard: {
    width: 180,
    maxHeight: 320,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  voteVotersModalTitle: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  voteVotersList: {
    gap: spacing.xs,
  },
  voteVotersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray1,
  },
  voteVotersAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteVotersName: {
    ...typography.body2_3,
    color: colors.gray6,
  },
  voteVotersEmptyText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  bookshelfSection: {
    gap: spacing.md,
  },
  bookshelfSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs / 2,
  },
  bookshelfSessionChip: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bookshelfSessionChipActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.subbrown4,
  },
  bookshelfSessionText: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  bookshelfSessionTextActive: {
    color: colors.primary1,
  },
  bookshelfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookshelfCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.subbrown4,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  bookshelfCover: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  bookshelfTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  bookshelfAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  bookshelfBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs / 2,
  },
  bookshelfSessionBadge: {
    borderRadius: radius.sm,
    backgroundColor: colors.subbrown1,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  bookshelfCategoryBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  bookshelfCategoryPink: {
    backgroundColor: '#EAA8A0',
  },
  bookshelfCategoryBlue: {
    backgroundColor: colors.secondary3,
  },
  bookshelfCategoryPurple: {
    backgroundColor: colors.secondary4,
  },
  bookshelfCategoryOrange: {
    backgroundColor: colors.secondary2,
  },
  bookshelfCategoryTeal: {
    backgroundColor: '#79CFC1',
  },
  bookshelfBadgeText: {
    ...typography.body2_3,
    color: colors.white,
  },
  bookshelfLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  bookshelfLinkLabel: {
    ...typography.body2_3,
    color: colors.gray6,
  },
  bookshelfRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: spacing.xs / 2,
  },
});

type CreateStep = 1 | 2 | 3 | 4;

const categoryCodeByLabel: Record<string, ClubCategoryCode> = {
  '소설/시/희곡': 'FICTION_POETRY_DRAMA',
  '에세이': 'ESSAY',
  '인문학': 'HUMANITIES',
  '사회과학': 'SOCIAL_SCIENCE',
  '정치/외교/국방': 'POLITICS_DIPLOMACY_DEFENSE',
  '경제/경영': 'ECONOMY_MANAGEMENT',
  '자기계발': 'SELF_DEVELOPMENT',
  '역사/문화': 'HISTORY_CULTURE',
  '과학': 'SCIENCE',
  '컴퓨터/IT': 'COMPUTER_IT',
  '예술/대중문화': 'ART_POP_CULTURE',
  '여행': 'TRAVEL',
  '외국어': 'FOREIGN_LANGUAGE',
  '어린이/청소년': 'CHILDREN_BOOKS',
  '종교/철학': 'RELIGION_PHILOSOPHY',
};

const participantCodeByLabel: Record<string, ClubParticipantTypeCode> = {
  '대학생': 'STUDENT',
  '직장인': 'WORKER',
  '온라인': 'ONLINE',
  '동아리': 'CLUB',
  '모임': 'MEETING',
  '오프라인': 'OFFLINE',
};

type NoticeTag = 'PIN' | 'VOTE' | 'MEETING';

type NoticeItem = {
  id: string;
  title: string;
  date: string;
  tags: NoticeTag[];
  category: '일반' | '모임' | '투표';
  content: string;
  poll?: NoticePoll;
};

type NoticeComment = {
  id: string;
  author: string;
  date: string;
  content: string;
  mine?: boolean;
  isAuthor?: boolean;
};

type BookshelfItem = {
  id: string;
  session: string;
  title: string;
  author: string;
  category: string;
  coverImage: string;
  rating: number;
};

type NoticePollOption = {
  id: string;
  label: string;
  voters: string[];
};

type NoticePoll = {
  endsAt: string;
  allowDuplicate: boolean;
  anonymous: boolean;
  closed?: boolean;
  options: NoticePollOption[];
};

function GroupHomeView({ group, onBack }: { group: Group; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'home' | 'notice' | 'bookshelf'>('home');
  const [noticePage, setNoticePage] = useState(1);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [noticeCommentInput, setNoticeCommentInput] = useState('');
  const [selectedBookshelfSession, setSelectedBookshelfSession] = useState('7기');
  const [noticeCommentsById, setNoticeCommentsById] = useState<Record<string, NoticeComment[]>>({});
  const [selectedVoteOptionIdsByNotice, setSelectedVoteOptionIdsByNotice] = useState<Record<string, string[]>>({});
  const [submittedVoteOptionIdsByNotice, setSubmittedVoteOptionIdsByNotice] = useState<Record<string, string[]>>({});
  const [noticePollOptionsById, setNoticePollOptionsById] = useState<Record<string, NoticePollOption[]>>({});
  const [voteVotersModal, setVoteVotersModal] = useState<{
    optionLabel: string;
    voters: string[];
  } | null>(null);
  const noticePageSize = 8;
  const bookCoverUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/tmp/little-prince.jpg')).uri,
    [],
  );
  const bookshelfSessions = useMemo(() => ['7기', '8기', '9기'], []);

  const bookshelfItems = useMemo<BookshelfItem[]>(
    () =>
      Array.from({ length: 14 }).map((_, index) => {
        const session = bookshelfSessions[index % bookshelfSessions.length];
        const categoryPool = ['소설/시/희곡', '자기계발', '정치/외교/국방', '어린이/청소년', '사회과학'];
        const category = categoryPool[index % categoryPool.length];

        return {
          id: `${group.id}-bookshelf-${index + 1}`,
          session,
          title: `책제목${index + 1}`,
          author: `작가 ${index + 1}`,
          category,
          coverImage: bookCoverUri,
          rating: 3 + (index % 3),
        };
      }),
    [bookCoverUri, bookshelfSessions, group.id],
  );

  const visibleBookshelfItems = useMemo(
    () => bookshelfItems.filter((item) => item.session === selectedBookshelfSession),
    [bookshelfItems, selectedBookshelfSession],
  );

  const noticeItems = useMemo<NoticeItem[]>(
    () =>
      Array.from({ length: 26 }).map((_, index) => {
        const tags: NoticeTag[] = [];
        if (index <= 3) {
          tags.push('PIN');
        } else if (index <= 5) {
          tags.push('VOTE');
        } else if (index === 6) {
          tags.push('VOTE', 'MEETING');
        } else if (index <= 10) {
          tags.push('MEETING');
        } else {
          if (index % 3 === 0) tags.push('VOTE');
          if (index % 2 === 0) tags.push('MEETING');
          if (tags.length === 0) tags.push('MEETING');
        }

        const date = `2025-11-${String((index % 28) + 1).padStart(2, '0')}`;
        const category: NoticeItem['category'] =
          tags.includes('PIN') ? '일반' : tags.includes('VOTE') ? '투표' : '모임';
        const needsPoll = tags.includes('VOTE');

        let poll: NoticePoll | undefined;
        if (needsPoll) {
          const voterPool = [
            'hy_0716',
            'hy_0717',
            'hy_0718',
            'hy_0720',
            'hy_0721',
            'hy_0723',
            'reader_1',
            'reader_2',
            'reader_3',
            'reader_4',
            'reader_5',
            'reader_6',
          ];

          const optionCount = 5;
          const options = Array.from({ length: optionCount }).map((__, optionIndex) => {
            const voteCount = 3 + ((index + optionIndex * 2) % 6);
            const voters = Array.from({ length: voteCount }).map(
              (_, voterIndex) => voterPool[(index + optionIndex + voterIndex) % voterPool.length],
            );

            return {
              id: `${group.id}-poll-${index + 1}-${optionIndex + 1}`,
              label: `${optionIndex + 1}번 · 설문 항목 ${optionIndex + 1}`,
              voters,
            };
          });

          poll = {
            endsAt: `${date} 17:05`,
            allowDuplicate: true,
            anonymous: index % 2 === 0,
            closed: false,
            options,
          };
        }

        return {
          id: `${group.id}-notice-${index + 1}`,
          title: `${group.name} 공지 ${index + 1} · 이번 주 모임 운영 및 안내 사항`,
          date,
          tags,
          category,
          content:
            `모임 공지 ${index + 1} 안내드립니다.\n` +
            `이번 주 진행 내용과 운영 관련 변경 사항을 공유합니다.\n\n` +
            `1. 모임 일정 및 진행 방식\n` +
            `2. 준비물 및 참여 방식\n` +
            `3. 기타 문의는 댓글로 남겨주세요.\n\n` +
            `감사합니다.`,
          poll,
        };
      }),
    [group.id, group.name],
  );

  const selectedNotice = useMemo(
    () => noticeItems.find((item) => item.id === selectedNoticeId) ?? null,
    [noticeItems, selectedNoticeId],
  );

  const buildDefaultNoticeComments = useCallback((noticeId: string): NoticeComment[] => {
    const seed = noticeId.length;
    return [
      {
        id: `${noticeId}-c1`,
        author: 'hy_1234',
        date: '2025.09.22',
        content: '인정합니다.',
        isAuthor: true,
      },
      {
        id: `${noticeId}-c2`,
        author: 'hy_me',
        date: '2025.09.22',
        content: '좋은 공지 감사합니다.',
        mine: true,
      },
      {
        id: `${noticeId}-c3`,
        author: `member_${(seed % 9) + 1}`,
        date: '2025.09.22',
        content: '참여 일정 확인했습니다.',
      },
    ];
  }, []);

  const currentNoticeComments = useMemo(() => {
    if (!selectedNotice) return [];
    return noticeCommentsById[selectedNotice.id] ?? buildDefaultNoticeComments(selectedNotice.id);
  }, [buildDefaultNoticeComments, noticeCommentsById, selectedNotice]);

  const currentNoticePollOptions = useMemo(() => {
    if (!selectedNotice?.poll) return [];
    return noticePollOptionsById[selectedNotice.id] ?? selectedNotice.poll.options;
  }, [noticePollOptionsById, selectedNotice]);

  const currentSelectedVoteOptionIds = useMemo(() => {
    if (!selectedNotice) return [];
    return selectedVoteOptionIdsByNotice[selectedNotice.id] ?? [];
  }, [selectedNotice, selectedVoteOptionIdsByNotice]);

  const hasSubmittedVoteInNotice = useMemo(() => {
    if (!selectedNotice) return false;
    return (submittedVoteOptionIdsByNotice[selectedNotice.id] ?? []).length > 0;
  }, [selectedNotice, submittedVoteOptionIdsByNotice]);

  const totalNoticePages = Math.max(1, Math.ceil(noticeItems.length / noticePageSize));
  const currentNoticePage = Math.min(noticePage, totalNoticePages);

  const visibleNotices = useMemo(() => {
    const start = (currentNoticePage - 1) * noticePageSize;
    const end = start + noticePageSize;
    return noticeItems.slice(start, end);
  }, [currentNoticePage, noticeItems]);

  const visiblePageNumbers = useMemo(() => {
    const pageWindow = 5;
    const half = Math.floor(pageWindow / 2);
    let start = Math.max(1, currentNoticePage - half);
    let end = Math.min(totalNoticePages, start + pageWindow - 1);
    start = Math.max(1, end - pageWindow + 1);
    return Array.from({ length: end - start + 1 }).map((_, idx) => start + idx);
  }, [currentNoticePage, totalNoticePages]);

  useEffect(() => {
    setNoticePage(1);
    setSelectedNoticeId(null);
    setNoticeCommentInput('');
    setVoteVotersModal(null);
    setSelectedBookshelfSession('7기');
  }, [activeTab, group.id]);

  const tabItems: Array<{
    key: 'home' | 'notice' | 'bookshelf';
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }> = [
    { key: 'home', label: '모임 홈', icon: 'home' },
    { key: 'notice', label: '공지사항', icon: 'notifications-none' },
    { key: 'bookshelf', label: '책장', icon: 'collections-bookmark' },
  ];

  const renderNoticeTag = (tag: NoticeTag, key: string) => {
    if (tag === 'PIN') {
      return (
        <View key={key} style={[styles.noticeTag, styles.noticeTagPin]}>
          <MaterialIcons name="push-pin" size={12} color={colors.white} />
        </View>
      );
    }

    if (tag === 'VOTE') {
      return (
        <View key={key} style={[styles.noticeTag, styles.noticeTagVote]}>
          <Text style={styles.noticeTagText}>투표</Text>
        </View>
      );
    }

    return (
      <View key={key} style={[styles.noticeTag, styles.noticeTagMeeting]}>
        <Text style={styles.noticeTagText}>모임</Text>
      </View>
    );
  };

  const handleSubmitNoticeComment = useCallback(() => {
    if (!selectedNotice) return;
    const content = noticeCommentInput.trim();
    if (!content) {
      showToast('댓글 내용을 입력해주세요.');
      return;
    }

    setNoticeCommentsById((prev) => {
      const prevComments = prev[selectedNotice.id] ?? buildDefaultNoticeComments(selectedNotice.id);
      return {
        ...prev,
        [selectedNotice.id]: [
          {
            id: `${selectedNotice.id}-c-${Date.now()}`,
            author: 'hy_me',
            date: '방금 전',
            content,
            mine: true,
          },
          ...prevComments,
        ],
      };
    });
    setNoticeCommentInput('');
  }, [buildDefaultNoticeComments, noticeCommentInput, selectedNotice]);

  const handlePressCommentMenu = useCallback(
    (comment: NoticeComment) => {
      if (!selectedNotice) return;

      if (comment.mine) {
        Alert.alert('댓글 메뉴', '원하는 작업을 선택해주세요.', [
          { text: '취소', style: 'cancel' },
          { text: '수정하기', onPress: () => showToast('수정 기능은 준비 중입니다.') },
          {
            text: '삭제하기',
            style: 'destructive',
            onPress: () => {
              setNoticeCommentsById((prev) => {
                const prevComments = prev[selectedNotice.id] ?? buildDefaultNoticeComments(selectedNotice.id);
                return {
                  ...prev,
                  [selectedNotice.id]: prevComments.filter((item) => item.id !== comment.id),
                };
              });
            },
          },
        ]);
        return;
      }

      Alert.alert('댓글 메뉴', '원하는 작업을 선택해주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '신고하기', onPress: () => showToast('신고가 접수되었습니다.') },
      ]);
    },
    [buildDefaultNoticeComments, selectedNotice],
  );

  const handleToggleVoteOption = useCallback(
    (optionId: string) => {
      if (!selectedNotice?.poll || selectedNotice.poll.closed) return;
      const noticeId = selectedNotice.id;

      setSelectedVoteOptionIdsByNotice((prev) => {
        const current = prev[noticeId] ?? [];
        if (selectedNotice.poll?.allowDuplicate) {
          const next = current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];
          return { ...prev, [noticeId]: next };
        }
        return { ...prev, [noticeId]: current.includes(optionId) ? [] : [optionId] };
      });
    },
    [selectedNotice],
  );

  const handleOpenVoteVoters = useCallback(
    (optionId: string) => {
      if (!selectedNotice?.poll) return;
      const option = currentNoticePollOptions.find((item) => item.id === optionId);
      if (!option) return;

      if (selectedNotice.poll.anonymous) {
        showToast('익명 투표는 투표자 목록을 볼 수 없습니다.');
        return;
      }

      setVoteVotersModal({
        optionLabel: option.label,
        voters: option.voters,
      });
    },
    [currentNoticePollOptions, selectedNotice],
  );

  const handleSubmitVote = useCallback(() => {
    if (!selectedNotice?.poll) return;
    if (selectedNotice.poll.closed) {
      showToast('투표가 종료되었습니다.');
      return;
    }

    const noticeId = selectedNotice.id;
    const selectedIds = selectedVoteOptionIdsByNotice[noticeId] ?? [];
    if (selectedIds.length === 0) {
      showToast('투표 항목을 선택해주세요.');
      return;
    }

    setNoticePollOptionsById((prev) => {
      const current = prev[noticeId] ?? selectedNotice.poll?.options ?? [];
      const next = current.map((option) => {
        const withoutMine = option.voters.filter((voter) => voter !== 'hy_me');
        if (selectedIds.includes(option.id)) {
          return { ...option, voters: [...withoutMine, 'hy_me'] };
        }
        return { ...option, voters: withoutMine };
      });

      return { ...prev, [noticeId]: next };
    });

    setSubmittedVoteOptionIdsByNotice((prev) => ({
      ...prev,
      [noticeId]: selectedIds,
    }));
    showToast('투표가 완료되었습니다.');
  }, [selectedNotice, selectedVoteOptionIdsByNotice]);

  const getBookshelfCategoryBadgeStyle = useCallback((category: string) => {
    switch (category) {
      case '자기계발':
        return styles.bookshelfCategoryBlue;
      case '정치/외교/국방':
        return styles.bookshelfCategoryPurple;
      case '어린이/청소년':
        return styles.bookshelfCategoryOrange;
      case '사회과학':
        return styles.bookshelfCategoryTeal;
      default:
        return styles.bookshelfCategoryPink;
    }
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl * 2 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {}}
          tintColor={colors.primary1}
          colors={[colors.primary1]}
        />
      }
    >
      <Pressable
        style={({ pressed }) => [styles.breadcrumbRow, pressed && styles.pressed]}
        onPress={onBack}
      >
        <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
        <Text style={styles.breadcrumbText}>모임 목록</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, styles.detailTitle]}>{group.name}</Text>

      <View style={styles.pillNav}>
        {tabItems.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={({ pressed }) => [
                styles.pillNavItem,
                active && styles.pillNavItemActive,
                pressed && styles.pressed,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialIcons
                name={tab.icon}
                size={16}
                color={active ? colors.primary1 : colors.gray4}
              />
              <Text style={[styles.pillNavText, active && styles.pillNavTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'home' ? (
        <View style={styles.detailCard}>
          {group.notice ? (
            <View style={styles.noticeBox}>
              <MaterialIcons name="campaign" size={18} color={colors.primary1} />
              <Text style={styles.noticeText}>{group.notice}</Text>
            </View>
          ) : null}

          <View style={styles.detailMain}>
            <View style={styles.detailImage} />
            <View style={styles.detailInfo}>
              <View style={styles.tagRow}>
                {group.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>모임 대상</Text>
                <Text style={styles.metaValue}>{group.topic}</Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>활동 지역</Text>
                <Text style={styles.metaValue}>{group.region}</Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>모임 취지</Text>
                <Text style={styles.metaValue}>토론, 친목</Text>
              </View>
              {group.description ? (
                <Text style={styles.detailBody}>{group.description}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.detailButtons}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, styles.detailButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>{group.nextSession ?? '이번 모임 바로가기'}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.outlineButton, styles.detailButton, pressed && styles.pressed]}
            >
              <Text style={styles.outlineButtonText}>문의하기</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeTab === 'notice' ? (
        selectedNotice ? (
          <View style={styles.noticeDetailCard}>
            <Pressable
              style={({ pressed }) => [styles.breadcrumbPress, pressed && styles.pressed]}
              onPress={() => {
                setSelectedNoticeId(null);
                setNoticeCommentInput('');
              }}
            >
              <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
              <Text style={styles.breadcrumbText}>공지사항</Text>
            </Pressable>

            <View style={styles.noticeDetailTopRow}>
              <View style={[styles.noticeTag, styles.noticeTagPin]}>
                <Text style={styles.noticeTagText}>{selectedNotice.category}</Text>
              </View>
              <Text style={styles.noticeDetailDate}>{selectedNotice.date}</Text>
            </View>
            <Text style={styles.noticeDetailTitle}>{selectedNotice.title}</Text>
            <Text style={styles.noticeDetailBody}>{selectedNotice.content}</Text>
            {selectedNotice.poll ? (
              <View style={styles.noticePollSection}>
                <View style={styles.noticePollMetaRow}>
                  <Text style={styles.noticePollEndText}>투표 종료 {selectedNotice.poll.endsAt}</Text>
                  <View style={styles.noticePollMetaRight}>
                    <Text style={styles.noticePollMetaText}>
                      {selectedNotice.poll.allowDuplicate ? '중복 가능' : '중복 불가'}
                    </Text>
                    <View style={styles.noticePollMetaPrivacy}>
                      <MaterialIcons
                        name={selectedNotice.poll.anonymous ? 'lock-outline' : 'public'}
                        size={14}
                        color={colors.gray4}
                      />
                      <Text style={styles.noticePollMetaText}>
                        {selectedNotice.poll.anonymous ? '익명' : '공개'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.noticePollOptionList}>
                  {currentNoticePollOptions.map((option) => {
                    const selected = currentSelectedVoteOptionIds.includes(option.id);
                    const voteCount = option.voters.length;
                    return (
                      <Pressable
                        key={option.id}
                        style={({ pressed }) => [
                          styles.noticePollOptionRow,
                          selected && styles.noticePollOptionRowSelected,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handleToggleVoteOption(option.id)}
                      >
                        <View style={styles.noticePollOptionLeft}>
                          <MaterialIcons
                            name={selected ? 'check-circle' : 'radio-button-unchecked'}
                            size={18}
                            color={selected ? colors.primary1 : colors.gray4}
                          />
                          <Text style={styles.noticePollOptionText} numberOfLines={1}>
                            {option.label}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.noticePollOptionCount}
                          disabled={voteCount <= 0}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleOpenVoteVoters(option.id);
                          }}
                        >
                          <MaterialIcons name="person-outline" size={16} color={colors.gray4} />
                          <Text style={styles.noticePollOptionCountText}>{voteCount}</Text>
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.noticePollSubmitButton,
                    (selectedNotice.poll?.closed ||
                      (!selectedNotice.poll?.closed && currentSelectedVoteOptionIds.length === 0)) &&
                      styles.noticePollSubmitButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                  disabled={
                    Boolean(selectedNotice.poll?.closed) ||
                    currentSelectedVoteOptionIds.length === 0
                  }
                  onPress={handleSubmitVote}
                >
                  <Text style={styles.noticePollSubmitText}>
                    {selectedNotice.poll?.closed
                      ? '투표 종료'
                      : hasSubmittedVoteInNotice
                        ? '다시 투표'
                        : '투표하기'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.noticeDetailImageStrip} />
            )}
            <View style={styles.noticeDetailDivider} />

            <View style={styles.noticeCommentSection}>
              <Text style={styles.noticeCommentHeader}>댓글</Text>
              <View style={styles.noticeCommentInputRow}>
                <TextInput
                  value={noticeCommentInput}
                  onChangeText={setNoticeCommentInput}
                  placeholder="댓글 내용"
                  placeholderTextColor={colors.gray3}
                  style={styles.noticeCommentInput}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.noticeCommentSubmit,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleSubmitNoticeComment}
                >
                  <Text style={styles.noticeCommentSubmitText}>입력</Text>
                </Pressable>
              </View>

              <View style={styles.noticeCommentList}>
                {currentNoticeComments.map((comment) => (
                  <View key={comment.id} style={styles.noticeCommentItem}>
                    <View style={styles.noticeCommentAvatar}>
                      <MaterialIcons name="person-outline" size={20} color={colors.gray4} />
                    </View>
                    <View style={styles.noticeCommentBody}>
                      <View style={styles.noticeCommentMetaRow}>
                        <View style={styles.noticeCommentAuthorRow}>
                          <Text style={styles.noticeCommentAuthor}>{comment.author}</Text>
                          {comment.isAuthor ? (
                            <View style={styles.noticeCommentAuthorBadge}>
                              <Text style={styles.noticeCommentAuthorBadgeText}>작성자</Text>
                            </View>
                          ) : null}
                          <Text style={styles.noticeCommentDate}>{comment.date}</Text>
                        </View>
                        <Pressable
                          style={styles.noticeCommentMenuButton}
                          onPress={() => handlePressCommentMenu(comment)}
                        >
                          <MaterialIcons name="more-vert" size={16} color={colors.gray4} />
                        </Pressable>
                      </View>
                      <Text style={styles.noticeCommentText}>{comment.content}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noticeBoardCard}>
            <View style={styles.noticeList}>
              {visibleNotices.map((notice) => (
                <Pressable
                  key={notice.id}
                  style={({ pressed }) => [styles.noticeItemRow, pressed && styles.pressed]}
                  onPress={() => setSelectedNoticeId(notice.id)}
                >
                  <View style={styles.noticeTagRow}>
                    {notice.tags.map((tag, index) =>
                      renderNoticeTag(tag, `${notice.id}-${tag}-${index}`),
                    )}
                  </View>
                  <Text style={styles.noticeItemTitle} numberOfLines={1}>
                    {notice.title}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.noticePagination}>
              <Pressable
                style={({ pressed }) => [
                  styles.noticePageArrow,
                  currentNoticePage === 1 && styles.noticePageArrowDisabled,
                  pressed && styles.pressed,
                ]}
                disabled={currentNoticePage === 1}
                onPress={() => setNoticePage((prev) => Math.max(1, prev - 1))}
              >
                <MaterialIcons name="chevron-left" size={18} color={colors.gray5} />
              </Pressable>

              {visiblePageNumbers.map((page) => {
                const active = page === currentNoticePage;
                return (
                  <Pressable
                    key={`notice-page-${page}`}
                    style={({ pressed }) => [
                      styles.noticePageButton,
                      active && styles.noticePageButtonActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setNoticePage(page)}
                  >
                    <Text style={[styles.noticePageText, active && styles.noticePageTextActive]}>
                      {page}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                style={({ pressed }) => [
                  styles.noticePageArrow,
                  currentNoticePage >= totalNoticePages && styles.noticePageArrowDisabled,
                  pressed && styles.pressed,
                ]}
                disabled={currentNoticePage >= totalNoticePages}
                onPress={() => setNoticePage((prev) => Math.min(totalNoticePages, prev + 1))}
              >
                <MaterialIcons name="chevron-right" size={18} color={colors.gray5} />
              </Pressable>
            </View>
          </View>
        )
      ) : null}

      {activeTab === 'bookshelf' ? (
        <View style={styles.bookshelfSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bookshelfSessionRow}
          >
            {bookshelfSessions.map((session) => {
              const active = selectedBookshelfSession === session;
              return (
                <Pressable
                  key={`${group.id}-session-${session}`}
                  style={({ pressed }) => [
                    styles.bookshelfSessionChip,
                    active && styles.bookshelfSessionChipActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setSelectedBookshelfSession(session)}
                >
                  <Text
                    style={[
                      styles.bookshelfSessionText,
                      active && styles.bookshelfSessionTextActive,
                    ]}
                  >
                    {session}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.bookshelfGrid}>
            {visibleBookshelfItems.map((book) => (
              <View key={book.id} style={styles.bookshelfCard}>
                <Image
                  source={{ uri: book.coverImage }}
                  style={styles.bookshelfCover}
                  resizeMode="cover"
                />
                <Text style={styles.bookshelfTitle} numberOfLines={1}>
                  {book.title}
                </Text>
                <Text style={styles.bookshelfAuthor} numberOfLines={1}>
                  {book.author}
                </Text>
                <View style={styles.bookshelfBadgeRow}>
                  <View style={styles.bookshelfSessionBadge}>
                    <Text style={styles.bookshelfBadgeText}>{book.session}</Text>
                  </View>
                  <View
                    style={[
                      styles.bookshelfCategoryBadge,
                      getBookshelfCategoryBadgeStyle(book.category),
                    ]}
                  >
                    <Text style={styles.bookshelfBadgeText}>{book.category}</Text>
                  </View>
                </View>
                {['발제', '한줄평', '정기모임'].map((label) => (
                  <Pressable
                    key={`${book.id}-${label}`}
                    style={({ pressed }) => [styles.bookshelfLinkRow, pressed && styles.pressed]}
                  >
                    <Text style={styles.bookshelfLinkLabel}>{label}</Text>
                    <MaterialIcons name="north-east" size={14} color={colors.gray3} />
                  </Pressable>
                ))}
                <View style={styles.bookshelfRatingRow}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <MaterialIcons
                      key={`${book.id}-star-${idx}`}
                      name="star"
                      size={16}
                      color={idx < book.rating ? colors.secondary2 : colors.gray2}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <Modal
        visible={Boolean(voteVotersModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setVoteVotersModal(null)}
      >
        <Pressable
          style={styles.voteVotersModalOverlay}
          onPress={() => setVoteVotersModal(null)}
        >
          {voteVotersModal ? (
            <Pressable
              style={styles.voteVotersModalCard}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.voteVotersModalTitle}>{voteVotersModal.optionLabel}</Text>
              <View style={styles.voteVotersList}>
                {voteVotersModal.voters.map((nickname, index) => (
                  <View key={`${nickname}-${index}`} style={styles.voteVotersRow}>
                    <View style={styles.voteVotersAvatar}>
                      <MaterialIcons name="person-outline" size={16} color={colors.gray4} />
                    </View>
                    <Text style={styles.voteVotersName}>{nickname}</Text>
                  </View>
                ))}
                {voteVotersModal.voters.length === 0 ? (
                  <Text style={styles.voteVotersEmptyText}>아직 투표자가 없습니다.</Text>
                ) : null}
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function MeetingCreateFlow({
  onClose,
  onDirtyChange,
}: {
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [step, setStep] = useState<CreateStep>(1);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [targets, setTargets] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([{ text: '', url: '' }]);
  const [checkingName, setCheckingName] = useState(false);
  const [checkedName, setCheckedName] = useState<{
    value: string;
    duplicate: boolean;
  } | null>(null);
  const [creating, setCreating] = useState(false);

  const categoryOptions = useMemo(
    () => Object.keys(categoryCodeByLabel),
    [],
  );
  const targetOptions = useMemo(() => Object.keys(participantCodeByLabel), []);

  const canNext =
    step === 1
      ? name.trim().length > 0 &&
        desc.trim().length > 0 &&
        checkedName?.value === name.trim() &&
        !checkedName.duplicate
      : step === 2
        ? isPublic !== null
        : step === 3
          ? categories.length > 0 && region.trim().length > 0 && targets.length > 0
          : true;

  const isDirty = useMemo(() => {
    if (step !== 1) return true;
    if (name.trim().length > 0) return true;
    if (desc.trim().length > 0) return true;
    if (isPublic !== null) return true;
    if (categories.length > 0) return true;
    if (region.trim().length > 0) return true;
    if (targets.length > 0) return true;
    if (checkedName !== null) return true;
    return links.some((item) => item.text.trim().length > 0 || item.url.trim().length > 0);
  }, [categories.length, checkedName, desc, isPublic, links, name, region, step, targets.length]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => {
      onDirtyChange?.(false);
    };
  }, [isDirty, onDirtyChange]);

  const handleRequestClose = useCallback(() => {
    if (!isDirty) {
      onClose();
      return;
    }

    Alert.alert('알림', '현재 페이지는 저장 되지 않습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '닫기', style: 'destructive', onPress: onClose },
    ]);
  }, [isDirty, onClose]);

  const handleCheckName = async () => {
    const normalized = name.trim();
    if (!normalized) {
      showToast('모임 이름을 입력해주세요.');
      return;
    }

    setCheckingName(true);
    try {
      const duplicate = await checkClubNameDuplicate(normalized);
      setCheckedName({ value: normalized, duplicate });
      showToast(duplicate ? '이미 사용 중인 모임 이름입니다.' : '사용 가능한 모임 이름입니다.');
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('모임 이름 중복 확인에 실패했습니다.');
      }
    } finally {
      setCheckingName(false);
    }
  };

  const handleCreateClub = async () => {
    if (creating) return;

    const categoryCodes = categories
      .map((label) => categoryCodeByLabel[label])
      .filter((code): code is ClubCategoryCode => Boolean(code));

    const participantCodes = targets
      .map((label) => participantCodeByLabel[label])
      .filter((code): code is ClubParticipantTypeCode => Boolean(code));

    if (categoryCodes.length === 0 || participantCodes.length === 0) {
      showToast('카테고리와 모임 대상을 확인해주세요.');
      return;
    }

    const normalizedLinks = links
      .map((item) => ({
        label: item.text.trim(),
        link: item.url.trim(),
      }))
      .filter((item) => item.link.length > 0)
      .slice(0, 4);

    setCreating(true);
    try {
      await createClub({
        name: name.trim(),
        description: desc.trim(),
        region: region.trim(),
        category: categoryCodes,
        participantTypes: participantCodes,
        links: normalizedLinks,
        open: isPublic ?? true,
      });
      showToast('모임이 생성되었습니다.');
      onClose();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('모임 생성에 실패했습니다.');
      }
    } finally {
      setCreating(false);
    }
  };

  const goNext = () => {
    if (step < 4) setStep((prev) => (prev + 1) as CreateStep);
  };
  const goPrev = () => {
    if (step > 1) setStep((prev) => (prev - 1) as CreateStep);
  };

  const toggleItem = (
    item: string,
    list: string[],
    setter: Dispatch<SetStateAction<string[]>>,
    max = 6,
  ) => {
    setter((prev) => {
      if (prev.includes(item)) return prev.filter((x) => x !== item);
      if (prev.length >= max) return prev;
      return [...prev, item];
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.createContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.createContainer}
        contentContainerStyle={styles.createContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.createBreadcrumbWrap}>
          <Pressable
            style={({ pressed }) => [styles.breadcrumbPress, pressed && styles.pressed]}
            onPress={handleRequestClose}
          >
            <Text style={styles.breadcrumbText}>모임</Text>
            <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
            <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>새 모임 생성</Text>
          </Pressable>
        </View>
        <View style={styles.createBody}>
          <View style={styles.stepRow}>
            {[1, 2, 3, 4].map((i) => {
              const active = i === step;
              return (
                <View
                  key={i}
                  style={[styles.stepDot, active ? styles.stepDotActive : styles.stepDotInactive]}
                >
                  <Text style={[styles.stepText, active ? styles.stepTextActive : null]}>{i}</Text>
                </View>
              );
            })}
          </View>

          {step === 1 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>독서 모임 이름을 입력해주세요!</Text>
              <View style={styles.inlineRow}>
                <TextInput
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    const normalized = value.trim();
                    if (checkedName && checkedName.value !== normalized) {
                      setCheckedName(null);
                    }
                  }}
                  placeholder="독서 모임 이름을 입력해주세요"
                  placeholderTextColor={colors.gray3}
                  style={[styles.input, styles.inlineInput]}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.dupCheckButton,
                    checkingName && styles.dupCheckButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    void handleCheckName();
                  }}
                  disabled={checkingName}
                >
                  <Text style={styles.dupCheckText}>
                    {checkingName ? '확인중...' : '중복확인'}
                  </Text>
                </Pressable>
              </View>
              {checkedName && checkedName.value === name.trim() ? (
                <Text
                  style={[
                    styles.nameCheckText,
                    checkedName.duplicate ? styles.nameCheckErrorText : styles.nameCheckSuccessText,
                  ]}
                >
                  {checkedName.duplicate
                    ? '이미 사용 중인 모임 이름입니다.'
                    : '사용 가능한 모임 이름입니다.'}
                </Text>
              ) : null}
              <Text style={styles.helperText}>
                다른 이름을 입력하거나, 기수 또는 지역명을 추가해 구분해주세요. 예) 독서처럼 2기, 독서처럼 서울, 북적북적 인문학팀
              </Text>

              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                모임의 소개글을 입력해주세요!
              </Text>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="자유롭게 입력해주세요! (500자 제한)"
                placeholderTextColor={colors.gray3}
                style={[styles.input, styles.textArea]}
                multiline
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>모임의 프로필 사진을 업로드 해주세요!</Text>
              <View style={styles.logoRow}>
                <View style={styles.logoPlaceholder} />
                <View style={{ gap: spacing.xs }}>
                  <Pressable
                    style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.outlineButtonText}>기본 프로필 사용하기</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.outlineButtonText}>사진 업로드하기</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                모임의 공개여부를 알려주세요!
              </Text>
              <View style={styles.checkboxRow}>
                {['공개', '비공개'].map((label) => {
                  const value = label === '공개';
                  const active = isPublic === value;
                  return (
                    <Pressable
                      key={label}
                      style={({ pressed }) => [styles.checkbox, pressed && styles.pressed]}
                      onPress={() => setIsPublic(value)}
                    >
                      <View style={[styles.checkBoxSquare, active && styles.checkBoxSquareActive]} />
                      <Text style={styles.checkboxLabel}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>선호하는 독서 카테고리를 선택해주세요!</Text>
              <View style={styles.chipGrid}>
                {categoryOptions.map((c) => {
                  const active = categories.includes(c);
                  return (
                    <Pressable
                      key={c}
                      onPress={() => toggleItem(c, categories, setCategories)}
                      style={({ pressed }) => [
                        styles.chip,
                        active ? styles.chipActive : null,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                활동 지역을 입력해주세요! (40자 제한)
              </Text>
              <TextInput
                value={region}
                onChangeText={setRegion}
                placeholder="활동 지역을 입력해주세요 (40자 제한)"
                placeholderTextColor={colors.gray3}
                style={styles.input}
              />

              <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                모임의 대상을 선택해주세요!
              </Text>
              <View style={styles.chipGrid}>
                {targetOptions.map((t) => {
                  const active = targets.includes(t);
                  return (
                    <Pressable
                      key={t}
                      onPress={() => toggleItem(t, targets, setTargets)}
                      style={({ pressed }) => [
                        styles.chip,
                        active ? styles.chipActive : null,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>SNS나 링크 연동이 있다면 해주세요! (선택)</Text>
              {links.map((link, idx) => (
                <View key={idx} style={styles.formGroup}>
                  <TextInput
                    value={link.text}
                    onChangeText={(v) => {
                      setLinks((prev: LinkItem[]) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], text: v };
                        return copy;
                      });
                    }}
                    placeholder="링크 대체 텍스트 입력(최대 20자)"
                    placeholderTextColor={colors.gray3}
                    style={styles.input}
                  />
                  <TextInput
                    value={link.url}
                    onChangeText={(v) => {
                      setLinks((prev: LinkItem[]) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], url: v };
                        return copy;
                      });
                    }}
                    placeholder="링크 입력(최대 100자)"
                    placeholderTextColor={colors.gray3}
                    style={styles.input}
                  />
                </View>
              ))}
              <Pressable
                style={({ pressed }) => [styles.addLinkButton, pressed && styles.pressed]}
                onPress={() => setLinks((prev: LinkItem[]) => [...prev, { text: '', url: '' }])}
              >
                <Text style={styles.addLinkText}>+</Text>
              </Pressable>
            </View>
          )}

          <View style={[styles.navRow, step === 1 ? styles.navRowSingle : null]}>
            {step > 1 ? (
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, styles.buttonGrow]}
                onPress={goPrev}
              >
                <Text style={styles.secondaryText}>이전</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (!canNext || (step === 4 && creating)) && styles.primaryButtonDisabled,
                pressed && styles.pressed,
                step === 1 ? styles.buttonSingle : styles.buttonGrow,
              ]}
              disabled={!canNext || (step === 4 && creating)}
              onPress={() => {
                if (step === 4) {
                  void handleCreateClub();
                  return;
                }
                goNext();
              }}
            >
              <Text
                style={[
                  styles.primaryText,
                  (!canNext || (step === 4 && creating)) && styles.disabledText,
                ]}
              >
                {step === 4 ? (creating ? '완료 중...' : '완료') : '다음'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
