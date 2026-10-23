const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

const parse = (iso) => new Date(`${iso}T00:00:00`)

export function formatDates(start, end) {
  if (!start) return 'Sans date'
  if (!end || end === start) return fmt.format(parse(start))
  return `${fmt.format(parse(start))} – ${fmt.format(parse(end))}`
}

// Date du jour au fuseau local (toISOString seul donnerait la date UTC)
export function todayIso() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const padNumber = (n) => String(n).padStart(3, '0')
