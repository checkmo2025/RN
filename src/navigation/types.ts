import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Meeting:
    | {
        openClubId?: number | string;
        openMeetingId?: number | string;
        openNoticeId?: number | string;
      }
    | undefined;
  Story:
    | {
        openCompose?: boolean;
        composeBook?: unknown;
        openStoryId?: number | string;
        openStoryFocus?: 'comments';
        openDraftId?: number;
        openDraftTitle?: string;
        openDraftBody?: string;
        openDraftBook?: unknown;
      }
    | undefined;
  News: { openNewsId?: number | string } | undefined;
  My: { openMyTab?: string; openFollowTab?: 'FOLLOWER' | 'FOLLOWING' } | undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  UserProfile: { memberNickname?: string; fromScreen?: string };
};
