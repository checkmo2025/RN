import type { NavigationProp, ParamListBase } from '@react-navigation/native';

type NavigationNode = NavigationProp<ParamListBase>;

function findTabsNavigator(navigation: NavigationNode): NavigationNode | null {
  const visited = new Set<NavigationNode>();
  let current: NavigationNode | undefined = navigation;
  while (current && !visited.has(current)) {
    visited.add(current);
    const routeNames: string[] = current.getState()?.routeNames ?? [];
    if (routeNames.includes('Tabs')) return current;
    current = current.getParent();
  }
  return null;
}

export function navigateToHome(navigation: NavigationNode): void {
  const nav = findTabsNavigator(navigation);
  nav?.navigate('Tabs', { screen: 'Home' });
}

export function navigateToMyAlarms(navigation: NavigationNode): void {
  const nav = findTabsNavigator(navigation);
  if (nav) {
    nav.navigate('Tabs', { screen: 'My', params: { openMyTab: 'ALARM' } });
  }
}
