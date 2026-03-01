import React from 'react';

import BottomTabs from './BottomTabs';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { createSimpleStackNavigator } from './SimpleStackNavigator';

const Root = createSimpleStackNavigator();

export default function RootNavigator() {
  return (
    <Root.Navigator initialRouteName="Tabs">
      <Root.Screen name="Tabs">{() => <BottomTabs />}</Root.Screen>
      <Root.Screen name="UserProfile">{() => <UserProfileScreen />}</Root.Screen>
    </Root.Navigator>
  );
}

