import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { colors, spacing, typography } from '../../theme';

const LOGO_WIDTH = 100;
const LOGO_HEIGHT = 60;

const logoUri = Image.resolveAssetSource(require('../../../assets/icons/logo_primary.svg')).uri;

type Props = {
  detailTitle?: string;
  detailDescription?: string;
};

export function BookFlipLoadingScreen({
  detailTitle,
  detailDescription,
}: Props) {
  const fillProgress = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const fillLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fillProgress, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(120),
        Animated.timing(fillProgress, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );

    const textLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 0.75,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    fillLoop.start();
    textLoop.start();

    return () => {
      fillLoop.stop();
      textLoop.stop();
    };
  }, [fillProgress, textOpacity]);

  const fillWidth = fillProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LOGO_WIDTH],
  });

  const pageTranslateX = fillProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, LOGO_WIDTH + 10],
  });

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <View style={styles.emptyLogo}>
          <SvgUri uri={logoUri} width={LOGO_WIDTH} height={LOGO_HEIGHT} />
        </View>

        <Animated.View style={[styles.filledMask, { width: fillWidth }]}>
          <SvgUri uri={logoUri} width={LOGO_WIDTH} height={LOGO_HEIGHT} />
        </Animated.View>

        <Animated.View
          style={[
            styles.pageEdge,
            {
              transform: [{ translateX: pageTranslateX }, { rotateZ: '-12deg' }],
            },
          ]}
        />
      </View>

      <Animated.Text style={[styles.loadingText, { opacity: textOpacity }]}>
        로딩중
      </Animated.Text>
      {detailTitle ? <Text style={styles.detailTitle}>{detailTitle}</Text> : null}
      {detailDescription ? (
        <Text style={styles.detailDescription}>{detailDescription}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLogo: {
    opacity: 0.22,
  },
  filledMask: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    opacity: 1,
  },
  pageEdge: {
    position: 'absolute',
    top: -8,
    width: 10,
    height: LOGO_HEIGHT + 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
    shadowColor: colors.primary1,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 2,
  },
  loadingText: {
    ...typography.body2_2,
    marginTop: 14,
    color: '#BDBDBD',
    letterSpacing: 0.2,
  },
  detailTitle: {
    ...typography.body1_2,
    marginTop: spacing.lg,
    color: colors.gray6,
    textAlign: 'center',
  },
  detailDescription: {
    ...typography.body2_3,
    marginTop: spacing.xs,
    color: colors.gray4,
    textAlign: 'center',
  },
});
