// Carte vectorielle OpenFreeMap (gratuite, sans clé) redessinée aux couleurs « Établi ».
// On part du style Positron et on remplace ses couleurs, couche par couche.
const SOURCE_STYLE = 'https://tiles.openfreemap.org/styles/positron'

export const ATTRIBUTION =
  '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const PALETTES = {
  light: {
    fond: '#F7F3EC',
    bois: '#EFE8DC',
    bati: '#E6DDCE',
    parc: '#E4E3CF',
    eau: '#C9D6E6',
    route: '#FFFFFF',
    trait: '#DDD3C2',
    frontiere: '#B5AA98',
    texte: '#4A443B',
    titre: '#1E1E1E',
    bleu: '#2459A8',
  },
  dark: {
    fond: '#1C1A17',
    bois: '#211F1B',
    bati: '#2B2824',
    parc: '#22241D',
    eau: '#1D2531',
    route: '#3D3833',
    trait: '#2E2A26',
    frontiere: '#5A534A',
    texte: '#C9C1B4',
    titre: '#F3EEE6',
    bleu: '#6B9BE6',
  },
}

// Première règle qui correspond à l'id de la couche = couleurs appliquées.
const rules = (c) => [
  [/^background$/, { 'background-color': c.fond }],
  [/^water$/, { 'fill-color': c.eau }],
  [/^waterway$/, { 'line-color': c.eau }],
  [/^(park|landcover_wood)$/, { 'fill-color': c.parc }],
  [/^landcover_(ice_shelf|glacier)$/, { 'fill-color': c.fond }],
  [/^landuse_residential$/, { 'fill-color': c.bois }],
  [/^building$/, { 'fill-color': c.bati, 'fill-outline-color': c.trait }],
  [/^(aeroway-area|road_area_pier)$/, { 'fill-color': c.bois }],
  [/dashline$/, { 'line-color': c.fond }],
  [/^railway/, { 'line-color': c.trait }],
  [/casing$|subtle$/, { 'line-color': c.trait }],
  [/inner$|^highway_(path|minor)$|^road_pier$|^aeroway-(taxiway|runway)$/, { 'line-color': c.route }],
  [/^boundary/, { 'line-color': c.frontiere }],
]

// Panneaux de route et pictos noirs : du bruit pour un carnet de voyage.
const REMOVED = /shield/
const NAME_FR = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']]

let sourcePromise

export async function buildStyle(dark) {
  sourcePromise ??= fetch(SOURCE_STYLE).then((r) => {
    if (!r.ok) throw new Error('Style de carte indisponible')
    return r.json()
  })
  const source = structuredClone(await sourcePromise)
  const c = PALETTES[dark ? 'dark' : 'light']
  const colorRules = rules(c)

  source.layers = source.layers
    .filter((layer) => !REMOVED.test(layer.id))
    .map((layer) => {
      const paint = { ...layer.paint }
      const layout = { ...layer.layout }

      if (layer.type === 'symbol') {
        if (layout['text-field']) layout['text-field'] = NAME_FR
        if (/^label_(city|town|village)/.test(layer.id)) {
          delete layout['icon-image']
          layout['text-anchor'] = 'center'
          delete layout['text-offset']
        }
        paint['text-color'] = /^water/.test(layer.id) ? c.bleu : /country|capital/.test(layer.id) ? c.titre : c.texte
        paint['text-halo-color'] = c.fond
        paint['text-halo-width'] = 1.2
        paint['text-halo-blur'] = 0
      } else {
        const match = colorRules.find(([pattern]) => pattern.test(layer.id))
        if (match) Object.assign(paint, match[1])
      }
      return { ...layer, paint, layout }
    })
  return source
}

export function webglSupported() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}
