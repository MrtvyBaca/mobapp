import React, { useContext } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '@/providers/LanguageProvider';

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, setLanguage } = useContext(LanguageContext);

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>{t('screens.settings.language')}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => setLanguage('cs')}
          style={{ padding: 10, borderWidth: 1, borderRadius: 8 }}
        >
          <Text>
            {t('screens.settings.language_cs')}
            {language === 'cs' ? ' ✓' : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setLanguage('en')}
          style={{ padding: 10, borderWidth: 1, borderRadius: 8 }}
        >
          <Text>
            {t('screens.settings.language_en')}
            {language === 'en' ? ' ✓' : ''}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
