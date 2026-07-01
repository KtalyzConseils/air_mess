import { useEffect, useRef } from 'react'
import { View, Image, Animated, StatusBar, Easing } from 'react-native'

/**
 * BrandSplash — splash React qui prend la relève dès que l'app React démarre.
 *
 * Pourquoi : sur Android 12+, le splash natif est imposé par le système
 * (adaptive icon + nom de l'app). Notre splash-icon.png (mark + wordmark
 * plein écran) est ignoré. Ce composant réaffiche notre design correctement
 * dès que RN monte, en cohérence de couleur avec le splash natif
 * (#1A1614 dans les deux cas → 0 flash de transition).
 *
 * Animation :
 *   - fade-in du composite mark+wordmark (700ms)
 *   - léger scale-in (0.94 → 1.0) pour une entrée organique
 */
export default function BrandSplash() {
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.94)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [opacity, scale])

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#1A1614',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A1614" translucent />
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={{ width: 260, height: 390 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  )
}
