import { Platform, Alert } from 'react-native';
import {
  getSdkStatus,
  initialize,
  requestPermission,
  readRecords,
  openHealthConnectSettings,
} from 'react-native-health-connect';
/** Inicializuje HC klienta, prípadne otvorí nastavenia ak chýba poskytovateľ. */
export async function ensureHCInitialized() {
  // 1) status – skús bez parametra, potom s providerom
    console.log('[HOVNO]');
  let s = -1;
  try { s = await getSdkStatus(); } catch {    console.log('[Prve na hovno]');}
  if (s !== 0) {
    try { s = await getSdkStatus('com.google.android.apps.healthdata'); } catch {     console.log('[Druhe na hovno]');}
  }
  
  // 2) init
  const ok = await initialize();
  if (!ok) { Alert.alert('HC', 'initialize() zlyhalo') ; return; }
  if (s !== 0) {
    await openHealthConnectSettings(); // HC je nainštalovaný, otvorí jeho UI
        console.log('Tretie na hovno');
    Alert.alert('Health Connect', 'HC je dostupný, ale ešte nevidí kompatibilné appky. Skús nainštalovať/aktualizovať a potom sa vráť.');
    return;
  }


    // 3) povolenia (aspoň Steps)
  await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);

  // 4) krátke čítanie (posledná hodina)
  const end = new Date();
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  await readRecords('Steps', {
    timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
  });
  console.log('[Hotovo – skontroluj Health Connect → Recent access.]');
  Alert.alert('HC', 'Hotovo – skontroluj Health Connect → Recent access.');
}
