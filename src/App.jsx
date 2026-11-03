import { useEffect, useMemo, useState } from 'react'
import CarteSet from './components/CarteSet.jsx'
import ListeGroupee from './components/ListeGroupee.jsx'
import { copierTexte } from './lib/fichier.js'
import { cleEtiquette, etiquettesConnues as etiquettesDe } from './lib/etiquettes.js'
import useLarge from './useLarge.js'
import { surveillerMisesAJour } from './lib/miseAJour.js'
import { autreVue, ecrireVue, lireVue } from './lib/vue.js'
import { texteWishlist } from './lib/wishlist.js'
import FiltersSheet from './components/FiltersSheet.jsx'
import FicheSet, { FicheContenu } from './components/FicheSet.jsx'
import FormulaireSet from './components/FormulaireSet.jsx'
import LotSheet from './components/LotSheet.jsx'
import ReglagesSheet from './components/ReglagesSheet.jsx'
import { demanderPersistance, etatSauvegarde, libelleDelai, lireDerniereSauvegarde, noterSauvegarde } from './lib/sauvegarde.js'
import Navigation from './components/Navigation.jsx'
import Icone from './components/Icones.jsx'
import BarreSelection from './components/BarreSelection.jsx'
import BarreActionsMasse from './components/BarreActionsMasse.jsx'
import MasseSheet from './components/MasseSheet.jsx'
import StatsView from './components/StatsView.jsx'
import { charger, sauver } from './lib/storage.js'
import { ajouter, ajouterPlusieurs, acheter, compterExemplaires, modifier, modifierPlusieurs, supprimer, supprimerPlusieurs } from './lib/collection.js'
import { ETATS, LIBELLES_PRIORITE, PRIORITES } from './lib/model.js'
import { TRIS, emplacements, filtrer, groupesAnnees, grouperParEmplacement, comptesEmplacements, manquants, triPourOnglet, CHAMPS_A_COMPLETER, rechercherAilleurs, themes, trier } from './lib/recherche.js'
import { calculerStats } from './lib/stats.js'
import { appeler } from './lib/api.js'
import { chercherSet, completerResultat, messageErreur, rechercherSets } from './lib/rebrickable.js'
import { ecrireCle, ecrireThemes, lireCle, lireThemes } from './lib/reglages.js'
import { COULEUR_BARRE, LIBELLES, ecrireMode, lireMode, modeSuivant, resoudreTheme } from './lib/apparence.js'

const FILTRES_VIDES = { theme: '', etat: '', annee: '', manque: '', emplacement: '', boite: '', notice: '', priorite: '', etiquette: '' }
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
  const [derniereSauvegarde, setDerniereSauvegarde] = useState(() => lireDerniereSauvegarde())
  const [persistance, setPersistance] = useState('inconnu')
  // Vrai pendant la saisie dans la recherche : sur téléphone, la barre du bas se range pour
  // laisser la place au clavier (sinon barre + recherche le coiffent tous les deux).
  const [saisie, setSaisie] = useState(false)
  const [vue, setVue] = useState(lireVue)
  const large = useLarge()
  // Une nouvelle version de l'app est prête : on propose de recharger, sans le faire de force.
  const [majPrete, setMajPrete] = useState(false)
  useEffect(() => surveillerMisesAJour({ quandPrete: () => setMajPrete(true) }), [])
  // Le détail du set sélectionné dans la liste, quand le panneau de droite est affiché.
  const [detailId, setDetailId] = useState(null)
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
  const rappel = etatSauvegarde({ nbSets: sets.length, derniere: derniereSauvegarde })

  // Toute modification passe par ici : elle est affichée tout de suite, puis
  // enregistrée, et un échec d'écriture se voit au lieu de se perdre.
  function appliquer(nouveaux) {
    setSets(nouveaux)
    const r = sauver(nouveaux)
    setErreurEcriture(r.ok ? '' : `${r.erreur} Changements non enregistrés : exporte la collection.`)
  }

  // Chrome tranche seul si le stockage est protégé : on le demande une fois au démarrage
  // et on affiche son verdict dans les Réglages.
  useEffect(() => {
    let actif = true
    demanderPersistance().then((v) => { if (actif) setPersistance(v) })
    return () => { actif = false }
  }, [])

  // Appelé par les Réglages après un export réussi. Un échec d'écriture de la date
  // n'empêche pas la sauvegarde elle-même : on le rend à l'appelant pour l'afficher.
  function sauvegardeFaite() {
    const maintenant = new Date()
    const r = noterSauvegarde(maintenant)
    if (r.ok) setDerniereSauvegarde(maintenant.toISOString())
    return r
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
  const triEffectif = triPourOnglet(tri, statut)
  const visibles = useMemo(
    () => trier(filtrer(sets, { statut, texte, ...filtres }), triEffectif),
    [sets, statut, texte, filtres, triEffectif],
  )
  const ailleurs = useMemo(
    () => trier(rechercherAilleurs(sets, statut, texte), triEffectif),
    [sets, statut, texte, triEffectif],
  )
  const themesConnus = useMemo(() => themes(sets), [sets])
  const emplacementsConnus = useMemo(() => comptesEmplacements(sets), [sets])
  // Le lieu du set ajouté le plus récemment : on range souvent plusieurs sets à la suite.
  const lieuRecent = useMemo(() => {
    const dernier = sets.filter((s) => s.emplacement).sort((a, b) => String(b.dateAjout).localeCompare(String(a.dateAjout)))[0]
    return dernier?.emplacement ?? ''
  }, [sets])
  const etiquettesUtilisees = useMemo(() => etiquettesDe(sets), [sets])
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

  // Copie la liste AFFICHÉE (filtres compris) : filtrer sur « envie forte » puis copier
  // donne exactement la liste à envoyer pour un anniversaire.
  async function copierWishlist() {
    const n = visibles.length
    const r = await copierTexte(texteWishlist(visibles))
    if (r === 'annule') return
    setRetour(null)
    setConfirmation(r === 'echec'
      ? 'La copie a échoué : ce navigateur n\'autorise pas le presse-papiers ici.'
      : `${n} set${n > 1 ? 's' : ''} ${r === 'copie' ? 'copié' : 'partagé'}${n > 1 ? 's' : ''} sous forme de texte.`)
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
  if (statut === 'souhaité') {
    groupes.splice(1, 0, { cle: 'priorite', libelle: 'Priorité', options: PRIORITES.map((p) => ({ valeur: p, libelle: LIBELLES_PRIORITE[p] })) })
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
  // Comme l'emplacement : un filtre posé dont la dernière fiche vient de changer reste visible.
  const etiquettesOnglet = etiquettesDe(duOnglet)
  if (filtres.etiquette !== '' && !etiquettesOnglet.some((e) => cleEtiquette(e) === cleEtiquette(filtres.etiquette))) etiquettesOnglet.push(filtres.etiquette)
  if (etiquettesOnglet.length > 0) groupes.push({ cle: 'etiquette', libelle: 'Étiquette', options: etiquettesOnglet.map((e) => ({ valeur: e, libelle: e })) })
  const nbFiltres = groupes.filter((g) => filtres[g.cle] !== '').length
  const filtre = texte !== '' || nbFiltres > 0

  // Taper sur Filtres ou Ajouter pendant la saisie ferait perdre le focus au champ : la barre du bas
  // réapparaîtrait et la recherche remonterait AVANT la fin du tap, qui tomberait à côté et serait
  // perdu. On empêche ce changement de focus : le champ le garde, et la feuille qui s'ouvre le prend.
  const garderFocus = (e) => e.preventDefault()

  // Ce que dit l'en-tête sous le nom : la section, et combien de sets elle montre.
  const nomSection = vueStats ? 'Stats' : statut === 'possédé' ? 'Collection' : 'Wishlist'
  const nbAffiches = vueStats ? sets.length : filtre ? `${visibles.length} sur ${duOnglet.length}` : duOnglet.length
  const nbPourPluriel = vueStats ? sets.length : visibles.length
  const contexte = `${nomSection} · ${nbAffiches} set${nbPourPluriel > 1 ? 's' : ''}`

  const { erreur, corriges, rejetes } = depart.info
  // Panneau de détail : grand écran et affichage en liste. En grille (tuiles larges, pas de colonne
  // pour un panneau) et sur téléphone, le détail s'ouvre en feuille, comme avant.
  const panneau = large && vue === 'liste' && !vueStats
  const ouvrirFiche = (id) => (panneau ? setDetailId(id) : setEcran({ type: 'fiche', id }))
  // Le panneau ne montre qu'un set de la liste affichée : le set choisi, sinon le premier. Un set
  // qui sort de la liste (filtre, achat, suppression) laisse donc la place au suivant, sans état à purger.
  const detail = panneau && !selection ? (visibles.find((s) => s.id === detailId) ?? visibles[0] ?? null) : null
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
    <div className={`appli${saisie ? ' appli--saisie' : ''}${panneau ? ' appli--panneau' : ''}`}>
      {/* En-tête permanent : le nom et le contexte restent en haut quand on défile. Le compte
          est annoncé aux lecteurs d'écran à chaque changement (recherche, filtres). */}
      <header className="entete">
        <img className="entete__logo" src={`${import.meta.env.BASE_URL}favicon.svg`} width="40" height="40" alt="" />
        <div className="entete__titres">
          <h1 className="appli__titre">Bricks-List</h1>
          <p className="entete__contexte" aria-live="polite">{contexte}</p>
        </div>
        <p className="visuellement-cache" role="status">Thème : {LIBELLES[mode].toLowerCase()}</p>
        <div className="entete__actions">
          {!vueStats && !selection && visibles.length > 0 && !lectureSeule && (
            <button type="button" className="icone-btn" aria-label="Sélectionner des sets" onClick={() => setSelection({ cle: cleVue, ids: new Set() })}>
              <Icone nom="selection" />
            </button>
          )}
          {/* Un seul bouton, qui propose l'autre affichage : son icône est celle qu'on obtiendra. */}
          {!vueStats && (
            <button type="button" className="icone-btn" aria-label={vue === 'liste' ? 'Afficher en grille' : 'Afficher en liste'} onClick={() => { const v = autreVue(vue); setVue(v); ecrireVue(v) }}>
              <Icone nom={vue === 'liste' ? 'grille' : 'liste'} />
            </button>
          )}
          {/* L'icône montre le thème actuel ; un appui passe au suivant (auto, clair, sombre). Pas de
              message visible : le changement se voit à l'écran, et le nom du bouton + la zone
              ci-dessous le disent aux lecteurs d'écran. */}
          <button
            type="button"
            className="icone-btn"
            aria-label={`Thème : ${LIBELLES[mode].toLowerCase()}. Passer à ${LIBELLES[modeSuivant(mode)].toLowerCase()}`}
            onClick={() => changerMode(modeSuivant(mode))}
          >
            <Icone nom={mode === 'auto' ? 'auto' : mode === 'light' ? 'clair' : 'sombre'} />
          </button>
          <button type="button" className="icone-btn" aria-label="Réglages" onClick={() => setEcran({ type: 'reglages' })}>
            <Icone nom="reglages" />
          </button>
        </div>
      </header>

      {/* Recherche, filtres et « Ajouter » : en bas sur téléphone (là où le pouce arrive), en haut
          de la liste sur grand écran, sans changer de balisage : c'est le CSS qui les déplace. */}
      {!selection && (
        <div className={`dock${vueStats ? ' dock--seul' : ''}`}>
          {!vueStats && (
            <>
              <input
                type="search"
                className="dock__champ"
                placeholder="Nom, thème ou numéro"
                aria-label="Rechercher un set"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                onFocus={() => setSaisie(true)}
                onBlur={() => setSaisie(false)}
              />
              <button
                type="button"
                className="icone-btn icone-btn--plein"
                aria-label={`Filtres et tri${nbFiltres > 0 ? `, ${nbFiltres} actif${nbFiltres > 1 ? 's' : ''}` : ''}`}
                onMouseDown={garderFocus}
                onClick={() => setFeuille(true)}
              >
                <Icone nom="filtres" />
                {nbFiltres > 0 && <span className="icone-btn__badge" aria-hidden="true">{nbFiltres}</span>}
              </button>
            </>
          )}
          <button type="button" className="fab" aria-label="Ajouter un set" disabled={lectureSeule} onMouseDown={garderFocus} onClick={() => setEcran({ type: 'formulaire', id: null })}>
            <Icone nom="plus" />
            <span className="fab__libelle" aria-hidden="true">Ajouter</span>
          </button>
        </div>
      )}

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
      {erreur && <p className="avis avis--erreur" role="alert">{erreur}{lectureSeule && ' Modifications désactivées.'}</p>}
      {erreurEcriture && <p className="avis avis--erreur" role="alert">{erreurEcriture}</p>}
      {rappel.rappel && !selection && ecran?.type !== 'reglages' && (
        <p className="avis" role="status">
          Dernière sauvegarde : {libelleDelai(rappel.jours)}.{' '}
          <button type="button" className="lien lien--bouton" onClick={() => setEcran({ type: 'reglages' })}>Sauvegarder</button>
        </p>
      )}
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
      {!selection && statut === 'souhaité' && visibles.length > 0 && (
        <div className="outils">
          <button type="button" className="bouton" onClick={copierWishlist}>Copier la liste</button>
        </div>
      )}

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
          onOuvrir={ouvrirFiche}
          idCourant={detail?.id}
          selection={!!selection}
          idsChoisis={idsActifs}
          onBasculer={basculerSelection}
          onChoisirGroupe={choisirGroupe}
          vue={vue}
        />
      ) : visibles.length > 0 ? (
        <ul className={`liste${vue === 'grille' ? ' liste--grille' : ''}`}>
          {visibles.map((s) => (
            <CarteSet
              key={s.id}
              set={s}
              vue={vue}
              onOuvrir={ouvrirFiche}
              courante={detail?.id === s.id}
              selection={selection ? { selectionne: idsActifs.has(s.id) } : undefined}
              onBasculer={basculerSelection}
            />
          ))}
        </ul>
      ) : (
        <div className="vide">
          <p>
            {filtre
              ? `Aucun résultat${ailleurs.length > 0 ? ' (il y en a dans l\'autre onglet)' : ''}.`
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
            {ailleurs.map((s) => <CarteSet key={s.id} set={s} onOuvrir={ouvrirFiche} />)}
          </ul>
        </section>
      )}
        </>
      )}

      </main>

      {majPrete && (
        <div className="maj" role="status">
          <span className="maj__texte">Une nouvelle version est disponible.</span>
          <button type="button" className="bouton" onClick={() => setMajPrete(false)}>Plus tard</button>
          <button type="button" className="bouton bouton--plein" onClick={() => location.reload()}>Recharger</button>
        </div>
      )}

      {panneau && (
        <aside className="detail" aria-label="Détail du set">
          {detail ? (
            <>
              <h2 className="detail__titre">{detail.nom}</h2>
              <FicheContenu
                key={detail.id}
                set={detail}
                lectureSeule={lectureSeule}
                lieux={emplacementsConnus}
                lieuRecent={lieuRecent}
                onRanger={(v) => appliquer(modifier(sets, detail.id, { emplacement: v }))}
                onModifier={() => setEcran({ type: 'formulaire', id: detail.id })}
                onAcheter={(etat) => appliquer(acheter(sets, detail.id, etat))}
                onSupprimer={() => appliquer(supprimer(sets, detail.id))}
              />
            </>
          ) : (
            <p className="detail__vide">{selection ? 'Coche des sets dans la liste.' : 'Aucun set à afficher.'}</p>
          )}
        </aside>
      )}

      <FiltersSheet
        ouvert={feuille}
        onFermer={() => setFeuille(false)}
        groupes={groupes}
        filtres={filtres}
        onChanger={(cle, v) => setFiltres((f) => ({ ...f, [cle]: v }))}
        onReinitialiser={() => setFiltres(FILTRES_VIDES)}
        nbResultats={visibles.length}
        tris={TRIS.filter((t) => !t.statut || t.statut === statut)}
        tri={triEffectif}
        onTri={setTri}
      />

      {fiche && (
        <FicheSet
          key={fiche.id}
          set={fiche}
          lectureSeule={lectureSeule}
          lieux={emplacementsConnus}
          lieuRecent={lieuRecent}
          onRanger={(v) => appliquer(modifier(sets, fiche.id, { emplacement: v }))}
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
          etiquettesConnues={etiquettesUtilisees}
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
          derniereSauvegarde={derniereSauvegarde}
          persistance={persistance}
          onSauvegardeFaite={sauvegardeFaite}
          onFermer={fermer}
        />
      )}
    </div>
  )
}
