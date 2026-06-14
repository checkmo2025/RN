import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../../theme';
import { FeedbackPressable as Pressable } from './FeedbackPressable';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
  keyboardBehavior?: 'padding' | 'height' | 'position';
}

export function BottomSheet({
  visible,
  onClose,
  children,
  backdropStyle,
  sheetStyle,
  keyboardBehavior,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={keyboardBehavior ?? (Platform.OS === 'ios' ? 'padding' : 'height')}
      >
        <Pressable style={[styles.backdrop, backdropStyle]} onPress={onClose} disableFeedback>
          <Pressable
            style={[
              styles.sheet,
              sheetStyle,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
            onPress={(e) => e.stopPropagation()}
            disableFeedback
          >
            {children}
          </Pressable>
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
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});
