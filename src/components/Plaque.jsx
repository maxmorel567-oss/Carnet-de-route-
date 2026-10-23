import { formatDates, padNumber } from '../lib/format.js'

// Plaque signalétique : le seul élément jaune de l'écran.
export default function Plaque({ number, startDate, endDate, photoCount }) {
  return (
    <div className="pose-plaque rounded-[8px] border-[1.5px] border-sur-jaune bg-jaune text-sur-jaune">
      <div className="etiquette border-b-[1.5px] border-sur-jaune px-4 py-2">Réf. voyage N° {padNumber(number)}</div>
      <div className="flex items-baseline justify-between gap-3 px-4 py-3 font-mono text-sm font-bold">
        <span>{formatDates(startDate, endDate)}</span>
        <span className="shrink-0">{photoCount}&nbsp;photo{photoCount > 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
