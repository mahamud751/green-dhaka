module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: ['node_modules/(?!((@)?react-native|@react-native(-community)?|react-native-svg|react-native-safe-area-context)/)'],
};
