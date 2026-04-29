import { StyleSheet } from 'react-native';

import { fonts } from './fonts';

const line = (size: number, percent: number) =>
  Math.round(size * (percent / 100) * 10) / 10;
const tracking = (size: number) => Number((size * -0.001).toFixed(3));

const textStyleWithMetrics = (
  size: number,
  lineHeight: number,
  weight: '400' | '500' | '600' | '700',
  family: string,
  letterSpacing = tracking(size),
) => ({
  fontSize: size,
  lineHeight,
  letterSpacing,
  fontWeight: weight,
  fontFamily: family,
});

const textStyle = (
  size: number,
  linePercent: number,
  weight: '400' | '500' | '600' | '700',
  family: string,
) => textStyleWithMetrics(size, line(size, linePercent), weight, family);

const textStyleExact = (
  size: number,
  lineHeight: number,
  weight: '400' | '500' | '600' | '700',
  family: string,
  letterSpacing = tracking(size),
) => textStyleWithMetrics(size, lineHeight, weight, family, letterSpacing);

export const typography = StyleSheet.create({
  headline1: textStyle(48, 135, '700', fonts.bold),
  headline2: textStyle(36, 135, '700', fonts.bold),
  headline3: textStyle(32, 135, '700', fonts.bold),
  subhead1: textStyle(24, 135, '600', fonts.semibold),
  subhead2: textStyle(22, 135, '600', fonts.semibold),
  subhead3: textStyle(20, 135, '600', fonts.semibold),
  subhead4: textStyle(18, 135, '400', fonts.regular),
  subhead4_1: textStyle(18, 135, '500', fonts.medium),
  subhead5: textStyleExact(16, 22, '500', fonts.medium, -0.014),
  body1: textStyle(14, 145, '600', fonts.semibold),
  body1_2: textStyle(14, 145, '500', fonts.medium),
  body1_2_spacious: textStyleExact(14, 30, '500', fonts.medium, -0.014),
  body1_3: textStyle(14, 145, '400', fonts.regular),
  body1_3_compact: textStyleExact(14, 20, '400', fonts.regular, -0.014),
  body1_3_relaxed: textStyleExact(14, 22, '400', fonts.regular, -0.014),
  body1_4: textStyleExact(15, 20.3, '400', fonts.regular, -0.014),
  body2: textStyle(12, 145, '600', fonts.semibold),
  body2_2: textStyle(12, 145, '500', fonts.medium),
  caption1_2_trackingWide: textStyleExact(12, 17.4, '500', fonts.medium, 0.2),
  body2_3: textStyle(12, 145, '400', fonts.regular),
  caption1_3: textStyleExact(12, 18, '400', fonts.regular, -0.012),
  caption1_3_relaxed: textStyleExact(12, 20, '400', fonts.regular, -0.012),
  caption1_3_loose: textStyleExact(12, 21, '400', fonts.regular, -0.012),
  caption1_3_spacious: textStyleExact(12, 22, '400', fonts.regular, -0.012),
});
