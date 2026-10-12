import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Screen from '../components/ui/Screen'
import { changePassword } from '../api/profile'
import { getApiErrorMessage } from '../lib/apiError'
import { useLanguageStore } from '../stores/languageStore'
import { useThemeStore } from '../stores/themeStore'

const SECURITY_COPY = {
  fr: {
    title: 'Securite',
    subtitle: 'Modifier le mot de passe du compte',
    currentPassword: 'Mot de passe actuel',
    currentPasswordPlaceholder: '********',
    newPassword: 'Nouveau mot de passe',
    newPasswordPlaceholder: '8 caracteres minimum',
    newPasswordHelper: '8 caracteres minimum. Le nouveau mot de passe doit etre different de l actuel.',
    confirmPassword: 'Confirmer le nouveau mot de passe',
    confirmPasswordPlaceholder: 'Retape le nouveau mot de passe',
    mismatch: 'Les deux mots de passe ne sont pas identiques.',
    submit: 'Enregistrer le nouveau mot de passe',
    success: 'Mot de passe modifie. Tes autres appareils ont ete deconnectes.',
    back: 'Retour',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
  },
  en: {
    title: 'Security',
    subtitle: 'Change the account password',
    currentPassword: 'Current password',
    currentPasswordPlaceholder: '********',
    newPassword: 'New password',
    newPasswordPlaceholder: '8 characters minimum',
    newPasswordHelper: '8 characters minimum. The new password must differ from the current one.',
    confirmPassword: 'Confirm the new password',
    confirmPasswordPlaceholder: 'Type the new password again',
    mismatch: 'The two passwords are not identical.',
    submit: 'Save the new password',
    success: 'Password changed. Your other devices have been signed out.',
    back: 'Back',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
} as const

export default function SecurityScreen() {
  const router = useRouter()
  const language = useLanguageStore((state) => state.language)
  const theme = useThemeStore((state) => state.theme)
  const copy = SECURITY_COPY[language]
  const isDark = theme === 'dark'

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const tooShort = newPassword.length > 0 && newPassword.length < 8
  const mismatch = confirmation.length > 0 && newPassword !== confirmation
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmation &&
    newPassword !== currentPassword &&
    !saving

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmation,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setSuccess(copy.success)
    } catch (err) {
      setError(getApiErrorMessage(err, language))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen scroll py={14} className="px-5">
      <Pressable
        onPress={() => router.back()}
        className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-off-white dark:bg-[#181B24]"
        accessibilityRole="button"
        accessibilityLabel={copy.back}
      >
        <Ionicons name="arrow-back" size={24} color={isDark ? '#FDFCF9' : '#1A1614'} />
      </Pressable>

      <Text className="text-3xl font-extrabold text-ink dark:text-white">{copy.title}</Text>
      <Text className="mt-2 text-sm font-semibold leading-5 text-warm-500 dark:text-[#AEB6C5]">
        {copy.subtitle}
      </Text>

      <Card className="mt-6" padding="lg">
        <View className="flex-row items-center">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
            <Ionicons name="lock-closed-outline" size={22} color="#1A1614" />
          </View>
          <Text className="flex-1 text-xl font-extrabold text-ink dark:text-white">
            {copy.newPassword}
          </Text>
        </View>

        <FieldLabel>{copy.currentPassword}</FieldLabel>
        <PasswordInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder={copy.currentPasswordPlaceholder}
          visible={showPasswords}
          onToggle={() => setShowPasswords((value) => !value)}
          showLabel={copy.showPassword}
          hideLabel={copy.hidePassword}
        />

        <FieldLabel>{copy.newPassword}</FieldLabel>
        <PasswordInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={copy.newPasswordPlaceholder}
          visible={showPasswords}
          onToggle={() => setShowPasswords((value) => !value)}
          showLabel={copy.showPassword}
          hideLabel={copy.hidePassword}
        />
        <HelperText tone={tooShort ? 'error' : 'muted'}>{copy.newPasswordHelper}</HelperText>

        <FieldLabel>{copy.confirmPassword}</FieldLabel>
        <PasswordInput
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder={copy.confirmPasswordPlaceholder}
          visible={showPasswords}
          onToggle={() => setShowPasswords((value) => !value)}
          showLabel={copy.showPassword}
          hideLabel={copy.hidePassword}
        />
        {mismatch ? <HelperText tone="error">{copy.mismatch}</HelperText> : null}

        {error ? (
          <View className="mt-4 flex-row items-start rounded-2xl border-2 border-airmess-red/30 bg-danger-bg p-3">
            <Ionicons name="alert-circle" size={18} color="#D40511" />
            <Text className="ml-2 flex-1 text-sm font-semibold text-airmess-red">{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View className="mt-4 flex-row items-start rounded-2xl border-2 border-success/30 bg-success-bg p-3">
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text className="ml-2 flex-1 text-sm font-semibold text-success">{success}</Text>
          </View>
        ) : null}

        <Button
          className="mt-5"
          size="lg"
          onPress={() => void handleSubmit()}
          loading={saving}
          disabled={!canSubmit}
          rightIcon={<Ionicons name="checkmark" size={20} color="#1A1614" />}
        >
          {copy.submit}
        </Button>
      </Card>
    </Screen>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 mt-4 text-xs font-extrabold uppercase text-warm-500 dark:text-[#AEB6C5]">
      {children}
    </Text>
  )
}

function HelperText({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <Text
      className={['mt-1.5 text-xs font-semibold', tone === 'error' ? 'text-airmess-red' : 'text-warm-500 dark:text-[#AEB6C5]'].join(' ')}
    >
      {children}
    </Text>
  )
}

function PasswordInput({
  value,
  onChangeText,
  placeholder,
  visible,
  onToggle,
  showLabel,
  hideLabel,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  visible: boolean
  onToggle: () => void
  showLabel: string
  hideLabel: string
}) {
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        placeholder={placeholder}
        placeholderTextColor="#A89F95"
        className="h-14 rounded-2xl border border-warm-200 bg-off-white px-4 pr-14 text-base font-semibold text-ink dark:border-[#343A46] dark:bg-[#11141B] dark:text-white"
      />
      <Pressable
        onPress={onToggle}
        className="absolute right-3 top-0 h-14 w-11 items-center justify-center"
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? hideLabel : showLabel}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8A7E68" />
      </Pressable>
    </View>
  )
}
