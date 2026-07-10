// Entry custom : on enregistre les tâches de fond (course entrante + localisation)
// AVANT de démarrer expo-router, pour qu'elles soient définies même en contexte
// headless (app tuée / arrière-plan).
import './src/lib/registerBackgroundNotifications'
import './src/lib/locationTask'
import 'expo-router/entry'
