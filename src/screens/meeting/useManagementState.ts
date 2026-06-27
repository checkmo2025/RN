import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Alert, Animated, Linking, PanResponder } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { ReportMemberModalState } from '../../components/common/ReportMemberModal';
import { ApiError } from '../../services/api/http';
import { createReport, type ReportReason } from '../../services/api/memberApi';
import {
  deleteClub,
  fetchClubDetail,
  fetchClubMembers,
  updateClub,
  updateClubMemberStatus,
  type ClubCategoryCode,
  type ClubParticipantTypeCode,
} from '../../services/api/clubApi';
import { CATEGORY_LABEL_TO_CODE } from '../../constants/domain/category';
import { PARTICIPANT_LABEL_TO_CODE } from '../../constants/domain/participant';
import { INPUT_LIMITS } from '../../constants/inputLimits';
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
const MGMT_SHEET_CLOSED_Y = 600;

export type ManagementStateParams = {
  group: Group;
  managedGroup: Group;
  canManageClub: boolean;
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
  const [managementMenuVisible, setManagementMenuVisible] = useState(false);
  const managementSheetY = useRef(new Animated.Value(0)).current;
  const managementSheetPositionRef = useRef(0);
  const managementSheetDragStartRef = useRef(0);
  const managementMenuClosingRef = useRef(false);

  const openManagementMenu = useCallback(() => {
    managementSheetY.stopAnimation();
    managementMenuClosingRef.current = false;
    managementSheetPositionRef.current = 0;
    managementSheetDragStartRef.current = 0;
    managementSheetY.setValue(0);
    setManagementMenuVisible(true);
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
        toValue: MGMT_SHEET_CLOSED_Y,
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
          600,
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
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequestItem[]>([]);
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [selectedJoinRequestActionId, setSelectedJoinRequestActionId] = useState<string | null>(null);
  const [selectedJoinRequestMessage, setSelectedJoinRequestMessage] = useState<GroupJoinRequestItem | null>(null);
  const [submittingJoinRequestAction, setSubmittingJoinRequestAction] = useState(false);
  const [selectedMemberActionId, setSelectedMemberActionId] = useState<string | null>(null);
  const [submittingMemberAction, setSubmittingMemberAction] = useState(false);
  const [reportModal, setReportModal] = useState<ReportMemberModalState | null>(null);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [uploadingClubImage, setUploadingClubImage] = useState(false);
  const [editDraft, setEditDraft] = useState<GroupEditDraft>(() => toEditDraft(group));

  useEffect(() => {
    setContactModalVisible(false);
    setJoinRequests([]);
    setMembers([]);
    closeManagementMenuImmediately();
    setActiveManagementScreen(null);
    setSelectedJoinRequestActionId(null);
    setSelectedJoinRequestMessage(null);
    setSelectedMemberActionId(null);
    setEditDraft(toEditDraft(group));
  }, [closeManagementMenuImmediately, group]);

  useEffect(() => {
    if (managementMenuVisible) {
      managementSheetPositionRef.current = 0;
      managementSheetY.setValue(0);
    }
  }, [managementMenuVisible, managementSheetY]);

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
    setActiveManagementScreen(null);
    setSelectedJoinRequestActionId(null);
    setSelectedJoinRequestMessage(null);
    setSelectedMemberActionId(null);
    setEditingBookshelfMeetingId(null);
    closeBookshelfBookSelector();
    closeBookshelfCalendar();
  }, [closeBookshelfBookSelector, closeBookshelfCalendar, setEditingBookshelfMeetingId]);

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

  const handleProcessJoinRequest = useCallback(
    (request: GroupJoinRequestItem, action: 'APPROVE' | 'REJECT') => {
      const clubId = group.clubId;
      const clubMemberId = request.clubMemberId;
      if (submittingJoinRequestAction) return;
      if (!canManageClub || typeof clubId !== 'number' || typeof clubMemberId !== 'number') {
        showToast('가입 신청 처리 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
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
          showToast(action === 'APPROVE' ? '가입 신청을 승인했습니다.' : '가입 신청을 삭제했습니다.');
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast('가입 신청 처리에 실패했습니다.');
          }
        } finally {
          setSubmittingJoinRequestAction(false);
        }
      };

      void process();
    },
    [canManageClub, group.clubId, submittingJoinRequestAction],
  );

  const handleChangeMemberRole = useCallback(
    (memberId: string, role: GroupMemberRole) => {
      const targetMember = members.find((member) => member.id === memberId);
      const clubId = group.clubId;
      const clubMemberId = targetMember?.clubMemberId;
      if (submittingMemberAction) return;
      if (!canManageClub || typeof clubId !== 'number' || typeof clubMemberId !== 'number') {
        showToast('회원 역할 수정 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
        return;
      }
      if (!targetMember || targetMember.role === role) {
        setSelectedMemberActionId(null);
        return;
      }

      const submit = async () => {
        setSubmittingMemberAction(true);
        try {
          if (role === '개설자') {
            await updateClubMemberStatus(clubId, clubMemberId, { command: 'TRANSFER_OWNER' });
          } else {
            await updateClubMemberStatus(clubId, clubMemberId, {
              command: 'CHANGE_ROLE',
              status: role === '운영진' ? 'STAFF' : 'MEMBER',
            });
          }
          const activeMembers = await fetchClubMembers(clubId, 'ACTIVE');
          setMembers(activeMembers.items.map(mapClubManagedMemberToGroupMember));
          setSelectedMemberActionId(null);
          showToast(`${role} 역할로 변경했습니다.`);
        } catch (error) {
          if (!(error instanceof ApiError)) {
            showToast('회원 역할 수정에 실패했습니다.');
          }
        } finally {
          setSubmittingMemberAction(false);
        }
      };

      if (role === '개설자') {
        Alert.alert(
          '개설자 역할 위임',
          `'${targetMember.nickname}'님에게 개설자 역할을 위임하시겠습니까?`,
          [
            { text: '취소', style: 'cancel' },
            { text: '위임하기', onPress: () => { void submit(); } },
          ],
        );
        return;
      }

      void submit();
    },
    [canManageClub, group.clubId, members, submittingMemberAction],
  );

  const handleRemoveMember = useCallback(
    (memberId: string) => {
      const targetMember = members.find((member) => member.id === memberId);
      const clubId = group.clubId;
      const clubMemberId = targetMember?.clubMemberId;
      if (submittingMemberAction) return;
      if (!canManageClub || typeof clubId !== 'number' || typeof clubMemberId !== 'number') {
        showToast('회원 제외 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
        return;
      }
      if (!targetMember || targetMember.role === '개설자') {
        setSelectedMemberActionId(null);
        return;
      }

      Alert.alert('회원 탈퇴', `'${targetMember.nickname}'님을 모임에서 제외하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴 처리',
          style: 'destructive',
          onPress: () => {
            const removeMember = async () => {
              setSubmittingMemberAction(true);
              try {
                await updateClubMemberStatus(clubId, clubMemberId, { command: 'KICK' });
                const activeMembers = await fetchClubMembers(clubId, 'ACTIVE');
                setMembers(activeMembers.items.map(mapClubManagedMemberToGroupMember));
                setSelectedMemberActionId(null);
                showToast('회원이 모임에서 제외되었습니다.');
              } catch (error) {
                if (!(error instanceof ApiError)) {
                  showToast('회원 제외에 실패했습니다.');
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
    [canManageClub, group.clubId, members, submittingMemberAction],
  );

  const handleSaveGroupEdit = useCallback(() => {
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
    const links = (group.links ?? [])
      .map((link) => ({
        label: link.label?.trim() ?? '',
        link: link.link.trim(),
      }))
      .filter((link) => link.link.length > 0);

    if (!name || !region || !description || category.length === 0 || participantTypes.length === 0) {
      showToast('모임 이름, 소개글, 지역, 카테고리, 대상을 입력해야 합니다.');
      return;
    }
    if (name.length > INPUT_LIMITS.CLUB_NAME) {
      showToast(`모임 이름은 ${INPUT_LIMITS.CLUB_NAME}자 이하여야 합니다.`);
      return;
    }
    if (description.length > INPUT_LIMITS.CLUB_DESCRIPTION) {
      showToast(`모임 소개글은 ${INPUT_LIMITS.CLUB_DESCRIPTION}자 이하여야 합니다.`);
      return;
    }
    if (region.length > INPUT_LIMITS.CLUB_REGION) {
      showToast(`활동 지역은 ${INPUT_LIMITS.CLUB_REGION}자 이하여야 합니다.`);
      return;
    }
    if (links.length > 4) {
      showToast('문의 링크는 최대 4개까지 등록할 수 있습니다.');
      return;
    }
    if (links.some((link) => link.label.length > INPUT_LIMITS.CLUB_LINK_LABEL)) {
      showToast(`문의 링크 이름은 ${INPUT_LIMITS.CLUB_LINK_LABEL}자 이하여야 합니다.`);
      return;
    }
    if (links.some((link) => link.link.length > INPUT_LIMITS.CLUB_LINK_URL)) {
      showToast(`문의 링크는 ${INPUT_LIMITS.CLUB_LINK_URL}자 이하여야 합니다.`);
      return;
    }
    if (profileImageUrl.length > INPUT_LIMITS.CLUB_PROFILE_IMAGE_URL) {
      showToast('프로필 이미지 URL이 너무 깁니다. 사진을 다시 선택해 주세요.');
      return;
    }
    if (!canManageClub) {
      showToast('모임 수정 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
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
          };
        }
        setManagedGroup(nextGroup);
        onClubUpdated(nextGroup);
        setActiveManagementScreen(null);
        showToast('모임 정보가 수정되었습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('모임 정보 수정에 실패했습니다.');
        }
      }
    };

    void save();
  }, [
    canManageClub,
    editDraft,
    group.clubId,
    group.links,
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
      setActiveManagementScreen(null);
      navigation.navigate('UserProfile', { memberNickname, fromScreen: 'Meeting' });
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
        showToast('모임 이미지를 적용했습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('이미지 업로드에 실패했습니다.');
        }
      } finally {
        setUploadingClubImage(false);
      }
    };

    void pick();
  }, [pickAndUploadImage, uploadingClubImage]);

  const handleDeleteManagedClub = useCallback(() => {
    if (!canManageClub || typeof group.clubId !== 'number') {
      showToast('모임 삭제 기능을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주십시오.');
      return;
    }

    const clubId = group.clubId;
    const clubName = managedGroup.name || '모임';

    runAfterClosingManagementMenu(() => {
      Alert.alert('모임 삭제', `'${clubName}' 모임을 삭제하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const submit = async () => {
              try {
                await deleteClub(clubId);
                onClubDeleted(clubId);
                showToast('모임이 삭제되었습니다.');
              } catch (error) {
                if (!(error instanceof ApiError)) {
                  showToast('모임 삭제에 실패했습니다.');
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
            showToast('신고가 접수되었습니다.');
          } catch (error) {
            if (!(error instanceof ApiError)) {
              showToast('신고 접수에 실패했습니다.');
            }
          } finally {
            setSubmittingReport(false);
          }
        };
        void submit();
      });
    },
    [reportModal, requireAuth],
  );

  const handlePressContactButton = useCallback(() => {
    setContactModalVisible(true);
  }, []);

  const handleOpenContactLink = useCallback(
    async (link: string) => {
      const target = toOpenableContactLink(link);
      if (!target) {
        showToast('문의하기 링크를 열 수 없습니다.');
        return;
      }
      try {
        await Linking.openURL(target);
        closeContactModal();
      } catch {
        showToast('문의하기 링크를 열 수 없습니다.');
      }
    },
    [closeContactModal],
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
    selectedJoinRequestAction,
    selectedMemberAction,
    closeManagementMenu,
    closeContactModal,
    runAfterClosingManagementMenu,
    handleOpenManagementScreen,
    handleCloseManagementScreen,
    handleCloseManagementLayer,
    handleProcessJoinRequest,
    handleChangeMemberRole,
    handleRemoveMember,
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
