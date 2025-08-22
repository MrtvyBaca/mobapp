module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@assets': './src/assets',
            '@features': './src/features',
            '@navigation': './src/navigation',
            '@providers': './src/providers',
            '@shared': './src/shared',
            '@store': './src/store',
            '@theme': './src/theme',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
