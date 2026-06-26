import { useState } from 'react'
import { Modal, View, Text, Pressable, TextInput, Alert } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { declineCourse, type DeclineReason } from '../api/driver'

interface Props {
  visible: boolean
  courseId: number
  courseReference: string
  onClose: () => void
}

interface ReasonOption {
  value: DeclineReason
  label: string
  icon: string
}

const REASONS: ReasonOption[] = [
  { value: 'too_far',        label: 'Trop loin',                icon: '📍' },
  { value: 'wrong_quartier', label: 'Quartier que je connais mal', icon: '🗺️' },
  { value: 'no_helmet',      label: 'Pas de casque adapté',     icon: '⛑️' },
  { value: 'vehicle_unfit',  label: 'Véhicule pas adapté',      icon: '🛵' },
  { value: 'personal',       label: 'Raison personnelle',       icon: '👤' },
  { value: 'other',          label: 'Autre (préciser)',         icon: '✍️' },
]

/**
 * Modal pour refuser explicitement une course offerte.
 * Le driver choisit une raison parmi la liste ; "other" demande un texte libre min 5 chars.
 */
export default function DeclineCourseModal({ visible, courseId, courseReference, onClose }: Props) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState<DeclineReason | null>(null)
  const [customReason, setCustomReason] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      if (!reason) throw new Error('Sélectionne une raison.')
      const custom = reason === 'other' ? customReason.trim() : undefined
      return declineCourse(courseId, reason, custom)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offered-courses'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      handleClose()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur lors du refus.'
      Alert.alert('Erreur', msg)
    },
  })

  function handleClose() {
    setReason(null)
    setCustomReason('')
    onClose()
  }

  function submit() {
    if (!reason) {
      Alert.alert('Sélection requise', 'Choisis une raison pour refuser la course.')
      return
    }
    if (reason === 'other' && customReason.trim().length < 5) {
      Alert.alert('Précise', 'Pour "Autre", écris au moins 5 caractères.')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-5 pb-8">
          <Text className="text-xl font-bold text-airmess-dark">Refuser la course</Text>
          <Text className="text-xs text-gray-500 mt-1">
            Course <Text className="font-mono">{courseReference}</Text> — elle ne réapparaîtra plus dans tes offres.
          </Text>

          <View className="mt-4 gap-2">
            {REASONS.map((opt) => {
              const selected = reason === opt.value
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setReason(opt.value)}
                  className={`flex-row items-center gap-3 px-4 py-3 rounded-lg border ${
                    selected ? 'bg-airmess-yellow/20 border-airmess-yellow' : 'border-gray-200'
                  }`}
                >
                  <Text className="text-lg">{opt.icon}</Text>
                  <Text className={`flex-1 text-sm ${selected ? 'font-semibold text-airmess-dark' : 'text-gray-700'}`}>
                    {opt.label}
                  </Text>
                  {selected && <Text className="text-airmess-dark font-bold">✓</Text>}
                </Pressable>
              )
            })}
          </View>

          {reason === 'other' && (
            <TextInput
              value={customReason}
              onChangeText={setCustomReason}
              placeholder="Précise la raison (min 5 caractères)"
              multiline
              numberOfLines={3}
              className="mt-3 border border-gray-300 rounded-lg p-3 text-sm"
              style={{ textAlignVertical: 'top' }}
            />
          )}

          <View className="flex-row gap-2 mt-5">
            <Pressable
              onPress={handleClose}
              disabled={mutation.isPending}
              className="flex-1 py-3 rounded-lg border border-gray-300 items-center"
            >
              <Text className="text-gray-700 font-semibold">Annuler</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={mutation.isPending || !reason}
              className="flex-1 py-3 rounded-lg items-center bg-red-600"
              style={{ opacity: mutation.isPending || !reason ? 0.5 : 1 }}
            >
              <Text className="text-white font-semibold">
                {mutation.isPending ? 'Envoi...' : 'Confirmer le refus'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
