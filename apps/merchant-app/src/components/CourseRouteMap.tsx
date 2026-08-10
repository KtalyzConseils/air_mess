import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, Platform } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'

export type MapPin = { lat: number; lng: number }

type Props = {
  origin?: MapPin | null
  destination?: MapPin | null
  /** Si fourni : tap carte place le pin actif (création). */
  editable?: boolean
  activePin?: 'A' | 'B'
  onActivePinChange?: (pin: 'A' | 'B') => void
  onOriginChange?: (lat: number, lng: number) => void
  onDestChange?: (lat: number, lng: number) => void
  height?: number
}

const COTONOU = { lat: 6.3703, lng: 2.3912 }

/**
 * Carte A/B via Leaflet + OSM dans une WebView.
 * Fiable sous Expo Go (contrairement à react-native-maps + clé Google native).
 */
export default function CourseRouteMap({
  origin,
  destination,
  editable = false,
  activePin = 'B',
  onActivePinChange,
  onOriginChange,
  onDestChange,
  height = 280,
}: Props) {
  const webRef = useRef<WebView>(null)
  const [active, setActive] = useState<'A' | 'B'>(activePin)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setActive(activePin)
  }, [activePin])

  const hasOrigin = !!origin && origin.lat !== 0 && origin.lng !== 0
  const hasDest = !!destination && destination.lat !== 0 && destination.lng !== 0

  const html = useMemo(() => buildMapHtml({ editable }), [editable])

  const pushState = useCallback(() => {
    if (!ready || !webRef.current) return
    const payload = JSON.stringify({
      origin: hasOrigin ? origin : null,
      destination: hasDest ? destination : null,
      active,
      editable,
    })
    webRef.current.injectJavaScript(`window.__setPins(${payload}); true;`)
  }, [ready, hasOrigin, hasDest, origin, destination, active, editable])

  useEffect(() => {
    pushState()
  }, [pushState])

  function selectPin(pin: 'A' | 'B') {
    setActive(pin)
    onActivePinChange?.(pin)
  }

  function onMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as {
        type: string
        lat?: number
        lng?: number
        pin?: 'A' | 'B'
      }
      if (msg.type === 'ready') {
        setReady(true)
        return
      }
      if (msg.type === 'tap' && typeof msg.lat === 'number' && typeof msg.lng === 'number') {
        if (active === 'A') onOriginChange?.(msg.lat, msg.lng)
        else onDestChange?.(msg.lat, msg.lng)
      }
      if (
        msg.type === 'drag' &&
        msg.pin &&
        typeof msg.lat === 'number' &&
        typeof msg.lng === 'number'
      ) {
        if (msg.pin === 'A') onOriginChange?.(msg.lat, msg.lng)
        else onDestChange?.(msg.lat, msg.lng)
      }
    } catch {
      // ignore
    }
  }

  return (
    <View className="mb-4">
      {editable && (
        <View className="flex-row gap-1 bg-warm-200 rounded-2xl p-1 mb-2">
          <Pressable
            onPress={() => selectPin('A')}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${
              active === 'A' ? 'bg-off-white' : ''
            }`}
          >
            <View className="w-3 h-3 rounded-full bg-airmess-yellow border border-ink" />
            <Text className={`text-sm font-bold ${active === 'A' ? 'text-ink' : 'text-warm-500'}`}>
              Départ A{hasOrigin ? ' ✓' : ''}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => selectPin('B')}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${
              active === 'B' ? 'bg-off-white' : ''
            }`}
          >
            <View className="w-3 h-3 rounded-full bg-airmess-red border border-ink" />
            <Text className={`text-sm font-bold ${active === 'B' ? 'text-ink' : 'text-warm-500'}`}>
              Arrivée B{hasDest ? ' ✓' : ''}
            </Text>
          </Pressable>
        </View>
      )}

      <View
        style={{
          height,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#E8E2D6',
          borderWidth: 1,
          borderColor: '#EEE8DC',
        }}
      >
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={onMessage}
          onLoadEnd={() => {
            // ready vient aussi du postMessage JS ; filet de sécurité
            setTimeout(() => setReady(true), 100)
          }}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          nestedScrollEnabled={Platform.OS === 'android'}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          setSupportMultipleWindows={false}
          androidLayerType="hardware"
        />

        {editable && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 10,
              bottom: 10,
              backgroundColor: 'rgba(255,255,255,0.92)',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Ionicons name="hand-left-outline" size={14} color="#1A1614" />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#1A1614' }}>
              Tape la carte pour placer {active === 'A' ? 'A' : 'B'}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

function buildMapHtml({ editable }: { editable: boolean }): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#E8E2D6; }
    .pin {
      width: 30px; height: 30px; border-radius: 50%;
      border: 2px solid #1A1614; display:flex; align-items:center; justify-content:center;
      font-weight: 900; font-size: 14px; font-family: system-ui, sans-serif;
      box-shadow: 0 2px 6px rgba(0,0,0,.3);
    }
    .pin.active { width: 36px; height: 36px; border-width: 3px; font-size: 16px; }
    .pin-a { background:#FFCC00; color:#1A1614; }
    .pin-b { background:#D40511; color:#fff; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const EDITABLE = ${editable ? 'true' : 'false'};
    const map = L.map('map', { zoomControl: true, attributionControl: false })
      .setView([${COTONOU.lat}, ${COTONOU.lng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    let markerA = null, markerB = null, line = null;
    let state = { origin: null, destination: null, active: 'B', editable: EDITABLE };

    function icon(label, active) {
      const cls = 'pin pin-' + label.toLowerCase() + (active ? ' active' : '');
      return L.divIcon({
        className: '',
        html: '<div class="' + cls + '">' + label + '</div>',
        iconSize: [active ? 36 : 30, active ? 36 : 30],
        iconAnchor: [active ? 18 : 15, active ? 18 : 15],
      });
    }

    function fit() {
      const pts = [];
      if (state.origin) pts.push([state.origin.lat, state.origin.lng]);
      if (state.destination) pts.push([state.destination.lat, state.destination.lng]);
      if (pts.length === 1) map.setView(pts[0], 15);
      else if (pts.length === 2) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
    }

    function redraw() {
      if (markerA) { map.removeLayer(markerA); markerA = null; }
      if (markerB) { map.removeLayer(markerB); markerB = null; }
      if (line) { map.removeLayer(line); line = null; }

      if (state.origin) {
        markerA = L.marker([state.origin.lat, state.origin.lng], {
          icon: icon('A', state.active === 'A'),
          draggable: state.editable,
        }).addTo(map);
        if (state.editable) {
          markerA.on('dragend', function (e) {
            const p = e.target.getLatLng();
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'drag', pin: 'A', lat: p.lat, lng: p.lng
            }));
          });
        }
      }
      if (state.destination) {
        markerB = L.marker([state.destination.lat, state.destination.lng], {
          icon: icon('B', state.active === 'B'),
          draggable: state.editable,
        }).addTo(map);
        if (state.editable) {
          markerB.on('dragend', function (e) {
            const p = e.target.getLatLng();
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'drag', pin: 'B', lat: p.lat, lng: p.lng
            }));
          });
        }
      }
      if (state.origin && state.destination) {
        line = L.polyline(
          [[state.origin.lat, state.origin.lng], [state.destination.lat, state.destination.lng]],
          { color: '#1A1614', weight: 2, dashArray: '6 6' }
        ).addTo(map);
      }
      fit();
    }

    window.__setPins = function (next) {
      state = Object.assign({}, state, next || {});
      redraw();
    };

    map.on('click', function (e) {
      if (!state.editable) return;
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'tap', lat: e.latlng.lat, lng: e.latlng.lng
      }));
    });

    setTimeout(function () { map.invalidateSize(); }, 120);
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>`
}
