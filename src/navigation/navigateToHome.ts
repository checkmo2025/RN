import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { RootStackParamList } from './types';

type AnyNavigation = NavigationProp<ParamListBase>;
type RootNavigation = NavigationProp<RootStackParamList>;

function findTabsNavigator(navigation: AnyNavigation): RootNavigation | null {
  const visited = new Set<AnyNavigation>();
  let current: AnyNavigation | undefined = navigation;
  while (current && !visited.has(current)) {
    visited.add(current);
    const routeNames: string[] = current.getState()?.routeNames ?? [];
    if (routeNames.includes('Tabs')) return current as unknown as RootNavigation;
    current = current.getParent() as AnyNavigation | undefined;
  }
  return null;
}

export function navigateToHome(navigation: AnyNavigation): void {
  const nav = findTabsNavigator(navigation);
  nav?.navigate('Tabs', { screen: 'Home' });
}

export function navigateToMyAlarms(navigation: AnyNavigation): void {
  const nav = findTabsNavigator(navigation);
  if (nav) {
    nav.navigate('Tabs', { screen: 'My', params: { openMyTab: 'ALARM' } });
  }
}
