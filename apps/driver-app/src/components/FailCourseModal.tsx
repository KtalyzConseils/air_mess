import { useState } from 'react'
import { View, Text, Pressable, TextInput, Modal, ScrollView } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transition } from '../api/driver'

const FAIL_REASONS = [
  { value: 'address_not_found',    label: '📍 Adresse introuvable' },
  { value: 'recipient_unreachable', label: '📞 Destinataire injoignable' },
  { value: 'recipient_refused',    label: '🚫 Refus du destinataire' },
  { value: 'package_damaged',      label: '📦 Colis endommagé' },
  { value: 'personal_issue',       label: '🤕 Problème personnel' },
  { value: 'other',                label: '❓ Autre' },
]

interface Props {
  courseId: number
  visible: boolean
  onClose: () => void
}

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

  // "Autre" exige des détails ; autres raisons → détails optionnels
  const detailsRequired = reasonCode === 'other'
  const canProceed = !!reasonCode && (!detailsRequired || details.trim().length >= 3)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-5 max-h-[90%]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-airmess-dark">
              {confirmStep ? '⚠️ Confirmer l\'abandon' : 'Abandonner la course'}
            </Text>
            <Pressable onPress={handleClose}>
              <Text className="text-gray-400 text-base">Annuler</Text>
            </Pressable>
          </View>

          {!confirmStep ? (
            <>
              <Text className="text-sm text-gray-600 mb-3">
                Pourquoi tu ne peux pas livrer ?
              </Text>

              <ScrollView className="max-h-72 mb-3">
                <View className="gap-2">
                  {FAIL_REASONS.map((r) => {
                    const active = reasonCode === r.value
                    return (
                      <Pressable
                        key={r.value}
                        onPress={() => setReasonCode(r.value)}
                        className={`px-4 py-3 rounded-xl border ${
                          active ? 'bg-airmess-dark border-airmess-dark' : 'bg-white border-gray-200'
                        }`}
                      >
                        <Text className={`text-sm ${active ? 'text-white font-semibold' : 'text-airmess-dark'}`}>
                          {r.label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </ScrollView>

              <Text className="text-xs uppercase text-gray-500 font-semibold mb-1">
                Détails {detailsRequired ? '(obligatoire)' : '(optionnel)'}
              </Text>
              <TextInput
                value={details}
                onChangeText={setDetails}
                multiline
                placeholder="Précise ce qui s'est passé…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
                style={{ textAlignVertical: 'top', minHeight: 60 }}
              />

              <Pressable
                onPress={() => setConfirmStep(true)}
                disabled={!canProceed}
                className="bg-airmess-red rounded-xl py-4 items-center"
                style={{ opacity: !canProceed ? 0.5 : 1 }}
              >
                <Text className="text-white font-bold text-base">Continuer</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <Text className="text-sm text-red-800 leading-relaxed">
                  En confirmant, la course sera marquée comme <Text className="font-bold">échouée</Text>.
                </Text>
                <Text className="text-sm text-red-800 mt-2 leading-relaxed">
                  • Le marchand sera notifié{'\n'}
                  • Tu ne toucheras <Text className="font-bold">aucun gain</Text> pour cette course{'\n'}
                  • Tu redeviendras disponible pour d'autres propositions
                </Text>
                <Text className="text-xs text-red-700 mt-3 italic">
                  Cette action est définitive.
                </Text>
              </View>

              <View className="mb-4 p-3 bg-gray-50 rounded-lg">
                <Text className="text-xs uppercase text-gray-500 font-semibold mb-1">Motif</Text>
                <Text className="text-sm text-airmess-dark">
                  {FAIL_REASONS.find((r) => r.value === reasonCode)?.label}
                </Text>
                {details.trim() && (
                  <Text className="text-xs text-gray-600 mt-1">{details.trim()}</Text>
                )}
              </View>

              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setConfirmStep(false)}
                  disabled={mutation.isPending}
                  className="flex-1 border border-gray-300 rounded-xl py-4 items-center"
                >
                  <Text className="text-airmess-dark font-semibold">Retour</Text>
                </Pressable>
                <Pressable
                  onPress={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="flex-1 bg-airmess-red rounded-xl py-4 items-center"
                  style={{ opacity: mutation.isPending ? 0.5 : 1 }}
                >
                  <Text className="text-white font-bold">
                    {mutation.isPending ? 'Envoi…' : 'Confirmer l\'abandon'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}
