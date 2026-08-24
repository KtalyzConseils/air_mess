import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import { useAuthStore } from '../../stores/authStore'

export default function ProfileScreen() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const title =
    user?.marchant?.raison_sociale ??
    [user?.individual?.first_name, user?.individual?.last_name].filter(Boolean).join(' ') ??
    user?.name ??
    'Profil'

  const subtitle = user?.phone ?? user?.email ?? ''
  const isMarchantValidated = user?.type !== 'marchant' || !!user.marchant?.validated_at

  return (
    <Screen scroll py={14} className="px-5">
      <Pressable
        onPress={() => router.back()}
        className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-off-white"
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Ionicons name="arrow-back" size={24} color="#1A1614" />
      </Pressable>

      <View className="items-center">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-warm-200">
          <Ionicons name="person" size={58} color="#FDFCF9" />
        </View>
        <View className="mt-4 flex-row items-center">
          <Text className="max-w-[280px] text-center text-2xl font-extrabold text-ink" numberOfLines={1}>
            {title}
          </Text>
          <Ionicons name="checkmark-circle" size={18} color="#1A1614" />
        </View>
        <Text className="mt-1 text-center text-base font-semibold text-warm-500" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View className="mt-7 flex-row justify-between">
        <QuickAction href="/(tabs)/courses" icon="time" label="Historique" />
        <QuickAction icon="headset" label="Assistance" />
        <QuickAction icon="location" label="Adresses" />
        <QuickAction icon="settings" label="Parametres" />
      </View>

      <Card variant={isMarchantValidated ? 'success' : 'warning'} className="mt-6 flex-row items-center">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-off-white">
          <Text className="text-base font-extrabold text-info">
            {isMarchantValidated ? '2/2' : '1/2'}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-ink">
            {isMarchantValidated ? 'Profil confirme' : 'Confirmer votre profil'}
          </Text>
          <Text className="text-sm leading-5 text-warm-600">
            Visible par les conducteurs durant les courses.
          </Text>
        </View>
      </Card>

      <Card className="mt-5" padding="none">
        <MenuRow icon="card" title="Modes de paiement" subtitle="Wallet AirMess et especes" href="/(tabs)/wallet" />
      </Card>

      <Pressable
        className="mt-5 h-16 flex-row items-center rounded-2xl bg-airmess-dark px-5"
        accessibilityRole="button"
      >
        <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-airmess-yellow">
          <Ionicons name="bicycle" size={20} color="#1A1614" />
        </View>
        <Text className="flex-1 text-lg font-extrabold text-white">Devenez livreur</Text>
        <Ionicons name="chevron-forward" size={22} color="#D40511" />
      </Pressable>

      <Card className="mt-5" padding="none">
        <MenuRow icon="shield-checkmark" title="Securite" subtitle="Compte, mot de passe et sessions" />
        <Divider />
        <MenuRow icon="information-circle" title="Informations" subtitle="A propos de AirMess" />
      </Card>

      <Pressable
        className="mt-5 min-h-14 flex-row items-center rounded-2xl border border-airmess-red/30 bg-off-white px-5 py-3"
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={22} color="#D40511" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-extrabold text-airmess-red">Supprimer mon compte</Text>
          <Text className="mt-0.5 text-xs font-semibold text-warm-500">
            Demande definitive de suppression
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={21} color="#D40511" />
      </Pressable>

      <Pressable
        onPress={logout}
        className="mt-5 h-14 items-center justify-center rounded-2xl bg-danger-bg"
        accessibilityRole="button"
      >
        <Text className="text-base font-extrabold text-airmess-red">Se deconnecter</Text>
      </Pressable>
    </Screen>
  )
}

function QuickAction({
  icon,
  label,
  href,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  href?: '/(tabs)/courses' | '/(tabs)/wallet'
}) {
  const content = (
    <Pressable className="items-center" accessibilityRole="button">
      <View className="mb-2 h-14 w-14 items-center justify-center rounded-full bg-off-white">
        <Ionicons name={icon} size={24} color="#1A1614" />
      </View>
      <Text className="text-center text-sm font-extrabold text-ink">{label}</Text>
    </Pressable>
  )

  if (!href) return content
  return (
    <Link href={href} asChild>
      {content}
    </Link>
  )
}

function MenuRow({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  href?: '/(tabs)/wallet'
}) {
  const content = (
    <Pressable className="min-h-20 flex-row items-center px-5 py-3" accessibilityRole="button">
      <Ionicons name={icon} size={25} color="#1A1614" />
      <View className="ml-4 flex-1">
        <Text className="text-xl font-extrabold text-ink">{title}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-warm-500" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#1A1614" />
    </Pressable>
  )

  if (!href) return content
  return (
    <Link href={href} asChild>
      {content}
    </Link>
  )
}

function Divider() {
  return <View className="ml-16 h-px bg-warm-200" />
}
