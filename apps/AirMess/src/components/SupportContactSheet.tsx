import { Linking, Pressable, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { fetchSupportContact } from '../api/supportContact'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import { useThemeStore } from '../stores/themeStore'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'

interface Props {
  visible: boolean
  onClose: () => void
  context?: string
}

const COPY = {
  fr: {
    title: 'Contacter le support',
    subtitle: 'Choisis le canal qui te convient.',
    loading: 'Chargement...',
    empty: 'Les contacts support ne sont pas encore configures. Reessaie plus tard.',
    call: 'Appeler',
    whatsapp: 'WhatsApp',
    whatsappSubtitle: 'Message pre-rempli avec ton compte',
    email: 'Envoyer un email',
    close: 'Fermer',
    message: "Bonjour, j'ai besoin d'aide.",
    subject: 'Demande support',
  },
  en: {
    title: 'Contact support',
    subtitle: 'Choose the channel that works best for you.',
    loading: 'Loading...',
    empty: 'Support contacts are not configured yet. Please try again later.',
    call: 'Call',
    whatsapp: 'WhatsApp',
    whatsappSubtitle: 'Message pre-filled with your account',
    email: 'Send an email',
    close: 'Close',
    message: 'Hello, I need help.',
    subject: 'Support request',
  },
} as const

function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function buildMailtoUrl(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${email}?${params.toString()}`
}

export default function SupportContactSheet({ visible, onClose, context }: Props) {
  const user = useAuthStore((state) => state.user)
  const language = useLanguageStore((state) => state.language)
  const theme = useThemeStore((state) => state.theme)
  const copy = COPY[language]
  const isDark = theme === 'dark'
  const iconColor = isDark ? '#FDFCF9' : '#1A1614'

  const { data: contact, isLoading } = useQuery({
    queryKey: ['support-contact'],
    queryFn: fetchSupportContact,
    enabled: visible,
    staleTime: 5 * 60_000,
  })

  const accountTag = user?.email ? `[${user.email}]` : ''
  const prefill = [copy.message, accountTag, context].filter(Boolean).join(' - ')
  const phone = contact?.phone?.trim() ?? ''
  const whatsapp = contact?.whatsapp?.trim() ?? ''
  const email = contact?.email?.trim() ?? ''
  const hasPhone = phone.length > 0
  const hasWhatsApp = whatsapp.length > 0
  const hasEmail = email.length > 0
  const hasAny = hasPhone || hasWhatsApp || hasEmail

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <Button variant="outline" size="md" onPress={onClose}>
          {copy.close}
        </Button>
      }
    >
      {isLoading && (
        <Text className="py-4 text-center text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]">
          {copy.loading}
        </Text>
      )}

      {!isLoading && !hasAny && (
        <Text className="py-4 text-center text-sm font-semibold italic text-warm-500 dark:text-[#AEB6C5]">
          {copy.empty}
        </Text>
      )}

      <View className="gap-2">
        {hasPhone && (
          <SupportOption
            icon="call"
            title={copy.call}
            subtitle={phone}
            iconBg="bg-success-bg"
            iconColor="#16A34A"
            chevronColor={iconColor}
            onPress={() => {
              void Linking.openURL(`tel:${phone}`)
            }}
          />
        )}

        {hasWhatsApp && (
          <SupportOption
            icon="logo-whatsapp"
            title={copy.whatsapp}
            subtitle={copy.whatsappSubtitle}
            iconBg="bg-success-bg"
            iconColor="#25D366"
            chevronColor={iconColor}
            onPress={() => {
              void Linking.openURL(buildWhatsAppUrl(whatsapp, prefill))
            }}
          />
        )}

        {hasEmail && (
          <SupportOption
            icon="mail"
            title={copy.email}
            subtitle={email}
            iconBg="bg-info-bg"
            iconColor="#0284C7"
            chevronColor={iconColor}
            onPress={() => {
              void Linking.openURL(buildMailtoUrl(email, copy.subject, prefill))
            }}
          />
        )}
      </View>
    </BottomSheet>
  )
}

function SupportOption({
  icon,
  title,
  subtitle,
  iconBg,
  iconColor,
  chevronColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  iconBg: string
  iconColor: string
  chevronColor: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-2xl border border-warm-200 bg-white px-4 py-3 dark:border-[#343A46] dark:bg-[#11141B]"
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
      accessibilityRole="button"
    >
      <View className={['mr-3 h-11 w-11 items-center justify-center rounded-full', iconBg].join(' ')}>
        <Ionicons name={icon} size={21} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-ink dark:text-white">{title}</Text>
        <Text className="mt-0.5 text-xs font-semibold text-warm-500 dark:text-[#AEB6C5]" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={chevronColor} />
    </Pressable>
  )
}
