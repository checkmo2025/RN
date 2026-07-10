import { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedbackPressable } from '../../components/common/FeedbackPressable';
import { ONBOARDING_SLIDES, type OnboardingSlide } from '../../constants/onboardingSlides';
import { buttonSize, colors, radius, spacing, typography } from '../../theme';
import { triggerSelectionHaptic } from '../../utils/haptics';

type OnboardingScreenProps = {
  visible: boolean;
  onDone: () => void;
  slides?: OnboardingSlide[];
  skipButtonLabel?: string;
  doneButtonLabel?: string;
};

export function OnboardingScreen({
  visible,
  onDone,
  slides = ONBOARDING_SLIDES,
  skipButtonLabel = '건너뛰고 시작하기',
  doneButtonLabel = '책모 시작하기',
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const lastIndex = slides.length - 1;
  const isLast = index >= lastIndex;
  const buttonLabel = isLast ? doneButtonLabel : skipButtonLabel;

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.max(
        0,
        Math.min(lastIndex, Math.round(event.nativeEvent.contentOffset.x / width)),
      );

      setIndex((prevIndex) => {
        if (prevIndex !== nextIndex) {
          triggerSelectionHaptic();
        }
        return nextIndex;
      });
    },
    [lastIndex, width],
  );

  const handleDone = useCallback(() => {
    triggerSelectionHaptic();
    onDone();
  }, [onDone]);

  const renderItem = useCallback<ListRenderItem<OnboardingSlide>>(
    ({ item }) => (
      <View style={[styles.slide, { width, height }]}>
        <Image
          source={item.source}
          style={[styles.image, { width, height }]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel={item.accessibilityLabel}
        />
      </View>
    ),
    [height, width],
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleDone}
    >
      <View style={styles.container}>
        <FlatList
          style={styles.carousel}
          data={slides}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          getItemLayout={(_, itemIndex) => ({
            length: width,
            offset: width * itemIndex,
            index: itemIndex,
          })}
        />

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={styles.dotsRow}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {slides.map((slide, slideIndex) => (
              <View
                key={slide.key}
                style={[
                  styles.dot,
                  slideIndex === index ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <FeedbackPressable
            style={styles.skipButton}
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
          >
            <Text style={styles.skipButtonText}>{buttonLabel}</Text>
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
  carousel: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  image: {
    backgroundColor: colors.white,
  },
  footer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dotActive: {
    borderColor: colors.primary1,
    backgroundColor: colors.primary1,
  },
  dotInactive: {
    borderColor: colors.gray3,
    backgroundColor: colors.white,
  },
  skipButton: {
    height: buttonSize.cta,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary1,
  },
  skipButtonText: {
    ...typography.subhead5,
    color: colors.white,
  },
});
