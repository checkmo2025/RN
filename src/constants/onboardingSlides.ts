import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

import { colors } from '../theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type OnboardingSlide = {
  key: string;
  icon: MaterialIconName;
  accent: string;
  title: string;
  body: string;
  /** 추후 하이브리드 비주얼(실제 스샷+콜아웃) 교체 자리. 지금은 placeholder. */
  imagePlaceholderLabel: string;
};

// 계획: docs/documents/onboarding-plan.md (5장, 헤더는 홈에 흡수)
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: 'home',
    icon: 'home',
    accent: colors.primary1,
    title: '책모에 오신 걸 환영해요',
    body: '소식·추천 독자·책이야기를 한 화면에서. 상단 🔍 검색으로 책과 사람을 찾고, 🔔에서 알림을 확인해요.',
    imagePlaceholderLabel: '홈 + 헤더(검색/알림) 스크린샷 자리',
  },
  {
    key: 'meeting',
    icon: 'groups',
    accent: colors.primary2,
    title: '마음 맞는 독서모임 찾기',
    body: '모임을 탐색하고 가입 신청해요. 공지·책장·발제·정기모임까지 모임 안에서 함께해요.',
    imagePlaceholderLabel: '모임 목록/상세 스크린샷 자리',
  },
  {
    key: 'story',
    icon: 'auto-stories',
    accent: colors.subbrown1,
    title: '내 책 감상을 기록하고 나누기',
    body: '책을 골라 글을 쓰고, 좋아요·댓글·구독으로 다른 독자와 소통해요.',
    imagePlaceholderLabel: '책이야기 피드/작성 스크린샷 자리',
  },
  {
    key: 'news',
    icon: 'campaign',
    accent: colors.primary3,
    title: '책모의 새 소식과 추천 도서',
    body: '책모 공식 소식과 추천 책을 한곳에서 확인해요.',
    imagePlaceholderLabel: '소식 캐러셀/목록 스크린샷 자리',
  },
  {
    key: 'mypage',
    icon: 'person',
    accent: colors.subbrown2,
    title: '내 활동을 한눈에',
    body: '프로필·서재·내 모임·알림·설정을 마이페이지에서 관리해요.',
    imagePlaceholderLabel: '마이페이지 스크린샷 자리',
  },
];
