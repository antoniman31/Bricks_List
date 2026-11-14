import { useEffect, useState } from 'react'
import { lireExtra } from './lib/photosDB.js'

// Une image de la galerie Brickset gardée sur l'appareil, relue d'IndexedDB (clé « numéro|nom »). Comme `useBoite` : l'URL d'objet est
// libérée au changement de clé et au démontage.
export default function useExtra(cle) {
  const [etat, setEtat] = useState({ url: null, chargement: true })

  useEffect(() => {
    let annule = false
    let url = null
    lireExtra(cle)
      .then((blob) => {
        if (annule) return
        url = blob ? URL.createObjectURL(blob) : null
        setEtat({ url, chargement: false })
      })
      .catch(() => { if (!annule) setEtat({ url: null, chargement: false }) })
    return () => {
      annule = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [cle])

  return etat
}
