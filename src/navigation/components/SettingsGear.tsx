import React from 'react';
import { IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// Jednoduché ozubené koliesko do headera.
// Skúsi navigovať cez parent (RootStack s 'Settings'),
// ak parent nie je, skúsi aktuálny navigator.
export default function SettingsGear({
  color,
  size = 24,
}: {
  color?: string;
  size?: number;
}) {
  const navigation = useNavigation();

  const goSettings = () => {
    const parent = navigation.getParent?.();
    // @ts-expect-error – vo všeobecnosti nepoznáme typ RootStacku
    (parent ?? navigation).navigate('Settings');
  };

  return (
    <IconButton
      icon="cog"
      accessibilityLabel="Nastavenia"
      onPress={goSettings}
      iconColor={color}
      size={size}
    />
  );
}
