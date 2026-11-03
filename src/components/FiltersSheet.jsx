import { useState } from 'react'
import Sheet from './Sheet.jsx'

// Un groupe par ligne qui porte sa valeur courante, un seul ouvert à la fois :
// tous dépliés, thèmes et années feraient des dizaines de boutons d'un coup.
function Groupe({ groupe, valeur, ouvert, onBasculer, onChoisir }) {
  const courant = groupe.options.find((o) => String(o.valeur) === String(valeur))
  return (
    <div className="groupe">
      <button type="button" className="groupe__ligne" aria-expanded={ouvert} onClick={onBasculer}>
        <span>{groupe.libelle}</span>
        <span className="groupe__valeur">{courant ? courant.libelle : 'Tous'}</span>
      </button>
      {ouvert && (
        <div className="groupe__options">
          <button type="button" className="puce" aria-pressed={valeur === ''} onClick={() => onChoisir('')}>Tous</button>
          {groupe.options.map((o) => (
            <button
              key={o.valeur}
              type="button"
              className="puce"
              aria-pressed={String(o.valeur) === String(valeur)}
              onClick={() => onChoisir(o.valeur)}
            >
              {o.libelle}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FiltersSheet({ ouvert, onFermer, groupes, filtres, onChanger, onReinitialiser, nbResultats }) {
  const [groupeOuvert, setGroupeOuvert] = useState(null)
  const actifs = groupes.filter((g) => filtres[g.cle] !== '').length

  return (
    <Sheet ouvert={ouvert} onFermer={onFermer} titre="Filtres">
      {groupes.map((g) => (
        <Groupe
          key={g.cle}
          groupe={g}
          valeur={filtres[g.cle]}
          ouvert={groupeOuvert === g.cle}
          onBasculer={() => setGroupeOuvert(groupeOuvert === g.cle ? null : g.cle)}
          onChoisir={(v) => onChanger(g.cle, v)}
        />
      ))}
      <div className="sheet__pied">
        <button type="button" className="bouton" disabled={actifs === 0} onClick={onReinitialiser}>Réinitialiser</button>
        <button type="button" className="bouton bouton--plein" onClick={onFermer}>
          Voir {nbResultats} set{nbResultats > 1 ? 's' : ''}
        </button>
      </div>
    </Sheet>
  )
}
