// Toute la carte est un vrai <button> (clavier, lecteur d'écran) et ouvre la fiche.
import Vignette from './Vignette.jsx'

export default function CarteSet({ set, onOuvrir }) {
  const details = [
    set.theme || null,
    set.annee,
    set.pieces != null ? `${set.pieces.toLocaleString('fr-FR')} pièces` : null,
  ].filter((d) => d != null)

  return (
    <li>
      <button type="button" className="carte" onClick={() => onOuvrir(set.id)}>
        <Vignette image={set.image} numero={set.numero} />
        <div className="carte__texte">
          <p className="carte__nom">{set.nom}</p>
          <p className="carte__details">{set.numero}{details.length > 0 && ` · ${details.join(' · ')}`}</p>
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
