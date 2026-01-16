import { Platform } from 'react-native';

const systemFont = Platform.select({ ios: 'System', android: 'System' }) ?? 'System';

export const fonts = {
  regular: systemFont,
  medium: systemFont,
  semibold: systemFont,
  bold: systemFont,
};
