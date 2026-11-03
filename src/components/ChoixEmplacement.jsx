import { useState } from 'react'

// Choix d'un emplacement par puces : un appui au lieu de retaper « Étagère 2 » à chaque fois.
// `vide` ajoute une puce pour « aucun emplacement » (formulaire) ; sans elle, appuyer de nouveau
// sur la puce choisie la désélectionne (édition en masse, où vide veut dire « ne pas changer »).
// Un emplacement qui n'existe pas encore se saisit via « Nouveau », ce qui garde la liberté
// de l'ancien champ libre sans lui laisser la place centrale.
export default function ChoixEmplacement({ lieux, valeur, onChange, vide = null, desactive = false, libelle }) {
  const connu = lieux.some((l) => l.nom === valeur)
  const [nouveau, setNouveau] = useState(valeur !== '' && !connu)

  function choisir(nom) {
    setNouveau(false)
    onChange(nom === valeur && !vide ? '' : nom)
  }

  return (
    <div className="choix">
      <div className="groupe__options" role="group" aria-label={libelle}>
        {vide && (
          <button type="button" className="puce" disabled={desactive} aria-pressed={valeur === '' && !nouveau} onClick={() => choisir('')}>
            {vide}
          </button>
        )}
        {lieux.map((l) => (
          <button key={l.nom} type="button" className="puce" disabled={desactive} aria-pressed={!nouveau && valeur === l.nom} onClick={() => choisir(l.nom)}>
            {l.nom} · {l.n}
          </button>
        ))}
        <button type="button" className="puce" disabled={desactive} aria-pressed={nouveau} onClick={() => { setNouveau(true); onChange('') }}>
          Nouveau
        </button>
      </div>
      {nouveau && !desactive && (
        <input
          className="champ"
          autoFocus
          autoComplete="off"
          maxLength={60}
          aria-label="Nom du nouvel emplacement"
          placeholder="Étagère 2, carton A…"
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
