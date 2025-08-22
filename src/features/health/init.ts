// init.ts
import { Alert, Platform } from 'react-native';
import {
  initialize,
  getSdkStatus,
  getGrantedPermissions,
  requestPermission,
  type Permission,
  type WriteExerciseRoutePermission,
} from 'react-native-health-connect';

/**
 * Minimálny set, bez ktorého sync nedáva zmysel.
 * Doplň si ďalšie (HeartRate, Distance, Calories…), ak ich potrebuješ.
 */
const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Steps' },
];

/** Inicializuje Health Connect a zaistí chýbajúce povolenia. */
export async function ensureHCInitialized(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    // 1) initialize – jediný „hard fail“
    const ok = await initialize();
    if (!ok) {
      Alert.alert('Health Connect', 'initialize() zlyhalo.');
      return false;
    }
    console.log('[HC] initialize() OK');

    // 2) Status len logujeme (na niektorých zariadeniach býva 3 aj po grantoch)
    try {
      const s1 = await getSdkStatus();
      const s2 = await getSdkStatus('com.google.android.apps.healthdata');
      console.log('[HC] getSdkStatus():', s1, '| provider:', s2);
    } catch (e) {
      console.log('[HC] getSdkStatus() error (ignored):', e);
    }

    // 3) Zisti, čo už je udelené
    const granted = await getGrantedPermissions(); // zvyčajne pole objektov { accessType, recordType }
    const isGranted = (p: Permission) =>
      granted.some((g) => g.accessType === p.accessType && g.recordType === p.recordType);

    const missing: Permission[] = REQUIRED_PERMISSIONS.filter((p) => !isGranted(p));

    if (missing.length === 0) {
      console.log('[HC] permissions: all granted');
      return true;
    }

    // 4) Požiadaj len o chýbajúce
    const toRequest: (Permission | WriteExerciseRoutePermission)[] = missing;
    await requestPermission(toRequest);
    console.log('[HC] permissions: newly granted');

    return true;
  } catch (e) {
    console.log('[HC] ensureHCInitialized error:', e);
    Alert.alert('Health Connect', 'Inicializácia/povolenia zlyhali.');
    return false;
  }
}
