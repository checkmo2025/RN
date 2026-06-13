import { useId } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Rect } from 'react-native-svg';

type Props = {
  size: number;
};

// 기본 프로필 아바타.
// 외부 SVG를 SvgUri로 불러오면 기기에 따라 고정 크기(140px)/clip-path가
// 제대로 적용되지 않아 원 밖으로 삐져나오는 문제가 있어, react-native-svg
// 프리미티브로 직접 그려 viewBox 스케일링을 보장하고, 추가로 원형 overflow
// 클리핑 래퍼를 씌워 어떤 경우에도 원 밖으로 넘치지 않게 한다.
export function DefaultProfileAvatar({ size }: Props) {
  const rawId = useId();
  const clipPathId = `defaultAvatarClip-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 140 140" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <ClipPath id={clipPathId}>
            <Rect x={1} y={1} width={138} height={138} rx={69} />
          </ClipPath>
        </Defs>
        <Rect x={1} y={1} width={138} height={138} rx={69} fill="#F9F7F6" />
        <G clipPath={`url(#${clipPathId})`}>
          <Ellipse cx={70} cy={55.2151} rx={24.6429} ry={24.6429} fill="#B5BDC3" />
          <Ellipse cx={70} cy={129.143} rx={49.2857} ry={39.4286} fill="#B5BDC3" />
        </G>
        <Rect
          x={0.5}
          y={0.5}
          width={139}
          height={139}
          rx={69.5}
          fill="none"
          stroke="#D2C5B6"
        />
      </Svg>
    </View>
  );
}
