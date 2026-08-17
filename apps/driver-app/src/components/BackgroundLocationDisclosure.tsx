import { useEffect, useState } from 'react'
import { Image, Modal, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Button from './ui/Button'
import {
  acceptBackgroundLocationDisclosure,
  deferBackgroundLocationDisclosure,
  subscribeBackgroundLocationDisclosure,
} from '../lib/backgroundLocationDisclosure'

const DISCLOSURE_TEXT =
  "Air Mess utilise votre position, y compris quand l'application est en arrière-plan ou fermée, pour vous proposer les courses les plus proches en temps réel et permettre au client de suivre sa livraison. Sans cette autorisation, vous ne pourrez pas recevoir de courses."

export default function BackgroundLocationDisclosure() {
  const [visible, setVisible] = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeBackgroundLocationDisclosure(setVisible)
    return () => {
      unsubscribe()
    }
  }, [])

  async function handleAccept() {
    setAccepting(true)
    try {
      await acceptBackgroundLocationDisclosure()
    } finally {
      setAccepting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView className="flex-1 bg-airmess-dark px-6" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center">
          <View className="items-center">
            <View className="w-28 h-28 rounded-[28px] bg-airmess-yellow items-center justify-center overflow-hidden">
              <Image
                source={require('../../assets/images/splash-icon.png')}
                className="w-24 h-24"
                resizeMode="contain"
              />
            </View>

            <Text className="text-white text-3xl font-jk-extrabold mt-6 text-center">
              Air Mess
            </Text>
            <Text className="text-airmess-yellow text-xs font-jk-extrabold uppercase tracking-widest mt-2">
              Position en arrière-plan
            </Text>
          </View>

          <View className="bg-white/10 border border-white/15 rounded-2xl p-5 mt-8">
            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-airmess-yellow items-center justify-center mr-3">
                <Ionicons name="location" size={20} color="#1A1614" />
              </View>
              <Text className="text-white text-base leading-6 font-jk-semibold flex-1">
                {DISCLOSURE_TEXT}
              </Text>
            </View>
          </View>
        </View>

        <View className="pb-4">
          <Button
            size="lg"
            variant="primary"
            loading={accepting}
            onPress={() => {
              void handleAccept()
            }}
            leftIcon={<Ionicons name="checkmark-circle" size={19} color="#1A1614" />}
          >
            Autoriser
          </Button>
          <View className="mt-3">
            <Button
              size="lg"
              variant="ghost"
              disabled={accepting}
              onPress={deferBackgroundLocationDisclosure}
            >
              Plus tard
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}
