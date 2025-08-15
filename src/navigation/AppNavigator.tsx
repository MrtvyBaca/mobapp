import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import type { RootTabParamList, RootStackParamList } from './types';

import RecordsNavigator from './RecordsNavigator';
import StatsNavigator from './StatsNavigator';
import AddTraining from '@/features/training/screens/AddTraining.screen';
import IceScreen from '@/features/ice/screens/Ice.screen';
import Settings from '@/features/settings/screens/Setting.screen';
import SettingsGear from '@/navigation/components/SettingsGear';
import ReadinessScreen from '@/features/readiness/screens/Readiness.screen';
import DebugDataScreen from '@/features/dev/screens/DebugData.screen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      // ⚙️ v headeri tabov (platí pre tie, ktoré header zobrazujú)
      screenOptions={{
        headerRight: () => <SettingsGear />,
        headerRightContainerStyle: { paddingRight: 4 },
      }}
    >
      <Tab.Screen
        name="TrainingTab"
        component={AddTraining}
        options={{ title: 'Tréningy' }}
      />
      {/* tieto majú vlastné Stack headery → skryť Tab header */}
      <Tab.Screen
        name="RecordsTab"
        component={RecordsNavigator}
        options={{ title: 'Záznamy', headerShown: false }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsNavigator}
        options={{ title: 'Štatistiky', headerShown: false }}
      />
      <Tab.Screen
        name="IceTab"
        component={IceScreen}
        options={{ title: 'LED' }}
      />
            <Tab.Screen
        name="DebugDataScreen"
        component={DebugDataScreen}
        options={{ title: 'Debug' }}
      />
      <Tab.Screen name="ReadinessTab" component={ReadinessScreen} options={{ title: 'Readiness' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Settings"
        component={Settings}
        options={{ title: 'Nastavenia' }}
      />
    </RootStack.Navigator>
  );
}
