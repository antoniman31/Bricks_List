import { Fragment, useEffect, useState } from 'react'
import { ETATS } from '../lib/model.js'
import { blocsProportionnels } from '../lib/treemap.js'
import { formaterPrix, formaterPrixRond } from '../lib/prix.js'
import { relatif } from '../lib/sortie.js'
import { ONGLETS, ecrireOnglet, lireOnglet } from '../lib/statsOnglet.js'
import { formaterCentimes } from '../lib/prixPiece.js'
import { ecartEntre } from '../lib/frise.js'
import { aujourdhuiISO } from '../lib/dates.js'
import { formaterOctets } from '../lib/octets.js'
import { clesImages, tailleImages } from '../lib/photosDB.js'

const SERIES = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)', 'var(--serie-4)']
// Une couleur par priorité, la même dans « Par priorité » et « Budget par priorité » (jamais selon la position dans la liste).
const COULEUR_PRIORITE = { forte: SERIES[0], 'un-jour': SERIES[1], 'pas-presse': SERIES[2] }
const couleurPriorite = (cle) => COULEUR_PRIORITE[cle] ?? 'var(--serie-vide)'
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

// Un anneau : le total ou le pourcentage au centre, une légende dont chaque ligne qui mène à une liste est un
// bouton. Les couleurs viennent de l'appelant (l'ordre fixe des états, par exemple) ; le sens est toujours écrit
// dans la légende, jamais porté par la couleur seule.
function Anneau({ nom, parts, centre, onOuvrir }) {
  const R = 42
  const C = 2 * Math.PI * R
  const visibles = parts.filter((p) => p.valeur > 0)
  const somme = visibles.reduce((t, p) => t + p.valeur, 0)
  const trou = visibles.length > 1 ? 2.5 : 0
  // Chaque arc commence là où le précédent finit : le décalage cumulé est calculé d'avance, pas pendant le rendu.
  const arcs = visibles.reduce((liste, p) => {
    const debut = liste.length > 0 ? liste[liste.length - 1].debut + liste[liste.length - 1].l : 0
    return [...liste, { p, debut, l: (C * p.valeur) / somme }]
  }, [])
  return (
    <div className="anneau">
      <div className="anneau__dessin">
        <svg viewBox="0 0 120 120" role="img" aria-label={`${nom} : ${visibles.map((p) => `${p.libelle} ${p.affiche ?? p.valeur}`).join(', ')}`}>
          {arcs.map(({ p, debut, l }) => {
            const trait = Math.max(0, l - trou)
            return (
              <circle key={p.cle || 'vide'} cx="60" cy="60" r={R} fill="none" stroke={p.couleur} strokeWidth="14"
                strokeDasharray={`${trait} ${C - trait}`} strokeDashoffset={-debut} transform="rotate(-90 60 60)" />
            )
          })}
        </svg>
        <div className="anneau__centre" aria-hidden="true">
          <span className="anneau__total">{centre.valeur}</span>
          <span className="anneau__unite">{centre.unite}</span>
        </div>
      </div>
      <ul className="anneau__legende">
        {visibles.map((p) => {
          const contenu = (
            <>
              <span className="anneau__pastille" style={{ background: p.couleur }} aria-hidden="true" />
              <span>{p.libelle}</span>
              <span className="anneau__valeur">{p.affiche ?? nombre(p.valeur)}</span>
            </>
          )
          return (
            <li key={p.cle || 'vide'}>
              {p.filtre ? (
                <button type="button" className="anneau__ligne" onClick={() => onOuvrir(p.filtre)}>{contenu}</button>
              ) : (
                <div className="anneau__ligne">{contenu}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Les états en anneau, dans l'ordre fixe des couleurs ; « non renseigné » est gris.
function AnneauEtats({ barres, total, onOuvrir }) {
  const couleur = (b) => { const i = ETATS.indexOf(b.cle); return i >= 0 && i < SERIES.length ? SERIES[i] : 'var(--serie-vide)' }
  const parts = barres.map((b) => ({ cle: b.cle, libelle: majuscule(b.libelle), valeur: b.sets, couleur: couleur(b), filtre: b.filtre }))
  return <Anneau nom="Par état" parts={parts} centre={{ valeur: nombre(total), unite: `set${total > 1 ? 's' : ''}` }} onOuvrir={onOuvrir} />
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

// Les records et repères : chaque ligne qui mène à une liste est un bouton ; les autres sont de simples lignes.
function Records({ stats, onOuvrir }) {
  const { resume, records } = stats
  const lignes = []
  if (resume.plusGros) lignes.push({ cle: 'gros', libelle: 'Plus gros set', valeur: `${resume.plusGros.nom} · ${nombre(resume.plusGros.pieces)} pièces` })
  if (records.plusPetit) lignes.push({ cle: 'petit', libelle: 'Plus petit set', valeur: `${records.plusPetit.nom} · ${nombre(records.plusPetit.pieces)} pièces` })
  if (records.plusAncien) lignes.push({ cle: 'ancien', libelle: 'Plus ancien', valeur: `${records.plusAncien.nom} · ${records.plusAncien.annee}` })
  if (records.plusRecent) lignes.push({ cle: 'recent', libelle: 'Plus récent', valeur: `${records.plusRecent.nom} · ${records.plusRecent.annee}` })
  if (records.themeFavori) lignes.push({ cle: 'theme', libelle: 'Thème préféré', valeur: `${records.themeFavori.libelle} · ${pluriel(records.themeFavori.sets, 'set')}`, filtre: records.themeFavori.filtre })
  if (records.decennie) lignes.push({ cle: 'decennie', libelle: 'Décennie dominante', valeur: `${records.decennie.libelle} · ${pluriel(records.decennie.sets, 'set')}`, filtre: records.decennie.filtre })
  if (records.emplacementPlein) lignes.push({ cle: 'lieu', libelle: 'Emplacement le plus rempli', valeur: `${records.emplacementPlein.libelle} · ${pluriel(records.emplacementPlein.sets, 'set')}`, filtre: records.emplacementPlein.filtre })
  if (records.doublons) lignes.push({ cle: 'doublons', libelle: 'Doublons', valeur: `${pluriel(records.doublons.numeros, 'numéro')} en plusieurs exemplaires (${records.doublons.enTrop} en trop)` })
  if (lignes.length === 0) return null
  return (
    <Bloc titre="Records et repères">
      <ul className="records">
        {lignes.map((l) => (
          <li key={l.cle}>
            {l.filtre ? (
              <button type="button" className="records__ligne records__ligne--bouton" onClick={() => onOuvrir(l.filtre)}>
                <span className="records__libelle">{l.libelle}</span>
                <span className="records__valeur">{l.valeur}</span>
              </button>
            ) : (
              <div className="records__ligne">
                <span className="records__libelle">{l.libelle}</span>
                <span className="records__valeur">{l.valeur}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Bloc>
  )
}

// Colonnes groupées par mois : une couleur par mesure, la légende nomme chacune. Pas cliquable (douze mois × deux
// colonnes ne tiendraient pas en cibles de 48 px) ; le texte alternatif donne tous les chiffres.
function Mensuel({ nom, mois, mesures }) {
  const W = 300, H = 112, PAD = 6
  const bas = H - 16
  const max = Math.max(1, ...mois.flatMap((m) => mesures.map((x) => m[x.cle])))
  const pas = (W - 2 * PAD) / mois.length
  const largeur = Math.min(10, (pas - 4) / mesures.length)
  const court = (m) => new Date(m.annee, m.mois, 1).toLocaleDateString('fr-FR', { month: 'short' })
  const long = (m) => new Date(m.annee, m.mois, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="courbe" role="img"
        aria-label={`${nom} : ${mois.filter((m) => mesures.some((x) => m[x.cle] > 0)).map((m) => `${long(m)} : ${mesures.map((x) => `${m[x.cle]} ${x.libelle.toLowerCase()}`).join(', ')}`).join(' ; ')}`}>
        <line x1={PAD} x2={W - PAD} y1={bas} y2={bas} className="courbe__base" />
        {mois.map((m, i) => {
          const x0 = PAD + i * pas + (pas - largeur * mesures.length) / 2
          return (
            <g key={m.cle}>
              {mesures.map((x, k) => {
                const h = (m[x.cle] / max) * (bas - 12)
                return m[x.cle] > 0 ? <rect key={x.cle} x={x0 + k * largeur} y={bas - h} width={largeur - 1} height={h} rx="2" fill={x.couleur} /> : null
              })}
              {i % 2 === 0 || i === mois.length - 1 ? <text className="courbe__axe" x={PAD + i * pas + pas / 2} y={H - 3} textAnchor="middle">{court(m)}</text> : null}
            </g>
          )
        })}
      </svg>
      <ul className="legende-mesures">
        {mesures.map((x) => (
          <li key={x.cle}><span className="anneau__pastille" style={{ background: x.couleur }} aria-hidden="true" />{x.libelle} <b>{mois.reduce((t, m) => t + m[x.cle], 0)}</b></li>
        ))}
      </ul>
    </div>
  )
}

// L'avancement du montage : la part des pièces déjà montées, et ce qui reste, état par état.
function Avancement({ avancement: a, onOuvrir }) {
  const parts = [
    { cle: 'montees', libelle: 'Montées', valeur: a.montes.pieces, affiche: `${nombre(a.montes.pieces)} pièces`, couleur: 'var(--serie-4)', filtre: { etat: 'monté' } },
    { cle: 'restantes', libelle: 'À monter', valeur: a.restants.pieces, affiche: `${nombre(a.restants.pieces)} pièces`, couleur: 'var(--serie-vide)' },
  ]
  return (
    <>
      {a.pourcentage != null ? (
        <Anneau nom="Avancement du montage" parts={parts} centre={{ valeur: `${a.pourcentage} %`, unite: 'montées' }} onOuvrir={onOuvrir} />
      ) : (
        <p className="stats__note">Pièces inconnues : pourcentage impossible.</p>
      )}
      <h3 className="bloc__sous">À monter · {pluriel(a.restants.sets, 'set')}</h3>
      <Barres barres={a.parEtat} onOuvrir={onOuvrir} />
      {(a.sansEtat > 0 || a.sansPieces > 0) && (
        <p className="stats__note">
          {a.sansEtat > 0 && `${pluriel(a.sansEtat, 'set')} sans état, non comptés. `}
          {a.sansPieces > 0 && `${pluriel(a.sansPieces, 'set')} sans pièces, comptés dans les sets seulement.`}
        </p>
      )}
    </>
  )
}

// Des lignes « libellé · valeur », comme « Records et repères » : une ligne qui mène quelque part est un vrai bouton.
function Lignes({ lignes }) {
  return (
    <ul className="records">
      {lignes.map((l) => (
        <li key={l.cle}>
          {l.onClick ? (
            <button type="button" className="records__ligne records__ligne--bouton" onClick={l.onClick}>
              <span className="records__libelle records__libelle--souple">{l.libelle}</span>
              <span className="records__valeur">{l.valeur}</span>
            </button>
          ) : (
            <div className="records__ligne">
              <span className="records__libelle records__libelle--souple">{l.libelle}</span>
              <span className="records__valeur">{l.valeur}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

// Ce que l'appareil garde comme images (photos, boîtes, rendus, images Brickset) et la place qu'elles prennent : lu à l'ouverture de l'onglet.
function ImagesAppareil() {
  const [r, setR] = useState(null)
  useEffect(() => {
    let actif = true
    Promise.all([clesImages(), tailleImages()])
      .then(([cles, octets]) => { if (actif) setR({ cles, octets }) })
      .catch(() => { if (actif) setR({ erreur: true }) })
    return () => { actif = false }
  }, [])
  if (r === null) return <p className="stats__note">Lecture des images…</p>
  if (r.erreur) return <p className="stats__note">Les images de l'appareil n'ont pas pu être lues.</p>
  const n = (g) => (r.cles[g] ?? []).length
  const total = n('photos') + n('boites') + n('rendus') + n('extras')
  if (total === 0) return <p className="stats__note">Aucune image gardée sur cet appareil.</p>
  return (
    <Lignes
      lignes={[
        { cle: 'photos', libelle: 'Photos à toi', valeur: nombre(n('photos')) },
        { cle: 'boites', libelle: 'Boîtes', valeur: nombre(n('boites')) },
        { cle: 'rendus', libelle: 'Rendus Rebrickable', valeur: nombre(n('rendus')) },
        { cle: 'extras', libelle: 'Images Brickset', valeur: nombre(n('extras')) },
        { cle: 'place', libelle: 'Place prise', valeur: formaterOctets(r.octets) },
      ]}
    />
  )
}

// La hauteur de l'en-tête de l'appli (collé en haut) : la barre des sous-onglets se colle juste dessous.
function useHauteurEntete() {
  const [h, setH] = useState(72)
  useEffect(() => {
    const el = document.querySelector('.entete')
    if (!el) return undefined
    const mesurer = () => setH(el.offsetHeight)
    mesurer()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(mesurer)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return h
}

function Bloc({ titre, children }) {
  return (
    <section className="bloc">
      <h2 className="bloc__titre">{titre}</h2>
      {children}
    </section>
  )
}

export default function StatsView({ stats, onOuvrir, onOuvrirSet, onVoirWishlist }) {
  const [onglet, setOnglet] = useState(lireOnglet)
  const hauteurEntete = useHauteurEntete()
  const choisirOnglet = (cle) => { setOnglet(cle); ecrireOnglet(cle); window.scrollTo({ top: 0 }) }
  const [tousLesThemes, setTousLesThemes] = useState(false)
  const [anneesDetail, setAnneesDetail] = useState(false)
  const { resume, themes, annees, etats, tailles, etiquettes, emplacements, boiteNotice, aCompleter, wishlist, activite, avancement, mensuel, delai, sousThemes, extremes, pileAncienne, donnees } = stats

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
      <div className="stats__onglets" role="tablist" aria-label="Sections des statistiques" style={{ '--haut-entete': `${hauteurEntete}px` }}>
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            type="button"
            role="tab"
            id={`stats-onglet-${o.cle}`}
            aria-selected={onglet === o.cle}
            aria-controls="stats-panneau"
            tabIndex={onglet === o.cle ? 0 : -1}
            className="puce puce--onglet"
            onClick={() => choisirOnglet(o.cle)}
            onKeyDown={(e) => {
              const i = ONGLETS.findIndex((x) => x.cle === o.cle)
              const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
              if (!d) return
              e.preventDefault()
              const suivant = ONGLETS[(i + d + ONGLETS.length) % ONGLETS.length].cle
              choisirOnglet(suivant)
              document.getElementById(`stats-onglet-${suivant}`)?.focus()
            }}
          >
            {o.libelle}
          </button>
        ))}
      </div>

      <div className="stats__panneau" role="tabpanel" id="stats-panneau" aria-labelledby={`stats-onglet-${onglet}`}>
        {onglet === 'apercu' && (
          <>
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
          {resume.medianePieces != null && (
            <p className="stats__note">Médiane : {nombre(resume.medianePieces)} pièces par set.</p>
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

          <Records stats={stats} onOuvrir={onOuvrir} />

          {donnees && (
            <Bloc titre="Données">
              <Lignes
                lignes={[
                  { cle: 'sortie', libelle: 'Date de sortie connue', valeur: `${nombre(donnees.dateSortie)} sur ${nombre(donnees.sets)}` },
                  { cle: 'sous', libelle: 'Sous-thème connu', valeur: `${nombre(donnees.sousTheme)} sur ${nombre(donnees.sets)}` },
                ]}
              />
              <h3 className="bloc__sous">Images gardées</h3>
              <ImagesAppareil />
            </Bloc>
          )}
          </>
        )}
        {onglet === 'repartition' && (
          <>
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
              <AnneauEtats barres={etats} total={resume.sets} onOuvrir={onOuvrir} />
            </Bloc>
          )}

          {tailles.some((b) => b.cle !== '') && (
            <Bloc titre="Taille des sets">
              <Barres barres={tailles} onOuvrir={onOuvrir} />
            </Bloc>
          )}

          {etiquettes.barres.length > 0 && (
            <Bloc titre="Étiquettes les plus utilisées">
              <Barres barres={etiquettes.barres} onOuvrir={onOuvrir} />
              {etiquettes.total > etiquettes.barres.length && (
                <p className="stats__note">{etiquettes.barres.length} sur {etiquettes.total} étiquettes.</p>
              )}
            </Bloc>
          )}

          {sousThemes && (
            <Bloc titre="Par sous-thème">
              <Barres barres={sousThemes.barres} onOuvrir={onOuvrir} />
              <p className="stats__note">
                {sousThemes.barres.length} sur {pluriel(sousThemes.distincts, 'sous-thème')}
                {sousThemes.sans > 0 && ` · ${pluriel(sousThemes.sans, 'set')} sans sous-thème connu`}.
              </p>
            </Bloc>
          )}

          {extremes && (
            <Bloc titre="Les plus gros et les plus petits">
              <h3 className="bloc__sous">Les plus gros</h3>
              <Lignes lignes={extremes.gros.map((x) => ({ cle: `g-${x.id}`, libelle: x.nom, valeur: `${nombre(x.pieces)} pièces`, onClick: () => onOuvrirSet(x.id) }))} />
              <h3 className="bloc__sous">Les plus petits</h3>
              <Lignes lignes={extremes.petits.map((x) => ({ cle: `p-${x.id}`, libelle: x.nom, valeur: `${nombre(x.pieces)} pièces`, onClick: () => onOuvrirSet(x.id) }))} />
            </Bloc>
          )}
          </>
        )}
        {onglet === 'suivi' && (
          <>
          {avancement && (
            <Bloc titre="Avancement et pile à monter">
              <Avancement avancement={avancement} onOuvrir={onOuvrir} />
            </Bloc>
          )}

          {(mensuel || delai || activite) && (
            <Bloc titre="Activité">
              {activite && (
                <p className="stats__note">
                  En {activite.annee} : {pluriel(activite.achetes, 'set')} {activite.achetes > 1 ? 'achetés' : 'acheté'}, {pluriel(activite.montes, 'set')} {activite.montes > 1 ? 'montés' : 'monté'}.
                </p>
              )}
              {mensuel && (mensuel.achetes > 0 || mensuel.montes > 0) && (
                <>
                  <h3 className="bloc__sous">Achats et montages, 12 mois</h3>
                  <Mensuel nom="Achats et montages par mois" mois={mensuel.mois}
                    mesures={[{ cle: 'achetes', libelle: 'Achats', couleur: 'var(--serie-1)' }, { cle: 'montes', libelle: 'Montages', couleur: 'var(--serie-2)' }]} />
                </>
              )}
              {delai && (
                <p className="stats__note">
                  Délai moyen entre achat et montage : {pluriel(delai.jours, 'jour')} (sur {pluriel(delai.sets, 'set')}).
                </p>
              )}
              {mensuel && mensuel.ajoutes > 0 && (
                <>
                  <h3 className="bloc__sous">Sets ajoutés, 12 mois</h3>
                  <Mensuel nom="Sets ajoutés par mois" mois={mensuel.mois} mesures={[{ cle: 'ajoutes', libelle: 'Ajoutés', couleur: 'var(--serie-3)' }]} />
                </>
              )}
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

          {pileAncienne && (
            <Bloc titre="À monter depuis le plus longtemps">
              <Lignes
                lignes={pileAncienne.liste.map((x) => ({ cle: x.id, libelle: x.nom, valeur: `depuis ${ecartEntre(x.dateAchat, aujourdhuiISO()) || 'aujourd\'hui'}`, onClick: () => onOuvrirSet(x.id) }))}
              />
              {pileAncienne.sansDate > 0 && (
                <p className="stats__note">{pluriel(pileAncienne.sansDate, 'set')} à monter sans date d'achat, non {pileAncienne.sansDate > 1 ? 'classés' : 'classé'}.</p>
              )}
            </Bloc>
          )}
          </>
        )}
        {onglet === 'wishlist' && (
          <>
          <Bloc titre="Wishlist">
            {wishlist.sets === 0 ? (
              <p className="stats__note">Aucun set souhaité.</p>
            ) : (
              <>
                <div className={`kpis ${1 + (wishlist.pieces > 0 ? 1 : 0) + (wishlist.budget ? 1 : 0) === 3 ? 'kpis--trois' : 'kpis--deux'}`}>
                  <div className="kpi"><span className="kpi__valeur">{nombre(wishlist.sets)}</span><span className="kpi__libelle">set{wishlist.sets > 1 ? 's' : ''} à acquérir</span></div>
                  {wishlist.pieces > 0 && (
                    <div className="kpi"><span className="kpi__valeur">{nombre(wishlist.pieces)}</span><span className="kpi__libelle">pièces{wishlist.sansPieces > 0 ? ' connues' : ''}</span></div>
                  )}
                  {wishlist.budget && (
                    <div className="kpi"><span className="kpi__valeur">{formaterPrixRond(wishlist.budget.total)}</span><span className="kpi__libelle">budget</span></div>
                  )}
                </div>
                {wishlist.priorites.length > 0 && (
                  <div className="wishlist__priorites">
                    <h3 className="bloc__sous">Par priorité</h3>
                    <div className="empile" role="img" aria-label={`Par priorité : ${wishlist.priorites.map((p) => `${p.libelle} ${p.sets}`).join(', ')}`}>
                      {wishlist.priorites.map((p) => (
                        <span key={p.cle || 'vide'} style={{ flex: p.sets, background: couleurPriorite(p.cle) }} />
                      ))}
                    </div>
                    <ul className="legende-mesures">
                      {wishlist.priorites.map((p) => (
                        <li key={p.cle || 'vide'}><span className="anneau__pastille" style={{ background: couleurPriorite(p.cle) }} aria-hidden="true" />{p.libelle} <b>{p.sets}</b></li>
                      ))}
                    </ul>
                  </div>
                )}
                {wishlist.budget && wishlist.budget.priorites.some((p) => p.cle !== '') && (
                  <div className="wishlist__budget">
                    <h3 className="bloc__sous">Budget par priorité</h3>
                    <div className="empile" role="img" aria-label={`Budget par priorité : ${wishlist.budget.priorites.map((p) => `${p.libelle} ${formaterPrix(p.montant)}`).join(', ')}`}>
                      {wishlist.budget.priorites.map((p) => (
                        <span key={p.cle || 'vide'} style={{ flex: p.montant, background: couleurPriorite(p.cle) }} />
                      ))}
                    </div>
                    {/* Les montants sur une seule ligne : une colonne par priorité (quatre au plus, la quatrième s'appelle « Autre »). */}
                    <ul className={`budget__colonnes${wishlist.budget.priorites.length > 3 ? ' budget__colonnes--serre' : ''}`} style={{ '--n': wishlist.budget.priorites.length }}>
                      {wishlist.budget.priorites.map((p) => (
                        <li key={p.cle || 'vide'}>
                          <span className="budget__nom"><span className="anneau__pastille" style={{ background: couleurPriorite(p.cle) }} aria-hidden="true" />{p.cle === '' && wishlist.budget.priorites.length > 3 ? 'Autre' : p.libelle}</span>
                          <b>{formaterPrix(p.montant)}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {wishlist.budget && (wishlist.budget.sansPrix > 0 || wishlist.budget.prixDE) && (
                  <p className="stats__note">
                    {wishlist.budget.sansPrix > 0 && `${wishlist.budget.sansPrix} set${wishlist.budget.sansPrix > 1 ? 's' : ''} sans prix, non compté${wishlist.budget.sansPrix > 1 ? 's' : ''}. `}
                    {wishlist.budget.prixDE && 'Certains prix sont des prix allemands.'}
                  </p>
                )}
                <button type="button" className="bouton" onClick={onVoirWishlist}>Voir la wishlist</button>
              </>
            )}
          </Bloc>

          {wishlist.urgent && (
            <Bloc titre="À acheter vite">
              <Lignes
                lignes={[
                  { cle: 'bientot', libelle: 'Retrait dans les 6 mois', valeur: wishlist.urgent.bientot.sets === 0 ? 'aucun set' : `${pluriel(wishlist.urgent.bientot.sets, 'set')}${wishlist.urgent.bientot.avecPrix > 0 ? ` · ${formaterPrix(wishlist.urgent.bientot.montant)}` : ''}` },
                  ...(wishlist.urgent.retires.length > 0 ? [{ cle: 'retires', libelle: 'Déjà retirés', valeur: pluriel(wishlist.urgent.retires.length, 'set') }] : []),
                ]}
              />
              {wishlist.urgent.bientot.sansPrix > 0 && (
                <p className="stats__note">{pluriel(wishlist.urgent.bientot.sansPrix, 'set')} sans prix, non {wishlist.urgent.bientot.sansPrix > 1 ? 'comptés' : 'compté'}.</p>
              )}
              {wishlist.urgent.retires.length > 0 && (
                <p className="stats__note">Plus à la vente : {wishlist.urgent.retires.slice(0, 5).map((x) => x.nom).join(', ')}{wishlist.urgent.retires.length > 5 ? '…' : ''}.</p>
              )}
            </Bloc>
          )}

          {wishlist.prixPiece && (
            <Bloc titre="Prix par pièce">
              <Lignes lignes={[{ cle: 'moyen', libelle: 'Prix moyen', valeur: formaterCentimes(wishlist.prixPiece.moyen) }]} />
              <h3 className="bloc__sous">Les moins chers la pièce</h3>
              <Lignes lignes={wishlist.prixPiece.meilleurs.map((x) => ({ cle: `m-${x.id}`, libelle: x.nom, valeur: formaterCentimes(x.ct), onClick: () => onOuvrirSet(x.id) }))} />
              <h3 className="bloc__sous">Les plus chers la pièce</h3>
              <Lignes lignes={wishlist.prixPiece.pires.map((x) => ({ cle: `c-${x.id}`, libelle: x.nom, valeur: formaterCentimes(x.ct), onClick: () => onOuvrirSet(x.id) }))} />
              <p className="stats__note">Sur {pluriel(wishlist.prixPiece.sets, 'set')} qui ont un prix et un nombre de pièces.</p>
            </Bloc>
          )}

          {wishlist.budgetThemes && (
            <Bloc titre="Budget par thème">
              <Lignes lignes={wishlist.budgetThemes.map((t) => ({ cle: t.cle || 'sans', libelle: `${t.libelle} · ${pluriel(t.sets, 'set')}`, valeur: formaterPrix(t.montant) }))} />
            </Bloc>
          )}

          {wishlist.avenir.length > 0 && (
            <Bloc titre="À venir">
              <ol className="avenir">
                {wishlist.avenir.map((m) => (
                  <Fragment key={m.cle}>
                    <li className="avenir__mois">{m.libelle}</li>
                    {m.evenements.map((e) => (
                      <li key={`${e.id}-${e.type}`} className={`avenir__evt avenir__evt--${e.type}`}>
                        <span className="avenir__jour" aria-hidden="true"><b>{e.jour}</b><span>{e.moisCourt}</span></span>
                        <button type="button" className="avenir__bloc" onClick={() => onOuvrirSet(e.id)}>
                          <span className="avenir__nom">{e.nom}</span>
                          <span className="avenir__det">
                            <span className={`avenir__chip avenir__chip--${e.type}`}>{e.type === 'retrait' ? 'Retrait' : 'Sortie'}</span>
                            {`le ${e.jour} ${e.moisCourt} · ${relatif(e.jours)}`}
                            {e.prix != null && ` · ${formaterPrix(e.prix)}`}
                          </span>
                        </button>
                      </li>
                    ))}
                  </Fragment>
                ))}
              </ol>
            </Bloc>
          )}
          </>
        )}
      </div>
    </div>
  )
}
