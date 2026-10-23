// crypto.randomUUID n'existe qu'en HTTPS ou localhost : repli pour un test via l'IP locale.
export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
