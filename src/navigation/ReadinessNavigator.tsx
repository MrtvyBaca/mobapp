// ReadinessNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import ReadinessScreen from '@/features/readiness/screens/Readiness.screen';

type ReadinessStackParamList = {
  Readiness: undefined;
};

const Stack = createStackNavigator<ReadinessStackParamList>();

export default function ReadinessNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Readiness"
        component={ReadinessScreen}
        options={{ headerShown: false }}   // ⬅️ parent header skrytý
        // necháme brať title zo screenOptions, netreba duplikovať
      />
    </Stack.Navigator>
  );
}
