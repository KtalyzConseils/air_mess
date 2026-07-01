import { useState } from 'react'
import { View, Text, Pressable, TextInput } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { transition } from '../api/driver'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'

interface FailReason {
  value: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
}

const FAIL_REASONS: FailReason[] = [
  { value: 'address_not_found',     label: 'Adresse introuvable',   icon: 'location-outline' },
  { value: 'recipient_unreachable', label: 'Destinataire injoignable', icon: 'call-outline' },
  { value: 'recipient_refused',     label: 'Refus du destinataire', icon: 'ban-outline' },
  { value: 'package_damaged',       label: 'Colis endommagé',       icon: 'cube-outline' },
  { value: 'personal_issue',        label: 'Problème personnel',    icon: 'medkit-outline' },
  { value: 'other',                 label: 'Autre',                 icon: 'help-circle-outline' },
]

interface Props {
  courseId: number
  visible: boolean
  onClose: () => void
}

/**
 * Abandonner une course — action DÉFINITIVE (2 étapes de confirmation).
 *
 * Flow :
 *   étape 1 : choisir raison + détails
 *   étape 2 : bandeau danger avec les conséquences + récap + confirmation
 */
export default function FailCourseModal({ courseId, visible, onClose }: Props) {
  const queryClient = useQueryClient()
  const [reasonCode, setReasonCode] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [confirmStep, setConfirmStep] = useState(false)

  const mutation = useMutation({
    mutationFn: () => {
      const reasonLabel = FAIL_REASONS.find((r) => r.value === reasonCode)?.label ?? reasonCode
      const fullReason = details.trim()
        ? `${reasonLabel} — ${details.trim()}`
        : (reasonLabel as string)
      return transition(courseId, 'failed', { reason: fullReason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['driver-history'] })
      queryClient.invalidateQueries({ queryKey: ['driver-stats'] })
      handleClose()
    },
  })

  function handleClose() {
    setReasonCode(null)
    setDetails('')
    setConfirmStep(false)
    onClose()
  }

  const detailsRequired = reasonCode === 'other'
  const canProceed = !!reasonCode && (!detailsRequired || details.trim().length >= 3)
  const selectedReason = FAIL_REASONS.find((r) => r.value === reasonCode)

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={confirmStep ? "Confirmer l'abandon" : 'Abandonner la course'}
      subtitle={
        confirmStep
          ? 'Action définitive — lis les conséquences.'
          : 'Pourquoi tu ne peux pas livrer ?'
      }
      footer={
        confirmStep ? (
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                variant="outline"
                size="md"
                onPress={() => setConfirmStep(false)}
                disabled={mutation.isPending}
              >
                Retour
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="danger"
                size="md"
                onPress={() => mutation.mutate()}
                loading={mutation.isPending}
              >
                Confirmer
              </Button>
            </View>
          </View>
        ) : (
          <Button
            variant="danger"
            size="md"
            onPress={() => setConfirmStep(true)}
            disabled={!canProceed}
          >
            Continuer
          </Button>
        )
      }
    >
      {!confirmStep ? (
        <>
          {/* Liste des raisons */}
          <View className="gap-2 mb-4">
            {FAIL_REASONS.map((r) => {
              const active = reasonCode === r.value
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setReasonCode(r.value)}
                  className={[
                    'flex-row items-center px-4 py-3 rounded-2xl border-2',
                    active
                      ? 'bg-airmess-yellow/15 border-airmess-yellow'
                      : 'bg-off-white border-warm-200',
                  ].join(' ')}
                  style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                >
                  <View
                    className={[
                      'w-9 h-9 rounded-xl items-center justify-center mr-3',
                      active ? 'bg-airmess-yellow' : 'bg-warm-100',
                    ].join(' ')}
                  >
                    <Ionicons name={r.icon} size={18} color="#1A1614" />
                  </View>
                  <Text
                    className={[
                      'flex-1 text-base',
                      active ? 'font-extrabold text-ink' : 'font-semibold text-ink',
                    ].join(' ')}
                  >
                    {r.label}
                  </Text>
                  {active && (
                    <View className="w-6 h-6 rounded-full bg-ink items-center justify-center">
                      <Ionicons name="checkmark" size={14} color="#FFCC00" />
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>

          {/* Détails */}
          <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-2">
            Détails {detailsRequired ? '(obligatoire)' : '(facultatif)'}
          </Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            multiline
            placeholder="Précise ce qui s'est passé…"
            placeholderTextColor="#B8AF9F"
            className="border-2 border-warm-300 rounded-2xl px-4 py-3 text-base text-ink bg-off-white"
            style={{ textAlignVertical: 'top', minHeight: 80 }}
          />
        </>
      ) : (
        <>
          {/* Bandeau danger avec conséquences */}
          <View className="bg-danger-bg border-2 border-airmess-red/30 rounded-2xl p-4 mb-3">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 rounded-full bg-airmess-red items-center justify-center mr-2">
                <Ionicons name="alert" size={16} color="#ffffff" />
              </View>
              <Text className="text-airmess-red font-extrabold text-base flex-1">
                Ce que ça implique
              </Text>
            </View>
            <Consequence>Le marchand sera notifié</Consequence>
            <Consequence>
              Tu ne toucheras <Text className="font-extrabold">aucun gain</Text> pour cette
              course
            </Consequence>
            <Consequence>Tu redeviendras disponible pour d'autres propositions</Consequence>
            <Text className="text-xs text-airmess-red mt-2 italic">
              Cette action est définitive.
            </Text>
          </View>

          {/* Récap */}
          <View className="bg-off-white border border-warm-200 rounded-2xl p-4">
            <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-2">
              Motif
            </Text>
            {selectedReason && (
              <View className="flex-row items-center mb-1">
                <Ionicons name={selectedReason.icon} size={16} color="#1A1614" />
                <Text className="text-base font-bold text-ink ml-2">
                  {selectedReason.label}
                </Text>
              </View>
            )}
            {details.trim() && (
              <Text className="text-sm text-warm-600 mt-1">{details.trim()}</Text>
            )}
          </View>
        </>
      )}
    </BottomSheet>
  )
}

function Consequence({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row mb-1.5">
      <Text className="text-airmess-red mr-2">•</Text>
      <Text className="text-airmess-red flex-1 text-sm leading-5">{children}</Text>
    </View>
  )
}
