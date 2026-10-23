// Image souvenir au format story (1080 × 1920), dessinée aux couleurs « Établi » (thème clair).
import { formatDates, padNumber } from './format.js'
import { routeKm, tripStops } from './geo.js'

const W = 1080
const H = 1920
const M = 72 // marge
const C = {
  fond: '#F7F3EC',
  trait: '#DDD3C2',
  encre: '#1E1E1E',
  douce: '#4A443B',
  muette: '#6B6459',
  bleu: '#2459A8',
  jaune: '#F2C230',
  vide: '#D9D0C1',
}
const MONO = '"Space Mono", ui-monospace, monospace'
const SANS = '"Space Grotesk", system-ui, sans-serif'
const fmtKm = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// Photo recadrée pour remplir le cadre (comme object-fit: cover)
function drawCover(ctx, img, x, y, w, h, r) {
  const scale = Math.max(w / img.width, h / img.height)
  const sw = w / scale
  const sh = h / scale
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
  ctx.restore()
}

// Coupe un texte en lignes (au plus maxLines, avec « … » si besoin)
function lines(ctx, text, width, maxLines) {
  const words = text.split(/\s+/)
  const out = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width <= width || !line) line = test
    else {
      out.push(line)
      line = word
    }
  }
  if (line) out.push(line)
  if (out.length > maxLines) {
    out.length = maxLines
    out[maxLines - 1] = `${out[maxLines - 1].replace(/\s*\S*$/, '')}…`
  }
  return out
}

// Croquis du trajet : étapes reliées en pointillés, dans un cadre
function drawRoute(ctx, stops, x, y, w, h) {
  const lats = stops.map((s) => s.lat)
  const lngs = stops.map((s) => s.lng * Math.cos((((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI) / 180))
  const minX = Math.min(...lngs)
  const maxX = Math.max(...lngs)
  const minY = Math.min(...lats)
  const maxY = Math.max(...lats)
  const scale = Math.min((w - 120) / (maxX - minX || 1), (h - 120) / (maxY - minY || 1))
  const pts = stops.map((s, i) => [
    x + w / 2 + (lngs[i] - (minX + maxX) / 2) * scale,
    y + h / 2 - (s.lat - (minY + maxY) / 2) * scale,
  ])
  ctx.strokeStyle = C.bleu
  ctx.lineWidth = 6
  ctx.setLineDash([16, 18])
  ctx.lineCap = 'round'
  ctx.beginPath()
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
  ctx.stroke()
  ctx.setLineDash([])
  pts.forEach(([px, py], i) => {
    ctx.fillStyle = C.bleu
    ctx.beginPath()
    ctx.arc(px, py, 26, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = '#FFFFFF'
    ctx.stroke()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `700 26px ${MONO}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), px, py + 1)
  })
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

export async function buildSouvenir({ trip, number, photos }) {
  await Promise.all(
    [`700 76px ${MONO}`, `400 28px ${MONO}`, `400 40px ${SANS}`, `500 40px ${SANS}`].map((f) => document.fonts.load(f).catch(() => {})),
  )
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fond + grille de plan discrète
  ctx.fillStyle = C.fond
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = C.trait
  ctx.lineWidth = 1.5
  for (let i = 0; i <= W; i += 54) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, H)
    ctx.stroke()
  }
  for (let j = 0; j <= H; j += 54) {
    ctx.beginPath()
    ctx.moveTo(0, j)
    ctx.lineTo(W, j)
    ctx.stroke()
  }

  // Photos : couverture en grand, jusqu'à 3 autres en dessous
  const cover = photos.find((p) => p.id === trip.coverId) ?? photos[0]
  const others = photos.filter((p) => p !== cover).slice(0, 3)
  const coverH = others.length ? 700 : 900
  let y = M
  if (cover) {
    drawCover(ctx, await loadImage(cover.url), M, y, W - 2 * M, coverH, 16)
    y += coverH + 18
    if (others.length) {
      const size = (W - 2 * M - 18 * (others.length - 1)) / others.length
      const imgs = await Promise.all(others.map((p) => loadImage(p.thumbUrl)))
      imgs.forEach((img, i) => drawCover(ctx, img, M + i * (size + 18), y, size, 220, 12))
      y += 220 + 18
    }
  } else {
    ctx.fillStyle = C.vide
    roundRect(ctx, M, y, W - 2 * M, 600, 16)
    ctx.fill()
    y += 600 + 18
  }

  // Plaque signalétique
  y += 36
  const stops = tripStops(trip)
  const plaqueH = 170
  ctx.fillStyle = C.jaune
  roundRect(ctx, M, y, W - 2 * M, plaqueH, 16)
  ctx.fill()
  ctx.strokeStyle = C.encre
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(M, y + 64)
  ctx.lineTo(W - M, y + 64)
  ctx.stroke()
  ctx.fillStyle = C.encre
  ctx.font = `400 28px ${MONO}`
  ctx.letterSpacing = '3px' // étiquette espacée (ignoré par les navigateurs plus anciens)
  ctx.fillText(`RÉF. VOYAGE N° ${padNumber(number ?? 0)}`, M + 32, y + 43)
  ctx.letterSpacing = '0px'
  ctx.font = `700 38px ${MONO}`
  ctx.fillText(formatDates(trip.startDate, trip.endDate), M + 32, y + 128)
  const right = stops.length > 1 ? `${fmtKm.format(routeKm(stops))} km` : `${photos.length} photo${photos.length > 1 ? 's' : ''}`
  ctx.textAlign = 'right'
  ctx.fillText(right, W - M - 32, y + 128)
  ctx.textAlign = 'left'
  y += plaqueH + 90

  // Titre (2 lignes max) + étapes
  ctx.fillStyle = C.encre
  ctx.font = `700 76px ${MONO}`
  for (const l of lines(ctx, trip.title || trip.place.name, W - 2 * M, 2)) {
    ctx.fillText(l, M, y)
    y += 88
  }
  ctx.fillStyle = C.douce
  ctx.font = `400 40px ${SANS}`
  for (const l of lines(ctx, stops.map((s) => s.name).join(' → '), W - 2 * M, 2)) {
    ctx.fillText(l, M, y)
    y += 54
  }

  // Croquis du trajet dans l'espace restant
  const bottom = H - M - 70
  if (stops.length > 1 && bottom - y > 220) drawRoute(ctx, stops, M, y + 10, W - 2 * M, bottom - y - 20)

  // Pied : marque + note
  ctx.fillStyle = C.bleu
  ctx.font = `400 28px ${MONO}`
  ctx.letterSpacing = '3px'
  ctx.fillText('CARNET DE ROUTE', M, H - M)
  ctx.letterSpacing = '0px'
  if (trip.rating) {
    ctx.textAlign = 'right'
    ctx.fillStyle = C.encre
    ctx.font = `700 34px ${MONO}`
    ctx.fillText(`${'★'.repeat(trip.rating)}${'☆'.repeat(5 - trip.rating)}`, W - M, H - M)
    ctx.textAlign = 'left'
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
