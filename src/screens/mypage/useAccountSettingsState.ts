import { useState, useCallback, useEffect } from 'react';
import { Alert, Keyboard } from 'react-native';
import { type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { ApiError, resolveErrorMessage } from '../../services/api/http';
import { clearStoredAuthSession, logoutSession } from '../../services/api/authApi';
import {
  fetchMyReports,
  updateMyEmail,
  updateMyPassword,
  withdrawMember,
  type ReportItem,
} from '../../services/api/memberApi';
import { formatKstDateLabel } from '../../utils/date';
import { showToast } from '../../utils/toast';
import { navigateToHome } from '../../navigation/navigateToHome';
import { emailRegex, passwordRegex } from '../../constants/validation';
import { useEmailVerificationFlow } from '../../hooks/useEmailVerificationFlow';
import { useLanguage } from '../../contexts/LanguageContext';

const reasonLabelByCode: Record<string, string> = {
  GENERAL: '일반',
  INSULT: '욕설/비방',
  INAPPROPRIATE_CONTENT: '음란/부적절',
  SPAM: '홍보/도배',
};

export type ReportHistoryItem = {
  id: string;
  targetType?: string;
  targetId?: string;
  targetTypeLabel: string;
  targetDisplayName: string;
  targetImageUrl?: string;
  targetUrl?: string;
  reportType: string;
  content: string;
  createdAtLabel: string;
};

type ReportNavigationTarget =
  | { screen: 'UserProfile'; params: { memberNickname: string; fromScreen: string } }
  | { screen: 'Story'; params: { openStoryId: number; openStoryFocus?: 'comments' } }
  | { screen: 'Meeting'; params: { openClubId: number; openMeetingId?: number; openNoticeId?: number } };

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseReportRedirectPath(value: string): { segments: string[]; query: string } {
  const withoutOrigin = value.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, '');
  const [pathname, query = ''] = withoutOrigin.split('?');
  return {
    segments: pathname.split('/').filter(Boolean),
    query,
  };
}

function parseReportRedirectTarget(item: ReportHistoryItem): ReportNavigationTarget | null {
  const url = item.targetUrl?.trim();

  if (url) {
    try {
      const { segments, query } = parseReportRedirectPath(url);

      if (segments[0] === 'profile' && segments[1]) {
        return {
          screen: 'UserProfile',
          params: { memberNickname: decodeURIComponent(segments[1]), fromScreen: 'My' },
        };
      }

      if (segments[0] === 'stories') {
        const storyId = parsePositiveInt(segments[1]);
        if (storyId) {
          return {
            screen: 'Story',
            params: {
              openStoryId: storyId,
              ...(/(^|&)commentId=/.test(query) ? { openStoryFocus: 'comments' } : {}),
            },
          };
        }
      }

      if (segments[0] === 'groups') {
        const clubId = parsePositiveInt(segments[1]);
        if (!clubId) return null;

        if (segments[2] === 'notice') {
          const noticeId = parsePositiveInt(segments[3]);
          return {
            screen: 'Meeting',
            params: {
              openClubId: clubId,
              ...(noticeId ? { openNoticeId: noticeId } : {}),
            },
          };
        }

        if (segments[2] === 'bookcase') {
          const meetingId = parsePositiveInt(segments[3]);
          return {
            screen: 'Meeting',
            params: {
              openClubId: clubId,
              ...(meetingId ? { openMeetingId: meetingId } : {}),
            },
          };
        }

        return { screen: 'Meeting', params: { openClubId: clubId } };
      }
    } catch {
      return null;
    }
  }

  if (item.targetType === 'MEMBER' && (item.targetId?.trim() || item.targetDisplayName.trim())) {
    return {
      screen: 'UserProfile',
      params: {
        memberNickname: item.targetId?.trim() || item.targetDisplayName.trim(),
        fromScreen: 'My',
      },
    };
  }

  if (item.targetType === 'CLUB') {
    const clubId = parsePositiveInt(item.targetId);
    if (clubId) return { screen: 'Meeting', params: { openClubId: clubId } };
  }

  return null;
}

type Params = {
  isLoggedIn: boolean;
  logout: () => void;
  navigation: NavigationProp<ParamListBase>;
  onCloseSettings: () => void;
  selectedSettingKey: string | null;
};

export function useAccountSettingsState({
  isLoggedIn,
  logout,
  navigation,
  onCloseSettings,
  selectedSettingKey,
}: Params) {
  const { t } = useLanguage();
  const ev = useEmailVerificationFlow();
  const [emailCurrent, setEmailCurrent] = useState('');
  const [emailNext, setEmailNext] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [submittingEmailUpdate, setSubmittingEmailUpdate] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNext, setPasswordNext] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNext, setShowPasswordNext] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [submittingPasswordUpdate, setSubmittingPasswordUpdate] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [loadingReportHistory, setLoadingReportHistory] = useState(false);
  const [reportHistoryErrorMessage, setReportHistoryErrorMessage] = useState<string | null>(null);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [submittingLogout, setSubmittingLogout] = useState(false);

  useEffect(() => {
    if (selectedSettingKey === 'emailChange') return;
    setEmailCurrent('');
    setEmailNext('');
    setEmailVerificationCode('');
    ev.reset();
  }, [selectedSettingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedSettingKey === 'passwordChange') return;
    setPasswordCurrent('');
    setPasswordNext('');
    setPasswordConfirm('');
    setShowPasswordCurrent(false);
    setShowPasswordNext(false);
    setShowPasswordConfirm(false);
  }, [selectedSettingKey]);

  const mapReportItems = useCallback((items: ReportItem[]): ReportHistoryItem[] => {
    return items.map((item, index) => {
      const reportId =
        typeof item.reportId === 'number' ? `report-${item.reportId}` : `report-${index}`;
      const reasonCode = item.reason ?? 'GENERAL';
      const targetType = item.targetType;
      const targetDisplayName =
        item.displayName ??
        item.targetSummary ??
        item.targetId ??
        '알 수 없음';

      return {
        id: reportId,
        targetType,
        targetId: item.targetId,
        targetTypeLabel: item.targetTypeDescription ?? targetType ?? '신고 대상',
        targetDisplayName,
        targetImageUrl: item.displayImageUrl,
        targetUrl: item.redirectUrl,
        reportType: item.reasonDescription ?? reasonLabelByCode[reasonCode] ?? reasonCode,
        content:
          typeof item.content === 'string' && item.content.trim()
            ? item.content
            : '신고 사유가 입력되지 않았습니다.',
        createdAtLabel: formatKstDateLabel(item.reportedAt),
      };
    });
  }, []);

  const handlePressReportHistory = useCallback((item: ReportHistoryItem) => {
    const target = parseReportRedirectTarget(item);
    if (!target) {
      showToast('신고 대상을 확인할 수 없습니다.');
      return;
    }

    navigation.navigate(target.screen, target.params);
  }, [navigation]);

  const loadReportHistory = useCallback(async () => {
    if (!isLoggedIn) {
      setReportHistory([]);
      setReportHistoryErrorMessage(null);
      return;
    }

    setLoadingReportHistory(true);
    setReportHistoryErrorMessage(null);
    try {
      const reports = await fetchMyReports();
      setReportHistory(mapReportItems(reports));
    } catch (error) {
      const message = resolveErrorMessage(error, '신고 목록을 불러오지 못했습니다.');
      setReportHistory([]);
      setReportHistoryErrorMessage(message);
      if (!(error instanceof ApiError && error.status === 401)) {
        showToast(message);
      }
    } finally {
      setLoadingReportHistory(false);
    }
  }, [isLoggedIn, mapReportItems]);

  const handleSendEmailVerificationCode = useCallback(() => {
    Keyboard.dismiss();
    if (ev.verified) return;

    const currentEmail = emailCurrent.trim();
    const newEmail = emailNext.trim();

    if (!currentEmail || !newEmail) {
      showToast('기존 이메일과 변경 이메일을 입력해야 합니다.');
      return;
    }
    if (!emailRegex.test(currentEmail) || !emailRegex.test(newEmail)) {
      showToast('올바른 이메일 형식이어야 합니다.');
      return;
    }
    if (currentEmail.localeCompare(newEmail, 'ko', { sensitivity: 'accent' }) === 0) {
      showToast('기존 이메일과 다른 이메일을 입력해야 합니다.');
      return;
    }

    void ev.sendCode(newEmail, 'UPDATE_EMAIL');
  }, [emailCurrent, emailNext, ev]);

  const handleConfirmEmailVerificationCode = useCallback(() => {
    Keyboard.dismiss();
    const newEmail = emailNext.trim();
    const verificationCode = emailVerificationCode.trim();

    if (!ev.sent) {
      showToast('먼저 인증번호를 발송해야 합니다.');
      return;
    }
    if (ev.remainingSeconds <= 0) {
      showToast('인증번호가 만료되었습니다. 인증번호를 다시 발송해야 합니다.');
      return;
    }
    if (!verificationCode) {
      showToast('인증번호를 입력해야 합니다.');
      return;
    }
    if (!emailRegex.test(newEmail)) {
      showToast('변경 이메일 형식이 올바르지 않습니다.');
      return;
    }

    void ev.confirmCode(newEmail, verificationCode);
  }, [emailNext, emailVerificationCode, ev]);

  const handleSubmitEmailUpdate = useCallback(() => {
    Keyboard.dismiss();
    const currentEmail = emailCurrent.trim();
    const newEmail = emailNext.trim();
    const verificationCode = emailVerificationCode.trim();

    if (!currentEmail || !newEmail || !verificationCode) {
      showToast('이메일 변경 정보를 모두 입력해야 합니다.');
      return;
    }
    if (!emailRegex.test(currentEmail) || !emailRegex.test(newEmail)) {
      showToast('올바른 이메일 형식이어야 합니다.');
      return;
    }
    if (!ev.verified) {
      showToast('변경 이메일 인증을 완료해야 합니다.');
      return;
    }

    setSubmittingEmailUpdate(true);
    const submit = async () => {
      try {
        await updateMyEmail({ currentEmail, newEmail, verificationCode });
        showToast('이메일이 변경되었습니다.');
        setEmailCurrent('');
        setEmailNext('');
        setEmailVerificationCode('');
        ev.reset();
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('이메일 변경에 실패했습니다.');
        }
      } finally {
        setSubmittingEmailUpdate(false);
      }
    };
    void submit();
  }, [emailCurrent, emailNext, emailVerificationCode, ev]);

  const handleSubmitPasswordUpdate = useCallback(() => {
    Keyboard.dismiss();
    const currentPassword = passwordCurrent.trim();
    const newPassword = passwordNext.trim();
    const confirmPassword = passwordConfirm.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('비밀번호 정보를 모두 입력해야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (!passwordRegex.test(newPassword)) {
      showToast('비밀번호는 6~12자, 영어 1자 이상, 특수문자 1자 이상이어야 합니다.');
      return;
    }

    setSubmittingPasswordUpdate(true);
    const submit = async () => {
      try {
        await updateMyPassword({ currentPassword, newPassword, confirmPassword });
        await clearStoredAuthSession();
        showToast('비밀번호가 변경되었습니다. 다시 로그인해 주세요.');
        logout();
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('비밀번호 변경에 실패했습니다.');
        }
      } finally {
        setSubmittingPasswordUpdate(false);
      }
    };
    void submit();
  }, [passwordConfirm, passwordCurrent, passwordNext]);

  const handleWithdrawMember = useCallback(() => {
    if (submittingWithdrawal) return;

    Alert.alert('회원 탈퇴', '정말 탈퇴하시겠습니까? 탈퇴 후에는 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴하기',
        style: 'destructive',
        onPress: () => {
          setSubmittingWithdrawal(true);
          const submit = async () => {
            try {
              await withdrawMember();
              await clearStoredAuthSession();
              showToast('탈퇴가 신청되었습니다.');
              logout();
              onCloseSettings();
            } catch (error) {
              if (!(error instanceof ApiError)) {
                showToast('회원 탈퇴에 실패했습니다.');
              }
            } finally {
              setSubmittingWithdrawal(false);
            }
          };
          void submit();
        },
      },
    ]);
  }, [logout, onCloseSettings, submittingWithdrawal]);

  const resetEmailVerification = useCallback(() => {
    setEmailVerificationCode('');
    ev.reset();
  }, [ev]);

  const handleLogoutPress = useCallback(() => {
    if (submittingLogout) return;

    Alert.alert(t('settings.logoutAlertTitle'), t('settings.logoutAlertMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: () => {
          setSubmittingLogout(true);
          const submit = async () => {
            try {
              await logoutSession();
            } catch {
              // 서버 로그아웃 실패 시에도 로컬 세션은 초기화
            } finally {
              logout();
              onCloseSettings();
              navigateToHome(navigation);
              showToast(t('settings.logoutSuccess'));
              setSubmittingLogout(false);
            }
          };
          void submit();
        },
      },
    ]);
  }, [logout, navigation, onCloseSettings, submittingLogout, t]);

  return {
    emailCurrent,
    setEmailCurrent,
    emailNext,
    setEmailNext,
    emailVerificationCode,
    setEmailVerificationCode,
    emailVerificationSent: ev.sent,
    emailVerified: ev.verified,
    sendingEmailVerificationCode: ev.sending,
    confirmingEmailVerificationCode: ev.confirming,
    remainingEmailVerificationSeconds: ev.remainingSeconds,
    emailVerificationRemainingText: ev.remainingText,
    submittingEmailUpdate,
    passwordCurrent,
    setPasswordCurrent,
    passwordNext,
    setPasswordNext,
    passwordConfirm,
    setPasswordConfirm,
    showPasswordCurrent,
    setShowPasswordCurrent,
    showPasswordNext,
    setShowPasswordNext,
    showPasswordConfirm,
    setShowPasswordConfirm,
    submittingPasswordUpdate,
    reportHistory,
    loadingReportHistory,
    reportHistoryErrorMessage,
    submittingWithdrawal,
    submittingLogout,
    loadReportHistory,
    handlePressReportHistory,
    resetEmailVerification,
    handleSendEmailVerificationCode,
    handleConfirmEmailVerificationCode,
    handleSubmitEmailUpdate,
    handleSubmitPasswordUpdate,
    handleWithdrawMember,
    handleLogoutPress,
  };
}
