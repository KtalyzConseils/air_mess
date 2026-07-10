import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { fetchUnreadCount } from '../../api/notifications'

const INK = '#1A1614'
const WARM_400 = '#B8AF9F'
const WARM_200 = '#EEE8DC'
const OFF_WHITE = '#FDFCF9'
const AIRMESS_YELLOW = '#FFCC00'
const AIRMESS_RED = '#D40511'

/**
 * Icône de tab avec indicateur brand quand active.
 *   - petit bar jaune au-dessus (signature)
 *   - filled/outline pour renforcer l'état
 */
function TabIcon({
  name,
  focused,
  size,
}: {
  name: keyof typeof Ionicons.glyphMap
  focused: boolean
  size: number
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 22,
          height: 3,
          borderRadius: 999,
          backgroundColor: focused ? AIRMESS_YELLOW : 'transparent',
          marginBottom: 4,
        }}
      />
      <Ionicons name={name} size={size} color={focused ? INK : WARM_400} />
    </View>
  )
}

export default function TabsLayout() {
  // Décale la tab bar au-dessus de la barre de navigation système (edge-to-edge
  // RN 0.85) : sans ça, les icônes tombent dans la zone des boutons système et
  // les taps sont interceptés.
  const insets = useSafeAreaInsets()
  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: fetchUnreadCount,
    refetchInterval: 15_000,
  })

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: INK,
        tabBarInactiveTintColor: WARM_400,
        tabBarStyle: {
          backgroundColor: OFF_WHITE,
          borderTopWidth: 1,
          borderTopColor: WARM_200,
          height: 70 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name={focused ? 'time' : 'time-outline'} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifs',
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name={focused ? 'notifications' : 'notifications-outline'}
              focused={focused}
              size={size}
            />
          ),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: AIRMESS_RED,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}
