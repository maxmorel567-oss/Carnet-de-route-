// leaflet.markercluster attend une variable globale L : on l'expose avant de le charger.
import L from 'leaflet'
window.L = L
await import('leaflet.markercluster')
export default L
