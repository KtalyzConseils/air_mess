import { useState } from 'react'
import { View, Text, Pressable, TextInput, Linking } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { transition, type DriverCourseSummary, type TransitionAction } from '../api/driver'
import { openGoogleMaps } from '../utils/navigation'
import IncidentModal from './IncidentModal'
import FailCourseModal from './FailCourseModal'
import Button from './ui/Button'
import Card from './ui/Card'

interface Props {
  course: DriverCourseSummary & { destination_phone?: string; origin_phone?: string }
}

/* ============================================================
   State machine visible pour le driver
   ------------------------------------------------------------
   La progress bar utilise les statuts serveur pour marquer l'étape
   courante. Chaque statut mappe vers l'action suivante (label + code éventuel).
   ============================================================ */

const TIMELINE_STEPS: { key: string; short: string }[] = [
  { key: 'assigned',         short: 'Acceptée' },
  { key: 'driver_to_pickup', short: 'En route' },
  { key: 'at_pickup',        short: 'Sur place' },
  { key: 'picked_up',        short: 'Colis pris' },
  { key: 'at_dropoff',       short: 'Client' },
]

const NEXT_ACTION: Record<
  string,
  { action: TransitionAction; label: string; needsCode?: 'pickup' | 'delivery' }
> = {
  assigned:         { action: 'start_to_pickup',   label: 'Je pars chercher le colis' },
  driver_to_pickup: { action: 'arrived_pickup',    label: 'Je suis sur place' },
  at_pickup:        { action: 'pickup_confirmed',  label: 'Colis récupéré', needsCode: 'pickup' },
  picked_up:        { action: 'arrived_dropoff',   label: "J'arrive chez le client" },
  at_dropoff:       { action: 'delivered',         label: 'Livraison confirmée', needsCode: 'delivery' },
}

export default function ActiveCourseCard({ course }: Props) {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const next = NEXT_ACTION[course.status]

  // Phase = quelle destination on vise en ce moment
  const phase: 'pickup' | 'dropoff' =
    ['assigned', 'driver_to_pickup', 'at_pickup'].includes(course.status) ? 'pickup' : 'dropoff'

  const targetLat = phase === 'pickup' ? course.origin_lat : course.destination_lat
  const targetLng = phase === 'pickup' ? course.origin_lng : course.destination_lng
  const targetLabel = phase === 'pickup' ? course.origin_name : course.destination_name
  const targetPhone = phase === 'pickup' ? course.origin_phone : course.destination_phone
  const targetPhoneRole = phase === 'pickup' ? 'le marchand' : 'le client'

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

  const currentStepIndex = TIMELINE_STEPS.findIndex((s) => s.key === course.status)

  return (
    <View>
      {/* ============ HEADER PHASE ============ */}
      <Card variant="dark" padding="md" className="rounded-b-none">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-warm-400 text-[10px] font-mono">{course.reference}</Text>
          <View className="bg-white/10 px-2 py-0.5 rounded-md">
            <Text className="text-airmess-yellow text-[10px] font-extrabold uppercase tracking-widest">
              {phase === 'pickup' ? 'Phase 1 · Pickup' : 'Phase 2 · Livraison'}
            </Text>
          </View>
        </View>

        <Text className="text-warm-400 text-xs uppercase tracking-widest font-semibold">
          {phase === 'pickup' ? 'Direction' : 'Destination client'}
        </Text>
        <Text className="text-white text-2xl font-extrabold mt-1" numberOfLines={2}>
          {targetLabel}
        </Text>

        {/* Timeline dots */}
        <View className="flex-row items-center mt-4">
          {TIMELINE_STEPS.map((step, i) => {
            const isActive = i === currentStepIndex
            const isDone = i < currentStepIndex
            return (
              <View key={step.key} className="flex-1 flex-row items-center">
                <View
                  className={[
                    'w-2.5 h-2.5 rounded-full',
                    isActive ? 'bg-airmess-yellow' : isDone ? 'bg-success' : 'bg-white/15',
                  ].join(' ')}
                />
                {i < TIMELINE_STEPS.length - 1 && (
                  <View className={['flex-1 h-0.5', isDone ? 'bg-success' : 'bg-white/10'].join(' ')} />
                )}
              </View>
            )
          })}
        </View>
        <View className="flex-row mt-1.5">
          {TIMELINE_STEPS.map((step, i) => (
            <Text
              key={step.key}
              className={[
                'flex-1 text-[9px]',
                i === currentStepIndex
                  ? 'text-airmess-yellow font-extrabold'
                  : i < currentStepIndex
                    ? 'text-success/80'
                    : 'text-warm-400',
              ].join(' ')}
              numberOfLines={1}
            >
              {step.short}
            </Text>
          ))}
        </View>
      </Card>

      {/* ============ ACTIONS CONTEXTUELLES ============ */}
      <Card variant="default" padding="md" className="rounded-t-none border-t-0">
        {/* Nav + call */}
        <View className="flex-row gap-2 mb-3">
          <Pressable
            onPress={() => openGoogleMaps(targetLat, targetLng, targetLabel)}
            className="flex-1 h-14 bg-airmess-dark rounded-2xl items-center justify-center flex-row"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <Ionicons name="navigate" size={18} color="#FFCC00" />
            <Text className="text-white font-bold ml-2">Naviguer</Text>
          </Pressable>
          <Pressable
            onPress={() => callPhone(targetPhone)}
            disabled={!targetPhone}
            className={[
              'w-14 h-14 rounded-2xl items-center justify-center border-2',
              targetPhone ? 'border-airmess-dark bg-off-white' : 'border-warm-200 bg-warm-100 opacity-50',
            ].join(' ')}
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <Ionicons name="call" size={22} color="#1A1614" />
          </Pressable>
        </View>
        {targetPhone && (
          <Text className="text-[10px] text-warm-500 text-center mb-3">
            Appeler {targetPhoneRole}
          </Text>
        )}

        {/* Encaissement */}
        {course.has_collection && (
          <View className="bg-airmess-yellow rounded-2xl p-4 mb-3 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-ink items-center justify-center mr-3">
              <Ionicons name="cash" size={20} color="#FFCC00" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-widest font-extrabold text-ink/70">
                À encaisser
              </Text>
              <Text className="text-ink text-2xl font-extrabold" numberOfLines={1}>
                {course.collection_amount?.toLocaleString('fr-FR')}{' '}
                <Text className="text-base font-bold">FCFA</Text>
              </Text>
              <Text className="text-xs text-ink/70 mt-0.5">via {course.collection_method}</Text>
            </View>
          </View>
        )}

        {/* Autre extrémité : rappel des deux points */}
        <View className="flex-row items-stretch mb-4">
          <RoutePoint label="Pickup" name={course.origin_name} sub={course.origin_quartier} active={phase === 'pickup'} />
          <View className="w-6 items-center justify-center">
            <View className="w-full h-0.5 bg-warm-300" />
          </View>
          <RoutePoint
            label="Client"
            name={course.destination_name}
            sub={`${course.destination_quartier}, ${course.destination_city}`}
            active={phase === 'dropoff'}
          />
        </View>

        {/* Code de validation */}
        {next?.needsCode && (
          <View className="mb-4">
            <Text className="text-xs font-bold text-warm-600 uppercase tracking-widest mb-2">
              {next.needsCode === 'pickup' ? 'Code marchand' : 'Code livraison'}
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              className="border-2 border-warm-300 rounded-2xl px-4 py-4 text-2xl text-center font-mono text-ink bg-off-white tracking-widest"
              placeholder="••••"
              placeholderTextColor="#B8AF9F"
            />
          </View>
        )}

        {/* ACTION PRINCIPALE — bouton XL */}
        {next ? (
          <Button
            variant="primary"
            size="xl"
            loading={mutation.isPending}
            disabled={next.needsCode ? code.length < 4 : false}
            onPress={() => mutation.mutate()}
            rightIcon={<Ionicons name="arrow-forward" size={20} color="#1A1614" />}
          >
            {next.label}
          </Button>
        ) : (
          <Text className="text-center text-warm-500 py-4">Statut terminal — rien à faire.</Text>
        )}

        {/* Actions secondaires — subtiles, groupées en bas */}
        <View className="flex-row gap-2 mt-4">
          <Pressable
            onPress={() => setIncidentOpen(true)}
            className="flex-1 h-11 rounded-xl border-2 border-warning/40 bg-warning-bg/50 items-center justify-center flex-row"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <Ionicons name="warning" size={14} color="#F59E0B" />
            <Text className="text-warning text-xs font-bold ml-1.5">Incident</Text>
          </Pressable>
          <Pressable
            onPress={() => setFailOpen(true)}
            className="flex-1 h-11 rounded-xl border-2 border-airmess-red/30 bg-danger-bg/40 items-center justify-center flex-row"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <Ionicons name="close-circle" size={14} color="#D40511" />
            <Text className="text-airmess-red text-xs font-bold ml-1.5">Abandonner</Text>
          </Pressable>
        </View>
      </Card>

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

/* ============================================================
   Sous-composant : petit point origine/destination
   ============================================================ */
function RoutePoint({
  label,
  name,
  sub,
  active,
}: {
  label: string
  name: string
  sub: string
  active: boolean
}) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center mb-1">
        <View
          className={['w-2 h-2 rounded-full mr-1.5', active ? 'bg-airmess-yellow' : 'bg-warm-300'].join(' ')}
        />
        <Text
          className={[
            'text-[10px] uppercase font-extrabold tracking-widest',
            active ? 'text-ink' : 'text-warm-500',
          ].join(' ')}
        >
          {label}
        </Text>
      </View>
      <Text className={['text-sm font-bold', active ? 'text-ink' : 'text-warm-500'].join(' ')} numberOfLines={1}>
        {name}
      </Text>
      <Text className="text-[10px] text-warm-500 mt-0.5" numberOfLines={1}>
        {sub}
      </Text>
    </View>
  )
}
