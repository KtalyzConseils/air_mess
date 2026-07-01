import { useState } from 'react'
import { View, Text, Pressable, TextInput } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportIncident, INCIDENT_TYPES } from '../api/driver'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'

interface Props {
  courseId: number
  visible: boolean
  onClose: () => void
}

/**
 * Signalement d'un incident pendant la course.
 * L'incident continue la course — c'est différent de "Abandonner" (FailCourseModal).
 *
 * Design : liste de tags cliquables (chips) + description libre.
 * Action principale = warning (orange) — pas danger, l'incident n'est pas final.
 */
export default function IncidentModal({ courseId, visible, onClose }: Props) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<string | null>(null)
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      reportIncident(courseId, {
        type: type!,
        description: description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
      handleClose()
    },
  })

  function handleClose() {
    setType(null)
    setDescription('')
    onClose()
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Signaler un incident"
      subtitle="Sans abandonner la course. On te recontacte si besoin."
      footer={
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button variant="outline" size="md" onPress={handleClose} disabled={mutation.isPending}>
              Annuler
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="dark"
              size="md"
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!type}
            >
              Envoyer
            </Button>
          </View>
        </View>
      }
    >
      {/* Chips type d'incident */}
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-2">
        Type d'incident
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {INCIDENT_TYPES.map((t) => {
          const selected = type === t.value
          return (
            <Pressable
              key={t.value}
              onPress={() => setType(t.value)}
              className={[
                'px-4 py-2.5 rounded-full border-2',
                selected
                  ? 'bg-ink border-ink'
                  : 'bg-off-white border-warm-200',
              ].join(' ')}
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <Text
                className={[
                  'text-sm',
                  selected ? 'text-airmess-yellow font-extrabold' : 'text-ink font-semibold',
                ].join(' ')}
              >
                {t.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Description libre */}
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-2">
        Description (facultatif)
      </Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Détaille ce qui s'est passé…"
        placeholderTextColor="#B8AF9F"
        className="border-2 border-warm-300 rounded-2xl px-4 py-3 text-base text-ink bg-off-white"
        style={{ textAlignVertical: 'top', minHeight: 90 }}
      />
    </BottomSheet>
  )
}
