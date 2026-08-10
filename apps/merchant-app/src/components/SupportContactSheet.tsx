import { View, Text, Pressable, Linking } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../stores/authStore'
import { fetchSupportContact } from '../api/supportContact'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'

interface Props {
  visible: boolean
  onClose: () => void
  /**
   * Contexte optionnel pré-rempli dans le message WhatsApp/email
   * (ex. "Course #AM-2026-1234", "Compte banni"). Aide l'agent support
   * à identifier le problème sans re-question.
   */
  context?: string
}

function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function buildMailtoUrl(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${email}?${params.toString()}`
}

/**
 * BottomSheet de contact support pour le driver-app — 3 options éventuelles
 * (téléphone, WhatsApp, email) selon les settings back. Valeur vide côté back
 * = option masquée. Injecte l'email du driver + un contexte optionnel dans le
 * pré-remplissage WhatsApp/email.
 */
export default function SupportContactSheet({ visible, onClose, context }: Props) {
  const user = useAuthStore((s) => s.user)

  const { data: contact, isLoading } = useQuery({
    queryKey: ['support-contact'],
    queryFn: fetchSupportContact,
    enabled: visible,
    staleTime: 5 * 60_000,
  })

  const accountTag = user?.email ? `[${user.email}]` : ''
  const prefill = ['Bonjour, j\'ai besoin d\'aide.', accountTag, context].filter(Boolean).join(' — ')

  const hasPhone = !!contact?.phone?.trim()
  const hasWhatsApp = !!contact?.whatsapp?.trim()
  const hasEmail = !!contact?.email?.trim()
  const hasAny = hasPhone || hasWhatsApp || hasEmail

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Contacter le support"
      subtitle="On te rappelle vite. Choisis un canal."
      footer={
        <Button variant="outline" size="md" onPress={onClose}>
          Fermer
        </Button>
      }
    >
      {isLoading && (
        <Text className="text-center text-warm-500 text-sm py-4">Chargement…</Text>
      )}

      {!isLoading && !hasAny && (
        <Text className="text-center text-warm-500 text-sm italic py-4">
          Les contacts support ne sont pas encore configurés. Réessaie plus tard.
        </Text>
      )}

      <View className="gap-2">
        {hasPhone && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${contact!.phone}`)}
            className="flex-row items-center gap-3 bg-white border border-warm-200 rounded-2xl px-4 py-3"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <View className="w-11 h-11 rounded-full bg-success-bg items-center justify-center">
              <Ionicons name="call" size={20} color="#0F8A2E" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-ink">Appeler</Text>
              <Text className="text-xs text-warm-500">{contact!.phone}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6E6558" />
          </Pressable>
        )}

        {hasWhatsApp && (
          <Pressable
            onPress={() => Linking.openURL(buildWhatsAppUrl(contact!.whatsapp, prefill))}
            className="flex-row items-center gap-3 bg-white border border-warm-200 rounded-2xl px-4 py-3"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: '#25D36620' }}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-ink">WhatsApp</Text>
              <Text className="text-xs text-warm-500">Message pré-rempli avec ton compte</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6E6558" />
          </Pressable>
        )}

        {hasEmail && (
          <Pressable
            onPress={() => Linking.openURL(buildMailtoUrl(contact!.email, 'Demande support', prefill))}
            className="flex-row items-center gap-3 bg-white border border-warm-200 rounded-2xl px-4 py-3"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <View className="w-11 h-11 rounded-full bg-info-bg items-center justify-center">
              <Ionicons name="mail" size={20} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-ink">Envoyer un email</Text>
              <Text className="text-xs text-warm-500" numberOfLines={1}>{contact!.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6E6558" />
          </Pressable>
        )}
      </View>
    </BottomSheet>
  )
}
