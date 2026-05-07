import { Image } from 'react-native';

const resolveSvgUri = (asset: number) => Image.resolveAssetSource(asset).uri;

export const LOGO_PRIMARY_URI = resolveSvgUri(
  require('../../assets/icons/logo_primary.svg'),
);
export const MOBILE_HEADER_LOGO_URI = resolveSvgUri(
  require('../../assets/mobile-header-logo.svg'),
);

export const HEADER_SEARCH_URI = resolveSvgUri(
  require('../../assets/header/header-search.svg'),
);
export const HEADER_ALARM_URI = resolveSvgUri(
  require('../../assets/header/header-alarm.svg'),
);
export const SEARCH_DARK_URI = resolveSvgUri(
  require('../../assets/icons/search.svg'),
);
export const PENCIL_ICON_URI = resolveSvgUri(
  require('../../assets/icons/pencil_icon.svg'),
);

export const BOOKSTORY_LIKE_URI = resolveSvgUri(
  require('../../assets/book-story/bookstory-like.svg'),
);
export const BOOKSTORY_COMMENT_URI = resolveSvgUri(
  require('../../assets/book-story/bookstory-comment.svg'),
);

export const MYPAGE_SETTING_URI = resolveSvgUri(
  require('../../assets/mypage/mypage-setting.svg'),
);
export const MYPAGE_SETTING_PROFILE_URI = resolveSvgUri(
  require('../../assets/mypage/setting-profile.svg'),
);
export const MYPAGE_SETTING_SERVICE_URI = resolveSvgUri(
  require('../../assets/mypage/setting-service.svg'),
);
export const MYPAGE_SETTING_OTHER_URI = resolveSvgUri(
  require('../../assets/mypage/setting-other.svg'),
);
export const DEFAULT_PROFILE_IMAGE_URI = resolveSvgUri(
  require('../../assets/mypage/image_profile1.svg'),
);

export const CHAT_ICON_URI = resolveSvgUri(
  require('../../assets/icons/Chat.svg'),
);

export const TAB_ICON_URIS = {
  Home: {
    focused: resolveSvgUri(require('../../assets/icons/after_home.svg')),
    unfocused: resolveSvgUri(require('../../assets/icons/before_home.svg')),
  },
  Meeting: {
    focused: resolveSvgUri(require('../../assets/icons/after_group.svg')),
    unfocused: resolveSvgUri(require('../../assets/icons/before_group.svg')),
  },
  Story: {
    focused: resolveSvgUri(require('../../assets/icons/after_story.svg')),
    unfocused: resolveSvgUri(require('../../assets/icons/before_story.svg')),
  },
  News: {
    focused: resolveSvgUri(require('../../assets/icons/after_news.svg')),
    unfocused: resolveSvgUri(require('../../assets/icons/before_news.svg')),
  },
  My: {
    focused: resolveSvgUri(require('../../assets/icons/after_my.svg')),
    unfocused: resolveSvgUri(require('../../assets/icons/before_my.svg')),
  },
} as const;
