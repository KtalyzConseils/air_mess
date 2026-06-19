import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useAuthStore } from '../stores/authStore'
import { AxiosError } from 'axios'

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      const msg = err instanceof AxiosError
        ? err.response?.data?.message ?? 'Identifiants invalides.'
        : (err as Error).message
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-airmess-dark"
    >
      <View className="flex-1 items-center justify-center p-6">
        <View className="w-full max-w-md bg-white rounded-2xl p-6">
          <Text className="text-3xl font-bold text-airmess-dark text-center">RMess</Text>
          <Text className="text-gray-500 text-center mt-1 mb-6">Espace livreur</Text>

          <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            className="border border-gray-300 rounded-lg px-3 py-3 mb-3"
            placeholder="livreur@example.com"
          />

          <Text className="text-sm font-medium text-gray-700 mb-1">Mot de passe</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
          />

          {error && (
            <View className="bg-red-50 border border-red-200 p-3 rounded-lg mb-3">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="bg-airmess-yellow rounded-lg py-4 items-center"
          >
            {loading
              ? <ActivityIndicator color="#2C2C2C" />
              : <Text className="text-airmess-dark font-bold">Se connecter</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
