import { View } from 'react-native';
import Profile2Icon from '../../../assets/mypage/profile2.svg';

type Props = {
  size: number;
};

// 웹 회원가입의 기본 프로필(/profile2.svg)을 앱 번들에서 표시한다.
export function DefaultProfileAvatar({ size }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
      }}
    >
      <Profile2Icon width={size} height={size} />
    </View>
  );
}
