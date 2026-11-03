import { useEffect, useMemo, useState } from 'react'
import CarteSet from './components/CarteSet.jsx'
import ListeGroupee from './components/ListeGroupee.jsx'
import FiltersSheet from './components/FiltersSheet.jsx'
import FicheSet from './components/FicheSet.jsx'
import FormulaireSet from './components/FormulaireSet.jsx'
import LotSheet from './components/LotSheet.jsx'
import ReglagesSheet from './components/ReglagesSheet.jsx'
import Navigation from './components/Navigation.jsx'
import BarreSelection from './components/BarreSelection.jsx'
import BarreActionsMasse from './components/BarreActionsMasse.jsx'
import MasseSheet from './components/MasseSheet.jsx'
import StatsView from './components/StatsView.jsx'
import { charger, sauver } from './lib/storage.js'
import { ajouter, ajouterPlusieurs, acheter, compterExemplaires, modifier, modifierPlusieurs, supprimer, supprimerPlusieurs } from './lib/collection.js'
import { ETATS } from './lib/model.js'
import { TRIS, emplacements, filtrer, groupesAnnees, grouperParEmplacement, manquants, CHAMPS_A_COMPLETER, rechercherAilleurs, themes, trier } from './lib/recherche.js'
import { calculerStats } from './lib/stats.js'
import { appeler } from './lib/api.js'
import { chercherSet, completerResultat, messageErreur, rechercherSets } from './lib/rebrickable.js'
import { ecrireCle, ecrireThemes, lireCle, lireThemes } from './lib/reglages.js'
import { COULEUR_BARRE, ecrireMode, lireMode, resoudreTheme } from './lib/apparence.js'

const FILTRES_VIDES = { theme: '', etat: '', annee: '', manque: '', emplacement: '', boite: '', notice: '' }
const AUCUN = new Set()
const PRESENTE_ABSENTE = [{ valeur: 'oui', libelle: 'Présente' }, { valeur: 'non', libelle: 'Absente' }]

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
  // null : pas de sélection. Sinon { cle, ids } : `cle` décrit la vue pour laquelle les ids ont été choisis.
  const [selection, setSelection] = useState(null)
  // La dernière modification en masse, pour pouvoir l'annuler : { avant, apres }.
  const [retour, setRetour] = useState(null)
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

  // Recherche par mots du nom, une page à la fois ; le thème n'est résolu que pour le
  // résultat choisi, avec le même cache de thèmes que la recherche par numéro.
  function rechercherNom(mots, page) {
    return rechercherSets(mots, (chemin) => appeler(chemin, cle), { page })
  }

  async function choisirResultat(resultat) {
    const cache = lireThemes()
    try {
      return await completerResultat(resultat, (chemin) => appeler(chemin, cle), cache)
    } finally {
      ecrireThemes(cache)
    }
  }

  const duOnglet = useMemo(() => sets.filter((s) => s.statut === statut), [sets, statut])
  // Le regroupement par emplacement n'existe que pour la collection : un set souhaité
  // n'est rangé nulle part. Le choix de l'utilisateur est gardé, pas écrasé.
  const triEffectif = tri === 'emplacement' && statut !== 'possédé' ? 'ajout' : tri
  const visibles = useMemo(
    () => trier(filtrer(sets, { statut, texte, ...filtres }), triEffectif),
    [sets, statut, texte, filtres, triEffectif],
  )
  const ailleurs = useMemo(
    () => trier(rechercherAilleurs(sets, statut, texte), triEffectif),
    [sets, statut, texte, triEffectif],
  )
  const themesConnus = useMemo(() => themes(sets), [sets])
  const emplacementsConnus = useMemo(() => emplacements(sets), [sets])
  const stats = useMemo(() => calculerStats(sets), [sets])

  // La sélection n'est valable que pour la vue où elle a été faite. Changer la recherche,
  // un filtre ou l'onglet la vide (le mode reste actif) : on ne modifie jamais un set
  // qu'on ne voit pas. Calculé à l'affichage plutôt que vidé à la main dans chaque
  // gestionnaire, pour qu'aucun chemin ne puisse l'oublier.
  const cleVue = `${vueStats}|${statut}|${texte}|${JSON.stringify(filtres)}`
  const choisis = selection && selection.cle === cleVue ? selection.ids : AUCUN
  // Le calcul ci-dessus suffit à ne jamais agir sur une sélection périmée, mais pas à
  // l'oublier : sans ceci, effacer la recherche ferait revenir l'ancienne sélection,
  // puisque la vue redeviendrait identique à celle où elle a été faite. React permet
  // d'ajuster un état pendant le rendu quand il dépend d'un autre ; la condition
  // garantit que cela converge au second passage.
  if (selection && selection.cle !== cleVue) setSelection({ cle: cleVue, ids: new Set() })

  const idsActifs = useMemo(() => new Set(visibles.filter((s) => choisis.has(s.id)).map((s) => s.id)), [visibles, choisis])
  const setsActifs = useMemo(() => visibles.filter((s) => idsActifs.has(s.id)), [visibles, idsActifs])
  const tousChoisis = visibles.length > 0 && idsActifs.size === visibles.length

  function basculerSelection(id) {
    const ids = new Set(idsActifs)
    if (ids.has(id)) ids.delete(id)
    else ids.add(id)
    setSelection({ cle: cleVue, ids })
  }

  // Un groupe entièrement choisi se décoche, sinon il se complète.
  function choisirGroupe(idsGroupe) {
    const ids = new Set(idsActifs)
    if (idsGroupe.every((id) => ids.has(id))) idsGroupe.forEach((id) => ids.delete(id))
    else idsGroupe.forEach((id) => ids.add(id))
    setSelection({ cle: cleVue, ids })
  }

  function toutBasculer() {
    setSelection({ cle: cleVue, ids: tousChoisis ? new Set() : new Set(visibles.map((s) => s.id)) })
  }

  // Une modification en masse garde l'état d'avant : tant que la liste n'a pas bougé
  // depuis (même référence), le bandeau propose de l'annuler. Dès qu'autre chose
  // change, ce bouton disparaît : restaurer écraserait ces changements-là.
  function finMasse(avant, apres, message) {
    appliquer(apres)
    setRetour({ avant, apres })
    setConfirmation(message)
    setSelection(null)
    fermer()
  }

  function appliquerMasse(changements) {
    const n = idsActifs.size
    finMasse(sets, modifierPlusieurs(sets, idsActifs, changements), `${n} set${n > 1 ? 's' : ''} ${'statut' in changements ? (n > 1 ? 'achetés' : 'acheté') : (n > 1 ? 'modifiés' : 'modifié')}.`)
  }

  function supprimerMasse() {
    const n = idsActifs.size
    finMasse(sets, supprimerPlusieurs(sets, idsActifs), `${n} set${n > 1 ? 's' : ''} ${n > 1 ? 'supprimés' : 'supprimé'}.`)
  }

  function annulerMasse() {
    appliquer(retour.avant)
    setRetour(null)
    setConfirmation('Modification annulée.')
  }

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
  if (statut === 'possédé') {
    // Comme « À compléter » : un filtre posé dont la dernière fiche vient de changer
    // doit rester visible, sinon le groupe emporterait avec lui le seul moyen de l'enlever.
    const lieux = emplacements(duOnglet)
    if (filtres.emplacement !== '' && !lieux.includes(filtres.emplacement)) lieux.push(filtres.emplacement)
    if (lieux.length > 0) groupes.push({ cle: 'emplacement', libelle: 'Emplacement', options: lieux.map((l) => ({ valeur: l, libelle: l })) })
    if (filtres.boite !== '' || duOnglet.some((x) => x.boite)) groupes.push({ cle: 'boite', libelle: 'Boîte', options: PRESENTE_ABSENTE })
    if (filtres.notice !== '' || duOnglet.some((x) => x.notice)) groupes.push({ cle: 'notice', libelle: 'Notice', options: PRESENTE_ABSENTE })
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

      {selection && !vueStats ? (
        <BarreActionsMasse
          nombre={idsActifs.size}
          statut={statut}
          onModifier={() => setEcran({ type: 'masse', action: 'modifier' })}
          onSupprimer={() => setEcran({ type: 'masse', action: 'supprimer' })}
        />
      ) : (
      <Navigation
        actuelle={vueStats ? 'stats' : statut}
        nombres={{ possédé: sets.filter((x) => x.statut === 'possédé').length, souhaité: sets.filter((x) => x.statut === 'souhaité').length }}
        onChoisir={(cle) => {
          if (cle === 'stats') return setVueStats(true)
          setVueStats(false)
          if (cle !== statut) changerOnglet(cle)
        }}
      />
      )}

      <main className="contenu">
      {erreur && <p className="avis avis--erreur" role="alert">{erreur}{lectureSeule && ' Les modifications sont désactivées pour ne rien écraser.'}</p>}
      {erreurEcriture && <p className="avis avis--erreur" role="alert">{erreurEcriture}</p>}
      {confirmation && (
        <p className="avis" role="status">
          {confirmation}{' '}
          {retour && sets === retour.apres && (
            <button type="button" className="lien lien--bouton" onClick={annulerMasse}>Annuler</button>
          )}
          <button type="button" className="lien lien--bouton" onClick={() => { setConfirmation(''); setRetour(null) }}>Fermer</button>
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
        <div className="barre__droite">
          {!selection && visibles.length > 0 && !lectureSeule && (
            <button type="button" className="bouton" onClick={() => setSelection({ cle: cleVue, ids: new Set() })}>Sélectionner</button>
          )}
          <label className="tri">
            Tri
            <select className="champ" value={triEffectif} onChange={(e) => setTri(e.target.value)}>
              {TRIS.filter((t) => t.cle !== 'emplacement' || statut === 'possédé').map((t) => <option key={t.cle} value={t.cle}>{t.libelle}</option>)}
            </select>
          </label>
        </div>
      </div>

      {selection && (
        <BarreSelection
          nombre={idsActifs.size}
          total={visibles.length}
          tousSelectionnes={tousChoisis}
          onToutBasculer={toutBasculer}
          onQuitter={() => setSelection(null)}
        />
      )}

      {visibles.length > 0 && triEffectif === 'emplacement' ? (
        <ListeGroupee
          groupes={grouperParEmplacement(visibles)}
          onOuvrir={(id) => setEcran({ type: 'fiche', id })}
          selection={!!selection}
          idsChoisis={idsActifs}
          onBasculer={basculerSelection}
          onChoisirGroupe={choisirGroupe}
        />
      ) : visibles.length > 0 ? (
        <ul className="liste">
          {visibles.map((s) => (
            <CarteSet
              key={s.id}
              set={s}
              onOuvrir={(id) => setEcran({ type: 'fiche', id })}
              selection={selection ? { selectionne: idsActifs.has(s.id) } : undefined}
              onBasculer={basculerSelection}
            />
          ))}
        </ul>
      ) : (
        <div className="vide">
          <p>
            {filtre
              ? `Aucun set ne correspond ici${ailleurs.length > 0 ? ', mais il y en a dans l\'autre onglet' : ' à la recherche ou aux filtres'}.`
              : statut === 'possédé' ? 'Aucun set dans la collection.' : 'La wishlist est vide.'}
          </p>
          {!filtre && !lectureSeule && (
            <button type="button" className="bouton bouton--plein" onClick={() => setEcran({ type: 'formulaire', id: null })}>
              Ajouter un set
            </button>
          )}
        </div>
      )}

      {!selection && ailleurs.length > 0 && (
        <section className="ailleurs" aria-label={`Dans ${statut === 'possédé' ? 'la wishlist' : 'la collection'}`}>
          <h2 className="ailleurs__titre">
            Dans {statut === 'possédé' ? 'la wishlist' : 'la collection'} ({ailleurs.length})
          </h2>
          <ul className="liste">
            {ailleurs.map((s) => <CarteSet key={s.id} set={s} onOuvrir={(id) => setEcran({ type: 'fiche', id })} />)}
          </ul>
        </section>
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
          emplacementsConnus={emplacementsConnus}
          compterExemplaires={(numero) => compterExemplaires(sets, numero)}
          aCle={cle !== ''}
          onChercher={chercher}
          onRechercherNom={rechercherNom}
          onChoisirResultat={choisirResultat}
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

      {ecran?.type === 'masse' && idsActifs.size > 0 && (
        <MasseSheet
          action={ecran.action}
          sets={setsActifs}
          tous={sets}
          statut={statut}
          emplacementsConnus={emplacementsConnus}
          onAppliquer={appliquerMasse}
          onSupprimer={supprimerMasse}
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
