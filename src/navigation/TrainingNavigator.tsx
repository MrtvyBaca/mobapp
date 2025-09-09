import React from 'react';
import { useTranslation } from 'react-i18next';
import TrainingsFeedScreen from '@/features/training/screens/TrainingsFeed.screen';
import AddTrainingScreen from '@/features/training/screens/AddTraining.screen';
import SettingsGear from '@/navigation/components/SettingsGear';
import ReadinessScreen from './ReadinessNavigator';
import RecordDetailScreen from '@/features/records/screens/RecordDetail.screen';
import { createStackNavigator } from '@react-navigation/stack';
import type { TrainingStackParamList } from '@/navigation/types';
import MonthlyGoalsEditScreen from '@/features/goals/screens/MonthlyGoalsEdit.screen';
const Stack = createStackNavigator<TrainingStackParamList>();

export default function TrainingNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TrainingsFeed"
        component={TrainingsFeedScreen}
        options={{
          title: t('screens.trainingsFeed.title'), 
          headerRight: () => <SettingsGear />,
          headerRightContainerStyle: { paddingRight: 4 },
        }}
      />
            <Stack.Screen
        name="MonthlyGoalsEdit"
        component={MonthlyGoalsEditScreen}
        options={{
          // ak máš i18n kľúč, použi ho – napr. goals.monthlyTarget
          title: t('goals.monthlyTarget'),
          headerRight: () => <SettingsGear />,
          headerRightContainerStyle: { paddingRight: 4 },
          // (voliteľné) iOS modal look:
          // presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="AddTraining"
        component={AddTrainingScreen}
        options={{
          title: t('screens.addTraining.title'),
          headerRight: () => <SettingsGear />,
          headerRightContainerStyle: { paddingRight: 4 },
        }}
      />
<Stack.Screen
  name="ReadinessLog"
  component={ReadinessScreen}   // ⬅️ vnútorný navigator
        options={{
          // ak máš i18n kľúč, použi ho – napr. goals.monthlyTarget
          title: t('recovery.title'),
          headerRight: () => <SettingsGear />,
          headerRightContainerStyle: { paddingRight: 4 },
          // (voliteľné) iOS modal look:
          // presentation: 'modal',
        }}
/>
<Stack.Screen
  name="RecordDetail"
  component={RecordDetailScreen}
  options={{ title: 'Edit record' }} // alebo i18n
/>
    </Stack.Navigator>
  );
}
