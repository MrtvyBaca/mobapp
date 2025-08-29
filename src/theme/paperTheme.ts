import { MD3LightTheme, MD3DarkTheme, configureFonts, MD3Theme } from 'react-native-paper';
import React from 'react';
import { DefaultTheme as NavDefault, Theme as NavTheme } from '@react-navigation/native';
import { adaptNavigationTheme } from 'react-native-paper';
// (voliteľne) vlastné písmo
const fonts = configureFonts({ config: MD3LightTheme.fonts });
const { LightTheme: NavPaperTheme } = adaptNavigationTheme({ reactNavigationLight: NavDefault });
export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  // MD3 požaduje aj fonts – vezmeme defaulty, aby zmizla chyba
  fonts,
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

export const navTheme: NavTheme = {
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