// src/theme/paperTheme.ts
import { MD3LightTheme as DefaultTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const paperTheme: MD3Theme = {
  ...DefaultTheme,
  roundness: 12,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4F46E5',      // indigo-600
    secondary: '#06B6D4',    // cyan-500
    tertiary: '#F59E0B',     // amber-500
    background: '#f3f6fa',   // ladí s tvojimi obrazovkami
    surface: '#ffffff',
    surfaceVariant: '#e5ecfb',
    onPrimary: '#ffffff',
    outline: '#CAD4F3',
    error: '#EF4444',
  },
};

export default paperTheme;
