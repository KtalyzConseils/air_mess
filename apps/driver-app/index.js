// Entry custom : on enregistre la tâche de fond "course entrante" AVANT de démarrer
// expo-router, pour qu'elle soit définie même dans le contexte headless (app tuée).
import './src/lib/registerBackgroundNotifications'
import 'expo-router/entry'
