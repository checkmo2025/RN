# UTM 홍보 링크 모음

## 운영 기준

- 기준 URL: `https://www.checkmo.co.kr/stories/21`
- 캠페인: `story21_202607`
- `utm_source`: 유입 플랫폼
- `utm_medium`: 홍보 방식
- `utm_campaign`: 동일한 홍보 캠페인
- `utm_content`: 구체적인 방, 게시 위치 또는 소재

같은 캠페인을 여러 곳에 공유할 때 `source`, `medium`, `campaign`은 일관되게 유지하고, 실제 공유 위치는 `utm_content`로 구분한다.

## 카카오톡

### 카톡방 A

```text
https://www.checkmo.co.kr/stories/21?utm_source=kakao&utm_medium=community&utm_campaign=story21_202607&utm_content=room_a
```

### 카톡방 B

```text
https://www.checkmo.co.kr/stories/21?utm_source=kakao&utm_medium=community&utm_campaign=story21_202607&utm_content=room_b
```

### 카톡방 C

```text
https://www.checkmo.co.kr/stories/21?utm_source=kakao&utm_medium=community&utm_campaign=story21_202607&utm_content=room_c
```

### 카톡방 D

```text
https://www.checkmo.co.kr/stories/21?utm_source=kakao&utm_medium=community&utm_campaign=story21_202607&utm_content=room_d
```

### 카톡방 E

```text
https://www.checkmo.co.kr/stories/21?utm_source=kakao&utm_medium=community&utm_campaign=story21_202607&utm_content=room_e
```

방의 성격을 알고 있다면 `room_a` 같은 임시 이름 대신 다음처럼 의미 있는 값을 사용한다.

- `university_bookclub`
- `church_youth`
- `checkmo_members`
- `friends`
- `startup_community`

## 기타 홍보 채널

### 인스타그램 프로필

```text
https://www.checkmo.co.kr/stories/21?utm_source=instagram&utm_medium=social&utm_campaign=story21_202607&utm_content=profile
```

### 인스타그램 스토리

```text
https://www.checkmo.co.kr/stories/21?utm_source=instagram&utm_medium=social&utm_campaign=story21_202607&utm_content=story
```

### 인스타그램 DM

```text
https://www.checkmo.co.kr/stories/21?utm_source=instagram&utm_medium=dm&utm_campaign=story21_202607&utm_content=direct_message
```

### 네이버 카페

```text
https://www.checkmo.co.kr/stories/21?utm_source=naver_cafe&utm_medium=community&utm_campaign=story21_202607&utm_content=post
```

### 디스코드

```text
https://www.checkmo.co.kr/stories/21?utm_source=discord&utm_medium=community&utm_campaign=story21_202607&utm_content=channel
```

### 슬랙

```text
https://www.checkmo.co.kr/stories/21?utm_source=slack&utm_medium=community&utm_campaign=story21_202607&utm_content=channel
```

### 문자 메시지

```text
https://www.checkmo.co.kr/stories/21?utm_source=sms&utm_medium=message&utm_campaign=story21_202607&utm_content=invite
```

### 이메일

```text
https://www.checkmo.co.kr/stories/21?utm_source=email&utm_medium=newsletter&utm_campaign=story21_202607&utm_content=main_button
```

### 오프라인 QR 코드

```text
https://www.checkmo.co.kr/stories/21?utm_source=offline&utm_medium=qr&utm_campaign=story21_202607&utm_content=poster
```

## GA4 확인 방법

1. `보고서 > 비즈니스 목표 > 리드 생성 > 트래픽 획득`으로 이동한다.
2. 기본 측정기준을 `세션 소스/매체`로 변경한다.
3. 보조 측정기준으로 `세션 캠페인`을 추가한다.
4. 세부 공유 위치를 비교하려면 `세션 수동 광고 콘텐츠`를 추가한다.
5. 확인하려는 공유 날짜가 포함되도록 보고서 기간을 설정한다.

예를 들어 카톡방 A에서 발생한 유입은 다음 값으로 나타난다.

- 세션 소스/매체: `kakao / community`
- 세션 캠페인: `story21_202607`
- 세션 수동 광고 콘텐츠: `room_a`
