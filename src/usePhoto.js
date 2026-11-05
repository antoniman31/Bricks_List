import { useEffect, useState } from 'react'
import { lirePhoto } from './lib/photosDB.js'

// La photo personnelle d'un set, lue dans IndexedDB. L'URL d'objet est libérée au changement de set
// et au démontage : sans cela, chaque ouverture de fiche garderait une image en mémoire.
export default function usePhoto(id) {
  const [etat, setEtat] = useState({ url: null, chargement: true, erreur: false })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let annule = false
    let url = null
    lirePhoto(id)
      .then((blob) => {
        if (annule) return
        url = blob ? URL.createObjectURL(blob) : null
        setEtat({ url, chargement: false, erreur: false })
      })
      .catch(() => { if (!annule) setEtat({ url: null, chargement: false, erreur: true }) })
    return () => {
      annule = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, version])

  return { ...etat, recharger: () => setVersion((v) => v + 1) }
}
