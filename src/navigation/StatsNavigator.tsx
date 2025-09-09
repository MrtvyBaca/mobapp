// src/navigation/StatsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { IconButton } from 'react-native-paper';
import type { StatsStackParamList } from './types';
import { useTranslation } from 'react-i18next';
import SettingsGear from '@/navigation/components/SettingsGear';
import StatsScreen from '@/features/stats/screens/Stats.screen';
import MonthStats from '@/features/stats/screens/MonthStats.screen';
import WeeklyStats from '@/features/stats/screens/WeeklyStats.screen';
import YearStatsScreen from '@/features/stats/screens/YearStats.screen';

const Stack = createStackNavigator<StatsStackParamList>();

export default function StatsNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        
        headerRight: () => <SettingsGear />,
        headerRightContainerStyle: { paddingRight: 4 },
        // voliteľné: vycentruj header titulok
        // headerTitleAlign: 'center',
      })}
    >
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: t('stats.nav.stats', { defaultValue: 'Statistics' }) }}
      />
      <Stack.Screen
        name="MonthStats"
        component={MonthStats}
        options={{ title: t('stats.nav.month', { defaultValue: 'Monthly statistics' }) }}
      />
      <Stack.Screen
        name="WeeklyStats"
        component={WeeklyStats}
        options={{ title: t('stats.nav.week', { defaultValue: 'Weekly statistics' }) }}
      />
      <Stack.Screen
        name="YearStats"
        component={YearStatsScreen}
        options={{ title: t('stats.nav.year', { defaultValue: 'Yearly statistics' }) }}
      />
    </Stack.Navigator>
  );
}
