# Carnet de Route

Carnet de voyage personnel : une carte plein écran, une épingle par voyage, avec titre, dates, journal de bord et photos.

- **Carte :** Leaflet + carte vectorielle OpenFreeMap redessinée aux couleurs « Établi » (tuiles OpenStreetMap en secours). Vue de loin, les voyages proches sont regroupés (pastille avec le nombre). En zoomant, chaque voyage reprend sa position exacte et les photos apparaissent en vignettes là où elles ont été prises.
- **Photos :** compressées automatiquement (1600 px, JPEG). La position GPS est lue dans la photo. Sinon, bouton « Placer sur la carte ».
- **Ajout :** bouton « + », puis « Nouveau voyage ici » (position GPS du téléphone), « Cliquer sur la carte » ou « Rechercher une adresse ». Dans un voyage créé à ta position, les photos sans GPS (fréquent sur iPhone) sont placées à cet endroit.
- **Catalogue :** bouton en haut à gauche, liste filtrable, export/import JSON.
- **App installable (PWA)**, consultation hors-ligne, mode sombre automatique.

**Aucune clé d'API nécessaire.** OpenFreeMap (carte), OpenStreetMap et Nominatim (recherche d'adresse, OpenStreetMap) sont gratuits sans inscription pour un usage personnel.

## 1. Lancer en local

Prérequis : [Node.js](https://nodejs.org) 20 ou plus (version LTS).

```bash
cd carnet-de-route
npm install
npm run dev
```

Ouvre http://localhost:5173.

**Tester sur ton téléphone (même Wi-Fi) :** `npm run dev -- --host`, puis ouvre l'adresse `http://192.168.x.x:5173` affichée. Attention : chaque adresse a ses propres données (voir §4).

## 2. Mettre en ligne (gratuit)

L'app est déjà configurée pour les deux hébergeurs (`vercel.json`, `netlify.toml`).

**Vercel (recommandé)**
1. Pousse le dossier sur GitHub.
2. Va sur https://vercel.com, connecte-toi avec GitHub, puis *Add New → Project* et choisis le dépôt.
3. Clique sur *Deploy*. Tu obtiens une adresse `https://carnet-de-route-xxx.vercel.app`. Chaque push la met à jour.

**Netlify :** même principe sur https://app.netlify.com (*Add new site → Import from Git*).

**Netlify Drop (sans Git, le plus rapide)**
1. `npm run build` (ou utilise le zip `carnet-de-route-en-ligne.zip` déjà prêt).
2. Va sur https://app.netlify.com/drop et dépose le dossier `dist` ou le zip.
3. Crée un compte gratuit pour garder le site (sinon il est supprimé après 1 h).

**GitHub Pages**
1. Pousse le projet dans un dépôt public : le workflow `.github/workflows/pages.yml` construit et publie l'app sur la branche `gh-pages` à chaque push.
2. *Settings → Pages → Source : Deploy from a branch*, branche `gh-pages`, dossier `/`.
3. Adresse : `https://maxmorel567-oss.github.io/Carnet-de-route-/`.

**Installer sur le téléphone :** ouvre l'adresse https, puis :
- iPhone (Safari) : *Partager → Sur l'écran d'accueil*.
- Android (Chrome) : *⋮ → Installer l'application*.

## 3. Où sont mes données ?

Pour l'instant, **dans le navigateur de chaque appareil** (IndexedDB). Rien n'est envoyé sur Internet.

- Le PC et le téléphone ont chacun leurs propres données.
- Pour transférer, ou simplement sauvegarder : *Menu → Exporter* crée un fichier `.json` avec toutes les photos. *Importer* le recharge ailleurs. L'import fusionne : un voyage déjà présent est mis à jour, les autres sont ajoutés.
- **Fais un export de temps en temps.** Vider les données du site dans le navigateur efface le carnet.

## 4. Synchro et partage (Firebase, gratuit)

Le code est prêt (`src/sync/`) : il s'active dès que la configuration Firebase est renseignée. Sans elle, l'app reste 100 % locale.

**Ce que ça apporte :** connexion avec Google, mêmes voyages sur le téléphone et le PC (hors-ligne compris), partage d'un voyage avec l'adresse Gmail d'un proche (il voit le voyage, ajoute ses photos et son journal ; seul le propriétaire gère le partage et peut supprimer).

**Mise en place (≈ 5 min, sur https://console.firebase.google.com) :**
1. « Créer un projet » → nom `carnet-de-route` → Google Analytics désactivé → Créer.
2. Créer → **Authentication** → Commencer → **Google** → Activer → email d'assistance → Enregistrer.
3. Authentication → **Paramètres** → Domaines autorisés → ajouter `maxmorel567-oss.github.io`.
4. Créer → **Firestore Database** → Créer une base → emplacement Europe (`europe-west9`, Paris) → mode production.
5. Firestore → onglet **Règles** → remplacer tout par le contenu de [`firestore.rules`](firestore.rules) → **Publier**.
6. Paramètres du projet → Vos applications → **`</>`** (Web) → nom « Carnet » → copier le bloc `firebaseConfig`.
7. Coller ce bloc dans `src/sync/config.js` à la place de `null` (`export const FIREBASE_CONFIG = { … }`), puis pousser sur `main` : la publication se fait toute seule.

Offre gratuite Spark, sans carte bancaire : 1 Go de base de données. Les photos y sont stockées compressées (≈ 2 500 photos), car Cloud Storage demande désormais le forfait payant.

**Tests :** la synchro, le partage et les règles de sécurité ont été vérifiés avec les émulateurs Firebase (`firebase emulators:start --only auth,firestore`) en construisant l'app avec `VITE_FIREBASE_TEST_CONFIG` (jamais utilisé en production).

## Structure

```
carnet-de-route/
├── index.html
├── vite.config.js          # React, Tailwind, PWA (cache des tuiles hors-ligne)
├── vercel.json / netlify.toml
├── public/                 # icônes de l'app
├── docs/SPEC.md            # spécification validée
└── src/
    ├── main.jsx
    ├── App.jsx             # état global : voyage ouvert, modes, fenêtres
    ├── index.css           # charte « Établi » (couleurs, polices, carte)
    ├── data/
    │   ├── store.js        # point d'entrée unique des données + export/import
    │   └── indexeddb.js    # stockage local (source de l'écran, hors-ligne)
    ├── sync/               # connexion Google, synchro Firestore, partage (inactif sans config)
    ├── hooks/useCarnet.js  # voyages, photos, actions
    ├── lib/
    │   ├── image.js        # compression + lecture GPS (EXIF)
    │   ├── geocode.js      # recherche d'adresse (Nominatim)
    │   ├── format.js       # dates, numéros
    │   ├── id.js
    │   └── leaflet.js
    └── components/
        ├── MapView.jsx     # carte, regroupement, vignettes photo
        ├── TripPanel.jsx   # fiche voyage (panneau / tiroir mobile)
        ├── Plaque.jsx      # plaque jaune N° / dates / photos
        ├── PhotoGrid.jsx
        ├── Lightbox.jsx    # visionneuse, placement manuel
        ├── AddButton.jsx   # bouton « + »
        ├── SearchDialog.jsx
        ├── Catalog.jsx     # menu catalogue + export/import
        └── Icon.jsx
```

## Données tierces

- Contours des pays : Natural Earth 1:110m (domaine public), via `world-atlas`, simplifiés dans `src/data/pays.json`. Les très petits pays (Andorre, Monaco, Malte…) n'y figurent pas : ils sont comptés mais pas coloriés.

## Limites connues

- Photos HEIC sur ordinateur (Chrome, Firefox) : non lues. Sur iPhone, Safari les convertit en JPEG automatiquement.
- La recherche d'adresse et les nouvelles zones de carte demandent du réseau. Les zones déjà vues restent consultables hors-ligne.
