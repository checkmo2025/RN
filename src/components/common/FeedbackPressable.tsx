import { Pressable as RNPressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { interactionOpacity } from '../../theme';

type Props = PressableProps & {
  disableFeedback?: boolean;
  pressedStyle?: StyleProp<ViewStyle>;
};

const defaultAndroidRipple = {
  color: 'rgba(91, 71, 61, 0.14)',
};

export function FeedbackPressable({
  disableFeedback = false,
  pressedStyle,
  style,
  android_ripple,
  ...rest
}: Props) {
  return (
    <RNPressable
      {...rest}
      android_ripple={disableFeedback ? android_ripple : (android_ripple ?? defaultAndroidRipple)}
      style={(state) => {
        const baseStyle = typeof style === 'function' ? style(state) : style;
        if (disableFeedback || !state.pressed) {
          return baseStyle;
        }
        return [baseStyle, styles.pressed, pressedStyle];
      }}
    />
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: interactionOpacity.pressed,
  },
});

