import { Platform } from 'react-native';
import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';
import { requestPermission, getGrantedPermissions } from 'react-native-health-connect';
import type { Permission } from 'react-native-health-connect';
import { ensureHCInitialized } from './init';

/** Požiada o povolenia na čítanie tréningov */
export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const perms: HealthKitPermissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Workout,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.DistanceCycling,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        ],
        write: [], // zatiaľ nechceme zapisovať
      },
    };
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(perms, (err) => resolve(!err));
    });
  } else {
  await ensureHCInitialized();                // ✨ NOVÉ – najprv init

  const requested: Permission[] = [
    { accessType: 'read', recordType: 'ExerciseSession' },
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'Distance' },
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' }, // odporúčam skôr ActiveCalories
  ];

  await requestPermission(requested);
  const granted = await getGrantedPermissions();
  const ok = requested.every(req =>
    granted.some(g => g.recordType === req.recordType && g.accessType === req.accessType)
  );
  return ok;
    }
}
