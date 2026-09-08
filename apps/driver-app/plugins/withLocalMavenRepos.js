const { withProjectBuildGradle } = require('@expo/config-plugins')

const LOCAL_MAVEN_REPO_MODULES = [
  '@expo/ui',
  '@expo/dom-webview',
  '@expo/log-box',
  'expo-application',
  'expo-asset',
  'expo-audio',
  'expo-device',
  'expo-file-system',
  'expo-font',
  'expo-image',
  'expo-image-loader',
  'expo-image-picker',
  'expo-json-utils',
  'expo-keep-awake',
  'expo-linking',
  'expo-location',
  'expo-manifests',
  'expo-notifications',
  'expo-router',
  'expo-secure-store',
  'expo-splash-screen',
  'expo-status-bar',
  'expo-system-ui',
  'expo-task-manager',
  'expo-updates-interface',
  'expo-web-browser',
  'unimodules-app-loader',
]

function withLocalMavenRepos(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config
    let contents = config.modResults.contents

    if (contents.includes('localMavenRepos.each')) return config

    const repoLines = LOCAL_MAVEN_REPO_MODULES.map((moduleName) => (
      `    "${moduleName}",`
    )).join('\n')

    const mavenFile = `
def localMavenRepos = [
${repoLines}
].collect { module -> file("$rootDir/../node_modules/$module/local-maven-repo") }`

    contents = contents.replace(/(\nallprojects\s*\{)/, `\n${mavenFile}\n$1`)

    const marker = 'maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }'
    if (contents.includes(marker)) {
      contents = contents.replace(
        marker,
        `${marker}\n        localMavenRepos.each { repo ->\n          maven { url = uri(repo) }\n        }`,
      )
    } else {
      contents = contents.replace(
        /(allprojects\s*\{[\s\S]*?repositories\s*\{)/,
        `$1\n        localMavenRepos.each { repo ->\n          maven { url = uri(repo) }\n        }`,
      )
    }

    config.modResults.contents = contents
    return config
  })
}

module.exports = withLocalMavenRepos
