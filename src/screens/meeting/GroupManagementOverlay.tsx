import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
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
import { useLanguage } from '../../contexts/LanguageContext';
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
  refreshingJoinRequests: boolean;
  selectedMemberAction: GroupMemberItem | null;
  submittingMemberAction: boolean;
  refreshingMembers: boolean;
  editDraft: GroupEditDraft;
  checkedEditName: {
    value: string;
    duplicate: boolean;
    current?: boolean;
  } | null;
  checkingEditName: boolean;
  uploadingClubImage: boolean;
  managementSheetY: Animated.Value;
  managementHandlePanResponder: PanResponderInstance;

  // Management handlers
  handleCloseManagementLayer: () => void;
  handleCloseManagementScreen: () => void;
  closeManagementMenu: () => void;
  closeManagementMenuImmediately: () => void;
  setSelectedJoinRequestMessage: (item: GroupJoinRequestItem | null) => void;
  setSelectedJoinRequestActionId: (id: string | null) => void;
  handleOpenJoinRequestProfile: (nickname: string) => void;
  setSelectedMemberActionId: (id: string | null) => void;
  setEditDraft: Dispatch<SetStateAction<GroupEditDraft>>;
  handleChangeEditName: (text: string) => void;
  handleCheckEditName: () => void;
  handlePickClubImage: () => void;
  handleSaveGroupEdit: () => void;
  handleRefreshJoinRequests: () => void;
  handleRefreshMembers: () => void;
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
  bookshelfBookSearchTotal: number;
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
  refreshingJoinRequests,
  selectedMemberAction,
  submittingMemberAction,
  refreshingMembers,
  editDraft,
  checkedEditName,
  checkingEditName,
  uploadingClubImage,
  managementSheetY,
  managementHandlePanResponder,
  handleCloseManagementLayer,
  handleCloseManagementScreen,
  closeManagementMenu,
  closeManagementMenuImmediately,
  setSelectedJoinRequestMessage,
  setSelectedJoinRequestActionId,
  handleOpenJoinRequestProfile,
  setSelectedMemberActionId,
  setEditDraft,
  handleChangeEditName,
  handleCheckEditName,
  handlePickClubImage,
  handleSaveGroupEdit,
  handleRefreshJoinRequests,
  handleRefreshMembers,
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
  bookshelfBookSearchTotal,
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
  const { language, l } = useLanguage();
  const closingManagementMenuByPullRef = useRef(false);
  const primaryActionDisabled =
    activeManagementScreen === 'EDIT'
      ? checkingEditName
      : activeManagementScreen === 'BOOKSHELF_CREATE' && creatingBookshelf;
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
            <Text style={styles.managementScreenTitle}>{l('책 검색')}</Text>
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
                placeholder={l('책 제목, 작가 이름을 검색해보세요')}
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
                  ? l('검색 중...')
                  : l('"{keyword}" 총 {count}개의 검색결과가 있습니다.', {
                      keyword: bookshelfBookSearchKeyword,
                      count: bookshelfBookSearchTotal,
                    })}
              </Text>
            ) : (
              <Text style={styles.bookshelfBookSearchGuide}>
                {l('검색어를 입력하고 책을 선택해야 합니다.')}
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
                <Text style={styles.bookshelfBookSearchEmpty}>{l('검색 결과가 없습니다.')}</Text>
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
              {l(
                activeManagementScreen === 'JOIN_REQUESTS'
                  ? '모임 가입 신청 관리'
                  : activeManagementScreen === 'MEMBERS'
                    ? '모임 회원 관리'
                    : activeManagementScreen === 'BOOKSHELF_CREATE'
                      ? typeof editingBookshelfMeetingId === 'number'
                        ? '책장 수정하기'
                        : '책장 생성하기'
                      : '모임 정보 수정하기',
              )}
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
            refreshControl={
              activeManagementScreen === 'JOIN_REQUESTS' ? (
                <RefreshControl
                  refreshing={refreshingJoinRequests}
                  onRefresh={handleRefreshJoinRequests}
                  tintColor={colors.primary1}
                  colors={[colors.primary1]}
                />
              ) : activeManagementScreen === 'MEMBERS' ? (
                <RefreshControl
                  refreshing={refreshingMembers}
                  onRefresh={handleRefreshMembers}
                  tintColor={colors.primary1}
                  colors={[colors.primary1]}
                />
              ) : undefined
            }
          >
            {activeManagementScreen === 'JOIN_REQUESTS' ? (
              <>
                <View style={styles.managementSummaryCard}>
                  <Text style={styles.managementSummaryTitle}>{l('가입 신청 현황')}</Text>
                  <Text style={styles.managementSummaryDescription}>
                    {l('가입 메시지를 확인한 뒤 승인하거나 삭제할 수 있습니다.')}
                  </Text>
                  <View style={styles.managementCountBadge}>
                    <Text style={styles.managementCountBadgeText}>
                      {l('대기 {count}', { count: joinRequests.length })}
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
                          <Text style={styles.managementGhostButtonText}>{l('프로필 보기')}</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.managementGhostButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => setSelectedJoinRequestMessage(request)}
                        >
                          <Text style={styles.managementGhostButtonText}>{l('가입 메시지')}</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.managementPrimarySmallButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => setSelectedJoinRequestActionId(request.id)}
                        >
                          <Text style={styles.managementPrimarySmallButtonText}>{l('가입 처리')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  {joinRequests.length === 0 ? (
                    <View style={styles.managementEmptyCard}>
                      <Text style={styles.managementEmptyText}>{l('대기 중인 가입 신청이 없습니다.')}</Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            {activeManagementScreen === 'MEMBERS' ? (
              <>
                <View style={styles.managementSummaryCard}>
                  <Text style={styles.managementSummaryTitle}>{l('회원 역할 관리')}</Text>
                  <Text style={styles.managementSummaryDescription}>
                    {l('회원 역할을 수정하거나 운영진 권한을 조정할 수 있습니다.')}
                  </Text>
                  <View style={styles.managementCountBadge}>
                    <Text style={styles.managementCountBadgeText}>
                      {l('회원 {count}', { count: members.length })}
                    </Text>
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
                          <Text style={styles.managementRoleBadgeText}>{l(member.role)}</Text>
                        </View>
                      </View>
                      <Text style={styles.managementMetaText}>{member.email}</Text>
                      <Text style={styles.managementMetaText}>
                        {l('가입일 {date}', { date: member.joinedAt })}
                      </Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.managementWideButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => setSelectedMemberActionId(member.id)}
                      >
                        <Text style={styles.managementWideButtonText}>{l('역할 수정')}</Text>
                      </Pressable>
                    </View>
                  ))}
                  {members.length === 0 ? (
                    <View style={styles.managementEmptyCard}>
                      <Text style={styles.managementEmptyText}>{l('조회된 회원이 없습니다.')}</Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            {activeManagementScreen === 'EDIT' ? (
              <View style={styles.managementEditSection}>
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>{l('모임 정보 수정하기')}</Text>
                  <Text style={styles.helperText}>
                    {l('모임 생성하기처럼 한 화면에서 수정하고 저장할 수 있습니다.')}
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    {l('독서 모임 이름을 입력해주세요!')}
                  </Text>
                  <View style={styles.inlineRow}>
                    <FormTextInput
                      value={editDraft.name}
                      onChangeText={handleChangeEditName}
                      placeholder={l('독서 모임 이름을 입력해주세요')}
                      placeholderTextColor={colors.gray3}
                      style={[styles.input, styles.inlineInput]}
                      fieldType="text"
                      maxLength={INPUT_LIMITS.CLUB_NAME}
                    />
                    <Pressable
                      style={({ pressed }) => [
                        styles.dupCheckButton,
                        checkingEditName && styles.dupCheckButtonDisabled,
                        pressed && !checkingEditName && styles.pressed,
                      ]}
                      onPress={() => {
                        handleCheckEditName();
                      }}
                      disabled={checkingEditName}
                    >
                      <Text style={styles.dupCheckText}>
                        {checkingEditName ? l('확인 중...') : l('중복확인')}
                      </Text>
                    </Pressable>
                  </View>
                  {checkedEditName && checkedEditName.value === editDraft.name.trim() ? (
                    <Text
                      style={[
                        styles.nameCheckText,
                        checkedEditName.duplicate
                          ? styles.nameCheckErrorText
                          : styles.nameCheckSuccessText,
                      ]}
                    >
                      {checkedEditName.current
                        ? l('현재 사용 중인 모임 이름입니다.')
                        : checkedEditName.duplicate
                          ? l('이미 사용 중인 모임 이름입니다.')
                          : l('사용 가능한 모임 이름입니다.')}
                    </Text>
                  ) : null}

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    {l('모임의 소개글을 입력해주세요!')}
                  </Text>
                  <FormTextInput
                    value={editDraft.description}
                    onChangeText={(text) => {
                      setEditDraft((prev) => ({ ...prev, description: text }));
                    }}
                    placeholder={l('자유롭게 입력해주세요! ({limit}자 제한)', {
                      limit: INPUT_LIMITS.CLUB_DESCRIPTION,
                    })}
                    placeholderTextColor={colors.gray3}
                    style={[styles.input, styles.textArea]}
                    multiline
                    scrollEnabled
                    textAlignVertical="top"
                    maxLength={INPUT_LIMITS.CLUB_DESCRIPTION}
                    overLimitMessage={l('모임 소개글은 {limit}자 이하여야 합니다.', {
                      limit: INPUT_LIMITS.CLUB_DESCRIPTION,
                    })}
                  />
                  <Text style={styles.bookshelfComposerCounter}>
                    {editDraft.description.length}/{INPUT_LIMITS.CLUB_DESCRIPTION}
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    {l('모임의 프로필 사진을 변경할 수 있어요!')}
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
                          {l('기본 이미지')}
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
                          {uploadingClubImage ? l('업로드 중...') : l('사진 업로드')}
                        </Text>
                      </Pressable>
                    </View>

                    <Text style={styles.createProfileHint}>
                      {l('저장하면 모임 프로필 이미지가 변경됩니다.')}
                    </Text>
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    {l('모임의 공개여부를 알려주세요!')}
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
                        {l('공개')}
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
                        {l('비공개')}
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    {l('선호하는 독서 카테고리를 선택해주세요!')}
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
                            {l(category)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    {l('활동 지역을 입력해주세요!')}
                  </Text>
                  <FormTextInput
                    value={editDraft.region}
                    onChangeText={(text) => {
                      setEditDraft((prev) => ({ ...prev, region: text }));
                    }}
                    placeholder={l('활동 지역을 입력해주세요 ({limit}자 제한)', {
                      limit: INPUT_LIMITS.CLUB_REGION,
                    })}
                    placeholderTextColor={colors.gray3}
                    style={styles.input}
                    maxLength={INPUT_LIMITS.CLUB_REGION}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    {l('모임의 대상을 선택해주세요!')}
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
                            {l(target)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                    {l('문의하기 링크를 수정해주세요! (선택)')}
                  </Text>
                  <Text style={styles.helperText}>
                    {l('문의 링크는 최대 4개까지 등록할 수 있습니다.')}
                  </Text>
                  {editDraft.links.map((link, idx) => (
                    <View key={`edit-contact-link-${idx}`} style={styles.managementContactLinkRow}>
                      <View style={styles.managementContactLinkInputs}>
                        <FormTextInput
                          value={link.label ?? ''}
                          onChangeText={(text) => {
                            setEditDraft((prev) => {
                              const nextLinks = [...prev.links];
                              nextLinks[idx] = { ...nextLinks[idx], label: text };
                              return { ...prev, links: nextLinks };
                            });
                          }}
                          placeholder={l('링크 대체 텍스트 입력(최대 20자)')}
                          placeholderTextColor={colors.gray3}
                          style={styles.input}
                          maxLength={INPUT_LIMITS.CLUB_LINK_LABEL}
                        />
                        <FormTextInput
                          value={link.link}
                          onChangeText={(text) => {
                            setEditDraft((prev) => {
                              const nextLinks = [...prev.links];
                              nextLinks[idx] = { ...nextLinks[idx], link: text };
                              return { ...prev, links: nextLinks };
                            });
                          }}
                          placeholder={l('링크 입력(최대 100자)')}
                          placeholderTextColor={colors.gray3}
                          style={styles.input}
                          fieldType="url"
                          maxLength={INPUT_LIMITS.CLUB_LINK_URL}
                        />
                      </View>
                      <Pressable
                        style={({ pressed }) => [
                          styles.managementContactLinkRemoveButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => {
                          setEditDraft((prev) => ({
                            ...prev,
                            links: prev.links.filter((_, linkIdx) => linkIdx !== idx),
                          }));
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={l('문의 링크 삭제')}
                        hitSlop={6}
                      >
                        <MaterialIcons name="close" size={20} color={colors.gray5} />
                      </Pressable>
                    </View>
                  ))}
                  {editDraft.links.length < 4 ? (
                    <Pressable
                      style={({ pressed }) => [styles.addLinkButton, pressed && styles.pressed]}
                      onPress={() => {
                        setEditDraft((prev) => ({
                          ...prev,
                          links: [...prev.links, { label: '', link: '' }],
                        }));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={l('문의 링크 추가')}
                    >
                      <Text style={styles.addLinkText}>+</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            {activeManagementScreen === 'BOOKSHELF_CREATE' ? (
              <View style={styles.managementEditSection}>
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>
                    {typeof editingBookshelfMeetingId === 'number'
                      ? l('책장 수정하기')
                      : l('책장 생성하기')}
                  </Text>
                  <Text style={styles.helperText}>
                    {typeof editingBookshelfMeetingId === 'number'
                      ? l('정기모임 정보를 수정하고 저장할 수 있습니다.')
                      : l('책을 선택하고 정기모임 정보까지 한 화면에서 등록할 수 있습니다.')}
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    {l('책 선택')}
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
                        : l('선택하기')}
                    </Text>
                  </Pressable>
                  {typeof editingBookshelfMeetingId === 'number' ? (
                    <Text style={styles.helperText}>{l('수정 모드에서는 책을 변경할 수 없습니다.')}</Text>
                  ) : null}

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    {l('기수')}
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
                    {l('입력한 숫자는 책장에서 {generation} 형태로 표시됩니다.', {
                      generation: l(formatGenerationLabel(bookshelfCreateDraft.session || '1')),
                    })}
                  </Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    {l('태그')}
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
                            {l(category)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.helperText}>{l('태그는 1개만 선택해 등록할 수 있습니다.')}</Text>

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    {l('정기모임 이름 (선택)')}
                  </Text>
                  <FormTextInput
                    value={bookshelfCreateDraft.regularMeetingName}
                    onChangeText={(text) =>
                      setBookshelfCreateDraft((prev) => ({ ...prev, regularMeetingName: text }))
                    }
                    placeholder={l('정기모임 이름을 입력해주세요 (최대 {limit}자)', {
                      limit: BOOKSHELF_MEETING_TITLE_MAX_LENGTH,
                    })}
                    placeholderTextColor={colors.gray3}
                    maxLength={BOOKSHELF_MEETING_TITLE_MAX_LENGTH}
                    style={styles.input}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    {l('모임 장소 (선택)')}
                  </Text>
                  <FormTextInput
                    value={bookshelfCreateDraft.meetingLocation}
                    onChangeText={(text) =>
                      setBookshelfCreateDraft((prev) => ({ ...prev, meetingLocation: text }))
                    }
                    placeholder={l('모임 장소를 입력해주세요 (최대 {limit}자)', {
                      limit: BOOKSHELF_MEETING_LOCATION_MAX_LENGTH,
                    })}
                    placeholderTextColor={colors.gray3}
                    maxLength={BOOKSHELF_MEETING_LOCATION_MAX_LENGTH}
                    style={styles.input}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
                    {l('모임 날짜 (선택)')}
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
                        {bookshelfCreateDraft.meetingDate || l('날짜를 선택해주세요')}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.gray4} />
                  </Pressable>
                  <Text style={styles.helperText}>{l('선택하지 않으면 날짜 없이 등록됩니다.')}</Text>
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
                      {deletingBookshelf ? l('삭제 중...') : l('삭제하기')}
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
                      {updatingBookshelf ? l('저장 중...') : l('저장하기')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.managementFooterButton,
                    primaryActionDisabled && styles.primaryButtonDisabled,
                    pressed &&
                    !primaryActionDisabled &&
                    styles.pressed,
                  ]}
                  onPress={
                    activeManagementScreen === 'EDIT'
                      ? handleSaveGroupEdit
                      : handleSubmitBookshelfCreate
                  }
                  disabled={primaryActionDisabled}
                >
                  <Text style={styles.managementFooterPrimaryButtonText}>
                    {activeManagementScreen === 'EDIT'
                      ? l('저장하기')
                      : creatingBookshelf
                        ? l('등록 중...')
                        : l('등록하기')}
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
                <Text style={styles.managementMessageTitle}>{l('가입 메시지')}</Text>
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
                <Text style={styles.managementJoinActionTitle}>{l('가입 처리')}</Text>
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
                    {l('삭제하기')}
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
                    {submittingJoinRequestAction ? l('처리 중...') : l('가입처리')}
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
                  <Text style={styles.managementModalTitle}>{l('모임 날짜 선택')}</Text>
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
                    {formatCalendarMonthLabel(bookshelfCalendarMonth, language)}
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
                      {l(label)}
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
                    {l('선택한 날짜가 바로 적용됩니다.')}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.bookshelfCalendarTodayButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={handlePickTodayBookshelfMeetingDate}
                  >
                    <Text style={styles.bookshelfCalendarTodayButtonText}>{l('오늘')}</Text>
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
                <Text style={styles.managementRoleMenuTitle}>{l('역할 수정')}</Text>
                {[
                  {
                    key: '운영진' as const,
                    label: l('운영진 역할'),
                    icon: 'workspace-premium' as const,
                    disabled:
                      submittingMemberAction ||
                      selectedMemberAction.role === '운영진' ||
                      selectedMemberAction.role === '개설자',
                    onPress: () => handleChangeMemberRole(selectedMemberAction.id, '운영진'),
                  },
                  {
                    key: '회원' as const,
                    label: l('회원 역할'),
                    icon: 'person-outline' as const,
                    disabled:
                      submittingMemberAction ||
                      selectedMemberAction.role === '회원' ||
                      selectedMemberAction.role === '개설자',
                    onPress: () => handleChangeMemberRole(selectedMemberAction.id, '회원'),
                  },
                  {
                    key: '개설자' as const,
                    label: l('개설자 역할'),
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
                    {l('회원 탈퇴')}
                  </Text>
                </Pressable>
              </Pressable>
            </Pressable>
          ) : null}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.managementOverlay}>
          <Pressable
            style={styles.managementOverlayBackdrop}
            onPress={closeManagementMenuImmediately}
            disableFeedback
          />
          <Animated.View
            style={[styles.managementMenuSheet, { transform: [{ translateY: managementSheetY }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.managementHandleArea} {...managementHandlePanResponder.panHandlers}>
              <View style={styles.managementHandle} />
            </View>
            <Text style={styles.managementMenuTitle}>{l('모임 관리하기')}</Text>
            <Text style={styles.managementMenuCaption}>
              {l('운영진용 관리 기능을 선택해야 합니다.')}
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
                  title: l('모임 가입 신청 관리'),
                  description: l('{count}개의 대기 신청', { count: joinRequests.length }),
                  icon: 'person-add-alt-1' as const,
                  onPress: () => handleOpenManagementScreen('JOIN_REQUESTS'),
                },
                {
                  key: 'MEMBERS' as const,
                  title: l('모임 회원 관리'),
                  description: l('{count}명의 모임 회원', { count: members.length }),
                  icon: 'groups' as const,
                  onPress: () => handleOpenManagementScreen('MEMBERS'),
                },
                {
                  key: 'EDIT' as const,
                  title: l('모임 정보 수정하기'),
                  description: l('소개, 태그, 공개 여부 수정'),
                  icon: 'edit' as const,
                  onPress: () => handleOpenManagementScreen('EDIT'),
                },
                {
                  key: 'NOTICE_CREATE' as const,
                  title: l('공지 작성하기'),
                  description: l('책장, 투표, 사진 첨부 가능'),
                  icon: 'edit-note' as const,
                  onPress: handleOpenNoticeComposerFromManagement,
                },
                {
                  key: 'BOOKSHELF_CREATE' as const,
                  title: l('책장 생성하기'),
                  description: l('정기모임용 책장 추가'),
                  icon: 'library-add' as const,
                  onPress: () => handleOpenManagementScreen('BOOKSHELF_CREATE'),
                },
                {
                  key: 'DELETE_CLUB' as const,
                  title: l('모임 삭제하기'),
                  description: l('삭제 후 복구할 수 없습니다'),
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
        </View>
      )}
      <ToastHost />
    </Modal>
  );
}
