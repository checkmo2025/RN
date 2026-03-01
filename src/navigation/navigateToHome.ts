export function navigateToHome(navigation: any): void {
  const chain: any[] = [];
  const visited = new Set<any>();

  let current = navigation;
  while (current && !visited.has(current)) {
    chain.push(current);
    visited.add(current);
    current = current.getParent?.();
  }

  for (const nav of chain) {
    const routeNames: string[] = nav?.getState?.()?.routeNames ?? [];
    if (routeNames.includes('Tabs')) {
      nav.navigate('Tabs', { screen: 'Home' });
      return;
    }
  }
}
