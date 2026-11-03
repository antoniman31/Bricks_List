import { useEffect, useRef } from 'react'

// Feuille basse construite sur <dialog> : le navigateur gère le piège du focus,
// la touche Échap et l'inertie du reste de la page, ce qu'un <div> demanderait
// de recoder à la main.
export default function Sheet({ ouvert, onFermer, titre, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (ouvert && !d.open) d.showModal()
    if (!ouvert && d.open) d.close()
  }, [ouvert])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={titre}
      onClose={onFermer}
      onClick={(e) => { if (e.target === ref.current) onFermer() }}
    >
      <div className="sheet__corps">
        <div className="sheet__entete">
          <h2 className="sheet__titre">{titre}</h2>
          <button type="button" className="bouton" onClick={onFermer}>Fermer</button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
