import { Redirect } from 'expo-router'
import { useAuthStore } from '../stores/authStore'

export default function IndexRoute() {
  const user = useAuthStore((state) => state.user)

  return <Redirect href={user ? '/dashboard' : '/login'} />
}
