import { Pressable, Switch, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Card from '../components/ui/Card'
import Screen from '../components/ui/Screen'
import { useLanguageStore, type AppLanguage } from '../stores/languageStore'
import { useThemeStore, type AppTheme } from '../stores/themeStore'

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string; subtitle: string }[] = [
  { value: 'fr', label: 'Francais', subtitle: 'Interface en francais' },
  { value: 'en', label: 'English', subtitle: 'English interface' },
]

const THEME_OPTIONS: { value: AppTheme; label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Clair', subtitle: 'Fond creme classique', icon: 'sunny-outline' },
  { value: 'dark', label: 'Sombre', subtitle: 'Fond sombre et contraste eleve', icon: 'moon-outline' },
]

const COPY = {
  fr: {
    title: 'Parametres',
    subtitle: 'Langue et apparence de l app',
    language: 'Langue',
    languageSubtitle: 'Choisis la langue de l interface',
    appearance: 'Apparence',
    appearanceSubtitle: 'Active ou desactive le theme sombre',
    darkMode: 'Theme sombre',
  },
  en: {
    title: 'Settings',
    subtitle: 'App language and appearance',
    language: 'Language',
    languageSubtitle: 'Choose the interface language',
    appearance: 'Appearance',
    appearanceSubtitle: 'Turn dark mode on or off',
    darkMode: 'Dark mode',
  },
} as const

export default function SettingsScreen() {
  const router = useRouter()
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const isDark = theme === 'dark'
  const copy = COPY[language]
  const iconColor = isDark ? '#FDFCF9' : '#1A1614'

  return (
    <Screen scroll py={14} className="px-5">
      <Pressable
        onPress={() => router.back()}
        className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-off-white dark:bg-[#181B24]"
        accessibilityRole="button"
        accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
      >
        <Ionicons name="arrow-back" size={24} color={iconColor} />
      </Pressable>

      <Text className="text-3xl font-extrabold text-ink dark:text-white">{copy.title}</Text>
      <Text className="mt-2 text-sm font-semibold leading-5 text-warm-500 dark:text-[#AEB6C5]">
        {copy.subtitle}
      </Text>

      <Card className="mt-6" padding="lg">
        <SectionHeader
          icon="language-outline"
          title={copy.language}
          subtitle={copy.languageSubtitle}
        />
        <View className="mt-4 gap-3">
          {LANGUAGE_OPTIONS.map((option) => (
            <ChoiceRow
              key={option.value}
              title={option.label}
              subtitle={option.subtitle}
              selected={option.value === language}
              icon={option.value === 'fr' ? 'flag-outline' : 'globe-outline'}
              onPress={() => {
                void setLanguage(option.value)
              }}
            />
          ))}
        </View>
      </Card>

      <Card className="mt-5" padding="lg">
        <SectionHeader
          icon="color-palette-outline"
          title={copy.appearance}
          subtitle={copy.appearanceSubtitle}
        />
        <View className="mt-4 gap-3">
          {THEME_OPTIONS.map((option) => (
            <ChoiceRow
              key={option.value}
              title={language === 'en' && option.value === 'light' ? 'Light' : language === 'en' && option.value === 'dark' ? 'Dark' : option.label}
              subtitle={language === 'en' && option.value === 'light' ? 'Classic cream background' : language === 'en' && option.value === 'dark' ? 'Dark background and high contrast' : option.subtitle}
              selected={option.value === theme}
              icon={option.icon}
              onPress={() => {
                void setTheme(option.value)
              }}
            />
          ))}
        </View>

        <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-cream px-4 py-3 dark:bg-[#11141B]">
          <Text className="text-base font-extrabold text-ink dark:text-white">{copy.darkMode}</Text>
          <Switch
            value={isDark}
            onValueChange={(enabled) => {
              void setTheme(enabled ? 'dark' : 'light')
            }}
            trackColor={{ false: '#D9D2C4', true: '#FFCC00' }}
            thumbColor={isDark ? '#FDFCF9' : '#FFFFFF'}
          />
        </View>
      </Card>
    </Screen>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
}) {
  return (
    <View className="flex-row items-center">
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
        <Ionicons name={icon} size={22} color="#1A1614" />
      </View>
      <View className="flex-1">
        <Text className="text-xl font-extrabold text-ink dark:text-white">{title}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  )
}

function ChoiceRow({
  title,
  subtitle,
  selected,
  icon,
  onPress,
}: {
  title: string
  subtitle: string
  selected: boolean
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
}) {
  const theme = useThemeStore((state) => state.theme)
  const iconColor = selected || theme !== 'dark' ? '#1A1614' : '#FDFCF9'

  return (
    <Pressable
      onPress={onPress}
      className={[
        'min-h-16 flex-row items-center rounded-2xl border px-4 py-3',
        selected
          ? 'border-airmess-yellow bg-airmess-yellow'
          : 'border-warm-200 bg-white dark:border-[#343A46] dark:bg-[#11141B]',
      ].join(' ')}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      <View className="ml-3 flex-1">
        <Text className={['text-base font-extrabold', selected ? 'text-ink' : 'text-ink dark:text-white'].join(' ')}>
          {title}
        </Text>
        <Text
          className={['mt-0.5 text-xs font-semibold', selected ? 'text-warm-600' : 'text-warm-500 dark:text-[#AEB6C5]'].join(' ')}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color="#1A1614" />}
    </Pressable>
  )
}
