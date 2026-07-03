import type { NotificationItem, NotificationType } from '../services/api/notificationApi';

type NotificationScreen = 'Story' | 'Meeting' | 'My' | 'UserProfile';

type NotificationTarget =
  | {
      screen: NotificationScreen;
      params?: Record<string, unknown>;
      toastMessage?: string;
    }
  | {
      screen?: undefined;
      params?: undefined;
      toastMessage: string;
    };

const DELETED_MEMBER_DISPLAY_NAME = '탈퇴한 회원';
const DELETED_CLUB_DISPLAY_NAME = '삭제된 클럽';

function withPersonSuffix(name: string) {
  const trimmed = name.trim();
  if (trimmed === DELETED_MEMBER_DISPLAY_NAME) return trimmed;
  return trimmed ? `${trimmed}님` : '누군가';
}

function withEnglishActor(name: string) {
  const trimmed = name.trim();
  return trimmed || 'Someone';
}

function toMemberNickname(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed;
}

function toClubDisplayName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === DELETED_CLUB_DISPLAY_NAME) return '삭제된 모임';
  return trimmed || '해당 모임';
}

function isValidId(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function missingTarget(message: string): NotificationTarget {
  return { toastMessage: message };
}

export function formatNotificationText(
  type: NotificationType,
  displayName: string,
  language: 'ko' | 'en' = 'ko',
): string {
  if (language === 'en') {
    const actor = withEnglishActor(displayName);
    const clubName = toClubDisplayName(displayName);
    switch (type) {
      case 'LIKE':
        return `${actor} liked your post.`;
      case 'COMMENT':
        return `${actor} left a comment.`;
      case 'FOLLOW':
        return `${actor} subscribed to you.`;
      case 'JOIN_CLUB':
        return `Your membership in ${clubName} was approved.`;
      case 'CLUB_MEETING_CREATED':
        return `${clubName} added a club meeting.`;
      case 'CLUB_NOTICE_CREATED':
        return `${clubName} posted a notice.`;
      default:
        return `${actor} sent you a notification.`;
    }
  }

  const actor = withPersonSuffix(displayName);
  const clubName = toClubDisplayName(displayName);

  switch (type) {
    case 'LIKE':
      return `${actor}이 좋아요를 눌렀습니다.`;
    case 'COMMENT':
      return `${actor}이 댓글을 남겼습니다.`;
    case 'FOLLOW':
      return `${actor}이 회원님을 구독했습니다.`;
    case 'JOIN_CLUB':
      return `${clubName} 가입이 승인되었습니다.`;
    case 'CLUB_MEETING_CREATED':
      return `${clubName}에 정기모임이 등록되었습니다.`;
    case 'CLUB_NOTICE_CREATED':
      return `${clubName}에 공지사항이 등록되었습니다.`;
    default:
      return `${actor}의 알림이 도착했습니다.`;
  }
}

export function resolveNotificationTarget(notification: NotificationItem): NotificationTarget {
  switch (notification.notificationType) {
    case 'LIKE':
    case 'COMMENT': {
      if (!isValidId(notification.domainId)) {
        return missingTarget('책이야기 정보를 찾을 수 없습니다.');
      }
      return {
        screen: 'Story',
        params: {
          openStoryId: notification.domainId,
          ...(notification.notificationType === 'COMMENT'
            ? { openStoryFocus: 'comments' }
            : {}),
        },
      };
    }
    case 'FOLLOW': {
      if (notification.displayName.trim() === DELETED_MEMBER_DISPLAY_NAME) {
        return missingTarget('탈퇴한 회원의 프로필은 볼 수 없습니다.');
      }
      const memberNickname = toMemberNickname(notification.displayName);
      if (memberNickname) {
        return {
          screen: 'UserProfile',
          params: { memberNickname, fromScreen: 'My' },
        };
      }
      return missingTarget('프로필 정보를 찾을 수 없습니다.');
    }
    case 'JOIN_CLUB': {
      const clubId = notification.domainId;
      if (notification.displayName.trim() === DELETED_CLUB_DISPLAY_NAME) {
        return missingTarget('삭제된 모임입니다.');
      }
      if (!isValidId(clubId)) {
        return missingTarget('모임 정보를 찾을 수 없습니다.');
      }
      return {
        screen: 'Meeting',
        params: { openClubId: clubId },
      };
    }
    case 'CLUB_MEETING_CREATED': {
      const clubId = notification.domainId;
      const meetingId = notification.sourceId;
      if (notification.displayName.trim() === DELETED_CLUB_DISPLAY_NAME) {
        return missingTarget('삭제된 모임입니다.');
      }
      if (!isValidId(clubId)) {
        return missingTarget('모임 정보를 찾을 수 없습니다.');
      }
      if (!isValidId(meetingId)) {
        return missingTarget('정기모임 정보를 찾을 수 없습니다.');
      }
      return {
        screen: 'Meeting',
        params: { openClubId: clubId, openMeetingId: meetingId },
      };
    }
    case 'CLUB_NOTICE_CREATED': {
      const clubId = notification.domainId;
      const noticeId = notification.sourceId;
      if (notification.displayName.trim() === DELETED_CLUB_DISPLAY_NAME) {
        return missingTarget('삭제된 모임입니다.');
      }
      if (!isValidId(clubId)) {
        return missingTarget('모임 정보를 찾을 수 없습니다.');
      }
      if (!isValidId(noticeId)) {
        return missingTarget('공지사항 정보를 찾을 수 없습니다.');
      }
      return {
        screen: 'Meeting',
        params: { openClubId: clubId, openNoticeId: noticeId },
      };
    }
    default:
      return { screen: 'My', params: { openMyTab: 'ALARM' } };
  }
}
