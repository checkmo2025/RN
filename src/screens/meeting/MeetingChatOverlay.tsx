import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { DefaultProfileAvatar } from '../../components/common/DefaultProfileAvatar';
import { DialogOverlay } from '../../components/common/DialogOverlay';
import { FeedbackPressable as Pressable } from '../../components/common/FeedbackPressable';
import { FormTextInput } from '../../components/common/FormTextInput';
import { ToastHost } from '../../components/common/ToastHost';
import { useEdgeBackSwipe } from '../../hooks/useEdgeBackSwipe';
import type { RootStackParamList } from '../../navigation/types';
import type { ClubMeetingChatMessage } from '../../services/api/clubApi';
import {
  buttonSize,
  colors,
  dialog,
  interactionOpacity,
  layers,
  radius,
  spacing,
  typography,
} from '../../theme';
import { showToast } from '../../utils/toast';
import { formatDotDateTime } from './formatters';
import { ChatMessageReportModal } from './ChatMessageReportModal';
import type { useMeetingChatState } from './useMeetingChatState';

type ChatState = ReturnType<typeof useMeetingChatState>;

type Props = {
  state: ChatState;
  currentMemberNickname: string;
};

function isMine(message: ClubMeetingChatMessage, currentMemberNickname: string): boolean {
  return (
    Boolean(currentMemberNickname.trim()) &&
    message.senderNickname
      .trim()
      .localeCompare(currentMemberNickname.trim(), 'ko', { sensitivity: 'accent' }) === 0
  );
}

export function MeetingChatOverlay({ state, currentMemberNickname }: Props) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [profileMessage, setProfileMessage] = useState<ClubMeetingChatMessage | null>(null);
  const [messageActionTarget, setMessageActionTarget] =
    useState<ClubMeetingChatMessage | null>(null);
  const listRef = useRef<FlatList<ClubMeetingChatMessage>>(null);
  const nearBottomRef = useRef(true);
  const initialScrolledRef = useRef(false);
  const lastMessage = state.messages[state.messages.length - 1];
  const lastMessageId = lastMessage?.messageId;
  const lastMessageIsMine = lastMessage ? isMine(lastMessage, currentMemberNickname) : false;
  const translateX = useRef(new Animated.Value(0)).current;

  const backSwipe = useEdgeBackSwipe({
    isActive: Boolean(state.activeGroup),
    translateX,
    screenWidth,
    onClose: state.backToPicker,
    requireHorizontalDominance: true,
  });

  useEffect(() => {
    translateX.setValue(0);
    initialScrolledRef.current = false;
    nearBottomRef.current = true;
    setProfileMessage(null);
    setMessageActionTarget(null);
  }, [state.activeGroup?.id, translateX]);

  useEffect(() => {
    if (!lastMessageId || state.initialLoading) return;
    if (!nearBottomRef.current && !lastMessageIsMine) return;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [lastMessageId, lastMessageIsMine, state.initialLoading]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    nearBottomRef.current =
      contentSize.height - (contentOffset.y + layoutMeasurement.height) <= spacing.xxl;
    if (contentOffset.y <= spacing.xs && state.hasNext && !state.loadingOlder) {
      void state.loadOlder();
    }
  };

  const navigateToProfile = () => {
    if (!profileMessage) return;
    const nickname = profileMessage.senderNickname;
    setProfileMessage(null);
    state.closeChat();
    navigation.navigate('UserProfile', { memberNickname: nickname, fromScreen: 'Meeting' });
  };

  const copyMessage = async () => {
    if (!messageActionTarget) return;
    const content = messageActionTarget.content;
    setMessageActionTarget(null);
    try {
      await Clipboard.setStringAsync(content);
      showToast('메시지를 복사했습니다.');
    } catch {
      showToast('메시지를 복사하지 못했습니다.');
    }
  };

  return (
    <>
      <DialogOverlay
        visible={state.pickerVisible}
        onClose={state.closeChat}
        overlayStyle={styles.dialogOverlay}
        cardStyle={styles.pickerCard}
      >
        <View style={styles.dialogHeader}>
          <Text style={styles.dialogTitle}>채팅 조 선택</Text>
          <Pressable onPress={state.closeChat} hitSlop={8} accessibilityLabel="채팅 조 선택 닫기">
            <MaterialIcons name="close" size={24} color={colors.gray6} />
          </Pressable>
        </View>
        <View style={styles.groupList}>
          {state.accessibleGroups.map((group) => (
            <Pressable
              key={group.id}
              style={({ pressed }) => [styles.groupItem, pressed && styles.pressed]}
              onPress={() => state.selectGroup(group.id)}
            >
              <View style={styles.groupItemTextWrap}>
                <Text style={styles.groupItemTitle}>{group.label}</Text>
                <Text style={styles.groupItemMeta}>참여자 {group.memberCount}명</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.gray4} />
            </Pressable>
          ))}
          {state.accessibleGroups.length === 0 ? (
            <Text style={styles.emptyText}>이용할 수 있는 채팅 조가 없습니다.</Text>
          ) : null}
        </View>
      </DialogOverlay>

      <Modal
        visible={Boolean(state.activeGroup)}
        animationType="slide"
        onRequestClose={state.backToPicker}
      >
        <KeyboardAvoidingView
          style={styles.chatScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            style={[styles.chatScreen, { transform: [{ translateX }] }]}
            {...backSwipe.panHandlers}
          >
            <View style={[styles.chatHeader, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
              <View style={styles.chatHeaderLeft}>
                <Pressable
                  onPress={state.backToPicker}
                  hitSlop={8}
                  accessibilityLabel="채팅 조 선택으로 돌아가기"
                >
                  <MaterialIcons name="chevron-left" size={26} color={colors.gray6} />
                </Pressable>
                <View>
                  <Text style={styles.chatTitle}>{state.activeGroup?.label ?? '조 채팅'}</Text>
                  <View style={styles.connectionRow}>
                    <View
                      style={[
                        styles.connectionDot,
                        state.isConnected ? styles.connectionDotOn : styles.connectionDotOff,
                      ]}
                    />
                    <Text style={styles.connectionText}>
                      {state.isConnected ? '연결됨' : '연결 중...'}
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable onPress={state.closeChat} hitSlop={8} accessibilityLabel="채팅 닫기">
                <MaterialIcons name="close" size={24} color={colors.gray6} />
              </Pressable>
            </View>

            {state.initialLoading ? (
              <View style={styles.centerState}>
                <Text style={styles.stateText}>채팅 내역을 불러오는 중...</Text>
              </View>
            ) : state.historyError ? (
              <View style={styles.centerState}>
                <Text style={styles.stateText}>{state.historyError}</Text>
                <Pressable style={styles.retryButton} onPress={state.retryHistory}>
                  <Text style={styles.retryText}>다시 시도</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={state.messages}
                keyExtractor={(message) => `chat-${message.messageId}`}
                style={styles.messageList}
                contentContainerStyle={[
                  styles.messageContent,
                  state.messages.length === 0 && styles.messageContentEmpty,
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={() => {
                  if (initialScrolledRef.current || state.messages.length === 0) return;
                  initialScrolledRef.current = true;
                  requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
                }}
                ListHeaderComponent={
                  state.loadingOlder ? (
                    <Text style={styles.loadingOlderText}>이전 채팅을 불러오는 중...</Text>
                  ) : null
                }
                ListEmptyComponent={<Text style={styles.emptyText}>표시할 채팅 내역이 없습니다.</Text>}
                renderItem={({ item }) => {
                  const mine = isMine(item, currentMemberNickname);
                  return (
                    <View style={[styles.messageRow, mine && styles.messageRowMine]}>
                      {!mine ? (
                        <View style={styles.messageMetaRow}>
                          <Pressable
                            style={({ pressed }) => [styles.authorButton, pressed && styles.pressed]}
                            onPress={() => setProfileMessage(item)}
                          >
                            <View style={styles.messageAvatar}>
                              {item.senderProfileImageUrl ? (
                                <Image
                                  source={{ uri: item.senderProfileImageUrl }}
                                  style={styles.avatarImage}
                                />
                              ) : (
                                <DefaultProfileAvatar size={24} />
                              )}
                            </View>
                            <Text style={styles.authorText}>{item.senderNickname}</Text>
                          </Pressable>
                        </View>
                      ) : null}
                      <Pressable
                        style={({ pressed }) => [
                          styles.bubble,
                          mine ? styles.bubbleMine : styles.bubbleOther,
                          !mine && pressed && styles.pressed,
                        ]}
                        onPress={() => setMessageActionTarget(item)}
                        accessibilityLabel="메시지 메뉴 열기"
                      >
                        <Text style={styles.bubbleText}>{item.content}</Text>
                      </Pressable>
                      <Text style={styles.messageTime}>{formatDotDateTime(item.sendAt)}</Text>
                    </View>
                  );
                }}
              />
            )}

            <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
              <FormTextInput
                value={state.input}
                onChangeText={state.setInput}
                style={styles.chatInput}
                placeholder="채팅 입력"
                placeholderTextColor={colors.gray3}
                returnKeyType="send"
                onSubmitEditing={state.submitMessage}
              />
              <Pressable
                style={[
                  styles.sendButton,
                  (!state.isConnected || !state.input.trim()) && styles.sendButtonDisabled,
                ]}
                onPress={state.submitMessage}
                disabled={!state.isConnected || !state.input.trim()}
                accessibilityLabel="채팅 전송"
              >
                <MaterialIcons name="send" size={20} color={colors.white} />
              </Pressable>
            </View>
            <ToastHost />

            {profileMessage ? (
              <View style={styles.inlineOverlay}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setProfileMessage(null)}
                  disableFeedback
                />
                <View style={styles.profileCard}>
                  <View style={styles.profileHeader}>
                    <Text style={styles.profileTitle}>사용자 프로필</Text>
                    <Pressable
                      onPress={() => setProfileMessage(null)}
                      hitSlop={8}
                      accessibilityLabel="사용자 프로필 닫기"
                    >
                      <MaterialIcons name="close" size={24} color={colors.gray6} />
                    </Pressable>
                  </View>
                  <View style={styles.profileAvatar}>
                    {profileMessage.senderProfileImageUrl ? (
                      <Image
                        source={{ uri: profileMessage.senderProfileImageUrl }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <DefaultProfileAvatar size={64} />
                    )}
                  </View>
                  <Text style={styles.profileLabel}>아이디</Text>
                  <Text style={styles.profileNickname}>{profileMessage.senderNickname}</Text>
                  <View style={styles.profileActionRow}>
                    <Pressable
                      style={styles.profileReportButton}
                      onPress={() => {
                        const message = profileMessage;
                        setProfileMessage(null);
                        state.openMemberReport(message);
                      }}
                    >
                      <Text style={styles.profileReportButtonText}>신고하기</Text>
                    </Pressable>
                    <Pressable style={styles.profileButton} onPress={navigateToProfile}>
                      <Text style={styles.profileButtonText}>바로가기</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}

            <ChatMessageReportModal
              target={state.reportTarget}
              submitting={state.submittingReport}
              onClose={() => state.setReportTarget(null)}
              onSubmit={(payload) => void state.submitReport(payload)}
            />

            {messageActionTarget ? (
              <View style={styles.messageActionOverlay}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setMessageActionTarget(null)}
                  disableFeedback
                />
                <View
                  style={[
                    styles.messageActionSheet,
                    { paddingBottom: Math.max(insets.bottom, spacing.md) },
                  ]}
                >
                  <Text style={styles.messageActionTitle}>메시지 메뉴</Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.messageActionItem,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => void copyMessage()}
                  >
                    <MaterialIcons name="content-copy" size={20} color={colors.gray5} />
                    <Text style={styles.messageActionText}>복사하기</Text>
                  </Pressable>
                  {!isMine(messageActionTarget, currentMemberNickname) ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.messageActionItem,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        const message = messageActionTarget;
                        setMessageActionTarget(null);
                        state.openMessageReport(message);
                      }}
                    >
                      <MaterialIcons name="flag" size={20} color={colors.gray5} />
                      <Text style={styles.messageActionText}>신고하기</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  dialogOverlay: {
    flex: 1,
    backgroundColor: colors.overlay30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pickerCard: {
    width: '100%',
    maxWidth: dialog.maxWidth,
    backgroundColor: colors.white,
    borderRadius: dialog.borderRadius,
    borderWidth: 1,
    borderColor: colors.gray2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dialogTitle: { ...typography.subhead3, color: colors.gray6 },
  groupList: { gap: spacing.sm },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
  },
  groupItemTextWrap: { gap: spacing.xxs },
  groupItemTitle: { ...typography.body1_2, color: colors.gray6 },
  groupItemMeta: { ...typography.body2_3, color: colors.gray4 },
  pressed: { opacity: interactionOpacity.pressed },
  emptyText: { ...typography.body1_3, color: colors.gray4, textAlign: 'center' },
  chatScreen: { flex: 1, backgroundColor: colors.background },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
    backgroundColor: colors.white,
  },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chatTitle: { ...typography.subhead4_1, color: colors.gray6 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  connectionDot: { width: 6, height: 6, borderRadius: 3 },
  connectionDotOn: { backgroundColor: colors.green },
  connectionDotOff: { backgroundColor: colors.gray3 },
  connectionText: { ...typography.body2_3, color: colors.gray4 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  stateText: { ...typography.body1_3, color: colors.gray4, textAlign: 'center' },
  retryButton: {
    minHeight: buttonSize.icon,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { ...typography.body2_2, color: colors.white },
  messageList: { flex: 1 },
  messageContent: { padding: spacing.md, gap: spacing.sm },
  messageContentEmpty: { flexGrow: 1, justifyContent: 'center' },
  loadingOlderText: {
    ...typography.body2_3,
    color: colors.gray4,
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
  messageRow: { alignItems: 'flex-start', gap: spacing.xxs },
  messageRowMine: { alignItems: 'flex-end' },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: '82%',
  },
  authorButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.gray1,
  },
  avatarImage: { width: '100%', height: '100%' },
  authorText: { ...typography.body2_2, color: colors.gray5 },
  bubble: { maxWidth: '82%', borderRadius: radius.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  bubbleMine: { backgroundColor: colors.subbrown3 },
  bubbleOther: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray2 },
  bubbleText: { ...typography.body1_3, color: colors.gray6 },
  messageTime: { ...typography.body2_3, color: colors.gray4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray2,
    backgroundColor: colors.white,
  },
  chatInput: {
    flex: 1,
    minHeight: buttonSize.field,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    ...typography.body1_3,
    color: colors.gray6,
  },
  sendButton: {
    width: buttonSize.field,
    height: buttonSize.field,
    borderRadius: radius.pill,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: interactionOpacity.disabled },
  profileCard: {
    width: '100%',
    maxWidth: dialog.maxWidth,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: dialog.borderRadius,
    backgroundColor: colors.white,
  },
  inlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    zIndex: layers.overlay,
    elevation: layers.overlay,
  },
  messageActionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay30,
    justifyContent: 'flex-end',
    zIndex: layers.overlay,
    elevation: layers.overlay,
  },
  messageActionSheet: {
    width: '100%',
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  messageActionTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
    marginBottom: spacing.xs,
  },
  messageActionItem: {
    minHeight: buttonSize.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray2,
  },
  messageActionText: { ...typography.body1_3, color: colors.gray6 },
  profileHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileTitle: { ...typography.subhead4_1, color: colors.gray6 },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: colors.gray1,
  },
  profileNickname: { ...typography.subhead4_1, color: colors.gray6 },
  profileLabel: { ...typography.body2_3, color: colors.gray4, marginBottom: -spacing.sm },
  profileActionRow: { width: '100%', flexDirection: 'row', gap: spacing.sm },
  profileReportButton: {
    flex: 1,
    minHeight: buttonSize.field,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileReportButtonText: { ...typography.body1, color: colors.primary1 },
  profileButton: {
    flex: 1,
    minHeight: buttonSize.field,
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonText: { ...typography.body1, color: colors.white },
});
