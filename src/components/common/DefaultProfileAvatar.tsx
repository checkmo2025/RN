import { Image } from 'react-native';
import { SvgUri } from 'react-native-svg';

const defaultProfileImageUri = Image.resolveAssetSource(
  require('../../../assets/mypage/image_profile1.svg'),
).uri;

type Props = {
  size: number;
};

export function DefaultProfileAvatar({ size }: Props) {
  return <SvgUri uri={defaultProfileImageUri} width={size} height={size} />;
}

