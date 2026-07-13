const { withPodfile } = require('@expo/config-plugins');

const MARKER = '# checkmo-xcode26-fmt-workaround';
const POST_INSTALL_ANCHOR = [
  '      :ccache_enabled => ccache_enabled?(podfile_properties),',
  '    )',
].join('\n');

module.exports = function withXcode26FmtWorkaround(config) {
  return withPodfile(config, (podfileConfig) => {
    const { contents } = podfileConfig.modResults;

    if (contents.includes(MARKER)) {
      return podfileConfig;
    }

    if (!contents.includes(POST_INSTALL_ANCHOR)) {
      throw new Error('Unable to add the Xcode 26 fmt workaround to the iOS Podfile.');
    }

    const workaround = [
      POST_INSTALL_ANCHOR,
      '',
      `    ${MARKER}`,
      "    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')",
      '    if File.exist?(fmt_base)',
      '      contents = File.read(fmt_base)',
      "      patched = contents.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '#  define FMT_USE_CONSTEVAL 0')",
      '      if patched != contents',
      '        File.chmod(0644, fmt_base)',
      '        File.write(fmt_base, patched)',
      '      end',
      '    end',
    ].join('\n');

    podfileConfig.modResults.contents = contents.replace(POST_INSTALL_ANCHOR, workaround);
    return podfileConfig;
  });
};
