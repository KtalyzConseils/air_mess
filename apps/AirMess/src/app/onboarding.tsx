import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import Button from '../components/ui/Button'
import Screen from '../components/ui/Screen'
import { PRIVACY_URL, TERMS_URL } from '../api/terms'
import { markFirstLaunchCompleted } from '../lib/firstLaunch'

const SLIDES = [
  {
    icon: 'storefront-outline',
    title: 'Gere tes livraisons Air Mess',
    body: 'Cree des courses, suis les livraisons et consulte ton historique depuis ton espace marchand.',
  },
  {
    icon: 'location-outline',
    title: 'Position utilisee avec ton accord',
    body: "AirMess utilise ta position pour remplir le point de prise en charge et calculer le prix. L'app marchand ne suit pas ta position en arriere-plan.",
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Confidentialite et conditions',
    body: 'Tes donnees servent a creer les courses, traiter les paiements et securiser les livraisons. Lis les regles avant de continuer.',
  },
] as const

export default function OnboardingScreen() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  async function continueNext() {
    if (!isLast) {
      setIndex((value) => value + 1)
      return
    }

    await markFirstLaunchCompleted()
    router.replace('/login')
  }

  return (
    <Screen variant="dark" className="px-6">
      <View className="flex-1 justify-between py-6">
        <View>
          <View className="flex-row items-center justify-between">
            <Image
              source={require('../../assets/logo/airmess-wordmark-white.svg')}
              style={{ width: 138, height: 38 }}
              contentFit="contain"
            />
            <Pressable
              onPress={() => void continueNext()}
              className="h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow"
              accessibilityRole="button"
              accessibilityLabel={isLast ? 'Terminer' : 'Suivant'}
            >
              <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={21} color="#1A1614" />
            </Pressable>
          </View>
        </View>

        <View>
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-[28px] bg-airmess-yellow">
            <Ionicons name={slide.icon} size={44} color="#1A1614" />
          </View>
          <Text className="text-4xl font-extrabold leading-[46px] text-white">
            {slide.title}
          </Text>
          <Text className="mt-4 text-base font-semibold leading-7 text-warm-300">
            {slide.body}
          </Text>

          {isLast && (
            <View className="mt-6 gap-2">
              <LegalButton title="Conditions generales" url={TERMS_URL} />
              <LegalButton title="Politique de confidentialite" url={PRIVACY_URL} />
            </View>
          )}
        </View>

        <View>
          <View className="mb-5 flex-row gap-2">
            {SLIDES.map((item, dotIndex) => (
              <View
                key={item.title}
                className={[
                  'h-2 rounded-full',
                  dotIndex === index ? 'w-8 bg-airmess-yellow' : 'w-2 bg-white/25',
                ].join(' ')}
              />
            ))}
          </View>
          <Button
            size="lg"
            onPress={() => void continueNext()}
            rightIcon={<Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={20} color="#1A1614" />}
          >
            {isLast ? 'Continuer' : 'Suivant'}
          </Button>
        </View>
      </View>
    </Screen>
  )
}

function LegalButton({ title, url }: { title: string; url: string }) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      className="min-h-12 flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3"
      accessibilityRole="link"
    >
      <Text className="text-sm font-extrabold text-white">{title}</Text>
      <Ionicons name="open-outline" size={18} color="#FFCC00" />
    </Pressable>
  )
}
