import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import paperTheme from '@/theme/paperTheme';

export default function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer>{children}</NavigationContainer>
    </PaperProvider>
  );
}
