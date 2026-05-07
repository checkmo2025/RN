import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Meeting: { openClubId?: number | string } | undefined;
  Story: undefined;
  News: undefined;
  My: { openMyTab?: string } | undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  UserProfile: { memberNickname?: string; fromScreen?: string };
};
