# Icon/Favicon Usage Report

- 생성 시각: `2026-04-27 20:11:34 KST`
- 스캔 범위: `checkmo_rn` (제외: `checkmo_fe2/**`, `checkmo_be 2/**`, `node_modules/**`)
- 대상: `assets/icons/*`, `assets/*icon*|*favicon*`, `ios AppIcon`, `android ic_launcher*`
- 매칭 방식: 정적 문자열 검색(`/<파일명>` + 플랫폼 리소스명 fallback)

## Update Note (2026-05-07)

- 본 문서는 2026-04-27 스냅샷이며, 이후 에셋 정리 반영 전 기준입니다.
- 웹 파비콘 경로는 `app.json` 기준 `assets/favicon-checkmo.png`로 변경되었고, 기존 `assets/favicon.png`는 삭제되었습니다.
- `assets/navigation/navi-*.svg`와 `assets/write-floating.svg`는 삭제되었습니다.
- `assets/icons/*`는 추후 유지보수를 위해 삭제하지 않고 유지합니다.

## Summary

- 전체 대상 파일: **150**
- 사용 중: **36**
- 미사용: **114**
- 여러 파일에서 사용(2+): **7**
- 단일 파일에서 사용(1): **29**

## Category Summary

| Category | Total | Used | Unused |
|---|---:|---:|---:|
| android launcher | 18 | 18 | 0 |
| assets icon/fav | 5 | 3 | 2 |
| assets/icons | 125 | 14 | 111 |
| ios AppIcon | 2 | 1 | 1 |

## Multi-use Files (2+ reference files)

| File Path | File Name | Category | Ref Files | Ref Hits | References |
|---|---|---|---:|---:|---|
| `android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.webp` | `ic_launcher_foreground.webp` | android launcher | 2 | 2 | `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml:4|android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml:4` |
| `android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.webp` | `ic_launcher_foreground.webp` | android launcher | 2 | 2 | `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml:4|android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml:4` |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.webp` | `ic_launcher_foreground.webp` | android launcher | 2 | 2 | `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml:4|android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml:4` |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.webp` | `ic_launcher_foreground.webp` | android launcher | 2 | 2 | `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml:4|android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml:4` |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp` | `ic_launcher_foreground.webp` | android launcher | 2 | 2 | `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml:4|android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml:4` |
| `assets/icons/logo_primary.svg` | `logo_primary.svg` | assets/icons | 3 | 3 | `src/components/common/BookFlipLoadingScreen.tsx:10|src/screens/AuthFlowScreen.tsx:78|src/screens/MeetingScreen.tsx:222` |
| `assets/icons/pencil_icon.svg` | `pencil_icon.svg` | assets/icons | 2 | 2 | `src/components/common/AppHeader.tsx:69|src/screens/StoryScreen.tsx:306` |

## Single-use Files (1 reference file)

| File Path | File Name | Category | Ref Hits | Reference |
|---|---|---|---:|---|
| `android/app/src/main/res/drawable/ic_launcher_background.xml` | `ic_launcher_background.xml` | android launcher | 1 | `android/app/src/main/res/values/styles.xml:9` |
| `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` | `ic_launcher.xml` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml` | `ic_launcher_round.xml` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher.webp` | `ic_launcher.webp` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher_round.webp` | `ic_launcher_round.webp` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-mdpi/ic_launcher.webp` | `ic_launcher.webp` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-mdpi/ic_launcher_round.webp` | `ic_launcher_round.webp` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher.webp` | `ic_launcher.webp` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp` | `ic_launcher_round.webp` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.webp` | `ic_launcher.webp` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp` | `ic_launcher_round.webp` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp` | `ic_launcher.webp` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp` | `ic_launcher_round.webp` | android launcher | 1 | `android/app/src/main/AndroidManifest.xml:15` |
| `assets/favicon.png` | `favicon.png` | assets icon/fav | 1 | `app.json:37` |
| `assets/icon-checkmo.png` | `icon-checkmo.png` | assets icon/fav | 2 | `app.json:8,27` |
| `assets/icons/Chat.svg` | `Chat.svg` | assets/icons | 1 | `src/screens/MeetingScreen.tsx:225` |
| `assets/icons/after_group.svg` | `after_group.svg` | assets/icons | 1 | `src/navigation/BottomTabs.tsx:27` |
| `assets/icons/after_home.svg` | `after_home.svg` | assets/icons | 1 | `src/navigation/BottomTabs.tsx:19` |
| `assets/icons/after_my.svg` | `after_my.svg` | assets/icons | 1 | `src/navigation/BottomTabs.tsx:51` |
| `assets/icons/after_news.svg` | `after_news.svg` | assets/icons | 1 | `src/navigation/BottomTabs.tsx:43` |
| `assets/icons/after_story.svg` | `after_story.svg` | assets/icons | 1 | `src/navigation/BottomTabs.tsx:35` |
| `assets/icons/before_group.svg` | `before_group.svg` | assets/icons | 1 | `src/navigation/BottomTabs.tsx:30` |
| `assets/icons/before_home.svg` | `before_home.svg` | assets/icons | 1 | `src/navigation/BottomTabs.tsx:22` |
| `assets/icons/before_my.svg` | `before_my.svg` | assets/icons | 1 | `src/navigation/BottomTabs.tsx:54` |
| `assets/icons/before_news.svg` | `before_news.svg` | assets/icons | 1 | `src/navigation/BottomTabs.tsx:46` |
| `assets/icons/before_story.svg` | `before_story.svg` | assets/icons | 1 | `src/navigation/BottomTabs.tsx:38` |
| `assets/icons/search.svg` | `search.svg` | assets/icons | 1 | `src/components/common/AppHeader.tsx:63` |
| `assets/splash-icon.png` | `splash-icon.png` | assets icon/fav | 1 | `app.json:12` |
| `ios/app/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` | `App-Icon-1024x1024@1x.png` | ios AppIcon | 1 | `ios/app/Images.xcassets/AppIcon.appiconset/Contents.json:4` |

## Unused Files

| File Path | File Name | Category |
|---|---|---|
| `assets/adaptive-icon.png` | `adaptive-icon.png` | assets icon/fav |
| `assets/icon.png` | `icon.png` | assets icon/fav |
| `assets/icons/Arrow-Right2.svg` | `Arrow-Right2.svg` | assets/icons |
| `assets/icons/ArrowDown.svg` | `ArrowDown.svg` | assets/icons |
| `assets/icons/ArrowLeft.svg` | `ArrowLeft.svg` | assets/icons |
| `assets/icons/ArrowLeft2.svg` | `ArrowLeft2.svg` | assets/icons |
| `assets/icons/ArrowRight.svg` | `ArrowRight.svg` | assets/icons |
| `assets/icons/ArrowRight2.svg` | `ArrowRight2.svg` | assets/icons |
| `assets/icons/ArrowThickLeft.svg` | `ArrowThickLeft.svg` | assets/icons |
| `assets/icons/ArrowThickRight.svg` | `ArrowThickRight.svg` | assets/icons |
| `assets/icons/ArrowTop.svg` | `ArrowTop.svg` | assets/icons |
| `assets/icons/BookImgSample.svg` | `BookImgSample.svg` | assets/icons |
| `assets/icons/BrownCheck.svg` | `BrownCheck.svg` | assets/icons |
| `assets/icons/Calendar.svg` | `Calendar.svg` | assets/icons |
| `assets/icons/Category.svg` | `Category.svg` | assets/icons |
| `assets/icons/CheckBox_No.svg` | `CheckBox_No.svg` | assets/icons |
| `assets/icons/CheckBox_Yes.svg` | `CheckBox_Yes.svg` | assets/icons |
| `assets/icons/CheckOff.svg` | `CheckOff.svg` | assets/icons |
| `assets/icons/CheckOn.svg` | `CheckOn.svg` | assets/icons |
| `assets/icons/ClubDefaultImg.svg` | `ClubDefaultImg.svg` | assets/icons |
| `assets/icons/Document.svg` | `Document.svg` | assets/icons |
| `assets/icons/Edit_icon.svg` | `Edit_icon.svg` | assets/icons |
| `assets/icons/GreenCheck.svg` | `GreenCheck.svg` | assets/icons |
| `assets/icons/Hide.svg` | `Hide.svg` | assets/icons |
| `assets/icons/Location2.svg` | `Location2.svg` | assets/icons |
| `assets/icons/Lock.svg` | `Lock.svg` | assets/icons |
| `assets/icons/Logout.svg` | `Logout.svg` | assets/icons |
| `assets/icons/Notification2.svg` | `Notification2.svg` | assets/icons |
| `assets/icons/Notification3.svg` | `Notification3.svg` | assets/icons |
| `assets/icons/Polygon.svg` | `Polygon.svg` | assets/icons |
| `assets/icons/Polygon6.svg` | `Polygon6.svg` | assets/icons |
| `assets/icons/RadioOff.svg` | `RadioOff.svg` | assets/icons |
| `assets/icons/RadioOn.svg` | `RadioOn.svg` | assets/icons |
| `assets/icons/Send.svg` | `Send.svg` | assets/icons |
| `assets/icons/Setting.svg` | `Setting.svg` | assets/icons |
| `assets/icons/Setting_Profile.svg` | `Setting_Profile.svg` | assets/icons |
| `assets/icons/Setting_Smile_emoji.svg` | `Setting_Smile_emoji.svg` | assets/icons |
| `assets/icons/Setting_icon.svg` | `Setting_icon.svg` | assets/icons |
| `assets/icons/Star.svg` | `Star.svg` | assets/icons |
| `assets/icons/Swap.svg` | `Swap.svg` | assets/icons |
| `assets/icons/Unlock.svg` | `Unlock.svg` | assets/icons |
| `assets/icons/Vector.svg` | `Vector.svg` | assets/icons |
| `assets/icons/accept.svg` | `accept.svg` | assets/icons |
| `assets/icons/add_story.svg` | `add_story.svg` | assets/icons |
| `assets/icons/admin.svg` | `admin.svg` | assets/icons |
| `assets/icons/after_category.svg` | `after_category.svg` | assets/icons |
| `assets/icons/ant-design_more-outlined.svg` | `ant-design_more-outlined.svg` | assets/icons |
| `assets/icons/back.svg` | `back.svg` | assets/icons |
| `assets/icons/before_category.svg` | `before_category.svg` | assets/icons |
| `assets/icons/bookcase_arrow.svg` | `bookcase_arrow.svg` | assets/icons |
| `assets/icons/booksample.svg` | `booksample.svg` | assets/icons |
| `assets/icons/bookshelf.svg` | `bookshelf.svg` | assets/icons |
| `assets/icons/bookstorycard.svg` | `bookstorycard.svg` | assets/icons |
| `assets/icons/cancle_button.svg` | `cancle_button.svg` | assets/icons |
| `assets/icons/comment.svg` | `comment.svg` | assets/icons |
| `assets/icons/dark_close.svg` | `dark_close.svg` | assets/icons |
| `assets/icons/dark_search.svg` | `dark_search.svg` | assets/icons |
| `assets/icons/default_profile_1.svg` | `default_profile_1.svg` | assets/icons |
| `assets/icons/default_profile_2.svg` | `default_profile_2.svg` | assets/icons |
| `assets/icons/delete.svg` | `delete.svg` | assets/icons |
| `assets/icons/duplicate.svg` | `duplicate.svg` | assets/icons |
| `assets/icons/edit2.svg` | `edit2.svg` | assets/icons |
| `assets/icons/empty_star.svg` | `empty_star.svg` | assets/icons |
| `assets/icons/file.svg` | `file.svg` | assets/icons |
| `assets/icons/full_star.svg` | `full_star.svg` | assets/icons |
| `assets/icons/globe.svg` | `globe.svg` | assets/icons |
| `assets/icons/googleLogo.svg` | `googleLogo.svg` | assets/icons |
| `assets/icons/gray_heart.svg` | `gray_heart.svg` | assets/icons |
| `assets/icons/gray_share.svg` | `gray_share.svg` | assets/icons |
| `assets/icons/group_home.svg` | `group_home.svg` | assets/icons |
| `assets/icons/groups_3User.svg` | `groups_3User.svg` | assets/icons |
| `assets/icons/icon_alert.svg` | `icon_alert.svg` | assets/icons |
| `assets/icons/icon_minus_1.svg` | `icon_minus_1.svg` | assets/icons |
| `assets/icons/icon_plus.svg` | `icon_plus.svg` | assets/icons |
| `assets/icons/icon_plus_1.svg` | `icon_plus_1.svg` | assets/icons |
| `assets/icons/image.svg` | `image.svg` | assets/icons |
| `assets/icons/inquiry.svg` | `inquiry.svg` | assets/icons |
| `assets/icons/kakaoImage.svg` | `kakaoImage.svg` | assets/icons |
| `assets/icons/kakaoLogo.svg` | `kakaoLogo.svg` | assets/icons |
| `assets/icons/leader.svg` | `leader.svg` | assets/icons |
| `assets/icons/light_close.svg` | `light_close.svg` | assets/icons |
| `assets/icons/link.svg` | `link.svg` | assets/icons |
| `assets/icons/logo.svg` | `logo.svg` | assets/icons |
| `assets/icons/logo2.svg` | `logo2.svg` | assets/icons |
| `assets/icons/member.svg` | `member.svg` | assets/icons |
| `assets/icons/menu_dots.svg` | `menu_dots.svg` | assets/icons |
| `assets/icons/mypage_button.svg` | `mypage_button.svg` | assets/icons |
| `assets/icons/naverLogo.svg` | `naverLogo.svg` | assets/icons |
| `assets/icons/news_sample.svg` | `news_sample.svg` | assets/icons |
| `assets/icons/news_sample4.svg` | `news_sample4.svg` | assets/icons |
| `assets/icons/next.svg` | `next.svg` | assets/icons |
| `assets/icons/notification.svg` | `notification.svg` | assets/icons |
| `assets/icons/plus.svg` | `plus.svg` | assets/icons |
| `assets/icons/profile.svg` | `profile.svg` | assets/icons |
| `assets/icons/profile10.svg` | `profile10.svg` | assets/icons |
| `assets/icons/profile2.svg` | `profile2.svg` | assets/icons |
| `assets/icons/profile3.svg` | `profile3.svg` | assets/icons |
| `assets/icons/profile4.svg` | `profile4.svg` | assets/icons |
| `assets/icons/profile5.svg` | `profile5.svg` | assets/icons |
| `assets/icons/public.svg` | `public.svg` | assets/icons |
| `assets/icons/quill_pin.svg` | `quill_pin.svg` | assets/icons |
| `assets/icons/red_heart.svg` | `red_heart.svg` | assets/icons |
| `assets/icons/reply.svg` | `reply.svg` | assets/icons |
| `assets/icons/reply2.svg` | `reply2.svg` | assets/icons |
| `assets/icons/report.svg` | `report.svg` | assets/icons |
| `assets/icons/search_light.svg` | `search_light.svg` | assets/icons |
| `assets/icons/share.svg` | `share.svg` | assets/icons |
| `assets/icons/thick_search.svg` | `thick_search.svg` | assets/icons |
| `assets/icons/to_aladin.svg` | `to_aladin.svg` | assets/icons |
| `assets/icons/triangle.svg` | `triangle.svg` | assets/icons |
| `assets/icons/vercel.svg` | `vercel.svg` | assets/icons |
| `assets/icons/vote.svg` | `vote.svg` | assets/icons |
| `assets/icons/window.svg` | `window.svg` | assets/icons |
| `ios/app/Images.xcassets/AppIcon.appiconset/Contents.json` | `Contents.json` | ios AppIcon |
