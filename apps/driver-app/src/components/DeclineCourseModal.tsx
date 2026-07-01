import { useState } from 'react'
import { View, Text, Pressable, TextInput, Alert } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { declineCourse, type DeclineReason } from '../api/driver'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'

interface Props {
  visible: boolean
  courseId: number
  courseReference: string
  onClose: () => void
}

interface ReasonOption {
  value: DeclineReason
  label: string
  icon: keyof typeof Ionicons.glyphMap
}

const REASONS: ReasonOption[] = [
  { value: 'too_far',        label: 'Trop loin',                    icon: 'location' },
  { value: 'wrong_quartier', label: 'Quartier que je connais mal',  icon: 'map' },
  { value: 'no_helmet',      label: 'Pas de casque adapté',         icon: 'shield-half' },
  { value: 'vehicle_unfit',  label: 'Véhicule pas adapté',          icon: 'bicycle' },
  { value: 'personal',       label: 'Raison personnelle',           icon: 'person' },
  { value: 'other',          label: 'Autre (préciser)',             icon: 'create' },
]

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
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Refuser la course"
      subtitle={`${courseReference} — elle ne réapparaîtra plus dans tes offres.`}
      footer={
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button variant="outline" size="md" onPress={handleClose} disabled={mutation.isPending}>
              Annuler
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="danger"
              size="md"
              onPress={submit}
              loading={mutation.isPending}
              disabled={!reason}
            >
              Confirmer
            </Button>
          </View>
        </View>
      }
    >
      <View className="gap-2">
        {REASONS.map((opt) => {
          const selected = reason === opt.value
          return (
            <Pressable
              key={opt.value}
              onPress={() => setReason(opt.value)}
              className={[
                'flex-row items-center px-4 py-3 rounded-2xl border-2',
                selected
                  ? 'bg-airmess-yellow/15 border-airmess-yellow'
                  : 'bg-off-white border-warm-200',
              ].join(' ')}
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <View
                className={[
                  'w-9 h-9 rounded-xl items-center justify-center mr-3',
                  selected ? 'bg-airmess-yellow' : 'bg-warm-100',
                ].join(' ')}
              >
                <Ionicons name={opt.icon} size={18} color="#1A1614" />
              </View>
              <Text className={[
                'flex-1 text-base',
                selected ? 'font-extrabold text-ink' : 'font-semibold text-ink',
              ].join(' ')}>
                {opt.label}
              </Text>
              {selected && (
                <View className="w-6 h-6 rounded-full bg-ink items-center justify-center">
                  <Ionicons name="checkmark" size={14} color="#FFCC00" />
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      {reason === 'other' && (
        <TextInput
          value={customReason}
          onChangeText={setCustomReason}
          placeholder="Précise la raison (min 5 caractères)"
          placeholderTextColor="#B8AF9F"
          multiline
          numberOfLines={3}
          className="mt-3 border-2 border-warm-300 rounded-2xl p-3 text-base text-ink bg-off-white"
          style={{ textAlignVertical: 'top', minHeight: 88 }}
        />
      )}
    </BottomSheet>
  )
}
