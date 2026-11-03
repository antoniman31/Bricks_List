import { useState } from 'react'

const THEMES_VISIBLES = 8
const nombre = (n) => n.toLocaleString('fr-FR')
const pluriel = (n, mot) => `${nombre(n)} ${mot}${n > 1 ? 's' : ''}`

// La barre n'est qu'un repère visuel : l'information est écrite en texte à côté,
// et toute la ligne est un vrai bouton qui ouvre la liste correspondante.
function Barres({ barres, onOuvrir }) {
  const max = Math.max(1, ...barres.map((b) => b.sets))
  return (
    <ul className="barres">
      {barres.map((b) => (
        <li key={b.cle || 'vide'}>
          <button type="button" className="barre-stat" onClick={() => onOuvrir(b.filtre)}>
            <span className="barre-stat__texte">
              <span className="barre-stat__libelle">{b.libelle}</span>
              <span className="barre-stat__valeur">
                {pluriel(b.sets, 'set')}
                {b.pieces > 0 && ` · ${nombre(b.pieces)} pièces${b.piecesInconnues > 0 ? ' connues' : ''}`}
              </span>
            </span>
            <span className="barre-stat__piste" aria-hidden="true">
              <span className="barre-stat__remplissage" style={{ width: `${(b.sets / max) * 100}%` }} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Bloc({ titre, children }) {
  return (
    <section className="bloc">
      <h2 className="bloc__titre">{titre}</h2>
      {children}
    </section>
  )
}

export default function StatsView({ stats, onOuvrir, onVoirWishlist }) {
  const [tousLesThemes, setTousLesThemes] = useState(false)
  const { resume, themes, annees, etats, emplacements, aCompleter, wishlist, activite } = stats

  if (resume.sets === 0) {
    return (
      <div className="vide">
        <p>Ajoute des sets à la collection pour voir tes statistiques.</p>
        {wishlist.sets > 0 && <button type="button" className="bouton" onClick={onVoirWishlist}>Voir la wishlist ({wishlist.sets})</button>}
      </div>
    )
  }

  const themesAffiches = tousLesThemes ? themes : themes.slice(0, THEMES_VISIBLES)

  return (
    <div className="stats">
      <div className="chiffres">
        <div className="chiffre">
          <span className="chiffre__valeur">{nombre(resume.sets)}</span>
          <span className="chiffre__libelle">set{resume.sets > 1 ? 's' : ''}</span>
        </div>
        <div className="chiffre">
          <span className="chiffre__valeur">{nombre(resume.pieces)}</span>
          <span className="chiffre__libelle">pièces</span>
        </div>
      </div>
      {resume.sansPieces > 0 && (
        <p className="stats__note">
          Total calculé sur {pluriel(resume.sets - resume.sansPieces, 'set')} dont le nombre de pièces est connu ({resume.sansPieces} sans).
        </p>
      )}
      {activite && (
        <p className="stats__note">
          En {activite.annee} : {pluriel(activite.achetes, 'set')} {activite.achetes > 1 ? 'achetés' : 'acheté'}, {pluriel(activite.montes, 'set')} {activite.montes > 1 ? 'montés' : 'monté'}.
        </p>
      )}
      {resume.plusGros && (
        <p className="stats__note">Plus gros set : {resume.plusGros.nom} ({nombre(resume.plusGros.pieces)} pièces).</p>
      )}

      {aCompleter.fiches > 0 && (
        <Bloc titre={`À compléter · ${pluriel(aCompleter.fiches, 'fiche')}`}>
          <div className="stats__puces">
            {aCompleter.champs.map((c) => (
              <button key={c.cle} type="button" className="puce" onClick={() => onOuvrir({ manque: c.cle })}>
                {c.libelle} ({c.nombre})
              </button>
            ))}
          </div>
        </Bloc>
      )}

      <Bloc titre="Par thème">
        <Barres barres={themesAffiches} onOuvrir={onOuvrir} />
        {themes.length > THEMES_VISIBLES && (
          <button type="button" className="bouton" onClick={() => setTousLesThemes((v) => !v)}>
            {tousLesThemes ? 'Réduire' : `Afficher les ${themes.length - THEMES_VISIBLES} autres`}
          </button>
        )}
      </Bloc>

      {annees.length > 0 && (
        <Bloc titre="Par année de sortie">
          <Barres barres={annees} onOuvrir={onOuvrir} />
        </Bloc>
      )}

      {etats.length > 0 && (
        <Bloc titre="Par état">
          <Barres barres={etats} onOuvrir={onOuvrir} />
        </Bloc>
      )}

      {emplacements.length > 0 && (
        <Bloc titre="Par emplacement">
          <Barres barres={emplacements} onOuvrir={onOuvrir} />
        </Bloc>
      )}

      <Bloc titre="Wishlist">
        {wishlist.sets === 0 ? (
          <p className="stats__note">Aucun set souhaité.</p>
        ) : (
          <>
            <p className="stats__note">
              {pluriel(wishlist.sets, 'set')} à acquérir
              {wishlist.pieces > 0 && `, ${nombre(wishlist.pieces)} pièces${wishlist.sansPieces > 0 ? ' connues' : ''}`}.
            </p>
            {wishlist.priorites.length > 0 && (
              <p className="stats__note">{wishlist.priorites.map((p) => `${p.libelle} : ${p.sets}`).join(' · ')}</p>
            )}
            <button type="button" className="bouton" onClick={onVoirWishlist}>Voir la wishlist</button>
          </>
        )}
      </Bloc>
    </div>
  )
}
