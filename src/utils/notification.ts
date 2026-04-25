import type { NotificationItem, NotificationType } from '../services/api/notificationApi';

type NotificationTarget = {
  screen: 'Story' | 'Meeting' | 'My' | 'UserProfile';
  params?: Record<string, unknown>;
};

function withSuffix(name: string) {
  const trimmed = name.trim();
  return trimmed ? `${trimmed}님` : '누군가';
}

function toMemberNickname(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function formatNotificationText(type: NotificationType, displayName: string): string {
  const actor = withSuffix(displayName);

  switch (type) {
    case 'LIKE':
      return `${actor}이 좋아요를 눌렀습니다.`;
    case 'COMMENT':
      return `${actor}이 댓글을 남겼습니다.`;
    case 'FOLLOW':
      return `${actor}이 회원님을 구독했습니다.`;
    case 'JOIN_CLUB':
      return `${actor}이 모임에 가입했습니다.`;
    case 'CLUB_MEETING_CREATED':
      return `${actor}이 모임 일정을 등록했습니다.`;
    case 'CLUB_NOTICE_CREATED':
      return `${actor}이 공지사항을 등록했습니다.`;
    default:
      return `${actor}의 알림이 도착했습니다.`;
  }
}

export function resolveNotificationTarget(notification: NotificationItem): NotificationTarget {
  switch (notification.notificationType) {
    case 'LIKE':
    case 'COMMENT':
      return {
        screen: 'Story',
        params:
          typeof notification.domainId === 'number'
            ? { openStoryId: notification.domainId }
            : undefined,
      };
    case 'FOLLOW': {
      const memberNickname = toMemberNickname(notification.displayName);
      if (memberNickname) {
        return {
          screen: 'UserProfile',
          params: { memberNickname, fromScreen: 'My' },
        };
      }
      return {
        screen: 'My',
        params: { openFollowTab: 'FOLLOWER' },
      };
    }
    case 'JOIN_CLUB':
    case 'CLUB_MEETING_CREATED':
    case 'CLUB_NOTICE_CREATED': {
      const clubId = notification.domainId;
      return {
        screen: typeof clubId === 'number' ? 'Meeting' : 'My',
        params:
          typeof clubId === 'number'
            ? { openClubId: clubId }
            : { openMyTab: 'ALARM' },
      };
    }
    default:
      return { screen: 'My', params: { openMyTab: 'ALARM' } };
  }
}
