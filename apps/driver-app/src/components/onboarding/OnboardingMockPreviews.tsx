import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

/** Aperçus statiques — pas de logique métier, juste de l'éducation visuelle. */

export function PendingValidationPreview() {
  return (
    <View className="rounded-2xl bg-off-white border border-warm-200 p-4 w-full">
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-warning-bg items-center justify-center mr-3">
          <Ionicons name="hourglass" size={22} color="#F59E0B" />
        </View>
        <View className="flex-1">
          <Text className="text-ink text-base font-jk-extrabold">Activation en attente</Text>
          <Text className="text-warm-500 text-xs font-jk-medium mt-0.5">
            L'équipe vérifie votre profil livreur.
          </Text>
        </View>
      </View>
      <View className="mt-4 rounded-xl bg-warm-100 p-3">
        <Text className="text-warm-600 text-xs font-jk-bold">
          Vous pouvez découvrir l'app maintenant. Les courses seront disponibles après
          validation admin.
        </Text>
      </View>
    </View>
  )
}

export function AvailabilityPreview() {
  return (
    <View className="rounded-2xl bg-off-white border border-warm-200 p-4 w-full">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-ink text-base font-jk-extrabold">Disponibilité</Text>
          <Text className="text-warm-500 text-xs font-jk-medium mt-0.5">
            Passez en ligne pour recevoir des courses
          </Text>
        </View>
        <View className="bg-airmess-yellow rounded-full px-4 py-2">
          <Text className="text-ink text-xs font-jk-extrabold">En ligne</Text>
        </View>
      </View>
      <View className="mt-4 flex-row gap-2">
        <View className="flex-1 rounded-xl bg-warm-100 py-2 items-center">
          <Text className="text-warm-500 text-[10px] font-jk-bold">Hors ligne</Text>
        </View>
        <View className="flex-1 rounded-xl bg-airmess-yellow/30 py-2 items-center border border-airmess-yellow">
          <Text className="text-ink text-[10px] font-jk-extrabold">En ligne</Text>
        </View>
        <View className="flex-1 rounded-xl bg-warm-100 py-2 items-center">
          <Text className="text-warm-500 text-[10px] font-jk-bold">Pause</Text>
        </View>
      </View>
    </View>
  )
}

export function CourseSwipePreview() {
  return (
    <View className="w-full">
      <View className="flex-row justify-between mb-2 px-1">
        <Text className="text-airmess-red text-[10px] font-jk-bold">← Refuser</Text>
        <Text className="text-success text-[10px] font-jk-bold">Accepter →</Text>
      </View>
      <View className="rounded-2xl bg-off-white border border-warm-200 p-4">
        <View className="flex-row justify-between items-start">
          <View className="bg-airmess-red px-2 py-1 rounded-md">
            <Text className="text-white text-[10px] font-jk-extrabold">Express</Text>
          </View>
          <Text className="text-ink text-xl font-jk-extrabold">1 850</Text>
        </View>
        <View className="mt-3">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-airmess-yellow mr-2" />
            <Text className="text-warm-500 text-[10px] font-jk-bold uppercase">Retrait</Text>
          </View>
          <Text className="text-ink text-[13px] font-jk-bold ml-4 mt-0.5">
            Restaurant Le Pilier — Akpakpa
          </Text>
        </View>
        <View className="mt-2 flex-row items-center justify-center py-2 border-t border-warm-100 mt-3">
          <Ionicons name="information-circle-outline" size={14} color="#8A7E68" />
          <Text className="text-warm-500 text-xs font-jk-medium ml-1">
            Touchez la carte pour le détail
          </Text>
        </View>
      </View>
    </View>
  )
}

export function WalletPreview() {
  return (
    <View className="rounded-2xl bg-airmess-dark p-4 w-full">
      <Text className="text-warm-300 text-xs font-jk-bold uppercase tracking-wide">
        Solde disponible
      </Text>
      <Text className="text-airmess-yellow text-3xl font-jk-extrabold mt-1">
        12 450 FCFA
      </Text>
      <View className="flex-row mt-4 gap-3">
        <View className="flex-1 rounded-xl bg-white/10 p-3">
          <Text className="text-warm-300 text-[10px] font-jk-bold">Aujourd&apos;hui</Text>
          <Text className="text-white text-base font-jk-extrabold mt-1">+ 3 200 F</Text>
        </View>
        <View className="flex-1 rounded-xl bg-white/10 p-3">
          <Text className="text-warm-300 text-[10px] font-jk-bold">Courses</Text>
          <Text className="text-white text-base font-jk-extrabold mt-1">7</Text>
        </View>
      </View>
    </View>
  )
}

export function PermissionsPreview() {
  return (
    <View className="w-full gap-3">
      <View className="flex-row items-center rounded-2xl bg-off-white border border-warm-200 p-4">
        <View className="w-10 h-10 rounded-full bg-info-bg items-center justify-center mr-3">
          <Ionicons name="location" size={20} color="#0284C7" />
        </View>
        <View className="flex-1">
          <Text className="text-ink text-sm font-jk-bold">Position GPS</Text>
          <Text className="text-warm-500 text-xs font-jk-medium mt-0.5">
            Pour les courses proches et le suivi client
          </Text>
        </View>
      </View>
      <View className="flex-row items-center rounded-2xl bg-off-white border border-warm-200 p-4">
        <View className="w-10 h-10 rounded-full bg-warning-bg items-center justify-center mr-3">
          <Ionicons name="notifications" size={20} color="#F59E0B" />
        </View>
        <View className="flex-1">
          <Text className="text-ink text-sm font-jk-bold">Notifications</Text>
          <Text className="text-warm-500 text-xs font-jk-medium mt-0.5">
            Pour ne manquer aucune course entrante
          </Text>
        </View>
      </View>
    </View>
  )
}
