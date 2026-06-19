import { useState } from 'react'
import { View, Text, Pressable, TextInput, Modal, ScrollView } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportIncident, INCIDENT_TYPES } from '../api/driver'

interface Props {
  courseId: number
  visible: boolean
  onClose: () => void
}

export default function IncidentModal({ courseId, visible, onClose }: Props) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<string | null>(null)
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: () => reportIncident(courseId, { type: type!, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
      setType(null)
      setDescription('')
      onClose()
    },
  })

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-airmess-dark">⚠️ Signaler un incident</Text>
            <Pressable onPress={onClose}><Text className="text-gray-400 text-base">Fermer</Text></Pressable>
          </View>

          <Text className="text-xs uppercase text-gray-500 font-semibold mb-2">Type d'incident</Text>
          <ScrollView className="max-h-64 mb-3">
            <View className="flex-row flex-wrap gap-2">
              {INCIDENT_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setType(t.value)}
                  className={`px-3 py-2 rounded-full border ${
                    type === t.value ? 'bg-airmess-dark border-airmess-dark' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-sm ${type === t.value ? 'text-white font-semibold' : 'text-gray-700'}`}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text className="text-xs uppercase text-gray-500 font-semibold mb-1">Description (optionnel)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Détaille ce qui s'est passé…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
            style={{ textAlignVertical: 'top', minHeight: 70 }}
          />

          <Pressable
            onPress={() => mutation.mutate()}
            disabled={!type || mutation.isPending}
            className="bg-airmess-red rounded-xl py-4 items-center"
            style={{ opacity: !type || mutation.isPending ? 0.5 : 1 }}
          >
            <Text className="text-white font-bold text-base">
              {mutation.isPending ? 'Envoi…' : 'Envoyer le signalement'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
