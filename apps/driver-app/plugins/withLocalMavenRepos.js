const { withProjectBuildGradle } = require('@expo/config-plugins')

/**
 * Config plugin — déclare les dépôts Maven LOCAUX des modules Expo précompilés (*.aar).
 *
 * Contexte : plusieurs modules Expo (expo-ui, expo-asset, expo-image-picker, expo-linking,
 * expo-secure-store, expo-splash-screen, expo-web-browser, …) distribuent leur artefact natif
 * (`.aar`) via un dépôt Maven local situé dans `node_modules/<paquet>/local-maven-repo`,
 * et NON via le dépôt distant `repo.expo.dev`.
 *
 * => repo.expo.dev est actuellement instable/indisponible (renvoie des POM HTML d'erreur).
 * => Si ce dépôt local n'est pas déclaré, Gradle tente de résoudre `expo.modules.*` sur
 *    repo.expo.dev et échoue (`Could not resolve expo.modules.ui:...` / `Unresolved reference`).
 *
 * Ce plugin ré-injecte TOUS les `local-maven-repo` dans le bloc
 * `allprojects { repositories { ... } }` du build.gradle racine.
 *
 * Nécessaire car le dossier android/ est régénéré par `expo prebuild` (workflow managé) :
 * ce plugin garantit que les dépôts sont ré-appliqués à CHAQUE prebuild.
 */

// Modules Expo dont l'artefact natif vit dans un local-maven-repo local.
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

    // Évite une double injection si le plugin est déjà passé.
    if (contents.includes('localMavenRepos.each')) return config

    // Construit le bloc Groovy : localMavenRepos = [ ... ].collect { file(...) }
    const repoLines = LOCAL_MAVEN_REPO_MODULES.map(
      (m) => `    "${m}",`,
    ).join('\n')

    const mavenFile = `
def localMavenRepos = [
${repoLines}
].collect { module -> file("$rootDir/../node_modules/$module/local-maven-repo") }`

    // 1) Injecte la déclaration `def localMavenRepos` avant `allprojects {`.
    contents = contents.replace(
      /(\nallprojects\s*\{)/,
      `\n${mavenFile}\n$1`,
    )

    // 2) Injecte la boucle qui ajoute chaque repo dans repositories { }.
    //    (exactement comme le dépôt Notifee déjà déclaré)
    const marker = 'maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }'
    if (contents.includes(marker)) {
      contents = contents.replace(
        marker,
        `${marker}\n        localMavenRepos.each { repo ->\n          maven { url = uri(repo) }\n        }`,
      )
    } else {
      // Repli : injection sauvage dans le bloc repositories (à défaut du marker Notifee).
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
