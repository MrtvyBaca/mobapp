import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import i18n from '@/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'cs' | 'en';

type Ctx = {
  language: Language;
  setLanguage: (lng: Language) => void;
};

export const LanguageContext = createContext<Ctx>({ language: 'cs', setLanguage: () => {} });

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [language, setLang] = useState<Language>((i18n.language as Language) || 'cs');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('app.language');
      if (stored && stored !== language) {
        await i18n.changeLanguage(stored);
        setLang(stored as Language);
      }
    })();
  }, []);

  const setLanguage = useCallback((lng: Language) => {
    void i18n.changeLanguage(lng);
    void AsyncStorage.setItem('app.language', lng);
    setLang(lng);
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
