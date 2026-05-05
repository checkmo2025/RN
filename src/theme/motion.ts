import { Easing } from 'react-native';

export const motion = {
  duration: {
    fast: 160,
    normal: 180,
    sheet: 220,
    loaderShort: 240,
    loaderLoop: 700,
    loaderFill: 1300,
  },
  easing: {
    standard: Easing.out(Easing.cubic),
  },
};
