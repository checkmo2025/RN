import { Modal, KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { FeedbackPressable as Pressable } from './FeedbackPressable';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropStyle: StyleProp<ViewStyle>;
  sheetStyle: StyleProp<ViewStyle>;
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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={keyboardBehavior ?? (Platform.OS === 'ios' ? 'padding' : 'height')}
      >
        <Pressable style={backdropStyle} onPress={onClose} disableFeedback>
          <Pressable style={sheetStyle} onPress={(e) => e.stopPropagation()} disableFeedback>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
