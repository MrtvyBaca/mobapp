import React from 'react';
import { useTranslation } from 'react-i18next';
import TrainingsFeedScreen from '@/features/training/screens/TrainingsFeed.screen';
import AddTrainingScreen from '@/features/training/screens/AddTraining.screen';
import SettingsGear from '@/navigation/components/SettingsGear';
import ReadinessScreen from './ReadinessNavigator';
import RecordDetailScreen from '@/features/records/screens/RecordDetail.screen';
import { createStackNavigator } from '@react-navigation/stack';
import type { TrainingStackParamList } from '@/navigation/types';

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
        name="AddTraining"
        component={AddTrainingScreen}
        options={{
          title: t('screens.addTraining.title'),
          headerRight: () => null,
        }}
      />
  <Stack.Screen
    name="ReadinessLog"
    component={ReadinessScreen}
    options={{
      title: t('readiness.title', { defaultValue: 'Denný Readiness' }),
      // voliteľné: modálne správanie na iOS
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
