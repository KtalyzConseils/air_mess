import { useEffect, useRef } from 'react'
import { View, Pressable, Text, Platform } from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { useDriverLivePosition } from '../hooks/useDriverLivePosition'

interface Props {
  originLat: number
  originLng: number
  destLat: number
  destLng: number
  /** Point que le driver vise en ce moment — met en avant le marker A ou B. */
  activeTarget: 'origin' | 'destination'
  /**
   * Position de secours si le GPS local n'a pas encore renvoyé un point
   * (au premier rendu). Typiquement `driver.current_lat/lng` renvoyés par l'API.
   */
  fallbackDriverLat?: number | null
  fallbackDriverLng?: number | null
  height?: number
}

/**
 * Carte de la course — 3 markers (A retrait, B livraison, driver) + polyline A→B
 * pointillée à vol d'oiseau. Auto-fit sur les 3 points au 1er render + bouton
 * "Recentrer sur moi" en overlay.
 *
 * Pas de routing Directions API : la navigation routière est déléguée à Google
 * Maps externe (bouton "Naviguer" du parent). La polyline sert juste à donner
 * l'axe visuel A→B.
 *
 * Provider Google explicite sur Android → utilise la clé injectée via
 * app.config.js (GOOGLE_MAPS_ANDROID_KEY). Sur iOS on garde le provider par
 * défaut (Apple Maps) tant qu'aucune clé iOS n'est configurée.
 */
export default function CourseMap({
  originLat,
  originLng,
  destLat,
  destLng,
  activeTarget,
  fallbackDriverLat,
  fallbackDriverLng,
  height = 260,
}: Props) {
  const mapRef = useRef<MapView | null>(null)
  const live = useDriverLivePosition(true)

  const driverLat = live?.latitude ?? fallbackDriverLat ?? null
  const driverLng = live?.longitude ?? fallbackDriverLng ?? null

  const initialRegion: Region = {
    latitude: (originLat + destLat) / 2,
    longitude: (originLng + destLng) / 2,
    latitudeDelta: Math.max(Math.abs(originLat - destLat) * 2.5, 0.02),
    longitudeDelta: Math.max(Math.abs(originLng - destLng) * 2.5, 0.02),
  }

  useEffect(() => {
    if (!mapRef.current) return
    const pts = [
      { latitude: originLat, longitude: originLng },
      { latitude: destLat, longitude: destLng },
    ]
    if (driverLat != null && driverLng != null) {
      pts.push({ latitude: driverLat, longitude: driverLng })
    }
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(pts, {
        edgePadding: { top: 60, right: 60, bottom: 100, left: 60 },
        animated: true,
      })
    }, 250)
    return () => clearTimeout(timer)
    // On refit uniquement quand les points de course changent (pas à chaque tick GPS
    // — sinon la carte re-zoomerait sans arrêt et rendrait la lecture illisible).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originLat, originLng, destLat, destLng])

  function recenterOnDriver() {
    if (driverLat == null || driverLng == null) return
    mapRef.current?.animateCamera(
      { center: { latitude: driverLat, longitude: driverLng }, zoom: 16 },
      { duration: 500 },
    )
  }

  return (
    <View style={{ height, borderRadius: 16, overflow: 'hidden' }}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* Ligne A→B pointillée : juste l'axe visuel, pas un vrai itinéraire routier. */}
        <Polyline
          coordinates={[
            { latitude: originLat, longitude: originLng },
            { latitude: destLat, longitude: destLng },
          ]}
          strokeColor="#1A1614"
          strokeWidth={2}
          lineDashPattern={[6, 6]}
        />

        {/* Marker A — retrait */}
        <Marker
          coordinate={{ latitude: originLat, longitude: originLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <PinBadge label="A" active={activeTarget === 'origin'} color="#FFCC00" />
        </Marker>

        {/* Marker B — livraison */}
        <Marker
          coordinate={{ latitude: destLat, longitude: destLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <PinBadge label="B" active={activeTarget === 'destination'} color="#D40511" />
        </Marker>

        {/* Marker driver — position live */}
        {driverLat != null && driverLng != null && (
          <Marker
            coordinate={{ latitude: driverLat, longitude: driverLng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={live != null}
          >
            <DriverPuck />
          </Marker>
        )}
      </MapView>

      {/* Bouton flottant : recentrer sur ma position */}
      <Pressable
        onPress={recenterOnDriver}
        disabled={driverLat == null}
        style={({ pressed }) => [
          {
            position: 'absolute',
            right: 12,
            bottom: 12,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
            opacity: pressed ? 0.85 : driverLat == null ? 0.4 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Recentrer sur ma position"
      >
        <Ionicons name="locate" size={22} color="#1A1614" />
      </Pressable>

      {/* Indicateur "position mise à jour il y a…" */}
      {live && (
        <View
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            backgroundColor: 'rgba(255,255,255,0.9)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 10, color: '#1A1614', fontWeight: '600' }}>
            Position live
          </Text>
        </View>
      )}
    </View>
  )
}

/* ─── Marker A/B : rond coloré numéroté ────────────────────────────────────── */
function PinBadge({ label, active, color }: { label: string; active: boolean; color: string }) {
  const size = active ? 36 : 30
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: active ? 3 : 2,
        borderColor: '#1A1614',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
      }}
    >
      <Text
        style={{
          color: color === '#FFCC00' ? '#1A1614' : '#FFFFFF',
          fontWeight: '900',
          fontSize: active ? 16 : 14,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

/* ─── Marker driver : puck bleu avec halo ──────────────────────────────────── */
function DriverPuck() {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(30,144,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#1E90FF',
          borderWidth: 3,
          borderColor: '#FFFFFF',
        }}
      />
    </View>
  )
}
