// Pendant la sélection, cette barre prend la place de la navigation (même position :
// en bas sur téléphone, à gauche dès 600 px). Deux barres superposées mangeraient
// l'écran, et changer de section en pleine sélection n'a pas de sens.
const ICONES = {
  modifier: <path d="M4 20h4L18 10l-4-4L4 16v4zM13 7l4 4" />,
  acheter: <path d="M5 12l5 5 9-10" />,
  supprimer: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
}

function Action({ icone, libelle, nombre, onClick, danger }) {
  return (
    <button type="button" className={`nav__item${danger ? ' nav__item--danger' : ''}`} disabled={nombre === 0} onClick={onClick}>
      <span className="nav__icone" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {ICONES[icone]}
        </svg>
      </span>
      <span className="nav__libelle">
        {libelle}
        <span className="nav__nombre"> {nombre}</span>
      </span>
    </button>
  )
}

export default function BarreActionsMasse({ nombre, statut, onModifier, onSupprimer }) {
  return (
    <div className="nav" role="toolbar" aria-label="Actions sur la sélection">
      {statut === 'souhaité'
        ? <Action icone="acheter" libelle="Acheté" nombre={nombre} onClick={onModifier} />
        : <Action icone="modifier" libelle="Modifier" nombre={nombre} onClick={onModifier} />}
      <Action icone="supprimer" libelle="Supprimer" nombre={nombre} onClick={onSupprimer} danger />
    </div>
  )
}
