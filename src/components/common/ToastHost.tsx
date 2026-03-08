import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { subscribeToast } from '../../utils/toast';

const HIDE_DELAY_MS = 2200;
const TOAST_BOTTOM_OFFSET = spacing.xxl * 2 + spacing.lg + spacing.xs + spacing.xxs * 2;

export function ToastHost() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToast((nextMessage) => {
      setMessage(nextMessage);
      setVisible(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 6,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setVisible(false);
        });
      }, HIDE_DELAY_MS);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      unsubscribe();
    };
  }, [opacity, translateY]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.toast,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: TOAST_BOTTOM_OFFSET,
    zIndex: 999,
    elevation: 999,
  },
  toast: {
    minWidth: 220,
    maxWidth: '86%',
    backgroundColor: 'rgba(73, 36, 50, 0.76)',
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  message: {
    ...typography.body2_2,
    color: colors.white,
    textAlign: 'center',
  },
});
