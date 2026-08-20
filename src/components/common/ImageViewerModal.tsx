import { FlatList, Image, Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedbackPressable as Pressable } from './FeedbackPressable';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';

type Props = {
  imageUrls: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export function ImageViewerModal({ imageUrls, index, onIndexChange, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { l } = useLanguage();

  return (
    <Modal
      visible={imageUrls.length > 0}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.counter}>{index + 1} / {imageUrls.length}</Text>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={l('닫기')}
          >
            <MaterialIcons name="close" size={28} color={colors.white} />
          </Pressable>
        </View>
        <FlatList
          key={`${imageUrls.length}-${imageUrls[0] ?? ''}-${imageUrls.at(-1) ?? ''}`}
          data={imageUrls}
          horizontal
          pagingEnabled
          initialScrollIndex={Math.min(index, Math.max(0, imageUrls.length - 1))}
          getItemLayout={(_, itemIndex) => ({
            length: width,
            offset: width * itemIndex,
            index: itemIndex,
          })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            onIndexChange(Math.round(event.nativeEvent.contentOffset.x / width));
          }}
          renderItem={({ item }) => (
            <View style={[styles.item, { width, height }]}>
              <Image
                source={{ uri: item }}
                style={{ width, height: height * 0.82 }}
                resizeMode="contain"
              />
            </View>
          )}
          keyExtractor={(item, itemIndex) => `${itemIndex}-${item}`}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  counter: {
    ...typography.body1_2,
    color: colors.white,
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
