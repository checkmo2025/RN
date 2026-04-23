import type { NavigationProp, ParamListBase } from '@react-navigation/native';

type NavigationNode = NavigationProp<ParamListBase>;

export function navigateToHome(navigation: NavigationNode): void {
  const chain: NavigationNode[] = [];
  const visited = new Set<NavigationNode>();

  let current: NavigationNode | undefined = navigation;
  while (current && !visited.has(current)) {
    chain.push(current);
    visited.add(current);
    current = current.getParent();
  }

  for (const nav of chain) {
    const routeNames: string[] = nav.getState()?.routeNames ?? [];
    if (routeNames.includes('Tabs')) {
      nav.navigate('Tabs', { screen: 'Home' });
      return;
    }
  }
}
