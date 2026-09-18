import { useState } from 'react'
import { View, Text, Pressable, TextInput, Linking, Modal, Alert } from 'react-native'
import { KeyboardAvoidingView, KeyboardAwareScrollView, KeyboardProvider } from 'react-native-keyboard-controller'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import {
  transition,
  registerCallAttempt,
  patchContactAttempts,
  triggerSos,
  type DriverCourseSummary,
  type TransitionAction,
} from '../api/driver'
import { openGoogleMaps } from '../utils/navigation'
import CourseMap from './CourseMap'
import IncidentModal from './IncidentModal'
import FailCourseModal from './FailCourseModal'
import Button from './ui/Button'
import Card from './ui/Card'

interface Props {
  course: DriverCourseSummary & { destination_phone?: string; origin_phone?: string }
  /** True pendant un toucher sur la carte — pour désactiver le scroll parent. */
  onMapInteractionChange?: (active: boolean) => void
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
  { action: TransitionAction; label: string; needsCode?: 'pickup' | 'delivery' | 'return' }
> = {
  assigned:            { action: 'start_to_pickup',   label: 'Je pars chercher le colis' },
  driver_to_pickup:    { action: 'arrived_pickup',    label: 'Je suis sur place' },
  at_pickup:           { action: 'pickup_confirmed',  label: 'Colis récupéré', needsCode: 'pickup' },
  picked_up:           { action: 'arrived_dropoff',   label: "J'arrive chez le client" },
  at_dropoff:          { action: 'delivered',         label: 'Livraison confirmée', needsCode: 'delivery' },
  // Cas 4 — le client a refusé, le driver ramène le colis. Le marchand a reçu
  // un return_code (push + SMS) qu'il doit dicter au driver à la remise.
  returning_to_sender: { action: 'return_confirmed',  label: 'Colis rendu au marchand', needsCode: 'return' },
}

export default function ActiveCourseCard({ course, onMapInteractionChange }: Props) {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const [correctOpen, setCorrectOpen] = useState(false)
  const [correctValue, setCorrectValue] = useState('')
  const [correctNote, setCorrectNote] = useState('')
  const waitingForOps = !!course.holding_for_transfer || (!!course.abandonment_pending && course.status !== 'returning_to_sender' && !course.pickup_from_previous_driver)
  const next: (typeof NEXT_ACTION)[string] | undefined = waitingForOps ? undefined : course.pickup_from_previous_driver
    ? { action: 'transfer_confirmed', label: 'Colis reçu du précédent livreur' }
    : NEXT_ACTION[course.status]

  // Phase = quelle destination on vise en ce moment.
  //   `pickup`   : je vais au marchand chercher le colis
  //   `transfer` : Cas 5 — je vais chercher le colis auprès du driver précédent
  //                (panne/accident du driver initial)
  //   `dropoff`  : je vais chez le client livrer
  //   `return`   : Cas 4 — client a refusé, je ramène au marchand
  const phase: 'pickup' | 'transfer' | 'dropoff' | 'return' =
    course.status === 'returning_to_sender'
      ? 'return'
      : course.pickup_from_previous_driver
        ? 'transfer'
        : ['assigned', 'driver_to_pickup', 'at_pickup'].includes(course.status)
          ? 'pickup'
          : 'dropoff'

  const targetLat =
    phase === 'transfer'
      ? (course.transfer_lat ?? course.origin_lat)
      : phase === 'dropoff'
        ? course.destination_lat
        : course.origin_lat
  const targetLng =
    phase === 'transfer'
      ? (course.transfer_lng ?? course.origin_lng)
      : phase === 'dropoff'
        ? course.destination_lng
        : course.origin_lng
  const targetLabel =
    phase === 'transfer'
      ? 'Livreur précédent'
      : phase === 'dropoff'
        ? course.destination_name
        : course.origin_name
  const targetPhone = phase === 'transfer' ? undefined : phase === 'dropoff' ? course.destination_phone : course.origin_phone
  const targetPhoneRole = phase === 'dropoff' ? 'le client' : 'le marchand'

  const mutation = useMutation({
    mutationFn: () => {
      if (!next) throw new Error('La livraison est suspendue en attente des opérations.')
      return transition(course.id, next.action, {
        pickup_code:   next.needsCode === 'pickup'   ? code.trim() : undefined,
        delivery_code: next.needsCode === 'delivery' ? code.trim() : undefined,
        return_code:   next.needsCode === 'return'   ? code.trim() : undefined,
      })
    },
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData<DriverCourseSummary[]>(['my-active'], (courses) =>
        courses?.flatMap((item) => item.id !== course.id ? [item] : ['delivered', 'failed', 'cancelled'].includes(updatedCourse.status) ? [] : [updatedCourse]),
      )
      setCode('')
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['driver-history'] })
      queryClient.invalidateQueries({ queryKey: ['driver-stats'] })
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors
      const details = errors ? Object.values(errors).flat().join('\n') : undefined
      const message = details || error?.response?.data?.message || (error?.response ? `Erreur serveur (${error.response.status}).` : 'Serveur injoignable. Vérifie ta connexion et réessaie.')
      Alert.alert('Action non confirmée', message)
    },
  })

  // Cas 3 — comptage silencieux des tentatives d'appel du client.
  // On n'incrémente que pour la phase dropoff (l'appel du marchand ne compte pas).
  // Le back rate-limite à 1/30s, donc un tap rapide × 3 = 1 seul incrément.
  const callAttemptMutation = useMutation({
    mutationFn: () => registerCallAttempt(course.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-active'] }),
  })

  // Cas 5 — SOS accident/danger.
  // Fire-and-forget côté ops (push prioritaire + trace incident), pendant
  // qu'on compose immédiatement le numéro d'urgence renvoyé par le back.
  const sosMutation = useMutation({
    mutationFn: () =>
      triggerSos({
        course_id: course.id,
        description: 'SOS déclenché depuis l\'écran de course active',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
      if (data.hotline) {
        Linking.openURL(`tel:${data.hotline}`)
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'SOS non transmis. Composez directement le 118.'
      Alert.alert('Erreur SOS', msg)
    },
  })

  function confirmSos() {
    Alert.alert(
      'Déclencher le SOS ?',
      'L\'ops sera notifiée immédiatement et le numéro d\'urgence sera composé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: () => sosMutation.mutate(),
        },
      ],
    )
  }

  const patchAttemptsMutation = useMutation({
    mutationFn: () => patchContactAttempts(course.id, parseInt(correctValue, 10) || 0, correctNote || undefined),
    onSuccess: () => {
      setCorrectOpen(false)
      setCorrectValue('')
      setCorrectNote('')
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Correction impossible.'
      Alert.alert('Erreur', msg)
    },
  })

  function callPhone(phone?: string) {
    if (!phone) return
    if (phase === 'dropoff') {
      // Fire-and-forget — pas besoin d'attendre le compteur pour ouvrir le composeur
      callAttemptMutation.mutate()
    }
    Linking.openURL(`tel:${phone}`)
  }

  // En phase retour, la timeline aller est intégralement franchie (le driver
  // avait bien atteint le client). On force donc l'index au-delà du dernier.
  const currentStepIndex = phase === 'return'
    ? TIMELINE_STEPS.length
    : TIMELINE_STEPS.findIndex((s) => s.key === course.status)

  return (
    <View>
      {waitingForOps && <View className="bg-warning-bg rounded-2xl p-4 mb-3">
        <Text className="text-ink font-extrabold text-lg">{course.holding_for_transfer ? 'Transfert organisé — remise en attente' : 'Abandon signalé — en attente des opérations'}</Text>
        <Text className="text-warm-600 mt-2">{course.holding_for_transfer ? 'Conserve le colis et attends le nouveau livreur sur place. Il confirmera sa réception ; tu seras alors libéré.' : 'Conserve le colis. Les opérations doivent organiser un retour ou un transfert. Tu restes occupé tant que le colis ne leur est pas remis.'}</Text>
      </View>}
      {/* ============ HEADER PHASE ============ */}
      {!waitingForOps && <Card variant="dark" padding="md" className="rounded-b-none">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-warm-400 text-[10px] font-mono">{course.reference}</Text>
          <View
            className={[
              'px-2 py-0.5 rounded-md flex-row items-center',
              phase === 'return' || phase === 'transfer' ? 'bg-airmess-red/25' : 'bg-white/10',
            ].join(' ')}
          >
            {phase === 'return' && (
              <Ionicons name="return-up-back" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
            )}
            {phase === 'transfer' && (
              <Ionicons name="swap-horizontal" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
            )}
            <Text
              className={[
                'text-[10px] font-extrabold uppercase tracking-widest',
                phase === 'return' || phase === 'transfer' ? 'text-white' : 'text-airmess-yellow',
              ].join(' ')}
            >
              {phase === 'pickup'
                ? 'Phase 1 · Pickup'
                : phase === 'dropoff'
                  ? 'Phase 2 · Livraison'
                  : phase === 'transfer'
                    ? 'Transfert colis'
                    : 'Retour marchand'}
            </Text>
          </View>
        </View>

        <Text className="text-warm-400 text-xs uppercase tracking-widest font-semibold">
          {phase === 'pickup'
            ? 'Direction'
            : phase === 'dropoff'
              ? 'Destination client'
              : phase === 'transfer'
                ? 'Récupérer le colis'
                : 'Retour vers marchand'}
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
      </Card>}

      {/* ============ ACTIONS CONTEXTUELLES ============ */}
      <Card variant="default" padding="md" className="rounded-t-none border-t-0">
        {!waitingForOps && <>
        {/* Carte du trajet — A retrait, B livraison, ma position live.
            La navigation routière reste déléguée au bouton "Naviguer" (Google Maps). */}
        {typeof course.origin_lat === 'number' && typeof course.destination_lat === 'number' && (
          <View className="mb-3">
            <CourseMap
              originLat={course.origin_lat}
              originLng={course.origin_lng}
              destLat={course.destination_lat}
              destLng={course.destination_lng}
              activeTarget={phase === 'dropoff' ? 'destination' : 'origin'}
              height={380}
              onInteractionChange={onMapInteractionChange}
            />
          </View>
        )}

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
          <Text className="text-[10px] text-warm-500 text-center mb-1">
            Appeler {targetPhoneRole}
          </Text>
        )}

        {/* Cas 3 — Compteur de tentatives d'appel du client (phase dropoff uniquement).
            Le compteur sert de garde-fou anti-fraude : le driver doit avoir tenté au moins
            2 fois avant de pouvoir signaler "client injoignable". */}
        {phase === 'dropoff' && targetPhone && (
          <View className="flex-row items-center justify-center gap-2 mb-3">
            <Text className="text-[10px] text-warm-500">
              Tentatives d'appel : <Text className="font-bold text-ink">{course.contact_attempts ?? 0}</Text>
            </Text>
            <Pressable
              onPress={() => {
                setCorrectValue(String(course.contact_attempts ?? 0))
                setCorrectNote('')
                setCorrectOpen(true)
              }}
              hitSlop={8}
            >
              <Text className="text-[10px] text-info underline">Corriger</Text>
            </Pressable>
          </View>
        )}

        {/* Encaissement — 2 modes possibles :
              - Course sender-paid : on affiche uniquement le collection_amount si has_collection.
              - Course recipient-paid : le livreur doit AUSSI collecter les frais de livraison
                (delivery_fee) chez le destinataire. On affiche le total et le breakdown pour
                qu'il annonce le bon montant sans se planter. */}
        {(() => {
          const isRecipientPaid = course.delivery_fee_paid_by === 'recipient'
          const collectionValue = course.collection_amount ?? 0
          const feeValue = isRecipientPaid ? course.delivery_fee : 0
          const totalToCollect = collectionValue + feeValue
          if (totalToCollect <= 0) return null

          return (
            <View className="bg-airmess-yellow rounded-2xl p-4 mb-3 flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-ink items-center justify-center mr-3">
                <Ionicons name="cash" size={20} color="#FFCC00" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] uppercase tracking-widest font-extrabold text-ink/70">
                  {isRecipientPaid ? 'Total à collecter' : 'À encaisser'}
                </Text>
                <Text className="text-ink text-2xl font-extrabold" numberOfLines={1}>
                  {totalToCollect.toLocaleString('fr-FR')}{' '}
                  <Text className="text-base font-bold">FCFA</Text>
                </Text>
                {isRecipientPaid && collectionValue > 0 && (
                  <Text className="text-xs text-ink/70 mt-0.5">
                    Produit {collectionValue.toLocaleString('fr-FR')} + Livraison {feeValue.toLocaleString('fr-FR')}
                  </Text>
                )}
                {isRecipientPaid && collectionValue === 0 && (
                  <Text className="text-xs text-ink/70 mt-0.5">
                    Frais de livraison — payés par le client
                  </Text>
                )}
                {!isRecipientPaid && (
                  <Text className="text-xs text-ink/70 mt-0.5">via {course.collection_method}</Text>
                )}
              </View>
            </View>
          )
        })()}

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

        </>}
        {/* Code de validation */}
        {next?.needsCode && (
          <View className="mb-4">
            <Text className="text-xs font-bold text-warm-600 uppercase tracking-widest mb-2">
              {next.needsCode === 'pickup'
                ? 'Code marchand'
                : next.needsCode === 'delivery'
                  ? 'Code livraison'
                  : 'Code de retour marchand'}
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
          <Text className="text-center text-warm-500 py-4">{waitingForOps ? 'Livraison suspendue — instructions actualisées automatiquement.' : 'Statut terminal — rien à faire.'}</Text>
        )}

        {/* Actions secondaires — subtiles, groupées en bas */}
        <View className="flex-row gap-2 mt-4">
          <Pressable
            onPress={confirmSos}
            disabled={sosMutation.isPending}
            className="flex-1 h-11 rounded-xl border-2 border-airmess-red bg-airmess-red/10 items-center justify-center flex-row"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            accessibilityRole="button"
            accessibilityLabel="Bouton SOS urgence"
          >
            <Ionicons name="alert-circle" size={16} color="#D40511" />
            <Text className="text-airmess-red text-xs font-extrabold ml-1.5 tracking-widest uppercase">
              {sosMutation.isPending ? '…' : 'SOS'}
            </Text>
          </Pressable>
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
            disabled={waitingForOps || !!course.abandonment_pending}
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
        postPickup={['picked_up', 'at_dropoff', 'returning_to_sender'].includes(course.status) || !!course.pickup_from_previous_driver}
        visible={failOpen}
        onClose={() => setFailOpen(false)}
      />

      {/* Cas 3 — Modal de correction du compteur (appels depuis tel perso) */}
      <Modal
        visible={correctOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCorrectOpen(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <KeyboardProvider navigationBarTranslucent statusBarTranslucent>
        <KeyboardAvoidingView
          className="flex-1"
          behavior="padding"
        >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <KeyboardAwareScrollView mode="layout" style={{ width: '100%', flex: 1 }} bottomOffset={24} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 20 }}>
          <View className="w-full bg-off-white rounded-2xl p-5">
            <Text className="text-lg font-extrabold text-ink mb-1">
              Corriger le compteur d'appels
            </Text>
            <Text className="text-xs text-warm-500 mb-4">
              Si tu as appelé le client depuis ton téléphone perso, mets le vrai nombre.
              Une note est requise si tu augmentes le compteur.
            </Text>

            <Text className="text-[10px] uppercase font-bold tracking-widest text-warm-500 mb-1">
              Tentatives réelles
            </Text>
            <TextInput
              value={correctValue}
              onChangeText={setCorrectValue}
              keyboardType="number-pad"
              placeholder="0"
              className="border-2 border-warm-200 rounded-xl px-3 py-2 mb-3 bg-white text-ink"
            />

            <Text className="text-[10px] uppercase font-bold tracking-widest text-warm-500 mb-1">
              Note (ex : "appels depuis mon tel perso")
            </Text>
            <TextInput
              value={correctNote}
              onChangeText={setCorrectNote}
              placeholder="Justification"
              multiline
              className="border-2 border-warm-200 rounded-xl px-3 py-2 mb-4 bg-white text-ink min-h-[60px]"
            />

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setCorrectOpen(false)}
                className="flex-1 h-11 rounded-xl border-2 border-warm-300 items-center justify-center"
              >
                <Text className="text-warm-600 font-bold">Annuler</Text>
              </Pressable>
              <Pressable
                onPress={() => patchAttemptsMutation.mutate()}
                disabled={patchAttemptsMutation.isPending || !correctValue}
                className="flex-1 h-11 rounded-xl bg-airmess-yellow items-center justify-center"
                style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
              >
                <Text className="text-ink font-extrabold">
                  {patchAttemptsMutation.isPending ? '…' : 'Enregistrer'}
                </Text>
              </Pressable>
            </View>
          </View>
          </KeyboardAwareScrollView>
        </View>
        </KeyboardAvoidingView>
        </KeyboardProvider>
      </Modal>
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
