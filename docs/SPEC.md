# Carnet de Route — spécification (validée le 22/10/2026)

## But
Carnet de voyage strictement personnel, utilisable sur PC et téléphone : retrouver chaque voyage sur une carte, avec son journal et ses photos.

## Données
- **Voyage** : id, titre, lieu {nom, lat, lng}, date de début, date de fin (optionnelle), notes, createdAt, updatedAt. Numéro N° 001… selon l'ordre de création.
- **Photo** : id, tripId, image compressée (≤ 1600 px, JPEG 0,82), miniature (320 px), lat/lng, gpsSource (`exif` | `manuel` | null), takenAt.

## Carte
- Plein écran, Leaflet + MapLibre : style Positron d'OpenFreeMap recoloré aux tokens « Établi » (clair / graphite), noms en français, sans panneaux routiers. Secours : tuiles OpenStreetMap filtrées en CSS (pas de WebGL ou service injoignable).
- Voyages regroupés de loin (pastille bleue avec le nombre). Un clic sur la pastille zoome, et les voyages au même endroit s'éventaillent au zoom maximal.
- À partir du zoom 10 : vignettes des photos géolocalisées, elles aussi regroupées (vignette + nombre).
- Clic sur une épingle : ouvre la fiche. Clic sur une vignette : ouvre la photo. Clic dans le vide : ferme la fiche.

## Écrans
- **Fiche voyage** : panneau droit (≥ 768 px) ou tiroir bas (mobile). Plaque jaune (N°, dates, nombre de photos), titre, lieu, dates, journal, galerie. Enregistrement automatique (500 ms).
- **Visionneuse** : plein écran, flèches et clavier, date de prise de vue, origine de la position, « Placer sur la carte » / « Déplacer », suppression.
- **Bouton +** : « Nouveau voyage ici » (géolocalisation haute précision, point bleu + cercle de précision ; voyage `place.precise` : les photos sans GPS y sont placées, `gpsSource: 'position'`), « Cliquer sur la carte » (bandeau + nom du lieu par géocodage inverse) ou « Rechercher une adresse » (Nominatim, à la validation).
- **Catalogue** : tiroir gauche, voyages triés par date décroissante, filtre texte, export et import JSON.

## Stockage
- Étape 1 : IndexedDB via `src/data/store.js` (interface unique). Export/import JSON avec images en data URL. `navigator.storage.persist()` demandé.
- Étape 2 : Supabase (Postgres + Storage + RLS + auth email), même interface (voir README).

## Transverse
- PWA : installable, app en cache, tuiles vues mises en cache (30 jours, 2000 tuiles).
- Charte « Établi » mode Site : Space Mono / Space Grotesk, tokens clair / graphite chaud, un seul élément jaune par écran (la plaque).
- Hébergement : local (`npm run dev`), Vercel ou Netlify.

## Hors périmètre (v1)
Synchronisation Supabase, partage, multi-utilisateur, itinéraires entre étapes.
