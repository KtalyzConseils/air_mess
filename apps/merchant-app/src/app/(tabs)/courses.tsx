import { useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { fetchCourses, type Course } from '../../api/courses'

export default function CoursesScreen() {
  const router = useRouter()
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['courses'],
    queryFn: ({ pageParam = 1 }) => fetchCourses({ page: pageParam as number, per_page: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.current_page < last.last_page ? last.current_page + 1 : undefined,
  })

  const items = useMemo(
    () => data?.pages.flatMap((p) => p?.data ?? []) ?? [],
    [data],
  )

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <Text className="text-3xl font-extrabold text-ink">Mes courses</Text>
        <Pressable
          onPress={() => router.push('/new-course')}
          className="bg-airmess-yellow rounded-full p-2"
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color="#1A1614" />
        </Pressable>
      </View>
      <Text className="px-5 text-warm-500 text-sm mb-3">
        Tape une course pour voir le détail.
      </Text>

      {isLoading ? (
        <ActivityIndicator color="#1A1614" className="mt-10" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1A1614" />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
          ListEmptyComponent={
            <Text className="text-warm-500 text-center mt-10">Aucune course.</Text>
          }
          renderItem={({ item }) => (
            <CourseRow course={item} onPress={() => router.push(`/course/${item.id}`)} />
          )}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color="#1A1614" className="my-4" /> : null
          }
        />
      )}
    </SafeAreaView>
  )
}

function CourseRow({ course, onPress }: { course: Course; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-off-white border border-warm-200 rounded-2xl p-4 mb-3 active:opacity-80"
    >
      <View className="flex-row justify-between">
        <Text className="font-extrabold text-ink">{course.reference}</Text>
        <Text className="text-xs font-bold text-warm-500">
          {course.status_label ?? course.status}
        </Text>
      </View>
      <Text className="text-sm text-warm-500 mt-1" numberOfLines={2}>
        {course.origin_name} → {course.destination_name}
      </Text>
      <Text className="text-xs text-ink font-bold mt-2">
        {course.delivery_fee.toLocaleString('fr-FR')} FCFA
      </Text>
    </Pressable>
  )
}
