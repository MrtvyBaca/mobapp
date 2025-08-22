import '@/i18n';
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '@/providers/LanguageProvider';

import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from '@navigation/AppNavigator';
import paperTheme from '@theme/paperTheme';
import { ensureUserId } from '@shared/lib/user';

import {
  NavigationContainer,
  DefaultTheme as NavDefault,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { adaptNavigationTheme } from 'react-native-paper';
// React Navigation téma prispôsobená Paperu
const { LightTheme: NavPaperTheme } = adaptNavigationTheme({
  reactNavigationLight: NavDefault,
});

// Zosúladíme farby s Paper témou (stále je to NAV téma, nie Paper)
const navTheme: NavTheme = {
  ...NavDefault,
  ...NavPaperTheme,
  colors: {
    ...NavPaperTheme.colors,
    primary: paperTheme.colors.primary,
    background: paperTheme.colors.background,
    card: paperTheme.colors.surface,
    text: paperTheme.colors.onSurface,
    border: paperTheme.colors.outline,
    notification: NavPaperTheme.colors.notification,
  },
  dark: false,
};

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await ensureUserId();
      } catch {}
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <LanguageProvider>
            <NavigationContainer theme={navTheme}>
              <StatusBar style="dark" />
              <AppNavigator />
            </NavigationContainer>
          </LanguageProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
