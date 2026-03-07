import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../../theme';

type Props = {
  authorName: string;
  profileImgSrc?: string;
  createdAt: string;
  viewCount: number;
  coverImgSrc?: string;
  title: string;
  content: string;
  likeCount?: number;
  commentCount?: number;
  subscribed?: boolean;
  onSubscribeClick?: () => void;
  onToggleLike?: () => void;
  onPress?: () => void;
};

export default function BookStoryCardLarge({
  authorName,
  profileImgSrc,
  createdAt,
  viewCount,
  coverImgSrc,
  title,
  content,
  likeCount = 0,
  commentCount = 0,
  subscribed,
  onSubscribeClick,
  onToggleLike,
  onPress,
}: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <MaterialIcons name="person-outline" size={24} color={colors.gray5} />
          {profileImgSrc ? (
            <Image source={{ uri: profileImgSrc }} style={styles.avatarImg} />
          ) : null}
        </View>
        <View style={styles.meta}>
          <Text style={styles.author}>{authorName}</Text>
          <Text style={styles.subtitle}>
            {createdAt} · 조회수 {viewCount}
          </Text>
        </View>
        {typeof subscribed !== 'undefined' ? (
          <Pressable
            style={[styles.subBtn, subscribed ? styles.subBtnActive : styles.subBtnInactive]}
            onPress={onSubscribeClick}
          >
            <Text
              style={[
                styles.subBtnText,
                subscribed ? styles.subBtnTextActive : styles.subBtnTextInactive,
              ]}
            >
              {subscribed ? '구독중' : '구독'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.coverBg}>
        {coverImgSrc ? <Image source={{ uri: coverImgSrc }} style={styles.cover} /> : null}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body} numberOfLines={3}>
        {content}
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={onToggleLike}>
          <MaterialIcons
            name="favorite"
            size={20}
            color={colors.primary1}
            style={{ opacity: 0.9 }}
          />
          <Text style={styles.actionText}>좋아요 {likeCount}</Text>
        </Pressable>
        <View style={styles.divider} />
        <View style={styles.action}>
          <MaterialIcons name="chat-bubble-outline" size={20} color={colors.gray4} />
          <Text style={styles.actionText}>댓글 {commentCount}</Text>
        </View>
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
  },
  author: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  subtitle: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  subBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
  },
  subBtnActive: {
    backgroundColor: colors.subbrown4,
  },
  subBtnInactive: {
    backgroundColor: colors.primary1,
  },
  subBtnText: {
    ...typography.body2_2,
  },
  subBtnTextActive: {
    color: colors.primary3,
  },
  subBtnTextInactive: {
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
  cover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
});
