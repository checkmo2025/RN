import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { colors, typography } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { StoryScreen } from '../screens/StoryScreen';
import { MyPageScreen } from '../screens/MyPageScreen';
import { MeetingScreen } from '../screens/MeetingScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { useAuthGate } from '../contexts/AuthGateContext';

const TAB_ICON_SIZE = 44;

const iconSources = {
  Home: {
    focused: Image.resolveAssetSource(
      require('../../assets/icons/after_home.svg'),
    ).uri,
    unfocused: Image.resolveAssetSource(
      require('../../assets/icons/before_home.svg'),
    ).uri,
  },
  Meeting: {
    focused: Image.resolveAssetSource(
      require('../../assets/icons/after_group.svg'),
    ).uri,
    unfocused: Image.resolveAssetSource(
      require('../../assets/icons/before_group.svg'),
    ).uri,
  },
  Story: {
    focused: Image.resolveAssetSource(
      require('../../assets/icons/after_story.svg'),
    ).uri,
    unfocused: Image.resolveAssetSource(
      require('../../assets/icons/before_story.svg'),
    ).uri,
  },
  News: {
    focused: Image.resolveAssetSource(
      require('../../assets/icons/after_news.svg'),
    ).uri,
    unfocused: Image.resolveAssetSource(
      require('../../assets/icons/before_news.svg'),
    ).uri,
  },
  My: {
    focused: Image.resolveAssetSource(
      require('../../assets/icons/after_my.svg'),
    ).uri,
    unfocused: Image.resolveAssetSource(
      require('../../assets/icons/before_my.svg'),
    ).uri,
  },
};

const TabIcon = ({ routeName, focused }: { routeName: keyof typeof iconSources; focused: boolean }) => {
  const uri = focused
    ? iconSources[routeName].focused
    : iconSources[routeName].unfocused;
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

const Placeholder = ({ label }: { label: string }) => (
  <View style={styles.screen}>
    <Text style={[typography.subhead3, styles.screenTitle]}>{label}</Text>
  </View>
);

export default function BottomTabs() {
  const { isLoggedIn, requireAuth } = useAuthGate();

  return (
    <Tab.Navigator
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

const labelsMap: Record<string, string> = {
  Home: labels.home,
  Meeting: labels.meeting,
  Story: labels.story,
  News: labels.news,
  My: labels.my,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    color: colors.gray6,
  },
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
    height: 84,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  tabItem: {
    paddingVertical: 2,
    marginTop: -2,
  },
});
