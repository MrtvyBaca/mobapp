// app.config.ts
import type { ExpoConfig } from '@expo/config';

export default (): ExpoConfig => {
  const isLight = process.env.LIGHT === '1';

  return {
    owner: 'mrtvybaca',
    name: isLight ? 'Rego' : 'Rego',
    slug: 'rego',
    version: '1.0.1',
    orientation: 'portrait',

    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },

    ios: {
      bundleIdentifier: 'com.mrtvybaca.rego',
      infoPlist: {
        NSHealthShareUsageDescription:
          'Aplikácia číta tréningy z Apple Health, aby si mal štatistiky.',
        NSHealthUpdateUsageDescription:
          'Aplikácia môže zapisovať tréningy do Apple Health (ak to povolíš).',
      },
    },

    android: {
      package: 'com.mrtvybaca.rego',
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
            "kotlinVersion": "1.9.24"
                   },
        },
      ],
      'expo-secure-store',
    ],

    extra: {
      eas: {
"projectId": "47b2a8df-19f9-4379-bf77-501f8f506c2e"
      },
      // ▼ voliteľné feature flagy pre „light“ verziu (čítaj v appke cez Constants.expoConfig?.extra)
      features: {
        training: true,
        records: !isLight,
        ice: !isLight,
        stats: true,
        readiness: !isLight,
        debugData: true,
      },
    },
  };
};
