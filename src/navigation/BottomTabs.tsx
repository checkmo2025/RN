import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_ICON_URIS } from '../constants/iconMap';
import { colors, spacing } from '../theme';
import { triggerSelectionHaptic } from '../utils/haptics';
import { HomeScreen } from '../screens/HomeScreen';
import { StoryScreen } from '../screens/StoryScreen';
import { MyPageScreen } from '../screens/MyPageScreen';
import { MeetingScreen } from '../screens/MeetingScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { useAuthGate } from '../contexts/AuthGateContext';
import { useLanguage } from '../contexts/LanguageContext';

const TAB_ICON_SIZE = 44;

const TabIcon = ({ routeName, focused }: { routeName: keyof typeof TAB_ICON_URIS; focused: boolean }) => {
  const uri = focused
    ? TAB_ICON_URIS[routeName].focused
    : TAB_ICON_URIS[routeName].unfocused;
  const Icon = uri;
  return <Icon width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} />;
};

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { isLoggedIn, requireAuth } = useAuthGate();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

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
        tabBarStyle: [styles.tabBar, { paddingBottom: insets.bottom + spacing.xs }],
        tabBarItemStyle: styles.tabItem,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ focused }) => <TabIcon routeName="Home" focused={focused} />,
        }}
      >
        {() => <HomeScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="Meeting"
        options={{
          tabBarLabel: t('tabs.clubs'),
          tabBarIcon: ({ focused }) => <TabIcon routeName="Meeting" focused={focused} />,
        }}
      >
        {() => <MeetingScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="Story"
        options={{
          tabBarLabel: t('tabs.bookStory'),
          tabBarIcon: ({ focused }) => <TabIcon routeName="Story" focused={focused} />,
        }}
      >
        {() => <StoryScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="News"
        options={{
          tabBarLabel: t('tabs.news'),
          tabBarIcon: ({ focused }) => <TabIcon routeName="News" focused={focused} />,
        }}
      >
        {() => <NewsScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="My"
        options={{
          tabBarLabel: t('tabs.profile'),
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
    paddingTop: spacing.xs,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  tabItem: {
    paddingVertical: 2,
    marginTop: -2,
  },
});
