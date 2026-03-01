import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  createNavigatorFactory,
  useNavigationBuilder,
} from '@react-navigation/native';
import { StackRouter } from '@react-navigation/routers';

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
      screenOptions: screenOptions as any,
    },
  );

  return (
    <NavigationContent>
      <View style={styles.container}>
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
