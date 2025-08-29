import '@/i18n';
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '@/providers/LanguageProvider';

import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from '@navigation/AppNavigator';
import { ensureUserId } from '@shared/lib/user';

import {
  NavigationContainer,
  DefaultTheme as NavDefault,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { adaptNavigationTheme } from 'react-native-paper';
import { MD3LightTheme } from 'react-native-paper';
import { paperTheme, navTheme } from '@/theme/paperTheme';
import { registerTranslation, en, cs } from 'react-native-paper-dates';
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

registerTranslation('en', en);
registerTranslation('cs', cs);