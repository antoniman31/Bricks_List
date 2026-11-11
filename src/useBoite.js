import { useEffect, useState } from 'react'
import { lireBoite, lireRendu } from './lib/photosDB.js'

// La boîte (ou le rendu Rebrickable, `type` « rendu ») d'un numéro, gardée sur l'appareil. L'URL d'objet est libérée au changement de numéro et au
// démontage : sans cela, chaque carte garderait son image en mémoire.
export default function useBoite(numero, type = 'boite') {
  const [etat, setEtat] = useState({ url: null, chargement: true })

  useEffect(() => {
    let annule = false
    let url = null
    (type === 'rendu' ? lireRendu : lireBoite)(numero)
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
  }, [numero, type])

  return etat
}
