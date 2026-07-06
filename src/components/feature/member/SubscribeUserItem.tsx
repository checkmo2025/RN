import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, interactionOpacity, radius, spacing, typography } from '../../../theme';
import { FeedbackPressable as Pressable } from '../../common/FeedbackPressable';
import { DefaultProfileAvatar } from '../../common/DefaultProfileAvatar';
import { useLanguage } from '../../../contexts/LanguageContext';

type Props = {
  nickname: string;
  profileImageUrl?: string;
  subscribed?: boolean;
  onPressSubscribe?: () => void;
  onPressProfile?: () => void;
  compactSubscribeButton?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function SubscribeUserItem({
  nickname,
  profileImageUrl,
  subscribed = false,
  onPressSubscribe,
  onPressProfile,
  compactSubscribeButton = false,
  style,
}: Props) {
  const { l } = useLanguage();

  return (
    <View style={[styles.container, style]}>
      <Pressable
        style={({ pressed }) => [styles.infoRow, pressed && styles.pressed]}
        onPress={onPressProfile}
      >
        <View style={styles.avatar}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <DefaultProfileAvatar size={42} />
          )}
        </View>

        <View style={styles.textCol}>
          <Text style={styles.nickname}>{nickname}</Text>
        </View>
      </Pressable>

      <Pressable
        style={[
          styles.subscribeButton,
          compactSubscribeButton ? styles.subscribeButtonCompact : null,
          subscribed ? styles.subscribeButtonActive : null,
        ]}
        onPress={onPressSubscribe}
      >
        <Text
          style={[
            styles.subscribeButtonText,
            compactSubscribeButton ? styles.subscribeButtonTextCompact : null,
            subscribed ? styles.subscribeButtonTextActive : styles.subscribeButtonTextInactive,
          ]}
        >
          {subscribed ? l('구독중') : l('구독')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.gray2,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  textCol: {
    flex: 1,
  },
  nickname: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  subscribeButton: {
    minWidth: 82,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: colors.primary1,
  },
  subscribeButtonCompact: {
    minWidth: 68,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  subscribeButtonActive: {
    backgroundColor: colors.subbrown3,
  },
  subscribeButtonText: {
    ...typography.body1_2,
  },
  subscribeButtonTextCompact: {
    ...typography.body2_2,
  },
  subscribeButtonTextActive: {
    color: colors.primary3,
  },
  subscribeButtonTextInactive: {
    color: colors.white,
  },
  pressed: {
    opacity: interactionOpacity.pressed,
  },
});
