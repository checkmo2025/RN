const { withPlugins } = require('expo/config-plugins');

module.exports = function withFirebasePlatformConfig(config) {
  if (config.ios?.googleServicesFile) {
    return withPlugins(config, ['@react-native-firebase/app']);
  }

  // Preserve the existing iOS setup: configuring Firebase without a plist crashes
  // at launch. Keep the official Android mods until an iOS plist is supplied.
  console.warn('[Firebase] iOS GoogleService-Info.plist is not configured; preserving Android-only initialization.');
  const iosMods = { ...config.mods?.ios };
  const result = withPlugins(config, ['@react-native-firebase/app']);
  result.mods.ios = iosMods;
  return result;
};
