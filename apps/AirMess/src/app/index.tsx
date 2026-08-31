import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import BrandSplash from '../components/BrandSplash'
import { hasCompletedFirstLaunch } from '../lib/firstLaunch'
import { useAuthStore } from '../stores/authStore'

export default function IndexRoute() {
  const user = useAuthStore((state) => state.user)
  const [firstLaunchChecked, setFirstLaunchChecked] = useState(false)
  const [firstLaunchDone, setFirstLaunchDone] = useState(false)

  useEffect(() => {
    let mounted = true
    void hasCompletedFirstLaunch().then((done) => {
      if (!mounted) return
      setFirstLaunchDone(done)
      setFirstLaunchChecked(true)
    })
    return () => {
      mounted = false
    }
  }, [])

  if (!firstLaunchChecked) {
    return <BrandSplash />
  }

  if (!user && !firstLaunchDone) {
    return <Redirect href="/onboarding" />
  }

  return <Redirect href={user ? '/dashboard' : '/login'} />
}
