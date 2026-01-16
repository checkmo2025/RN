import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
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

import { colors, radius, spacing, typography } from '../theme';

type Group = {
  id: string;
  name: string;
  tags: string[];
  topic: string;
  region: string;
  description?: string;
  notice?: string;
  nextSession?: string;
  isPrivate?: boolean;
};

type LinkItem = { text: string; url: string };

const filters = ['전체', '모임별', '지역별'] as const;

export function MeetingScreen() {
  const [showCreate, setShowCreate] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const myGroups = useMemo<Group[]>(
    () =>
      ['모임 명', '모임 명', '모임 명', '모임 명'].map((name, idx) => ({
        id: `my-${idx}`,
        name,
        tags: [],
        topic: '',
        region: '',
      })),
    [],
  );

  const discoverGroups = useMemo<Group[]>(
    () => [
      {
        id: 'g-1',
        name: '복적복적',
        tags: ['여행', '경제/경영', '과학'],
        topic: '모임 대상 · 대학생, 직장인, 동아리, 모임',
        region: '활동 지역 · 강북',
        notice: '금칙 금칙 머리나 굳지 말고 모임에서 책임지고! 금칙굳적 독서 모임 소개글',
        description:
          '책을 좋아하는 사람들이 모여 각자의 속도로 읽고, 각자의 언어로 생각을 나누는 책 모임입니다. 이 모임은 정답을 찾기보다 질문을 남기는 시간을 소중히 여깁니다. 한 권의 책을 통해 서로의 관점과 경험을 자연스럽게 공유하는 것을 목표로 합니다.',
        nextSession: '이번 모임 바로가기',
        isPrivate: true,
      },
      {
        id: 'g-2',
        name: '독서 사색',
        tags: ['소설', '철학'],
        topic: '작품 토론 · 격주',
        region: '온라인',
        notice: '이번 달 주제: 단편 소설로 떠나는 세계 여행',
        description:
          '서로의 해석을 존중하며 깊이 있는 토론을 지향합니다. 처음 오시는 분들도 부담 없이 의견을 나누고 배울 수 있는 공간을 목표로 합니다.',
      },
    ],
    [],
  );

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('전체');
  const [refreshing, setRefreshing] = useState(false);

  const filteredDiscover = discoverGroups.filter((g) =>
    g.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setSearch('');
      setActiveFilter('전체');
      setRefreshing(false);
    }, 600);
  };

  if (showCreate) {
    return <MeetingCreateFlow onClose={() => setShowCreate(false)} />;
  }

  if (activeGroup) {
    return <GroupHomeView group={activeGroup} onBack={() => setActiveGroup(null)} />;
  }

  return (
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
        onPress={() => setShowCreate(true)}
      >
        <Text style={styles.createButtonText}>+ 모임 생성하기</Text>
      </Pressable>

      <View style={styles.myGroupCard}>
        {myGroups.slice(0, 3).map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.myGroupRow, pressed && styles.pressed]}
          >
            <Text style={styles.myGroupName}>{item.name}</Text>
          </Pressable>
        ))}
        <Pressable
          style={({ pressed }) => [styles.expandButton, pressed && styles.pressed]}
        >
          <Text style={styles.expandText}>전체보기</Text>
          <MaterialIcons name="expand-more" size={18} color={colors.gray6} />
        </Pressable>
      </View>

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
        {filters.map((filter) => {
          const active = filter === activeFilter;
          return (
            <Pressable
              key={filter}
              style={styles.filterChip}
              onPress={() => setActiveFilter(filter)}
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

      <View style={styles.groupList}>
        {filteredDiscover.map((group) => (
          <View key={group.id} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupName}>{group.name}</Text>
              {group.isPrivate ? (
                <Text style={styles.privateBadge}>비공개</Text>
              ) : null}
            </View>
            <View style={styles.tagRow}>
              {group.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.groupMeta}>{group.topic}</Text>
            <Text style={styles.groupMeta}>{group.region}</Text>
            <View style={styles.groupActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.outlineButton,
                  styles.groupButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.outlineButtonText}>가입신청하기</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.groupButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => setActiveGroup(group)}
              >
                <Text style={styles.primaryButtonText}>방문하기</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
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
  myGroupCard: {
    backgroundColor: colors.subbrown4,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  myGroupRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  myGroupName: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    marginTop: spacing.xs,
  },
  expandText: {
    ...typography.body2_2,
    color: colors.gray6,
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
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    ...typography.body1_3,
    color: colors.gray5,
  },
  stepTextActive: {
    color: colors.white,
  },
  sectionBox: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
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
    color: colors.gray5,
  },
  textArea: {
    height: 140,
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
    marginTop: spacing.md,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
});

type CreateStep = 1 | 2 | 3 | 4;

function GroupHomeView({ group, onBack }: { group: Group; onBack: () => void }) {
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
        {['모임 홈', '공지사항', '책장'].map((tab, idx) => {
          const active = idx === 0;
          return (
            <Pressable
              key={tab}
              style={({ pressed }) => [
                styles.pillNavItem,
                active && styles.pillNavItemActive,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons
                name={idx === 0 ? 'home' : idx === 1 ? 'notifications-none' : 'collections-bookmark'}
                size={16}
                color={active ? colors.primary1 : colors.gray4}
              />
              <Text style={[styles.pillNavText, active && styles.pillNavTextActive]}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>

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
    </ScrollView>
  );
}

function MeetingCreateFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<CreateStep>(1);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [targets, setTargets] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([{ text: '', url: '' }]);

  const categoryOptions = useMemo(
    () => ['국내도서', '해외도서', '소설/시/희곡', '에세이', '인문학', '경제/경영', '과학', '예술', '자기계발'],
    [],
  );
  const targetOptions = useMemo(() => ['대학생', '직장인', '동아리', '모임', '친목'], []);

  const canNext =
    step === 1
      ? name.trim().length > 0 && desc.trim().length > 0
      : step === 2
        ? isPublic !== null
        : step === 3
          ? categories.length > 0 && region.trim().length > 0 && targets.length > 0
          : true;

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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.breadcrumbRow}>
          <Pressable
            style={({ pressed }) => [styles.breadcrumbRow, pressed && styles.pressed]}
            onPress={onClose}
          >
            <Text style={styles.breadcrumbText}>모임</Text>
            <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
            <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>새 모임 생성</Text>
          </Pressable>
        </View>

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
                onChangeText={setName}
                placeholder="독서 모임 이름을 입력해주세요"
                placeholderTextColor={colors.gray3}
                style={[styles.input, styles.inlineInput]}
              />
              <Pressable
                style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
              >
                <Text style={styles.outlineButtonText}>중복확인</Text>
              </Pressable>
            </View>
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

        <View style={styles.navRow}>
          {step > 1 ? (
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, styles.buttonFlex]}
              onPress={goPrev}
            >
              <Text style={styles.secondaryText}>이전</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              !canNext && styles.primaryButtonDisabled,
              pressed && styles.pressed,
              styles.buttonFlex,
            ]}
            disabled={!canNext}
            onPress={step === 4 ? onClose : goNext}
          >
            <Text style={[styles.primaryText, !canNext && styles.disabledText]}>
              {step === 4 ? '완료' : '다음'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
