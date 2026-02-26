import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';

import { colors, radius, spacing, typography } from '../theme';
import {
  checkNicknameDuplicate,
  confirmEmailVerification,
  findEmailByNamePhone,
  loginByEmail,
  requestEmailVerification,
  issueProfileImageUploadUrl,
  sendTemporaryPassword,
  signUpByEmail,
  submitAdditionalInfo,
} from '../services/api/authApi';
import { ApiError } from '../services/api/http';
import { showToast } from '../utils/toast';

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
  onClose?: () => void;
  onLoginSuccess?: () => void;
};

type CategoryOption = {
  label: string;
  code:
    | 'FICTION_POETRY_DRAMA'
    | 'ESSAY'
    | 'HUMANITIES'
    | 'SOCIAL_SCIENCE'
    | 'POLITICS_DIPLOMACY_DEFENSE'
    | 'ECONOMY_MANAGEMENT'
    | 'SELF_DEVELOPMENT'
    | 'HISTORY_CULTURE'
    | 'SCIENCE'
    | 'COMPUTER_IT'
    | 'ART_POP_CULTURE'
    | 'TRAVEL'
    | 'FOREIGN_LANGUAGE'
    | 'CHILDREN_BOOKS'
    | 'RELIGION_PHILOSOPHY';
};

type TermsAgreementKey = 'service' | 'checkmo' | 'thirdParty' | 'marketing';

type TermsDocument = {
  title: string;
  content: string;
};

type LocalProfileImage = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

const termsDocuments: Record<TermsAgreementKey, TermsDocument> = {
  service: {
    title: '서비스 이용을 위한 필수 개인정보 수집·이용 동의 (필수)',
    content: `책모는 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.

1. 수집 항목
- 이메일 주소(아이디)
- 비밀번호
- 이름
- 전화번호
- 닉네임
- 서비스 이용 기록 (모임 참여, 콘텐츠 작성 등)
- 접속 로그 및 이용 이력

2. 수집·이용 목적
- 회원 식별 및 가입 의사 확인
- 책모 서비스 제공 및 운영
- 독서 모임, 콘텐츠, 커뮤니티 기능 제공
- 고객 문의 및 고객센터 응대
- 서비스 품질 개선 및 오류 분석

3. 보유 및 이용 기간
- 회원 탈퇴 시까지 보관
- 단, 관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관

4. 동의 거부 권리 및 불이익
- 이용자는 개인정보 수집·이용에 대한 동의를 거부할 수 있습니다.
- 다만, 필수 항목에 대한 동의를 거부할 경우 서비스 이용이 제한될 수 있습니다.
- 관련 법령: 「개인정보 보호법」 제15조`,
  },
  marketing: {
    title: '마케팅 및 이벤트 정보 수신 동의 (선택)',
    content: `책모는 서비스 관련 소식 및 혜택 안내를 위해 아래와 같이 정보를 활용할 수 있습니다.

1. 수신 내용
- 이벤트 및 프로모션 안내
- 신규 기능 및 서비스 소식
- 독서 모임 및 콘텐츠 추천 정보

2. 수신 방법
- 이메일
- 서비스 내 알림

3. 보유 및 이용 기간
- 회원 탈퇴 또는 수신 동의 철회 시까지

4. 동의 거부 및 철회
- 본 동의는 선택 사항이며, 동의하지 않더라도 책모 서비스 이용에는 제한이 없습니다.
- 수신 동의는 언제든지 설정 화면을 통해 철회할 수 있습니다.
- 관련 법령: 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 제50조`,
  },
  thirdParty: {
    title: '개인정보 제3자 제공 동의 (선택)',
    content: `책모는 원칙적으로 회원의 개인정보를 외부에 제공하지 않습니다.

1. 개인정보 제3자 제공 여부
- 현재 책모는 회원의 개인정보를 제3자에게 제공하지 않습니다.

2. 향후 제공 가능성
- 향후 서비스 운영을 위해 개인정보를 제3자에게 제공해야 하는 경우,
  제공 대상, 제공 항목, 제공 목적을 사전에 고지하고 별도의 동의를 받습니다.

3. 동의 거부 권리
- 본 동의는 선택 사항이며, 동의하지 않더라도 서비스 이용에는 제한이 없습니다.
- 관련 법령: 「개인정보 보호법」 제17조`,
  },
  checkmo: {
    title: '책모 이용약관 동의 (필수)',
    content: `제1조 (목적)
본 약관은 책모(이하 “서비스”)가 제공하는 독서 커뮤니티 플랫폼 및 관련 제반 서비스의 이용과 관련하여 서비스와 회원 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.

제2조 (정의)
본 약관에서 사용하는 용어의 정의는 다음과 같습니다.
1. “서비스”란 책모가 제공하는 웹 및 애플리케이션 기반의 독서 커뮤니티, 모임, 콘텐츠 공유 등 일체의 서비스를 의미합니다.
2. “회원”이란 본 약관에 동의하고 서비스에 가입한 자를 말합니다.
3. “콘텐츠”란 회원 또는 서비스가 서비스 내에 게시한 텍스트, 이미지, 댓글, 채팅 메시지 등 일체의 정보를 의미합니다.
4. “모임”이란 회원이 생성하거나 참여할 수 있는 독서 클럽 단위의 커뮤니티를 의미합니다.

제3조 (약관의 효력 및 변경)
1. 본 약관은 회원이 회원가입 시 동의함으로써 효력이 발생합니다.
2. 서비스는 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있습니다.
3. 약관의 중요한 변경 사항은 서비스 내 공지 또는 별도 안내를 통해 고지합니다.
4. 변경된 약관에 동의하지 않을 경우, 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다.

제4조 (회원가입)
1. 회원가입은 이용자가 본 약관과 개인정보 처리방침에 동의하고 서비스가 정한 절차에 따라 가입을 신청함으로써 이루어집니다.
2. 서비스는 다음 경우 가입 신청을 제한할 수 있습니다.
- 허위 정보를 기재한 경우
- 타인의 정보를 도용한 경우
- 기타 서비스 운영상 부적절하다고 판단되는 경우

제5조 (회원의 의무)
1. 회원은 관계 법령, 본 약관 및 서비스 정책을 준수해야 합니다.
2. 회원은 타인의 권리를 침해하거나 서비스 운영을 방해하는 행위를 해서는 안 됩니다.
3. 회원은 본인의 계정 정보를 안전하게 관리할 책임이 있습니다.

제6조 (서비스의 제공 및 변경)
1. 서비스는 독서 모임, 콘텐츠 공유, 커뮤니티 기능 등을 제공합니다.
2. 서비스는 운영상 또는 기술상 필요에 따라 제공하는 서비스의 일부 또는 전부를 변경할 수 있습니다.

제7조 (콘텐츠의 권리와 책임)
1. 회원이 서비스에 게시한 콘텐츠의 저작권은 해당 회원에게 귀속됩니다.
2. 회원은 서비스 운영을 위해 해당 콘텐츠를 서비스 내에서 노출, 저장, 이용하는 것을 허락합니다.
3. 회원은 타인의 저작권을 침해하는 콘텐츠를 게시해서는 안 됩니다.

제8조 (서비스 정책의 준용)
1. 서비스는 기능별 운영 기준을 별도의 정책집으로 정할 수 있습니다.
2. 회원은 서비스 이용 시 다음 정책을 포함한 각 기능별 운영정책을 준수해야 합니다.
- 모임 운영정책
- 실시간 채팅 운영정책
- 책이야기 운영정책
- 소식 운영정책
- 고객센터 운영정책
3. 정책집은 본 약관의 일부로서 효력을 가집니다.

제9조 (서비스 이용 제한)
1. 회원이 본 약관 또는 정책을 위반한 경우, 서비스는 다음 조치를 취할 수 있습니다.
- 서비스 이용 제한
- 콘텐츠 삭제
- 계정 정지 또는 탈퇴
2. 중대한 위반 행위의 경우 사전 통보 없이 조치가 이루어질 수 있습니다.

제10조 (회원 탈퇴)
1. 회원은 언제든지 서비스에서 탈퇴할 수 있습니다.
2. 탈퇴 시 회원의 계정 정보는 관련 법령에 따라 처리됩니다.

제11조 (책임의 제한)
1. 서비스는 회원 간의 자율적인 커뮤니티 활동에 개입하지 않습니다.
2. 서비스는 회원이 게시한 콘텐츠의 정확성, 신뢰성에 대해 책임을 지지 않습니다.
3. 서비스는 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 제공 중단에 대해 책임을 지지 않습니다.

제12조 (분쟁 해결)
1. 본 약관과 관련하여 발생한 분쟁은 관계 법령에 따라 해결합니다.
2. 서비스와 회원 간 분쟁에 대해 소송이 제기될 경우 대한민국 법을 준거법으로 합니다.

제13조 (시행일)
본 약관은 2025년 12월 21일부터 시행합니다.`,
  },
};

const logoUri = Image.resolveAssetSource(
  require('../../assets/icons/logo_primary.svg'),
).uri;
const topLogoUri = Image.resolveAssetSource(
  require('../../assets/mobile-header-logo.svg'),
).uri;
const googleUri = Image.resolveAssetSource(
  require('../../assets/icons/googleLogo.svg'),
).uri;
const naverUri = Image.resolveAssetSource(
  require('../../assets/icons/naverLogo.svg'),
).uri;
const kakaoUri = Image.resolveAssetSource(
  require('../../assets/icons/kakaoImage.svg'),
).uri;
const oauthProviders = [
  { key: 'google', uri: googleUri, size: 40, offsetX: 0 },
  { key: 'naver', uri: naverUri, size: 40, offsetX: 0 },
  { key: 'kakao', uri: kakaoUri, size: 36, offsetX: -1 },
] as const;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[!@#$%^&*]).{6,12}$/;
const phoneRegex = /^01(?:0|1|[6-9])-(?:\d{3}|\d{4})-\d{4}$/;
const VERIFICATION_COUNTDOWN_SECONDS = 10 * 60;

function inferMimeType(fileName?: string, fallback?: string): string {
  if (typeof fallback === 'string' && fallback.startsWith('image/')) return fallback;
  const lower = (fileName ?? '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

function normalizeDisplayImageUri(uri?: string): string | undefined {
  if (typeof uri !== 'string') return undefined;
  const trimmed = uri.trim();
  if (!trimmed) return undefined;
  if (/^blob:/i.test(trimmed) && Platform.OS !== 'web') return undefined;
  return trimmed;
}

const categories: CategoryOption[] = [
  { label: '소설/시/희곡', code: 'FICTION_POETRY_DRAMA' },
  { label: '에세이', code: 'ESSAY' },
  { label: '인문학', code: 'HUMANITIES' },
  { label: '사회과학', code: 'SOCIAL_SCIENCE' },
  { label: '정치/외교/국방', code: 'POLITICS_DIPLOMACY_DEFENSE' },
  { label: '경제/경영', code: 'ECONOMY_MANAGEMENT' },
  { label: '자기계발', code: 'SELF_DEVELOPMENT' },
  { label: '역사/문화', code: 'HISTORY_CULTURE' },
  { label: '과학', code: 'SCIENCE' },
  { label: '컴퓨터/IT', code: 'COMPUTER_IT' },
  { label: '예술/대중문화', code: 'ART_POP_CULTURE' },
  { label: '여행', code: 'TRAVEL' },
  { label: '외국어', code: 'FOREIGN_LANGUAGE' },
  { label: '어린이/청소년', code: 'CHILDREN_BOOKS' },
  { label: '종교/철학', code: 'RELIGION_PHILOSOPHY' },
];

const defaultProfilePalette = [
  colors.subbrown3,
  colors.primary2,
  colors.primary1,
  colors.subbrown1,
  colors.primary3,
  colors.gray2,
  colors.gray4,
  colors.gray5,
  colors.gray6,
  colors.gray7,
];

export function AuthFlowScreen({ onClose, onLoginSuccess }: Props) {
  const [step, setStep] = useState<Step>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [agreeService, setAgreeService] = useState(false);
  const [agreeCheckmo, setAgreeCheckmo] = useState(false);
  const [agreeThirdParty, setAgreeThirdParty] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [activeTermsModalKey, setActiveTermsModalKey] = useState<TermsAgreementKey | null>(null);

  const [signUpEmail, setSignUpEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [verificationDeadline, setVerificationDeadline] = useState<number | null>(null);
  const [remainingVerificationSeconds, setRemainingVerificationSeconds] = useState(0);

  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpPasswordConfirm, setSignUpPasswordConfirm] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpPasswordConfirm, setShowSignUpPasswordConfirm] = useState(false);

  const [nickname, setNickname] = useState('');
  const [nicknameChecked, setNicknameChecked] = useState<{
    value: string;
    duplicate: boolean;
  } | null>(null);
  const [checkingNickname, setCheckingNickname] = useState(false);

  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [selectedProfileImage, setSelectedProfileImage] = useState<LocalProfileImage | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [selectedProfileColor, setSelectedProfileColor] = useState(colors.subbrown3);
  const [showProfileColorModal, setShowProfileColorModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [signUpSubmitting, setSignUpSubmitting] = useState(false);
  const [findName, setFindName] = useState('');
  const [findPhoneNumber, setFindPhoneNumber] = useState('');
  const [foundEmail, setFoundEmail] = useState('');
  const [findEmailSubmitting, setFindEmailSubmitting] = useState(false);
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');
  const [sendingTempPassword, setSendingTempPassword] = useState(false);

  const canGoNextFromTerms = agreeService && agreeCheckmo;
  const allAgreed = agreeService && agreeCheckmo && agreeThirdParty && agreeMarketing;
  const isNicknameValidCheck =
    nicknameChecked &&
    nicknameChecked.value === nickname.trim() &&
    !nicknameChecked.duplicate;
  const verificationRemainingText = useMemo(() => {
    const minutes = Math.floor(remainingVerificationSeconds / 60);
    const seconds = remainingVerificationSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remainingVerificationSeconds]);
  const hideTopBrand =
    step === 'login' ||
    step === 'terms' ||
    step === 'emailVerification' ||
    step === 'passwordSet' ||
    step === 'profileBasic' ||
    step === 'profileExtra' ||
    step === 'signupComplete';
  const activeTermsModalDocument =
    activeTermsModalKey ? termsDocuments[activeTermsModalKey] : null;

  const toggleCategory = (code: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(code)) return prev.filter((item) => item !== code);
      if (prev.length >= 6) return prev;
      return [...prev, code];
    });
  };

  const toggleTermsAgreement = (key: TermsAgreementKey) => {
    switch (key) {
      case 'service':
        setAgreeService((prev) => !prev);
        break;
      case 'checkmo':
        setAgreeCheckmo((prev) => !prev);
        break;
      case 'thirdParty':
        setAgreeThirdParty((prev) => !prev);
        break;
      case 'marketing':
        setAgreeMarketing((prev) => !prev);
        break;
    }
  };

  const agreeTerms = (key: TermsAgreementKey) => {
    switch (key) {
      case 'service':
        setAgreeService(true);
        break;
      case 'checkmo':
        setAgreeCheckmo(true);
        break;
      case 'thirdParty':
        setAgreeThirdParty(true);
        break;
      case 'marketing':
        setAgreeMarketing(true);
        break;
    }
  };

  const closeTermsModal = () => setActiveTermsModalKey(null);

  const handleConfirmTermsModal = () => {
    if (!activeTermsModalKey) return;
    agreeTerms(activeTermsModalKey);
    setActiveTermsModalKey(null);
  };

  const resetSignUpFlow = () => {
    setAgreeService(false);
    setAgreeCheckmo(false);
    setAgreeThirdParty(false);
    setAgreeMarketing(false);
    setActiveTermsModalKey(null);
    setSignUpEmail('');
    setVerificationCode('');
    setVerificationSent(false);
    setEmailVerified(false);
    setVerificationDeadline(null);
    setRemainingVerificationSeconds(0);
    setSignUpPassword('');
    setSignUpPasswordConfirm('');
    setShowSignUpPassword(false);
    setShowSignUpPasswordConfirm(false);
    setNickname('');
    setNicknameChecked(null);
    setDescription('');
    setName('');
    setPhoneNumber('');
    setProfileImageUrl('');
    setSelectedProfileImage(null);
    setUploadingProfileImage(false);
    setSelectedProfileColor(colors.subbrown3);
    setShowProfileColorModal(false);
    setSelectedCategories([]);
    setSignUpSubmitting(false);
  };

  const goToLogin = () => {
    setStep('login');
    setActiveTermsModalKey(null);
    setVerificationCode('');
    setVerificationSent(false);
    setEmailVerified(false);
    setVerificationDeadline(null);
    setRemainingVerificationSeconds(0);
  };

  const startSignUp = () => {
    resetSignUpFlow();
    setStep('terms');
  };

  const completeAuthFlow = (nextToast?: string) => {
    if (nextToast) showToast(nextToast);
    if (onLoginSuccess) {
      onLoginSuccess();
      return;
    }
    onClose?.();
  };

  const handleLogin = async () => {
    const email = loginEmail.trim();
    const password = loginPassword.trim();

    if (!email || !password) {
      showToast('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoginSubmitting(true);
    try {
      await loginByEmail(email, password);
      showToast('로그인에 성공했습니다.');
      completeAuthFlow();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('로그인에 실패했습니다.');
      }
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleSendVerificationCode = async () => {
    const email = signUpEmail.trim();
    if (!emailRegex.test(email)) {
      showToast('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setSendingCode(true);
    try {
      await requestEmailVerification(email, 'SIGN_UP');
      setVerificationSent(true);
      setEmailVerified(false);
      setRemainingVerificationSeconds(VERIFICATION_COUNTDOWN_SECONDS);
      setVerificationDeadline(Date.now() + VERIFICATION_COUNTDOWN_SECONDS * 1000);
      showToast('인증번호를 발송했습니다.');
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('인증번호 발송에 실패했습니다.');
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleConfirmVerificationCode = async () => {
    const email = signUpEmail.trim();
    const code = verificationCode.trim();

    if (!verificationSent) {
      showToast('먼저 인증번호를 발송해주세요.');
      return;
    }
    if (remainingVerificationSeconds <= 0) {
      showToast('인증번호가 만료되었습니다. 인증번호를 다시 발송해주세요.');
      return;
    }
    if (!code) {
      showToast('인증번호를 입력해주세요.');
      return;
    }

    setConfirmingCode(true);
    try {
      await confirmEmailVerification(email, code);
      setEmailVerified(true);
      setVerificationDeadline(null);
      setRemainingVerificationSeconds(0);
      showToast('인증이 완료되었습니다.');
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('이메일 인증에 실패했습니다.');
      }
      setEmailVerified(false);
    } finally {
      setConfirmingCode(false);
    }
  };

  useEffect(() => {
    if (!verificationDeadline || emailVerified) return;

    const updateRemaining = () => {
      const remain = Math.max(0, Math.ceil((verificationDeadline - Date.now()) / 1000));
      setRemainingVerificationSeconds(remain);
      if (remain <= 0) {
        setVerificationDeadline(null);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [emailVerified, verificationDeadline]);

  const handlePasswordStepNext = () => {
    const password = signUpPassword.trim();
    const passwordConfirm = signUpPasswordConfirm.trim();

    if (!password || !passwordConfirm) {
      showToast('비밀번호와 비밀번호 확인을 입력해주세요.');
      return;
    }
    if (!passwordRegex.test(password)) {
      showToast('비밀번호는 6~12자, 영어 1자 이상, 특수문자 1자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      showToast('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setStep('profileBasic');
  };

  const handleCheckNickname = async () => {
    const normalized = nickname.trim();
    if (!normalized) {
      showToast('닉네임을 입력해주세요.');
      return;
    }
    if (normalized.length > 20) {
      showToast('닉네임은 최대 20자까지 가능합니다.');
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
    if (!nickname.trim()) {
      showToast('닉네임을 입력해주세요.');
      return;
    }
    if (!isNicknameValidCheck) {
      showToast('닉네임 중복 확인을 완료해주세요.');
      return;
    }
    if (!name.trim()) {
      showToast('이름을 입력해주세요.');
      return;
    }
    if (!phoneRegex.test(phoneNumber.trim())) {
      showToast('전화번호 형식을 확인해주세요. 예: 010-1234-5678');
      return;
    }
    if (description.trim().length > 40) {
      showToast('소개는 40자 이내로 입력해주세요.');
      return;
    }
    setStep('profileExtra');
  };

  const handlePickProfileImage = async () => {
    if (uploadingProfileImage) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('사진 접근 권한이 필요합니다.');
      return;
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
  };

  const handleSubmitSignUp = async () => {
    if (selectedCategories.length === 0) {
      showToast('관심 카테고리를 1개 이상 선택해주세요.');
      return;
    }

    setSignUpSubmitting(true);
    try {
      await signUpByEmail(signUpEmail.trim(), signUpPassword.trim());

      // 이메일 회원가입 직후 세션 보장을 위해 로그인까지 수행합니다.
      await loginByEmail(signUpEmail.trim(), signUpPassword.trim());

      let uploadedProfileImageUrl = profileImageUrl.trim() || undefined;
      if (selectedProfileImage?.uri) {
        setUploadingProfileImage(true);
        const contentType = inferMimeType(selectedProfileImage.fileName, selectedProfileImage.mimeType);
        const uploadMeta = await issueProfileImageUploadUrl(
          selectedProfileImage.fileName ?? `profile_${Date.now()}.jpg`,
          contentType,
        );
        if (!uploadMeta?.presignedUrl || !uploadMeta.imageUrl) {
          throw new Error('PROFILE_IMAGE_UPLOAD_URL_FAILED');
        }

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
          throw new Error('PROFILE_IMAGE_UPLOAD_FAILED');
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

      showToast('회원가입이 완료되었습니다.');
      setStep('signupComplete');
    } catch (error) {
      if (error instanceof ApiError) return;
      showToast('회원가입에 실패했습니다.');
    } finally {
      setSignUpSubmitting(false);
      setUploadingProfileImage(false);
    }
  };

  const handleFindEmail = async () => {
    const normalizedName = findName.trim();
    const normalizedPhone = findPhoneNumber.trim();

    if (!normalizedName || !normalizedPhone) {
      showToast('이름과 전화번호를 입력해주세요.');
      return;
    }
    if (!phoneRegex.test(normalizedPhone)) {
      showToast('전화번호 형식을 확인해주세요. 예: 010-1234-5678');
      return;
    }

    setFindEmailSubmitting(true);
    try {
      const email = await findEmailByNamePhone(normalizedName, normalizedPhone);
      if (!email) {
        showToast('가입된 이메일을 찾지 못했습니다.');
        return;
      }
      setFoundEmail(email);
      setStep('findIdResult');
    } catch (error) {
      if (!(error instanceof ApiError)) {
        showToast('이메일 찾기에 실패했습니다.');
      }
    } finally {
      setFindEmailSubmitting(false);
    }
  };

  const handleSendTempPassword = async () => {
    const email = resetPasswordEmail.trim();
    if (!emailRegex.test(email)) {
      showToast('올바른 이메일 형식을 입력해주세요.');
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

  const renderCard = (children: React.ReactNode) => (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!hideTopBrand ? (
            <View style={styles.topBrand}>
              <SvgUri uri={topLogoUri} width={92} height={56} />
            </View>
          ) : null}
          <View style={styles.card}>
            <View style={styles.closeRow}>
              <Pressable onPress={onClose} hitSlop={8}>
                <MaterialIcons name="close" size={30} color={colors.primary1} />
              </Pressable>
            </View>
            <View style={styles.cardHeader}>
              <SvgUri uri={logoUri} width={108} height={64} />
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  if (step === 'terms') {
    const toggleAll = () => {
      const next = !allAgreed;
      setAgreeService(next);
      setAgreeCheckmo(next);
      setAgreeThirdParty(next);
      setAgreeMarketing(next);
    };
    const termsItems: Array<{
      key: TermsAgreementKey;
      label: string;
      value: boolean;
    }> = [
      {
        key: 'service',
        label: '서비스 이용을 위한 필수 개인정보 수집·이용 동의 (필수)',
        value: agreeService,
      },
      {
        key: 'checkmo',
        label: '책모 이용약관 동의 (필수)',
        value: agreeCheckmo,
      },
      {
        key: 'thirdParty',
        label: '개인정보 제3자 제공 동의 (선택)',
        value: agreeThirdParty,
      },
      {
        key: 'marketing',
        label: '마케팅 및 이벤트 정보 수신 동의 (선택)',
        value: agreeMarketing,
      },
    ];

    return renderCard(
      <>
        <Text style={styles.title}>약관 동의</Text>
        <Text style={styles.flowStep}>1 / 6</Text>

        <View style={styles.termsBox}>
          {termsItems.map((term) => (
            <View key={term.key} style={styles.termsRow}>
              <Pressable
                style={({ pressed }) => [styles.termsDetailButton, pressed && styles.pressed]}
                onPress={() => setActiveTermsModalKey(term.key)}
              >
                <Text style={styles.termsText}>{term.label}</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={colors.gray4}
                />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.termsCheckButton, pressed && styles.pressed]}
                onPress={() => toggleTermsAgreement(term.key)}
              >
                <MaterialIcons
                  name={term.value ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={term.value ? colors.primary1 : colors.gray3}
                />
              </Pressable>
            </View>
          ))}
          <View style={styles.termsDivider} />
          <Pressable style={styles.termsRow} onPress={toggleAll}>
            <Text style={[styles.termsText, styles.termsAllText]}>전체 동의</Text>
            <MaterialIcons
              name={allAgreed ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={allAgreed ? colors.primary1 : colors.gray3}
            />
          </Pressable>
        </View>

        <Modal
          visible={activeTermsModalDocument !== null}
          transparent
          animationType="fade"
          onRequestClose={closeTermsModal}
        >
          <Pressable style={styles.termsModalOverlay} onPress={closeTermsModal}>
            <Pressable
              style={styles.termsModalCard}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.termsModalHeader}>
                <Text style={styles.termsModalTitle}>
                  {activeTermsModalDocument?.title ?? ''}
                </Text>
                <Pressable onPress={closeTermsModal} hitSlop={8}>
                  <MaterialIcons name="close" size={22} color={colors.gray5} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.termsModalBody}
                contentContainerStyle={styles.termsModalBodyContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.termsModalText}>
                  {activeTermsModalDocument?.content ?? ''}
                </Text>
              </ScrollView>

              <View style={styles.termsModalButtonRow}>
                <Pressable
                  style={({ pressed }) => [styles.secondaryButton, styles.buttonFlex, pressed && styles.pressed]}
                  onPress={closeTermsModal}
                >
                  <Text style={styles.secondaryText}>닫기</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, styles.buttonFlex, pressed && styles.pressed]}
                  onPress={handleConfirmTermsModal}
                >
                  <Text style={styles.primaryText}>동의</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={goToLogin}
          >
            <Text style={styles.secondaryText}>취소</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              styles.buttonFlex,
              !canGoNextFromTerms && styles.primaryButtonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              if (!canGoNextFromTerms) {
                showToast('필수 약관에 동의해주세요.');
                return;
              }
              setStep('emailVerification');
            }}
          >
            <Text style={styles.primaryText}>다음</Text>
          </Pressable>
        </View>
      </>,
    );
  }

  if (step === 'emailVerification') {
    return renderCard(
      <>
        <Text style={styles.title}>이메일 인증</Text>
        <Text style={styles.flowStep}>2 / 6</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            value={signUpEmail}
            onChangeText={(value) => {
              setSignUpEmail(value);
              setEmailVerified(false);
            }}
            placeholder="이메일"
            style={styles.input}
            placeholderTextColor={colors.gray3}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Pressable
            style={({ pressed }) => [styles.outlineButton, styles.actionButton, pressed && styles.pressed]}
            onPress={() => {
              void handleSendVerificationCode();
            }}
            disabled={sendingCode}
          >
            <Text style={styles.outlineText}>
              {sendingCode ? '발송 중...' : verificationSent ? '인증번호 재발송' : '인증번호 발송'}
            </Text>
          </Pressable>

          <Text style={styles.label}>인증번호</Text>
          <TextInput
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="인증번호 입력"
            style={styles.input}
            placeholderTextColor={colors.gray3}
            keyboardType="number-pad"
          />
          {verificationSent && !emailVerified ? (
            <Text
              style={[
                styles.timerText,
                remainingVerificationSeconds <= 0 ? styles.timerExpiredText : null,
              ]}
            >
              남은 시간 {verificationRemainingText}
            </Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.outlineButton,
              styles.actionButton,
              emailVerified && styles.outlineButtonActive,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void handleConfirmVerificationCode();
            }}
            disabled={confirmingCode}
          >
            <Text style={[styles.outlineText, emailVerified && styles.outlineTextActive]}>
              {confirmingCode ? '확인 중...' : emailVerified ? '인증 완료됨' : '인증 완료'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => setStep('terms')}
          >
            <Text style={styles.secondaryText}>이전</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              styles.buttonFlex,
              !emailVerified && styles.primaryButtonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              if (!emailVerified) {
                showToast('이메일 인증을 완료해주세요.');
                return;
              }
              setStep('passwordSet');
            }}
          >
            <Text style={styles.primaryText}>다음</Text>
          </Pressable>
        </View>
      </>,
    );
  }

  if (step === 'passwordSet') {
    return renderCard(
      <>
        <Text style={styles.title}>비밀번호 입력</Text>
        <Text style={styles.flowStep}>3 / 6</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>비밀번호</Text>
          <Text style={styles.helperInline}>
            비밀번호는 6~12자, 영어 최소 1자 이상, 특수문자 최소 1자 이상
          </Text>
          <View style={styles.passwordInputRow}>
            <TextInput
              value={signUpPassword}
              onChangeText={setSignUpPassword}
              placeholder="비밀번호"
              style={[styles.input, styles.passwordInput]}
              placeholderTextColor={colors.gray3}
              secureTextEntry={!showSignUpPassword}
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
            <TextInput
              value={signUpPasswordConfirm}
              onChangeText={setSignUpPasswordConfirm}
              placeholder="비밀번호 확인"
              style={[styles.input, styles.passwordInput]}
              placeholderTextColor={colors.gray3}
              secureTextEntry={!showSignUpPasswordConfirm}
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
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => setStep('emailVerification')}
          >
            <Text style={styles.secondaryText}>이전</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, styles.buttonFlex, pressed && styles.pressed]}
            onPress={handlePasswordStepNext}
          >
            <Text style={styles.primaryText}>다음</Text>
          </Pressable>
        </View>
      </>,
    );
  }

  if (step === 'profileBasic') {
    return renderCard(
      <>
        <Text style={styles.title}>프로필 설정</Text>
        <Text style={styles.flowStep}>4 / 6</Text>

        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>닉네임</Text>
            <Text style={styles.labelHint}>최대 20글자</Text>
          </View>
          <View style={styles.inlineRow}>
            <TextInput
              value={nickname}
              onChangeText={(value) => {
                setNickname(value);
                const trimmed = value.trim();
                if (nicknameChecked && nicknameChecked.value !== trimmed) {
                  setNicknameChecked(null);
                }
              }}
              placeholder="닉네임 입력해주세요"
              style={[styles.input, styles.inlineInput]}
              placeholderTextColor={colors.gray3}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={({ pressed }) => [styles.outlineButton, styles.inlineButton, pressed && styles.pressed]}
              onPress={() => {
                void handleCheckNickname();
              }}
              disabled={checkingNickname}
            >
              <Text style={styles.outlineText}>{checkingNickname ? '확인중' : '중복확인'}</Text>
            </Pressable>
          </View>
          {nicknameChecked && nicknameChecked.value === nickname.trim() ? (
            <Text
              style={[
                styles.nicknameCheckText,
                nicknameChecked.duplicate ? styles.nicknameCheckError : styles.nicknameCheckSuccess,
              ]}
            >
              {nicknameChecked.duplicate ? '이미 사용 중인 닉네임입니다.' : '사용 가능한 닉네임입니다.'}
            </Text>
          ) : null}

          <Text style={styles.label}>소개</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="40자 이내로 작성해주세요"
            style={styles.input}
            placeholderTextColor={colors.gray3}
            maxLength={40}
          />

          <Text style={styles.label}>이름</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력해주세요"
            style={styles.input}
            placeholderTextColor={colors.gray3}
          />

          <Text style={styles.label}>전화번호</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="010-0000-0000"
            style={styles.input}
            placeholderTextColor={colors.gray3}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => setStep('passwordSet')}
          >
            <Text style={styles.secondaryText}>이전</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, styles.buttonFlex, pressed && styles.pressed]}
            onPress={handleProfileBasicNext}
          >
            <Text style={styles.primaryText}>다음</Text>
          </Pressable>
        </View>
      </>,
    );
  }

  if (step === 'profileExtra') {
    const profileExtraPreviewUri = normalizeDisplayImageUri(
      selectedProfileImage?.uri ?? profileImageUrl,
    );
    return renderCard(
      <>
        <Text style={styles.title}>프로필 설정</Text>
        <Text style={styles.flowStep}>5 / 6</Text>

        <View style={styles.avatarSection}>
          <View style={styles.avatarHolder}>
            <View style={styles.avatarCircle}>
              {profileExtraPreviewUri ? (
                <Image
                  source={{ uri: profileExtraPreviewUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <MaterialIcons name="person" size={54} color={selectedProfileColor} />
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
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, styles.profileDefaultButton, pressed && styles.pressed]}
            onPress={() => {
              setProfileImageUrl('');
              setSelectedProfileImage(null);
              setShowProfileColorModal(true);
            }}
          >
            <Text style={styles.secondaryText}>기본 프로필 이미지</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>관심 카테고리 (최소 1개, 최대 6개 선택)</Text>
        <View style={styles.chipGrid}>
          {categories.map((category) => {
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
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => setStep('profileBasic')}
          >
            <Text style={styles.secondaryText}>이전</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              styles.buttonFlex,
              signUpSubmitting && styles.primaryButtonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void handleSubmitSignUp();
            }}
            disabled={signUpSubmitting}
          >
            <Text style={styles.primaryText}>{signUpSubmitting ? '처리 중...' : '다음'}</Text>
          </Pressable>
        </View>

        <Modal
          visible={showProfileColorModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProfileColorModal(false)}
        >
          <Pressable
            style={styles.profileColorModalOverlay}
            onPress={() => setShowProfileColorModal(false)}
          >
            <Pressable
              style={styles.profileColorModalCard}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.profileColorModalTitle}>원하시는 색상을 선택해주세요.</Text>
              <View style={styles.profileColorGrid}>
                {defaultProfilePalette.map((color) => {
                  const selected = selectedProfileColor === color;
                  return (
                    <Pressable
                      key={color}
                      style={[
                        styles.profileColorOption,
                        selected ? styles.profileColorOptionSelected : null,
                      ]}
                      onPress={() => {
                        setSelectedProfileColor(color);
                        setProfileImageUrl('');
                        setSelectedProfileImage(null);
                        setShowProfileColorModal(false);
                      }}
                    >
                      <MaterialIcons name="person" size={40} color={color} />
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </>,
    );
  }

  if (step === 'signupComplete') {
    const signupCompleteProfileUri = normalizeDisplayImageUri(profileImageUrl);
    return renderCard(
      <>
        <Text style={styles.title}>회원이 되신 것을 환영합니다!</Text>
        <Text style={styles.flowStep}>6 / 6</Text>
        <Text style={styles.completeSubLabel}>참여중인 독서 모임이 있으신가요?</Text>

        <View style={styles.completeProfileCard}>
          <View style={styles.completeAvatarCircle}>
            {signupCompleteProfileUri ? (
              <Image source={{ uri: signupCompleteProfileUri }} style={styles.completeAvatarImage} />
            ) : (
              <MaterialIcons name="person" size={54} color={selectedProfileColor} />
            )}
          </View>
          <Text style={styles.completeNickname}>{nickname || '닉네임'}</Text>
          <Text style={styles.completeDescription}>
            {description.trim().length > 0 ? description : '안녕하세요. 반갑습니다.'}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => completeAuthFlow('모임 탭에서 모임을 탐색해보세요.')}
        >
          <Text style={styles.primaryText}>모임 검색하기</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => completeAuthFlow('모임 탭에서 모임을 생성할 수 있습니다.')}
        >
          <Text style={styles.primaryText}>모임 생성하기</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={() => completeAuthFlow()}
        >
          <Text style={styles.secondaryText}>모임 없이 이용하기</Text>
        </Pressable>
      </>,
    );
  }

  if (step === 'findId') {
    return renderCard(
      <>
        <Text style={styles.title}>아이디{'\n'}(이메일 찾기)</Text>
        <Text style={styles.subLabel}>이름과 전화번호를 입력해주세요</Text>
        <View style={styles.formGroup}>
          <TextInput
            value={findName}
            onChangeText={setFindName}
            placeholder="이름"
            style={styles.input}
            placeholderTextColor={colors.gray3}
          />
          <TextInput
            value={findPhoneNumber}
            onChangeText={setFindPhoneNumber}
            placeholder="전화번호"
            style={styles.input}
            placeholderTextColor={colors.gray3}
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={goToLogin}
          >
            <Text style={styles.secondaryText}>뒤로가기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, styles.buttonFlex, pressed && styles.pressed]}
            onPress={() => {
              void handleFindEmail();
            }}
            disabled={findEmailSubmitting}
          >
            <Text style={styles.primaryText}>
              {findEmailSubmitting ? '조회 중...' : '아이디 찾기'}
            </Text>
          </Pressable>
        </View>
      </>,
    );
  }

  if (step === 'findIdResult') {
    return renderCard(
      <>
        <Text style={styles.title}>아이디{'\n'}(이메일 찾기)</Text>
        <Text style={styles.subLabel}>해당 정보의 이메일은 다음과 같습니다.</Text>
        <View style={styles.formGroup}>
          <TextInput value={foundEmail || '-'} style={styles.input} editable={false} />
        </View>
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={goToLogin}
          >
            <Text style={styles.secondaryText}>뒤로가기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, styles.buttonFlex, pressed && styles.pressed]}
            onPress={() => setStep('findId')}
          >
            <Text style={styles.primaryText}>아이디 찾기</Text>
          </Pressable>
        </View>
      </>,
    );
  }

  if (step === 'resetPw') {
    return renderCard(
      <>
        <Text style={styles.title}>비밀번호 재발급</Text>
        <Text style={styles.subLabel}>이메일을 입력해주세요</Text>
        <View style={styles.formGroup}>
          <TextInput
            value={resetPasswordEmail}
            onChangeText={setResetPasswordEmail}
            placeholder="이메일"
            style={styles.input}
            placeholderTextColor={colors.gray3}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={goToLogin}
          >
            <Text style={styles.secondaryText}>뒤로가기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, styles.buttonFlex, pressed && styles.pressed]}
            onPress={() => {
              void handleSendTempPassword();
            }}
            disabled={sendingTempPassword}
          >
            <Text style={styles.primaryText}>
              {sendingTempPassword ? '발송 중...' : '임시 비밀번호 발송'}
            </Text>
          </Pressable>
        </View>
      </>,
    );
  }

  return renderCard(
    <>
      <Text style={styles.title}>로그인</Text>
      <View style={styles.formGroup}>
        <TextInput
          value={loginEmail}
          onChangeText={setLoginEmail}
          placeholder="이메일"
          style={styles.input}
          placeholderTextColor={colors.gray3}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <TextInput
          value={loginPassword}
          onChangeText={setLoginPassword}
          placeholder="비밀번호"
          style={styles.input}
          placeholderTextColor={colors.gray3}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={() => {
            void handleLogin();
          }}
        />
      </View>
      <View style={styles.inlineLinks}>
        <Pressable onPress={() => setStep('findId')}>
          <Text style={styles.linkText}>아이디 찾기</Text>
        </Pressable>
        <View style={styles.linkDivider} />
        <Pressable onPress={() => setStep('resetPw')}>
          <Text style={styles.linkText}>비밀번호 찾기</Text>
        </Pressable>
      </View>
      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        onPress={() => {
          void handleLogin();
        }}
        disabled={loginSubmitting}
      >
        <Text style={styles.primaryText}>{loginSubmitting ? '로그인 중...' : '로그인'}</Text>
      </Pressable>
      <View style={styles.oauthRow}>
        {oauthProviders.map(provider => (
          <Pressable
            key={provider.key}
            style={({ pressed }) => [styles.oauthBtn, pressed && styles.pressed]}
            onPress={() => showToast('소셜 로그인은 준비 중입니다.')}
          >
            <View
              style={[
                styles.oauthIconWrap,
                provider.offsetX !== 0 && { transform: [{ translateX: provider.offsetX }] },
              ]}
            >
              <SvgUri uri={provider.uri} width={provider.size} height={provider.size} />
            </View>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={startSignUp}>
        <Text style={styles.linkText}>아직 회원이 아니신가요? 회원가입하러가기</Text>
      </Pressable>
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
  closeRow: {
    alignItems: 'flex-end',
    minHeight: 24,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsModalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '82%',
    borderRadius: radius.lg,
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
    flexGrow: 0,
  },
  termsModalBodyContent: {
    paddingBottom: spacing.xs,
  },
  termsModalText: {
    ...typography.body2_3,
    color: colors.gray6,
    lineHeight: 22,
  },
  termsModalButtonRow: {
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
  helperInline: {
    ...typography.body2_3,
    color: colors.gray4,
    marginTop: -spacing.xs / 2,
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
  profileDefaultButton: {
    alignSelf: 'center',
  },
  nicknameCheckText: {
    ...typography.body2_3,
    marginTop: -spacing.xs / 2,
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
    alignSelf: 'flex-end',
    marginTop: -spacing.xs / 2,
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
  profileColorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileColorModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  profileColorModalTitle: {
    ...typography.subhead2,
    color: colors.gray6,
  },
  profileColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  profileColorOption: {
    width: '19%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.subbrown3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  profileColorOptionSelected: {
    borderColor: colors.primary1,
    borderWidth: 2,
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
  },
  buttonFlex: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: colors.gray2,
  },
  primaryText: {
    ...typography.body1_2,
    color: colors.white,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  secondaryText: {
    ...typography.body1_2,
    color: colors.gray6,
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
  outlineText: {
    ...typography.body2_2,
    color: colors.primary1,
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
  oauthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  oauthBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray2,
  },
  oauthIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
