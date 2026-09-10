export default ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    // Renseigné par la CI (Codemagic) : chemin du GoogleService-Info.plist exigé
    // par le plugin @react-native-firebase/app lors du `expo prebuild`.
    ...(process.env.IOS_GOOGLE_SERVICES_FILE
      ? { googleServicesFile: process.env.IOS_GOOGLE_SERVICES_FILE }
      : {}),
  },
  android: {
    ...config.android,
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
      },
    },
  },
})
