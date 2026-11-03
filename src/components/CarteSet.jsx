// Sans image (set d'exemple ou image absente), un bloc affiche le numéro : la
// carte garde la même hauteur et le set reste identifiable.
export default function CarteSet({ set }) {
  const details = [
    set.theme || null,
    set.annee,
    set.pieces != null ? `${set.pieces.toLocaleString('fr-FR')} pièces` : null,
  ].filter((d) => d != null)

  return (
    <li className="carte">
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
    </li>
  )
}
