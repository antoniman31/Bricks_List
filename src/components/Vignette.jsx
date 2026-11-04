import { useState } from 'react'
import { sourcesImage } from '../lib/boite.js'

// Les URL qui ont échoué pendant cette session, partagées par toutes les vignettes.
// Sans cela, la fiche redemandait une image que la liste venait de voir échouer et
// restait vide le temps de la nouvelle réponse. Oubliées au rechargement : une
// panne passagère n'enterre pas une image pour toujours.
const echouees = new Set()

// L'image d'un set, au format 4:3 : la photo de la boîte (BrickLink), sinon le rendu
// Rebrickable passé en `image`, sinon le numéro.
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
export default function Vignette({ image, numero, variante = 'carte' }) {
  // On retient les URL qui ont échoué, pas un simple booléen : si l'image du set
  // change (nouvelle recherche), l'échec précédent ne la concerne plus. Une boîte
  // absente chez BrickLink fait passer à la source suivante, pas au numéro.
  const [, rafraichir] = useState(0)
  const classe = `vignette vignette--${variante}`
  const src = sourcesImage(numero, image).find((u) => !echouees.has(u))

  if (!src) {
    return <div className={`${classe} vignette--vide`} aria-hidden="true">{numero}</div>
  }
  return (
    <img
      className={classe}
      src={src}
      crossOrigin={src.startsWith('https://img.bricklink.com/') ? 'anonymous' : undefined}
      alt=""
      loading={variante === 'carte' ? 'lazy' : 'eager'}
      decoding="async"
      onError={() => { echouees.add(src); rafraichir((n) => n + 1) }}
    />
  )
}
