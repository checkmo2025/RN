import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { TAB_ICON_URIS } from '../constants/iconMap';
import { colors, spacing } from '../theme';
import { triggerSelectionHaptic } from '../utils/haptics';
import { HomeScreen } from '../screens/HomeScreen';
import { StoryScreen } from '../screens/StoryScreen';
import { MyPageScreen } from '../screens/MyPageScreen';
import { MeetingScreen } from '../screens/MeetingScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { useAuthGate } from '../contexts/AuthGateContext';

const TAB_ICON_SIZE = 44;

const TabIcon = ({ routeName, focused }: { routeName: keyof typeof TAB_ICON_URIS; focused: boolean }) => {
  const uri = focused
    ? TAB_ICON_URIS[routeName].focused
    : TAB_ICON_URIS[routeName].unfocused;
  return <SvgUri uri={uri} width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} />;
};

const Tab = createBottomTabNavigator();

const labels = {
  home: '\uCC45\uBAA8 \uD648',
  meeting: '\uBAA8\uC784',
  story: '\uCC45 \uC774\uC57C\uAE30',
  news: '\uC18C\uC2DD',
  my: '\uB9C8\uC774\uD398\uC774\uC9C0',
};

export default function BottomTabs() {
  const { isLoggedIn, requireAuth } = useAuthGate();

  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: () => {
          triggerSelectionHaptic();
        },
      }}
      screenOptions={{
        tabBarActiveTintColor: colors.primary1,
        tabBarInactiveTintColor: colors.gray4,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarLabel: labels.home,
          tabBarIcon: ({ focused }) => <TabIcon routeName="Home" focused={focused} />,
        }}
      >
        {() => <HomeScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="Meeting"
        options={{
          tabBarLabel: labels.meeting,
          tabBarIcon: ({ focused }) => <TabIcon routeName="Meeting" focused={focused} />,
        }}
      >
        {() => <MeetingScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="Story"
        options={{
          tabBarLabel: labels.story,
          tabBarIcon: ({ focused }) => <TabIcon routeName="Story" focused={focused} />,
        }}
      >
        {() => <StoryScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="News"
        options={{
          tabBarLabel: labels.news,
          tabBarIcon: ({ focused }) => <TabIcon routeName="News" focused={focused} />,
        }}
      >
        {() => <NewsScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="My"
        options={{
          tabBarLabel: labels.my,
          tabBarIcon: ({ focused }) => <TabIcon routeName="My" focused={focused} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            if (isLoggedIn) return;
            event.preventDefault();
            requireAuth(() => {
              navigation.navigate('My');
            });
          },
        })}
      >
        {() => <MyPageScreen />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
    height: 84,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  tabItem: {
    paddingVertical: 2,
    marginTop: -2,
  },
});
