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
