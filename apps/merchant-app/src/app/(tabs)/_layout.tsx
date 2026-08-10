import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Device from 'expo-device'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { fetchUnreadCount } from '../../api/notifications'

const OEM = `${Device.manufacturer ?? ''} ${Device.brand ?? ''}`.toLowerCase()
const LIGHT_BAR_HONORED =
  /samsung|google|pixel|xiaomi|redmi|poco|oneplus|oppo|vivo|realme|motorola|nokia|hmd|sony|asus/
const FORCE_DARK_BANDEAU = !LIGHT_BAR_HONORED.test(OEM)

const INK = '#1A1614'
const WARM_400 = '#B8AF9F'
const WARM_200 = '#EEE8DC'
const OFF_WHITE = '#FDFCF9'
const AIRMESS_YELLOW = '#FFCC00'
const AIRMESS_RED = '#D40511'

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
  const insets = useSafeAreaInsets()
  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: fetchUnreadCount,
    refetchInterval: 15_000,
  })

  return (
    <>
      <StatusBar style={FORCE_DARK_BANDEAU ? 'light' : 'dark'} />
      {FORCE_DARK_BANDEAU && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: INK,
            zIndex: 100,
          }}
        />
      )}
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
          name="courses"
          options={{
            title: 'Courses',
            tabBarIcon: ({ focused, size }) => (
              <TabIcon
                name={focused ? 'bicycle' : 'bicycle-outline'}
                focused={focused}
                size={size}
              />
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
    </>
  )
}
