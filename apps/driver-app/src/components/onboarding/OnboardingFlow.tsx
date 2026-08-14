import { useMemo, useRef, useState, type JSX } from 'react'
import { View, Text, Pressable, Animated, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import Button from '../ui/Button'
import {
  AvailabilityPreview,
  CourseSwipePreview,
  PendingValidationPreview,
  WalletPreview,
  PermissionsPreview,
} from './OnboardingMockPreviews'

export type OnboardingSlide = {
  title: string
  subtitle: string
  Preview: () => JSX.Element
}

const ACTIVE_DRIVER_SLIDES: OnboardingSlide[] = [
  {
    title: 'Passez en ligne',
    subtitle: 'Activez votre disponibilité pour recevoir des courses près de vous.',
    Preview: AvailabilityPreview,
  },
  {
    title: 'Acceptez en un geste',
    subtitle: 'Swipez une carte pour accepter ou refuser. Touchez-la pour voir tous les détails.',
    Preview: CourseSwipePreview,
  },
  {
    title: 'Suivez vos gains',
    subtitle: 'Votre wallet se met à jour après chaque course livrée.',
    Preview: WalletPreview,
  },
  {
    title: 'Autorisez l’essentiel',
    subtitle: 'GPS et notifications : l’app vous les demandera au bon moment.',
    Preview: PermissionsPreview,
  },
]

interface Props {
  onComplete: () => void
  pendingValidation?: boolean
}

export default function OnboardingFlow({ onComplete, pendingValidation = false }: Props) {
  const [step, setStep] = useState(0)
  const fade = useRef(new Animated.Value(1)).current
  const slides = useMemo<OnboardingSlide[]>(() => {
    if (!pendingValidation) return ACTIVE_DRIVER_SLIDES
    return [
      {
        title: 'Profil en vérification',
        subtitle: "Votre compte est connecté. Les courses s'activeront après validation admin.",
        Preview: PendingValidationPreview,
      },
      ...ACTIVE_DRIVER_SLIDES.slice(1),
    ]
  }, [pendingValidation])
  const slide = slides[step]
  const isLast = step === slides.length - 1

  function animateTo(next: number) {
    Animated.sequence([
      Animated.timing(fade, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
    setTimeout(() => setStep(next), 120)
  }

  function goNext() {
    if (isLast) {
      onComplete()
      return
    }
    animateTo(step + 1)
  }

  return (
    <View className="flex-1 bg-cream">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-5 pt-2 pb-4 flex-row items-center justify-between">
          <View className="flex-row gap-1.5 flex-1 mr-3">
            {slides.map((_, i) => (
              <View
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= step ? 'bg-airmess-yellow' : 'bg-warm-200'
                }`}
              />
            ))}
          </View>
          <Pressable
            onPress={onComplete}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Passer l'introduction"
          >
            <Text className="text-warm-500 text-sm font-jk-bold">Passer</Text>
          </Pressable>
        </View>

        {/* Contenu */}
        <Animated.View
          style={{ flex: 1, opacity: fade }}
          className="px-5 justify-center"
        >
          <View className="items-center mb-8">
            <View className="w-14 h-14 rounded-2xl bg-airmess-dark items-center justify-center mb-5">
              <Ionicons
                name={
                  step === 0
                    ? 'radio-button-on'
                    : step === 1
                      ? 'swap-horizontal'
                      : step === 2
                        ? 'wallet'
                        : 'shield-checkmark'
                }
                size={28}
                color="#FFCC00"
              />
            </View>
            <Text className="text-ink text-2xl font-jk-extrabold text-center">
              {slide.title}
            </Text>
            <Text className="text-warm-500 text-base font-jk-medium text-center mt-2 leading-6 px-2">
              {slide.subtitle}
            </Text>
          </View>

          <slide.Preview />
        </Animated.View>

        {/* Footer */}
        <View className="px-5 pb-6 pt-4">
          <Text className="text-warm-400 text-xs font-jk-medium text-center mb-4 tabular-nums">
            {step + 1} / {slides.length}
          </Text>
          <Button onPress={goNext}>{isLast ? 'Commencer' : 'Suivant'}</Button>
        </View>
      </SafeAreaView>
    </View>
  )
}
