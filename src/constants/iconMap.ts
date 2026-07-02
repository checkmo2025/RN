import BookStoryCommentIcon from '../../assets/book-story/bookstory-comment.svg';
import BookStoryLikeIcon from '../../assets/book-story/bookstory-like.svg';
import HeaderAlarmIcon from '../../assets/header/header-alarm.svg';
import HeaderSearchIcon from '../../assets/header/header-search.svg';
import AfterGroupIcon from '../../assets/icons/after_group.svg';
import AfterHomeIcon from '../../assets/icons/after_home.svg';
import AfterMyIcon from '../../assets/icons/after_my.svg';
import AfterNewsIcon from '../../assets/icons/after_news.svg';
import AfterStoryIcon from '../../assets/icons/after_story.svg';
import BeforeGroupIcon from '../../assets/icons/before_group.svg';
import BeforeHomeIcon from '../../assets/icons/before_home.svg';
import BeforeMyIcon from '../../assets/icons/before_my.svg';
import BeforeNewsIcon from '../../assets/icons/before_news.svg';
import BeforeStoryIcon from '../../assets/icons/before_story.svg';
import ChatIcon from '../../assets/icons/Chat.svg';
import GoogleLogoIcon from '../../assets/icons/googleLogo.svg';
import KakaoLogoIcon from '../../assets/icons/kakaoLogo.svg';
import LogoPrimaryIcon from '../../assets/icons/logo_primary.svg';
import NaverLogoIcon from '../../assets/icons/naverLogo.svg';
import PencilIcon from '../../assets/icons/pencil_icon.svg';
import SearchDarkIcon from '../../assets/icons/search.svg';
import MobileHeaderLogoIcon from '../../assets/mobile-header-logo.svg';
import DefaultProfileImageIcon from '../../assets/mypage/image_profile1.svg';
import MyPageSettingIcon from '../../assets/mypage/mypage-setting.svg';
import MyPageSettingOtherIcon from '../../assets/mypage/setting-other.svg';
import MyPageSettingProfileIcon from '../../assets/mypage/setting-profile.svg';
import MyPageSettingServiceIcon from '../../assets/mypage/setting-service.svg';

export const LOGO_PRIMARY_URI = LogoPrimaryIcon;
export const MOBILE_HEADER_LOGO_URI = MobileHeaderLogoIcon;

// 소셜 로그인 브랜드 로고 (40x40 마크)
export const SOCIAL_GOOGLE_URI = GoogleLogoIcon;
export const SOCIAL_KAKAO_URI = KakaoLogoIcon;
export const SOCIAL_NAVER_URI = NaverLogoIcon;

export const HEADER_SEARCH_URI = HeaderSearchIcon;
export const HEADER_ALARM_URI = HeaderAlarmIcon;
export const SEARCH_DARK_URI = SearchDarkIcon;
export const PENCIL_ICON_URI = PencilIcon;

export const BOOKSTORY_LIKE_URI = BookStoryLikeIcon;
export const BOOKSTORY_COMMENT_URI = BookStoryCommentIcon;

export const MYPAGE_SETTING_URI = MyPageSettingIcon;
export const MYPAGE_SETTING_PROFILE_URI = MyPageSettingProfileIcon;
export const MYPAGE_SETTING_SERVICE_URI = MyPageSettingServiceIcon;
export const MYPAGE_SETTING_OTHER_URI = MyPageSettingOtherIcon;
export const DEFAULT_PROFILE_IMAGE_URI = DefaultProfileImageIcon;

export const CHAT_ICON_URI = ChatIcon;


export const TAB_ICON_URIS = {
  Home: {
    focused: AfterHomeIcon,
    unfocused: BeforeHomeIcon,
  },
  Meeting: {
    focused: AfterGroupIcon,
    unfocused: BeforeGroupIcon,
  },
  Story: {
    focused: AfterStoryIcon,
    unfocused: BeforeStoryIcon,
  },
  News: {
    focused: AfterNewsIcon,
    unfocused: BeforeNewsIcon,
  },
  My: {
    focused: AfterMyIcon,
    unfocused: BeforeMyIcon,
  },
} as const;
