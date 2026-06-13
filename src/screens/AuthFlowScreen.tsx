import { useCallback, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { inferMimeType } from '../utils/imageUpload';
import { PUBLIC_ENV } from '../constants/publicEnv';
import { termsDocuments, type TermsAgreementKey } from '../constants/termsDocuments';
import { INPUT_LIMITS } from '../constants/inputLimits';
import { LOGO_PRIMARY_URI, MOBILE_HEADER_LOGO_URI } from '../constants/iconMap';
import { emailRegex, passwordRegex, phoneRegex, nicknameRegex } from '../constants/validation';
import { colors, interactionOpacity, radius, spacing, typography } from '../theme';
import { AppButton } from '../components/common/PrimaryButton';
import { DialogOverlay } from '../components/common/DialogOverlay';
import { FeedbackPressable as Pressable } from '../components/common/FeedbackPressable';
import { FormTextInput } from '../components/common/FormTextInput';
import {
  checkNicknameDuplicate,
  findEmailByNamePhone,
  loginByIdentifier,
  issueProfileImageUploadUrl,
  sendTemporaryPassword,
  signUpByEmail,
  submitAdditionalInfo,
} from '../services/api/authApi';
import { ApiError } from '../services/api/http';
import { showToast } from '../utils/toast';
import { CATEGORY_OPTIONS } from '../constants/domain/category';
import { useEmailVerificationFlow } from '../hooks/useEmailVerificationFlow';

declare const __DEV__: boolean;

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

type LocalProfileImage = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

const logoUri = LOGO_PRIMARY_URI;
const topLogoUri = MOBILE_HEADER_LOGO_URI;


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



export function AuthFlowScreen({ onClose, onLoginSuccess }: Props) {
  const ev = useEmailVerificationFlow();
  const [step, setStep] = useState<Step>('login');
  const [signUpUiPreview, setSignUpUiPreview] = useState(false);
  const [emailResetConfirmVisible, setEmailResetConfirmVisible] = useState(false);
  const [exitSignupConfirmVisible, setExitSignupConfirmVisible] = useState(false);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [agreeService, setAgreeService] = useState(false);
  const [agreeCheckmo, setAgreeCheckmo] = useState(false);
  const [agreeThirdParty, setAgreeThirdParty] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [activeTermsModalKey, setActiveTermsModalKey] = useState<TermsAgreementKey | null>(null);

  const [signUpEmail, setSignUpEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpPasswordConfirm, setSignUpPasswordConfirm] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpPasswordConfirm, setShowSignUpPasswordConfirm] = useState(false);

  const [nickname, setNickname] = useState('');
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
  const [defaultProfileConfirmVisible, setDefaultProfileConfirmVisible] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

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
    setSignUpUiPreview(false);
    setEmailResetConfirmVisible(false);
    setAgreeService(false);
    setAgreeCheckmo(false);
    setAgreeThirdParty(false);
    setAgreeMarketing(false);
    setActiveTermsModalKey(null);
    setSignUpEmail('');
    setVerificationCode('');
    ev.reset();
    setSignUpPassword('');
    setSignUpPasswordConfirm('');
    setShowSignUpPassword(false);
    setShowSignUpPasswordConfirm(false);
    setNickname('');
    setNicknameChecked(null);
    setNicknameLengthExceeded(false);
    setDescription('');
    setName('');
    setPhoneNumber('');
    setProfileImageUrl('');
    setSelectedProfileImage(null);
    setDefaultProfileConfirmVisible(false);
    setUploadingProfileImage(false);

    setSelectedCategories([]);
    setSignUpSubmitting(false);
  };

  const goToLogin = () => {
    setSignUpUiPreview(false);
    setEmailResetConfirmVisible(false);
    setDefaultProfileConfirmVisible(false);
    setStep('login');
    setActiveTermsModalKey(null);
    setVerificationCode('');
    ev.reset();
  };

  const startSignUp = () => {
    resetSignUpFlow();
    setStep('terms');
  };

  const openSignUpUiPreview = () => {
    resetSignUpFlow();
    setSignUpUiPreview(true);
    setAgreeService(true);
    setAgreeCheckmo(true);
    setAgreeThirdParty(true);
    setAgreeMarketing(true);
    setSignUpEmail('dev-checkmo@example.com');
    setSignUpPassword('checkmo!');
    setSignUpPasswordConfirm('checkmo!');
    setNickname('bookbook');
    setNicknameChecked({ value: 'bookbook', duplicate: false });
    setNicknameLengthExceeded(false);
    setDescription('안녕하세요');
    setName('홍길동');
    setPhoneNumber('010-1234-5678');
    setSelectedCategories(CATEGORY_OPTIONS.slice(0, 2).map((category) => category.code));
    setStep('emailVerification');
  };

  const completeAuthFlow = useCallback((nextToast?: string) => {
    if (nextToast) showToast(nextToast);
    if (onLoginSuccess) {
      onLoginSuccess();
      return;
    }
    onClose?.();
  }, [onClose, onLoginSuccess]);

  const handleLogin = async () => {
    const identifier = loginIdentifier.trim();
    const password = loginPassword.trim();

    if (!identifier || !password) {
      showToast('아이디(이메일/닉네임)와 비밀번호를 입력해야 합니다.');
      return;
    }

    setLoginSubmitting(true);
    try {
      await loginByIdentifier(identifier, password);
      showToast('로그인에 성공했습니다.');
      completeAuthFlow();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : '로그인에 실패했습니다.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (ev.verified) return;
    const email = signUpEmail.trim();
    if (!emailRegex.test(email)) {
      showToast('올바른 이메일 형식이어야 합니다.');
      return;
    }
    if (__DEV__ && signUpUiPreview) {
      ev.startLocalVerification('개발용 인증은 임의의 6자리 숫자로 진행할 수 있습니다.');
      return;
    }
    await ev.sendCode(email, 'SIGN_UP');
  };

  const handleConfirmVerificationCode = async () => {
    const email = signUpEmail.trim();
    const code = verificationCode.trim();
    if (__DEV__ && signUpUiPreview) {
      if (/^\d{6}$/.test(code)) {
        ev.verifyLocally();
      } else {
        showToast('인증 코드가 일치하지 않습니다.');
      }
      return;
    }
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
    const nextNickname = value.slice(0, INPUT_LIMITS.NICKNAME);
    setNicknameLengthExceeded(value.length > INPUT_LIMITS.NICKNAME);
    setNickname(nextNickname);
    const trimmed = nextNickname.trim();
    if (nicknameChecked && nicknameChecked.value !== trimmed) {
      setNicknameChecked(null);
    }
  };

  const resetEmailVerificationStep = () => {
    setSignUpEmail('');
    setVerificationCode('');
    ev.reset();
    setEmailResetConfirmVisible(false);
  };

  const handlePasswordStepNext = () => {
    const password = signUpPassword.trim();
    const passwordConfirm = signUpPasswordConfirm.trim();

    if (!password || !passwordConfirm) {
      showToast('비밀번호와 비밀번호 확인을 입력해야 합니다.');
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

  const useDefaultProfileImage = () => {
    setProfileImageUrl('');
    setSelectedProfileImage(null);
    setDefaultProfileConfirmVisible(false);
  };

  const handleSubmitSignUp = async () => {
    if (selectedCategories.length === 0) {
      showToast('관심 카테고리를 1개 이상 선택해야 합니다.');
      return;
    }

    if (__DEV__ && signUpUiPreview) {
      setProfileImageUrl(selectedProfileImage?.uri ?? profileImageUrl.trim());
      showToast('회원가입에 성공했습니다');
      setStep('signupComplete');
      return;
    }

    const normalizedEmail = signUpEmail.trim();
    const normalizedPassword = signUpPassword.trim();
    setSignUpSubmitting(true);
    let signUpCreatedNow = false;
    let resumedFromExistingAccount = false;
    let loginCompleted = false;

    try {
      try {
        await signUpByEmail(normalizedEmail, normalizedPassword, { suppressErrorToast: true });
        signUpCreatedNow = true;
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw error;
        }
        if (error.status !== 409) {
          showToast(error.message || '회원가입에 실패했습니다.');
          return;
        }
        // 이전 시도에서 계정이 생성된 케이스를 고려해 로그인 단계부터 이어서 진행합니다.
        resumedFromExistingAccount = true;
      }

      try {
        // 이메일 회원가입 직후 세션 보장을 위해 로그인까지 수행합니다.
        await loginByIdentifier(normalizedEmail, normalizedPassword, {
          suppressErrorToast: resumedFromExistingAccount,
        });
        loginCompleted = true;
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

      showToast('회원가입에 성공했습니다');
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
      confirmClose?: boolean;
    },
  ) => (
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
              <SvgUri uri={topLogoUri} width={92} height={56} />
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
                  accessibilityLabel="뒤로가기"
                  style={({ pressed }) => [styles.cardTopBackButton, pressed && styles.pressed]}
                >
                  <MaterialIcons name="arrow-back-ios-new" size={20} color={colors.primary1} />
                </Pressable>
              ) : null}
              {!options?.hideClose ? (
                <Pressable
                  onPress={options?.confirmClose ? () => setExitSignupConfirmVisible(true) : onClose}
                  hitSlop={8}
                >
                  <MaterialIcons name="close" size={30} color={colors.primary1} />
                </Pressable>
              ) : null}
            </View>
            {options?.confirmClose ? (
              <DialogOverlay
                visible={exitSignupConfirmVisible}
                onClose={() => setExitSignupConfirmVisible(false)}
                overlayStyle={styles.confirmModalOverlay}
                cardStyle={styles.confirmModalCard}
              >
                <Text style={styles.confirmModalTitle}>
                  나가시겠습니까?{'\n'}현재 저장된 정보가 사라집니다.
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

        <DialogOverlay
          visible={activeTermsModalDocument !== null}
          onClose={closeTermsModal}
          overlayStyle={styles.termsModalOverlay}
          cardStyle={styles.termsModalCard}
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
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <Text style={styles.termsModalText}>
              {activeTermsModalDocument?.content ?? ''}
            </Text>
          </ScrollView>

          <View style={styles.termsModalButtonRow}>
            <AppButton variant="secondary" label="닫기" onPress={closeTermsModal} size="lg" fullWidth />
            <AppButton label="동의" onPress={handleConfirmTermsModal} size="lg" fullWidth />
          </View>
        </DialogOverlay>

        <View style={styles.buttonRow}>
          <AppButton variant="secondary" label="취소" onPress={goToLogin} />
          <AppButton
            label="다음"
            fullWidth
            disabled={!canGoNextFromTerms}
            onPress={() => {
              if (!canGoNextFromTerms) {
                showToast('필수 약관에 동의해야 합니다.');
                return;
              }
              setStep('emailVerification');
            }}
          />
        </View>
      </>,
      { equalHeight: 'sm', confirmClose: true },
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
        <Text style={styles.title}>이메일 인증</Text>
        <Text style={styles.flowStep}>2 / 6</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>이메일</Text>
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
              {ev.sending ? '발송 중...' : ev.sent ? '인증번호 재발송' : '인증번호 발송'}
            </Text>
          </Pressable>

          <View style={styles.verificationLabelRow}>
            <Text style={styles.label}>인증번호</Text>
            {ev.sent && !ev.verified ? (
              <Text
                style={[
                  styles.timerText,
                  ev.remainingSeconds <= 0 ? styles.timerExpiredText : null,
                ]}
              >
                남은 시간 {ev.remainingText}
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
                {ev.confirming ? '확인 중...' : ev.verified ? '인증 완료되었습니다' : '인증하기'}
              </Text>
            </Pressable>
            {ev.verified ? (
              <Pressable
                style={({ pressed }) => [styles.outlineButton, styles.actionButton, pressed && styles.pressed]}
                onPress={() => setEmailResetConfirmVisible(true)}
              >
                <Text style={styles.outlineText}>초기화</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <DialogOverlay
          visible={emailResetConfirmVisible}
          onClose={() => setEmailResetConfirmVisible(false)}
          overlayStyle={styles.confirmModalOverlay}
          cardStyle={styles.confirmModalCard}
        >
          <Text style={styles.confirmModalTitle}>
            이메일 인증을 다시 진행하시겠습니까?
          </Text>
          <View style={styles.confirmModalButtonRow}>
            <AppButton
              variant="secondary"
              label="취소"
              onPress={() => setEmailResetConfirmVisible(false)}
              size="lg"
              fullWidth
            />
            <AppButton
              label="초기화"
              onPress={resetEmailVerificationStep}
              size="lg"
              fullWidth
            />
          </View>
        </DialogOverlay>

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
        <Text style={styles.title}>비밀번호 입력</Text>
        <Text style={styles.flowStep}>3 / 6</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>비밀번호</Text>
          <Text style={styles.helperInline}>
            비밀번호는 6~12자, 영어 최소 1자 이상, 특수문자 최소 1자 이상
          </Text>
          <View style={styles.passwordInputRow}>
            <FormTextInput
              value={signUpPassword}
              onChangeText={setSignUpPassword}
              placeholder="비밀번호"
              style={[styles.input, styles.inputDescenderSafe, styles.passwordInput]}
              placeholderTextColor={colors.gray3}
              fieldType="password"
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
            <FormTextInput
              value={signUpPasswordConfirm}
              onChangeText={setSignUpPasswordConfirm}
              placeholder="비밀번호 확인"
              style={[styles.input, styles.inputDescenderSafe, styles.passwordInput]}
              placeholderTextColor={colors.gray3}
              fieldType="password"
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
          <AppButton variant="secondary" label="이전" onPress={() => setStep('emailVerification')} />
          <AppButton label="다음" fullWidth onPress={handlePasswordStepNext} />
        </View>
      </>,
      { equalHeight: 'sm', confirmClose: true },
    );
  }

  if (step === 'profileBasic') {
    const nicknameFormatError = resolveNicknameFormatError(nickname);

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
              <Text style={styles.outlineText}>{checkingNickname ? '확인 중' : '중복확인'}</Text>
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
          {nicknameFormatError ? (
            <Text style={[styles.nicknameCheckText, styles.nicknameCheckError]}>
              {nicknameFormatError}
            </Text>
          ) : null}
          {nicknameLengthExceeded ? (
            <Text style={[styles.nicknameCheckText, styles.nicknameCheckError]}>
              닉네임은 최대 20글자까지 입력할 수 있습니다.
            </Text>
          ) : null}

          <View style={styles.descriptionFieldGroup}>
            <View style={styles.descriptionLabelRow}>
              <Text style={styles.label}>소개</Text>
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

          <Text style={styles.label}>이름</Text>
          <FormTextInput
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력해주세요"
            style={[styles.input, styles.inputDescenderSafe]}
            placeholderTextColor={colors.gray3}
            fieldType="name"
            maxLength={INPUT_LIMITS.USER_NAME}
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>전화번호</Text>
            <Text style={styles.labelHint}>(아이디 찾기용)</Text>
          </View>
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
          <AppButton variant="secondary" label="이전" onPress={() => setStep('passwordSet')} />
          <AppButton label="다음" fullWidth onPress={handleProfileBasicNext} />
        </View>
      </>,
      { equalHeight: 'lg' },
    );
  }

  if (step === 'profileExtra') {
    const profileExtraPreviewUri = normalizeDisplayImageUri(
      selectedProfileImage?.uri ?? profileImageUrl,
    );
    const defaultProfileSelected = !profileExtraPreviewUri;
    return renderCard(
      <>
        <Text style={styles.title}>프로필 설정</Text>
        <Text style={styles.flowStep}>5 / 6</Text>

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
                <MaterialIcons name="person" size={54} color={colors.subbrown3} />
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
            onPress={() => setDefaultProfileConfirmVisible(true)}
          />
        </View>

        <DialogOverlay
          visible={defaultProfileConfirmVisible}
          onClose={() => setDefaultProfileConfirmVisible(false)}
          overlayStyle={styles.confirmModalOverlay}
          cardStyle={styles.confirmModalCard}
        >
          <Text style={styles.confirmModalTitle}>
            기본프로필 이미지를 사용하시겠습니까?
          </Text>
          <View style={styles.confirmModalButtonRow}>
            <AppButton
              variant="secondary"
              label="취소"
              onPress={() => setDefaultProfileConfirmVisible(false)}
              size="lg"
              fullWidth
            />
            <AppButton
              label="확인"
              onPress={useDefaultProfileImage}
              size="lg"
              fullWidth
            />
          </View>
        </DialogOverlay>

        <Text style={styles.label}>관심 카테고리 (최소 1개, 최대 6개 선택)</Text>
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
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.buttonRow}>
          <AppButton variant="secondary" label="이전" onPress={() => setStep('profileBasic')} />
          <AppButton
            label="다음"
            fullWidth
            loading={signUpSubmitting}
            loadingLabel="처리 중..."
            onPress={() => { void handleSubmitSignUp(); }}
          />
        </View>
      </>,
      { equalHeight: 'lg' },
    );
  }

  if (step === 'signupComplete') {
    const signupCompleteProfileUri = normalizeDisplayImageUri(profileImageUrl);
    return renderCard(
      <>
        <Text style={[styles.flowStep, { marginTop: 0 }]}>6 / 6</Text>
        <Text style={styles.title}>회원이 되신 것을 환영합니다!</Text>

        <View style={styles.completeProfileCard}>
          <View style={styles.completeAvatarCircle}>
            {signupCompleteProfileUri ? (
              <Image source={{ uri: signupCompleteProfileUri }} style={styles.completeAvatarImage} />
            ) : (
              <MaterialIcons name="person" size={54} color={colors.subbrown3} />
            )}
          </View>
          <Text style={styles.completeNickname}>{nickname || '닉네임'}</Text>
          <Text style={styles.completeDescription}>
            {description.trim().length > 0 ? description : '안녕하세요. 반갑습니다.'}
          </Text>
        </View>

        <Text style={[styles.completeSubLabel, { marginTop: spacing.lg }]}>참여중인 독서 모임이 있으신가요?</Text>

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
        <Text style={styles.title}>아이디{'\n'}(이메일 찾기)</Text>
        <Text style={styles.subLabel}>이름과 전화번호를 입력해주세요</Text>
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
        <Text style={styles.title}>아이디{'\n'}(이메일 찾기)</Text>
        <Text style={styles.subLabel}>해당 정보의 이메일은 다음과 같습니다.</Text>
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
        <Text style={styles.title}>비밀번호 재발급</Text>
        <Text style={styles.subLabel}>이메일을 입력해주세요</Text>
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
      <Text style={styles.title}>로그인</Text>
      <View style={styles.formGroup}>
        <FormTextInput
          value={loginIdentifier}
          onChangeText={setLoginIdentifier}
          placeholder="아이디(이메일/닉네임)"
          style={[styles.input, styles.inputDescenderSafe]}
          placeholderTextColor={colors.gray3}
          fieldType="nickname"
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
          <Text style={styles.linkText}>아이디 찾기</Text>
        </Pressable>
        <View style={styles.linkDivider} />
        <Pressable onPress={() => setStep('resetPw')}>
          <Text style={styles.linkText}>비밀번호 찾기</Text>
        </Pressable>
      </View>
      <AppButton
        label="로그인"
        loading={loginSubmitting}
        loadingLabel="로그인 중..."
        onPress={() => { void handleLogin(); }}
      />
      <View style={styles.signUpActionRow}>
        <Pressable onPress={startSignUp}>
          <Text style={styles.linkText}>아직 회원이 아니신가요? 회원가입하러가기</Text>
        </Pressable>
        {__DEV__ ? (
          <Pressable
            style={({ pressed }) => [styles.devPreviewButton, pressed && styles.pressed]}
            onPress={openSignUpUiPreview}
          >
            <Text style={styles.devPreviewButtonText}>UI 보기(개발용)</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={() => Linking.openURL(PUBLIC_ENV.SUPPORT_FORM_URL).catch(() => null)}>
        <Text style={styles.linkText}>고객센터/문의하기</Text>
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
    height: '82%',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
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
  signUpActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  linkText: {
    ...typography.body1_3,
    color: colors.gray5,
    textDecorationLine: 'underline',
  },
  devPreviewButton: {
    borderWidth: 1,
    borderColor: colors.primary1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.white,
  },
  devPreviewButtonText: {
    ...typography.body2_3,
    color: colors.primary1,
  },
  linkDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.gray3,
  },
  pressed: {
    opacity: interactionOpacity.pressed,
  },
});
