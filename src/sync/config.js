// Configuration Firebase du projet (console Firebase → Paramètres du projet → Vos applications → Web).
// Ces valeurs sont publiques par nature : la sécurité vient des règles (firestore.rules).
// Tant qu'elle vaut null, l'app reste 100 % locale et le bouton de connexion n'apparaît pas.
export const FIREBASE_CONFIG = null

// Tests uniquement : configuration et émulateurs fournis à la construction (jamais en production).
const testConfig = import.meta.env.VITE_FIREBASE_TEST_CONFIG

export const firebaseConfig = testConfig ? JSON.parse(testConfig) : FIREBASE_CONFIG
export const useEmulators = Boolean(testConfig)
export const syncAvailable = Boolean(firebaseConfig)
