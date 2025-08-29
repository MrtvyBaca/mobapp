// src/navigation/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import type { RootTabParamList, RootStackParamList } from './types';
import { useTranslation } from 'react-i18next';

import RecordsNavigator from './RecordsNavigator';
import StatsNavigator from './StatsNavigator';
import TrainingNavigator from '@/navigation/TrainingNavigator';
import IceScreen from '@/features/ice/screens/Ice.screen';
import ReadinessScreen from '@/features/readiness/screens/Readiness.screen';
import DebugDataScreen from '@/features/dev/screens/DebugData.screen';
import Settings from '@/features/settings/screens/Setting.screen';
import { features } from '@/shared/config/featureFlags';
import ReadinessNavigator from './ReadinessNavigator';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import MonthlyGoalsEdit from '@/features/goals/screens/MonthlyGoalsEdit.screen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

function MainTabs() {
  const { t } = useTranslation();

  // mapovanie názvov rout na titulky tabu (z i18n)
  const labelFor = (routeName: keyof RootTabParamList | string) => {
    switch (routeName) {
      case 'TrainingTab':
        return t('tabs.trainingsFeed');
      case 'RecordsTab':
        return t('tabs.records');
      case 'StatsTab':
        return t('tabs.stats');
      case 'IceTab':
        return t('tabs.ice');
      case 'ReadinessTab':
        return t('tabs.readiness');
      case 'DebugDataScreen':
        return t('tabs.debug');
      default:
        return String(routeName);
    }
  };

  // mapovanie názvov rout na ikonky
  const iconFor = (routeName: keyof RootTabParamList | string) => {
    switch (routeName) {
      case 'TrainingTab':
        return 'dumbbell';
      case 'RecordsTab':
        return 'format-list-bulleted';
      case 'StatsTab':
        return 'chart-bar';
      case 'IceTab':
        return 'snowflake-variant';
      case 'ReadinessTab':
        return 'heart-pulse';
      case 'DebugDataScreen':
        return 'bug';
      default:
        return 'circle-outline';
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route,}) => ({
        tabBarLabel: labelFor(route.name),
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={iconFor(route.name) as any} color={color} size={size} />
        ),
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false, // všetky taby bez headera (headers riešia vnútorné stacky)
      })}
    >
      {features.training && <Tab.Screen name="TrainingTab" component={TrainingNavigator} />}
      {features.records && <Tab.Screen name="RecordsTab" component={RecordsNavigator} />}
      {features.stats && <Tab.Screen name="StatsTab" component={StatsNavigator} />}
      {features.ice && <Tab.Screen name="IceTab" component={IceScreen} />}
      {features.readiness && <Tab.Screen name="ReadinessTab" component={ReadinessNavigator} />}
      {features.debugData && <Tab.Screen name="DebugDataScreen" component={DebugDataScreen} />}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { t } = useTranslation();
  return (
    <RootStack.Navigator>
      {/* Hlavné taby */}
      <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      {/* Settings na root stacku – aby ho vedelo otvoriť ozubené koliesko z iných navigatorov */}
      <RootStack.Screen
        name="Settings"
        component={Settings}
        options={{ title: t('tabs.settings') }}
      />
      <RootStack.Screen
      name="MonthlyGoalsEdit"
      component={MonthlyGoalsEdit}
      options={{ title: t('tabs.monthlygoals') }}
    />
    </RootStack.Navigator>
  );
}
