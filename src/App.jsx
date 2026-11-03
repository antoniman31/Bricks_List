import { useEffect, useMemo, useState } from 'react'
import CarteSet from './components/CarteSet.jsx'
import FiltersSheet from './components/FiltersSheet.jsx'
import FicheSet from './components/FicheSet.jsx'
import FormulaireSet from './components/FormulaireSet.jsx'
import LotSheet from './components/LotSheet.jsx'
import ReglagesSheet from './components/ReglagesSheet.jsx'
import Navigation from './components/Navigation.jsx'
import StatsView from './components/StatsView.jsx'
import { charger, sauver } from './lib/storage.js'
import { ajouter, ajouterPlusieurs, acheter, compterExemplaires, modifier, supprimer } from './lib/collection.js'
import { ETATS } from './lib/model.js'
import { TRIS, filtrer, groupesAnnees, manquants, CHAMPS_A_COMPLETER, themes, trier } from './lib/recherche.js'
import { calculerStats } from './lib/stats.js'
import { appeler } from './lib/api.js'
import { chercherSet, messageErreur } from './lib/rebrickable.js'
import { ecrireCle, ecrireThemes, lireCle, lireThemes } from './lib/reglages.js'
import { COULEUR_BARRE, ecrireMode, lireMode, resoudreTheme } from './lib/apparence.js'

const FILTRES_VIDES = { theme: '', etat: '', annee: '', manque: '' }

function demarrer() {
  const r = charger()
  return { sets: r.sets ?? [], info: r }
}

export default function App() {
  const [depart] = useState(demarrer)
  const [sets, setSets] = useState(depart.sets)
  const [erreurEcriture, setErreurEcriture] = useState('')
  const [cle, setCle] = useState(lireCle)
  const [statut, setStatut] = useState('possédé')
  const [texte, setTexte] = useState('')
  const [filtres, setFiltres] = useState(FILTRES_VIDES)
  const [tri, setTri] = useState('ajout')
  const [feuille, setFeuille] = useState(false)
  const [vueStats, setVueStats] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [mode, setMode] = useState(lireMode)
  // Un seul écran à la fois par-dessus la liste : fiche, formulaire, réglages.
  const [ecran, setEcran] = useState(null)

  // Des données illisibles ne sont jamais remplacées : tant qu'elles sont là,
  // on ne propose aucune écriture, sinon la première modification les
  // écraserait avec une collection presque vide.
  const lectureSeule = Boolean(depart.info.illisible)

  // Toute modification passe par ici : elle est affichée tout de suite, puis
  // enregistrée, et un échec d'écriture se voit au lieu de se perdre.
  function appliquer(nouveaux) {
    setSets(nouveaux)
    const r = sauver(nouveaux)
    setErreurEcriture(r.ok ? '' : `${r.erreur} Les changements sont perdus à la fermeture : exporte la collection.`)
  }

  // Applique le thème résolu, et le suit si le téléphone bascule (en mode
  // automatique) pendant que l'app est ouverte.
  useEffect(() => {
    const systeme = matchMedia('(prefers-color-scheme: dark)')
    const appliquer = () => {
      const theme = resoudreTheme(mode, systeme.matches)
      document.documentElement.dataset.theme = theme
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COULEUR_BARRE[theme])
    }
    appliquer()
    systeme.addEventListener('change', appliquer)
    return () => systeme.removeEventListener('change', appliquer)
  }, [mode])

  function changerMode(nouveau) {
    setMode(nouveau)
    ecrireMode(nouveau)
  }

  function changerCle(nouvelle) {
    const r = ecrireCle(nouvelle)
    if (r.ok) setCle(nouvelle)
    return r
  }

  async function tester(cleATester) {
    try {
      await appeler('/themes/1/', cleATester)
      return { ok: true }
    } catch (e) {
      return { ok: false, message: messageErreur(e) }
    }
  }

  // Le cache de thèmes est sauvegardé même si la recherche échoue en route : les
  // thèmes déjà obtenus ne seront pas redemandés à la tentative suivante.
  async function chercher(numero) {
    const cache = lireThemes()
    try {
      return await chercherSet(numero, (chemin) => appeler(chemin, cle), cache)
    } finally {
      ecrireThemes(cache)
    }
  }

  const duOnglet = useMemo(() => sets.filter((s) => s.statut === statut), [sets, statut])
  const visibles = useMemo(
    () => trier(filtrer(sets, { statut, texte, ...filtres }), tri),
    [sets, statut, texte, filtres, tri],
  )
  const themesConnus = useMemo(() => themes(sets), [sets])
  const stats = useMemo(() => calculerStats(sets), [sets])

  // Les filtres d'un onglet ne veulent rien dire dans l'autre (un état n'existe
  // pas pour un set souhaité) : changer d'onglet les remet à zéro, sinon un
  // filtre survivant afficherait une liste vide sans qu'on comprenne pourquoi.
  function changerOnglet(s) {
    setStatut(s)
    setFiltres(FILTRES_VIDES)
    setTexte('')
  }

  // Touché depuis une barre des statistiques : on arrive sur la liste déjà
  // filtrée, avec les mêmes critères que ceux qui ont produit le chiffre.
  function ouvrirDepuisStats(filtre) {
    setVueStats(false)
    setStatut('possédé')
    setTexte('')
    setFiltres({ ...FILTRES_VIDES, ...filtre })
  }

  // « À compléter » ne propose que ce qui manque réellement, avec le nombre de
  // fiches concernées. Exception : si le filtre est posé au moment où le dernier
  // manque est comblé, il reste, sinon le groupe emporterait avec lui le seul
  // moyen d'enlever un filtre qui vide désormais la liste.
  const aCompleter = manquants(duOnglet).champs.map((c) => ({ valeur: c.cle, libelle: `${c.libelle} (${c.nombre})` }))
  if (filtres.manque !== '' && !aCompleter.some((o) => o.valeur === filtres.manque)) {
    const c = CHAMPS_A_COMPLETER.find((x) => x.cle === filtres.manque)
    if (c) aCompleter.push({ valeur: c.cle, libelle: `${c.libelle} (0)` })
  }

  const groupes = [
    { cle: 'theme', libelle: 'Thème', options: themes(duOnglet).map((t) => ({ valeur: t, libelle: t })) },
    { cle: 'annee', libelle: 'Année', options: groupesAnnees(duOnglet) },
  ]
  if (aCompleter.length > 0) groupes.unshift({ cle: 'manque', libelle: 'À compléter', options: aCompleter })
  if (statut === 'possédé') {
    groupes.splice(1, 0, {
      cle: 'etat',
      libelle: 'État',
      options: ETATS.map((e) => ({ valeur: e, libelle: e })),
    })
  }
  const nbFiltres = groupes.filter((g) => filtres[g.cle] !== '').length
  const filtre = texte !== '' || nbFiltres > 0

  const { erreur, corriges, rejetes } = depart.info
  const fiche = ecran?.type === 'fiche' ? sets.find((s) => s.id === ecran.id) : null
  const fermer = () => setEcran(null)

  // Les sets d'un lot arrivent d'un coup : on affiche l'onglet où ils atterrissent,
  // sans filtre qui les cacherait, et on dit combien ont été ajoutés.
  function ajouterLot(bruts, statutDuLot) {
    const { sets: nouveaux, ajoutes } = ajouterPlusieurs(sets, bruts)
    appliquer(nouveaux)
    setVueStats(false)
    setStatut(statutDuLot)
    setFiltres(FILTRES_VIDES)
    setTexte('')
    setConfirmation(`${ajoutes.length} set${ajoutes.length > 1 ? 's' : ''} ajouté${ajoutes.length > 1 ? 's' : ''}.`)
    fermer()
  }

  return (
    <div className="appli">
      <header className="appli__entete">
        <h1 className="appli__titre">Bricks List</h1>
        <div className="appli__actions">
          <button type="button" className="bouton bouton--plein" disabled={lectureSeule} onClick={() => setEcran({ type: 'formulaire', id: null })}>
            Ajouter
          </button>
          <button type="button" className="bouton" onClick={() => setEcran({ type: 'reglages' })}>Réglages</button>
        </div>
      </header>

      <Navigation
        actuelle={vueStats ? 'stats' : statut}
        nombres={{ possédé: sets.filter((x) => x.statut === 'possédé').length, souhaité: sets.filter((x) => x.statut === 'souhaité').length }}
        onChoisir={(cle) => {
          if (cle === 'stats') return setVueStats(true)
          setVueStats(false)
          if (cle !== statut) changerOnglet(cle)
        }}
      />

      <main className="contenu">
      {erreur && <p className="avis avis--erreur" role="alert">{erreur}{lectureSeule && ' Les modifications sont désactivées pour ne rien écraser.'}</p>}
      {erreurEcriture && <p className="avis avis--erreur" role="alert">{erreurEcriture}</p>}
      {confirmation && (
        <p className="avis" role="status">
          {confirmation} <button type="button" className="lien lien--bouton" onClick={() => setConfirmation('')}>Fermer</button>
        </p>
      )}
      {(corriges > 0 || rejetes > 0) && (
        <p className="avis" role="status">
          {corriges} fiche{corriges > 1 ? 's' : ''} corrigée{corriges > 1 ? 's' : ''}, {rejetes} ignorée{rejetes > 1 ? 's' : ''} au chargement.
        </p>
      )}

      {vueStats ? (
        <StatsView
          stats={stats}
          onOuvrir={ouvrirDepuisStats}
          onVoirWishlist={() => { setVueStats(false); changerOnglet('souhaité') }}
        />
      ) : (
        <>
      <div className="barre">
        <input
          type="search"
          className="champ"
          placeholder="Nom, thème ou numéro"
          aria-label="Rechercher un set"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
        />
        <button type="button" className="bouton" onClick={() => setFeuille(true)}>
          Filtres{nbFiltres > 0 ? ` (${nbFiltres})` : ''}
        </button>
      </div>

      <div className="barre barre--secondaire">
        <p className="compteur" aria-live="polite">
          {filtre ? `${visibles.length} sur ${duOnglet.length}` : duOnglet.length} set{visibles.length > 1 ? 's' : ''}
        </p>
        <label className="tri">
          Tri
          <select className="champ" value={tri} onChange={(e) => setTri(e.target.value)}>
            {TRIS.map((t) => <option key={t.cle} value={t.cle}>{t.libelle}</option>)}
          </select>
        </label>
      </div>

      {visibles.length > 0 ? (
        <ul className="liste">
          {visibles.map((s) => <CarteSet key={s.id} set={s} onOuvrir={(id) => setEcran({ type: 'fiche', id })} />)}
        </ul>
      ) : (
        <div className="vide">
          <p>
            {filtre
              ? 'Aucun set ne correspond à la recherche ou aux filtres.'
              : statut === 'possédé' ? 'Aucun set dans la collection.' : 'La wishlist est vide.'}
          </p>
          {!filtre && !lectureSeule && (
            <button type="button" className="bouton bouton--plein" onClick={() => setEcran({ type: 'formulaire', id: null })}>
              Ajouter un set
            </button>
          )}
        </div>
      )}
        </>
      )}

      </main>

      <FiltersSheet
        ouvert={feuille}
        onFermer={() => setFeuille(false)}
        groupes={groupes}
        filtres={filtres}
        onChanger={(cle, v) => setFiltres((f) => ({ ...f, [cle]: v }))}
        onReinitialiser={() => setFiltres(FILTRES_VIDES)}
        nbResultats={visibles.length}
      />

      {fiche && (
        <FicheSet
          key={fiche.id}
          set={fiche}
          lectureSeule={lectureSeule}
          onFermer={fermer}
          onModifier={() => setEcran({ type: 'formulaire', id: fiche.id })}
          onAcheter={(etat) => { appliquer(acheter(sets, fiche.id, etat)); fermer() }}
          onSupprimer={() => { appliquer(supprimer(sets, fiche.id)); fermer() }}
        />
      )}

      {ecran?.type === 'formulaire' && (
        <FormulaireSet
          initial={ecran.id ? sets.find((s) => s.id === ecran.id) : null}
          statutParDefaut={statut}
          themesConnus={themesConnus}
          compterExemplaires={(numero) => compterExemplaires(sets, numero)}
          aCle={cle !== ''}
          onChercher={chercher}
          onLot={() => setEcran({ type: 'lot' })}
          onFermer={fermer}
          onValider={(brut) => {
            if (ecran.id) {
              appliquer(modifier(sets, ecran.id, brut))
              setEcran({ type: 'fiche', id: ecran.id })
            } else {
              appliquer(ajouter(sets, brut).sets)
              setConfirmation('')
              setStatut(brut.statut)
              setFiltres(FILTRES_VIDES)
              setTexte('')
              fermer()
            }
          }}
        />
      )}

      {ecran?.type === 'lot' && (
        <LotSheet
          sets={sets}
          aCle={cle !== ''}
          statutParDefaut={statut}
          onChercher={chercher}
          onAjouter={ajouterLot}
          onFermer={fermer}
        />
      )}

      {ecran?.type === 'reglages' && (
        <ReglagesSheet
          sets={sets}
          lectureSeule={lectureSeule}
          cle={cle}
          mode={mode}
          onModeChange={changerMode}
          onCleChange={changerCle}
          onTesterCle={tester}
          onAppliquer={appliquer}
          onFermer={fermer}
        />
      )}
    </div>
  )
}
