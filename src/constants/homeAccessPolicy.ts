export type HomeAccessor = 'GUEST' | 'MEMBER' | 'ADMIN_WEB';

export type HomeAccessPolicy = {
  accessor: HomeAccessor;
  canViewNewsCarousel: boolean;
  canViewRecommendedUsers: boolean;
  canUseRecommendedSubscribe: boolean;
  canViewBookStoryFeed: boolean;
  canUseBookStoryLike: boolean;
  canUseBookStorySubscribe: boolean;
  canManageNewsInApp: boolean;
};

const POLICY: Record<HomeAccessor, HomeAccessPolicy> = {
  GUEST: {
    accessor: 'GUEST',
    canViewNewsCarousel: true,
    canViewRecommendedUsers: false,
    canUseRecommendedSubscribe: false,
    canViewBookStoryFeed: true,
    canUseBookStoryLike: false,
    canUseBookStorySubscribe: false,
    canManageNewsInApp: false,
  },
  MEMBER: {
    accessor: 'MEMBER',
    canViewNewsCarousel: true,
    canViewRecommendedUsers: true,
    canUseRecommendedSubscribe: true,
    canViewBookStoryFeed: true,
    canUseBookStoryLike: true,
    canUseBookStorySubscribe: true,
    canManageNewsInApp: false,
  },
  ADMIN_WEB: {
    accessor: 'ADMIN_WEB',
    canViewNewsCarousel: true,
    canViewRecommendedUsers: true,
    canUseRecommendedSubscribe: true,
    canViewBookStoryFeed: true,
    canUseBookStoryLike: true,
    canUseBookStorySubscribe: true,
    canManageNewsInApp: false,
  },
};

export function resolveHomeAccessPolicy(options: {
  isLoggedIn: boolean;
  isAdminWeb?: boolean;
}): HomeAccessPolicy {
  if (options.isAdminWeb) return POLICY.ADMIN_WEB;
  return options.isLoggedIn ? POLICY.MEMBER : POLICY.GUEST;
}
