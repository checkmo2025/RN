import type { ImageSourcePropType } from 'react-native';

export type OnboardingSlide = {
  key: string;
  source: ImageSourcePropType;
  accessibilityLabel: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: 'home',
    source: require('../../assets/onboarding/onboarding-home.png'),
    accessibilityLabel: '책모 홈 온보딩',
  },
  {
    key: 'club',
    source: require('../../assets/onboarding/onboarding-club.png'),
    accessibilityLabel: '모임 온보딩',
  },
  {
    key: 'bookstory',
    source: require('../../assets/onboarding/onboarding-bookstory.png'),
    accessibilityLabel: '책 이야기 온보딩',
  },
  {
    key: 'news',
    source: require('../../assets/onboarding/onboarding-news.png'),
    accessibilityLabel: '소식 온보딩',
  },
  {
    key: 'search',
    source: require('../../assets/onboarding/onboarding-search.png'),
    accessibilityLabel: '검색 온보딩',
  },
];

export const CLUB_ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: 'club-home',
    source: require('../../assets/onboarding/club/onboarding-club-home.png'),
    accessibilityLabel: '모임 홈 안내',
  },
  {
    key: 'club-notice',
    source: require('../../assets/onboarding/club/onboarding-club-notice.png'),
    accessibilityLabel: '모임 공지사항 안내',
  },
  {
    key: 'club-book',
    source: require('../../assets/onboarding/club/onboarding-club-book.png'),
    accessibilityLabel: '모임 책장 안내',
  },
  {
    key: 'club-topic',
    source: require('../../assets/onboarding/club/onboarding-club-topic.png'),
    accessibilityLabel: '모임 책장 발제 안내',
  },
  {
    key: 'club-comment',
    source: require('../../assets/onboarding/club/onboarding-club-comment.png'),
    accessibilityLabel: '모임 책장 한줄평 안내',
  },
  {
    key: 'club-meeting',
    source: require('../../assets/onboarding/club/onboarding-club-meeting.png'),
    accessibilityLabel: '모임 책장 정기모임 안내',
  },
  {
    key: 'club-admin',
    source: require('../../assets/onboarding/club/onboarding-club-admin.png'),
    accessibilityLabel: '모임 관리 안내',
  },
];
