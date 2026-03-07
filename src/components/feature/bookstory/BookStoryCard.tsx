import React from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  GestureResponderEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';

import { colors, radius, spacing, typography } from '../../../theme';
import { DefaultProfileAvatar } from '../../common/DefaultProfileAvatar';

type Props = {
  author: string;
  timeAgo: string;
  views: number;
  title: string;
  body: string;
  likes: number;
  comments: number;
  liked?: boolean;
  subscribed?: boolean;
  image?: string;
  onPress?: () => void;
  onToggleLike?: () => void;
  onToggleSubscribe?: () => void;
  onPressAuthor?: () => void;
  onPressComment?: (e?: GestureResponderEvent) => void;
};

const commentIconUri = Image.resolveAssetSource(
  require('../../../../assets/book-story/bookstory-comment.svg'),
).uri;

export function BookStoryCard({
  author,
  timeAgo,
  views,
  title,
  body,
  likes,
  comments,
  liked,
  subscribed,
  image,
  onPress,
  onToggleLike,
  onToggleSubscribe,
  onPressAuthor,
  onPressComment,
}: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [styles.authorPressArea, pressed && styles.pressed]}
          onPress={(e) => {
            e.stopPropagation?.();
            onPressAuthor?.();
          }}
        >
          <View style={styles.avatar}>
            <DefaultProfileAvatar size={32} />
          </View>
          <View style={styles.meta}>
            <Text style={styles.author}>{author}</Text>
            <Text style={styles.subtitle}>
              {timeAgo} · 조회수 {views}
            </Text>
          </View>
        </Pressable>
        {typeof subscribed !== 'undefined' ? (
          <Pressable
            style={[
              styles.subscribeChip,
              subscribed ? styles.subscribeActive : styles.subscribeInactive,
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleSubscribe?.();
            }}
          >
            <Text
              style={[
                styles.subscribeText,
                subscribed ? styles.subscribeTextActive : styles.subscribeTextInactive,
              ]}
            >
              {subscribed ? '구독중' : '구독'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ImageBackground
        source={image ? { uri: image } : undefined}
        style={styles.coverBg}
        imageStyle={styles.coverBgImage}
        blurRadius={18}
        resizeMode="cover"
      >
        <View style={styles.coverOverlay} />
        {image ? (
          <Image source={{ uri: image }} style={styles.cover} resizeMode="contain" />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}
      </ImageBackground>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body} numberOfLines={3}>
        {body}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={styles.action}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleLike?.();
          }}
        >
          <MaterialIcons
            name={liked ? 'favorite' : 'favorite-border'}
            size={20}
            color={liked ? colors.likeRed : colors.gray4}
          />
          <Text style={styles.actionText}>좋아요 {likes}</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          style={styles.action}
          onPress={(e) => {
            e.stopPropagation?.();
            onPressComment?.(e);
          }}
        >
          <SvgUri uri={commentIconUri} width={20} height={20} />
          <Text style={styles.actionText}>댓글 {comments}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.subbrown4,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorPressArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
  },
  author: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  subtitle: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  subscribeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  subscribeActive: {
    backgroundColor: colors.subbrown4,
    borderColor: colors.subbrown4,
  },
  subscribeInactive: {
    backgroundColor: colors.primary1,
    borderColor: colors.primary1,
  },
  subscribeText: {
    ...typography.body2_2,
  },
  subscribeTextActive: {
    color: colors.primary3,
  },
  subscribeTextInactive: {
    color: colors.white,
  },
  coverBg: {
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBgImage: {
    opacity: 0.9,
    transform: [{ scale: 1.08 }],
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
  },
  cover: {
    width: '52%',
    height: '92%',
    borderRadius: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  coverPlaceholder: {
    width: '52%',
    height: '92%',
    borderRadius: spacing.xs,
    backgroundColor: colors.gray1,
  },
  title: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  body: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    ...typography.body2_2,
    color: colors.gray4,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.gray2,
  },
  pressed: {
    opacity: 0.75,
  },
});
