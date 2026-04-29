import { Modal, KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { FeedbackPressable as Pressable } from './FeedbackPressable';

interface DialogOverlayProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  overlayStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  withKeyboard?: boolean;
}

export function DialogOverlay({
  visible,
  onClose,
  children,
  overlayStyle,
  cardStyle,
  withKeyboard,
}: DialogOverlayProps) {
  const inner = (
    <Pressable style={overlayStyle} onPress={onClose} disableFeedback>
      <Pressable style={cardStyle} onPress={(e) => e.stopPropagation()} disableFeedback>
        {children}
      </Pressable>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {withKeyboard ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </Modal>
  );
}
