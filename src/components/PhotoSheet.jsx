import { useEffect, useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import { ZOOM_MAX, deplacer, rectangleRecadrage } from '../lib/photos.js'
import { dessiner, lireImage, rendreJpeg } from '../lib/photoNavigateur.js'

// Recadrage 4:3 d'une photo choisie : on la déplace au doigt (ou avec les curseurs, pour le clavier
// et les lecteurs d'écran) et on règle le zoom. Rien n'est enregistré avant « Enregistrer ».
export default function PhotoSheet({ fichier, onFermer, onEnregistrer }) {
  const [source, setSource] = useState(null)
  const [erreur, setErreur] = useState('')
  const [reglage, setReglage] = useState({ zoom: 1, px: 0.5, py: 0.5 })
  const [envoi, setEnvoi] = useState(false)
  const apercu = useRef(null)
  const glisse = useRef(null)

  useEffect(() => {
    let annule = false
    lireImage(fichier)
      .then((canvas) => { if (!annule) setSource(canvas) })
      .catch(() => { if (!annule) setErreur('Cette image n\'a pas pu être lue.') })
    return () => { annule = true }
  }, [fichier])

  useEffect(() => {
    if (!source || !apercu.current) return
    const rect = rectangleRecadrage(source.width, source.height, reglage)
    if (rect) dessiner(source, rect, apercu.current)
  }, [source, reglage])

  function debut(e) {
    glisse.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function pendant(e) {
    const g = glisse.current
    if (!g || !source) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    glisse.current = { x: e.clientX, y: e.clientY }
    const largeurApercu = e.currentTarget.clientWidth
    setReglage((r) => {
      const rect = rectangleRecadrage(source.width, source.height, r)
      return { ...r, ...deplacer(r, dx, dy, largeurApercu, rect, source.width, source.height) }
    })
  }
  const fin = () => { glisse.current = null }

  async function enregistrer() {
    setEnvoi(true)
    setErreur('')
    try {
      const rect = rectangleRecadrage(source.width, source.height, reglage)
      const blob = await rendreJpeg(source, rect)
      const r = await onEnregistrer(blob)
      if (r.ok) onFermer()
      else setErreur(r.erreur)
    } catch {
      setErreur('Le rendu de la photo a échoué.')
    } finally {
      setEnvoi(false)
    }
  }

  const regler = (cle) => (e) => setReglage((r) => ({ ...r, [cle]: Number(e.target.value) }))

  return (
    <Sheet
      ouvert
      onFermer={onFermer}
      titre="Photo du set"
      pied={(
        <>
          <button type="button" className="bouton" onClick={onFermer}>Annuler</button>
          <button type="button" className="bouton bouton--plein" disabled={!source || envoi} onClick={enregistrer}>Enregistrer</button>
        </>
      )}
    >
      {erreur && <p className="avis avis--erreur" role="alert">{erreur}</p>}
      {!source && !erreur && <p className="avis" role="status">Chargement de la photo…</p>}
      {source && (
        <div className="recadrage">
          <canvas
            ref={apercu}
            className="recadrage__image"
            width="512"
            height="384"
            role="img"
            aria-label="Aperçu du recadrage : déplace l'image avec le doigt"
            onPointerDown={debut}
            onPointerMove={pendant}
            onPointerUp={fin}
            onPointerCancel={fin}
          />
          <label className="curseur">
            Zoom
            <input type="range" min="1" max={ZOOM_MAX} step="0.05" value={reglage.zoom} onChange={regler('zoom')} />
          </label>
          <label className="curseur">
            Position horizontale
            <input type="range" min="0" max="1" step="0.01" value={reglage.px} onChange={regler('px')} />
          </label>
          <label className="curseur">
            Position verticale
            <input type="range" min="0" max="1" step="0.01" value={reglage.py} onChange={regler('py')} />
          </label>
        </div>
      )}
    </Sheet>
  )
}
