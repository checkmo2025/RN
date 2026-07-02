import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ListRenderItem,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography, buttonSize } from '../../theme';
import { FeedbackPressable } from '../../components/common/FeedbackPressable';
import { triggerSelectionHaptic } from '../../utils/haptics';
import { ONBOARDING_SLIDES, type OnboardingSlide } from '../../constants/onboardingSlides';
import { useLanguage } from '../../contexts/LanguageContext';

interface OnboardingScreenProps {
  visible: boolean;
  /** 건너뛰기 또는 마지막 "시작하기" 시 호출 */
  onClose: () => void;
}

export function OnboardingScreen({ visible, onClose }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { l } = useLanguage();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [index, setIndex] = useState(0);

  const lastIndex = ONBOARDING_SLIDES.length - 1;
  const isLast = index >= lastIndex;

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      setIndex((prev) => {
        if (prev !== next) {
          triggerSelectionHaptic();
        }
        return next;
      });
    },
    [width],
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      onClose();
      return;
    }
    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
    triggerSelectionHaptic();
  }, [index, isLast, onClose]);

  const renderItem = useCallback<ListRenderItem<OnboardingSlide>>(
    ({ item }) => (
      <View style={[styles.slide, { width }]}>
        <View style={[styles.phoneFrame, { borderColor: item.accent }]}>
          <MaterialIcons name={item.icon} size={72} color={item.accent} />
          <Text style={styles.placeholderLabel}>{l(item.imagePlaceholderLabel)}</Text>
        </View>
        <Text style={styles.title}>{l(item.title)}</Text>
        <Text style={styles.body}>{l(item.body)}</Text>
      </View>
    ),
    [l, width],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <FeedbackPressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={l('온보딩 건너뛰기')}
          >
            <Text style={styles.skipText}>{l('건너뛰기')}</Text>
          </FeedbackPressable>
        </View>

        <FlatList
          ref={listRef}
          data={ONBOARDING_SLIDES}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.dotsRow}>
            {ONBOARDING_SLIDES.map((slide, i) => (
              <View
                key={slide.key}
                style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>

          <FeedbackPressable
            style={styles.ctaButton}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? l('시작하기') : l('다음')}
          >
            <Text style={styles.ctaLabel}>{isLast ? l('시작하기') : l('다음')}</Text>
          </FeedbackPressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.body1_2,
    color: colors.gray4,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  phoneFrame: {
    width: '70%',
    aspectRatio: 9 / 16,
    maxHeight: '56%',
    borderWidth: 2,
    borderRadius: radius.lg,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  placeholderLabel: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'center',
  },
  title: {
    ...typography.subhead2,
    color: colors.gray7,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  body: {
    ...typography.body1_3_relaxed,
    color: colors.gray5,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: radius.pill,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary1,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.gray2,
  },
  ctaButton: {
    height: buttonSize.cta,
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    ...typography.subhead5,
    color: colors.white,
  },
});
