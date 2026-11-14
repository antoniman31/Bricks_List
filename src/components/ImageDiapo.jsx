import Vignette from './Vignette.jsx'
import usePhoto from '../usePhoto.js'
import { clePhoto } from '../lib/imageListe.js'

// L'image d'une diapositive du carrousel. `variante` : « fiche » (le haut de la fiche) ou « plein » (la visionneuse plein écran).
export default function ImageDiapo({ set, diapo, variante }) {
  if (diapo.cle === 'boite') return <Vignette image={set.image} numero={set.numero} variante={variante} />
  if (diapo.cle === 'rendu') return <Vignette image={set.image} numero={set.numero} variante={variante} premier="rendu" />
  if (diapo.n) return <PhotoPerso set={set} diapo={diapo} variante={variante} />
  return null
}

function PhotoPerso({ set, diapo, variante }) {
  const photo = usePhoto(clePhoto(set.id, diapo.n))
  if (photo.chargement) return <div className="photo-vide" role="status">Chargement…</div>
  if (!photo.url) return <div className="photo-vide">La photo n'a pas pu être lue.</div>
  return <img className={`vignette vignette--${variante}`} src={photo.url} alt={`${diapo.libelle} de ${set.nom}`} decoding="async" data-origine="photo" />
}
