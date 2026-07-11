import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import { AppButton } from './PrimaryButton';
import { ToastHost } from './ToastHost';
import type { AppVersionGateState } from '../../hooks/useAppVersionGate';
import { useLanguage } from '../../contexts/LanguageContext';

const noop = () => undefined;

type Props = {
  state: AppVersionGateState;
  onOpenStore: () => void;
  onDismissRecommendation: () => void;
};

export function AppUpdateGateModal({
  state,
  onOpenStore,
  onDismissRecommendation,
}: Props) {
  const { l } = useLanguage();
  const visible = state.status === 'force' || state.status === 'recommend';
  const isForce = state.status === 'force';
  const policy = visible ? state.policy : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isForce ? noop : onDismissRecommendation}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>UPDATE</Text>
          </View>

          <Text style={styles.title}>
            {isForce ? l('업데이트가 필요해요') : l('새 버전이 있어요')}
          </Text>
          <Text style={styles.description}>
            {isForce
              ? l('책모를 계속 이용하려면 최신 버전으로 업데이트해 주세요.')
              : l('더 안정적인 이용을 위해 최신 버전으로 업데이트해 주세요.')}
          </Text>

          {policy ? (
            <View style={styles.versionBox}>
              <Text style={styles.versionText}>
                {l('현재 버전 {version}', {
                  version: state.status === 'force' || state.status === 'recommend' ? state.currentVersion : '-',
                })}
              </Text>
              <Text style={styles.versionText}>
                {l('최신 버전 {version}', { version: policy.latestVersion })}
              </Text>
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            {!isForce ? (
              <AppButton
                variant="secondary"
                label={l('나중에')}
                onPress={onDismissRecommendation}
                size="lg"
                fullWidth
              />
            ) : null}
            <AppButton
              label={l('업데이트하기')}
              onPress={onOpenStore}
              size="lg"
              fullWidth
            />
          </View>
        </View>
      </SafeAreaView>
      {visible ? <ToastHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.overlay50,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.subbrown4,
  },
  badgeText: {
    ...typography.body2,
    color: colors.primary1,
  },
  title: {
    ...typography.subhead3,
    marginTop: spacing.md,
    color: colors.gray7,
  },
  description: {
    ...typography.body1_3_relaxed,
    marginTop: spacing.xs,
    color: colors.gray5,
  },
  versionBox: {
    gap: spacing.xxs,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  versionText: {
    ...typography.body2_2,
    color: colors.gray6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
});
