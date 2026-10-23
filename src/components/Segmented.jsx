// Choix unique parmi quelques options (re-toucher l'option active la désélectionne si allowNone)
export default function Segmented({ label, options, value, onChange, allowNone = true }) {
  return (
    <div role="radiogroup" aria-label={label} className="mt-1 flex flex-wrap gap-2">
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(value === id && allowNone ? null : id)}
          className={`puce ${value === id ? 'puce-active' : ''}`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
