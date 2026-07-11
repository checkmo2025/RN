import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Alert, Animated, Dimensions, Keyboard, Linking, PanResponder } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { ReportMemberModalState } from '../../components/common/ReportMemberModal';
import { ApiError } from '../../services/api/http';
import { createReport, type ReportReason } from '../../services/api/memberApi';
import {
  checkClubNameDuplicate,
  deleteClub,
  fetchClubDetail,
  fetchClubMembers,
  leaveClub,
  updateClub,
  updateClubMemberStatus,
  type ClubCategoryCode,
  type ClubParticipantTypeCode,
} from '../../services/api/clubApi';
import { CATEGORY_LABEL_TO_CODE } from '../../constants/domain/category';
import { PARTICIPANT_LABEL_TO_CODE } from '../../constants/domain/participant';
import { INPUT_LIMITS } from '../../constants/inputLimits';
import { useLanguage } from '../../contexts/LanguageContext';
import { showToast } from '../../utils/toast';
import { motion } from '../../theme';
import type {
  BookshelfCreateDraft,
  Group,
  GroupEditDraft,
  GroupJoinRequestItem,
  GroupManagementScreen,
  GroupMemberItem,
  GroupMemberRole,
} from './types';
import {
  buildBookshelfCreateDraft,
  mapClubManagedMemberToGroupMember,
  mapClubManagedMemberToJoinRequest,
  mapManagedClubDetailToGroup,
  toEditDraft,
} from './helpers';
import {
  parseGenerationNumber,
  toOpenableContactLink,
} from './formatters';


const MGMT_SHEET_DRAG_START = 6;
const MGMT_SHEET_DISMISS_DISTANCE = 100;
const MGMT_SHEET_DISMISS_VELOCITY = 0.5;
const MGMT_SHEET_EXPAND_DISTANCE = 120;
const MGMT_SHEET_EXPAND_TRIGGER = 48;

function getManagementSheetClosedY() {
  return Dimensions.get('window').height + 80;
}

export type ManagementStateParams = {
  group: Group;
  managedGroup: Group;
  canManageClub: boolean;
  currentMemberNickname: string;
  navigation: NavigationProp<ParamListBase>;
  requireAuth: (callback?: () => void) => void;
  onClubUpdated: (group: Group) => void;
  onClubDeleted: (clubId: number) => void;
  bookshelfSessions: string[];
  bookshelfBookSelectorVisible: boolean;
  setManagedGroup: Dispatch<SetStateAction<Group>>;
  closeBookshelfBookSelector: () => void;
  closeBookshelfCalendar: () => void;
  setBookshelfCreateDraft: Dispatch<SetStateAction<BookshelfCreateDraft>>;
  setEditingBookshelfMeetingId: Dispatch<SetStateAction<number | null>>;
  handleOpenNoticeComposer: () => void;
  pickAndUploadImage: (type: 'CLUB') => Promise<string | null>;
};

export function useManagementState({
  group,
  managedGroup,
  canManageClub,
  currentMemberNickname,
  navigation,
  requireAuth,
  onClubUpdated,
  onClubDeleted,
  bookshelfSessions,
  bookshelfBookSelectorVisible,
  setManagedGroup,
  closeBookshelfBookSelector,
  closeBookshelfCalendar,
  setBookshelfCreateDraft,
  setEditingBookshelfMeetingId,
  handleOpenNoticeComposer,
  pickAndUploadImage,
}: ManagementStateParams) {
  const { l } = useLanguage();
  const [managementMenuVisible, setManagementMenuVisible] = useState(false);
  const managementSheetY = useRef(new Animated.Value(0)).current;
  const managementSheetPositionRef = useRef(0);
  const managementSheetDragStartRef = useRef(0);
  const managementMenuClosingRef = useRef(false);

  const openManagementMenu = useCallback(() => {
    const closedY = getManagementSheetClosedY();
    managementSheetY.stopAnimation();
    managementMenuClosingRef.current = false;
    managementSheetPositionRef.current = 0;
    managementSheetDragStartRef.current = 0;
    managementSheetY.setValue(closedY);
    setManagementMenuVisible(true);
    requestAnimationFrame(() => {
      Animated.timing(managementSheetY, {
        toValue: 0,
        duration: motion.duration.sheet,
        useNativeDriver: true,
      }).start(() => {
        managementSheetPositionRef.current = 0;
      });
    });
  }, [managementSheetY]);

  const closeManagementMenuImmediately = useCallback(() => {
    managementSheetY.stopAnimation();
    managementMenuClosingRef.current = false;
    managementSheetPositionRef.current = 0;
    managementSheetDragStartRef.current = 0;
    managementSheetY.setValue(0);
    setManagementMenuVisible(false);
  }, [managementSheetY]);

  const closeManagementMenu = useCallback(() => {
    if (managementMenuClosingRef.current) return;
    managementMenuClosingRef.current = true;
    managementSheetY.stopAnimation(() => {
      Animated.timing(managementSheetY, {
        toValue: getManagementSheetClosedY(),
        duration: motion.duration.sheet,
        useNativeDriver: true,
      }).start(() => {
        managementMenuClosingRef.current = false;
        managementSheetPositionRef.current = 0;
        managementSheetDragStartRef.current = 0;
        setManagementMenuVisible(false);
      });
    });
  }, [managementSheetY]);

  const managementHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dy) > MGMT_SHEET_DRAG_START &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderGrant: () => {
        managementSheetDragStartRef.current = managementSheetPositionRef.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const nextY = Math.min(
          Math.max(
            managementSheetDragStartRef.current + gestureState.dy,
            -MGMT_SHEET_EXPAND_DISTANCE,
          ),
          getManagementSheetClosedY(),
        );
        managementSheetY.setValue(nextY);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const releasedY = managementSheetDragStartRef.current + gestureState.dy;
        if (
          releasedY > MGMT_SHEET_DISMISS_DISTANCE ||
          gestureState.vy > MGMT_SHEET_DISMISS_VELOCITY
        ) {
          closeManagementMenu();
        } else {
          const targetY =
            releasedY < -MGMT_SHEET_EXPAND_TRIGGER || gestureState.vy < -MGMT_SHEET_DISMISS_VELOCITY
              ? -MGMT_SHEET_EXPAND_DISTANCE
              : 0;
          Animated.spring(managementSheetY, {
            toValue: targetY,
            useNativeDriver: true,
            bounciness: 6,
          }).start(() => {
            managementSheetPositionRef.current = targetY;
          });
        }
      },
    }),
  ).current;

  const [activeManagementScreen, setActiveManagementScreen] = useState<GroupManagementScreen | null>(null);
  const [managementOverlaySuspended, setManagementOverlaySuspended] = useState(false);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequestItem[]>([]);
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [selectedJoinRequestActionId, setSelectedJoinRequestActionId] = useState<string | null>(null);
  const [selectedJoinRequestMessage, setSelectedJoinRequestMessage] = useState<GroupJoinRequestItem | null>(null);
  const [submittingJoinRequestAction, setSubmittingJoinRequestAction] = useState(false);
  const [selectedMemberActionId, setSelectedMemberActionId] = useState<string | null>(null);
  const [submittingMemberAction, setSubmittingMemberAction] = useState(false);
  const [refreshingJoinRequests, setRefreshingJoinRequests] = useState(false);
  const [refreshingMembers, setRefreshingMembers] = useState(false);
  const [reportModal, setReportModal] = useState<ReportMemberModalState | null>(null);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [uploadingClubImage, setUploadingClubImage] = useState(false);
  const [editDraft, setEditDraft] = useState<GroupEditDraft>(() => toEditDraft(group));
  const [checkedEditName, setCheckedEditName] = useState<{
    value: string;
    duplicate: boolean;
    current?: boolean;
  } | null>(null);
  const [checkingEditName, setCheckingEditName] = useState(false);

  useEffect(() => {
    setContactModalVisible(false);
    setJoinRequests([]);
    setMembers([]);
    closeManagementMenuImmediately();
    setManagementOverlaySuspended(false);
    setActiveManagementScreen(null);
    setSelectedJoinRequestActionId(null);
    setSelectedJoinRequestMessage(null);
    setSelectedMemberActionId(null);
    setEditDraft(toEditDraft(group));
    setCheckedEditName(null);
    setCheckingEditName(false);
  }, [closeManagementMenuImmediately, group]);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      setManagementOverlaySuspended(false);
    });
  }, [navigation]);

  const closeContactModal = useCallback(() => {
    setContactModalVisible(false);
  }, []);

  const runAfterClosingManagementMenu = useCallback(
    (callback: () => void) => {
      closeManagementMenuImmediately();
      callback();
    },
    [closeManagementMenuImmediately],
  );

  const handleOpenManagementScreen = useCallback(
    (screen: GroupManagementScreen) => {
      runAfterClosingManagementMenu(() => {
        setManagementOverlaySuspended(false);
        setActiveManagementScreen(screen);
        setSelectedJoinRequestActionId(null);
        setSelectedJoinRequestMessage(null);
        setSelectedMemberActionId(null);
        if (screen === 'BOOKSHELF_CREATE') {
          setEditingBookshelfMeetingId(null);
          setBookshelfCreateDraft(
            buildBookshelfCreateDraft(String(parseGenerationNumber(bookshelfSessions[0]) ?? 1)),
          );
          closeBookshelfBookSelector();
          closeBookshelfCalendar();
        }
      });
    },
    [
      bookshelfSessions,
      closeBookshelfBookSelector,
      closeBookshelfCalendar,
      runAfterClosingManagementMenu,
      setBookshelfCreateDraft,
      setEditingBookshelfMeetingId,
    ],
  );

  const handleCloseManagementScreen = useCallback(() => {
    setManagementOverlaySuspended(false);
    setActiveManagementScreen(null);
    setSelectedJoinRequestActionId(null);
    setSelectedJoinRequestMessage(null);
    setSelectedMemberActionId(null);
    setEditingBookshelfMeetingId(null);
    closeBookshelfBookSelector();
    closeBookshelfCalendar();
  }, [closeBookshelfBookSelector, closeBookshelfCalendar, setEditingBookshelfMeetingId]);

  const handleChangeEditName = useCallback((text: string) => {
    const normalized = text.trim();
    setEditDraft((prev) => ({ ...prev, name: text }));
    setCheckedEditName((prev) => (prev && prev.value !== normalized ? null : prev));
  }, []);

  const handleCheckEditName = useCallback(() => {
    if (checkingEditName) return;

    Keyboard.dismiss();
    const normalized = editDraft.name.trim();
    const currentName = managedGroup.name.trim();

    if (!normalized) {
      showToast(l('모임 이름을 입력해야 합니다.'));
      return;
    }
    if (normalized.length > INPUT_LIMITS.CLUB_NAME) {
      showToast(l('모임 이름은 {limit}자 이하여야 합니다.', { limit: INPUT_LIMITS.CLUB_NAME }));
      return;
    }
    if (normalized === currentName) {
      setCheckedEditName({ value: normalized, duplicate: false, current: true });
      showToast(l('현재 사용 중인 모임 이름입니다.'));
      return;
    }

    const check = async () => {
      setCheckingEditName(true);
      try {
        const duplicate = await checkClubNameDuplicate(normalized);
        setCheckedEditName({ value: normalized, duplicate });
        showToast(
          duplicate ? l('이미 사용 중인 모임 이름입니다.') : l('사용 가능한 모임 이름입니다.'),
        );
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast(l('모임 이름 중복 확인에 실패했습니다.'));
        }
      } finally {
        setCheckingEditName(false);
      }
    };

    void check();
  }, [checkingEditName, editDraft.name, l, managedGroup.name]);

  const handleCloseManagementLayer = useCallback(() => {
    if (bookshelfBookSelectorVisible) {
      closeBookshelfBookSelector();
      return;
    }
    if (activeManagementScreen) {
      handleCloseManagementScreen();
      return;
    }
    closeManagementMenu();
  }, [
    activeManagementScreen,
    bookshelfBookSelectorVisible,
    closeBookshelfBookSelector,
    closeManagementMenu,
    handleCloseManagementScreen,
  ]);

  const handleRefreshJoinRequests = useCallback(() => {
    const clubId = group.clubId;
    if (refreshingJoinRequests) return;
    if (!canManageClub || typeof clubId !== 'number') {
      showToast(l('가입 신청 목록을 새로고침하지 못했습니다.'));
      return;
    }

    const refresh = async () => {
      setRefreshingJoinRequests(true);
      try {
        const pendingMembers = await fetchClubMembers(clubId, 'PENDING');
        setJoinRequests(pendingMembers.items.map(mapClubManagedMemberToJoinRequest));
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast(l('가입 신청 목록을 새로고침하지 못했습니다.'));
        }
      } finally {
        setRefreshingJoinRequests(false);
      }
    };

    void refresh();
  }, [canManageClub, group.clubId, l, refreshingJoinRequests]);

  const handleRefreshMembers = useCallback(() => {
    const clubId = group.clubId;
    if (refreshingMembers) return;
    if (!canManageClub || typeof clubId !== 'number') {
      showToast(l('회원 목록을 새로고침하지 못했습니다.'));
      return;
    }

    const refresh = async () => {
      setRefreshingMembers(true);
      try {
        const activeMembers = await fetchClubMembers(clubId, 'ACTIVE');
        setMembers(activeMembers.items.map(mapClubManagedMemberToGroupMember));
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast(l('회원 목록을 새로고침하지 못했습니다.'));
        }
      } finally {
        setRefreshingMembers(false);
      }
    };

    void refresh();
  }, [canManageClub, group.clubId, l, refreshingMembers]);

  const handleProcessJoinRequest = useCallback(
    (request: GroupJoinRequestItem, action: 'APPROVE' | 'REJECT') => {
      const clubId = group.clubId;
      const clubMemberId = request.clubMemberId;
      if (submittingJoinRequestAction) return;
      if (!canManageClub || typeof clubId !== 'number' || typeof clubMemberId !== 'number') {
        showToast(l('가입 신청 처리 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.'));
        return;
      }

      const process = async () => {
        setSubmittingJoinRequestAction(true);
        try {
          await updateClubMemberStatus(clubId, clubMemberId, {
            command: action === 'APPROVE' ? 'APPROVE' : 'REJECT',
          });
          const [pendingMembers, activeMembers] = await Promise.all([
            fetchClubMembers(clubId, 'PENDING'),
            fetchClubMembers(clubId, 'ACTIVE'),
          ]);
          setJoinRequests(pendingMembers.items.map(mapClubManagedMemberToJoinRequest));
          setMembers(activeMembers.items.map(mapClubManagedMemberToGroupMember));
          setSelectedJoinRequestActionId(null);
          showToast(action === 'APPROVE' ? l('가입 신청을 승인했습니다.') : l('가입 신청을 삭제했습니다.'));
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast(l('가입 신청 처리에 실패했습니다.'));
          }
        } finally {
          setSubmittingJoinRequestAction(false);
        }
      };

      void process();
    },
    [canManageClub, group.clubId, l, submittingJoinRequestAction],
  );

  const handleChangeMemberRole = useCallback(
    (memberId: string, role: GroupMemberRole) => {
      const targetMember = members.find((member) => member.id === memberId);
      const clubId = group.clubId;
      const clubMemberId = targetMember?.clubMemberId;
      if (submittingMemberAction) return;
      if (!canManageClub || typeof clubId !== 'number' || typeof clubMemberId !== 'number') {
        showToast(l('회원 역할 수정 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.'));
        return;
      }
      if (!targetMember || targetMember.role === role) {
        setSelectedMemberActionId(null);
        return;
      }
      if (role === '개설자' && managedGroup.membershipStatus !== 'OWNER') {
        showToast(l('개설자만 개설자 역할을 위임할 수 있습니다.'));
        return;
      }

      const submit = async () => {
        setSelectedMemberActionId(null);
        setSubmittingMemberAction(true);
        try {
          if (role === '개설자') {
            await updateClubMemberStatus(clubId, clubMemberId, { command: 'TRANSFER_OWNER' });
            setManagedGroup((prev) => ({ ...prev, membershipStatus: 'STAFF' }));
          } else {
            await updateClubMemberStatus(clubId, clubMemberId, {
              command: 'CHANGE_ROLE',
              status: role === '운영진' ? 'STAFF' : 'MEMBER',
            });
          }
          const activeMembers = await fetchClubMembers(clubId, 'ACTIVE');
          setMembers(activeMembers.items.map(mapClubManagedMemberToGroupMember));
          showToast(l('{role} 역할로 변경했습니다.', { role: l(role) }));
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast(l('회원 역할 수정에 실패했습니다.'));
          }
        } finally {
          setSubmittingMemberAction(false);
        }
      };

      if (role === '개설자') {
        Alert.alert(
          l('개설자 역할 위임'),
          l('{nickname}님에게 개설자 역할을 위임하시겠습니까?', {
            nickname: targetMember.nickname,
          }),
          [
            { text: l('취소'), style: 'cancel' },
            { text: l('위임하기'), onPress: () => { void submit(); } },
          ],
        );
        return;
      }

      void submit();
    },
    [
      canManageClub,
      group.clubId,
      l,
      managedGroup.membershipStatus,
      members,
      setManagedGroup,
      submittingMemberAction,
    ],
  );

  const handleRemoveMember = useCallback(
    (memberId: string) => {
      const targetMember = members.find((member) => member.id === memberId);
      const clubId = group.clubId;
      const clubMemberId = targetMember?.clubMemberId;
      if (submittingMemberAction) return;
      if (!canManageClub || typeof clubId !== 'number' || typeof clubMemberId !== 'number') {
        showToast(l('회원 제외 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.'));
        return;
      }
      if (!targetMember || targetMember.role === '개설자') {
        setSelectedMemberActionId(null);
        return;
      }
      const isCurrentMember =
        currentMemberNickname.trim().length > 0 &&
        targetMember.nickname.trim() === currentMemberNickname.trim();

      if (isCurrentMember) {
        Alert.alert(l('모임 탈퇴'), l('{clubName} 모임에서 탈퇴하시겠습니까?', {
          clubName: managedGroup.name || group.name || l('모임'),
        }), [
          { text: l('취소'), style: 'cancel' },
          {
            text: l('탈퇴하기'),
            style: 'destructive',
            onPress: () => {
              const leaveCurrentMember = async () => {
                setSubmittingMemberAction(true);
                try {
                  await leaveClub(clubId);
                  setSelectedMemberActionId(null);
                  onClubDeleted(clubId);
                  navigation.navigate('Home');
                  showToast(l('모임에서 탈퇴했습니다.'));
                } catch (error) {
                  if (!(error instanceof ApiError)) {
                    showToast(l('모임 탈퇴에 실패했습니다.'));
                  }
                } finally {
                  setSubmittingMemberAction(false);
                }
              };
              void leaveCurrentMember();
            },
          },
        ]);
        return;
      }

      Alert.alert(l('회원 탈퇴'), l('{nickname}님을 모임에서 제외하시겠습니까?', {
        nickname: targetMember.nickname,
      }), [
        { text: l('취소'), style: 'cancel' },
        {
          text: l('탈퇴 처리'),
          style: 'destructive',
          onPress: () => {
            const removeMember = async () => {
              setSubmittingMemberAction(true);
              try {
                await updateClubMemberStatus(clubId, clubMemberId, { command: 'KICK' });
                const activeMembers = await fetchClubMembers(clubId, 'ACTIVE');
                setMembers(activeMembers.items.map(mapClubManagedMemberToGroupMember));
                setSelectedMemberActionId(null);
                showToast(l('회원이 모임에서 제외되었습니다.'));
              } catch (error) {
                if (!(error instanceof ApiError)) {
                  showToast(l('회원 제외에 실패했습니다.'));
                }
              } finally {
                setSubmittingMemberAction(false);
              }
            };
            void removeMember();
          },
        },
      ]);
    },
    [
      canManageClub,
      currentMemberNickname,
      group.clubId,
      group.name,
      l,
      managedGroup.name,
      members,
      navigation,
      onClubDeleted,
      submittingMemberAction,
    ],
  );

  const handleSaveGroupEdit = useCallback(() => {
    Keyboard.dismiss();
    const name = editDraft.name.trim();
    const region = editDraft.region.trim();
    const description = editDraft.description.trim();
    const tags = editDraft.categories;
    const targets = editDraft.targets;
    const category = tags
      .map((tag) => CATEGORY_LABEL_TO_CODE[tag])
      .filter((tag): tag is ClubCategoryCode => Boolean(tag));
    const participantTypes = targets
      .map((target) => PARTICIPANT_LABEL_TO_CODE[target])
      .filter((target): target is ClubParticipantTypeCode => Boolean(target));
    const profileImageUrl = editDraft.imageUrl.trim();
    const links = editDraft.links
      .map((link) => ({
        label: link.label?.trim() ?? '',
        link: link.link.trim(),
      }))
      .filter((link) => link.link.length > 0);

    if (!name || !region || !description || category.length === 0 || participantTypes.length === 0) {
      showToast(l('모임 이름, 소개글, 지역, 카테고리, 대상을 입력해야 합니다.'));
      return;
    }
    if (name.length > INPUT_LIMITS.CLUB_NAME) {
      showToast(l('모임 이름은 {limit}자 이하여야 합니다.', { limit: INPUT_LIMITS.CLUB_NAME }));
      return;
    }
    if (description.length > INPUT_LIMITS.CLUB_DESCRIPTION) {
      showToast(l('모임 소개글은 {limit}자 이하여야 합니다.', {
        limit: INPUT_LIMITS.CLUB_DESCRIPTION,
      }));
      return;
    }
    if (region.length > INPUT_LIMITS.CLUB_REGION) {
      showToast(l('활동 지역은 {limit}자 이하여야 합니다.', { limit: INPUT_LIMITS.CLUB_REGION }));
      return;
    }
    if (links.length > 4) {
      showToast(l('문의 링크는 최대 4개까지 등록할 수 있습니다.'));
      return;
    }
    if (links.some((link) => link.label.length > INPUT_LIMITS.CLUB_LINK_LABEL)) {
      showToast(l('문의 링크 이름은 {limit}자 이하여야 합니다.', {
        limit: INPUT_LIMITS.CLUB_LINK_LABEL,
      }));
      return;
    }
    if (links.some((link) => link.link.length > INPUT_LIMITS.CLUB_LINK_URL)) {
      showToast(l('문의 링크는 {limit}자 이하여야 합니다.', { limit: INPUT_LIMITS.CLUB_LINK_URL }));
      return;
    }
    if (profileImageUrl.length > INPUT_LIMITS.CLUB_PROFILE_IMAGE_URL) {
      showToast(l('프로필 이미지 URL이 너무 깁니다. 사진을 다시 선택해 주세요.'));
      return;
    }
    if (checkingEditName) {
      showToast(l('모임 이름 중복 확인 중입니다.'));
      return;
    }
    if (
      name !== managedGroup.name.trim() &&
      (!checkedEditName || checkedEditName.value !== name || checkedEditName.duplicate)
    ) {
      showToast(l('모임 이름 중복 확인을 완료해야 합니다.'));
      return;
    }
    if (!canManageClub) {
      showToast(l('모임 수정 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.'));
      return;
    }

    const save = async () => {
      try {
        await updateClub(group.clubId as number, {
          name,
          description,
          region,
          category,
          participantTypes,
          open: !editDraft.isPrivate,
          profileImageUrl: profileImageUrl || undefined,
          links,
        });
        const detail = await fetchClubDetail(group.clubId as number);
        let nextGroup: Group;
        if (detail) {
          nextGroup = mapManagedClubDetailToGroup(detail, managedGroup);
        } else {
          nextGroup = {
            ...managedGroup,
            name,
            topic: `모임 대상 · ${targets.join(', ')}`,
            region: `활동 지역 · ${region}`,
            description,
            tags,
            isPrivate: editDraft.isPrivate,
            profileImageUrl: profileImageUrl || undefined,
            links,
          };
        }
        setManagedGroup(nextGroup);
        onClubUpdated(nextGroup);
        setCheckedEditName(null);
        setActiveManagementScreen(null);
        showToast(l('모임 정보가 수정되었습니다.'));
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 409 || error.code === 'CLUB_400') {
            setCheckedEditName({ value: name, duplicate: true });
          }
        } else {
          showToast(l('모임 정보 수정에 실패했습니다.'));
        }
      }
    };

    void save();
  }, [
    canManageClub,
    editDraft,
    checkedEditName,
    checkingEditName,
    group.clubId,
    l,
    managedGroup,
    onClubUpdated,
    setManagedGroup,
  ]);

  const handleOpenJoinRequestProfile = useCallback(
    (nickname: string) => {
      const memberNickname = nickname.trim();
      if (!memberNickname) return;
      setSelectedJoinRequestActionId(null);
      setSelectedJoinRequestMessage(null);
      setManagementOverlaySuspended(true);
      const rootNavigation = navigation.getParent<NavigationProp<ParamListBase>>();
      (rootNavigation ?? navigation).navigate('UserProfile', {
        memberNickname,
        fromScreen: 'Meeting',
      });
    },
    [navigation],
  );

  const handlePickClubImage = useCallback(() => {
    if (uploadingClubImage) return;

    const pick = async () => {
      setUploadingClubImage(true);
      try {
        const imageUrl = await pickAndUploadImage('CLUB');
        if (!imageUrl) return;
        setEditDraft((prev) => ({ ...prev, imageUrl }));
        showToast(l('모임 이미지를 적용했습니다.'));
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast(l('이미지 업로드에 실패했습니다.'));
        }
      } finally {
        setUploadingClubImage(false);
      }
    };

    void pick();
  }, [l, pickAndUploadImage, uploadingClubImage]);

  const handleDeleteManagedClub = useCallback(() => {
    if (!canManageClub || typeof group.clubId !== 'number') {
      showToast(l('모임 삭제 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.'));
      return;
    }

    const clubId = group.clubId;
    const clubName = managedGroup.name || l('모임');

    runAfterClosingManagementMenu(() => {
      Alert.alert(l('모임 삭제'), l('{clubName} 모임을 삭제하시겠습니까?', { clubName }), [
        { text: l('취소'), style: 'cancel' },
        {
          text: l('삭제'),
          style: 'destructive',
          onPress: () => {
            const submit = async () => {
              try {
                await deleteClub(clubId);
                onClubDeleted(clubId);
                showToast(l('모임이 삭제되었습니다.'));
              } catch (error) {
                if (!(error instanceof ApiError)) {
                  showToast(l('모임 삭제에 실패했습니다.'));
                }
              }
            };
            void submit();
          },
        },
      ]);
    });
  }, [
    canManageClub,
    group.clubId,
    l,
    managedGroup.name,
    onClubDeleted,
    runAfterClosingManagementMenu,
  ]);

  const handleCloseReportModal = useCallback(() => {
    if (submittingReport) return;
    setReportModal(null);
  }, [submittingReport]);

  const handlePressReportTarget = useCallback(
    (nickname: string) => {
      const targetNickname = nickname.trim();
      if (!targetNickname || submittingReport) return;
      setReportModal(null);
      navigation.navigate('UserProfile', { memberNickname: targetNickname, fromScreen: 'Meeting' });
    },
    [navigation, submittingReport],
  );

  const handleSubmitReport = useCallback(
    (payload: { reason: ReportReason; content?: string }) => {
      Keyboard.dismiss();
      if (!reportModal?.nickname) return;
      requireAuth(() => {
        const submit = async () => {
          setSubmittingReport(true);
          try {
            await createReport({
              targetType: 'MEMBER',
              targetId: reportModal.nickname,
              reason: payload.reason,
              content: payload.content,
            });
            setReportModal(null);
            showToast(l('신고가 접수되었습니다.'));
          } catch (error) {
            if (!(error instanceof ApiError)) {
              showToast(l('신고 접수에 실패했습니다.'));
            }
          } finally {
            setSubmittingReport(false);
          }
        };
        void submit();
      });
    },
    [l, reportModal, requireAuth],
  );

  const handlePressContactButton = useCallback(() => {
    setContactModalVisible(true);
  }, []);

  const handleOpenContactLink = useCallback(
    async (link: string) => {
      const target = toOpenableContactLink(link);
      if (!target) {
        showToast(l('문의하기 링크를 열 수 없습니다.'));
        return;
      }
      try {
        await Linking.openURL(target);
        closeContactModal();
      } catch {
        showToast(l('문의하기 링크를 열 수 없습니다.'));
      }
    },
    [closeContactModal, l],
  );

  const handleOpenNoticeComposerFromManagement = useCallback(() => {
    runAfterClosingManagementMenu(() => {
      handleOpenNoticeComposer();
    });
  }, [handleOpenNoticeComposer, runAfterClosingManagementMenu]);

  const selectedJoinRequestAction = useMemo(
    () => joinRequests.find((item) => item.id === selectedJoinRequestActionId) ?? null,
    [joinRequests, selectedJoinRequestActionId],
  );

  const selectedMemberAction = useMemo(
    () => members.find((item) => item.id === selectedMemberActionId) ?? null,
    [members, selectedMemberActionId],
  );

  return {
    managementMenuVisible,
    managementOverlaySuspended,
    openManagementMenu,
    managementSheetY,
    managementHandlePanResponder,
    activeManagementScreen,
    setActiveManagementScreen,
    joinRequests,
    setJoinRequests,
    members,
    setMembers,
    selectedJoinRequestActionId,
    setSelectedJoinRequestActionId,
    selectedJoinRequestMessage,
    setSelectedJoinRequestMessage,
    submittingJoinRequestAction,
    refreshingJoinRequests,
    refreshingMembers,
    selectedMemberActionId,
    setSelectedMemberActionId,
    submittingMemberAction,
    reportModal,
    setReportModal,
    contactModalVisible,
    submittingReport,
    uploadingClubImage,
    editDraft,
    setEditDraft,
    checkedEditName,
    checkingEditName,
    selectedJoinRequestAction,
    selectedMemberAction,
    closeManagementMenu,
    closeManagementMenuImmediately,
    closeContactModal,
    runAfterClosingManagementMenu,
    handleOpenManagementScreen,
    handleCloseManagementScreen,
    handleCloseManagementLayer,
    handleRefreshJoinRequests,
    handleRefreshMembers,
    handleProcessJoinRequest,
    handleChangeMemberRole,
    handleRemoveMember,
    handleChangeEditName,
    handleCheckEditName,
    handleSaveGroupEdit,
    handleOpenJoinRequestProfile,
    handlePickClubImage,
    handleDeleteManagedClub,
    handleCloseReportModal,
    handlePressReportTarget,
    handleSubmitReport,
    handlePressContactButton,
    handleOpenContactLink,
    handleOpenNoticeComposerFromManagement,
  };
}
