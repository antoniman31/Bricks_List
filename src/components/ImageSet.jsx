import { useContext } from 'react'
import Vignette from './Vignette.jsx'
import ImagesContext from '../ImagesContext.js'
import usePhoto from '../usePhoto.js'
import useExtra from '../useExtra.js'
import { choisirImage, clePhoto, numeroPhotoDe } from '../lib/imageListe.js'
import { cleExtra, nomDeChoix } from '../lib/galerie.js'
import { normaliserNumero } from '../lib/numero.js'

// La photo personnelle d'un set dans une carte. Seuls les sets qui ont choisi la photo (ou que la règle
// y envoie) passent ici, donc seuls leurs JPEG sont lus. Pendant la lecture, un cadre vide de même
// format : la liste ne saute pas, et on ne montre pas la boîte une seconde pour la remplacer.
function VignettePhoto({ set, variante, n }) {
  const photo = usePhoto(clePhoto(set.id, n))
  if (photo.chargement) return <div className={`vignette vignette--${variante} vignette--vide`} aria-hidden="true" />
  if (!photo.url) return <Vignette image={set.image} numero={set.numero} variante={variante} />
  return <img className={`vignette vignette--${variante}`} src={photo.url} alt="" decoding="async" data-origine="photo" />
}

// Une image de la galerie Brickset, gardée sur l'appareil, dans une carte.
function VignetteExtra({ set, variante, nom }) {
  const extra = useExtra(cleExtra(normaliserNumero(set.numero), nom))
  if (extra.chargement) return <div className={`vignette vignette--${variante} vignette--vide`} aria-hidden="true" />
  if (!extra.url) return <Vignette image={set.image} numero={set.numero} variante={variante} />
  return <img className={`vignette vignette--${variante}`} src={extra.url} alt="" decoding="async" data-origine="extra" />
}

// L'image d'un set dans la liste ou la grille : celle choisie sur sa fiche, sinon la règle des Réglages.
export default function ImageSet({ set, variante = 'carte' }) {
  const { photos, regle, extras } = useContext(ImagesContext)
  const numero = normaliserNumero(set.numero)
  const choix = choisirImage(set, regle, (n) => photos.has(clePhoto(set.id, n)), (nom) => extras.has(cleExtra(numero, nom)))
  const nomExtra = nomDeChoix(choix)
  if (nomExtra !== null) return <VignetteExtra set={set} variante={variante} nom={nomExtra} />
  const n = numeroPhotoDe(choix)
  if (n !== null) return <VignettePhoto set={set} variante={variante} n={n} />
  return <Vignette image={set.image} numero={set.numero} variante={variante} premier={choix === 'rendu' ? 'rendu' : 'boite'} />
}
