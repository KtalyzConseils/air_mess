import { useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { isAxiosError } from 'axios'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
  type Address,
  type AddressPayload,
} from '../../api/addresses'

const EMPTY_FORM: AddressPayload = {
  recipient_name: '',
  recipient_phone: '',
  quartier: '',
  city: 'Cotonou',
}

export default function AddressesScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Address | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<AddressPayload>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: addresses = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return addresses

    return addresses.filter((address) =>
      [
        address.label,
        address.recipient_name,
        address.recipient_phone,
        address.street,
        address.landmark,
        address.quartier,
        address.city,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [addresses, search])

  const saveMutation = useMutation({
    mutationFn: (payload: AddressPayload) =>
      editing ? updateAddress(editing.id, payload) : createAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      closeModal()
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (error) => Alert.alert('Adresse', getApiErrorMessage(error)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (address: Address) => {
    setEditing(address)
    setForm({
      recipient_name: address.recipient_name,
      recipient_phone: address.recipient_phone,
      quartier: address.quartier,
      city: address.city,
    })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saveMutation.isPending) return
    setModalOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const confirmDelete = (address: Address) => {
    Alert.alert('Supprimer cette adresse ?', address.recipient_name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(address.id),
      },
    ])
  }

  const useAddress = (address: Address) => {
    router.push({
      pathname: '/(tabs)/new-course',
      params: { addressId: String(address.id) },
    })
  }

  const canSave =
    form.recipient_name.trim().length >= 2 &&
    form.recipient_phone.trim().length >= 4 &&
    !saveMutation.isPending

  const saveAddress = () => {
    if (!canSave) return

    saveMutation.mutate({
      recipient_name: form.recipient_name.trim(),
      recipient_phone: form.recipient_phone.trim(),
      quartier: form.quartier.trim() || 'Adresse client',
      city: form.city.trim() || 'Cotonou',
    })
  }

  return (
    <>
      <Screen py={14} className="px-5">
        <View className="mb-5 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-off-white"
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color="#1A1614" />
          </Pressable>
          <Pressable
            onPress={openCreate}
            className="h-11 flex-row items-center justify-center rounded-full bg-airmess-yellow px-4"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color="#1A1614" />
            <Text className="ml-1 text-sm font-extrabold text-ink">Ajouter</Text>
          </Pressable>
        </View>

        <Text className="text-3xl font-extrabold text-ink">Adresses</Text>
        <Text className="mt-2 text-sm font-semibold leading-5 text-warm-500">
          Enregistre les destinations frequentes du commerce et reutilise-les pour creer une course.
        </Text>

        <View className="mt-5 h-14 flex-row items-center rounded-2xl border border-warm-200 bg-off-white px-4">
          <Ionicons name="search" size={21} color="#6F665D" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            className="ml-3 h-full flex-1 text-base font-semibold text-ink"
            placeholder="Rechercher une adresse"
            placeholderTextColor="#A89F95"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} className="h-9 w-9 items-center justify-center">
              <Ionicons name="close-circle" size={20} color="#6F665D" />
            </Pressable>
          )}
        </View>

        <ScrollView
          className="mt-5"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {isLoading ? (
            <Card className="items-center py-8">
              <Text className="text-sm font-bold text-warm-500">Chargement...</Text>
            </Card>
          ) : addresses.length === 0 ? (
            <Card className="items-center py-8">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-airmess-yellow">
                <Ionicons name="location-outline" size={28} color="#1A1614" />
              </View>
              <Text className="text-lg font-extrabold text-ink">Aucune adresse</Text>
              <Text className="mt-2 text-center text-sm font-semibold leading-5 text-warm-500">
                Ajoute une adresse frequente pour la retrouver rapidement au moment de creer une course.
              </Text>
              <View className="mt-5 w-full">
                <Button onPress={openCreate} rightIcon={<Ionicons name="add" size={20} color="#1A1614" />}>
                  Ajouter une adresse
                </Button>
              </View>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="items-center py-8">
              <Text className="text-base font-extrabold text-ink">Aucun resultat</Text>
              <Text className="mt-1 text-sm font-semibold text-warm-500">Essaie un autre mot-cle.</Text>
            </Card>
          ) : (
            <View className="gap-3 pb-8">
              {filtered.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onUse={() => useAddress(address)}
                  onEdit={() => openEdit(address)}
                  onDelete={() => confirmDelete(address)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </Screen>

      <AddressFormModal
        visible={modalOpen}
        editing={editing}
        form={form}
        formError={formError}
        canSave={canSave}
        saving={saveMutation.isPending}
        onClose={closeModal}
        onSave={saveAddress}
        onChange={setForm}
      />
    </>
  )
}

function AddressCard({
  address,
  onUse,
  onEdit,
  onDelete,
}: {
  address: Address
  onUse: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="bg-off-white">
      <View className="flex-row items-start">
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
          <Ionicons name="location-outline" size={23} color="#1A1614" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="flex-1 text-lg font-extrabold text-ink" numberOfLines={1}>
              {address.label || address.recipient_name}
            </Text>
            {address.usage_count > 0 && (
              <Text className="ml-2 rounded-full bg-warm-100 px-2 py-1 text-xs font-extrabold text-warm-600">
                x{address.usage_count}
              </Text>
            )}
          </View>
          <Text className="mt-1 text-sm font-bold text-warm-600" numberOfLines={1}>
            {address.recipient_name} - {address.recipient_phone}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-warm-500" numberOfLines={2}>
            {[address.street, address.quartier, address.city].filter(Boolean).join(', ')}
          </Text>
          {address.landmark && (
            <Text className="mt-1 text-xs font-semibold text-warm-500" numberOfLines={1}>
              Repere: {address.landmark}
            </Text>
          )}
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={onUse}
          className="h-11 flex-1 flex-row items-center justify-center rounded-xl bg-airmess-yellow"
          accessibilityRole="button"
        >
          <Ionicons name="cube-outline" size={18} color="#1A1614" />
          <Text className="ml-2 text-sm font-extrabold text-ink">Utiliser</Text>
        </Pressable>
        <IconButton icon="create-outline" label="Modifier" onPress={onEdit} />
        <IconButton icon="trash-outline" label="Supprimer" danger onPress={onDelete} />
      </View>
    </Card>
  )
}

function AddressFormModal({
  visible,
  editing,
  form,
  formError,
  canSave,
  saving,
  onClose,
  onSave,
  onChange,
}: {
  visible: boolean
  editing: Address | null
  form: AddressPayload
  formError: string | null
  canSave: boolean
  saving: boolean
  onClose: () => void
  onSave: () => void
  onChange: (form: AddressPayload) => void
}) {
  const updateField = <K extends keyof AddressPayload>(key: K, value: AddressPayload[K]) => {
    onChange({ ...form, [key]: value })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[90%] rounded-t-[28px] bg-cream px-5 pb-6 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
                <Ionicons name="location-outline" size={23} color="#1A1614" />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-ink">
                  {editing ? 'Modifier l adresse' : 'Nouvelle adresse'}
                </Text>
                <Text className="mt-0.5 text-sm font-semibold text-warm-500">Carnet du commerce</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-off-white"
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={22} color="#1A1614" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FieldLabel>Nom destinataire</FieldLabel>
            <AddressInput
              value={form.recipient_name}
              onChangeText={(value) => updateField('recipient_name', value)}
              placeholder="Nom complet"
              textContentType="name"
            />

            <FieldLabel>Telephone</FieldLabel>
            <AddressInput
              value={form.recipient_phone}
              onChangeText={(value) => updateField('recipient_phone', value)}
              placeholder="+229..."
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />

            {formError && <Text className="mt-3 text-sm font-bold text-airmess-red">{formError}</Text>}

            <View className="mt-5 flex-row gap-3">
              <View className="flex-1">
                <Button variant="outline" onPress={onClose} disabled={saving}>
                  Annuler
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  onPress={onSave}
                  loading={saving}
                  disabled={!canSave}
                  rightIcon={<Ionicons name="checkmark" size={20} color="#1A1614" />}
                >
                  Enregistrer
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="mb-2 mt-3 text-xs font-extrabold uppercase text-warm-500">{children}</Text>
}

function AddressInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  textContentType,
  autoCapitalize,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  keyboardType?: 'default' | 'phone-pad'
  textContentType?: 'name' | 'telephoneNumber'
  autoCapitalize?: 'none'
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      textContentType={textContentType}
      autoCapitalize={autoCapitalize}
      className="h-14 rounded-2xl border border-warm-200 bg-white px-4 text-base font-semibold text-ink"
      placeholder={placeholder}
      placeholderTextColor="#A89F95"
    />
  )
}

function IconButton({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  danger?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'h-11 w-11 items-center justify-center rounded-xl border',
        danger ? 'border-airmess-red/30 bg-danger-bg' : 'border-warm-200 bg-off-white',
      ].join(' ')}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={danger ? '#D40511' : '#1A1614'} />
    </Pressable>
  )
}

function getApiErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
    return data?.message ?? Object.values(data?.errors ?? {})[0]?.[0] ?? 'Impossible de traiter la demande.'
  }

  return 'Impossible de traiter la demande.'
}
