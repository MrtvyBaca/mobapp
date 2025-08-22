// src/navigation/components/SettingsGear.tsx
import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SettingsGear() {
  const nav = useNavigation<any>();
  const go = () => {
    const p1 = nav.getParent();
    const p2 = p1?.getParent();
    (p2 ?? p1 ?? nav)?.navigate('Settings');
  };

  return (
    <Pressable onPress={go} hitSlop={8} style={{ paddingHorizontal: 8 }}>
      <MaterialCommunityIcons name="cog-outline" size={22} />
    </Pressable>
  );
}
