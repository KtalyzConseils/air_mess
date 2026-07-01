import { View, Text, Pressable, Linking } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { acceptCourse, type DriverCourseSummary } from '../api/driver'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'

interface Props {
  course: DriverCourseSummary & { origin_phone?: string }
  visible: boolean
  onClose: () => void
  /** Callback pour ouvrir le flow "Refuser" au niveau du parent. */
  onDecline?: () => void
}

/**
 * Détail d'une course proposée — même pattern BottomSheet que Decline/Incident/Fail.
 *
 * Sections (haut → bas, priorité informationnelle) :
 *   1. Gain hero (jaune brand)
 *   2. Trajet (timeline origin → destination avec distance)
 *   3. À encaisser (si has_collection)
 *   4. Colis (chips catégorie/poids/taille)
 *   5. Départ détaillé (adresse + landmark + instructions)
 *   6. Arrivée détaillée
 *
 * Actions : Refuser (1/3) + Accepter (2/3) — même hiérarchie que la carte parent.
 */
export default function CourseDetailModal({ course, visible, onClose, onDecline }: Props) {
  const queryClient = useQueryClient()
  const isExpress = course.urgency === 'express'

  const mutation = useMutation({
    mutationFn: () => acceptCourse(course.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offered-courses'] })
      queryClient.invalidateQueries({ queryKey: ['my-active'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      onClose()
    },
  })

  const subtitle = isExpress ? 'Express · à prendre vite' : 'Course standard'

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={course.reference}
      subtitle={subtitle}
      footer={
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              variant="outline"
              size="md"
              onPress={() => {
                onClose()
                onDecline?.()
              }}
              disabled={mutation.isPending}
            >
              Refuser
            </Button>
          </View>
          <View className="flex-[2]">
            <Button
              variant={isExpress ? 'danger' : 'primary'}
              size="md"
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              leftIcon={
                isExpress ? (
                  <Ionicons name="flash" size={16} color="#ffffff" />
                ) : (
                  <Ionicons name="checkmark" size={16} color="#1A1614" />
                )
              }
            >
              Accepter
            </Button>
          </View>
        </View>
      }
    >
      {/* Bandeau express — signature */}
      {isExpress && (
        <View className="bg-airmess-red rounded-2xl px-3 py-2 mb-3 flex-row items-center">
          <Ionicons name="flash" size={14} color="#ffffff" />
          <Text className="text-white text-xs font-extrabold tracking-widest ml-2">
            EXPRESS · PRIORITAIRE
          </Text>
        </View>
      )}

      {/* Hero gain */}
      <View className="bg-airmess-yellow rounded-2xl p-5 mb-3">
        <Text className="text-[10px] uppercase text-ink/70 tracking-widest font-extrabold">
          Ton gain
        </Text>
        <Text className="text-4xl font-extrabold text-ink mt-1">
          {course.driver_earnings.toLocaleString('fr-FR')}
          <Text className="text-lg font-bold text-ink/80"> FCFA</Text>
        </Text>
      </View>

      {/* Trajet */}
      <SectionLabel icon="navigate-outline">Trajet</SectionLabel>
      <View className="bg-off-white border border-warm-200 rounded-2xl p-4 mb-3">
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-success mr-3" />
          <Text className="text-base font-extrabold text-ink flex-1">
            {course.origin_quartier}
          </Text>
        </View>
        <View className="ml-[6px] my-1">
          <View className="w-0.5 h-4 bg-warm-300" />
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-airmess-red mr-3" />
          <Text className="text-base font-extrabold text-ink flex-1">
            {course.destination_quartier}
          </Text>
        </View>
        {typeof course.distance_km === 'number' && (
          <View className="flex-row items-center mt-3 pt-3 border-t border-warm-200">
            <Ionicons name="bicycle" size={14} color="#6B6250" />
            <Text className="text-xs text-warm-600 font-bold ml-1.5">
              {course.distance_km.toFixed(1)} km de ta position
            </Text>
          </View>
        )}
      </View>

      {/* À encaisser */}
      {course.has_collection && (
        <View className="bg-airmess-dark rounded-2xl p-4 mb-3 flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-airmess-yellow items-center justify-center mr-3">
            <Ionicons name="cash-outline" size={22} color="#1A1614" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] uppercase text-airmess-yellow tracking-widest font-extrabold">
              À encaisser à la livraison
            </Text>
            <Text className="text-2xl font-extrabold text-white mt-0.5">
              {course.collection_amount?.toLocaleString('fr-FR')}
              <Text className="text-sm font-bold text-white/70"> FCFA</Text>
            </Text>
            {course.collection_method && (
              <Text className="text-xs text-white/60 mt-0.5">via {course.collection_method}</Text>
            )}
          </View>
        </View>
      )}

      {/* Colis */}
      <SectionLabel icon="cube-outline">Colis</SectionLabel>
      <View className="bg-off-white border border-warm-200 rounded-2xl p-4 mb-3">
        <Text className="text-base font-semibold text-ink mb-2">
          {course.package_description}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {course.package_category?.name && (
            <Chip icon="pricetag-outline">{course.package_category.name}</Chip>
          )}
          {course.package_weight_kg != null && (
            <Chip icon="barbell-outline">{course.package_weight_kg} kg</Chip>
          )}
          {course.package_size && <Chip icon="resize-outline">Taille {course.package_size}</Chip>}
        </View>
      </View>

      {/* Départ */}
      <SectionLabel icon="location-outline">Départ</SectionLabel>
      <LocationCard
        name={course.origin_name}
        street={course.origin_street}
        quartier={course.origin_quartier}
        landmark={course.origin_landmark}
        instructions={course.origin_instructions}
        dotColor="bg-success"
        phone={course.origin_phone}
      />

      {/* Arrivée */}
      <SectionLabel icon="flag-outline">Arrivée</SectionLabel>
      <LocationCard
        name={course.destination_name}
        street={course.destination_street}
        quartier={course.destination_quartier}
        city={course.destination_city}
        landmark={course.destination_landmark}
        instructions={course.destination_instructions}
        dotColor="bg-airmess-red"
      />
    </BottomSheet>
  )
}

function SectionLabel({
  icon,
  children,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap
  children: React.ReactNode
}) {
  return (
    <View className="flex-row items-center mb-2 mt-1">
      <Ionicons name={icon} size={12} color="#8A7E68" />
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold ml-1.5">
        {children}
      </Text>
    </View>
  )
}

function Chip({
  icon,
  children,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap
  children: React.ReactNode
}) {
  return (
    <View className="flex-row items-center bg-cream border border-warm-300 rounded-full px-2.5 py-1">
      <Ionicons name={icon} size={11} color="#6B6250" />
      <Text className="text-xs text-warm-600 font-bold ml-1">{children}</Text>
    </View>
  )
}

interface LocationCardProps {
  name: string
  street: string | null
  quartier: string
  city?: string
  landmark: string | null
  instructions: string | null
  dotColor: string
  phone?: string
}

function LocationCard({
  name,
  street,
  quartier,
  city,
  landmark,
  instructions,
  dotColor,
  phone,
}: LocationCardProps) {
  return (
    <View className="bg-off-white border border-warm-200 rounded-2xl p-4 mb-3">
      <View className="flex-row items-start">
        <View className={`w-3 h-3 rounded-full mt-1.5 mr-3 ${dotColor}`} />
        <View className="flex-1">
          <Text className="text-base font-extrabold text-ink">{name}</Text>
          {street && <Text className="text-sm text-warm-600 mt-0.5">{street}</Text>}
          <Text className="text-sm text-warm-600">
            {quartier}
            {city ? `, ${city}` : ''}
          </Text>
        </View>
        {phone && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${phone}`)}
            className="w-10 h-10 rounded-full bg-airmess-yellow items-center justify-center ml-2"
            hitSlop={6}
          >
            <Ionicons name="call" size={16} color="#1A1614" />
          </Pressable>
        )}
      </View>

      {landmark && (
        <View className="flex-row items-start mt-3 pt-3 border-t border-warm-200">
          <Ionicons name="flag-outline" size={12} color="#8A7E68" style={{ marginTop: 2 }} />
          <Text className="text-xs text-warm-600 italic ml-1.5 flex-1">{landmark}</Text>
        </View>
      )}
      {instructions && (
        <View className="mt-2 bg-airmess-yellow/15 border border-airmess-yellow/40 rounded-xl p-3 flex-row items-start">
          <Ionicons name="reader-outline" size={14} color="#1A1614" style={{ marginTop: 1 }} />
          <Text className="text-sm text-ink ml-2 flex-1 font-semibold">{instructions}</Text>
        </View>
      )}
    </View>
  )
}
