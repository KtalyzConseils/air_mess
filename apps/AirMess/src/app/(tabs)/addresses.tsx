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
import { useLanguageStore, type AppLanguage } from '../../stores/languageStore'
import { getApiErrorMessage } from '../../lib/apiError'

const ADDRESSES_COPY = {
  fr: {
    back: 'Retour',
    add: 'Ajouter',
    title: 'Adresses',
    subtitle: 'Enregistre les destinations frequentes du commerce et reutilise-les pour creer une course.',
    searchPlaceholder: 'Rechercher une adresse',
    loading: 'Chargement...',
    noAddress: 'Aucune adresse',
    noAddressSubtitle: 'Ajoute une adresse frequente pour la retrouver rapidement au moment de creer une course.',
    addAddress: 'Ajouter une adresse',
    noResult: 'Aucun resultat',
    noResultSubtitle: 'Essaie un autre mot-cle.',
    use: 'Utiliser',
    edit: 'Modifier',
    delete: 'Supprimer',
    deleteConfirmTitle: 'Supprimer cette adresse ?',
    cancel: 'Annuler',
    landmark: 'Repere:',
    editAddress: 'Modifier l adresse',
    newAddress: 'Nouvelle adresse',
    businessBook: 'Carnet du commerce',
    close: 'Fermer',
    recipientName: 'Nom destinataire',
    fullName: 'Nom complet',
    phone: 'Telephone',
    save: 'Enregistrer',
    addressAlertTitle: 'Adresse',
    defaultQuartier: 'Adresse client',
  },
  en: {
    back: 'Back',
    add: 'Add',
    title: 'Addresses',
    subtitle: 'Save your business frequent destinations and reuse them to create a delivery.',
    searchPlaceholder: 'Search an address',
    loading: 'Loading...',
    noAddress: 'No address',
    noAddressSubtitle: 'Add a frequent address to find it quickly when creating a delivery.',
    addAddress: 'Add an address',
    noResult: 'No results',
    noResultSubtitle: 'Try another keyword.',
    use: 'Use',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirmTitle: 'Delete this address?',
    cancel: 'Cancel',
    landmark: 'Landmark:',
    editAddress: 'Edit address',
    newAddress: 'New address',
    businessBook: 'Business address book',
    close: 'Close',
    recipientName: 'Recipient name',
    fullName: 'Full name',
    phone: 'Phone',
    save: 'Save',
    addressAlertTitle: 'Address',
    defaultQuartier: 'Customer address',
  },
} as const

const EMPTY_FORM: AddressPayload = {
  recipient_name: '',
  recipient_phone: '',
  quartier: '',
  city: 'Cotonou',
}

export default function AddressesScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const language = useLanguageStore((state) => state.language)
  const copy = ADDRESSES_COPY[language]
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
    onError: (error) => setFormError(getApiErrorMessage(error, language)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (error) => Alert.alert(copy.addressAlertTitle, getApiErrorMessage(error, language)),
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
    Alert.alert(copy.deleteConfirmTitle, address.recipient_name, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: () => deleteMutation.mutate(address.id),
      },
    ])
  }

  const useAddressForCourse = (address: Address) => {
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
      quartier: form.quartier.trim() || copy.defaultQuartier,
      city: form.city.trim() || 'Cotonou',
    })
  }

  return (
    <>
      <Screen py={14} className="px-5">
        <View className="mb-5 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-off-white dark:bg-[#181B24]"
            accessibilityRole="button"
            accessibilityLabel={copy.back}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1614" />
          </Pressable>
          <Pressable
            onPress={openCreate}
            className="h-11 flex-row items-center justify-center rounded-full bg-airmess-yellow px-4"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color="#1A1614" />
            <Text className="ml-1 text-sm font-extrabold text-ink">{copy.add}</Text>
          </Pressable>
        </View>

        <Text className="text-3xl font-extrabold text-ink dark:text-white">{copy.title}</Text>
        <Text className="mt-2 text-sm font-semibold leading-5 text-warm-500">
          {copy.subtitle}
        </Text>

        <View className="mt-5 h-14 flex-row items-center rounded-2xl border border-warm-200 bg-off-white px-4 dark:border-[#343A46] dark:bg-[#181B24]">
          <Ionicons name="search" size={21} color="#6F665D" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            className="ml-3 h-full flex-1 text-base font-semibold text-ink dark:text-white"
            placeholder={copy.searchPlaceholder}
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
              <Text className="text-sm font-bold text-warm-500">{copy.loading}</Text>
            </Card>
          ) : addresses.length === 0 ? (
            <Card className="items-center py-8">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-airmess-yellow">
                <Ionicons name="location-outline" size={28} color="#1A1614" />
              </View>
              <Text className="text-lg font-extrabold text-ink dark:text-white">{copy.noAddress}</Text>
              <Text className="mt-2 text-center text-sm font-semibold leading-5 text-warm-500">
                {copy.noAddressSubtitle}
              </Text>
              <View className="mt-5 w-full">
                <Button onPress={openCreate} rightIcon={<Ionicons name="add" size={20} color="#1A1614" />}>
                  {copy.addAddress}
                </Button>
              </View>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="items-center py-8">
              <Text className="text-base font-extrabold text-ink dark:text-white">{copy.noResult}</Text>
              <Text className="mt-1 text-sm font-semibold text-warm-500">{copy.noResultSubtitle}</Text>
            </Card>
          ) : (
            <View className="gap-3 pb-8">
              {filtered.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  copy={copy}
                  onUse={() => useAddressForCourse(address)}
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
        copy={copy}
        onClose={closeModal}
        onSave={saveAddress}
        onChange={setForm}
      />
    </>
  )
}

type AddressesCopy = (typeof ADDRESSES_COPY)[AppLanguage]

function AddressCard({
  address,
  copy,
  onUse,
  onEdit,
  onDelete,
}: {
  address: Address
  copy: AddressesCopy
  onUse: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="bg-off-white dark:bg-[#181B24]">
      <View className="flex-row items-start">
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
          <Ionicons name="location-outline" size={23} color="#1A1614" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="flex-1 text-lg font-extrabold text-ink dark:text-white" numberOfLines={1}>
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
              {copy.landmark} {address.landmark}
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
          <Text className="ml-2 text-sm font-extrabold text-ink">{copy.use}</Text>
        </Pressable>
        <IconButton icon="create-outline" label={copy.edit} onPress={onEdit} />
        <IconButton icon="trash-outline" label={copy.delete} danger onPress={onDelete} />
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
  copy,
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
  copy: AddressesCopy
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
        <View className="max-h-[90%] rounded-t-[28px] bg-cream px-5 pb-6 pt-4 dark:bg-[#0F1115]">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
                <Ionicons name="location-outline" size={23} color="#1A1614" />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-ink dark:text-white">
                  {editing ? copy.editAddress : copy.newAddress}
                </Text>
                <Text className="mt-0.5 text-sm font-semibold text-warm-500">{copy.businessBook}</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-off-white dark:bg-[#181B24]"
              accessibilityRole="button"
              accessibilityLabel={copy.close}
            >
              <Ionicons name="close" size={22} color="#1A1614" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 28 }}
          >
            <FieldLabel>{copy.recipientName}</FieldLabel>
            <AddressInput
              value={form.recipient_name}
              onChangeText={(value) => updateField('recipient_name', value)}
              placeholder={copy.fullName}
              textContentType="name"
            />

            <FieldLabel>{copy.phone}</FieldLabel>
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
                  {copy.cancel}
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  onPress={onSave}
                  loading={saving}
                  disabled={!canSave}
                  rightIcon={<Ionicons name="checkmark" size={20} color="#1A1614" />}
                >
                  {copy.save}
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
      className="h-14 rounded-2xl border border-warm-200 bg-white px-4 text-base font-semibold text-ink dark:border-[#343A46] dark:bg-[#181B24] dark:text-white"
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
        danger ? 'border-airmess-red/30 bg-danger-bg dark:bg-[#2A1518]' : 'border-warm-200 bg-off-white dark:border-[#343A46] dark:bg-[#181B24]',
      ].join(' ')}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={danger ? '#D40511' : '#1A1614'} />
    </Pressable>
  )
}
