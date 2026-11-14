import { centimesParPiece, formaterCentimes, niveauPrixPiece } from '../lib/prixPiece.js'

// Le prix par pièce d'un set de la wishlist, dans une pastille : neutre, verte (bon prix) ou jaune (cher). Rien sans prix ou sans nombre
// de pièces. La couleur ne dit jamais seule : le chiffre est écrit, et un lecteur d'écran entend « bon prix » ou « prix élevé ».
export default function PastillePrixPiece({ set }) {
  const ct = centimesParPiece(set)
  if (ct === null) return null
  const niveau = niveauPrixPiece(ct)
  const mot = niveau === 'bon' ? ' (bon prix)' : niveau === 'cher' ? ' (prix élevé)' : ''
  return (
    <span className={`pastille-pp pastille-pp--${niveau}`}>
      {formaterCentimes(ct)}
      {mot && <span className="visuellement-cache">{mot}</span>}
    </span>
  )
}
