import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { fetchUnreadCount } from '../../api/notifications'
import { fetchTermsStatus } from '../../api/terms'
import AcceptTermsSheet from '../../components/AcceptTermsSheet'
import { useAuthStore } from '../../stores/authStore'

export default function TabsLayout() {
  const user = useAuthStore((state) => state.user)

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
    enabled: !!user,
  })
  const termsQuery = useQuery({
    queryKey: ['terms'],
    queryFn: fetchTermsStatus,
    enabled: !!user,
  })

  if (!user) {
    return <Redirect href="/login" />
  }

  return (
    <>
      <AcceptTermsSheet
        visible={!!termsQuery.data?.needs_acceptance}
        onAccepted={() => termsQuery.refetch()}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#1A1614',
          tabBarInactiveTintColor: '#8A7E68',
          tabBarStyle: {
            minHeight: 68,
            paddingTop: 8,
            paddingBottom: 10,
            backgroundColor: '#FDFCF9',
            borderTopColor: '#EEE8DC',
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: 'PlusJakartaSans_700Bold',
          },
        }}
      >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="courses/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="new-course"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="addresses"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertes',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      </Tabs>
    </>
  )
}
