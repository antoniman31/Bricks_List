// Toute la carte est un vrai <button> (clavier, lecteur d'écran) et ouvre la fiche.
import Vignette from './Vignette.jsx'
import { LIBELLES_PRIORITE } from '../lib/model.js'

export default function CarteSet({ set, onOuvrir, selection, onBasculer }) {
  const details = [
    set.theme || null,
    set.annee,
    set.pieces != null ? `${set.pieces.toLocaleString('fr-FR')} pièces` : null,
  ].filter((d) => d != null)

  return (
    <li>
      {/* En mode sélection, la carte devient une case à cocher : on bascule au lieu d'ouvrir. */}
      <button
        type="button"
        className="carte"
        {...(selection
          ? { role: 'checkbox', 'aria-checked': selection.selectionne, onClick: () => onBasculer(set.id) }
          : { onClick: () => onOuvrir(set.id) })}
      >
        {selection && (
          <span className="carte__case" aria-hidden="true">
            {selection.selectionne && (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
            )}
          </span>
        )}
        <Vignette image={set.image} numero={set.numero} />
        <div className="carte__texte">
          <p className="carte__nom">{set.nom}</p>
          <p className="carte__details">{set.numero}{details.length > 0 && ` · ${details.join(' · ')}`}</p>
          {set.priorite && <p className="carte__etat">{LIBELLES_PRIORITE[set.priorite]}</p>}
          {set.etiquettes?.length > 0 && <p className="carte__etat">{set.etiquettes.join(' · ')}</p>}
          {(set.etat || set.emplacement) && (
            <p className="carte__etat">
              {set.etat && <span className="carte__majuscule">{set.etat}</span>}
              {set.etat && set.emplacement && ' · '}
              {set.emplacement && <span className="carte__emplacement">{set.emplacement}</span>}
            </p>
          )}
        </div>
      </button>
    </li>
  )
}
