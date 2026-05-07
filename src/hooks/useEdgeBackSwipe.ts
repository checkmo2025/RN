import { useMemo } from 'react';
import { Animated, PanResponder, type PanResponderInstance } from 'react-native';
import { motion } from '../theme';

type Options = {
  isActive: boolean;
  translateX: Animated.Value;
  screenWidth: number;
  onClose: () => void;
  edgeWidth?: number;
  activateDistance?: number;
  activateMaxDy?: number;
  triggerDistance?: number;
  triggerMaxDy?: number;
  requireHorizontalDominance?: boolean;
};

export function useEdgeBackSwipe({
  isActive,
  translateX,
  screenWidth,
  onClose,
  edgeWidth = 28,
  activateDistance = 14,
  activateMaxDy = 16,
  triggerDistance = 72,
  triggerMaxDy = 60,
  requireHorizontalDominance = false,
}: Options): PanResponderInstance {
  return useMemo(
    () => {
      const isSwipe = (g: { x0: number; dx: number; dy: number }) =>
        isActive &&
        g.x0 <= edgeWidth &&
        g.dx > activateDistance &&
        Math.abs(g.dy) < activateMaxDy &&
        (!requireHorizontalDominance || Math.abs(g.dx) > Math.abs(g.dy) * 1.4);

      return PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => isSwipe(g),
        onMoveShouldSetPanResponderCapture: (_, g) => isSwipe(g),
        onPanResponderMove: (_, g) => {
          translateX.setValue(Math.max(0, Math.min(g.dx, screenWidth)));
        },
        onPanResponderRelease: (_, g) => {
          const drag = Math.max(0, g.dx);
          const shouldClose = drag >= triggerDistance && Math.abs(g.dy) <= triggerMaxDy;
          if (shouldClose) {
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: motion.duration.normal,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (!finished) return;
              onClose();
            });
            return;
          }
          Animated.spring(translateX, {
            toValue: 0,
            speed: 22,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            speed: 22,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isActive, translateX, screenWidth, onClose, edgeWidth, activateDistance, activateMaxDy, triggerDistance, triggerMaxDy, requireHorizontalDominance],
  );
}
