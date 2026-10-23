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
  import('@maplibre/maplibre-gl-leaflet')
    .then(async () => {
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

const pinIcon = (active) =>
  L.divIcon({
    className: '',
    html: `<div class="epingle${active ? ' active' : ''}"><svg viewBox="0 0 32 40" width="32" height="40">
      <path d="M16 1C8 1 1.5 7.3 1.5 15.2 1.5 26 16 39 16 39s14.5-13 14.5-23.8C30.5 7.3 24 1 16 1z"
        style="fill:var(--bleu);stroke:var(--surface)" stroke-width="2"/>
      <circle cx="16" cy="15" r="5.5" style="fill:var(--surface)"/></svg></div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 39],
  })

const clusterIcon = (cluster) => {
  const n = cluster.getChildCount()
  const size = n < 10 ? 40 : n < 100 ? 48 : 56
  return L.divIcon({
    className: '',
    html: `<div class="groupe" style="width:${size}px;height:${size}px;font-size:${n < 100 ? 16 : 14}px">${n}</div>`,
    iconSize: [size, size],
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
