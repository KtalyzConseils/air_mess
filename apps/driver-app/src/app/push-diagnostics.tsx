import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { inspectPushConfiguration, PushDiagnostic, showLocalPushTest } from '../lib/pushDiagnostics'
import { syncPushToken } from '../hooks/usePushTokenRegistration'
import { openFullScreenIntentSettings } from '../lib/fullScreenPermission'

export default function PushDiagnosticsScreen() {
  const router = useRouter()
  const [result, setResult] = useState<PushDiagnostic | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setResult(await inspectPushConfiguration())
    } catch (error) {
      Alert.alert('Diagnostic impossible', String(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function resync() {
    setLoading(true)
    const ok = await syncPushToken()
    await refresh()
    Alert.alert(ok ? 'Synchronisé' : 'Échec', ok
      ? 'Ce téléphone est enregistré pour les notifications.'
      : 'Vérifie Internet et les autorisations, puis réessaie.')
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center px-5 py-3">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#1A1614" />
        </Pressable>
        <Text className="text-xl font-jk-extrabold text-ink ml-2">Diagnostic notifications</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        {loading && !result ? <ActivityIndicator size="large" color="#1A1614" /> : null}
        {result ? (
          <View className="bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
            <Status label="Autorisation" ok={result.permission === 'granted'} value={result.permission} />
            <Status label="Token sur le téléphone" ok={result.tokenStored} />
            <Status label="Token enregistré sur le serveur" ok={result.tokenRegistered} />
            <Status label="Canal appels de course" ok={result.incomingChannelEnabled === true} />
            <Status label="Dernière synchronisation" ok={Boolean(result.lastSync)} value={result.lastSync ? new Date(result.lastSync).toLocaleString('fr-FR') : 'Jamais'} last />
          </View>
        ) : null}

        <Action title="Resynchroniser ce téléphone" onPress={() => { void resync() }} />
        <Action title="Tester une notification locale" onPress={() => { void showLocalPushTest() }} />
        <Action title="Réglages plein écran" onPress={() => { void openFullScreenIntentSettings() }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function Status({ label, ok, value, last = false }: { label: string; ok: boolean; value?: string; last?: boolean }) {
  return (
    <View className={`flex-row items-center px-4 py-4 ${last ? '' : 'border-b border-warm-200'}`}>
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={21} color={ok ? '#16A34A' : '#D40511'} />
      <Text className="flex-1 text-ink font-jk-bold ml-3">{label}</Text>
      {value ? <Text className="text-xs text-warm-500 ml-2">{value}</Text> : null}
    </View>
  )
}

function Action({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="bg-airmess-dark rounded-2xl py-4 px-5">
      <Text className="text-white text-center font-jk-extrabold">{title}</Text>
    </Pressable>
  )
}
