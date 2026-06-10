import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors } from '../../theme';

type Props = {
  style?: ViewStyle;
};

export function SkeletonBox({ style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { opacity }, style]} />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.gray1,
    borderRadius: 4,
  },
});
