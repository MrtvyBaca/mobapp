// ReadinessNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ReadinessScreen from '@/features/readiness/screens/Readiness.screen';

const Stack = createStackNavigator();

export default function ReadinessNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Readiness"
        component={ReadinessScreen}
        options={{ headerShown: false }}

      />
    </Stack.Navigator>
  );
}
