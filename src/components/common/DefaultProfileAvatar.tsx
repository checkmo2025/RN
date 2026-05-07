import { SvgUri } from 'react-native-svg';
import { DEFAULT_PROFILE_IMAGE_URI } from '../../constants/iconMap';

const defaultProfileImageUri = DEFAULT_PROFILE_IMAGE_URI;

type Props = {
  size: number;
};

export function DefaultProfileAvatar({ size }: Props) {
  return <SvgUri uri={defaultProfileImageUri} width={size} height={size} />;
}
