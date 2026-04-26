import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageLoadEventData,
  type ImageStyle,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Size = {
  width: number;
  height: number;
};

type Props = {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  children?: ReactNode;
  accessibilityLabel?: string;
};

function hasSizeChanged(prev: Size | null, next: Size): boolean {
  if (!prev) return true;
  return Math.abs(prev.width - next.width) > 0.5 || Math.abs(prev.height - next.height) > 0.5;
}

export function LeftFocalCoverImage({
  uri,
  style,
  imageStyle,
  children,
  accessibilityLabel,
}: Props) {
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
  const [sourceSize, setSourceSize] = useState<Size | null>(null);

  useEffect(() => {
    setSourceSize(null);
  }, [uri]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout;
    const nextSize = { width: next.width, height: next.height };
    setContainerSize((prev) => (hasSizeChanged(prev, nextSize) ? nextSize : prev));
  }, []);

  const handleLoad = useCallback((event: NativeSyntheticEvent<ImageLoadEventData>) => {
    const width = event.nativeEvent.source?.width ?? 0;
    const height = event.nativeEvent.source?.height ?? 0;
    if (width <= 0 || height <= 0) return;
    const nextSize = { width, height };
    setSourceSize((prev) => (hasSizeChanged(prev, nextSize) ? nextSize : prev));
  }, []);

  const focalStyle = useMemo<StyleProp<ImageStyle>>(() => {
    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;
    if (!sourceSize || containerWidth <= 0 || containerHeight <= 0) {
      return styles.fill;
    }

    const scale = Math.max(containerWidth / sourceSize.width, containerHeight / sourceSize.height);
    const width = sourceSize.width * scale;
    const height = sourceSize.height * scale;

    return {
      position: 'absolute',
      left: 0,
      top: (containerHeight - height) / 2,
      width,
      height,
    };
  }, [containerSize.height, containerSize.width, sourceSize]);

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[focalStyle, imageStyle]}
          resizeMode="cover"
          onLoad={handleLoad}
          accessible={Boolean(accessibilityLabel)}
          accessibilityLabel={accessibilityLabel}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
