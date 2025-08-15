// src/navigation/StatsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { IconButton } from 'react-native-paper';
import type { StatsStackParamList } from './types';

import StatsScreen from '@/features/stats/screens/Stats.screen';
import MonthStats from '@/features/stats/screens/MonthStats.screen';
import WeeklyStats from '@/features/stats/screens/WeeklyStats.screen';

const Stack = createStackNavigator<StatsStackParamList>();

export default function StatsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerRight: () => (
          <IconButton
            icon="cog"
            accessibilityLabel="Nastavenia"
            onPress={() => navigation.getParent()?.navigate('Settings')}
          />
        ),
        headerRightContainerStyle: { paddingRight: 4 },
      })}
    >
      <Stack.Screen name="Stats" component={StatsScreen} options={{ title: 'Štatistiky' }} />
      <Stack.Screen name="MonthStats" component={MonthStats} options={{ title: 'Štatistiky mesiaca' }} />
      <Stack.Screen name="WeeklyStats" component={WeeklyStats} options={{ title: 'Štatistiky týždňa' }} />
      {/* Settings TU už nedávaj – je globálne v RootStacku */}
    </Stack.Navigator>
  );
}
