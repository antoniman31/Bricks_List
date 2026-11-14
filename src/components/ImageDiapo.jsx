import { useContext } from 'react'
import Vignette from './Vignette.jsx'
import ImagesContext from '../ImagesContext.js'
import usePhoto from '../usePhoto.js'
import useExtra from '../useExtra.js'
import { clePhoto } from '../lib/imageListe.js'
import { cleExtra } from '../lib/galerie.js'
import { normaliserNumero } from '../lib/numero.js'

// L'image d'une diapositive du carrousel. `variante` : « fiche » (le haut de la fiche), « plein » (la visionneuse plein écran) ou
// « mini » (la planche de miniatures).
export default function ImageDiapo({ set, diapo, variante }) {
  if (diapo.cle === 'boite') return <Vignette image={set.image} numero={set.numero} variante={variante} />
  if (diapo.cle === 'rendu') return <Vignette image={set.image} numero={set.numero} variante={variante} premier="rendu" />
  if (diapo.n) return <PhotoPerso set={set} diapo={diapo} variante={variante} />
  if (diapo.extra) return <ImageBrickset set={set} diapo={diapo} variante={variante} />
  return null
}

function PhotoPerso({ set, diapo, variante }) {
  const photo = usePhoto(clePhoto(set.id, diapo.n))
  if (photo.chargement) return <div className="photo-vide" role="status">Chargement…</div>
  if (!photo.url) return <div className="photo-vide">La photo n'a pas pu être lue.</div>
  return <img className={`vignette vignette--${variante}`} src={photo.url} alt={`${diapo.libelle} de ${set.nom}`} decoding="async" data-origine="photo" />
}

// Une image de la galerie Brickset : la copie de l'appareil si on l'a gardée (elle se voit hors ligne), sinon l'image en ligne
// (la miniature dans la planche). Pas de `crossOrigin` : on l'affiche seulement, la copie passe par le relais.
function ImageBrickset({ set, diapo, variante }) {
  const { extras } = useContext(ImagesContext)
  const cle = cleExtra(normaliserNumero(set.numero), diapo.extra.nom)
  if (extras.has(cle)) return <ImageGardee cle={cle} set={set} diapo={diapo} variante={variante} />
  const src = variante === 'mini' ? (diapo.extra.miniature ?? diapo.extra.url) : diapo.extra.url
  if (!src) return <div className="photo-vide">Image non disponible hors ligne.</div>
  return <img className={`vignette vignette--${variante}`} src={src} alt={`Image Brickset de ${set.nom}`} loading={variante === 'mini' ? 'lazy' : 'eager'} decoding="async" data-origine="extra-reseau" />
}

function ImageGardee({ cle, set, diapo, variante }) {
  const extra = useExtra(cle)
  if (extra.chargement) return <div className="photo-vide" role="status">Chargement…</div>
  if (!extra.url) return diapo.extra.url
    ? <img className={`vignette vignette--${variante}`} src={diapo.extra.url} alt={`Image Brickset de ${set.nom}`} decoding="async" data-origine="extra-reseau" />
    : <div className="photo-vide">L'image n'a pas pu être lue.</div>
  return <img className={`vignette vignette--${variante}`} src={extra.url} alt={`Image Brickset de ${set.nom}`} decoding="async" data-origine="extra" />
}
