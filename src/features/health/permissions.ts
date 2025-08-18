// permissions.ts
import {
  getGrantedPermissions,
  requestPermission,
  type Permission,
  type WriteExerciseRoutePermission,
} from 'react-native-health-connect';

/** Všetko, čo tvoja appka potrebuje (rozšír podľa potreby). */
const REQUIRED: Permission[] = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Steps' },
  // { accessType: 'read', recordType: 'HeartRate' },
  // { accessType: 'read', recordType: 'Distance' },
  // { accessType: 'read', recordType: 'TotalCaloriesBurned' },
];

/** Požiada len o chýbajúce povolenia. Neotvára nastavenia. */
export async function requestHealthPermissions(): Promise<boolean> {
  const granted = await getGrantedPermissions();
  const isGranted = (p: Permission) =>
    granted.some(g => g.accessType === p.accessType && g.recordType === p.recordType);

  const missing: Permission[] = REQUIRED.filter(p => !isGranted(p));

  if (missing.length === 0) {
    console.log('[HC] permissions: all granted');
    return true;
  }

  try {
    const toRequest: (Permission | WriteExerciseRoutePermission)[] = missing;
    await requestPermission(toRequest);
    console.log('[HC] permissions: newly granted');
    return true;
  } catch (e) {
    console.log('[HC] permissions request failed:', e);
    return false;
  }
}
