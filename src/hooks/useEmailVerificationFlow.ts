import { useState, useEffect, useMemo } from 'react';
import { ApiError } from '../services/api/http';
import {
  confirmEmailVerification,
  requestEmailVerification,
  type EmailVerificationType,
} from '../services/api/authApi';
import { showToast } from '../utils/toast';

const COUNTDOWN_SECONDS = 10 * 60;

export type EmailVerificationFlow = {
  sent: boolean;
  verified: boolean;
  remainingSeconds: number;
  remainingText: string;
  sending: boolean;
  confirming: boolean;
  sendCode: (email: string, type: EmailVerificationType) => Promise<void>;
  confirmCode: (email: string, code: string) => Promise<void>;
  reset: () => void;
};

export function useEmailVerificationFlow(): EmailVerificationFlow {
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const remainingText = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remainingSeconds]);

  useEffect(() => {
    if (!deadline || verified) return;

    const updateRemaining = () => {
      const remain = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(remain);
      if (remain <= 0) setDeadline(null);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [deadline, verified]);

  const sendCode = async (email: string, type: EmailVerificationType): Promise<void> => {
    setSending(true);
    try {
      await requestEmailVerification(email, type);
      setSent(true);
      setVerified(false);
      setRemainingSeconds(COUNTDOWN_SECONDS);
      setDeadline(Date.now() + COUNTDOWN_SECONDS * 1000);
      showToast('인증번호를 발송했습니다.');
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('인증번호 발송에 실패했습니다.');
      }
    } finally {
      setSending(false);
    }
  };

  const confirmCode = async (email: string, code: string): Promise<void> => {
    setConfirming(true);
    try {
      await confirmEmailVerification(email, code);
      setVerified(true);
      setDeadline(null);
      setRemainingSeconds(0);
      showToast('인증이 완료되었습니다.');
    } catch (error) {
      if (error instanceof ApiError) {
        showToast(
          error.status === 0 || error.status >= 500
            ? error.message || '이메일 인증에 실패했습니다.'
            : '인증 코드가 일치하지 않습니다.',
        );
      } else {
        showToast('이메일 인증에 실패했습니다.');
      }
      setVerified(false);
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setSent(false);
    setVerified(false);
    setSending(false);
    setConfirming(false);
    setDeadline(null);
    setRemainingSeconds(0);
  };

  return {
    sent,
    verified,
    remainingSeconds,
    remainingText,
    sending,
    confirming,
    sendCode,
    confirmCode,
    reset,
  };
}
