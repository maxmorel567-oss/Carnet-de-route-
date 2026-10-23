# Carnet de Route

Carnet de voyage personnel : une carte plein écran, une épingle par voyage, avec titre, dates, journal de bord et photos.

- **Carte :** Leaflet + fond OpenStreetMap. Vue de loin, les voyages proches sont regroupés (pastille avec le nombre). En zoomant, chaque voyage reprend sa position exacte et les photos apparaissent en vignettes là où elles ont été prises.
- **Photos :** compressées automatiquement (1600 px, JPEG). La position GPS est lue dans la photo. Sinon, bouton « Placer sur la carte ».
- **Ajout :** bouton « + », puis « Cliquer sur la carte » ou « Rechercher une adresse ».
- **Catalogue :** bouton en haut à gauche, liste filtrable, export/import JSON.
- **App installable (PWA)**, consultation hors-ligne, mode sombre automatique.

**Aucune clé d'API nécessaire.** Les tuiles OpenStreetMap et Nominatim (recherche d'adresse, OpenStreetMap) sont gratuits sans inscription pour un usage personnel.

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

## 4. Étape 2 : synchronisation avec Supabase

Tout le code passe par `src/data/store.js`. Pour synchroniser PC et téléphone, il suffit d'écrire `src/data/supabase.js` avec les mêmes fonctions que `src/data/indexeddb.js`, puis de changer une ligne dans `store.js`.

1. Crée un compte sur https://supabase.com (offre gratuite : base de données de 500 Mo et 1 Go de fichiers).
2. *New project*. Dans *Project Settings → API*, note l'**URL** et la clé **anon public**. La clé `anon` est faite pour être dans le navigateur : la sécurité vient des règles RLS ci-dessous.
3. *Authentication → Providers* : active **Email** (connexion par lien magique), puis désactive les inscriptions publiques une fois ton compte créé.
4. *Storage* : crée un bucket **privé** nommé `photos`.
5. *SQL Editor*, exécute :

```sql
create table trips (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users,
  title text, start_date text, end_date text, notes text,
  place jsonb not null,
  created_at bigint, updated_at bigint
);
create table photos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users,
  trip_id text not null references trips on delete cascade,
  lat double precision, lng double precision, gps_source text,
  taken_at bigint, created_at bigint
);
alter table trips enable row level security;
alter table photos enable row level security;
create policy "mes voyages" on trips for all using (user_id = auth.uid());
create policy "mes photos" on photos for all using (user_id = auth.uid());
create policy "mes fichiers" on storage.objects for all
  using (bucket_id = 'photos' and owner = auth.uid());
```

6. `npm install @supabase/supabase-js`, et crée un fichier `.env.local` (jamais commité) :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

7. Dans `supabase.js`, chaque fonction lit ou écrit les tables, et les images vont dans le bucket (`photos/{id}.jpg` et `photos/{id}-thumb.jpg`). Ajoute un écran de connexion par email.
8. Ajoute les deux variables dans Vercel (*Settings → Environment Variables*), exporte tes données locales, puis importe-les une fois connecté.

> Cette étape peut être faite ensemble plus tard : la structure est prête.

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
    │   └── indexeddb.js    # stockage local (à remplacer par Supabase)
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

## Limites connues

- Photos HEIC sur ordinateur (Chrome, Firefox) : non lues. Sur iPhone, Safari les convertit en JPEG automatiquement.
- La recherche d'adresse et les nouvelles zones de carte demandent du réseau. Les zones déjà vues restent consultables hors-ligne.
