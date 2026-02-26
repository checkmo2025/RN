import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BottomTabs from './src/navigation/BottomTabs';
import { colors } from './src/theme';
import { AuthGateProvider, useAuthGate } from './src/contexts/AuthGateContext';
import { AuthFlowScreen } from './src/screens/AuthFlowScreen';
import { ToastHost } from './src/components/common/ToastHost';
import { BookFlipLoadingScreen } from './src/components/common/BookFlipLoadingScreen';

function AppRoutes() {
  const { authPageVisible, closeAuthPage, completeLogin } = useAuthGate();

  if (authPageVisible) {
    return <AuthFlowScreen onClose={closeAuthPage} onLoginSuccess={completeLogin} />;
  }

  return <BottomTabs />;
}

export default function App() {
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setBootLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (bootLoading) {
    return (
      <SafeAreaProvider>
        <BookFlipLoadingScreen />
        <StatusBar style="dark" backgroundColor={colors.background} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthGateProvider>
          <AppRoutes />
          <ToastHost />
          <StatusBar style="dark" backgroundColor={colors.background} />
        </AuthGateProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
