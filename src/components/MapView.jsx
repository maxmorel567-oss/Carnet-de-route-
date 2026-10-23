import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import L from '../lib/leaflet.js'
import { ATTRIBUTION, buildStyle, webglSupported } from '../lib/mapStyle.js'
import { isDark, onThemeChange } from '../lib/theme.js'

// Secours si la carte vectorielle ne peut pas s'afficher (pas de WebGL, service injoignable)
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

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
  let stopListening = () => {}
  const onTheme = async (dark) => {
    try {
      layer?.getMaplibreMap().setStyle(await buildStyle(dark))
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
      const style = await buildStyle(isDark())
      if (cancelled) return
      layer = L.maplibreGL({ style, attributionControl: false }).addTo(map)
      map.attributionControl.addAttribution(ATTRIBUTION)
      stopListening = onThemeChange(onTheme)
    })
    .catch(() => !cancelled && fallback())

  return () => {
    cancelled = true
    stopListening()
  }
}

// Zoom à partir duquel les photos apparaissent en vignettes.
const PHOTO_ZOOM = 10

// Punaise rouge inclinée, pointe en bas à gauche (= position exacte du voyage).
// Teintes de la tête : rouge = voyage fait, bleu = lieu à visiter (liste de souhaits)
const PIN_COLORS = {
  rouge: { side: ['#8E0B0B', '#E21B1B', '#FF4A3D', '#A80E0E'], top: ['#FF5B4E', '#D01414'] },
  bleu: { side: ['#122F5E', '#2459A8', '#5C8FDA', '#1B4583'], top: ['#6B9BE6', '#2459A8'] },
}

let pinCount = 0
function pushpinSvg(width, color = 'rouge') {
  const id = `punaise${pinCount++}`
  const height = Math.round(width * 1.2)
  const { side, top } = PIN_COLORS[color]
  return `<svg viewBox="0 0 40 48" width="${width}" height="${height}" aria-hidden="true">
    <defs>
      <linearGradient id="${id}c" x1="0" x2="1">
        <stop offset="0" stop-color="${side[0]}"/><stop offset=".45" stop-color="${side[1]}"/>
        <stop offset=".7" stop-color="${side[2]}"/><stop offset="1" stop-color="${side[3]}"/>
      </linearGradient>
      <radialGradient id="${id}t" cx=".35" cy=".35" r=".8">
        <stop offset="0" stop-color="${top[0]}"/><stop offset="1" stop-color="${top[1]}"/>
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

const pinIcon = (active, color = 'rouge', width = 34) =>
  L.divIcon({
    className: '',
    html: `<div class="epingle${active ? ' active' : ''}">${pushpinSvg(width, color)}</div>`,
    iconSize: [width, Math.round(width * 1.2)],
    iconAnchor: [Math.round(width * 0.15), Math.round(width * 1.15)],
  })

// Idée de voyage : petit drapeau bleu planté (pied du mât = position)
let flagCount = 0
const flagIcon = (active) => {
  const id = `drapeau${flagCount++}`
  return L.divIcon({
    className: '',
    html: `<div class="epingle${active ? ' active' : ''}"><svg viewBox="0 0 34 48" width="30" height="42" aria-hidden="true">
      <defs>
        <linearGradient id="${id}m" x1="0" x2="1"><stop offset="0" stop-color="#8A8F96"/><stop offset=".5" stop-color="#F2F4F6"/><stop offset="1" stop-color="#9BA0A6"/></linearGradient>
        <linearGradient id="${id}t" x1="0" x2="1"><stop offset="0" stop-color="#1B4583"/><stop offset=".55" stop-color="#2F68BD"/><stop offset="1" stop-color="#2459A8"/></linearGradient>
      </defs>
      <ellipse cx="6" cy="46" rx="5" ry="1.4" fill="#000" opacity=".2"/>
      <rect x="4.6" y="5" width="2.8" height="41" rx="1.4" fill="url(#${id}m)"/>
      <circle cx="6" cy="4.5" r="2.6" fill="#F2F4F6" stroke="#8A8F96" stroke-width=".8"/>
      <path d="M7.4 7c7-3.2 12.4 3 20.6-.8 1.2-.5 2 .2 2 1.2v13.2c0 .8-.4 1.3-1.1 1.6-8.2 3.6-13.6-2.6-21.5.8z" fill="url(#${id}t)" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round"/>
    </svg></div>`,
    iconSize: [30, 42],
    iconAnchor: [5, 41],
  })
}

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

const stopIcon = (n) => L.divIcon({ className: '', html: `<div class="etape-num">${n}</div>`, iconSize: [24, 24] })

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
export default function MapView({ trips, wishes = [], photos, selectedId, myPosition, route, visited, onSelectTrip, onSelectPhoto, onMapClick, focus }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const clusterRef = useRef(null)
  const photoLayerRef = useRef(null)
  const positionLayerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const countriesRef = useRef(null)
  const wishLayerRef = useRef(null)
  const handlers = useRef({})
  handlers.current = { onSelectTrip, onSelectPhoto, onMapClick }

  // Création de la carte (une seule fois)
  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: false, worldCopyJump: true, minZoom: 2, maxZoom: 19 }).setView([30, 10], 3)
    L.control.zoom({ position: 'topright' }).addTo(map)
    map.attributionControl.setPrefix(false)
    const removeBase = addBaseLayer(map)
    positionLayerRef.current = L.layerGroup().addTo(map)
    routeLayerRef.current = L.layerGroup().addTo(map)
    wishLayerRef.current = L.layerGroup().addTo(map)
    // Pays visités : teinte légère au-dessus du fond de carte, sous les trajets et les punaises
    map.createPane('pays').style.zIndex = 250
    countriesRef.current = L.layerGroup().addTo(map)

    clusterRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: clusterIcon,
    }).addTo(map)

    // Les photos passent sous les punaises (calque dédié sous celui des marqueurs)
    map.createPane('photos').style.zIndex = 590
    photoLayerRef.current = L.markerClusterGroup({
      clusterPane: 'photos',
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
    // De près, la teinte des pays visités s'efface pour ne pas griser tout l'écran
    const fadeCountries = () => containerRef.current?.classList.toggle('zoom-proche', map.getZoom() >= 6)
    map.on('zoomend', fadeCountries)
    fadeCountries()
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

  // Idées de voyage : drapeaux bleus, non regroupés
  useEffect(() => {
    const layer = wishLayerRef.current
    layer.clearLayers()
    wishes.forEach((w) =>
      L.marker([w.place.lat, w.place.lng], { icon: flagIcon(w.id === selectedId), title: w.title })
        .on('click', () => handlers.current.onSelectTrip(w.id))
        .addTo(layer),
    )
  }, [wishes, selectedId])

  // Vignettes photo (seulement celles qui ont une position)
  useEffect(() => {
    const layer = photoLayerRef.current
    layer.clearLayers()
    layer.addLayers(
      photos
        .filter((p) => p.lat != null)
        .map((p) =>
          L.marker([p.lat, p.lng], { icon: photoIcon(p.thumbUrl), thumbUrl: p.thumbUrl, pane: 'photos' }).on('click', () =>
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

  // Pays visités (contours chargés seulement s'il y en a)
  const visitedKey = visited.join(',')
  useEffect(() => {
    const layer = countriesRef.current
    if (!visitedKey) {
      layer.clearLayers()
      return
    }
    let cancelled = false
    import('../data/pays.json').then(({ default: pays }) => {
      if (cancelled) return
      const codes = new Set(visitedKey.split(','))
      layer.clearLayers()
      L.geoJSON(
        { ...pays, features: pays.features.filter((f) => codes.has(f.properties.code)) },
        { pane: 'pays', interactive: false, className: 'pays-visite' },
      ).addTo(layer)
    })
    return () => {
      cancelled = true
    }
  }, [visitedKey])

  // Trajet du voyage ouvert : ligne pointillée + étapes numérotées (la n°1 est la punaise)
  useEffect(() => {
    const layer = routeLayerRef.current
    layer.clearLayers()
    if (!route) return
    const points = route.map((s) => [s.lat, s.lng])
    L.polyline(points, { className: 'trajet', interactive: false }).addTo(layer)
    points.slice(1).forEach((p, i) => L.marker(p, { icon: stopIcon(i + 2), interactive: false, zIndexOffset: -50 }).addTo(layer))
  }, [route])

  // Centrage demandé par l'application, décalé pour rester visible à côté du panneau
  useEffect(() => {
    if (!focus) return
    const map = mapRef.current
    const desktop = window.innerWidth >= 768
    if (focus.bounds) {
      map.flyToBounds(focus.bounds, {
        paddingTopLeft: [40, 80],
        paddingBottomRight: desktop ? [470, 40] : [40, window.innerHeight * 0.6],
        maxZoom: 12,
        duration: 0.8,
      })
      return
    }
    const zoom = focus.zoom ?? Math.max(map.getZoom(), 10)
    const offset = focus.offset === false ? [0, 0] : desktop ? [210, 0] : [0, window.innerHeight * 0.25]
    const point = map.project([focus.lat, focus.lng], zoom).add(offset)
    map.flyTo(map.unproject(point, zoom), zoom, { duration: 0.8 })
  }, [focus])

  return <div ref={containerRef} className="absolute inset-0" />
}
