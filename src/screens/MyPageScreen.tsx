import { useMemo, useState, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';

import { colors, radius, spacing, typography } from '../theme';

const tabs = ['내 책 이야기', '내 서재', '내 모임', '내 알림'] as const;
type TabKey = (typeof tabs)[number];

type StoryCard = {
  id: string;
  title: string;
  excerpt: string;
  likes: number;
  comments: number;
};

type BookCard = {
  id: string;
  title: string;
  author: string;
};

type GroupItem = {
  id: string;
  name: string;
};

type AlarmItem = {
  id: string;
  text: string;
  time: string;
  unread?: boolean;
};

export function MyPageScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('내 책 이야기');
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);

  const writeIconUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/write-floating.svg')).uri,
    [],
  );
  const settingIconUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/mypage/mypage-setting.svg')).uri,
    [],
  );
  const settingProfileUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/mypage/setting-profile.svg')).uri,
    [],
  );
  const settingServiceUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/mypage/setting-service.svg')).uri,
    [],
  );
  const settingOtherUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/mypage/setting-other.svg')).uri,
    [],
  );
  const likeIconUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/book-story/bookstory-like.svg')).uri,
    [],
  );
  const commentIconUri = useMemo(
    () => Image.resolveAssetSource(require('../../assets/book-story/bookstory-comment.svg')).uri,
    [],
  );

  const stories: StoryCard[] = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, idx) => ({
        id: `s-${idx}`,
        title: '나는 나이든 왕자다',
        excerpt: '나는 나이트 왕자다. 그 누가 숫자가 중요하다가 했던가. 세고 또...',
        likes: 1 + (idx % 3),
        comments: 1 + (idx % 2),
      })),
    [],
  );

  const books: BookCard[] = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, idx) => ({
        id: `b-${idx}`,
        title: '책 제목',
        author: '작가/작가가각가',
      })),
    [],
  );

  const groups: GroupItem[] = useMemo(
    () => Array.from({ length: 5 }).map((_, idx) => ({ id: `g-${idx}`, name: '복적복적' })),
    [],
  );

  const alarms: AlarmItem[] = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, idx) => ({
        id: `a-${idx}`,
        text: '겅표쥬응님이 댓글을 남겼습니다: 정말 재미지...',
        time: idx === 0 ? '지금' : '2분 전',
        unread: idx === 0,
      })),
    [],
  );

  const renderStories = () => (
    <View style={[styles.gridContent, styles.cardWrap]}>
      {stories.map((item) => (
        <View key={item.id} style={styles.storyCard}>
          <View style={styles.storyThumb} />
          <Text style={styles.storyTitle}>{item.title}</Text>
          <Text style={styles.storyExcerpt} numberOfLines={2}>
            {item.excerpt}
          </Text>
          <View style={styles.storyActions}>
            <View style={styles.inlineAction}>
              <SvgUri uri={likeIconUri} width={18} height={18} />
              <Text style={styles.inlineText}>{item.likes}</Text>
            </View>
            <View style={styles.actionDivider} />
            <View style={styles.inlineAction}>
              <SvgUri uri={commentIconUri} width={18} height={18} />
              <Text style={styles.inlineText}>{item.comments}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderBooks = () => (
    <View style={[styles.gridContent, styles.bookWrap]}>
      {books.map((item) => (
        <View key={item.id} style={styles.bookCard}>
          <View style={styles.bookThumb}>
            <MaterialIcons name="favorite" size={18} color={colors.secondary1} />
          </View>
          <Text style={styles.bookTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.author}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderGroups = () => (
    <View style={styles.listContainer}>
      {groups.map((group) => (
        <View key={group.id} style={styles.groupRow}>
          <Text style={styles.groupName}>{group.name}</Text>
        </View>
      ))}
    </View>
  );

  const renderAlarms = () => (
    <View style={styles.listContainer}>
      {alarms.map((alarm) => (
        <View key={alarm.id} style={styles.alarmRow}>
          <View style={[styles.alarmDot, alarm.unread ? styles.alarmDotActive : null]} />
          <View style={styles.alarmBody}>
            <Text style={styles.alarmText} numberOfLines={1}>
              {alarm.text}
            </Text>
          </View>
          <Text style={styles.alarmTime}>{alarm.time}</Text>
        </View>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case '내 책 이야기':
        return renderStories();
      case '내 서재':
        return renderBooks();
      case '내 모임':
        return renderGroups();
      case '내 알림':
        return renderAlarms();
      default:
        return null;
    }
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        setActiveTab('내 책 이야기');
        setShowSettings(false);
        setSelectedSetting(null);
      };
    }, []),
  );

  const handleContact = useCallback(() => {
    Linking.openURL('https://forms.gle/vb6un6ji6WwTCZ9w5').catch(() => null);
  }, []);

  const settingsSections = [
    {
      title: '계정 관리',
      iconUri: settingProfileUri,
      items: [
        '프로필 편집',
        '이메일 변경',
        '비밀번호 변경',
        '소셜 로그인/탈퇴/비활성화',
      ],
    },
    {
      title: '서비스',
      iconUri: settingServiceUri,
      items: ['내 소식 관리', '신고 관리', '알림 관리'],
    },
    {
      title: '기타',
      iconUri: settingOtherUri,
      items: ['고객센터/문의하기', '이용약관', '버전 정보', '로그아웃'],
    },
  ];

  const renderSettingDetail = () => {
    if (!selectedSetting) return null;

    const back = (
      <Pressable
        style={({ pressed }) => [styles.breadcrumbRow, pressed && styles.pressed]}
        onPress={() => setSelectedSetting(null)}
      >
        <Text style={styles.breadcrumbText}>뒤로가기</Text>
      </Pressable>
    );

    if (selectedSetting === '버전 정보') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{selectedSetting}</Text>
          <Text style={styles.detailDivider} />
          <Text style={styles.detailBody}>버전 업데이트 날짜 : 2026.01.01</Text>
        </View>
      );
    }

    if (selectedSetting === '비밀번호 변경') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>{selectedSetting}</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>기존 비밀번호</Text>
            <View style={styles.inputPlaceholder}>
              <Text style={styles.placeholderText}>기존 비밀번호를 입력해주세요</Text>
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>새 비밀번호</Text>
            <View style={styles.inputPlaceholder}>
              <Text style={styles.placeholderText}>새 비밀번호를 입력해주세요</Text>
            </View>
            <View style={styles.inputPlaceholder}>
              <Text style={styles.placeholderText}>비밀번호 확인</Text>
            </View>
          </View>
          <Pressable style={[styles.disabledButton]}>
            <Text style={styles.disabledText}>변경하기</Text>
          </Pressable>
        </View>
      );
    }

    if (selectedSetting === '소셜 로그인/탈퇴/비활성화') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>소셜 로그인 연동 관리</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.socialCard}>
            <Text style={styles.socialEmail}>yhi9839@gmail.com</Text>
          </View>
          <Text style={[styles.detailTitle, { marginTop: spacing.md }]}>탈퇴/비활성화</Text>
          <View style={styles.detailList}>
            <Text style={styles.detailBody}>
              1. 탈퇴 신청 후 보류 기간{'\n'}- 탈퇴 신청 시 즉시 탈퇴가 아닌 7일간의 유예 기간이 적용됩니다.{'\n'}- 이 기간
              동안에는 언제든 탈퇴를 철회할 수 있습니다.
            </Text>
            <Text style={styles.detailBody}>
              2. 탈퇴 처리{'\n'}- 유예 기간(7일)이 지나면 회원 정보와 활동 기록은 모두 영구적으로 삭제됩니다.{'\n'}- 단, 법적
              보관 의무가 있는 데이터는 관련 법령에 따라 일정 기간 보관 후 파기됩니다.
            </Text>
            <Text style={styles.detailBody}>
              3. 주의사항{'\n'}- 유예 기간(7일)이 지나면 복구가 불가능하며, 동일 계정으로 재가입해도 기존 데이터는 복원되지
              않습니다.
            </Text>
          </View>
        </View>
      );
    }

    if (selectedSetting === '신고 관리') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>신고 관리</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.reportList}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <View key={idx} style={styles.reportCard}>
                <Text style={styles.reportBadge}>일반</Text>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportUser}>hy_0716</Text>
                  <Text style={styles.reportDate}>2025.01.01</Text>
                </View>
                <Text style={styles.reportText}>
                  아무 의미 없이 문장을 채우기 위해 작성된 글자 더미입니다. 이 문장은 특정한 정보를 ......
                </Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (selectedSetting === '이용약관') {
      return (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.settingsDetailWrap}
          showsVerticalScrollIndicator={false}
        >
          {back}
          <Text style={styles.detailTitle}>이용약관</Text>
          <Text style={styles.detailDivider} />
          <Text style={styles.detailBody}>
            제 1조 (목적){'\n'}본 약관은 책모(이하 “서비스”)가 제공하는 독서 커뮤니티 플랫폼 및 관련 제반 서비스의 이용과
            관련하여 서비스와 회원 간의 권리, 의무 및 책임을 규정할 목적으로 합니다.{'\n\n'}제 2조 (정의){'\n'}본 약관에서
            사용하는 용어의 정의는 다음과 같습니다.{'\n'}1. “서비스”란 책모가 제공하는 웹 및 애플리케이션 기반의 독서 커뮤니티,
            모임, 콘텐츠 공유 등 일체의 서비스를 의미합니다.
          </Text>
        </ScrollView>
      );
    }

    if (selectedSetting === '알림 관리') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>알림 관리</Text>
          <Text style={styles.detailDivider} />
          {['책 이야기 좋아요 알림', '책 이야기 댓글 알림', '구독자 알림', '독서 모임 가입 알림', '공지사항 알림'].map(
            (label, idx) => (
              <View key={idx} style={styles.alarmRow}>
                <View style={styles.alarmInfo}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailBody}>내 활동에 대한 알림 수신</Text>
                </View>
                <View style={styles.toggleMock} />
              </View>
            ),
          )}
        </View>
      );
    }

    if (selectedSetting === '이메일 변경') {
      return (
        <View style={styles.settingsDetailWrap}>
          {back}
          <Text style={styles.detailTitle}>이메일 변경</Text>
          <Text style={styles.detailDivider} />
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>기존 이메일</Text>
            <View style={styles.inputPlaceholder}>
              <Text style={styles.placeholderText}>기존 이메일을 입력해주세요</Text>
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>변경 이메일</Text>
            <View style={styles.inputPlaceholder}>
              <Text style={styles.placeholderText}>변경할 이메일을 입력해주세요</Text>
            </View>
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.detailLabel}>인증번호</Text>
            <View style={styles.inputPlaceholder}>
              <Text style={styles.placeholderText}>인증번호 입력</Text>
            </View>
          </View>
          <Pressable style={[styles.disabledButton]}>
            <Text style={styles.disabledText}>변경하기</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.settingsDetailWrap}>
        {back}
        <Text style={styles.detailTitle}>{selectedSetting}</Text>
      </View>
    );
  };

  if (showSettings) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.settingsContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.breadcrumbRow}>
          <Pressable
            style={({ pressed }) => [
              styles.breadcrumbRow,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              if (selectedSetting) {
                setSelectedSetting(null);
              } else {
                setShowSettings(false);
              }
            }}
          >
            <Text style={styles.breadcrumbText}>뒤로가기</Text>
          </Pressable>
        </View>

        {selectedSetting ? (
          renderSettingDetail()
        ) : (
          settingsSections.map((section) => (
            <View key={section.title} style={styles.settingsSection}>
              <View style={styles.settingsHeader}>
                <SvgUri uri={section.iconUri} width={18} height={18} />
                <Text style={styles.settingsTitle}>{section.title}</Text>
              </View>
              <View style={styles.settingsItems}>
                {section.items.map((item) => (
                  <Pressable
                    key={item}
                    style={({ pressed }) => [styles.settingsItem, pressed && styles.pressed]}
                    onPress={() => setSelectedSetting(item)}
                  >
                    <Text style={styles.settingsItemText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 600);
            }}
            tintColor={colors.primary1}
            colors={[colors.primary1]}
          />
        }
      >
        <View style={styles.breadcrumbRow}>
          <Text style={styles.breadcrumbText}>전체</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.gray4} />
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>마이페이지</Text>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileAvatar} />
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>_hy_0716</Text>
            <Text style={styles.profileSub}>구독중 2   구독중 2</Text>
            <Text style={styles.profileDesc} numberOfLines={2}>
              이제 다양한 책을 함께 읽고 서로의 생각을 나누는 특별한 시간을 시작해보세요.
              한 권의 책이 주는 작은 울림이 ......
            </Text>
          </View>
          <Pressable
            onPress={() => setShowSettings(true)}
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          >
            <SvgUri uri={settingIconUri} width={22} height={22} />
          </Pressable>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>책 이야기 쓰기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={handleContact}
          >
            <Text style={styles.secondaryButtonText}>소식 문의하기</Text>
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const active = tab === activeTab;
            return (
              <Pressable
                key={tab}
                style={({ pressed }) => [
                  styles.tabButton,
                  active ? styles.tabActive : null,
                  pressed && styles.pressed,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tabContent}>{renderTabContent()}</View>
      </ScrollView>

      <Pressable style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
        <SvgUri uri={writeIconUri} width={48} height={48} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  breadcrumbText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  breadcrumbActive: {
    color: colors.gray6,
  },
  settingsContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
    backgroundColor: colors.background,
  },
  settingsSection: {
    gap: spacing.sm,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingsTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  settingsItems: {
    gap: spacing.xs,
    paddingLeft: spacing.xl,
  },
  settingsItem: {
    paddingVertical: spacing.xs,
  },
  settingsItemText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  settingsDetailWrap: {
    gap: spacing.sm,
  },
  detailTitle: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  detailDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray2,
  },
  detailLabel: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  detailBody: {
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 22,
  },
  formBlock: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  inputPlaceholder: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  placeholderText: {
    ...typography.body2_3,
    color: colors.gray3,
  },
  disabledButton: {
    backgroundColor: colors.gray2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  disabledText: {
    ...typography.body1_2,
    color: colors.gray5,
  },
  socialCard: {
    backgroundColor: colors.secondary3 ?? '#7AD1F1',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  socialEmail: {
    ...typography.body1_2,
    color: colors.black,
  },
  detailList: {
    gap: spacing.sm,
  },
  reportList: {
    gap: spacing.sm,
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reportBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary1,
    color: colors.white,
    ...typography.body2_3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.lg,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportUser: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  reportDate: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  reportText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  alarmInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  alarmDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray3,
  },
  alarmDotActive: {
    backgroundColor: colors.likeRed,
  },
  alarmBody: {
    flex: 1,
  },
  alarmText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  alarmTime: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  toggleMock: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary1,
  },
  profileRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray2,
  },
  profileMeta: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  profileName: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  profileSub: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  profileDesc: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray2,
  },
  secondaryButtonText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary1,
  },
  tabLabel: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  tabLabelActive: {
    color: colors.primary1,
  },
  tabContent: {
    minHeight: 200,
  },
  gridContent: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cardWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  storyCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  storyThumb: {
    backgroundColor: colors.gray1,
    borderRadius: radius.sm,
    aspectRatio: 1,
  },
  storyTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  storyExcerpt: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  storyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  inlineText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  actionDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.gray2,
  },
  bookWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookCard: {
    width: '30%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.xs,
    gap: spacing.xs / 2,
    alignItems: 'center',
  },
  bookThumb: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: spacing.xs,
  },
  bookTitle: {
    ...typography.body2_2,
    color: colors.gray6,
    alignSelf: 'flex-start',
  },
  bookAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
    alignSelf: 'flex-start',
  },
  listContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  groupRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  groupName: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
