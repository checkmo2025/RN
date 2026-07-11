import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { FeedbackPressable as Pressable } from './FeedbackPressable';
import { ToastHost } from './ToastHost';

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
    <View style={overlayStyle}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} disableFeedback />
      <View style={cardStyle}>
        {children}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {withKeyboard ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
      {visible ? <ToastHost /> : null}
    </Modal>
  );
}
