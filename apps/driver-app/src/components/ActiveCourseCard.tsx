import { useState } from 'react'
import { View, Text, Pressable, TextInput, Linking } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transition, type DriverCourseSummary, type TransitionAction } from '../api/driver'
import { openGoogleMaps, openWaze } from '../utils/navigation'
import IncidentModal from './IncidentModal'
import FailCourseModal from './FailCourseModal'

interface Props {
  course: DriverCourseSummary & { destination_phone?: string; origin_phone?: string }
}

const NEXT_ACTION: Record<string, { action: TransitionAction; label: string; needsCode?: 'pickup' | 'delivery' }> = {
  assigned:         { action: 'start_to_pickup',  label: '🚀 Je pars chercher le colis' },
  driver_to_pickup: { action: 'arrived_pickup',    label: '📍 Je suis sur place (pickup)' },
  at_pickup:        { action: 'pickup_confirmed',  label: '✅ Colis récupéré', needsCode: 'pickup' },
  picked_up:        { action: 'arrived_dropoff',   label: '📍 J\'arrive chez le client' },
  at_dropoff:       { action: 'delivered',         label: '🎉 Livraison confirmée', needsCode: 'delivery' },
}

export default function ActiveCourseCard({ course }: Props) {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const next = NEXT_ACTION[course.status]

  // Avant pickup_confirmed → on va à l'origine ; après → on va à la destination
  const phase: 'pickup' | 'dropoff' = ['assigned', 'driver_to_pickup', 'at_pickup'].includes(course.status)
    ? 'pickup' : 'dropoff'

  const targetLat = phase === 'pickup' ? course.origin_lat : course.destination_lat
  const targetLng = phase === 'pickup' ? course.origin_lng : course.destination_lng
  const targetLabel = phase === 'pickup' ? course.origin_name : course.destination_name

  const mutation = useMutation({
    mutationFn: () =>
      transition(course.id, next.action, {
        pickup_code:   next.needsCode === 'pickup'   ? code : undefined,
        delivery_code: next.needsCode === 'delivery' ? code : undefined,
      }),
    onSuccess: () => {
      setCode('')
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['driver-history'] })
      queryClient.invalidateQueries({ queryKey: ['driver-stats'] })
    },
  })

  function callPhone(phone?: string) {
    if (phone) Linking.openURL(`tel:${phone}`)
  }

  return (
    <View className="bg-white rounded-2xl p-4">
      <Text className="text-xs text-gray-500 font-mono">{course.reference}</Text>
      <Text className="text-xs text-airmess-red font-semibold uppercase mt-1">
        Course en cours · {course.status}
      </Text>

      {/* Boutons navigation externe */}
      <View className="flex-row gap-2 mt-3">
        <Pressable
          onPress={() => openGoogleMaps(targetLat, targetLng, targetLabel)}
          className="flex-1 bg-airmess-dark rounded-lg py-3 items-center"
        >
          <Text className="text-white font-semibold text-sm">🗺️ Google Maps</Text>
        </Pressable>
        <Pressable
          onPress={() => openWaze(targetLat, targetLng)}
          className="flex-1 bg-blue-600 rounded-lg py-3 items-center"
        >
          <Text className="text-white font-semibold text-sm">🚗 Waze</Text>
        </Pressable>
      </View>

      {/* Petit indicateur de cible */}
      <Text className="text-xs text-center text-gray-500 mt-2">
        Navigation vers : <Text className="font-semibold text-airmess-dark">{targetLabel}</Text>
      </Text>


      {/* Origine */}
      <View className="mt-3 p-3 bg-gray-50 rounded-lg">
        <Text className="text-xs uppercase text-gray-500">Origine</Text>
        <Text className="font-semibold text-airmess-dark mt-1">{course.origin_name}</Text>
        <Text className="text-sm text-gray-600">{course.origin_quartier}</Text>
        {course.origin_phone && (
          <Pressable onPress={() => callPhone(course.origin_phone)} className="mt-2">
            <Text className="text-xs text-airmess-dark underline">📞 Appeler le marchand</Text>
          </Pressable>
        )}
      </View>

      {/* Destination */}
      <View className="mt-3 p-3 bg-gray-50 rounded-lg">
        <Text className="text-xs uppercase text-gray-500">Destination</Text>
        <Text className="font-semibold text-airmess-dark mt-1">{course.destination_name}</Text>
        <Text className="text-sm text-gray-600">
          {course.destination_quartier}, {course.destination_city}
        </Text>
        {course.destination_phone && (
          <Pressable onPress={() => callPhone(course.destination_phone)} className="mt-2">
            <Text className="text-xs text-airmess-dark underline">📞 Appeler le destinataire</Text>
          </Pressable>
        )}
      </View>

      {/* Encaissement */}
      {course.has_collection && (
        <View className="mt-3 p-3 bg-airmess-yellow/30 rounded-lg">
          <Text className="text-xs uppercase text-gray-700 font-semibold">À encaisser</Text>
          <Text className="text-2xl font-bold text-airmess-dark mt-1">
            {course.collection_amount?.toLocaleString('fr-FR')} FCFA
          </Text>
          <Text className="text-xs text-gray-600">via {course.collection_method}</Text>
        </View>
      )}

      {/* Code de validation */}
      {next?.needsCode && (
        <View className="mt-3">
          <Text className="text-xs font-medium text-gray-700 mb-1">
            {next.needsCode === 'pickup' ? 'Code marchand (4 chiffres)' : 'Code livraison (4 chiffres)'}
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            className="border border-gray-300 rounded-lg px-3 py-3 text-lg text-center font-mono"
            placeholder="••••"
          />
        </View>
      )}

      {/* Bouton d'action */}
      {next ? (
        <Pressable
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending || (next.needsCode && code.length < 4)}
          className="bg-airmess-yellow rounded-xl py-4 mt-4 items-center"
          style={{ opacity: mutation.isPending || (next.needsCode && code.length < 4) ? 0.5 : 1 }}
        >
          <Text className="text-airmess-dark font-bold text-base">
            {mutation.isPending ? 'En cours...' : next.label}
          </Text>
        </Pressable>
      ) : (
        <Text className="text-center text-gray-500 mt-4">Statut terminal — rien à faire.</Text>
      )}
      {/* Signalement d'incident */}
      <Pressable
        onPress={() => setIncidentOpen(true)}
        className="mt-3 border border-airmess-red/40 rounded-xl py-3 items-center"
      >
        <Text className="text-airmess-red font-semibold text-sm">⚠️ Signaler un incident</Text>
      </Pressable>

      <Pressable
        onPress={() => setFailOpen(true)}
        className="mt-2 py-2 items-center"
      >
        <Text className="text-gray-500 text-xs underline">❌ Abandonner cette course</Text>
      </Pressable>

      <IncidentModal
        courseId={course.id}
        visible={incidentOpen}
        onClose={() => setIncidentOpen(false)}
      />

      <FailCourseModal
        courseId={course.id}
        visible={failOpen}
        onClose={() => setFailOpen(false)}
      />
    </View>
  )
}
