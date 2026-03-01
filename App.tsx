import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import { AuthGateProvider, useAuthGate } from './src/contexts/AuthGateContext';
import { AuthFlowScreen } from './src/screens/AuthFlowScreen';
import { ToastHost } from './src/components/common/ToastHost';
import { BookFlipLoadingScreen } from './src/components/common/BookFlipLoadingScreen';

function AppRoutes() {
  const {
    authPageVisible,
    authTransitionLoading,
    authTransitionVariant,
    closeAuthPage,
    completeLogin,
  } = useAuthGate();

  return (
    <View style={styles.appRoutes}>
      <RootNavigator />

      {authPageVisible ? (
        <View style={styles.authPageOverlay}>
          <AuthFlowScreen onClose={closeAuthPage} onLoginSuccess={completeLogin} />
        </View>
      ) : null}

      {authTransitionLoading ? (
        <View style={styles.authTransitionOverlay}>
          <BookFlipLoadingScreen
            detailTitle={
              authTransitionVariant === 'authRequired'
                ? '해당 서비스는 로그인이 필요합니다!'
                : undefined
            }
            detailDescription={
              authTransitionVariant === 'authRequired'
                ? '로그인 화면으로 이동합니다'
                : undefined
            }
          />
        </View>
      ) : null}
    </View>
  );
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

const styles = StyleSheet.create({
  appRoutes: {
    flex: 1,
  },
  authPageOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 900,
  },
  authTransitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});
