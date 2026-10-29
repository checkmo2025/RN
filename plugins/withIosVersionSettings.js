const { withXcodeProject } = require('expo/config-plugins');

module.exports = function withIosVersionSettings(config) {
  return withXcodeProject(config, (mod) => {
    const configurations = mod.modResults.pbxXCBuildConfigurationSection();
    for (const entry of Object.values(configurations)) {
      const settings = entry.buildSettings;
      if (!settings?.INFOPLIST_FILE) continue;
      settings.MARKETING_VERSION = config.version;
      settings.CURRENT_PROJECT_VERSION = config.ios.buildNumber;
    }
    return mod;
  });
};
