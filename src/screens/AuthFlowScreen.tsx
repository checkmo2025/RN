import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';

import { colors, radius, spacing, typography } from '../theme';

type Step =
  | 'login'
  | 'findId'
  | 'findIdResult'
  | 'resetPw'
  | 'terms'
  | 'passwordSet'
  | 'interests'
  | 'profileSelect'
  | 'profileForm';

const logoUri = require('../../assets/mobile-header-logo.svg');

export function AuthFlowScreen() {
  const [step, setStep] = useState<Step>('login');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = useMemo(
    () => ['소설/시/희곡', '에세이', '인문학', '과학', '경제/경영', '사회/시사', '역사/문화'],
    [],
  );

  const toggleCategory = (c: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(c)) return prev.filter((x) => x !== c);
      if (prev.length >= 6) return prev;
      return [...prev, c];
    });
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
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <SvgUri uri={logoUri as any} width={96} height={48} />
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  if (step === 'interests') {
    return renderCard(
      <>
        <Text style={styles.title}>관심 카테고리</Text>
        <Text style={styles.subLabel}>(최소 1개, 최대 6개 선택)</Text>
        <View style={styles.chipGrid}>
          {categories.map((c) => {
            const active = selectedCategories.includes(c);
            return (
              <Pressable
                key={c}
                onPress={() => toggleCategory(c)}
                style={({ pressed }) => [
                  styles.chip,
                  active ? styles.chipActive : null,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => setStep('terms')}
        >
          <Text style={styles.primaryText}>다음</Text>
        </Pressable>
      </>,
    );
  }

  if (step === 'terms') {
    return renderCard(
      <>
        <Text style={styles.title}>약관 동의</Text>
        <View style={styles.termsBox}>
          {['서비스 이용약관 (필수)', '책모 이용약관 (필수)', '개인정보 제3자 제공 동의 (선택)', '마케팅 정보 수신 동의 (선택)'].map(
            (t, idx) => (
              <View key={t} style={styles.termsRow}>
                <View style={styles.checkMock}>{idx < 3 ? <Text style={styles.checkMark}>✓</Text> : null}</View>
                <Text style={styles.termsText}>{t}</Text>
              </View>
            ),
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => setStep('passwordSet')}
        >
          <Text style={styles.primaryText}>다음</Text>
        </Pressable>
      </>,
    );
  }

  if (step === 'passwordSet') {
    return renderCard(
      <>
        <Text style={styles.title}>약관 동의</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>비밀번호</Text>
          <TextInput placeholder="비밀번호" style={styles.input} placeholderTextColor={colors.gray3} secureTextEntry />
          <TextInput placeholder="비밀번호 확인" style={styles.input} placeholderTextColor={colors.gray3} secureTextEntry />
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => setStep('profileSelect')}
        >
          <Text style={styles.primaryText}>다음</Text>
        </Pressable>
      </>,
    );
  }

  if (step === 'profileSelect') {
    return renderCard(
      <>
        <Text style={styles.title}>프로필 선택</Text>
        <View style={styles.avatarHolder}>
          <View style={styles.avatarCircle} />
          <Pressable style={({ pressed }) => [styles.editBadge, pressed && styles.pressed]}>
            <Text style={styles.editBadgeText}>✎</Text>
          </Pressable>
        </View>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={() => {}}
        >
          <Text style={styles.secondaryText}>기본 프로필 이미지</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => setStep('profileForm')}
        >
          <Text style={styles.primaryText}>다음</Text>
        </Pressable>
      </>,
    );
  }

  if (step === 'profileForm') {
    return renderCard(
      <>
        <Text style={styles.title}>프로필 설정</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>닉네임</Text>
          <View style={styles.inlineRow}>
            <TextInput
              placeholder="(최대 20글자)"
              style={[styles.input, styles.inlineInput]}
              placeholderTextColor={colors.gray3}
            />
            <Pressable style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
              <Text style={styles.outlineText}>중복확인</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>소개</Text>
          <TextInput placeholder="40자 이내로 작성해주세요" style={styles.input} placeholderTextColor={colors.gray3} />
          <Text style={styles.label}>이름</Text>
          <TextInput placeholder="이름을 입력해주세요" style={styles.input} placeholderTextColor={colors.gray3} />
          <Text style={styles.label}>전화번호</Text>
          <TextInput placeholder="010-0000-0000" style={styles.input} placeholderTextColor={colors.gray3} />
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => {}}
        >
          <Text style={styles.primaryText}>다음</Text>
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
          <TextInput placeholder="이름" style={styles.input} placeholderTextColor={colors.gray3} />
          <TextInput placeholder="전화번호" style={styles.input} placeholderTextColor={colors.gray3} />
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => setStep('login')}>
            <Text style={styles.secondaryText}>뒤로가기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, styles.buttonFlex]}
            onPress={() => setStep('findIdResult')}
          >
            <Text style={styles.primaryText}>아이디 찾기</Text>
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
          <TextInput value="yhi****@gmail.com" style={styles.input} editable={false} />
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => setStep('login')}>
            <Text style={styles.secondaryText}>뒤로가기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, styles.buttonFlex]}
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
          <TextInput value="yhi****@gmail.com" style={styles.input} />
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => setStep('login')}>
            <Text style={styles.secondaryText}>뒤로가기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, styles.buttonFlex]}
            onPress={() => {}}
          >
            <Text style={styles.primaryText}>아이디 찾기</Text>
          </Pressable>
        </View>
      </>,
    );
  }

  // login default
  return renderCard(
    <>
      <Text style={styles.title}>로그인</Text>
      <View style={styles.formGroup}>
        <TextInput placeholder="아이디" style={styles.input} placeholderTextColor={colors.gray3} />
        <TextInput placeholder="비밀번호" style={styles.input} placeholderTextColor={colors.gray3} secureTextEntry />
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
        onPress={() => setStep('interests')}
      >
        <Text style={styles.primaryText}>로그인</Text>
      </Pressable>
      <View style={styles.oauthRow}>
        {['G', 'N', 'K'].map((p) => (
          <Pressable key={p} style={({ pressed }) => [styles.oauthBtn, pressed && styles.pressed]}>
            <Text style={styles.oauthText}>{p}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => setStep('interests')}>
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
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    minHeight: 520,
    elevation: 4,
  },
  cardHeader: {
    alignItems: 'center',
  },
  title: {
    ...typography.subhead2,
    color: colors.primary1,
    textAlign: 'center',
  },
  subLabel: {
    ...typography.body2_3,
    color: colors.gray5,
    textAlign: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
    ...typography.body1_3,
    color: colors.gray6,
  },
  chipTextActive: {
    color: colors.primary1,
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
    gap: spacing.sm,
  },
  checkMock: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: colors.primary1,
  },
  termsText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  formGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...typography.body1_3,
    color: colors.gray6,
    backgroundColor: colors.white,
  },
  primaryButton: {
    backgroundColor: colors.primary1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    ...typography.body1_2,
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray2,
    paddingHorizontal: spacing.lg,
  },
  secondaryText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
  },
  outlineButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
  },
  outlineText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  avatarHolder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray2,
  },
  editBadge: {
    position: 'absolute',
    bottom: 8,
    right: '30%',
    backgroundColor: colors.primary1,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadgeText: {
    ...typography.body1_2,
    color: colors.white,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  inlineLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkText: {
    ...typography.body2_3,
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
    gap: spacing.sm,
  },
  oauthBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  oauthText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  pressed: {
    opacity: 0.7,
  },
});
