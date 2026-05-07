import { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { ApiError } from '../../services/api/http';
import {
  confirmEmailVerification,
  logoutSession,
  requestEmailVerification,
} from '../../services/api/authApi';
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

const EMAIL_VERIFICATION_COUNTDOWN_SECONDS = 10 * 60;

const reportTypeLabelByCode: Record<string, string> = {
  GENERAL: '일반',
  CLUB_MEETING: '독서 모임',
  BOOK_STORY: '책 이야기',
  COMMENT: '댓글',
};

export type ReportHistoryItem = {
  id: string;
  reportType: string;
  reportedMemberNickname: string;
  content: string;
  createdAtLabel: string;
};

type Params = {
  isLoggedIn: boolean;
  logout: () => void;
  navigation: NavigationProp<ParamListBase>;
  onCloseSettings: () => void;
  selectedSetting: string | null;
};

export function useAccountSettingsState({
  isLoggedIn,
  logout,
  navigation,
  onCloseSettings,
  selectedSetting,
}: Params) {
  const [emailCurrent, setEmailCurrent] = useState('');
  const [emailNext, setEmailNext] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingEmailVerificationCode, setSendingEmailVerificationCode] = useState(false);
  const [confirmingEmailVerificationCode, setConfirmingEmailVerificationCode] = useState(false);
  const [emailVerificationDeadline, setEmailVerificationDeadline] = useState<number | null>(null);
  const [remainingEmailVerificationSeconds, setRemainingEmailVerificationSeconds] = useState(0);
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
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [submittingLogout, setSubmittingLogout] = useState(false);

  const emailVerificationRemainingText = useMemo(() => {
    const minutes = Math.floor(remainingEmailVerificationSeconds / 60);
    const seconds = remainingEmailVerificationSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remainingEmailVerificationSeconds]);

  useEffect(() => {
    if (!emailVerificationDeadline || emailVerified) return;

    const updateRemaining = () => {
      const remain = Math.max(0, Math.ceil((emailVerificationDeadline - Date.now()) / 1000));
      setRemainingEmailVerificationSeconds(remain);
      if (remain <= 0) {
        setEmailVerificationDeadline(null);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [emailVerificationDeadline, emailVerified]);

  useEffect(() => {
    if (selectedSetting === '이메일 변경') return;
    setEmailCurrent('');
    setEmailNext('');
    setEmailVerificationCode('');
    setEmailVerificationSent(false);
    setEmailVerified(false);
    setEmailVerificationDeadline(null);
    setRemainingEmailVerificationSeconds(0);
  }, [selectedSetting]);

  const mapReportItems = useCallback((items: ReportItem[]): ReportHistoryItem[] => {
    return items.map((item, index) => {
      const reportId =
        typeof item.reportId === 'number' ? `report-${item.reportId}` : `report-${index}`;
      const reportTypeCode = typeof item.reportType === 'string' ? item.reportType : 'GENERAL';
      return {
        id: reportId,
        reportType: reportTypeLabelByCode[reportTypeCode] ?? reportTypeCode,
        reportedMemberNickname:
          typeof item.reportedMemberNickname === 'string' && item.reportedMemberNickname.trim()
            ? item.reportedMemberNickname
            : '알 수 없음',
        content:
          typeof item.content === 'string' && item.content.trim()
            ? item.content
            : '신고 사유가 입력되지 않았습니다.',
        createdAtLabel: formatKstDateLabel(item.reportDate ?? item.createdAt),
      };
    });
  }, []);

  const loadReportHistory = useCallback(async () => {
    if (!isLoggedIn) {
      setReportHistory([]);
      return;
    }

    setLoadingReportHistory(true);
    try {
      const reports = await fetchMyReports();
      setReportHistory(mapReportItems(reports));
    } catch (error) {
      if (error instanceof ApiError) {
        setReportHistory([]);
        return;
      }
      showToast('신고 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingReportHistory(false);
    }
  }, [isLoggedIn, mapReportItems]);

  const handleSendEmailVerificationCode = useCallback(() => {
    if (emailVerified) return;

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

    setSendingEmailVerificationCode(true);
    const submit = async () => {
      try {
        await requestEmailVerification(newEmail, 'UPDATE_EMAIL');
        setEmailVerificationSent(true);
        setEmailVerified(false);
        setRemainingEmailVerificationSeconds(EMAIL_VERIFICATION_COUNTDOWN_SECONDS);
        setEmailVerificationDeadline(Date.now() + EMAIL_VERIFICATION_COUNTDOWN_SECONDS * 1000);
        showToast('인증번호를 발송했습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('인증번호 발송에 실패했습니다.');
        }
      } finally {
        setSendingEmailVerificationCode(false);
      }
    };
    void submit();
  }, [emailCurrent, emailNext, emailVerified]);

  const handleConfirmEmailVerificationCode = useCallback(() => {
    const newEmail = emailNext.trim();
    const verificationCode = emailVerificationCode.trim();

    if (!emailVerificationSent) {
      showToast('먼저 인증번호를 발송해야 합니다.');
      return;
    }
    if (remainingEmailVerificationSeconds <= 0) {
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

    setConfirmingEmailVerificationCode(true);
    const submit = async () => {
      try {
        await confirmEmailVerification(newEmail, verificationCode);
        setEmailVerified(true);
        setEmailVerificationDeadline(null);
        setRemainingEmailVerificationSeconds(0);
        showToast('인증이 완료되었습니다.');
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('이메일 인증에 실패했습니다.');
        }
        setEmailVerified(false);
      } finally {
        setConfirmingEmailVerificationCode(false);
      }
    };
    void submit();
  }, [emailNext, emailVerificationCode, emailVerificationSent, remainingEmailVerificationSeconds]);

  const handleSubmitEmailUpdate = useCallback(() => {
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
    if (!emailVerified) {
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
        setEmailVerificationSent(false);
        setEmailVerified(false);
        setEmailVerificationDeadline(null);
        setRemainingEmailVerificationSeconds(0);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          showToast('이메일 변경에 실패했습니다.');
        }
      } finally {
        setSubmittingEmailUpdate(false);
      }
    };
    void submit();
  }, [emailCurrent, emailNext, emailVerificationCode, emailVerified]);

  const handleSubmitPasswordUpdate = useCallback(() => {
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
        showToast('비밀번호가 변경되었습니다.');
        setPasswordCurrent('');
        setPasswordNext('');
        setPasswordConfirm('');
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
    setEmailVerificationSent(false);
    setEmailVerified(false);
    setEmailVerificationDeadline(null);
    setRemainingEmailVerificationSeconds(0);
  }, []);

  const handleLogoutPress = useCallback(() => {
    if (submittingLogout) return;

    Alert.alert('로그아웃', '로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
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
              showToast('로그아웃되었습니다.');
              setSubmittingLogout(false);
            }
          };
          void submit();
        },
      },
    ]);
  }, [logout, navigation, onCloseSettings, submittingLogout]);

  return {
    emailCurrent,
    setEmailCurrent,
    emailNext,
    setEmailNext,
    emailVerificationCode,
    setEmailVerificationCode,
    emailVerificationSent,
    emailVerified,
    sendingEmailVerificationCode,
    confirmingEmailVerificationCode,
    remainingEmailVerificationSeconds,
    emailVerificationRemainingText,
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
    submittingWithdrawal,
    submittingLogout,
    loadReportHistory,
    resetEmailVerification,
    handleSendEmailVerificationCode,
    handleConfirmEmailVerificationCode,
    handleSubmitEmailUpdate,
    handleSubmitPasswordUpdate,
    handleWithdrawMember,
    handleLogoutPress,
  };
}
