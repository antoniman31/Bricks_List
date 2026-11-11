import { useContext, useState } from 'react'
import { sourcesImage } from '../lib/boite.js'
import { normaliserNumero } from '../lib/numero.js'
import ImagesContext from '../ImagesContext.js'
import useBoite from '../useBoite.js'

// Les URL qui ont échoué pendant cette session, partagées par toutes les vignettes.
// Sans cela, la fiche redemandait une image que la liste venait de voir échouer et
// restait vide le temps de la nouvelle réponse. Oubliées au rechargement : une
// panne passagère n'enterre pas une image pour toujours.
const echouees = new Set()
const BRICKLINK = 'https://img.bricklink.com/'

// L'image d'un set, au format 4:3 : la photo de la boîte, sinon le rendu Rebrickable passé en
// `image`, sinon le numéro.
//
// La boîte vient d'abord de l'appareil : chaque boîte affichée depuis BrickLink y est gardée (voir
// `sauverBoite`), et BrickLink en panne ou en maintenance ne la fait plus disparaître. Sinon, du réseau
// (BrickLink), puis le rendu, puis le numéro.
//
// Ces images ont un FOND BLANC intégré : on ne peut
// pas le rendre transparent. Plutôt que de le cacher, on l'assume : un panneau
// blanc aux coins arrondis, avec un contour qui le sépare du fond en thème clair.
//
// Si l'image ne charge pas (URL morte, hors ligne sans cache), on retombe sur le
// numéro du set au même format : la carte garde sa hauteur et le set reste
// identifiable, au lieu d'afficher l'icône d'image cassée du navigateur.
// Le chargement différé n'a de sens que pour la liste, qui monte des centaines de
// cartes dont presque toutes sont hors écran. La fiche et l'aperçu s'affichent
// tout de suite : différer leur image la laissait vide.
export default function Vignette(props) {
  const { boites } = useContext(ImagesContext)
  const n = normaliserNumero(props.numero)
  // « Rendu d'abord » (choix de l'image de la liste) : la boîte n'a pas à passer devant.
  if (n && props.premier !== 'rendu' && boites.has(n)) return <VignetteLocale {...props} numero={n} />
  return <VignetteReseau {...props} />
}

// La boîte gardée sur l'appareil. Pendant la lecture, un cadre vide de même format (la liste ne saute pas) ;
// si la lecture échoue ou ne donne rien, on retombe sur le réseau.
function VignetteLocale({ image, numero, variante = 'carte', premier = 'boite' }) {
  const { url, chargement } = useBoite(numero)
  if (chargement) return <div className={`vignette vignette--${variante} vignette--vide`} aria-hidden="true" />
  if (!url) return <VignetteReseau image={image} numero={numero} variante={variante} premier={premier} />
  return <img className={`vignette vignette--${variante}`} src={url} alt="" decoding="async" />
}

function VignetteReseau({ image, numero, variante = 'carte', premier = 'boite' }) {
  // On retient les URL qui ont échoué, pas un simple booléen : si l'image du set
  // change (nouvelle recherche), l'échec précédent ne la concerne plus. Une boîte
  // absente chez BrickLink fait passer à la source suivante, pas au numéro.
  const [, rafraichir] = useState(0)
  const { boites, sauverBoite } = useContext(ImagesContext)
  const classe = `vignette vignette--${variante}`
  const src = sourcesImage(numero, image, premier).find((u) => !echouees.has(u))

  if (!src) {
    return <div className={`${classe} vignette--vide`} aria-hidden="true">{numero}</div>
  }
  const estBoite = src.startsWith(BRICKLINK)
  return (
    <img
      className={classe}
      src={src}
      crossOrigin={estBoite ? 'anonymous' : undefined}
      alt=""
      loading={variante === 'carte' ? 'lazy' : 'eager'}
      decoding="async"
      // Une boîte qui vient d'arriver de BrickLink est gardée sur l'appareil, une seule fois.
      onLoad={(e) => { const n = normaliserNumero(numero); if (estBoite && n && !boites.has(n)) sauverBoite(n, e.currentTarget) }}
      onError={() => { echouees.add(src); rafraichir((n) => n + 1) }}
    />
  )
}
