import { useState } from 'react'
import { ETATS } from '../lib/model.js'
import { blocsProportionnels } from '../lib/treemap.js'

const SERIES = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)', 'var(--serie-4)']
const HAUT_BLOCS = 62 // hauteur du cadre des blocs, pour 100 de large (voir `.blocs`)
const nombre = (n) => n.toLocaleString('fr-FR')
const pluriel = (n, mot) => `${nombre(n)} ${mot}${n > 1 ? 's' : ''}`
const majuscule = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t)

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

// L'état en anneau : le total au centre, chaque ligne de la légende est un bouton qui ouvre la liste. Les
// couleurs suivent l'ordre fixe des états ; « non renseigné » est gris. Le sens est aussi écrit (légende chiffrée).
function Anneau({ barres, total, onOuvrir }) {
  const R = 42
  const C = 2 * Math.PI * R
  const parts = barres.filter((b) => b.sets > 0)
  const somme = parts.reduce((t, b) => t + b.sets, 0)
  const couleur = (b) => { const i = ETATS.indexOf(b.cle); return i >= 0 && i < SERIES.length ? SERIES[i] : 'var(--serie-vide)' }
  const trou = parts.length > 1 ? 2.5 : 0
  // Chaque arc commence là où le précédent finit : le décalage cumulé est calculé d'avance, pas pendant le rendu.
  const arcs = parts.reduce((liste, b) => {
    const debut = liste.length > 0 ? liste[liste.length - 1].debut + liste[liste.length - 1].l : 0
    return [...liste, { b, debut, l: (C * b.sets) / somme }]
  }, [])
  return (
    <div className="anneau">
      <div className="anneau__dessin">
        <svg viewBox="0 0 120 120" role="img" aria-label={`Par état : ${parts.map((b) => `${b.libelle} ${b.sets}`).join(', ')}`}>
          {arcs.map(({ b, debut, l }) => {
            const trait = Math.max(0, l - trou)
            return (
              <circle key={b.cle || 'vide'} cx="60" cy="60" r={R} fill="none" stroke={couleur(b)} strokeWidth="14"
                strokeDasharray={`${trait} ${C - trait}`} strokeDashoffset={-debut} transform="rotate(-90 60 60)" />
            )
          })}
        </svg>
        <div className="anneau__centre" aria-hidden="true">
          <span className="anneau__total">{nombre(total)}</span>
          <span className="anneau__unite">set{total > 1 ? 's' : ''}</span>
        </div>
      </div>
      <ul className="anneau__legende">
        {parts.map((b) => (
          <li key={b.cle || 'vide'}>
            <button type="button" className="anneau__ligne" onClick={() => onOuvrir(b.filtre)}>
              <span className="anneau__pastille" style={{ background: couleur(b) }} aria-hidden="true" />
              <span>{majuscule(b.libelle)}</span>
              <span className="anneau__valeur">{nombre(b.sets)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Les thèmes en blocs proportionnels : la surface suit le nombre de sets, la teinte aussi (une seule couleur,
// du clair au foncé). Les petits thèmes sont versés dans « Autres », qui déplie le détail sous les blocs.
function Blocs({ barres, onOuvrir, onAutres, autresOuvert }) {
  const blocs = blocsProportionnels(barres, { hauteur: HAUT_BLOCS })
  return (
    <div className="blocs" role="group" aria-label="Thèmes, par nombre de sets">
      {blocs.map((b) => (
        <div key={b.cle || 'vide'} className="blocs__case"
          style={{ left: `${b.rect.x}%`, top: `${(b.rect.y / HAUT_BLOCS) * 100}%`, width: `${b.rect.w}%`, height: `${(b.rect.h / HAUT_BLOCS) * 100}%` }}>
          <button type="button" className={`blocs__bloc blocs__bloc--e${b.echelle}${b.cle === '' ? ' blocs__bloc--vide' : ''}`}
            aria-expanded={b.autres ? autresOuvert : undefined}
            onClick={() => (b.autres ? onAutres() : onOuvrir(b.filtre))}>
            <span className="blocs__nom">{b.libelle}</span>
            <span className="blocs__nombre">{nombre(b.sets)}<span className="visuellement-cache"> set{b.sets > 1 ? 's' : ''}</span></span>
          </button>
        </div>
      ))}
    </div>
  )
}

// Les années en courbe, de la plus ancienne à la plus récente ; le point le plus haut porte sa valeur.
// La courbe seule n'est pas cliquable (des dizaines d'années ne tiendraient pas en cibles de 48 px) : le détail
// par année, lui, est la liste de barres habituelle.
function Courbe({ barres }) {
  const pts = barres.filter((b) => b.cle !== '')
  if (pts.length < 2) return null
  const W = 300, H = 118, PAD = 14
  const bas = H - 16
  const max = Math.max(...pts.map((b) => b.sets))
  const x = (i) => PAD + (i * (W - 2 * PAD)) / (pts.length - 1)
  const y = (v) => bas - 6 - (v / max) * (bas - 28)
  const xy = pts.map((b, i) => [x(i), y(b.sets)])
  const sommet = pts.findIndex((b) => b.sets === max)
  const pas = Math.ceil((pts.length - 1) / 4)
  const reperes = pts.map((_, i) => i).filter((i) => i % pas === 0 || i === pts.length - 1)
  const ancre = sommet === 0 ? 'start' : sommet === pts.length - 1 ? 'end' : 'middle'
  const [sx, sy] = xy[sommet]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="courbe" role="img" aria-label={`Sets par année : ${pts.map((b) => `${b.libelle} : ${b.sets}`).join(', ')}`}>
      <line x1={PAD} x2={W - PAD} y1={bas} y2={bas} className="courbe__base" />
      <path className="courbe__aire" d={`M${xy[0][0]},${bas} ${xy.map(([a, b]) => `L${a},${b}`).join(' ')} L${xy[xy.length - 1][0]},${bas} Z`} />
      <polyline className="courbe__trait" points={xy.map(([a, b]) => `${a},${b}`).join(' ')} />
      <circle className="courbe__point" cx={sx} cy={sy} r="5" />
      <text className="courbe__valeur" x={sx} y={sy - 10} textAnchor={ancre}>{pts[sommet].sets} set{pts[sommet].sets > 1 ? 's' : ''} · {pts[sommet].libelle}</text>
      {reperes.map((i) => (
        <text key={pts[i].cle} className="courbe__axe" x={x(i)} y={H - 3} textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}>{pts[i].cle}</text>
      ))}
    </svg>
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
  const [anneesDetail, setAnneesDetail] = useState(false)
  const { resume, themes, annees, etats, emplacements, boiteNotice, aCompleter, wishlist, activite } = stats

  if (resume.sets === 0) {
    return (
      <div className="vide">
        <p>Ajoute des sets pour voir les stats.</p>
        {wishlist.sets > 0 && <button type="button" className="bouton" onClick={onVoirWishlist}>Voir la wishlist ({wishlist.sets})</button>}
      </div>
    )
  }

  return (
    <div className="stats">
      <div className="kpis">
        <div className="kpi"><span className="kpi__valeur">{nombre(resume.sets)}</span><span className="kpi__libelle">set{resume.sets > 1 ? 's' : ''}</span></div>
        <div className="kpi"><span className="kpi__valeur">{nombre(resume.pieces)}</span><span className="kpi__libelle">pièces</span></div>
        <div className="kpi"><span className="kpi__valeur">{nombre(resume.themes)}</span><span className="kpi__libelle">thème{resume.themes > 1 ? 's' : ''}</span></div>
        {resume.moyennePieces != null && (
          <div className="kpi"><span className="kpi__valeur">{nombre(resume.moyennePieces)}</span><span className="kpi__libelle">pièces par set</span></div>
        )}
      </div>
      {resume.sansPieces > 0 && (
        <p className="stats__note">
          Pièces connues pour {pluriel(resume.sets - resume.sansPieces, 'set')} ({resume.sansPieces} sans).
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
        <Blocs barres={themes} onOuvrir={onOuvrir} onAutres={() => setTousLesThemes((v) => !v)} autresOuvert={tousLesThemes} />
        {themes.length > 1 && (
          <button type="button" className="bouton stats__detail" aria-expanded={tousLesThemes} onClick={() => setTousLesThemes((v) => !v)}>
            {tousLesThemes ? 'Masquer le détail' : `Voir les ${themes.length} thèmes`}
          </button>
        )}
        {tousLesThemes && <Barres barres={themes} onOuvrir={onOuvrir} />}
      </Bloc>

      {annees.length > 0 && (
        <Bloc titre="Par année de sortie">
          <Courbe barres={annees} />
          {annees.filter((b) => b.cle !== '').length >= 2 ? (
            <button type="button" className="bouton stats__detail" aria-expanded={anneesDetail} onClick={() => setAnneesDetail((v) => !v)}>
              {anneesDetail ? 'Masquer le détail' : 'Voir par année'}
            </button>
          ) : null}
          {(anneesDetail || annees.filter((b) => b.cle !== '').length < 2) && <Barres barres={annees} onOuvrir={onOuvrir} />}
        </Bloc>
      )}

      {etats.length > 0 && (
        <Bloc titre="Par état">
          <Anneau barres={etats} total={resume.sets} onOuvrir={onOuvrir} />
        </Bloc>
      )}

      {emplacements.length > 0 && (
        <Bloc titre="Par emplacement">
          <Barres barres={emplacements} onOuvrir={onOuvrir} />
        </Bloc>
      )}

      {boiteNotice && (
        <Bloc titre="Boîte et notice">
          <h3 className="bloc__sous">Boîte</h3>
          <Barres barres={boiteNotice.boite} onOuvrir={onOuvrir} />
          <h3 className="bloc__sous">Notice</h3>
          <Barres barres={boiteNotice.notice} onOuvrir={onOuvrir} />
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
