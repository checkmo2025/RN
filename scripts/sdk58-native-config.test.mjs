import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
const withFirebase = require('../plugins/withFirebasePlatformConfig.js');
const withPodfile = require('../plugins/withXcode26FmtWorkaround.js');

test('missing iOS Firebase plist preserves existing iOS mods and keeps official Android setup', () => {
  const originalMod = async (config) => config;
  const config = { name: 'Checkmo', slug: 'checkmo', _internal: { projectRoot: process.cwd() }, mods: { ios: { infoPlist: originalMod } } };
  const result = withFirebase(config);
  assert.deepEqual(result.mods.ios, { infoPlist: originalMod });
  for (const mod of ['projectBuildGradle', 'appBuildGradle', 'dangerous']) assert.equal(typeof result.mods.android[mod], 'function');
});

test('configured iOS Firebase keeps the official iOS initialization and plist mods', () => {
  const result = withFirebase({ name: 'Checkmo', slug: 'checkmo', _internal: { projectRoot: process.cwd() }, ios: { googleServicesFile: './GoogleService-Info.plist' } });
  assert.equal(typeof result.mods.ios.dangerous, 'function');
  assert.equal(typeof result.mods.ios.xcodeproj, 'function');
});

test('Podfile workaround preserves static Firebase linkage and is idempotent', async () => {
  const result = withPodfile({ name: 'Checkmo', slug: 'checkmo', _internal: { projectRoot: process.cwd() } });
  const input = 'target do\n  use_expo_modules!\n  post_install do\n      :ccache_enabled => ccache_enabled?(podfile_properties),\n    )\n  end\nend';
  const apply = (contents) => result.mods.ios.podfile({ modResults: { contents }, modRequest: { nextMod: (config) => config } });
  const first = await apply(input), second = await apply(first.modResults.contents);
  assert.match(first.modResults.contents, /\$RNFirebaseAsStaticFramework = true/);
  assert.match(first.modResults.contents, /checkmo-xcode26-fmt-workaround/);
  assert.equal(second.modResults.contents, first.modResults.contents);
});

test('SDK 58 removes obsolete app configuration while preserving app identity and splash assets', () => {
  const { expo } = require('../app.json');
  assert.equal(expo.version, require('../package.json').version);
  assert.match(expo.ios.buildNumber, /^\d+$/);
  assert.equal(expo.ios.bundleIdentifier, 'kr.co.checkmo.app');
  assert.equal(expo.android.package, 'kr.co.checkmo.app');
  assert.deepEqual(expo.runtimeVersion, { policy: 'fingerprint' });
  assert.equal(expo.newArchEnabled, undefined);
  assert.equal(expo.android.edgeToEdgeEnabled, undefined);
  const splash = expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen');
  assert.equal(splash[1].image, './assets/checkmo-splash.png');
  assert.equal(splash[1].backgroundColor, '#ffffff');
});

test('regeneration preserves app marketing/build versions without changing project-level settings', async () => {
  const withVersion = require('../plugins/withIosVersionSettings.js');
  const target = { INFOPLIST_FILE: 'app/Info.plist', MARKETING_VERSION: '1.0', CURRENT_PROJECT_VERSION: '1' };
  const projectSettings = { SDKROOT: 'iphoneos' };
  const mod = withVersion({ version: '1.2.8', ios: { buildNumber: '45' } }).mods.ios.xcodeproj;
  await mod({ modResults: { pbxXCBuildConfigurationSection: () => ({ target: { buildSettings: target }, project: { buildSettings: projectSettings }, target_comment: 'comment' }) }, modRequest: { nextMod: (value) => value } });
  assert.equal(target.MARKETING_VERSION, '1.2.8');
  assert.equal(target.CURRENT_PROJECT_VERSION, '45');
  assert.deepEqual(projectSettings, { SDKROOT: 'iphoneos' });
});
