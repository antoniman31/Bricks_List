// Sans image, un bloc affiche le numéro : la carte garde la même hauteur et le
// set reste identifiable. Toute la carte est un vrai <button> (clavier, lecteur
// d'écran) et ouvre la fiche.
export default function CarteSet({ set, onOuvrir }) {
  const details = [
    set.theme || null,
    set.annee,
    set.pieces != null ? `${set.pieces.toLocaleString('fr-FR')} pièces` : null,
  ].filter((d) => d != null)

  return (
    <li>
      <button type="button" className="carte" onClick={() => onOuvrir(set.id)}>
        {set.image ? (
          <img className="carte__image" src={set.image} alt="" loading="lazy" />
        ) : (
          <div className="carte__image carte__image--vide" aria-hidden="true">{set.numero}</div>
        )}
        <div className="carte__texte">
          <p className="carte__nom">{set.nom}</p>
          <p className="carte__details">{set.numero}{details.length > 0 && ` · ${details.join(' · ')}`}</p>
          {set.etat && <p className="carte__etat">{set.etat}</p>}
        </div>
      </button>
    </li>
  )
}
