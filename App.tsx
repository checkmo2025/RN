import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BottomTabs from './src/navigation/BottomTabs';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <BottomTabs />
        <StatusBar style="dark" backgroundColor={colors.background} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
