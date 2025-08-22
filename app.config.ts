// app.config.ts
import type { ExpoConfig } from '@expo/config';

export default (): ExpoConfig => {
  const isLight = process.env.LIGHT === '1';

  return {
    name: isLight ? 'MobApp Light' : 'MobApp',
    slug: 'mobapp',
    version: '1.0.0',
    orientation: 'portrait',

    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },

    ios: {
      bundleIdentifier: 'com.mrtvybaca.mojaappka',
      infoPlist: {
        NSHealthShareUsageDescription:
          'Aplikácia číta tréningy z Apple Health, aby si mal štatistiky.',
        NSHealthUpdateUsageDescription:
          'Aplikácia môže zapisovať tréningy do Apple Health (ak to povolíš).',
      },
    },

    android: {
      package: 'com.mrtvybaca.mojaappka',
    },

    plugins: [
      ['expo-health-connect', {}],
      [
        'expo-build-properties',
        {
          android: {
            useAndroidX: true,
            enableJetifier: true,
            minSdkVersion: 26,
            compileSdkVersion: 36,
            targetSdkVersion: 36,
          },
        },
      ],
      'expo-secure-store',
    ],

    extra: {
      eas: {
        projectId: 'f83a7922-25e9-4c7a-a784-3a1c36d117da',
      },
      // ▼ voliteľné feature flagy pre „light“ verziu (čítaj v appke cez Constants.expoConfig?.extra)
      features: {
        training: true,
        records: true,
        ice: true,
        stats: !isLight,
        readiness: !isLight,
        debugData: !isLight,
      },
    },
  };
};
