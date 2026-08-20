let getDefaultConfig;
try {
  ({ getDefaultConfig } = require("@expo/metro-config"));
} catch (e) {
  ({ getDefaultConfig } = require("expo/metro-config"));
}

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

module.exports = config;

