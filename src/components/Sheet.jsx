import { useEffect, useRef, useState } from 'react'
import Icone from './Icones.jsx'

// Distance (px) ou vitesse (px/ms) au-delà desquelles un glissé vers le bas ferme la feuille.
const SEUIL_DISTANCE = 96
const SEUIL_VITESSE = 0.6

// Feuille basse construite sur <dialog> : le navigateur gère le piège du focus,
// la touche Échap et l'inertie du reste de la page, ce qu'un <div> demanderait
// de recoder à la main.
//
// `modifie` : des saisies seraient perdues à la fermeture, on demande confirmation.
// `pied` : actions toujours visibles sous le contenu qui défile.
// `heros` : une grande image occupe le haut de la feuille (fiche d'un set) ; la poignée et le bouton fermer se posent
// par-dessus, dans le même en-tête, qui reste la zone de prise du glissé.
export default function Sheet({ ouvert, onFermer, titre, children, modifie = false, pied = null, pleinEcran = false, bandeau = null, actionHaut = null, heros = false }) {
  const ref = useRef(null)
  const glisse = useRef(null)
  const [confirmer, setConfirmer] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (ouvert && !d.open) d.showModal()
    if (!ouvert && d.open) d.close()
  }, [ouvert])

  // Toutes les voies de fermeture (X, fond, Échap, glissé) passent ici : une seule
  // règle pour décider si on prévient avant de perdre une saisie.
  function demanderFermer() {
    if (modifie) setConfirmer(true)
    else onFermer()
  }

  function debutGlisse(e) {
    // Seul l'en-tête déclenche le glissé : dans le contenu, le geste doit faire défiler.
    if (e.target.closest('button')) return
    glisse.current = { y0: e.clientY, t0: e.timeStamp, dy: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function glissePendant(e) {
    const g = glisse.current
    if (!g) return
    g.dy = Math.max(0, e.clientY - g.y0)
    ref.current.style.transform = `translateY(${g.dy}px)`
    ref.current.style.transition = 'none'
  }
  function finGlisse(e) {
    const g = glisse.current
    if (!g) return
    glisse.current = null
    const d = ref.current
    d.style.transition = ''
    d.style.transform = ''
    const vitesse = g.dy / Math.max(1, e.timeStamp - g.t0)
    if (g.dy > SEUIL_DISTANCE || (g.dy > 24 && vitesse > SEUIL_VITESSE)) demanderFermer()
  }

  return (
    <dialog
      ref={ref}
      className={`sheet${pleinEcran ? ' sheet--plein' : ''}${heros ? ' sheet--heros' : ''}`}
      aria-label={titre}
      // `close` et `cancel` remontent par React jusqu'à la feuille qui contient celle-ci (la planche d'images dans la fiche) : sans
      // `stopPropagation`, fermer la feuille intérieure avec Échap fermerait aussi la fiche.
      onClose={(e) => { e.stopPropagation(); setConfirmer(false); onFermer() }}
      onCancel={(e) => { e.stopPropagation(); if (modifie) { e.preventDefault(); setConfirmer(true) } }}
      onClick={(e) => { if (e.target === ref.current) demanderFermer() }}
    >
      <div className="sheet__corps">
        <div
          className={`sheet__haut${bandeau ? ' bandeau' : ''}${heros ? ' sheet__haut--heros' : ''}`}
          onPointerDown={debutGlisse}
          onPointerMove={glissePendant}
          onPointerUp={finGlisse}
          onPointerCancel={finGlisse}
        >
          <span className="sheet__poignee" aria-hidden="true" />
          <div className="sheet__entete">
            {bandeau ? <span className="bandeau__num">{bandeau.badge}</span> : heros ? <span /> : <h2 className="sheet__titre">{titre}</h2>}
            <span className="sheet__droite">
              {actionHaut}
              <button type="button" className="icone-btn" aria-label="Fermer" onClick={demanderFermer}>
                <Icone nom="fermer" />
              </button>
            </span>
          </div>
          {bandeau && (
            <>
              <h2 className="bandeau__titre">{titre}</h2>
              {bandeau.sous && <p className="bandeau__sous">{bandeau.sous}</p>}
            </>
          )}
        </div>
        {confirmer && (
          <div className="avis sheet__garde" role="alert">
            <p>Abandonner les changements ?</p>
            <div className="sheet__pied">
              <button type="button" className="bouton" onClick={() => setConfirmer(false)}>Continuer</button>
              <button type="button" className="bouton bouton--danger" onClick={onFermer}>Abandonner</button>
            </div>
          </div>
        )}
        <div className={`sheet__defile${heros ? ' sheet__defile--heros' : ''}`}>{children}</div>
        {pied && <div className="sheet__action">{pied}</div>}
      </div>
    </dialog>
  )
}
