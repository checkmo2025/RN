import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as AppleAuthentication from 'expo-apple-authentication';
import { inferMimeType } from '../utils/imageUpload';
import { PUBLIC_ENV } from '../constants/publicEnv';
import { INPUT_LIMITS } from '../constants/inputLimits';
import {
  LOGO_PRIMARY_URI,
  MOBILE_HEADER_LOGO_URI,
  SOCIAL_GOOGLE_URI,
  SOCIAL_KAKAO_URI,
  SOCIAL_NAVER_URI,
} from '../constants/iconMap';
import { emailRegex, passwordRegex, phoneRegex, nicknameRegex } from '../constants/validation';
import { colors, dialog, interactionOpacity, radius, spacing, typography } from '../theme';
import { AppButton } from '../components/common/PrimaryButton';
import { DialogOverlay } from '../components/common/DialogOverlay';
import { DefaultProfileAvatar } from '../components/common/DefaultProfileAvatar';
import { FeedbackPressable as Pressable } from '../components/common/FeedbackPressable';
import { FormTextInput } from '../components/common/FormTextInput';
import {
  checkNicknameDuplicate,
  fetchActiveTerms,
  fetchLoginStatusSilently,
  fetchMyTermsStatus,
  findEmailByNamePhone,
  loginByIdentifier,
  issueProfileImageUploadUrl,
  sendTemporaryPassword,
  signUpByEmail,
  submitAdditionalInfo,
  updateMyTermsAgreements,
  type TermsAgreementPayload,
  type TermsInfo,
  type MemberTermsInfo,
} from '../services/api/authApi';
import {
  ApiError,
  PROFILE_INCOMPLETE_MESSAGE,
  isProfileIncompleteApiError,
} from '../services/api/http';
import { showToast } from '../utils/toast';
import { loginWithAppleNative } from '../services/auth/appleAuth';
import { loginWithSocial, type OAuthProvider } from '../services/auth/socialAuth';
import { CATEGORY_OPTIONS } from '../constants/domain/category';
import { useEmailVerificationFlow } from '../hooks/useEmailVerificationFlow';
import { useLanguage } from '../contexts/LanguageContext';
import { trackLogin, trackSignUp } from '../services/analytics';

type Step =
  | 'login'
  | 'findId'
  | 'findIdResult'
  | 'resetPw'
  | 'terms'
  | 'emailVerification'
  | 'passwordSet'
  | 'profileBasic'
  | 'profileExtra'
  | 'signupComplete';

type Props = {
  mode?: 'login' | 'profileCompletion';
  onClose?: () => void;
  onLoginSuccess?: () => void;
};

type LocalProfileImage = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

const LogoIcon = LOGO_PRIMARY_URI;
const TopLogoIcon = MOBILE_HEADER_LOGO_URI;
const KakaoIcon = SOCIAL_KAKAO_URI;
const GoogleIcon = SOCIAL_GOOGLE_URI;
const NaverIcon = SOCIAL_NAVER_URI;
const PROFILE_IMAGE_UPLOAD_URL_FAILED = 'PROFILE_IMAGE_UPLOAD_URL_FAILED';
const PROFILE_IMAGE_UPLOAD_FAILED = 'PROFILE_IMAGE_UPLOAD_FAILED';
const SOCIAL_ICON_BUTTON_SIZE = 48;
const SOCIAL_BRAND_ICON_SIZE = 40;
const APPLE_BRAND_ICON_SIZE = 22;


function formatPhoneNumberInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function normalizeDisplayImageUri(uri?: string): string | undefined {
  if (typeof uri !== 'string') return undefined;
  const trimmed = uri.trim();
  if (!trimmed) return undefined;
  if (/^blob:/i.test(trimmed) && Platform.OS !== 'web') return undefined;
  return trimmed;
}

function resolveNicknameFormatError(value: string): string {
  if (!value) return '';
  if (/\s/.test(value)) return '아이디에는 띄어쓰기를 사용할 수 없습니다.';
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value)) {
    return '아이디에는 한글을 사용할 수 없습니다.';
  }
  if (!nicknameRegex.test(value)) {
    return '아이디는 영문 소문자, 숫자, 특수문자만 사용할 수 있습니다.';
  }
  return '';
}

function normalizeNicknameInput(value: string): { value: string; error: string } {
  const lowercased = value.toLowerCase();
  const hasWhitespace = /\s/.test(lowercased);
  const hasKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(lowercased);
  const withoutKoreanAndSpaces = lowercased
    .replace(/\s/g, '')
    .replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
  const normalized = Array.from(withoutKoreanAndSpaces)
    .filter((character) => nicknameRegex.test(character))
    .join('');

  if (hasWhitespace) {
    return { value: normalized, error: '아이디에는 띄어쓰기를 사용할 수 없습니다.' };
  }
  if (hasKorean) {
    return { value: normalized, error: '아이디에는 한글을 사용할 수 없습니다.' };
  }
  if (normalized !== withoutKoreanAndSpaces) {
    return { value: normalized, error: '아이디는 영문 소문자, 숫자, 특수문자만 사용할 수 있습니다.' };
  }
  return { value: normalized, error: '' };
}

function normalizeTermAgreementState(
  terms: TermsInfo[],
  current: Record<number, boolean>,
): Record<number, boolean> {
  let changed = Object.keys(current).length !== terms.length;
  const next: Record<number, boolean> = {};

  terms.forEach((term) => {
    next[term.id] = current[term.id] ?? false;
    if (!(term.id in current)) {
      changed = true;
    }
  });

  return changed ? next : current;
}

function normalizeMemberTermAgreementState(
  terms: MemberTermsInfo[],
  current: Record<number, boolean>,
): Record<number, boolean> {
  let changed = Object.keys(current).length !== terms.length;
  const next: Record<number, boolean> = {};

  terms.forEach((term) => {
    next[term.id] = current[term.id] ?? term.agreed;
    if (!(term.id in current)) {
      changed = true;
    }
  });

  return changed ? next : current;
}

function resolveTermsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'TERMS_400':
        return '약관 정보를 다시 불러와 주세요.';
      case 'TERMS_401':
      case 'TERMS_403':
        return '필수 약관에 동의해야 합니다.';
      case 'TERMS_402':
        return '약관 동의 항목이 중복되었습니다. 약관을 다시 불러와 주세요.';
      case 'TERMS_500':
        return '약관 설정을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.';
      default:
        return error.message || '약관 처리에 실패했습니다.';
    }
  }

  return '약관 처리에 실패했습니다.';
}

export function AuthFlowScreen({ mode = 'login', onClose, onLoginSuccess }: Props) {
  const { l } = useLanguage();
  const startsInProfileCompletion = mode === 'profileCompletion';
  const ev = useEmailVerificationFlow();
  const signUpMethodRef = useRef(startsInProfileCompletion ? 'unknown' : 'email');
  const [step, setStep] = useState<Step>(startsInProfileCompletion ? 'terms' : 'login');
  const [profileCompletionMode, setProfileCompletionMode] = useState(startsInProfileCompletion);
  const [socialSubmitting, setSocialSubmitting] = useState<OAuthProvider | null>(null);
  const [appleLoginAvailable, setAppleLoginAvailable] = useState(false);
  const [appleLoginSubmitting, setAppleLoginSubmitting] = useState(false);
  const [signUpSessionReady, setSignUpSessionReady] = useState(startsInProfileCompletion);
  const [exitSignupConfirmVisible, setExitSignupConfirmVisible] = useState(false);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [activeTerms, setActiveTerms] = useState<TermsInfo[]>([]);
  const [termsAgreements, setTermsAgreements] = useState<Record<number, boolean>>({});
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsSubmitting, setTermsSubmitting] = useState(false);
  const [termsLoadError, setTermsLoadError] = useState('');

  const [signUpEmail, setSignUpEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpPasswordConfirm, setSignUpPasswordConfirm] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpPasswordConfirm, setShowSignUpPasswordConfirm] = useState(false);

  const [nickname, setNickname] = useState('');
  const [nicknameInputError, setNicknameInputError] = useState('');
  const [nicknameChecked, setNicknameChecked] = useState<{
    value: string;
    duplicate: boolean;
  } | null>(null);
  const [nicknameLengthExceeded, setNicknameLengthExceeded] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);

  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [selectedProfileImage, setSelectedProfileImage] = useState<LocalProfileImage | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [defaultProfileConfirmed, setDefaultProfileConfirmed] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [signUpSubmitting, setSignUpSubmitting] = useState(false);
  const [accountCreating, setAccountCreating] = useState(false);
  const [findName, setFindName] = useState('');
  const [findPhoneNumber, setFindPhoneNumber] = useState('');
  const [foundEmail, setFoundEmail] = useState('');
  const [findEmailSubmitting, setFindEmailSubmitting] = useState(false);
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');
  const [sendingTempPassword, setSendingTempPassword] = useState(false);

  const canGoNextFromTerms =
    activeTerms.length > 0 &&
    activeTerms.filter((term) => term.required).every((term) => termsAgreements[term.id] === true);
  const allAgreed =
    activeTerms.length > 0 && activeTerms.every((term) => termsAgreements[term.id] === true);
  const isNicknameValidCheck =
    nicknameChecked &&
    nicknameChecked.value === nickname.trim() &&
    !nicknameChecked.duplicate;
  const hideTopBrand =
    step === 'login' ||
    step === 'findId' ||
    step === 'findIdResult' ||
    step === 'resetPw' ||
    step === 'terms' ||
    step === 'emailVerification' ||
    step === 'passwordSet' ||
    step === 'profileBasic' ||
    step === 'profileExtra' ||
    step === 'signupComplete';
  const isProfileCompletionFlow = profileCompletionMode || signUpSessionReady;

  const toggleCategory = (code: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(code)) return prev.filter((item) => item !== code);
      if (prev.length >= 6) return prev;
      return [...prev, code];
    });
  };

  const toggleTermsAgreement = (termsId: number) => {
    setTermsAgreements((prev) => ({
      ...prev,
      [termsId]: !prev[termsId],
    }));
  };

  const buildTermsAgreementPayload = (): TermsAgreementPayload[] =>
    activeTerms.map((term) => ({
      termsId: term.id,
      agreed: termsAgreements[term.id] === true,
    }));

  const openTermsUrl = (term: TermsInfo) => {
    if (!term.termUrl) {
      showToast('약관 URL을 확인할 수 없습니다.');
      return;
    }

    Linking.openURL(term.termUrl).catch(() => {
      showToast('약관을 열 수 없습니다.');
    });
  };

  const resetSignUpFlow = () => {
    setProfileCompletionMode(false);
    setSignUpSessionReady(false);
    setActiveTerms([]);
    setTermsAgreements({});
    setTermsLoadError('');
    setTermsSubmitting(false);
    setSignUpEmail('');
    setVerificationCode('');
    ev.reset();
    setSignUpPassword('');
    setSignUpPasswordConfirm('');
    setShowSignUpPassword(false);
    setShowSignUpPasswordConfirm(false);
    setNickname('');
    setNicknameInputError('');
    setNicknameChecked(null);
    setNicknameLengthExceeded(false);
    setDescription('');
    setName('');
    setPhoneNumber('');
    setProfileImageUrl('');
    setSelectedProfileImage(null);
    setUploadingProfileImage(false);

    setSelectedCategories([]);
    setSignUpSubmitting(false);
    setAccountCreating(false);
  };

  const goToLogin = () => {
    setProfileCompletionMode(false);
    setSignUpSessionReady(false);
    setStep('login');
    setActiveTerms([]);
    setTermsAgreements({});
    setTermsLoadError('');
    setTermsSubmitting(false);
    setVerificationCode('');
    ev.reset();
  };

  const startSignUp = () => {
    resetSignUpFlow();
    signUpMethodRef.current = 'email';
    setStep('terms');
  };

  const enterProfileCompletionFlow = () => {
    setProfileCompletionMode(true);
    setSignUpSessionReady(true);
    setActiveTerms([]);
    setTermsAgreements({});
    setTermsLoadError('');
    setStep('terms');
  };

  const completeAuthFlow = useCallback((nextToast?: string) => {
    if (nextToast) showToast(nextToast);
    if (onLoginSuccess) {
      onLoginSuccess();
      return;
    }
    onClose?.();
  }, [onClose, onLoginSuccess]);

  const loadTerms = useCallback(async () => {
    if (termsLoading) return;
    setTermsLoading(true);
    setTermsLoadError('');

    try {
      if (isProfileCompletionFlow) {
        const status = await fetchMyTermsStatus();
        const terms = status.terms;
        setActiveTerms(terms);
        setTermsAgreements((prev) => normalizeMemberTermAgreementState(terms, prev));
        if (terms.length === 0) {
          setTermsLoadError('약관 목록을 확인할 수 없습니다.');
        }
        return;
      }

      const terms = await fetchActiveTerms();
      setActiveTerms(terms);
      setTermsAgreements((prev) => normalizeTermAgreementState(terms, prev));
      if (terms.length === 0) {
        setTermsLoadError('약관 목록을 확인할 수 없습니다.');
      }
    } catch (error) {
      setTermsLoadError(resolveTermsErrorMessage(error));
    } finally {
      setTermsLoading(false);
    }
  }, [isProfileCompletionFlow, termsLoading]);

  useEffect(() => {
    if (step !== 'terms') return;
    if (activeTerms.length > 0) {
      setTermsAgreements((prev) => normalizeTermAgreementState(activeTerms, prev));
      return;
    }
    if (termsLoadError) return;
    void loadTerms();
  }, [activeTerms, loadTerms, step, termsLoadError]);

  const handleTermsNext = async () => {
    if (termsLoadError || activeTerms.length === 0) {
      showToast('약관을 다시 불러와 주세요.');
      return;
    }
    if (!canGoNextFromTerms) {
      showToast('필수 약관에 동의해야 합니다.');
      return;
    }

    if (!isProfileCompletionFlow) {
      setStep('emailVerification');
      return;
    }

    setTermsSubmitting(true);
    try {
      await updateMyTermsAgreements(buildTermsAgreementPayload(), { suppressErrorToast: true });
      setStep('profileBasic');
    } catch (error) {
      showToast(resolveTermsErrorMessage(error));
    } finally {
      setTermsSubmitting(false);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let mounted = true;
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (mounted) {
          setAppleLoginAvailable(available);
        }
      })
      .catch(() => {
        if (mounted) {
          setAppleLoginAvailable(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async () => {
    Keyboard.dismiss();
    const identifier = loginIdentifier.trim();
    const password = loginPassword.trim();

    if (!identifier || !password) {
      showToast('이메일 또는 닉네임과 비밀번호를 입력해야 합니다.');
      return;
    }

    setLoginSubmitting(true);
    try {
      await loginByIdentifier(identifier, password);
      await fetchLoginStatusSilently(true);
      showToast('로그인에 성공했습니다.');
      void trackLogin('email').catch(() => undefined);
      completeAuthFlow();
    } catch (error) {
      if (isProfileIncompleteApiError(error)) {
        signUpMethodRef.current = 'email';
        showToast(PROFILE_INCOMPLETE_MESSAGE);
        enterProfileCompletionFlow();
      } else {
        showToast(
          error instanceof ApiError && error.code === 'AUTH_404'
            ? '이메일/닉네임 또는 비밀번호가 일치하지 않습니다.'
            : error instanceof ApiError
              ? error.message
              : '로그인에 실패했습니다.',
        );
      }
    } finally {
      setLoginSubmitting(false);
    }
  };

  // 소셜 로그인. 시스템 브라우저 OAuth → 딥링크 일회용 코드 → 교환.
  const handleSocialLogin = async (provider: OAuthProvider) => {
    if (socialSubmitting || appleLoginSubmitting) return;
    setSocialSubmitting(provider);
    try {
      const outcome = await loginWithSocial(provider);
      if (outcome.status === 'success') {
        if (!outcome.isProfileCompleted) {
          signUpMethodRef.current = provider;
          showToast(PROFILE_INCOMPLETE_MESSAGE);
          enterProfileCompletionFlow();
          return;
        }

        try {
          await fetchLoginStatusSilently(true);
          showToast('로그인에 성공했습니다.');
          void trackLogin(provider).catch(() => undefined);
          completeAuthFlow();
        } catch (error) {
          if (isProfileIncompleteApiError(error)) {
            signUpMethodRef.current = provider;
            showToast(PROFILE_INCOMPLETE_MESSAGE);
            enterProfileCompletionFlow();
          } else {
            showToast(
              error instanceof ApiError && error.message
                ? error.message
                : '로그인 상태를 확인할 수 없습니다.',
            );
          }
        }
      } else if (outcome.status === 'error') {
        showToast(outcome.message);
      }
      // status === 'cancel' 이면 아무 동작 없음
    } finally {
      setSocialSubmitting(null);
    }
  };

  const handleAppleLogin = async () => {
    if (appleLoginSubmitting || socialSubmitting) return;
    setAppleLoginSubmitting(true);
    try {
      const outcome = await loginWithAppleNative();
      if (outcome.status === 'success') {
        try {
          await fetchLoginStatusSilently(true);
          showToast('로그인에 성공했습니다.');
          void trackLogin('apple').catch(() => undefined);
          completeAuthFlow();
        } catch (error) {
          if (isProfileIncompleteApiError(error)) {
            signUpMethodRef.current = 'apple';
            showToast(PROFILE_INCOMPLETE_MESSAGE);
            enterProfileCompletionFlow();
          } else {
            showToast(
              error instanceof ApiError && error.message
                ? error.message
                : '로그인 상태를 확인할 수 없습니다.',
            );
          }
        }
      } else if (outcome.status === 'error') {
        showToast(outcome.message);
      }
      // status === 'cancel' 이면 아무 동작 없음
    } finally {
      setAppleLoginSubmitting(false);
    }
  };

  const renderSocialIconButton = ({
    label,
    loading,
    disabled,
    onPress,
    children,
    variant = 'default',
  }: {
    label: string;
    loading: boolean;
    disabled: boolean;
    onPress: () => void;
    children: ReactNode;
    variant?: 'default' | 'apple';
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={[
        styles.socialIconButton,
        variant === 'apple' && styles.appleSocialIconButton,
        disabled && !loading && styles.socialLoginButtonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={colors.primary1}
        />
      ) : (
        children
      )}
    </Pressable>
  );

  const handleSendVerificationCode = async () => {
    Keyboard.dismiss();
    if (ev.verified) return;
    const email = signUpEmail.trim();
    if (!emailRegex.test(email)) {
      showToast('올바른 이메일 형식이어야 합니다.');
      return;
    }
    await ev.sendCode(email, 'SIGN_UP');
  };

  const handleConfirmVerificationCode = async () => {
    Keyboard.dismiss();
    const email = signUpEmail.trim();
    const code = verificationCode.trim();
    if (!ev.sent) {
      showToast('먼저 인증번호를 발송해야 합니다.');
      return;
    }
    if (ev.remainingSeconds <= 0) {
      showToast('인증번호가 만료되었습니다. 인증번호를 다시 발송해야 합니다.');
      return;
    }
    if (!code) {
      showToast('인증번호를 입력해야 합니다.');
      return;
    }
    await ev.confirmCode(email, code);
  };

  const handleVerificationCodeChange = (value: string) => {
    setVerificationCode(value.replace(/\D/g, '').slice(0, 6));
  };

  const handleNicknameChange = (value: string) => {
    const normalized = normalizeNicknameInput(value);
    const nextNickname = normalized.value.slice(0, INPUT_LIMITS.NICKNAME);
    setNicknameInputError(normalized.error);
    setNicknameLengthExceeded(normalized.value.length > INPUT_LIMITS.NICKNAME);
    setNickname(nextNickname);
    if (nicknameChecked && nicknameChecked.value !== nextNickname) {
      setNicknameChecked(null);
    }
  };

  const resetEmailVerificationStep = () => {
    setSignUpEmail('');
    setVerificationCode('');
    ev.reset();
  };

  const handlePasswordStepNext = async () => {
    Keyboard.dismiss();
    const password = signUpPassword.trim();
    const passwordConfirm = signUpPasswordConfirm.trim();

    if (!password || !passwordConfirm) {
      showToast('비밀번호와 비밀번호 확인을 입력해야 합니다.');
      return;
    }
    if (!passwordRegex.test(password)) {
      showToast('비밀번호는 6~24자, 영어 1자 이상, 특수문자 1자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      showToast('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (!canGoNextFromTerms) {
      showToast('필수 약관에 동의해야 합니다.');
      setStep('terms');
      return;
    }

    const normalizedEmail = signUpEmail.trim();
    const agreements = buildTermsAgreementPayload();
    setAccountCreating(true);
    let resumedFromExistingAccount = false;
    try {
      try {
        await signUpByEmail(normalizedEmail, password, {
          suppressErrorToast: true,
          agreements,
        });
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw error;
        }
        if (error.code === 'AUTH_411') {
          resumedFromExistingAccount = true;
        } else if (error.code === 'AUTH_402') {
          showToast('이미 가입된 이메일입니다. 로그인 또는 비밀번호 찾기를 이용하십시오.');
          return;
        } else {
          showToast(error.message || '회원가입에 실패했습니다.');
          return;
        }
      }

      try {
        await loginByIdentifier(normalizedEmail, password, {
          suppressErrorToast: resumedFromExistingAccount,
        });
      } catch (error) {
        if (
          resumedFromExistingAccount &&
          error instanceof ApiError &&
          (error.status === 400 || error.status === 401)
        ) {
          showToast('이미 가입된 이메일입니다. 로그인 또는 비밀번호 찾기를 이용하십시오.');
          return;
        }
        throw error;
      }

      setProfileCompletionMode(true);
      setSignUpSessionReady(true);
      setStep('profileBasic');
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : '회원가입에 실패했습니다.');
      return;
    } finally {
      setAccountCreating(false);
    }
  };

  const handleCheckNickname = async () => {
    Keyboard.dismiss();
    const normalized = nickname.trim();
    if (!normalized) {
      showToast('닉네임을 입력해야 합니다.');
      return;
    }
    if (normalized.length > 20) {
      showToast('닉네임은 최대 20자까지 가능합니다.');
      return;
    }
    if (!nicknameRegex.test(normalized)) {
      showToast('닉네임은 영어 소문자/숫자/특수문자만 사용할 수 있습니다.');
      return;
    }
    setCheckingNickname(true);
    try {
      const duplicate = await checkNicknameDuplicate(normalized);
      setNicknameChecked({ value: normalized, duplicate });
      showToast(duplicate ? '이미 사용 중인 닉네임입니다.' : '사용 가능한 닉네임입니다.');
    } catch (error) {
      if (error instanceof ApiError) {
        showToast(error.message || '닉네임 중복 확인에 실패했습니다.');
      } else {
        showToast('닉네임 중복 확인에 실패했습니다.');
      }
    } finally {
      setCheckingNickname(false);
    }
  };

  const handleProfileBasicNext = () => {
    Keyboard.dismiss();
    const normalizedNickname = nickname.trim();

    if (!normalizedNickname) {
      showToast('닉네임을 입력해야 합니다.');
      return;
    }
    if (!nicknameRegex.test(normalizedNickname)) {
      showToast('닉네임은 영어 소문자/숫자/특수문자만 사용할 수 있습니다.');
      return;
    }
    if (!isNicknameValidCheck) {
      showToast('닉네임 중복 확인을 완료해야 합니다.');
      return;
    }
    if (!name.trim()) {
      showToast('이름을 입력해야 합니다.');
      return;
    }
    if (name.trim().length > 10) {
      showToast('이름은 최대 10자까지 가능합니다.');
      return;
    }
    if (!phoneRegex.test(phoneNumber.trim())) {
      showToast('전화번호 형식이 올바르지 않습니다. 예: 010-1234-5678');
      return;
    }
    if (description.trim().length > 40) {
      showToast('소개는 40자 이내여야 합니다.');
      return;
    }
    setStep('profileExtra');
  };

  const handlePickProfileImage = async () => {
    if (uploadingProfileImage) return;

    if (Platform.OS !== 'android') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast('사진 접근 권한이 필요합니다.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setSelectedProfileImage({
      uri: asset.uri,
      fileName: asset.fileName ?? `profile_${Date.now()}.jpg`,
      mimeType: asset.mimeType,
    });
    setProfileImageUrl('');
    setDefaultProfileConfirmed(false);
  };

  const useDefaultProfileImage = () => {
    setProfileImageUrl('');
    setSelectedProfileImage(null);
    setDefaultProfileConfirmed(true);
  };

  const handleSubmitSignUp = async () => {
    Keyboard.dismiss();
    if (selectedCategories.length === 0) {
      showToast('관심 카테고리를 1개 이상 선택해야 합니다.');
      return;
    }

    setSignUpSubmitting(true);
    const profileSessionReady = isProfileCompletionFlow;
    let signUpCreatedNow = false;
    let resumedFromExistingAccount = false;
    let loginCompleted = profileSessionReady;

    try {
      if (!profileSessionReady) {
        const normalizedEmail = signUpEmail.trim();
        const normalizedPassword = signUpPassword.trim();
        if (!canGoNextFromTerms) {
          showToast('필수 약관에 동의해야 합니다.');
          setStep('terms');
          return;
        }
        const agreements = buildTermsAgreementPayload();

        try {
          await signUpByEmail(normalizedEmail, normalizedPassword, {
            suppressErrorToast: true,
            agreements,
          });
          signUpCreatedNow = true;
        } catch (error) {
          if (!(error instanceof ApiError)) {
            throw error;
          }
          if (error.code === 'AUTH_411') {
            resumedFromExistingAccount = true;
          } else if (error.code === 'AUTH_402') {
            showToast('이미 가입된 이메일입니다. 로그인 또는 비밀번호 찾기를 이용하십시오.');
            return;
          } else {
            showToast(error.message || '회원가입에 실패했습니다.');
            return;
          }
        }

        try {
          await loginByIdentifier(normalizedEmail, normalizedPassword, {
            suppressErrorToast: resumedFromExistingAccount,
          });
          loginCompleted = true;
          setProfileCompletionMode(true);
          setSignUpSessionReady(true);
        } catch (error) {
          if (
            resumedFromExistingAccount &&
            error instanceof ApiError &&
            (error.status === 400 || error.status === 401)
          ) {
            showToast('이미 가입된 이메일입니다. 로그인 또는 비밀번호 찾기를 이용하십시오.');
            return;
          }
          throw error;
        }
      }

      let uploadedProfileImageUrl = profileImageUrl.trim() || undefined;
      if (selectedProfileImage?.uri) {
        setUploadingProfileImage(true);
        const contentType = inferMimeType(selectedProfileImage.fileName, selectedProfileImage.mimeType);
        const profileImageFileName = selectedProfileImage.fileName ?? `profile_${Date.now()}.jpg`;
        let uploadMeta: Awaited<ReturnType<typeof issueProfileImageUploadUrl>>;
        try {
          uploadMeta = await issueProfileImageUploadUrl(profileImageFileName, contentType);
        } catch (error) {
          if (error instanceof ApiError) {
            throw new Error(PROFILE_IMAGE_UPLOAD_URL_FAILED);
          }
          throw error;
        }
        if (!uploadMeta?.presignedUrl || !uploadMeta.imageUrl) {
          throw new Error(PROFILE_IMAGE_UPLOAD_URL_FAILED);
        }

        try {
          const fileResponse = await fetch(selectedProfileImage.uri);
          const blob = await fileResponse.blob();
          const uploadResponse = await fetch(uploadMeta.presignedUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': contentType,
            },
            body: blob,
          });

          if (!uploadResponse.ok) {
            throw new Error(PROFILE_IMAGE_UPLOAD_FAILED);
          }
        } catch {
          throw new Error(PROFILE_IMAGE_UPLOAD_FAILED);
        }
        uploadedProfileImageUrl = uploadMeta.imageUrl;
      }

      await submitAdditionalInfo({
        nickname: nickname.trim(),
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        description: description.trim(),
        imgUrl: uploadedProfileImageUrl,
        categories: selectedCategories,
      });
      setProfileImageUrl(uploadedProfileImageUrl ?? '');
      setProfileCompletionMode(false);
      setSignUpSessionReady(false);

      showToast('회원가입에 성공했습니다');
      void trackSignUp(signUpMethodRef.current).catch(() => undefined);
      setStep('signupComplete');
    } catch (error) {
      if (error instanceof ApiError) {
        if (loginCompleted) {
          showToast('추가 정보 저장에 실패했습니다. 다시 시도해 주십시오.');
          return;
        }
        if (signUpCreatedNow) {
          showToast('계정이 생성되었습니다. 다시 시도하면 가입을 이어서 진행합니다.');
          return;
        }
        showToast(error.message || '회원가입에 실패했습니다.');
        return;
      }
      if (error instanceof Error && error.message === PROFILE_IMAGE_UPLOAD_URL_FAILED) {
        showToast('프로필 이미지 업로드 준비에 실패했습니다. 잠시 후 다시 시도해 주십시오.');
        return;
      }
      if (error instanceof Error && error.message === PROFILE_IMAGE_UPLOAD_FAILED) {
        showToast('프로필 이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주십시오.');
        return;
      }
      if (loginCompleted || signUpCreatedNow) {
        showToast('가입 절차가 일부만 완료되었습니다. 다시 시도해 주십시오.');
        return;
      }
      showToast('회원가입에 실패했습니다.');
    } finally {
      setSignUpSubmitting(false);
      setUploadingProfileImage(false);
    }
  };

  const handleFindEmail = async () => {
    Keyboard.dismiss();
    const normalizedName = findName.trim();
    const normalizedPhone = formatPhoneNumberInput(findPhoneNumber.trim());

    if (!normalizedName || !normalizedPhone) {
      showToast('이름과 전화번호를 입력해야 합니다.');
      return;
    }
    if (!phoneRegex.test(normalizedPhone)) {
      showToast('전화번호 형식이 올바르지 않습니다. 예: 010-1234-5678');
      return;
    }

    setFindEmailSubmitting(true);
    try {
      setFindPhoneNumber(normalizedPhone);
      const email = await findEmailByNamePhone(normalizedName, normalizedPhone);
      if (!email) {
        showToast('가입된 이메일을 찾지 못했습니다.');
        return;
      }
      setFoundEmail(email);
      setStep('findIdResult');
    } catch (error) {
      if (error instanceof ApiError) {
        showToast(error.message || '이메일 찾기에 실패했습니다.');
        return;
      }
      showToast('이메일 찾기에 실패했습니다.');
    } finally {
      setFindEmailSubmitting(false);
    }
  };

  const handleSendTempPassword = async () => {
    Keyboard.dismiss();
    const email = resetPasswordEmail.trim();
    if (!emailRegex.test(email)) {
      showToast('올바른 이메일 형식이어야 합니다.');
      return;
    }

    setSendingTempPassword(true);
    try {
      await sendTemporaryPassword(email);
      showToast('임시 비밀번호를 발송했습니다.');
      setStep('login');
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('임시 비밀번호 발송에 실패했습니다.');
      }
    } finally {
      setSendingTempPassword(false);
    }
  };

  const renderCard = (
    children: React.ReactNode,
    options?: {
      showTopBackButton?: boolean;
      equalHeight?: 'sm' | 'lg';
      hideClose?: boolean;
      confirmClose?: boolean | (() => boolean);
    },
  ) => {
    const shouldConfirmClose =
      typeof options?.confirmClose === 'function'
        ? options.confirmClose()
        : Boolean(options?.confirmClose);

    return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!hideTopBrand ? (
            <View style={styles.topBrand}>
              <TopLogoIcon width={92} height={56} />
            </View>
          ) : null}
          <View
            style={[
              styles.card,
              options?.equalHeight === 'sm' && styles.cardEqualHeight,
              options?.equalHeight === 'lg' && styles.cardEqualHeightLarge,
            ]}
          >
            <View style={styles.closeRow}>
              {options?.showTopBackButton ? (
                <Pressable
                  onPress={goToLogin}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={l('뒤로가기')}
                  style={({ pressed }) => [styles.cardTopBackButton, pressed && styles.pressed]}
                >
                  <MaterialIcons name="arrow-back-ios-new" size={20} color={colors.primary1} />
                </Pressable>
              ) : null}
              {!options?.hideClose ? (
                <Pressable
                  onPress={shouldConfirmClose ? () => setExitSignupConfirmVisible(true) : onClose}
                  hitSlop={8}
                >
                  <MaterialIcons name="close" size={30} color={colors.primary1} />
                </Pressable>
              ) : null}
            </View>
            {shouldConfirmClose ? (
              <DialogOverlay
                visible={exitSignupConfirmVisible}
                onClose={() => setExitSignupConfirmVisible(false)}
                overlayStyle={styles.confirmModalOverlay}
                cardStyle={styles.confirmModalCard}
              >
                <Text style={styles.confirmModalTitle}>
                  {l('회원가입을 그만하시겠습니까?\n현재 저장된 정보가 사라집니다.')}
                </Text>
                <View style={styles.confirmModalButtonRow}>
                  <AppButton
                    variant="secondary"
                    label="취소"
                    onPress={() => setExitSignupConfirmVisible(false)}
                    size="lg"
                    fullWidth
                  />
                  <AppButton
                    label="나가기"
                    onPress={() => {
                      setExitSignupConfirmVisible(false);
                      onClose?.();
                    }}
                    size="lg"
                    fullWidth
                  />
                </View>
              </DialogOverlay>
            ) : null}
            <View style={styles.cardHeader}>
              <LogoIcon width={108} height={64} />
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
    );
  };

  const hasProfileBasicDraft = () =>
    nickname.trim().length > 0 ||
    description.trim().length > 0 ||
    name.trim().length > 0 ||
    phoneNumber.trim().length > 0;
  const hasProfileExtraDraft = () =>
    Boolean(selectedProfileImage) ||
    profileImageUrl.trim().length > 0 ||
    defaultProfileConfirmed ||
    selectedCategories.length > 0;
  const hasSignupProfileDraft = () => hasProfileBasicDraft() || hasProfileExtraDraft();

  if (step === 'terms') {
    const toggleAll = () => {
      const next = !allAgreed;
      setTermsAgreements(() => {
        const nextState: Record<number, boolean> = {};
        activeTerms.forEach((term) => {
          nextState[term.id] = next;
        });
        return nextState;
      });
    };

    return renderCard(
      <>
        <Text style={styles.title}>{l('약관 동의')}</Text>
        <Text style={styles.flowStep}>{isProfileCompletionFlow ? '1 / 3' : '1 / 6'}</Text>

        <View style={styles.termsBox}>
          {termsLoading ? (
            <View style={styles.termsStatusBox}>
              <ActivityIndicator size="small" color={colors.primary1} />
              <Text style={styles.termsStatusText}>{l('약관을 불러오는 중입니다.')}</Text>
            </View>
          ) : termsLoadError ? (
            <View style={styles.termsStatusBox}>
              <Text style={styles.termsStatusText}>{l(termsLoadError)}</Text>
              <AppButton
                variant="secondary"
                label="다시 불러오기"
                onPress={() => { void loadTerms(); }}
              />
            </View>
          ) : (
            <>
              {activeTerms.map((term) => {
                const agreed = termsAgreements[term.id] === true;
                const label = `${term.title} (${term.required ? l('필수') : l('선택')})`;

                return (
                  <View key={term.id} style={styles.termsRow}>
                    <Pressable
                      style={({ pressed }) => [styles.termsDetailButton, pressed && styles.pressed]}
                      onPress={() => openTermsUrl(term)}
                    >
                      <Text style={styles.termsText}>{label}</Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={colors.gray4}
                      />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.termsCheckButton, pressed && styles.pressed]}
                      onPress={() => toggleTermsAgreement(term.id)}
                    >
                      <MaterialIcons
                        name={agreed ? 'check-box' : 'check-box-outline-blank'}
                        size={22}
                        color={agreed ? colors.primary1 : colors.gray3}
                      />
                    </Pressable>
                  </View>
                );
              })}
              <View style={styles.termsDivider} />
              <Pressable style={styles.termsRow} onPress={toggleAll}>
                <Text style={[styles.termsText, styles.termsAllText]}>{l('전체 동의')}</Text>
                <MaterialIcons
                  name={allAgreed ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={allAgreed ? colors.primary1 : colors.gray3}
                />
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.buttonRow}>
          {!isProfileCompletionFlow ? (
            <AppButton variant="secondary" label="취소" onPress={goToLogin} />
          ) : null}
          <AppButton
            label="다음"
            fullWidth
            loading={termsSubmitting}
            loadingLabel="저장 중..."
            disabled={!canGoNextFromTerms || termsLoading || Boolean(termsLoadError)}
            onPress={() => {
              void handleTermsNext();
            }}
          />
        </View>
      </>,
      {
        equalHeight: 'sm',
        confirmClose: !isProfileCompletionFlow,
        hideClose: isProfileCompletionFlow,
      },
    );
  }

  if (step === 'emailVerification') {
    const canConfirmVerification =
      ev.sent &&
      !ev.verified &&
      !ev.confirming &&
      ev.remainingSeconds > 0 &&
      verificationCode.trim().length > 0;

    return renderCard(
      <>
        <Text style={styles.title}>{l('이메일 인증')}</Text>
        <Text style={styles.flowStep}>2 / 6</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{l('이메일')}</Text>
          <FormTextInput
            value={signUpEmail}
            onChangeText={(value) => {
              setSignUpEmail(value);
              ev.reset();
            }}
            placeholder="이메일"
            style={[styles.input, styles.inputDescenderSafe]}
            placeholderTextColor={colors.gray3}
            fieldType="email"
          />
          <Pressable
            style={({ pressed }) => [
              styles.outlineButton,
              styles.actionButton,
              ev.verified && styles.outlineButtonDisabled,
              pressed && !ev.verified && styles.pressed,
            ]}
            onPress={() => {
              void handleSendVerificationCode();
            }}
            disabled={ev.sending || ev.verified}
          >
            <Text style={[styles.outlineText, ev.verified && styles.outlineTextDisabled]}>
              {ev.sending ? l('발송 중...') : ev.sent ? l('인증번호 재발송') : l('인증번호 발송')}
            </Text>
          </Pressable>

          <View style={styles.verificationLabelRow}>
            <Text style={styles.label}>{l('인증번호')}</Text>
            {ev.sent && !ev.verified ? (
              <Text
                style={[
                  styles.timerText,
                  ev.remainingSeconds <= 0 ? styles.timerExpiredText : null,
                ]}
              >
                {l('남은 시간 {time}', { time: ev.remainingText })}
              </Text>
            ) : null}
          </View>
          <FormTextInput
            value={verificationCode}
            onChangeText={handleVerificationCodeChange}
            placeholder="인증번호 입력"
            style={[styles.input, styles.inputDescenderSafe]}
            placeholderTextColor={colors.gray3}
            fieldType="number"
          />
          <View style={styles.verificationActionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.outlineButton,
                styles.actionButton,
                ev.verified && styles.outlineButtonActive,
                !canConfirmVerification && !ev.verified && styles.outlineButtonDisabled,
                pressed && canConfirmVerification && styles.pressed,
              ]}
              onPress={() => {
                void handleConfirmVerificationCode();
              }}
              disabled={!canConfirmVerification}
            >
              <Text
                style={[
                  styles.outlineText,
                  ev.verified && styles.outlineTextActive,
                  !canConfirmVerification && !ev.verified && styles.outlineTextDisabled,
                ]}
              >
                {ev.confirming ? l('확인 중...') : ev.verified ? l('인증 완료되었습니다') : l('인증하기')}
              </Text>
            </Pressable>
            {ev.verified ? (
              <Pressable
                style={({ pressed }) => [styles.outlineButton, styles.actionButton, pressed && styles.pressed]}
                onPress={() => Alert.alert(
                  l('이메일 인증 초기화'),
                  l('이메일 인증을 다시 진행하시겠습니까?'),
                  [
                    { text: l('취소'), style: 'cancel' },
                    { text: l('초기화'), style: 'destructive', onPress: resetEmailVerificationStep },
                  ],
                )}
              >
                <Text style={styles.outlineText}>{l('초기화')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.buttonRow}>
          <AppButton variant="secondary" label="이전" onPress={() => setStep('terms')} />
          <AppButton
            label="다음"
            fullWidth
            disabled={!ev.verified}
            onPress={() => {
              if (!ev.verified) {
                showToast('이메일 인증을 완료해야 합니다.');
                return;
              }
              setStep('passwordSet');
            }}
          />
        </View>
      </>,
      { equalHeight: 'sm', confirmClose: true },
    );
  }

  if (step === 'passwordSet') {
    return renderCard(
      <>
        <Text style={styles.title}>{l('비밀번호 입력')}</Text>
        <Text style={styles.flowStep}>3 / 6</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{l('비밀번호')}</Text>
          <View style={styles.passwordInputRow}>
            <FormTextInput
              value={signUpPassword}
              onChangeText={setSignUpPassword}
              placeholder="비밀번호"
              style={[styles.input, styles.inputDescenderSafe, styles.passwordInput]}
              placeholderTextColor={colors.gray3}
              fieldType="password"
              secureTextEntry={!showSignUpPassword}
              maxLength={24}
            />
            <Pressable
              style={styles.passwordToggleButton}
              hitSlop={8}
              onPress={() => setShowSignUpPassword((prev) => !prev)}
            >
              <MaterialIcons
                name={showSignUpPassword ? 'visibility-off' : 'visibility'}
                size={20}
                color={colors.gray4}
              />
            </Pressable>
          </View>
          <View style={styles.passwordInputRow}>
            <FormTextInput
              value={signUpPasswordConfirm}
              onChangeText={setSignUpPasswordConfirm}
              placeholder="비밀번호 확인"
              style={[styles.input, styles.inputDescenderSafe, styles.passwordInput]}
              placeholderTextColor={colors.gray3}
              fieldType="password"
              secureTextEntry={!showSignUpPasswordConfirm}
              maxLength={24}
            />
            <Pressable
              style={styles.passwordToggleButton}
              hitSlop={8}
              onPress={() => setShowSignUpPasswordConfirm((prev) => !prev)}
            >
              <MaterialIcons
                name={showSignUpPasswordConfirm ? 'visibility-off' : 'visibility'}
                size={20}
                color={colors.gray4}
              />
            </Pressable>
          </View>
          {[
            { label: '6~24자', ok: signUpPassword.length >= 6 && signUpPassword.length <= 24 },
            { label: '영어 최소 1자 이상', ok: /[a-zA-Z]/.test(signUpPassword) },
            { label: '특수문자 최소 1자 이상', ok: /[!@#$%^&*]/.test(signUpPassword) },
          ].map(({ label, ok }) => (
            <View key={label} style={styles.passwordHintRow}>
              <MaterialIcons
                name={ok ? 'check' : 'close'}
                size={14}
                color={ok ? colors.green : colors.gray3}
              />
              <Text style={[styles.passwordHintText, ok && styles.passwordHintTextOk]}>
                {l(label)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <AppButton variant="secondary" label="이전" onPress={() => setStep('emailVerification')} />
          <AppButton
            label="다음"
            fullWidth
            loading={accountCreating}
            loadingLabel="계정 생성 중..."
            onPress={() => { void handlePasswordStepNext(); }}
          />
        </View>
      </>,
      { equalHeight: 'sm', confirmClose: true },
    );
  }

  if (step === 'profileBasic') {
    const nicknameFormatError = nicknameInputError || resolveNicknameFormatError(nickname);

    return renderCard(
      <>
        <Text style={styles.title}>{l('프로필 설정')}</Text>
        <Text style={styles.flowStep}>{isProfileCompletionFlow ? '2 / 3' : '4 / 6'}</Text>

        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{l('닉네임')}</Text>
            <Text style={styles.labelHint}>{l('최대 {count}글자', { count: 20 })}</Text>
          </View>
          <View style={styles.inlineRow}>
            <FormTextInput
              value={nickname}
              onChangeText={handleNicknameChange}
              placeholder="닉네임 입력해주세요"
              style={[styles.input, styles.inputDescenderSafe, styles.inlineInput]}
              placeholderTextColor={colors.gray3}
              fieldType="nickname"
              maxLength={INPUT_LIMITS.NICKNAME}
              enforceMaxLength={false}
            />
            <Pressable
              style={({ pressed }) => [styles.outlineButton, styles.inlineButton, pressed && styles.pressed]}
              onPress={() => {
                void handleCheckNickname();
              }}
              disabled={checkingNickname}
            >
              <Text style={styles.outlineText}>{checkingNickname ? l('확인 중') : l('중복확인')}</Text>
            </Pressable>
          </View>
          {nicknameChecked && nicknameChecked.value === nickname.trim() ? (
            <Text
              style={[
                styles.nicknameCheckText,
                nicknameChecked.duplicate ? styles.nicknameCheckError : styles.nicknameCheckSuccess,
              ]}
            >
              {nicknameChecked.duplicate ? l('이미 사용 중인 닉네임입니다.') : l('사용 가능한 닉네임입니다.')}
            </Text>
          ) : null}
          {nicknameFormatError ? (
            <Text style={[styles.nicknameCheckText, styles.nicknameCheckError]}>
              {l(nicknameFormatError)}
            </Text>
          ) : null}
          {nicknameLengthExceeded ? (
            <Text style={[styles.nicknameCheckText, styles.nicknameCheckError]}>
              {l('닉네임은 최대 {count}글자까지 입력할 수 있습니다.', { count: 20 })}
            </Text>
          ) : null}

          <View style={styles.descriptionFieldGroup}>
            <View style={styles.descriptionLabelRow}>
              <Text style={styles.label}>{l('소개')}</Text>
              <Text style={styles.inputCounterText}>
                {description.length}/{INPUT_LIMITS.USER_DESCRIPTION}
              </Text>
            </View>
            <FormTextInput
              value={description}
              onChangeText={setDescription}
              placeholder={`${INPUT_LIMITS.USER_DESCRIPTION}자 이내로 작성해주세요`}
              style={[styles.input, styles.inputDescenderSafe]}
              placeholderTextColor={colors.gray3}
              maxLength={INPUT_LIMITS.USER_DESCRIPTION}
            />
          </View>

          <Text style={styles.label}>{l('이름')}</Text>
          <FormTextInput
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력해주세요"
            style={[styles.input, styles.inputDescenderSafe]}
            placeholderTextColor={colors.gray3}
            fieldType="name"
            maxLength={INPUT_LIMITS.USER_NAME}
          />

          <Text style={styles.label}>{l('전화번호')}</Text>
          <FormTextInput
            value={phoneNumber}
            onChangeText={(value) => setPhoneNumber(formatPhoneNumberInput(value))}
            placeholder="010-0000-0000"
            style={[styles.input, styles.inputDescenderSafe]}
            placeholderTextColor={colors.gray3}
            fieldType="phone"
          />
        </View>

        <View style={styles.buttonRow}>
          {!isProfileCompletionFlow ? (
            <AppButton variant="secondary" label="이전" onPress={() => setStep('passwordSet')} />
          ) : null}
          <AppButton label="다음" fullWidth onPress={handleProfileBasicNext} />
        </View>
      </>,
      {
        equalHeight: 'lg',
        confirmClose: !isProfileCompletionFlow && hasProfileBasicDraft,
        hideClose: isProfileCompletionFlow,
      },
    );
  }

  if (step === 'profileExtra') {
    const profileExtraPreviewUri = normalizeDisplayImageUri(
      selectedProfileImage?.uri ?? profileImageUrl,
    );
    const defaultProfileSelected = defaultProfileConfirmed && !profileExtraPreviewUri;
    return renderCard(
      <>
        <Text style={styles.title}>{l('프로필 설정')}</Text>
        <Text style={styles.flowStep}>{isProfileCompletionFlow ? '3 / 3' : '5 / 6'}</Text>

        <View style={styles.avatarSection}>
          <View style={styles.avatarHolder}>
            <View
              style={[
                styles.avatarCircle,
                defaultProfileSelected ? styles.avatarCircleDefaultSelected : null,
              ]}
            >
              {profileExtraPreviewUri ? (
                <Image
                  source={{ uri: profileExtraPreviewUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <DefaultProfileAvatar size={94} />
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.editBadge, pressed && styles.pressed]}
              onPress={() => {
                void handlePickProfileImage();
              }}
              disabled={uploadingProfileImage}
            >
              <MaterialIcons
                name={uploadingProfileImage ? 'hourglass-top' : 'edit'}
                size={14}
                color={colors.white}
              />
            </Pressable>
          </View>
          <AppButton
            variant={defaultProfileSelected ? 'primary' : 'secondary'}
            label="기본 프로필 이미지"
            style={styles.profileDefaultButton}
            onPress={() => Alert.alert(
              l('기본 프로필 이미지'),
              l('기본 프로필 이미지를 사용하시겠습니까?'),
              [
                { text: l('취소'), style: 'cancel' },
                { text: l('확인'), onPress: useDefaultProfileImage },
              ],
            )}
          />
        </View>

        <Text style={styles.label}>{l('관심 카테고리 (최소 1개, 최대 6개 선택)')}</Text>
        <View style={styles.chipGrid}>
          {CATEGORY_OPTIONS.map((category) => {
            const active = selectedCategories.includes(category.code);
            return (
              <Pressable
                key={category.code}
                onPress={() => toggleCategory(category.code)}
                style={({ pressed }) => [
                  styles.chip,
                  active ? styles.chipActive : null,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {l(category.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.buttonRow}>
          {!isProfileCompletionFlow ? (
            <AppButton variant="secondary" label="이전" onPress={() => setStep('profileBasic')} />
          ) : null}
          <AppButton
            label="다음"
            fullWidth
            loading={signUpSubmitting}
            loadingLabel="처리 중..."
            onPress={() => { void handleSubmitSignUp(); }}
          />
        </View>
      </>,
      {
        equalHeight: 'lg',
        confirmClose: !isProfileCompletionFlow && hasSignupProfileDraft,
        hideClose: isProfileCompletionFlow,
      },
    );
  }

  if (step === 'signupComplete') {
    const signupCompleteProfileUri = normalizeDisplayImageUri(profileImageUrl);
    return renderCard(
      <>
        <Text style={[styles.flowStep, { marginTop: 0 }]}>6 / 6</Text>
        <Text style={styles.title}>{l('회원이 되신 것을 환영합니다!')}</Text>

        <View style={styles.completeProfileCard}>
          <View style={styles.completeAvatarCircle}>
            {signupCompleteProfileUri ? (
              <Image source={{ uri: signupCompleteProfileUri }} style={styles.completeAvatarImage} />
            ) : (
              <DefaultProfileAvatar size={86} />
            )}
          </View>
          <Text style={styles.completeNickname}>{nickname || l('닉네임')}</Text>
          <Text style={styles.completeDescription}>
            {description.trim().length > 0 ? description : l('안녕하세요. 반갑습니다.')}
          </Text>
        </View>

        <Text style={[styles.completeSubLabel, { marginTop: spacing.lg }]}>{l('참여중인 독서 모임이 있으신가요?')}</Text>

        <View style={[styles.completeButtonGroup, { marginTop: spacing.sm }]}>
          <AppButton label="모임 검색하기" onPress={() => completeAuthFlow('모임 탭에서 모임을 탐색해보세요.')} />
          <AppButton label="모임 생성하기" onPress={() => completeAuthFlow('모임 탭에서 모임을 생성할 수 있습니다.')} />
          <AppButton variant="secondary" label="모임 없이 이용하기" onPress={() => completeAuthFlow()} />
        </View>
      </>,
      { equalHeight: 'lg', hideClose: true },
    );
  }

  if (step === 'findId') {
    return renderCard(
      <>
        <Text style={styles.title}>{l('아이디\n(이메일 찾기)')}</Text>
        <Text style={styles.subLabel}>{l('이름과 전화번호를 입력해주세요')}</Text>
        <View style={styles.formGroup}>
          <FormTextInput
            value={findName}
            onChangeText={setFindName}
            placeholder="이름"
            style={[styles.input, styles.inputDescenderSafe]}
            placeholderTextColor={colors.gray3}
            fieldType="name"
          />
          <FormTextInput
            value={findPhoneNumber}
            onChangeText={(value) => setFindPhoneNumber(formatPhoneNumberInput(value))}
            placeholder="전화번호"
            style={[styles.input, styles.inputDescenderSafe]}
            placeholderTextColor={colors.gray3}
            fieldType="phone"
          />
        </View>
        <AppButton
          label="아이디 찾기"
          loading={findEmailSubmitting}
          loadingLabel="조회 중..."
          onPress={() => { void handleFindEmail(); }}
        />
      </>,
      { showTopBackButton: true },
    );
  }

  if (step === 'findIdResult') {
    return renderCard(
      <>
        <Text style={styles.title}>{l('아이디\n(이메일 찾기)')}</Text>
        <Text style={styles.subLabel}>{l('해당 정보의 이메일은 다음과 같습니다.')}</Text>
        <View style={styles.formGroup}>
          <TextInput value={foundEmail || '-'} style={[styles.input, styles.inputDescenderSafe]} editable={false} />
        </View>
        <View style={styles.findIdResultActions}>
          <AppButton label="로그인하러가기" onPress={goToLogin} />
          <AppButton variant="secondary" label="비밀번호 찾기" onPress={() => setStep('resetPw')} />
          <AppButton variant="secondary" label="아이디 다시 찾기" onPress={() => setStep('findId')} />
        </View>
      </>,
      { showTopBackButton: true },
    );
  }

  if (step === 'resetPw') {
    return renderCard(
      <>
        <Text style={styles.title}>{l('비밀번호 재발급')}</Text>
        <Text style={styles.subLabel}>{l('이메일을 입력해주세요')}</Text>
        <View style={styles.formGroup}>
          <FormTextInput
            value={resetPasswordEmail}
            onChangeText={setResetPasswordEmail}
            placeholder="이메일"
            style={[styles.input, styles.inputDescenderSafe]}
            placeholderTextColor={colors.gray3}
            fieldType="email"
          />
        </View>
        <AppButton
          label="임시 비밀번호 전송"
          loading={sendingTempPassword}
          loadingLabel="전송 중..."
          onPress={() => { void handleSendTempPassword(); }}
        />
      </>,
      { showTopBackButton: true },
    );
  }

  return renderCard(
    <>
      <Text style={styles.title}>{l('로그인')}</Text>
      <View style={styles.formGroup}>
        <FormTextInput
          value={loginIdentifier}
          onChangeText={setLoginIdentifier}
          placeholder="이메일 또는 닉네임"
          style={[styles.input, styles.inputDescenderSafe]}
          placeholderTextColor={colors.gray3}
          fieldType="identifier"
        />
        <View style={styles.passwordInputRow}>
          <FormTextInput
            value={loginPassword}
            onChangeText={setLoginPassword}
            placeholder="비밀번호"
            style={[styles.input, styles.inputDescenderSafe, styles.passwordInput]}
            placeholderTextColor={colors.gray3}
            fieldType="password"
            secureTextEntry={!showLoginPassword}
            returnKeyType="done"
            onSubmitEditing={() => {
              void handleLogin();
            }}
          />
          <Pressable
            style={styles.passwordToggleButton}
            hitSlop={8}
            onPress={() => setShowLoginPassword((prev) => !prev)}
          >
            <MaterialIcons
              name={showLoginPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color={colors.gray4}
            />
          </Pressable>
        </View>
      </View>
      <View style={styles.inlineLinks}>
        <Pressable onPress={() => setStep('findId')}>
          <Text style={styles.linkText}>{l('아이디 찾기')}</Text>
        </Pressable>
        <View style={styles.linkDivider} />
        <Pressable onPress={() => setStep('resetPw')}>
          <Text style={styles.linkText}>{l('비밀번호 찾기')}</Text>
        </Pressable>
      </View>
      <AppButton
        label="로그인"
        loading={loginSubmitting}
        loadingLabel="로그인 중..."
        onPress={() => { void handleLogin(); }}
      />
      <View style={styles.socialSection}>
        <View style={styles.socialDivider}>
          <View style={styles.socialDividerLine} />
          <Text style={styles.socialDividerText}>{l('또는')}</Text>
          <View style={styles.socialDividerLine} />
        </View>
        <View style={styles.socialIconRow}>
          {Platform.OS === 'ios' && appleLoginAvailable && renderSocialIconButton({
            label: l('Apple로 로그인'),
            loading: appleLoginSubmitting,
            disabled: Boolean(appleLoginSubmitting || socialSubmitting),
            variant: 'apple',
            onPress: () => { void handleAppleLogin(); },
            children: (
              <FontAwesome
                name="apple"
                size={APPLE_BRAND_ICON_SIZE}
                color={colors.white}
              />
            ),
          })}
          {renderSocialIconButton({
            label: l('카카오로 로그인'),
            loading: socialSubmitting === 'kakao',
            disabled: Boolean(appleLoginSubmitting || socialSubmitting),
            onPress: () => { void handleSocialLogin('kakao'); },
            children: (
              <KakaoIcon
                width={SOCIAL_BRAND_ICON_SIZE}
                height={SOCIAL_BRAND_ICON_SIZE}
              />
            ),
          })}
          {renderSocialIconButton({
            label: l('구글로 로그인'),
            loading: socialSubmitting === 'google',
            disabled: Boolean(appleLoginSubmitting || socialSubmitting),
            onPress: () => { void handleSocialLogin('google'); },
            children: (
              <GoogleIcon
                width={SOCIAL_BRAND_ICON_SIZE}
                height={SOCIAL_BRAND_ICON_SIZE}
              />
            ),
          })}
          {renderSocialIconButton({
            label: l('네이버로 로그인'),
            loading: socialSubmitting === 'naver',
            disabled: Boolean(appleLoginSubmitting || socialSubmitting),
            onPress: () => { void handleSocialLogin('naver'); },
            children: (
              <NaverIcon
                width={SOCIAL_BRAND_ICON_SIZE}
                height={SOCIAL_BRAND_ICON_SIZE}
              />
            ),
          })}
        </View>
      </View>
      <View style={styles.loginFooterLinks}>
        <Pressable onPress={startSignUp}>
          <Text style={styles.linkText}>{l('아직 회원이 아니신가요? 회원가입하러가기')}</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(PUBLIC_ENV.SUPPORT_FORM_URL).catch(() => null)}>
          <Text style={styles.linkText}>{l('고객센터/문의하기')}</Text>
        </Pressable>
      </View>
    </>,
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  topBrand: {
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    minHeight: 560,
    elevation: 4,
  },
  // 약관 동의(1/6) · 이메일 인증(2/6) · 비밀번호 입력(3/6) 단계의
  // 하얀 카드를 동일한 크기로 맞추기 위한 공통 최소 높이.
  cardEqualHeight: {
    minHeight: 600,
  },
  // 프로필 설정(4/6) · 프로필/카테고리(5/6) · 가입 완료(6/6) 단계의
  // 하얀 카드를 동일한 크기로 맞추기 위한 공통 최소 높이.
  cardEqualHeightLarge: {
    minHeight: 720,
  },
  closeRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    minHeight: 24,
  },
  cardTopBackButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    paddingVertical: spacing.xxs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    alignItems: 'center',
    marginTop: -8,
  },
  title: {
    ...typography.subhead2,
    color: colors.primary1,
    textAlign: 'center',
  },
  flowStep: {
    ...typography.body2_2,
    color: colors.gray4,
    textAlign: 'center',
    marginTop: -spacing.xs,
  },
  subLabel: {
    ...typography.body2_3,
    color: colors.gray5,
    textAlign: 'center',
  },
  completeSubLabel: {
    ...typography.subhead4_1,
    color: colors.primary1,
    textAlign: 'center',
    marginTop: -spacing.xs,
  },
  termsBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  termsStatusBox: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  termsStatusText: {
    ...typography.body1_3,
    color: colors.gray5,
    textAlign: 'center',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  termsDetailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  termsCheckButton: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    ...typography.body1_3,
    color: colors.gray6,
    flex: 1,
  },
  termsAllText: {
    ...typography.body1_2,
  },
  termsDivider: {
    height: 1,
    backgroundColor: colors.gray2,
    marginVertical: spacing.xs,
  },
  termsModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay30,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsModalCard: {
    width: '100%',
    maxWidth: dialog.maxWidth,
    height: '82%',
    maxHeight: '82%',
    borderRadius: dialog.borderRadius,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  termsModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  termsModalTitle: {
    ...typography.body1_2,
    color: colors.gray6,
    flex: 1,
  },
  termsModalBody: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  termsModalBodyContent: {
    paddingBottom: spacing.lg,
  },
  termsModalText: {
    ...typography.caption1_3_spacious,
    color: colors.gray6,
  },
  termsModalButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay30,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: dialog.maxWidth,
    borderRadius: dialog.borderRadius,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
  },
  confirmModalTitle: {
    ...typography.body1_2,
    color: colors.gray6,
    textAlign: 'center',
  },
  confirmModalButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formGroup: {
    gap: spacing.sm,
    width: '100%',
    alignSelf: 'stretch',
  },
  label: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  labelHint: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  descriptionFieldGroup: {
    gap: spacing.xs,
  },
  descriptionLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  inputCounterText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'right',
    marginLeft: 'auto',
  },
  helperInline: {
    ...typography.body2_3,
    color: colors.gray4,
    marginTop: -spacing.xxs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    width: '100%',
    height: 56,
    alignSelf: 'stretch',
    paddingVertical: 0,
    paddingHorizontal: spacing.md,
    ...typography.body1_3,
    color: colors.gray6,
    backgroundColor: colors.white,
  },
  inputDescenderSafe: {
    paddingVertical: spacing.xxs,
  },
  passwordInputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: spacing.xl + spacing.sm,
  },
  passwordToggleButton: {
    position: 'absolute',
    right: spacing.sm,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: 2,
  },
  passwordHintText: {
    ...typography.body2_3,
    color: colors.gray3,
  },
  passwordHintTextOk: {
    color: colors.green,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineInput: {
    flex: 1,
  },
  inlineButton: {
    width: 96,
    height: 42,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    alignSelf: 'flex-start',
  },
  verificationLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  verificationActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  profileDefaultButton: {
    alignSelf: 'center',
  },
  nicknameCheckText: {
    ...typography.body2_3,
    marginTop: -spacing.xxs,
  },
  nicknameCheckSuccess: {
    color: colors.green,
  },
  nicknameCheckError: {
    color: colors.likeRed,
  },
  timerText: {
    ...typography.body2_2,
    color: colors.gray4,
    flexShrink: 0,
    marginLeft: 'auto',
    textAlign: 'right',
  },
  timerExpiredText: {
    color: colors.likeRed,
  },
  avatarSection: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  avatarHolder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarCircleDefaultSelected: {
    borderColor: colors.primary1,
    borderWidth: 2,
    backgroundColor: colors.subbrown4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
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
    ...typography.body2_3,
    color: colors.gray6,
  },
  chipTextActive: {
    color: colors.primary1,
  },
  completeProfileCard: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
  completeAvatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  completeAvatarImage: {
    width: '100%',
    height: '100%',
  },
  completeButtonGroup: {
    marginTop: 'auto',
    gap: spacing.md,
  },
  completeNickname: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  completeDescription: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
  },
  findIdResultActions: {
    gap: spacing.xs,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.primary1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  outlineButtonActive: {
    borderColor: colors.green,
  },
  outlineButtonDisabled: {
    borderColor: colors.gray2,
    backgroundColor: colors.gray1,
  },
  outlineText: {
    ...typography.body2_2,
    color: colors.primary1,
  },
  outlineTextDisabled: {
    color: colors.gray4,
  },
  outlineTextActive: {
    color: colors.green,
  },
  inlineLinks: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loginFooterLinks: {
    alignSelf: 'center',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  linkText: {
    ...typography.body1_3,
    color: colors.gray5,
    textDecorationLine: 'underline',
  },
  linkDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.gray3,
  },
  socialSection: {
    gap: spacing.sm,
  },
  socialIconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  socialIconButton: {
    width: SOCIAL_ICON_BUTTON_SIZE,
    height: SOCIAL_ICON_BUTTON_SIZE,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  appleSocialIconButton: {
    borderColor: colors.gray2,
    backgroundColor: colors.black,
  },
  socialLoginButtonDisabled: {
    opacity: interactionOpacity.disabled,
  },
  socialDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray2,
  },
  socialDividerText: {
    ...typography.body1_3,
    color: colors.gray4,
  },
  pressed: {
    opacity: interactionOpacity.pressed,
  },
});
