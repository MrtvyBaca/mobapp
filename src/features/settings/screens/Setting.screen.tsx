// screens/Settings.screen.tsx
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { requestHealthPermissions } from '@/features/health/permissions';
import { syncHealth } from '@/features/health/sync';
import LanguageSwitcher from '@/features/settings/components/LanguageSwticher';

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: '#f3f6fa' },
  card: { borderRadius: 12, elevation: 3 },
});

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);

  const connect = async () => {
    const ok = await requestHealthPermissions();
    alert(ok ? t('settings.health.connected', { defaultValue: 'Health pripojené ✅' })
             : t('settings.health.permissionsFail', { defaultValue: 'Nepodarilo sa získať povolenia.' }));
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      const n = await syncHealth({ days: 14 });
      alert(t('settings.health.syncDone', {
        defaultValue: 'Import hotový. Nových tréningov: {{count}}',
        count: n,
      }));
    } catch (e) {
      console.error(e);
      alert(t('settings.health.syncFail', { defaultValue: 'Synchronizácia zlyhala.' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{t('settings.health.title', { defaultValue: 'Health integrácia' })}</Title>
          <Paragraph>
            {t('settings.health.desc', {
              defaultValue:
                'Pripoj Apple Health (iOS) alebo Health Connect (Android) a importuj svoje aktivity zo hodiniek.',
            })}
          </Paragraph>
          <Button mode="contained" onPress={connect} disabled={busy} style={{ marginTop: 8 }}>
            {t('settings.health.connect', { defaultValue: 'Povoliť prístup' })}
          </Button>
          <Button onPress={syncNow} loading={busy} disabled={busy} style={{ marginTop: 8 }}>
            {t('settings.health.syncNow', { defaultValue: 'Synchronizovať teraz' })}
          </Button>
        </Card.Content>
      </Card>

      {/* Prepínač jazykov (CZ / EN) */}
      <LanguageSwitcher />
    </ScrollView>
  );
}
