import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { RecordsStackParamList } from './types';
import RecordsScreen from '@/features/records/screens/Records.screen';
import RecordsMonth from '@/features/records/screens/RecordsMonth.screen';
import SettingsGear from '@/navigation/components/SettingsGear'; // ⬅️ pridaj

const Stack = createStackNavigator<RecordsStackParamList>();

export default function RecordsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => <SettingsGear />,
        headerRightContainerStyle: { paddingRight: 4 },
      }}
    >
      {/* zapneme header, aby bolo vidno ⚙️ */}
      <Stack.Screen name="Records" component={RecordsScreen} options={{ title: 'Záznamy' }} />
      <Stack.Screen
        name="RecordsMonth"
        component={RecordsMonth}
        options={{ title: 'Tréningy za mesiac' }}
      />
    </Stack.Navigator>
  );
}
