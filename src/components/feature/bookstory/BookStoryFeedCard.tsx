import React from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../../theme';

type Props = {
  authorName: string;
  profileImgSrc?: string;
  timeAgo: string;
  viewCount: number;
  title: string;
  content: string;
  coverImgSrc?: string;
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
  isAuthor?: boolean;
  subscribed?: boolean;
  onPress?: () => void;
  onToggleLike?: () => void;
  onToggleSubscribe?: () => void;
  onPressAuthor?: () => void;
  onPressComment?: () => void;
};

export default function BookStoryFeedCard({
  authorName,
  profileImgSrc,
  timeAgo,
  viewCount,
  title,
  content,
  coverImgSrc,
  likeCount = 0,
  commentCount = 0,
  liked,
  isAuthor = false,
  subscribed,
  onPress,
  onToggleLike,
  onToggleSubscribe,
  onPressAuthor,
  onPressComment,
}: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.headerRow}>
        {onPressAuthor ? (
          <Pressable
            style={styles.headerMain}
            onPress={(e) => {
              e.stopPropagation?.();
              onPressAuthor();
            }}
          >
            <View style={styles.avatar}>
              {profileImgSrc ? (
                <Image source={{ uri: profileImgSrc }} style={styles.avatarImg} />
              ) : (
                <MaterialIcons name="person-outline" size={22} color={colors.gray4} />
              )}
            </View>
            <View style={styles.meta}>
              <Text style={styles.author}>{authorName}</Text>
              <Text style={styles.subtitle}>
                {timeAgo}  조회수 {viewCount}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.headerMain}>
            <View style={styles.avatar}>
              {profileImgSrc ? (
                <Image source={{ uri: profileImgSrc }} style={styles.avatarImg} />
              ) : (
                <MaterialIcons name="person-outline" size={22} color={colors.gray4} />
              )}
            </View>
            <View style={styles.meta}>
              <Text style={styles.author}>{authorName}</Text>
              <Text style={styles.subtitle}>
                {timeAgo}  조회수 {viewCount}
              </Text>
            </View>
          </View>
        )}
        {isAuthor ? (
          <View style={styles.authorTag}>
            <Text style={styles.authorTagText}>작성자</Text>
          </View>
        ) : typeof subscribed !== 'undefined' ? (
          <Pressable
            style={[
              styles.subButton,
              subscribed ? styles.subButtonActive : styles.subButtonInactive,
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleSubscribe?.();
            }}
          >
            <Text
              style={[
                styles.subButtonText,
                subscribed ? styles.subTextActive : styles.subTextInactive,
              ]}
            >
              {subscribed ? '구독중' : '구독'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Cover */}
      <ImageBackground
        source={coverImgSrc ? { uri: coverImgSrc } : undefined}
        style={styles.cover}
        imageStyle={styles.coverImage}
        blurRadius={18}
      >
        <View style={styles.coverOverlay} />
        {coverImgSrc ? (
          <Image source={{ uri: coverImgSrc }} style={styles.coverCenterImage} resizeMode="contain" />
        ) : (
          <View style={styles.coverCenterPlaceholder} />
        )}
      </ImageBackground>

      {/* Title & body */}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.content} numberOfLines={3}>
          {content}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={styles.footerAction}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleLike?.();
          }}
        >
          <MaterialIcons
            name={liked ? 'favorite' : 'favorite-border'}
            size={22}
            color={liked ? colors.likeRed : colors.gray4}
          />
          <Text style={styles.footerText}>좋아요 {likeCount}</Text>
        </Pressable>

        <View style={styles.footerDivider} />

        <Pressable
          style={styles.footerAction}
          onPress={(e) => {
            e.stopPropagation?.();
            onPressComment?.();
          }}
        >
          <MaterialIcons name="chat-bubble-outline" size={22} color={colors.gray4} />
          <Text style={styles.footerText}>댓글 {commentCount}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.subbrown4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginHorizontal: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerMain: {
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
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  meta: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  author: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  subtitle: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  subButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  subButtonActive: {
    backgroundColor: colors.subbrown4,
  },
  subButtonInactive: {
    backgroundColor: colors.primary1,
  },
  subButtonText: {
    ...typography.body2_2,
  },
  authorTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.gray1,
  },
  authorTagText: {
    ...typography.body2_2,
    color: colors.gray5,
  },
  subTextActive: {
    color: colors.primary3,
  },
  subTextInactive: {
    color: colors.white,
  },
  cover: {
    width: '100%',
    height: 168,
    backgroundColor: colors.subbrown4,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    resizeMode: 'cover',
    opacity: 0.9,
    transform: [{ scale: 1.08 }],
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
  },
  coverCenterImage: {
    width: '52%',
    height: '92%',
    borderRadius: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  coverCenterPlaceholder: {
    width: '52%',
    height: '92%',
    borderRadius: spacing.xs,
    backgroundColor: colors.gray1,
  },
  body: {
    gap: spacing.xs,
  },
  title: {
    ...typography.subhead3,
    color: colors.gray6,
  },
  content: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.subbrown4,
    paddingTop: spacing.sm,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.subbrown4,
    marginHorizontal: spacing.md,
  },
  footerText: {
    ...typography.body2_2,
    color: colors.gray4,
  },
});
