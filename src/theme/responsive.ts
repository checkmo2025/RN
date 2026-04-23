import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;
const MIN_SCALE = 0.9;
const MAX_SCALE = 1.12;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function getViewport() {
  const { width, height } = Dimensions.get('window');
  return {
    width: Math.min(width, height),
    height: Math.max(width, height),
  };
}

export function getDeviceScale() {
  const { width, height } = getViewport();
  const widthRatio = width / BASE_WIDTH;
  const heightRatio = height / BASE_HEIGHT;
  return clamp(Math.min(widthRatio, heightRatio), MIN_SCALE, MAX_SCALE);
}

export function scaleSize(value: number) {
  return PixelRatio.roundToNearestPixel(value * getDeviceScale());
}

export function scaleFont(value: number, factor = 0.45) {
  const scaled = scaleSize(value);
  const moderated = value + (scaled - value) * factor;
  return PixelRatio.roundToNearestPixel(moderated);
}
