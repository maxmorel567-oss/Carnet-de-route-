// Position actuelle du téléphone (HTTPS obligatoire, l'utilisateur doit l'autoriser).
const ERRORS = {
  1: 'Localisation refusée : autorise-la pour ce site dans les réglages du téléphone.',
  2: 'Position introuvable pour le moment. Réessaie à découvert.',
  3: 'La localisation a pris trop de temps. Réessaie.',
}

export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Ce navigateur ne donne pas accès à la position."))
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      (err) => reject(new Error(ERRORS[err.code] ?? 'Position indisponible.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  })
}
