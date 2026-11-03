// Liste découpée en groupes repliables (un par emplacement). En mode sélection tout est
// déplié de force : replier un groupe cacherait des cases cochées qu'on ne verrait plus.
import { useState } from 'react'
import CarteSet from './CarteSet.jsx'

export default function ListeGroupee({ groupes, onOuvrir, selection, idsChoisis, onBasculer, onChoisirGroupe, vue }) {
  // On mémorise les groupes repliés (et non dépliés) : un nouvel emplacement apparaît ouvert.
  const [repliees, setRepliees] = useState(() => new Set())

  function basculerGroupe(cle) {
    setRepliees((avant) => {
      const apres = new Set(avant)
      if (apres.has(cle)) apres.delete(cle)
      else apres.add(cle)
      return apres
    })
  }

  return (
    <div className="rangees">
      {groupes.map((g) => {
        const ouvert = selection || !repliees.has(g.cle)
        const tousChoisis = g.sets.every((s) => idsChoisis.has(s.id))
        const idGroupe = `groupe-${encodeURIComponent(g.cle) || 'non-range'}`
        return (
          <section key={g.cle} className="rangee">
            <div className="rangee__entete">
              {selection ? (
                <h2 className="rangee__titre rangee__titre--fixe">{g.libelle} ({g.sets.length})</h2>
              ) : (
                <h2 className="rangee__titre">
                  <button type="button" className="rangee__bascule" aria-expanded={ouvert} aria-controls={idGroupe} onClick={() => basculerGroupe(g.cle)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={ouvert ? 'rangee__fleche rangee__fleche--ouverte' : 'rangee__fleche'}><path d="M9 6l6 6-6 6" /></svg>
                    {g.libelle} ({g.sets.length})
                  </button>
                </h2>
              )}
              {selection && (
                <button type="button" className="bouton" onClick={() => onChoisirGroupe(g.sets.map((s) => s.id))}>
                  {tousChoisis ? 'Retirer ce groupe' : 'Choisir ce groupe'}
                </button>
              )}
            </div>
            {ouvert && (
              <ul className={`liste${vue === 'grille' ? ' liste--grille' : ''}`} id={idGroupe}>
                {g.sets.map((s) => (
                  <CarteSet
                    key={s.id}
                    set={s}
                    onOuvrir={onOuvrir}
                    selection={selection ? { selectionne: idsChoisis.has(s.id) } : undefined}
                    onBasculer={onBasculer}
                    vue={vue}
                  />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
