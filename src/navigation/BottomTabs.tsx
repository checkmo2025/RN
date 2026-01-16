import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { colors, spacing, typography } from '../theme';
import { AppHeader } from '../components/AppHeader';
import { HomeScreen } from '../screens/HomeScreen';
import { StoryScreen } from '../screens/StoryScreen';
import { MyPageScreen } from '../screens/MyPageScreen';
import { MeetingScreen } from '../screens/MeetingScreen';
import { NewsScreen } from '../screens/NewsScreen';

const TAB_ICON_SIZE = 44;

const iconSources = {
  Home: {
    focused: Image.resolveAssetSource(
      require('../../assets/navigation/navi-home-focus.svg'),
    ).uri,
    unfocused: Image.resolveAssetSource(
      require('../../assets/navigation/navi-home-unfocus.svg'),
    ).uri,
  },
  Meeting: {
    focused: Image.resolveAssetSource(
      require('../../assets/navigation/navi-moim-focus.svg'),
    ).uri,
    unfocused: Image.resolveAssetSource(
      require('../../assets/navigation/navi-moim-unfocus.svg'),
    ).uri,
  },
  Story: {
    focused: Image.resolveAssetSource(
      require('../../assets/navigation/navi-bookstory-focus.svg'),
    ).uri,
    unfocused: Image.resolveAssetSource(
      require('../../assets/navigation/navi-bookstory-unfocus.svg'),
    ).uri,
  },
  News: {
    focused: Image.resolveAssetSource(
      require('../../assets/navigation/navi-news-focus.svg'),
    ).uri,
    unfocused: Image.resolveAssetSource(
      require('../../assets/navigation/navi-news-unfocus.svg'),
    ).uri,
  },
  My: {
    focused: Image.resolveAssetSource(
      require('../../assets/navigation/navi-mypage-focus.svg'),
    ).uri,
    unfocused: Image.resolveAssetSource(
      require('../../assets/navigation/navi-mypage-unfocus.svg'),
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
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary1,
        tabBarInactiveTintColor: colors.gray4,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        header: ({ route }) => (
          <AppHeader title={labelsMap[route.name] ?? route.name} />
        ),
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
    height: 70,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 10,
    marginBottom: spacing.xs,
  },
  tabItem: {
    paddingVertical: 4,
  },
});
