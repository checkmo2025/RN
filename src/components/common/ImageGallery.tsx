import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { FeedbackPressable as Pressable } from './FeedbackPressable';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors, radius, spacing } from '../../theme';

type Props = {
  imageUrls: string[];
  compact?: boolean;
  onPressImage: (index: number) => void;
};

export function ImageGallery({ imageUrls, compact = false, onPressImage }: Props) {
  const { l } = useLanguage();
  if (imageUrls.length === 0) return null;

  if (compact) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.compactList}
      >
        {imageUrls.map((imageUrl, index) => (
          <Pressable
            key={`${imageUrl}-${index}`}
            style={styles.compactItem}
            onPress={() => onPressImage(index)}
            accessibilityRole="imagebutton"
            accessibilityLabel={l('첨부 이미지 {index} 크게 보기', { index: index + 1 })}
          >
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.grid}>
      {imageUrls.map((imageUrl, index) => (
        <Pressable
          key={`${imageUrl}-${index}`}
          style={styles.gridItem}
          onPress={() => onPressImage(index)}
          accessibilityRole="imagebutton"
          accessibilityLabel={l('첨부 이미지 {index} 크게 보기', { index: index + 1 })}
        >
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  compactList: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  compactItem: {
    width: 76,
    height: 76,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.gray1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridItem: {
    width: '48.5%',
    aspectRatio: 4 / 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.gray1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
