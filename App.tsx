// App.tsx (root)
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';

import AppNavigator from '@/navigation/AppNavigator';
import paperTheme from '@/theme/paperTheme';
import { ensureUserId } from '@/shared/lib/user';

export default function App() {
    React.useEffect(() => {
    // inicializuj userId hneď po štarte
    ensureUserId().catch(() => {});
  }, []);
  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}
