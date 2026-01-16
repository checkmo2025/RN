import { StyleSheet } from 'react-native';

import { fonts } from './fonts';

const line = (size: number, percent: number) =>
  Math.round(size * (percent / 100) * 10) / 10;
const tracking = (size: number) => Number((size * -0.001).toFixed(3));

const textStyle = (
  size: number,
  linePercent: number,
  weight: '400' | '500' | '600' | '700',
  family: string,
) => ({
  fontSize: size,
  lineHeight: line(size, linePercent),
  letterSpacing: tracking(size),
  fontWeight: weight,
  fontFamily: family,
});

export const typography = StyleSheet.create({
  headline1: textStyle(48, 135, '700', fonts.bold),
  headline2: textStyle(36, 135, '700', fonts.bold),
  headline3: textStyle(32, 135, '700', fonts.bold),
  subhead1: textStyle(24, 135, '600', fonts.semibold),
  subhead2: textStyle(22, 135, '600', fonts.semibold),
  subhead3: textStyle(20, 135, '600', fonts.semibold),
  subhead4: textStyle(18, 135, '400', fonts.regular),
  subhead4_1: textStyle(18, 135, '500', fonts.medium),
  body1: textStyle(14, 145, '600', fonts.semibold),
  body1_2: textStyle(14, 145, '500', fonts.medium),
  body1_3: textStyle(14, 145, '400', fonts.regular),
  body2: textStyle(12, 145, '600', fonts.semibold),
  body2_2: textStyle(12, 145, '500', fonts.medium),
  body2_3: textStyle(12, 145, '400', fonts.regular),
});
