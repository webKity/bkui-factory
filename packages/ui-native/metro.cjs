const { withNativewind } = require('nativewind/metro');
/** Keep provider-overridden design variables dynamic on native. */
module.exports = function withBKNativewind(config, options = {}) {
  return withNativewind(config, { ...options, inlineVariables: false });
};
