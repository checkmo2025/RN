export type DeepLinkTarget =
  | {
      screen: 'Home';
    }
  | {
      screen: 'Story';
      params?: {
        openStoryId: number;
        openStoryFocus?: 'comments';
      };
    }
  | {
      screen: 'Meeting';
      params?: {
        openClubId: number;
        openMeetingId?: number;
        openNoticeId?: number;
      };
    }
  | {
      screen: 'News';
      params?: {
        openNewsId: number;
      };
    }
  | {
      screen: 'My';
      params?: {
        openMyTab?: string;
        openFollowTab?: 'FOLLOWER' | 'FOLLOWING';
      };
    }
  | {
      screen: 'UserProfile';
      params: {
        memberNickname: string;
        fromScreen: 'DeepLink';
      };
    };

const WEB_LINK_HOSTS = new Set(['checkmo.co.kr', 'www.checkmo.co.kr']);
const APP_SCHEME = 'checkmo:';

function parsePositiveIntSegment(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizePathSegments(url: URL): string[] | null {
  if (url.protocol === 'https:') {
    if (!WEB_LINK_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url.pathname.split('/').filter(Boolean);
  }

  if (url.protocol === APP_SCHEME) {
    const host = url.hostname ? [url.hostname] : [];
    const path = url.pathname.split('/').filter(Boolean);
    return [...host, ...path];
  }

  return null;
}

function decodePathSegment(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

function parseStoryLink(segments: string[], searchParams: URLSearchParams): DeepLinkTarget | null {
  const [resource, id] = segments;
  if (resource !== 'stories' && resource !== 'book-stories') return null;

  const storyId = parsePositiveIntSegment(id);
  if (!storyId) return { screen: 'Story' };

  const focus = searchParams.get('focus') ?? searchParams.get('openStoryFocus');
  return {
    screen: 'Story',
    params: {
      openStoryId: storyId,
      ...(focus === 'comments' ? { openStoryFocus: 'comments' as const } : {}),
    },
  };
}

function parseMeetingLink(segments: string[]): DeepLinkTarget | null {
  const [resource, clubIdSegment, childResource, childIdSegment] = segments;
  if (resource !== 'groups' && resource !== 'clubs') return null;

  const clubId = parsePositiveIntSegment(clubIdSegment);
  if (!clubId) return { screen: 'Meeting' };

  const childId = parsePositiveIntSegment(childIdSegment);
  return {
    screen: 'Meeting',
    params: {
      openClubId: clubId,
      ...(childResource === 'meetings' && childId ? { openMeetingId: childId } : {}),
      ...(childResource === 'notice' && childId ? { openNoticeId: childId } : {}),
      ...(childResource === 'notices' && childId ? { openNoticeId: childId } : {}),
    },
  };
}

function parseNewsLink(segments: string[]): DeepLinkTarget | null {
  const [resource, id] = segments;
  if (resource !== 'news') return null;

  const newsId = parsePositiveIntSegment(id);
  if (!newsId) return { screen: 'News' };

  return {
    screen: 'News',
    params: { openNewsId: newsId },
  };
}

function parseProfileLink(segments: string[]): DeepLinkTarget | null {
  const [resource, nicknameSegment, childResource] = segments;
  if (resource !== 'profile' && resource !== 'members') return null;

  if (!nicknameSegment || nicknameSegment === 'mypage' || nicknameSegment === 'me') {
    const followTab =
      childResource === 'follows'
        ? { openFollowTab: 'FOLLOWING' as const }
        : {};
    return { screen: 'My', params: followTab };
  }

  const memberNickname = decodePathSegment(nicknameSegment);
  if (!memberNickname) return null;

  return {
    screen: 'UserProfile',
    params: { memberNickname, fromScreen: 'DeepLink' },
  };
}

export function parseCheckmoDeepLink(rawUrl: string): DeepLinkTarget | null {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return null;

  let url: URL;
  try {
    url = new URL(trimmedUrl);
  } catch {
    return null;
  }

  const segments = normalizePathSegments(url);
  if (!segments || segments.length === 0) return null;

  return (
    parseStoryLink(segments, url.searchParams) ??
    parseMeetingLink(segments) ??
    parseNewsLink(segments) ??
    parseProfileLink(segments)
  );
}
