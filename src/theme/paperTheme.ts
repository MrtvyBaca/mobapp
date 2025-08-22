import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  // MD3 požaduje aj fonts – vezmeme defaulty, aby zmizla chyba
  fonts: MD3LightTheme.fonts,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007BFF',
    secondary: '#4DA3FF',
    surface: '#FFFFFF',
    background: '#FFFFFF',
    onPrimary: '#FFFFFF',
    outline: '#D7E3FF',
  },
};

export default paperTheme;
