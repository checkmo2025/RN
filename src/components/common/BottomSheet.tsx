import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  Animated,
  Modal,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, motion, radius, spacing } from '../../theme';
import { FeedbackPressable as Pressable } from './FeedbackPressable';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  backdropStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
  keyboardBehavior?: 'padding' | 'height' | 'position';
}

const DISMISS_DRAG_DISTANCE = 96;
const DISMISS_DRAG_VELOCITY = 1.1;
export function BottomSheet({
  visible,
  onClose,
  children,
  backdropStyle,
  sheetStyle,
  keyboardBehavior,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(windowHeight)).current;
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;

    translateY.stopAnimation();
    translateY.setValue(windowHeight);

    const frame = requestAnimationFrame(() => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.duration.sheet,
        useNativeDriver: true,
      }).start();
    });

    return () => cancelAnimationFrame(frame);
  }, [translateY, visible, windowHeight]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 2,
        onPanResponderMove: (_, gestureState) => {
          translateY.setValue(Math.max(gestureState.dy, 0));
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldDismiss =
            gestureState.dy > DISMISS_DRAG_DISTANCE ||
            gestureState.vy > DISMISS_DRAG_VELOCITY;

          if (shouldDismiss) {
            Animated.timing(translateY, {
              toValue: windowHeight,
              duration: motion.duration.sheet,
              useNativeDriver: true,
            }).start(() => {
              onCloseRef.current();
            });
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
      }),
    [translateY, windowHeight],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={keyboardBehavior ?? (Platform.OS === 'ios' ? 'padding' : 'height')}
      >
        <Pressable style={[styles.backdrop, backdropStyle]} onPress={onClose} disableFeedback>
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                transform: [{ translateY }],
              },
            ]}
          >
            <Pressable
              style={[
                styles.sheet,
                sheetStyle,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
              ]}
              onPress={(e) => e.stopPropagation()}
              disableFeedback
            >
              <View
                style={styles.handleHitArea}
                accessibilityRole="button"
                accessibilityLabel="바텀시트 닫기 핸들"
                {...panResponder.panHandlers}
              >
                <View style={styles.handle} />
              </View>
              {children}
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay30,
  },
  sheetContainer: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  handleHitArea: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 28,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray2,
  },
});
