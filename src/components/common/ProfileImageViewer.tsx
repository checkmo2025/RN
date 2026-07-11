import { Image, Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { FeedbackPressable as Pressable } from './FeedbackPressable';

type ProfileImageViewerProps = {
  visible: boolean;
  imageUrl?: string;
  onClose: () => void;
};

export function ProfileImageViewer({
  visible,
  imageUrl,
  onClose,
}: ProfileImageViewerProps) {
  const { l } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const imageSize = Math.max(200, Math.min(width - spacing.xl * 2, height - 240, 420));

  return (
    <Modal
      visible={visible && Boolean(imageUrl)}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={l('닫기')}
          >
            <MaterialIcons name="close" size={30} color={colors.white} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.zoomArea}
          contentContainerStyle={styles.zoomContent}
          minimumZoomScale={1}
          maximumZoomScale={3}
          bouncesZoom
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2 }}
              resizeMode="cover"
              accessibilityRole="image"
              accessibilityLabel={l('프로필 사진')}
            />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  zoomArea: {
    flex: 1,
  },
  zoomContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
