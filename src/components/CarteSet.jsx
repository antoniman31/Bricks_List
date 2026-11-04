// Toute la carte est un vrai <button> (clavier, lecteur d'écran) et ouvre la fiche.
import Vignette from './Vignette.jsx'
import { LIBELLES_PRIORITE } from '../lib/model.js'

export default function CarteSet({ set, onOuvrir, selection, onBasculer, vue = 'liste', courante = false, exemplaires }) {
  // « ×2 » quand le même numéro existe en plusieurs exemplaires possédés : on les repère d'un coup d'œil.
  const n = set.statut === 'possédé' ? exemplaires?.get(set.numero) ?? 1 : 1
  const badge = n > 1 && (
    <span className="carte__badge" role="img" aria-label={`${n} exemplaires`}>×{n}</span>
  )
  const details = [
    set.theme || null,
    set.annee,
    set.pieces != null ? `${set.pieces.toLocaleString('fr-FR')} pièces` : null,
  ].filter((d) => d != null)

  // En mode sélection, la carte devient une case à cocher : on bascule au lieu d'ouvrir.
  const interaction = selection
    ? { role: 'checkbox', 'aria-checked': selection.selectionne, onClick: () => onBasculer(set.id) }
    : { onClick: () => onOuvrir(set.id), 'aria-current': courante ? 'true' : undefined }
  const coche = selection && (
    <span className="carte__case" aria-hidden="true">
      {selection.selectionne && (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
      )}
    </span>
  )

  if (vue === 'grille') {
    // Tuile : l'image en grand, puis le nom, l'essentiel et l'état en pastille. La pastille est sous l'image :
    // le bas d'une boîte porte le numéro et les pièces, qu'elle cachait.
    // L'état d'un set possédé, sinon la priorité d'un set souhaité : un seul repère.
    // La majuscule est mise ici, pas par le CSS : `text-transform: capitalize` ne la met pas quand le
    // texte qui précède dans le DOM (le numéro d'une vignette sans image) finit par une lettre ou un chiffre.
    const repere = set.etat ? set.etat[0].toUpperCase() + set.etat.slice(1) : set.priorite ? LIBELLES_PRIORITE[set.priorite] : null
    return (
      <li>
        <button type="button" className="carte carte--tuile" {...interaction}>
          <div className="tuile__image">
            <Vignette image={set.image} numero={set.numero} variante="tuile" />
            {coche}
          </div>
          <div className="carte__texte">
            <p className="carte__nom">{set.nom}{badge}</p>
            <p className="carte__details">
              {set.pieces != null ? `${set.pieces.toLocaleString('fr-FR')} pièces` : set.numero}
              {set.emplacement && ` · ${set.emplacement}`}
            </p>
            {repere && <span className="tuile__repere">{repere}</span>}
          </div>
        </button>
      </li>
    )
  }

  return (
    <li>
      <button type="button" className="carte" {...interaction}>
        {coche}
        <Vignette image={set.image} numero={set.numero} />
        <div className="carte__texte">
          <p className="carte__nom">{set.nom}{badge}</p>
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
