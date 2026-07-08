import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/types';
import { AuthGateProvider, useAuthGate } from './src/contexts/AuthGateContext';
import { AuthFlowScreen } from './src/screens/AuthFlowScreen';
import { ToastHost } from './src/components/common/ToastHost';
import { BookFlipLoadingScreen } from './src/components/common/BookFlipLoadingScreen';
import { AppUpdateGateModal } from './src/components/common/AppUpdateGateModal';
import { useAppVersionGate } from './src/hooks/useAppVersionGate';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { PushNotificationCoordinator } from './src/components/common/PushNotificationCoordinator';
import { DeepLinkCoordinator } from './src/components/common/DeepLinkCoordinator';

const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

function AppRoutes() {
  const appVersionGate = useAppVersionGate();
  const { t } = useLanguage();
  const {
    isReady,
    authPageVisible,
    authPageMode,
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
          <AuthFlowScreen mode={authPageMode} onClose={closeAuthPage} onLoginSuccess={completeLogin} />
        </View>
      ) : null}

      {authTransitionLoading ? (
        <View style={styles.authTransitionOverlay}>
          <BookFlipLoadingScreen
            detailTitle={
              authTransitionVariant === 'authRequired'
                ? t('app.authRequiredTitle')
                : undefined
            }
            detailDescription={
              authTransitionVariant === 'authRequired'
                ? t('app.authRequiredDescription')
                : undefined
            }
          />
        </View>
      ) : null}

      {!isReady ? (
        <View style={styles.bootOverlay}>
          <BookFlipLoadingScreen />
        </View>
      ) : null}

      <AppUpdateGateModal
        state={appVersionGate.state}
        onOpenStore={appVersionGate.openStore}
        onDismissRecommendation={appVersionGate.dismissRecommendation}
      />

      <ToastHost />
    </View>
  );
}

export default function App() {
  const [navigationReady, setNavigationReady] = useState(false);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <NavigationContainer ref={rootNavigationRef} onReady={() => setNavigationReady(true)}>
          <AuthGateProvider>
            <DeepLinkCoordinator navigationReady={navigationReady} navigationRef={rootNavigationRef} />
            <PushNotificationCoordinator navigationRef={rootNavigationRef} />
            <AppRoutes />
            <StatusBar style="dark" backgroundColor="transparent" translucent />
          </AuthGateProvider>
        </NavigationContainer>
      </LanguageProvider>
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
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
});
