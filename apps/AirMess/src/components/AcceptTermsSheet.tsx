import { useState } from 'react'
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { acceptTerms, PRIVACY_URL, TERMS_URL } from '../api/terms'
import Button from './ui/Button'
import { useLanguageStore } from '../stores/languageStore'

const ACCEPT_TERMS_COPY = {
  fr: {
    title: 'Conditions et confidentialite',
    subtitle: "Avant de continuer, lis et accepte les conditions generales et la politique de confidentialite d'AirMess.",
    termsTitle: 'Conditions generales',
    termsSubtitle: "Regles d'utilisation du service",
    privacyTitle: 'Politique de confidentialite',
    privacySubtitle: 'Donnees collectees et usage de la position',
    checkbox: "J'ai lu et j'accepte les conditions generales et la politique de confidentialite d'AirMess.",
    error: "Impossible d'enregistrer ton acceptation. Reessaie dans un instant.",
    submit: "J'accepte et continue",
  },
  en: {
    title: 'Terms and privacy',
    subtitle: "Before continuing, read and accept AirMess' terms of service and privacy policy.",
    termsTitle: 'Terms of service',
    termsSubtitle: 'Rules for using the service',
    privacyTitle: 'Privacy policy',
    privacySubtitle: 'Data collected and use of location',
    checkbox: "I have read and accept AirMess' terms of service and privacy policy.",
    error: 'Unable to save your acceptance. Try again in a moment.',
    submit: 'I accept and continue',
  },
} as const

interface Props {
  visible: boolean
  onAccepted: () => void
}

export default function AcceptTermsSheet({ visible, onAccepted }: Props) {
  const queryClient = useQueryClient()
  const language = useLanguageStore((state) => state.language)
  const copy = ACCEPT_TERMS_COPY[language]
  const [checked, setChecked] = useState(false)

  const mutation = useMutation({
    mutationFn: acceptTerms,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] })
      onAccepted()
    },
  })

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <SafeAreaView className="flex-1 bg-cream dark:bg-[#0F1115]" edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <View className="items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-airmess-yellow">
              <Ionicons name="document-text-outline" size={30} color="#1A1614" />
            </View>
            <Text className="text-center text-2xl font-extrabold text-ink dark:text-white">
              {copy.title}
            </Text>
            <Text className="mt-2 text-center text-sm font-semibold leading-5 text-warm-600 dark:text-[#AEB6C5]">
              {copy.subtitle}
            </Text>
          </View>

          <View className="my-5 gap-2">
            <LegalLink title={copy.termsTitle} subtitle={copy.termsSubtitle} url={TERMS_URL} />
            <LegalLink title={copy.privacyTitle} subtitle={copy.privacySubtitle} url={PRIVACY_URL} />
          </View>

          <Pressable
            onPress={() => setChecked((value) => !value)}
            className={[
              'flex-row items-start rounded-2xl border px-4 py-3',
              checked ? 'border-success/30 bg-success-bg dark:bg-[#12281A]' : 'border-warm-200 bg-white dark:border-[#343A46] dark:bg-[#181B24]',
            ].join(' ')}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
          >
            <View
              className={[
                'mt-0.5 h-5 w-5 items-center justify-center rounded border-2',
                checked ? 'border-success bg-success' : 'border-warm-400 bg-white',
              ].join(' ')}
            >
              {checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text className="ml-3 flex-1 text-sm font-semibold leading-5 text-ink dark:text-white">
              {copy.checkbox}
            </Text>
          </Pressable>

          {mutation.isError && (
            <View className="mt-3 rounded-xl border border-airmess-red/30 bg-danger-bg px-4 py-3">
              <Text className="text-sm font-bold text-airmess-red">
                {copy.error}
              </Text>
            </View>
          )}

          <View className="mt-5">
            <Button
              size="lg"
              loading={mutation.isPending}
              disabled={!checked || mutation.isPending}
              onPress={() => mutation.mutate()}
            >
              {copy.submit}
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function LegalLink({ title, subtitle, url }: { title: string; subtitle: string; url: string }) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      className="min-h-16 flex-row items-center rounded-2xl border border-warm-200 bg-white px-4 py-3 dark:border-[#343A46] dark:bg-[#181B24]"
      accessibilityRole="link"
    >
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-warm-100 dark:bg-[#11141B]">
        <Ionicons name="open-outline" size={19} color="#1A1614" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-ink dark:text-white">{title}</Text>
        <Text className="mt-0.5 text-xs font-semibold text-warm-500 dark:text-[#AEB6C5]">{subtitle}</Text>
      </View>
    </Pressable>
  )
}
