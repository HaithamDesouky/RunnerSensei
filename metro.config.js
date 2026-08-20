let getDefaultConfig;
try {
  ({ getDefaultConfig } = require("@expo/metro-config"));
} catch (e) {
  ({ getDefaultConfig } = require("expo/metro-config"));
}

const path = require('path');
const config = getDefaultConfig(__dirname);

// Redirect all react-native-maps imports to a no-op stub on web
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return { type: "empty" };
  }
  if (originalResolver) return originalResolver(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

// Map 'prop-types' to local shim when real package is not installed
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'prop-types': path.resolve(__dirname, 'src/shims/prop-types', 'index.js'),
};

config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, 'src/shims'),
];

module.exports = config;

