const { withAppBuildGradle } = require('expo/config-plugins');

const block = `
// Keep generated React Native sources within the Windows Ninja path limit.
if (System.getProperty("os.name").startsWith("Windows")) {
    android.defaultConfig.externalNativeBuild.cmake.arguments.add("-DCMAKE_OBJECT_PATH_MAX=240")
}
`;

module.exports = (config) =>
  withAppBuildGradle(config, (mod) => {
    if (
      mod.modResults.language === 'groovy' &&
      !mod.modResults.contents.includes(block)
    ) {
      mod.modResults.contents += block;
    }
    return mod;
  });
