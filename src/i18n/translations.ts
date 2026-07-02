export const languageCodes = ['ko', 'en'] as const;

export type LanguageCode = (typeof languageCodes)[number];

export const languageOptions: Array<{
  code: LanguageCode;
  label: string;
  shortLabel: string;
}> = [
  { code: 'ko', label: '한국어 (KO)', shortLabel: 'KO' },
  { code: 'en', label: 'English (EN)', shortLabel: 'EN' },
];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (languageCodes as readonly string[]).includes(value);
}

const koMessages = {
  'app.authRequiredTitle': '해당 서비스는 로그인이 필요합니다!',
  'app.authRequiredDescription': '로그인 화면으로 이동합니다',
  'common.all': '전체',
  'common.back': '뒤로가기',
  'common.cancel': '취소',
  'common.loadingProfile': '프로필을 불러오는 중...',
  'tabs.home': '책모 홈',
  'tabs.clubs': '모임',
  'tabs.bookStory': '책 이야기',
  'tabs.news': '소식',
  'tabs.profile': '마이페이지',
  'profile.screenTitle': '마이페이지',
  'profile.needLoginName': '로그인이 필요해요',
  'profile.needLoginDescription': '로그인 후 마이페이지 기능을 이용할 수 있습니다.',
  'profile.subscribers': '구독자',
  'profile.subscribing': '구독중',
  'profile.interests': '관심 카테고리',
  'profile.writeStory': '책 이야기 쓰기',
  'profile.contactNews': '소식 문의하기',
  'profile.guestPrompt': '로그인 후 마이페이지 기능을 이용할 수 있습니다.',
  'profile.loginButton': '로그인하기',
  'profile.follow': '구독',
  'profile.following': '구독중',
  'profile.tabs.myStories': '내 책 이야기',
  'profile.tabs.bookshelf': '내 서재',
  'profile.tabs.clubs': '내 모임',
  'profile.tabs.alarms': '내 알림',
  'settings.sections.account': '계정 관리',
  'settings.sections.service': '서비스',
  'settings.sections.other': '기타',
  'settings.profileEdit': '프로필 편집',
  'settings.emailChange': '이메일 변경',
  'settings.passwordChange': '비밀번호 변경',
  'settings.withdrawal': '탈퇴/비활성화',
  'settings.myNews': '내 소식 관리',
  'settings.report': '신고 관리',
  'settings.blocked': '차단 관리',
  'settings.notifications': '알림 관리',
  'settings.contact': '고객센터/문의하기',
  'settings.terms': '이용약관',
  'settings.version': '버전 정보',
  'settings.language': '언어',
  'settings.logout': '로그아웃',
  'settings.logoutLoading': '로그아웃 중...',
  'settings.logoutAlertTitle': '로그아웃',
  'settings.logoutAlertMessage': '로그아웃하시겠습니까?',
  'settings.logoutSuccess': '로그아웃되었습니다.',
  'settings.logoutProgressTitle': '로그아웃중입니다',
  'settings.logoutProgressDescription': '홈화면으로 이동합니다',
  'settings.languageDescription': '앱에서 사용할 언어를 선택해주세요.',
  'settings.currentLanguage': '현재 언어',
  'settings.versionUpdatedAt': '버전 업데이트 날짜 : 2026.06.14',
} as const;

export type TranslationKey = keyof typeof koMessages;

const enMessages: Record<TranslationKey, string> = {
  'app.authRequiredTitle': 'Login required',
  'app.authRequiredDescription': 'Taking you to the login screen',
  'common.all': 'All',
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.loadingProfile': 'Loading profile...',
  'tabs.home': 'Checkmo Home',
  'tabs.clubs': 'Clubs',
  'tabs.bookStory': 'Book Story',
  'tabs.news': 'News',
  'tabs.profile': 'Profile',
  'profile.screenTitle': 'Profile',
  'profile.needLoginName': 'Login required',
  'profile.needLoginDescription': 'Log in to use Profile features.',
  'profile.subscribers': 'Subscribers',
  'profile.subscribing': 'Following',
  'profile.interests': 'Interests',
  'profile.writeStory': 'Write a book story',
  'profile.contactNews': 'Contact us',
  'profile.guestPrompt': 'Log in to use Profile features.',
  'profile.loginButton': 'Log in',
  'profile.follow': 'Subscribe',
  'profile.following': 'Subscribed',
  'profile.tabs.myStories': 'My Book Stories',
  'profile.tabs.bookshelf': 'My Bookshelf',
  'profile.tabs.clubs': 'My Clubs',
  'profile.tabs.alarms': 'My Alerts',
  'settings.sections.account': 'Account',
  'settings.sections.service': 'Service',
  'settings.sections.other': 'Other',
  'settings.profileEdit': 'Edit Profile',
  'settings.emailChange': 'Change Email',
  'settings.passwordChange': 'Change Password',
  'settings.withdrawal': 'Delete or Deactivate',
  'settings.myNews': 'Manage My News',
  'settings.report': 'Reports',
  'settings.blocked': 'Blocked Users',
  'settings.notifications': 'Notifications',
  'settings.contact': 'Contact Support',
  'settings.terms': 'Terms of Service',
  'settings.version': 'Version',
  'settings.language': 'Language',
  'settings.logout': 'Log out',
  'settings.logoutLoading': 'Logging out...',
  'settings.logoutAlertTitle': 'Log out',
  'settings.logoutAlertMessage': 'Do you want to log out?',
  'settings.logoutSuccess': 'You have been logged out.',
  'settings.logoutProgressTitle': 'Logging out',
  'settings.logoutProgressDescription': 'Taking you to Home',
  'settings.languageDescription': 'Choose the language to use in the app.',
  'settings.currentLanguage': 'Current language',
  'settings.versionUpdatedAt': 'Version updated on: 2026.06.14',
};

const messages: Record<LanguageCode, Record<TranslationKey, string>> = {
  ko: koMessages,
  en: enMessages,
};

export function translate(language: LanguageCode, key: TranslationKey): string {
  return messages[language][key] ?? koMessages[key] ?? key;
}
