import L from 'leaflet'

/**
 * Pins A (origine, jaune AirMess) et B (destination, sombre) partagés entre
 * la mini-carte read-only du récap et la DualPinMap interactive du formulaire.
 * Rendus en divIcon HTML pour éviter tout asset externe et rester alignés
 * sur la charte (jaune #F4C41F + noir #1F1D1A).
 */
export const ORIGIN_ICON = L.divIcon({
  className: '',
  html:
    '<div style="background:#F4C41F;border:2px solid #1F1D1A;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35)">' +
    '<span style="transform:rotate(45deg);font-weight:700;color:#1F1D1A;font-size:12px">A</span></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

export const DEST_ICON = L.divIcon({
  className: '',
  html:
    '<div style="background:#1F1D1A;border:2px solid #F4C41F;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35)">' +
    '<span style="transform:rotate(45deg);font-weight:700;color:#F4C41F;font-size:12px">B</span></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})
