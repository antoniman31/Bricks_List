import { useCallback, useEffect, useState } from 'react'
import { ecrireGalerieStock, lireGalerieStock } from './lib/photosDB.js'
import { normaliserNumero } from './lib/numero.js'

// La liste des images de Brickset d'un set, relue de l'appareil (jamais du réseau : la demander à Brickset coûte deux appels, et se
// fait sur appui). `enregistrer(images)` garde la liste reçue pour ne pas la redemander.
export default function useGalerie(numero) {
  const n = normaliserNumero(numero)
  const [etat, setEtat] = useState({ images: [], connue: false })

  useEffect(() => {
    let annule = false
    if (!n) return undefined
    lireGalerieStock(n)
      .then((images) => { if (!annule && images) setEtat({ images, connue: true }) })
      .catch(() => {})
    return () => { annule = true }
  }, [n])

  const enregistrer = useCallback(async (images) => {
    setEtat({ images, connue: true })
    if (n) { try { await ecrireGalerieStock(n, images) } catch { /* la liste s'affiche quand même, elle sera redemandée */ } }
  }, [n])

  return { ...etat, enregistrer }
}
