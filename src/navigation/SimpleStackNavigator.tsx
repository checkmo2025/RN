import React, { useEffect, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import {
  createNavigatorFactory,
  useNavigationBuilder,
} from '@react-navigation/native';
import { StackRouter } from '@react-navigation/routers';

const EDGE_WIDTH = 24;
const MIN_SWIPE_DISTANCE = 60;
const MIN_SWIPE_VELOCITY = 0.4;

function SimpleStackNavigator({
  initialRouteName,
  children,
  screenOptions,
}: {
  initialRouteName?: string;
  children: React.ReactNode;
  screenOptions?: unknown;
}) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(
    StackRouter,
    {
      initialRouteName,
      children,
      screenOptions: screenOptions as Record<string, unknown>,
    },
  );

  const startXRef = useRef(0);
  const canGoBackRef = useRef(false);
  const goBackRef = useRef<() => void>(() => {});

  // Update refs every render so panResponder callbacks always see fresh values.
  useEffect(() => {
    canGoBackRef.current = state.index > 0;
    if (state.index > 0) {
      const currentRoute = state.routes[state.index];
      const nav = descriptors[currentRoute.key]?.navigation;
      goBackRef.current = () => nav?.goBack?.();
    } else {
      goBackRef.current = () => {};
    }
  });

  const panResponder = useRef(
    PanResponder.create({
      // Capture phase: record touch start position without claiming the gesture.
      onStartShouldSetPanResponderCapture: (evt) => {
        startXRef.current = evt.nativeEvent.pageX;
        return false;
      },
      // Bubble phase: claim the gesture only if it started at the left edge
      // and is moving right more than down.
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return (
          canGoBackRef.current &&
          startXRef.current < EDGE_WIDTH &&
          gestureState.dx > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (
          gestureState.dx > MIN_SWIPE_DISTANCE ||
          gestureState.vx > MIN_SWIPE_VELOCITY
        ) {
          goBackRef.current();
        }
      },
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;

  return (
    <NavigationContent>
      <View style={styles.container} {...panResponder.panHandlers}>
        {state.routes.map((route, index) => (
          <View
            key={route.key}
            style={StyleSheet.absoluteFill}
            pointerEvents={index === state.index ? 'auto' : 'none'}
          >
            {descriptors[route.key].render()}
          </View>
        ))}
      </View>
    </NavigationContent>
  );
}

export const createSimpleStackNavigator =
  createNavigatorFactory(SimpleStackNavigator);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
