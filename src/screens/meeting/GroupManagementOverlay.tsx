import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponderInstance,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { DefaultProfileAvatar } from '../../components/common/DefaultProfileAvatar';
import { FeedbackPressable as Pressable } from '../../components/common/FeedbackPressable';
import { FormTextInput } from '../../components/common/FormTextInput';
import { ToastHost } from '../../components/common/ToastHost';
import { INPUT_LIMITS } from '../../constants/inputLimits';
import { CLUB_DEFAULT_IMAGE } from '../../constants/defaultAssets';
import {
  formatCalendarMonthLabel,
  formatGenerationLabel,
  sanitizeGenerationInput,
} from './formatters';
import { styles } from './meetingStyles';
import type {
  BookshelfCreateDraft,
  GroupEditDraft,
  GroupJoinRequestItem,
  GroupManagementScreen,
  GroupMemberItem,
  GroupMemberRole,
} from './types';
import type { BookItem } from '../../services/api/bookApi';

const BOOKSHELF_MEETING_TITLE_MAX_LENGTH = 12;
const BOOKSHELF_MEETING_LOCATION_MAX_LENGTH = 12;
const MANAGEMENT_MENU_PULL_CLOSE_OFFSET = -88;
const calendarWeekdayLabels = ['일', '월', '화', '수', '목', '금', '토'] as const;

const categoryCodeLabels = [
  '소설/시/희곡', '에세이', '인문학', '사회과학', '정치/외교/국방',
  '경제/경영', '자기계발', '역사/문화', '과학', '컴퓨터/IT',
  '예술/대중문화', '여행', '외국어', '어린이/청소년', '종교/철학',
];
const participantCodeLabels = [
  '대학생', '직장인', '온라인', '동아리', '모임', '오프라인',
];

export type GroupManagementOverlayProps = {
  // Visibility
  managementMenuVisible: boolean;
  activeManagementScreen: GroupManagementScreen | null;
  bookshelfBookSelectorVisible: boolean;

  // Management state
  joinRequests: GroupJoinRequestItem[];
  members: GroupMemberItem[];
  selectedJoinRequestMessage: GroupJoinRequestItem | null;
  selectedJoinRequestAction: GroupJoinRequestItem | null;
  submittingJoinRequestAction: boolean;
  selectedMemberAction: GroupMemberItem | null;
  submittingMemberAction: boolean;
  editDraft: GroupEditDraft;
  uploadingClubImage: boolean;
  managementSheetY: Animated.Value;
  managementHandlePanResponder: PanResponderInstance;

  // Management handlers
  handleCloseManagementLayer: () => void;
  handleCloseManagementScreen: () => void;
  closeManagementMenu: () => void;
  setSelectedJoinRequestMessage: (item: GroupJoinRequestItem | null) => void;
  setSelectedJoinRequestActionId: (id: string | null) => void;
  handleOpenJoinRequestProfile: (nickname: string) => void;
  setSelectedMemberActionId: (id: string | null) => void;
  setEditDraft: Dispatch<SetStateAction<GroupEditDraft>>;
  handlePickClubImage: () => void;
  handleSaveGroupEdit: () => void;
  handleProcessJoinRequest: (request: GroupJoinRequestItem, action: 'APPROVE' | 'REJECT') => void;
  handleChangeMemberRole: (memberId: string, role: GroupMemberRole) => void;
  handleRemoveMember: (memberId: string) => void;
  handleOpenManagementScreen: (screen: GroupManagementScreen) => void;
  handleOpenNoticeComposerFromManagement: () => void;
  handleDeleteManagedClub: () => void;

  // Bookshelf state
  bookshelfBookSearchQuery: string;
  bookshelfBookSearchSearched: boolean;
  bookshelfBookSearchLoading: boolean;
  bookshelfBookSearchKeyword: string;
  bookshelfBookSearchResults: BookItem[];
  bookshelfCreateDraft: BookshelfCreateDraft;
  editingBookshelfMeetingId: number | null;
  bookshelfCalendarVisible: boolean;
  bookshelfCalendarMonth: Date;
  bookshelfCalendarDays: Array<{
    key: string;
    label: string;
    value: string;
    inCurrentMonth: boolean;
    isToday: boolean;
  }>;
  updatingBookshelf: boolean;
  deletingBookshelf: boolean;
  creatingBookshelf: boolean;

  // Bookshelf handlers
  closeBookshelfBookSelector: () => void;
  setBookshelfBookSearchQuery: (query: string) => void;
  resetBookshelfBookSearch: () => void;
  handleSubmitBookshelfBookSearch: () => void;
  handleSelectBookshelfSourceBook: (book: BookItem) => void;
  setBookshelfBookSelectorVisible: Dispatch<SetStateAction<boolean>>;
  setBookshelfCreateDraft: Dispatch<SetStateAction<BookshelfCreateDraft>>;
  openBookshelfCalendar: () => void;
  closeBookshelfCalendar: () => void;
  setBookshelfCalendarMonth: Dispatch<SetStateAction<Date>>;
  handleSelectBookshelfMeetingDate: (date: string) => void;
  handlePickTodayBookshelfMeetingDate: () => void;
  handleDeleteEditingBookshelf: () => void;
  handleSubmitBookshelfCreate: () => void;
};

export function GroupManagementOverlay({
  managementMenuVisible,
  activeManagementScreen,
  bookshelfBookSelectorVisible,
  joinRequests,
  members,
  selectedJoinRequestMessage,
  selectedJoinRequestAction,
  submittingJoinRequestAction,
  selectedMemberAction,
  submittingMemberAction,
  editDraft,
  uploadingClubImage,
  managementSheetY,
  managementHandlePanResponder,
  handleCloseManagementLayer,
  handleCloseManagementScreen,
  closeManagementMenu,
  setSelectedJoinRequestMessage,
  setSelectedJoinRequestActionId,
  handleOpenJoinRequestProfile,
  setSelectedMemberActionId,
  setEditDraft,
  handlePickClubImage,
  handleSaveGroupEdit,
  handleProcessJoinRequest,
  handleChangeMemberRole,
  handleRemoveMember,
  handleOpenManagementScreen,
  handleOpenNoticeComposerFromManagement,
  handleDeleteManagedClub,
  bookshelfBookSearchQuery,
  bookshelfBookSearchSearched,
  bookshelfBookSearchLoading,
  bookshelfBookSearchKeyword,
  bookshelfBookSearchResults,
  bookshelfCreateDraft,
  editingBookshelfMeetingId,
  bookshelfCalendarVisible,
  bookshelfCalendarMonth,
  bookshelfCalendarDays,
  updatingBookshelf,
  deletingBookshelf,
  creatingBookshelf,
  closeBookshelfBookSelector,
  setBookshelfBookSearchQuery,
  resetBookshelfBookSearch,
  handleSubmitBookshelfBookSearch,
  handleSelectBookshelfSourceBook,
  setBookshelfBookSelectorVisible,
  setBookshelfCreateDraft,
  openBookshelfCalendar,
  closeBookshelfCalendar,
  setBookshelfCalendarMonth,
  handleSelectBookshelfMeetingDate,
  handlePickTodayBookshelfMeetingDate,
  handleDeleteEditingBookshelf,
  handleSubmitBookshelfCreate,
}: GroupManagementOverlayProps) {
  const insets = useSafeAreaInsets();
  const closingManagementMenuByPullRef = useRef(false);
  const handleManagementMenuScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (closingManagementMenuByPullRef.current) return;
      if (event.nativeEvent.contentOffset.y > MANAGEMENT_MENU_PULL_CLOSE_OFFSET) return;

      closingManagementMenuByPullRef.current = true;
      closeManagementMenu();
    },
    [closeManagementMenu],
  );

  return (
    <Modal
      visible={managementMenuVisible || Boolean(activeManagementScreen) || bookshelfBookSelectorVisible}
      transparent
      animationType="fade"
      onRequestClose={handleCloseManagementLayer}
    >
      {bookshelfBookSelectorVisible ? (
        <KeyboardAvoidingView
          style={styles.managementScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.managementScreenHeader, { paddingTop: Math.max(insets.top, spacing.lg) + spacing.sm }]}>
            <Pressable onPress={closeBookshelfBookSelector} hitSlop={8}>
              <MaterialIcons name="chevron-left" size={24} color={colors.gray6} />
            </Pressable>
            <Text style={styles.managementScreenTitle}>책 검색</Text>
            <Pressable onPress={closeBookshelfBookSelector} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={colors.gray6} />
            </Pressable>
          </View>

          <View style={[styles.managementScreenContent, styles.bookshelfBookSearchScreen]}>
            <View style={styles.bookshelfBookSearchInputRow}>
              <Pressable onPress={handleSubmitBookshelfBookSearch}>
                <MaterialIcons name="search" size={22} color={colors.gray4} />
              </Pressable>
              <TextInput
                value={bookshelfBookSearchQuery}
                onChangeText={setBookshelfBookSearchQuery}
                placeholder="책 제목, 작가 이름을 검색해보세요"
                placeholderTextColor={colors.gray3}
                style={[styles.bookshelfBookSearchInput, styles.bookshelfBookSearchInputDescenderSafe]}
                onSubmitEditing={handleSubmitBookshelfBookSearch}
                returnKeyType="search"
                autoFocus
              />
              {bookshelfBookSearchQuery.length > 0 ? (
                <Pressable
                  onPress={resetBookshelfBookSearch}
                  hitSlop={8}
                >
                  <MaterialIcons name="close" size={18} color={colors.gray4} />
                </Pressable>
              ) : null}
            </View>
            {bookshelfBookSearchSearched ? (
              <Text style={styles.bookshelfBookSearchGuide}>
                {bookshelfBookSearchLoading
                  ? '검색 중...'
                  : `"${bookshelfBookSearchKeyword}" 총 ${bookshelfBookSearchResults.length}개의 검색결과가 있습니다.`}
              </Text>
            ) : (
              <Text style={styles.bookshelfBookSearchGuide}>
                검색어를 입력하고 책을 선택해야 합니다.
              </Text>
            )}
            <ScrollView
              style={styles.bookshelfBookSearchScroll}
              contentContainerStyle={styles.bookshelfBookSearchList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {bookshelfBookSearchSearched &&
              !bookshelfBookSearchLoading &&
              bookshelfBookSearchResults.length === 0 ? (
                <Text style={styles.bookshelfBookSearchEmpty}>검색 결과가 없습니다.</Text>
              ) : null}

              {bookshelfBookSearchResults.map((book, index) => (
                <Pressable
                  key={`bookshelf-create-book-${book.isbn}-${index}`}
                  style={({ pressed }) => [
                    styles.bookshelfBookSearchItem,
                    bookshelfCreateDraft.sourceBook?.isbn === book.isbn &&
                      styles.bookshelfBookSearchItemActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleSelectBookshelfSourceBook(book)}
                >
                  {book.imgUrl ? (
                    <Image
                      source={{ uri: book.imgUrl }}
                      style={styles.bookshelfBookSearchCover}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.bookshelfBookSearchCover} />
                  )}
                  <View style={styles.bookshelfBookSearchInfo}>
                    <Text style={styles.bookshelfBookSearchTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={styles.bookshelfBookSearchMeta} numberOfLines={1}>
                      {book.author}
                    </Text>
                    {book.publisher ? (
                      <Text style={styles.bookshelfBookSearchMeta} numberOfLines={1}>
                        {book.publisher}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      ) : activeManagementScreen ? (
        <KeyboardAvoidingView
          style={styles.managementScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.managementScreenHeader, { paddingTop: Math.max(insets.top, spacing.lg) + spacing.sm }]}>
            <Pressable onPress={handleCloseManagementScreen} hitSlop={8}>
              <MaterialIcons name="chevron-left" size={24} color={colors.gray6} />
            </Pressable>
            <Text style={styles.managementScreenTitle}>
              {activeManagementScreen === 'JOIN_REQUESTS'
                ? '모임 가입 신청 관리'
                : activeManagementScreen === 'MEMBERS'
                  ? '모임 회원 관리'
                  : activeManagementScreen === 'BOOKSHELF_CREATE'
                    ? typeof editingBookshelfMeetingId === 'number'
                      ? '책장 수정하기'
                      : '책장 생성하기'
                    : '모임 정보 수정하기'}
            </Text>
            <Pressable onPress={handleCloseManagementScreen} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={colors.gray6} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.managementScreenScroll}
            contentContainerStyle={styles.managementScreenContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {activeManagementScreen === 'JOIN_REQUESTS' ? (
              <>
                <View style={styles.managementSummaryCard}>
                  <Text style={styles.managementSummaryTitle}>가입 신청 현황</Text>
                  <Text style={styles.managementSummaryDescription}>
                    가입 메시지를 확인한 뒤 승인하거나 삭제할 수 있습니다.
                  </Text>
                  <View style={styles.managementCountBadge}>
                    <Text style={styles.managementCountBadgeText}>
                      대기 {joinRequests.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.managementCardList}>
                  {joinRequests.map((request) => (
                    <View key={request.id} style={styles.managementListCard}>
                      <View style={styles.managementListCardTop}>
                        <View style={styles.managementIdentityRow}>
                          <View style={styles.managementAvatar}>
                            {request.profileImageUrl ? (
                              <Image
                                source={{ uri: request.profileImageUrl }}
                                style={styles.managementAvatarImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <DefaultProfileAvatar size={18} />
                            )}
                          </View>
                          <View style={styles.managementIdentityText}>
                            <Text style={styles.managementPrimaryText}>{request.nickname}</Text>
                            <Text style={styles.managementSecondaryText}>{request.name}</Text>
                          </View>
                        </View>
                        <Text style={styles.managementMetaText}>{request.appliedAt}</Text>
                      </View>
                      <Text style={styles.managementMetaText}>{request.email}</Text>
                      <View style={styles.managementActionRow}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.managementGhostButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => handleOpenJoinRequestProfile(request.nickname)}
                        >
                          <Text style={styles.managementGhostButtonText}>프로필 보기</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.managementGhostButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => setSelectedJoinRequestMessage(request)}
                        >
                          <Text style={styles.managementGhostButtonText}>가입 메시지</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.managementPrimarySmallButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => setSelectedJoinRequestActionId(request.id)}
                        >
                          <Text style={styles.managementPrimarySmallButtonText}>가입 처리</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  {joinRequests.length === 0 ? (
                    <View style={styles.managementEmptyCard}>
                      <Text style={styles.managementEmptyText}>대기 중인 가입 신청이 없습니다.</Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            {activeManagementScreen === 'MEMBERS' ? (
              <>
                <View style={styles.managementSummaryCard}>
                  <Text style={styles.managementSummaryTitle}>회원 역할 관리</Text>
                  <Text style={styles.managementSummaryDescription}>
                    회원 역할을 수정하거나 운영진 권한을 조정할 수 있습니다.
                  </Text>
                  <View style={styles.managementCountBadge}>
                    <Text style={styles.managementCountBadgeText}>회원 {members.length}</Text>
                  </View>
                </View>

                <View style={styles.managementCardList}>
                  {members.map((member) => (
                    <View key={member.id} style={styles.managementListCard}>
                      <View style={styles.managementListCardTop}>
                        <View style={styles.managementIdentityRow}>
                          <View style={styles.managementAvatar}>
                            {member.profileImageUrl ? (
                              <Image
                                source={{ uri: member.profileImageUrl }}
                                style={styles.managementAvatarImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <DefaultProfileAvatar size={18} />
                            )}
                          </View>
                          <View style={styles.managementIdentityText}>
                            <Text style={styles.managementPrimaryText}>{member.nickname}</Text>
                            <Text style={styles.managementSecondaryText}>{member.name}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.managementRoleBadge,
                            member.role === '개설자'
                              ? styles.managementRoleBadgeOwner
                              : member.role === '운영진'
                                ? styles.managementRoleBadgeStaff
                                : styles.managementRoleBadgeMember,
                          ]}
                        >
                          <Text style={styles.managementRoleBadgeText}>{member.role}</Text>
                        </View>
                      </View>
                      <Text style={styles.managementMetaText}>{member.email}</Text>
                      <Text style={styles.managementMetaText}>가입일 {member.joinedAt}</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.managementWideButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => setSelectedMemberActionId(member.id)}
                      >
                        <Text style={styles.managementWideButtonText}>역할 수정</Text>
                      </Pressable>
                    </View>
                  ))}
                  {members.length === 0 ? (
                    <View style={styles.managementEmptyCard}>
                      <Text style={styles.managementEmptyText}>조회된 회원이 없습니다.</Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            {activeManagementScreen === 'EDIT' ? (
              <View style={styles.managementEditSection}>
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>모임 정보 수정하기</Text>
                  <Text style={styles.helperText}>
                    모임 생성하기처럼 한 화면에서 수정하고 저장할 수 있습니다.
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    독서 모임 이름을 입력해주세요!
                  </Text>
                  <FormTextInput
                    value={editDraft.name}
                    onChangeText={(text) => {
                      setEditDraft((prev) => ({ ...prev, name: text }));
                    }}
                    placeholder="독서 모임 이름을 입력해주세요"
                    placeholderTextColor={colors.gray3}
                    style={styles.input}
                    fieldType="text"
                    maxLength={INPUT_LIMITS.CLUB_NAME}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    모임의 소개글을 입력해주세요!
                  </Text>
                  <FormTextInput
                    value={editDraft.description}
                    onChangeText={(text) => {
                      setEditDraft((prev) => ({ ...prev, description: text }));
                    }}
                    placeholder="자유롭게 입력해주세요! (500자 제한)"
                    placeholderTextColor={colors.gray3}
                    style={[styles.input, styles.textArea]}
                    multiline
                    maxLength={INPUT_LIMITS.CLUB_DESCRIPTION}
                    overLimitMessage={`모임 소개글은 ${INPUT_LIMITS.CLUB_DESCRIPTION}자 이하여야 합니다.`}
                  />
                  <Text style={styles.bookshelfComposerCounter}>
                    {editDraft.description.length}/{INPUT_LIMITS.CLUB_DESCRIPTION}
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    모임의 프로필 사진을 변경할 수 있어요!
                  </Text>
                  <View style={styles.createProfileCard}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.createProfilePreviewLarge,
                        !editDraft.imageUrl && styles.createProfilePreviewEmpty,
                        pressed && !uploadingClubImage && styles.pressed,
                      ]}
                      onPress={handlePickClubImage}
                      disabled={uploadingClubImage}
                    >
                      {editDraft.imageUrl ? (
                        <Image
                          source={{ uri: editDraft.imageUrl }}
                          style={styles.createProfilePreviewLargeImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Image
                          source={{ uri: CLUB_DEFAULT_IMAGE }}
                          style={styles.createProfilePreviewLargeImage}
                          resizeMode="cover"
                        />
                      )}
                    </Pressable>

                    <View style={styles.createProfileButtonRow}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.createProfileBtn,
                          !editDraft.imageUrl && styles.createProfileBtnSelected,
                          pressed && styles.pressed,
                        ]}
                        onPress={() =>
                          setEditDraft((prev) => ({ ...prev, imageUrl: '' }))
                        }
                      >
                        <MaterialIcons
                          name="auto-awesome"
                          size={15}
                          color={!editDraft.imageUrl ? colors.white : colors.primary1}
                        />
                        <Text
                          style={[
                            styles.createProfileBtnText,
                            !editDraft.imageUrl && styles.createProfileBtnTextSelected,
                          ]}
                        >
                          기본 이미지
                        </Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.createProfileBtn,
                          styles.createProfileBtnPrimary,
                          uploadingClubImage && styles.createProfileActionButtonDisabled,
                          pressed && !uploadingClubImage && styles.pressed,
                        ]}
                        onPress={handlePickClubImage}
                        disabled={uploadingClubImage}
                      >
                        <MaterialIcons name="photo-camera" size={15} color={colors.primary1} />
                        <Text style={styles.createProfileBtnTextPrimary}>
                          {uploadingClubImage ? '업로드 중...' : '사진 업로드'}
                        </Text>
                      </Pressable>
                    </View>

                    <Text style={styles.createProfileHint}>
                      저장하면 모임 프로필 이미지가 변경됩니다.
                    </Text>
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    모임의 공개여부를 알려주세요!
                  </Text>
                  <View style={styles.managementToggleRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.managementToggleChip,
                        !editDraft.isPrivate && styles.managementToggleChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setEditDraft((prev) => ({ ...prev, isPrivate: false }))}
                    >
                      <Text
                        style={[
                          styles.managementToggleChipText,
                          !editDraft.isPrivate && styles.managementToggleChipTextActive,
                        ]}
                      >
                        공개
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.managementToggleChip,
                        editDraft.isPrivate && styles.managementToggleChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setEditDraft((prev) => ({ ...prev, isPrivate: true }))}
                    >
                      <Text
                        style={[
                          styles.managementToggleChipText,
                          editDraft.isPrivate && styles.managementToggleChipTextActive,
                        ]}
                      >
                        비공개
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    선호하는 독서 카테고리를 선택해주세요!
                  </Text>
                  <View style={styles.chipGrid}>
                    {categoryCodeLabels.map((category) => {
                      const active = editDraft.categories.includes(category);
                      return (
                        <Pressable
                          key={`edit-category-${category}`}
                          onPress={() =>
                            setEditDraft((prev) => ({
                              ...prev,
                              categories: prev.categories.includes(category)
                                ? prev.categories.filter((item) => item !== category)
                                : prev.categories.length >= 6
                                  ? prev.categories
                                  : [...prev.categories, category],
                            }))
                          }
                          style={({ pressed }) => [
                            styles.chip,
                            active ? styles.chipActive : null,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                            {category}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    활동 지역을 입력해주세요!
                  </Text>
                  <FormTextInput
                    value={editDraft.region}
                    onChangeText={(text) => {
                      setEditDraft((prev) => ({ ...prev, region: text }));
                    }}
                    placeholder="활동 지역을 입력해주세요 (40자 제한)"
                    placeholderTextColor={colors.gray3}
                    style={styles.input}
                    maxLength={INPUT_LIMITS.CLUB_REGION}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    모임의 대상을 선택해주세요!
                  </Text>
                  <View style={styles.chipGrid}>
                    {participantCodeLabels.map((target) => {
                      const active = editDraft.targets.includes(target);
                      return (
                        <Pressable
                          key={`edit-target-${target}`}
                          onPress={() =>
                            setEditDraft((prev) => ({
                              ...prev,
                              targets: prev.targets.includes(target)
                                ? prev.targets.filter((item) => item !== target)
                                : [...prev.targets, target],
                            }))
                          }
                          style={({ pressed }) => [
                            styles.chip,
                            active ? styles.chipActive : null,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                            {target}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : null}

            {activeManagementScreen === 'BOOKSHELF_CREATE' ? (
              <View style={styles.managementEditSection}>
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>
                    {typeof editingBookshelfMeetingId === 'number' ? '책장 수정하기' : '책장 생성하기'}
                  </Text>
                  <Text style={styles.helperText}>
                    {typeof editingBookshelfMeetingId === 'number'
                      ? '정기모임 정보를 수정하고 저장할 수 있습니다.'
                      : '책을 선택하고 정기모임 정보까지 한 화면에서 등록할 수 있습니다.'}
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    책 선택
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.input,
                      styles.bookshelfCreateSelector,
                      pressed && typeof editingBookshelfMeetingId !== 'number' && styles.pressed,
                      typeof editingBookshelfMeetingId === 'number' && styles.bookshelfCreateSelectorDisabled,
                    ]}
                    disabled={typeof editingBookshelfMeetingId === 'number'}
                    onPress={() => setBookshelfBookSelectorVisible(true)}
                  >
                    <Text
                      style={[
                        styles.bookshelfCreateSelectorText,
                        !bookshelfCreateDraft.sourceBook && styles.bookshelfCreateSelectorPlaceholder,
                      ]}
                    >
                      {bookshelfCreateDraft.sourceBook
                        ? bookshelfCreateDraft.sourceBook.title
                        : '선택하기'}
                    </Text>
                  </Pressable>
                  {typeof editingBookshelfMeetingId === 'number' ? (
                    <Text style={styles.helperText}>수정 모드에서는 책을 변경할 수 없습니다.</Text>
                  ) : null}

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    기수
                  </Text>
                  <TextInput
                    value={bookshelfCreateDraft.session}
                    onChangeText={(text) =>
                      setBookshelfCreateDraft((prev) => ({
                        ...prev,
                        session: sanitizeGenerationInput(text),
                      }))
                    }
                    placeholder="예: 7"
                    placeholderTextColor={colors.gray3}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                  <Text style={styles.helperText}>
                    입력한 숫자는 책장에서 {formatGenerationLabel(bookshelfCreateDraft.session || '1')} 형태로 표시됩니다.
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    태그
                  </Text>
                  <View style={styles.chipGrid}>
                    {categoryCodeLabels.map((category) => {
                      const active = bookshelfCreateDraft.categories.includes(category);
                      return (
                        <Pressable
                          key={`bookshelf-create-category-${category}`}
                          onPress={() =>
                            setBookshelfCreateDraft((prev) => ({
                              ...prev,
                              categories: prev.categories.includes(category)
                                ? []
                                : [category],
                            }))
                          }
                          style={({ pressed }) => [
                            styles.chip,
                            active ? styles.chipActive : null,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                            {category}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.helperText}>태그는 1개만 선택해 등록할 수 있습니다.</Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    정기모임 이름 (선택)
                  </Text>
                  <FormTextInput
                    value={bookshelfCreateDraft.regularMeetingName}
                    onChangeText={(text) =>
                      setBookshelfCreateDraft((prev) => ({ ...prev, regularMeetingName: text }))
                    }
                    placeholder="정기모임 이름을 입력해주세요"
                    placeholderTextColor={colors.gray3}
                    maxLength={BOOKSHELF_MEETING_TITLE_MAX_LENGTH}
                    style={styles.input}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    모임 장소 (선택)
                  </Text>
                  <FormTextInput
                    value={bookshelfCreateDraft.meetingLocation}
                    onChangeText={(text) =>
                      setBookshelfCreateDraft((prev) => ({ ...prev, meetingLocation: text }))
                    }
                    placeholder="모임 장소를 입력해주세요"
                    placeholderTextColor={colors.gray3}
                    maxLength={BOOKSHELF_MEETING_LOCATION_MAX_LENGTH}
                    style={styles.input}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    모임 날짜 (선택)
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.input,
                      styles.bookshelfDatePickerButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={openBookshelfCalendar}
                  >
                    <View style={styles.bookshelfDatePickerValueRow}>
                      <View style={styles.bookshelfDatePickerIconWrap}>
                        <MaterialIcons
                          name="calendar-month"
                          size={18}
                          color={
                            bookshelfCreateDraft.meetingDate ? colors.primary1 : colors.gray4
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.bookshelfDatePickerText,
                          !bookshelfCreateDraft.meetingDate &&
                            styles.bookshelfDatePickerPlaceholder,
                        ]}
                      >
                        {bookshelfCreateDraft.meetingDate || '날짜를 선택해주세요'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.gray4} />
                  </Pressable>
                  <Text style={styles.helperText}>달력에서 날짜를 선택해야 합니다.</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {activeManagementScreen === 'EDIT' || activeManagementScreen === 'BOOKSHELF_CREATE' ? (
            <View style={[styles.managementFooter, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
              {activeManagementScreen === 'BOOKSHELF_CREATE' &&
              typeof editingBookshelfMeetingId === 'number' ? (
                <View style={styles.managementFooterButtonRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.outlineButton,
                      styles.managementFooterButton,
                      styles.managementFooterDangerButton,
                      (updatingBookshelf || deletingBookshelf) && styles.managementFooterDangerButtonDisabled,
                      pressed && !(updatingBookshelf || deletingBookshelf) && styles.pressed,
                    ]}
                    onPress={handleDeleteEditingBookshelf}
                    disabled={updatingBookshelf || deletingBookshelf}
                  >
                    <Text style={styles.managementFooterDangerButtonText}>
                      {deletingBookshelf ? '삭제 중...' : '삭제하기'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.managementFooterButton,
                      (updatingBookshelf || deletingBookshelf) && styles.primaryButtonDisabled,
                      pressed && !(updatingBookshelf || deletingBookshelf) && styles.pressed,
                    ]}
                    onPress={handleSubmitBookshelfCreate}
                    disabled={updatingBookshelf || deletingBookshelf}
                  >
                    <Text style={styles.managementFooterPrimaryButtonText}>
                      {updatingBookshelf ? '저장 중...' : '저장하기'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.managementFooterButton,
                    activeManagementScreen === 'BOOKSHELF_CREATE' &&
                    creatingBookshelf &&
                    styles.primaryButtonDisabled,
                    pressed &&
                    !(activeManagementScreen === 'BOOKSHELF_CREATE' && creatingBookshelf) &&
                    styles.pressed,
                  ]}
                  onPress={
                    activeManagementScreen === 'EDIT'
                      ? handleSaveGroupEdit
                      : handleSubmitBookshelfCreate
                  }
                  disabled={activeManagementScreen === 'BOOKSHELF_CREATE' && creatingBookshelf}
                >
                  <Text style={styles.managementFooterPrimaryButtonText}>
                    {activeManagementScreen === 'EDIT'
                      ? '저장하기'
                      : creatingBookshelf
                        ? '등록 중...'
                        : '등록하기'}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {selectedJoinRequestMessage ? (
            <Pressable
              style={styles.managementInlineOverlay}
              onPress={() => setSelectedJoinRequestMessage(null)}
              disableFeedback
            >
              <Pressable
                style={styles.managementMessageCard}
                onPress={(event) => event.stopPropagation()}
                disableFeedback
              >
                <Text style={styles.managementMessageTitle}>가입 메시지</Text>
                <ScrollView
                  style={styles.managementMessageScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.managementMessageBody}>
                    {selectedJoinRequestMessage.message}
                  </Text>
                </ScrollView>
              </Pressable>
            </Pressable>
          ) : null}

          {selectedJoinRequestAction ? (
            <Pressable
              style={styles.managementInlineOverlay}
              onPress={() => {
                if (submittingJoinRequestAction) return;
                setSelectedJoinRequestActionId(null);
              }}
              disableFeedback
            >
              <Pressable
                style={styles.managementJoinActionCard}
                onPress={(event) => event.stopPropagation()}
                disableFeedback
              >
                <Text style={styles.managementJoinActionTitle}>가입 처리</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.managementJoinActionItem,
                    submittingJoinRequestAction && styles.managementJoinActionItemDisabled,
                    pressed && !submittingJoinRequestAction && styles.pressed,
                  ]}
                  disabled={submittingJoinRequestAction}
                  onPress={() => handleProcessJoinRequest(selectedJoinRequestAction, 'REJECT')}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={34}
                    color={submittingJoinRequestAction ? colors.gray3 : colors.gray5}
                  />
                  <Text
                    style={[
                      styles.managementJoinActionItemText,
                      submittingJoinRequestAction && styles.managementJoinActionItemTextDisabled,
                    ]}
                  >
                    삭제하기
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.managementJoinActionItem,
                    styles.managementJoinActionItemLast,
                    submittingJoinRequestAction && styles.managementJoinActionItemDisabled,
                    pressed && !submittingJoinRequestAction && styles.pressed,
                  ]}
                  disabled={submittingJoinRequestAction}
                  onPress={() => handleProcessJoinRequest(selectedJoinRequestAction, 'APPROVE')}
                >
                  <MaterialIcons
                    name="check-circle-outline"
                    size={34}
                    color={submittingJoinRequestAction ? colors.gray3 : colors.gray5}
                  />
                  <Text
                    style={[
                      styles.managementJoinActionItemText,
                      submittingJoinRequestAction && styles.managementJoinActionItemTextDisabled,
                    ]}
                  >
                    {submittingJoinRequestAction ? '처리 중...' : '가입처리'}
                  </Text>
                </Pressable>
              </Pressable>
            </Pressable>
          ) : null}

          {bookshelfCalendarVisible ? (
            <Pressable
              style={styles.managementInlineOverlay}
              onPress={closeBookshelfCalendar}
              disableFeedback
            >
              <Pressable
                style={styles.bookshelfCalendarCard}
                onPress={(event) => event.stopPropagation()}
                disableFeedback
              >
                <View style={styles.managementModalHeader}>
                  <Text style={styles.managementModalTitle}>모임 날짜 선택</Text>
                  <Pressable onPress={closeBookshelfCalendar} hitSlop={8}>
                    <MaterialIcons name="close" size={20} color={colors.gray6} />
                  </Pressable>
                </View>
                <View style={styles.bookshelfCalendarMonthRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.bookshelfCalendarMonthButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      setBookshelfCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                      )
                    }
                  >
                    <MaterialIcons name="chevron-left" size={20} color={colors.gray6} />
                  </Pressable>
                  <Text style={styles.bookshelfCalendarMonthText}>
                    {formatCalendarMonthLabel(bookshelfCalendarMonth)}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.bookshelfCalendarMonthButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      setBookshelfCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                      )
                    }
                  >
                    <MaterialIcons name="chevron-right" size={20} color={colors.gray6} />
                  </Pressable>
                </View>
                <View style={styles.bookshelfCalendarWeekRow}>
                  {calendarWeekdayLabels.map((label) => (
                    <Text key={`bookshelf-calendar-weekday-${label}`} style={styles.bookshelfCalendarWeekLabel}>
                      {label}
                    </Text>
                  ))}
                </View>
                <View style={styles.bookshelfCalendarGrid}>
                  {bookshelfCalendarDays.map((day) => {
                    const selected = bookshelfCreateDraft.meetingDate === day.value;
                    return (
                      <Pressable
                        key={day.key}
                        style={({ pressed }) => [
                          styles.bookshelfCalendarDay,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handleSelectBookshelfMeetingDate(day.value)}
                      >
                        <View
                          style={[
                            styles.bookshelfCalendarDayInner,
                            day.inCurrentMonth
                              ? styles.bookshelfCalendarDayCurrentMonth
                              : styles.bookshelfCalendarDayOutside,
                            day.isToday && styles.bookshelfCalendarDayToday,
                            selected && styles.bookshelfCalendarDaySelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.bookshelfCalendarDayLabel,
                              !day.inCurrentMonth && styles.bookshelfCalendarDayLabelOutside,
                              selected && styles.bookshelfCalendarDayLabelSelected,
                            ]}
                          >
                            {day.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.bookshelfCalendarFooter}>
                  <Text style={styles.bookshelfCalendarFooterHint}>
                    선택한 날짜가 바로 적용됩니다.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.bookshelfCalendarTodayButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={handlePickTodayBookshelfMeetingDate}
                  >
                    <Text style={styles.bookshelfCalendarTodayButtonText}>오늘</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          ) : null}

          {selectedMemberAction ? (
            <Pressable
              style={styles.managementInlineOverlay}
              onPress={() => {
                if (submittingMemberAction) return;
                setSelectedMemberActionId(null);
              }}
              disableFeedback
            >
              <Pressable
                style={styles.managementRoleMenuCard}
                onPress={(event) => event.stopPropagation()}
                disableFeedback
              >
                <Text style={styles.managementRoleMenuTitle}>역할 수정</Text>
                {[
                  {
                    key: '운영진' as const,
                    label: '운영진 역할',
                    icon: 'workspace-premium' as const,
                    disabled:
                      submittingMemberAction ||
                      selectedMemberAction.role === '운영진' ||
                      selectedMemberAction.role === '개설자',
                    onPress: () => handleChangeMemberRole(selectedMemberAction.id, '운영진'),
                  },
                  {
                    key: '회원' as const,
                    label: '회원 역할',
                    icon: 'person-outline' as const,
                    disabled:
                      submittingMemberAction ||
                      selectedMemberAction.role === '회원' ||
                      selectedMemberAction.role === '개설자',
                    onPress: () => handleChangeMemberRole(selectedMemberAction.id, '회원'),
                  },
                  {
                    key: '개설자' as const,
                    label: '개설자 역할',
                    icon: 'schedule' as const,
                    disabled:
                      submittingMemberAction || selectedMemberAction.role === '개설자',
                    onPress: () => handleChangeMemberRole(selectedMemberAction.id, '개설자'),
                  },
                ].map((item) => (
                  <Pressable
                    key={`${selectedMemberAction.id}-${item.key}`}
                    style={({ pressed }) => [
                      styles.managementRoleMenuItem,
                      item.disabled && styles.managementRoleMenuItemDisabled,
                      pressed && !item.disabled && styles.pressed,
                    ]}
                    disabled={item.disabled}
                    onPress={item.onPress}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={34}
                      color={item.disabled ? colors.gray3 : colors.gray5}
                    />
                    <Text
                      style={[
                        styles.managementRoleMenuItemText,
                        item.disabled && styles.managementRoleMenuItemTextDisabled,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={({ pressed }) => [
                    styles.managementRoleMenuItem,
                    styles.managementRoleMenuItemLast,
                    (selectedMemberAction.role === '개설자' || submittingMemberAction) &&
                      styles.managementRoleMenuItemDisabled,
                    pressed &&
                      selectedMemberAction.role !== '개설자' &&
                      !submittingMemberAction &&
                      styles.pressed,
                  ]}
                  disabled={selectedMemberAction.role === '개설자' || submittingMemberAction}
                  onPress={() => handleRemoveMember(selectedMemberAction.id)}
                >
                  <MaterialIcons
                    name="logout"
                    size={34}
                    color={
                      selectedMemberAction.role === '개설자' || submittingMemberAction
                        ? colors.gray3
                        : colors.gray5
                    }
                  />
                  <Text
                    style={[
                      styles.managementRoleMenuItemText,
                      (selectedMemberAction.role === '개설자' || submittingMemberAction) &&
                        styles.managementRoleMenuItemTextDisabled,
                    ]}
                  >
                    회원 탈퇴
                  </Text>
                </Pressable>
              </Pressable>
            </Pressable>
          ) : null}
        </KeyboardAvoidingView>
      ) : (
        <Pressable
          style={styles.managementOverlay}
          onPress={() => closeManagementMenu()}
          disableFeedback
        >
          <Animated.View
            style={[styles.managementMenuSheet, { transform: [{ translateY: managementSheetY }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.managementHandleArea} {...managementHandlePanResponder.panHandlers}>
              <View style={styles.managementHandle} />
            </View>
            <Text style={styles.managementMenuTitle}>모임 관리하기</Text>
            <Text style={styles.managementMenuCaption}>
              운영진용 관리 기능을 선택해야 합니다.
            </Text>
            <ScrollView
              style={styles.managementMenuScroll}
              contentContainerStyle={styles.managementMenuList}
              showsVerticalScrollIndicator={false}
              bounces
              alwaysBounceVertical
              scrollEventThrottle={16}
              onScroll={handleManagementMenuScroll}
              onScrollBeginDrag={() => {
                closingManagementMenuByPullRef.current = false;
              }}
            >
              {[
                {
                  key: 'JOIN_REQUESTS' as const,
                  title: '모임 가입 신청 관리',
                  description: `${joinRequests.length}개의 대기 신청`,
                  icon: 'person-add-alt-1' as const,
                  onPress: () => handleOpenManagementScreen('JOIN_REQUESTS'),
                },
                {
                  key: 'MEMBERS' as const,
                  title: '모임 회원 관리',
                  description: `${members.length}명의 모임 회원`,
                  icon: 'groups' as const,
                  onPress: () => handleOpenManagementScreen('MEMBERS'),
                },
                {
                  key: 'EDIT' as const,
                  title: '모임 수정하기',
                  description: '소개, 태그, 공개 여부 수정',
                  icon: 'edit' as const,
                  onPress: () => handleOpenManagementScreen('EDIT'),
                },
                {
                  key: 'NOTICE_CREATE' as const,
                  title: '공지 작성하기',
                  description: '책장, 투표, 사진 첨부 가능',
                  icon: 'edit-note' as const,
                  onPress: handleOpenNoticeComposerFromManagement,
                },
                {
                  key: 'BOOKSHELF_CREATE' as const,
                  title: '책장 생성하기',
                  description: '정기모임용 책장 추가',
                  icon: 'library-add' as const,
                  onPress: () => handleOpenManagementScreen('BOOKSHELF_CREATE'),
                },
                {
                  key: 'DELETE_CLUB' as const,
                  title: '모임 삭제하기',
                  description: '삭제 후 복구할 수 없습니다',
                  icon: 'delete-outline' as const,
                  onPress: handleDeleteManagedClub,
                },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [
                    styles.managementMenuItem,
                    pressed && styles.pressed,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.managementMenuIcon}>
                    <MaterialIcons name={item.icon} size={20} color={colors.primary1} />
                  </View>
                  <View style={styles.managementMenuTextWrap}>
                    <Text style={styles.managementMenuItemTitle}>{item.title}</Text>
                    <Text style={styles.managementMenuItemDescription}>{item.description}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.gray4} />
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </Pressable>
      )}
      <ToastHost />
    </Modal>
  );
}
