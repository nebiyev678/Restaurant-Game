// Capacitor configuration for the Android app (Google Play).
// Type annotation omitted on purpose so this file compiles before @capacitor/cli is installed.
const config = {
  appId: 'com.restaurantempire.chef',
  appName: 'Restaurant Empire',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
    // Release builds: no remote WebView debugging
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
