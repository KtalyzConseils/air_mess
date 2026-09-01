import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { View } from 'react-native'
import { fetchTermsStatus } from '../../api/terms'
import AcceptTermsSheet from '../../components/AcceptTermsSheet'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'
import { useThemeStore } from '../../stores/themeStore'

const TAB_LABELS = {
  fr: {
    dashboard: 'Accueil',
    courses: 'Courses',
    wallet: 'Wallet',
    profile: 'Profil',
  },
  en: {
    dashboard: 'Home',
    courses: 'Orders',
    wallet: 'Wallet',
    profile: 'Profile',
  },
} as const

export default function TabsLayout() {
  const user = useAuthStore((state) => state.user)
  const language = useLanguageStore((state) => state.language)
  const theme = useThemeStore((state) => state.theme)
  const labels = TAB_LABELS[language]
  const isDark = theme === 'dark'

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
          tabBarActiveTintColor: isDark ? '#FFCC00' : '#1A1614',
          tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#8A7E68',
          tabBarStyle: {
            minHeight: 74,
            paddingTop: 9,
            paddingBottom: 12,
            backgroundColor: isDark ? '#151821' : '#FDFCF9',
            borderTopColor: isDark ? '#2A2F3A' : '#EEE8DC',
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: 'PlusJakartaSans_700Bold',
            marginTop: 3,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          tabBarBadgeStyle: {
            backgroundColor: '#D40511',
            color: '#FFFFFF',
            fontFamily: 'PlusJakartaSans_800ExtraBold',
            fontSize: 10,
            minWidth: 18,
            height: 18,
          },
        }}
      >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: labels.dashboard,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: labels.courses,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'cube' : 'cube-outline'} focused={focused} isDark={isDark} />
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
          title: labels.wallet,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: labels.profile,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} isDark={isDark} />
          ),
        }}
      />
      </Tabs>
    </>
  )
}

function TabIcon({
  name,
  focused,
  isDark,
}: {
  name: keyof typeof Ionicons.glyphMap
  focused: boolean
  isDark: boolean
}) {
  const iconColor = focused ? '#1A1614' : isDark ? '#9CA3AF' : '#8A7E68'

  return (
    <View
      className="h-8 w-12 items-center justify-center rounded-full"
      style={{
        backgroundColor: focused ? '#FFCC00' : 'transparent',
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? (isDark ? '#FFE066' : '#F2C100') : 'transparent',
      }}
    >
      <Ionicons name={name} color={iconColor} size={20} />
    </View>
  )
}
