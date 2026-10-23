import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import L from '../lib/leaflet.js'
import { ATTRIBUTION, buildStyle, webglSupported } from '../lib/mapStyle.js'

// Secours si la carte vectorielle ne peut pas s'afficher (pas de WebGL, service injoignable)
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

// Fond de carte « Établi » (vectoriel), ou tuiles OSM en secours. Renvoie une fonction de nettoyage.
function addBaseLayer(map) {
  const fallback = () =>
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19, className: 'tuiles-osm' }).addTo(map)
  if (!webglSupported()) {
    fallback()
    return () => {}
  }

  let layer
  let cancelled = false
  const onTheme = async (e) => {
    try {
      layer?.getMaplibreMap().setStyle(await buildStyle(e.matches))
    } catch {
      // On garde le style déjà affiché.
    }
  }
  Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
    import('@maplibre/maplibre-gl-leaflet'),
  ])
    .then(async ([maplibregl, worker]) => {
      // Le « worker » décode les tuiles : Vite ne le copie que si on l'importe explicitement.
      maplibregl.setWorkerUrl(worker.default)
      const style = await buildStyle(darkQuery.matches)
      if (cancelled) return
      layer = L.maplibreGL({ style, attributionControl: false }).addTo(map)
      map.attributionControl.addAttribution(ATTRIBUTION)
      darkQuery.addEventListener('change', onTheme)
    })
    .catch(() => !cancelled && fallback())

  return () => {
    cancelled = true
    darkQuery.removeEventListener('change', onTheme)
  }
}

// Zoom à partir duquel les photos apparaissent en vignettes.
const PHOTO_ZOOM = 10

// Punaise rouge inclinée, pointe en bas à gauche (= position exacte du voyage).
let pinCount = 0
function pushpinSvg(width) {
  const id = `punaise${pinCount++}`
  const height = Math.round(width * 1.2)
  return `<svg viewBox="0 0 40 48" width="${width}" height="${height}" aria-hidden="true">
    <defs>
      <linearGradient id="${id}c" x1="0" x2="1">
        <stop offset="0" stop-color="#8E0B0B"/><stop offset=".45" stop-color="#E21B1B"/>
        <stop offset=".7" stop-color="#FF4A3D"/><stop offset="1" stop-color="#A80E0E"/>
      </linearGradient>
      <radialGradient id="${id}t" cx=".35" cy=".35" r=".8">
        <stop offset="0" stop-color="#FF5B4E"/><stop offset="1" stop-color="#D01414"/>
      </radialGradient>
      <linearGradient id="${id}a" x1="0" x2="1">
        <stop offset="0" stop-color="#8A8F96"/><stop offset=".5" stop-color="#F2F4F6"/><stop offset="1" stop-color="#9BA0A6"/>
      </linearGradient>
    </defs>
    <ellipse cx="9" cy="46" rx="7" ry="1.6" fill="#000" opacity=".18"/>
    <g transform="translate(6 46) rotate(32)">
      <rect x="-1.2" y="-15" width="2.4" height="15" rx="1.2" fill="url(#${id}a)"/>
      <path d="M-11 -18 v-3.5 a11 4.5 0 0 0 22 0 v3.5 a11 4.5 0 0 1 -22 0z" fill="url(#${id}c)"/>
      <ellipse cx="0" cy="-21.5" rx="11" ry="4.5" fill="url(#${id}t)"/>
      <path d="M-4.5 -22 L-3.2 -33 h6.4 L4.5 -22z" fill="url(#${id}c)"/>
      <path d="M-9 -34 v-3.5 a9 3.8 0 0 0 18 0 v3.5 a9 3.8 0 0 1 -18 0z" fill="url(#${id}c)"/>
      <ellipse cx="0" cy="-37.5" rx="9" ry="3.8" fill="url(#${id}t)"/>
      <ellipse cx="-4" cy="-38.3" rx="2.6" ry="1.1" fill="#fff" opacity=".75"/>
      <ellipse cx="-6.5" cy="-22.6" rx="2.4" ry="1" fill="#fff" opacity=".6"/>
    </g>
  </svg>`
}

const pinIcon = (active) =>
  L.divIcon({
    className: '',
    html: `<div class="epingle${active ? ' active' : ''}">${pushpinSvg(34)}</div>`,
    iconSize: [34, 41],
    iconAnchor: [5, 39],
  })

// Groupe de voyages : une grande punaise avec le nombre de voyages.
const clusterIcon = (cluster) => {
  const n = cluster.getChildCount()
  return L.divIcon({
    className: '',
    html: `<div class="epingle groupe-punaise">${pushpinSvg(50)}<span>${n}</span></div>`,
    iconSize: [50, 60],
    iconAnchor: [8, 58],
  })
}

const positionIcon = L.divIcon({ className: '', html: '<div class="ma-position"></div>', iconSize: [20, 20] })

const photoIcon = (url, count = 1) =>
  L.divIcon({
    className: '',
    html: `<div class="vignette" style="background-image:url('${url}')">${count > 1 ? `<span>${count}</span>` : ''}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })

// Photos proches regroupées : la vignette de la première + le nombre.
const photoClusterIcon = (cluster) =>
  photoIcon(cluster.getAllChildMarkers()[0].options.thumbUrl, cluster.getChildCount())

/**
 * Carte plein écran. Leaflet est piloté directement (hors React) pour gérer
 * le regroupement des épingles et les vignettes photo.
 */
export default function MapView({ trips, photos, selectedId, myPosition, onSelectTrip, onSelectPhoto, onMapClick, focus }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const clusterRef = useRef(null)
  const photoLayerRef = useRef(null)
  const positionLayerRef = useRef(null)
  const handlers = useRef({})
  handlers.current = { onSelectTrip, onSelectPhoto, onMapClick }

  // Création de la carte (une seule fois)
  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: false, worldCopyJump: true, minZoom: 2, maxZoom: 19 }).setView([30, 10], 3)
    L.control.zoom({ position: 'topright' }).addTo(map)
    map.attributionControl.setPrefix(false)
    const removeBase = addBaseLayer(map)
    positionLayerRef.current = L.layerGroup().addTo(map)

    clusterRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: clusterIcon,
    }).addTo(map)

    photoLayerRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 44,
      iconCreateFunction: photoClusterIcon,
    })
    const togglePhotos = () => {
      const visible = map.getZoom() >= PHOTO_ZOOM
      if (visible && !map.hasLayer(photoLayerRef.current)) photoLayerRef.current.addTo(map)
      if (!visible && map.hasLayer(photoLayerRef.current)) photoLayerRef.current.remove()
    }
    map.on('zoomend', togglePhotos)
    togglePhotos()
    map.on('click', (e) => handlers.current.onMapClick?.(e.latlng))

    mapRef.current = map
    return () => {
      removeBase()
      map.remove()
    }
  }, [])

  // Épingles de voyage
  useEffect(() => {
    const cluster = clusterRef.current
    cluster.clearLayers()
    cluster.addLayers(
      trips.map((t) =>
        L.marker([t.place.lat, t.place.lng], {
          icon: pinIcon(t.id === selectedId),
          title: t.title,
          zIndexOffset: t.id === selectedId ? 1000 : 0,
        }).on('click', () => handlers.current.onSelectTrip(t.id)),
      ),
    )
  }, [trips, selectedId])

  // Vignettes photo (seulement celles qui ont une position)
  useEffect(() => {
    const layer = photoLayerRef.current
    layer.clearLayers()
    layer.addLayers(
      photos
        .filter((p) => p.lat != null)
        .map((p) =>
          L.marker([p.lat, p.lng], { icon: photoIcon(p.thumbUrl), thumbUrl: p.thumbUrl }).on('click', () =>
            handlers.current.onSelectPhoto(p),
          ),
        ),
    )
  }, [photos])

  // Ma position : point bleu + cercle de précision
  useEffect(() => {
    const layer = positionLayerRef.current
    layer.clearLayers()
    if (!myPosition) return
    const { lat, lng, accuracy } = myPosition
    L.circle([lat, lng], { radius: accuracy, className: 'precision', interactive: false }).addTo(layer)
    L.marker([lat, lng], { icon: positionIcon, interactive: false, zIndexOffset: -100 }).addTo(layer)
  }, [myPosition])

  // Centrage demandé par l'application, décalé pour rester visible à côté du panneau
  useEffect(() => {
    if (!focus) return
    const map = mapRef.current
    const zoom = focus.zoom ?? Math.max(map.getZoom(), 10)
    const desktop = window.innerWidth >= 768
    const offset = focus.offset === false ? [0, 0] : desktop ? [210, 0] : [0, window.innerHeight * 0.25]
    const point = map.project([focus.lat, focus.lng], zoom).add(offset)
    map.flyTo(map.unproject(point, zoom), zoom, { duration: 0.8 })
  }, [focus])

  return <div ref={containerRef} className="absolute inset-0" />
}
