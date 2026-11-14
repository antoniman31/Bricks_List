import { useContext } from 'react'
import Vignette from './Vignette.jsx'
import ImagesContext from '../ImagesContext.js'
import usePhoto from '../usePhoto.js'
import { choisirImage, clePhoto, numeroPhotoDe } from '../lib/imageListe.js'

// La photo personnelle d'un set dans une carte. Seuls les sets qui ont choisi la photo (ou que la règle
// y envoie) passent ici, donc seuls leurs JPEG sont lus. Pendant la lecture, un cadre vide de même
// format : la liste ne saute pas, et on ne montre pas la boîte une seconde pour la remplacer.
function VignettePhoto({ set, variante, n }) {
  const photo = usePhoto(clePhoto(set.id, n))
  if (photo.chargement) return <div className={`vignette vignette--${variante} vignette--vide`} aria-hidden="true" />
  if (!photo.url) return <Vignette image={set.image} numero={set.numero} variante={variante} />
  return <img className={`vignette vignette--${variante}`} src={photo.url} alt="" decoding="async" data-origine="photo" />
}

// L'image d'un set dans la liste ou la grille : celle choisie sur sa fiche, sinon la règle des Réglages.
export default function ImageSet({ set, variante = 'carte' }) {
  const { photos, regle } = useContext(ImagesContext)
  const choix = choisirImage(set, regle, (n) => photos.has(clePhoto(set.id, n)))
  const n = numeroPhotoDe(choix)
  if (n !== null) return <VignettePhoto set={set} variante={variante} n={n} />
  return <Vignette image={set.image} numero={set.numero} variante={variante} premier={choix === 'rendu' ? 'rendu' : 'boite'} />
}
