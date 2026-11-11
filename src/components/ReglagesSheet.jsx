import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { exporter, lireImport } from '../lib/partage.js'
import { fusionner } from '../lib/collection.js'
import { partageDisponible, partager, telecharger } from '../lib/fichier.js'
import { ecrirePartageTexte, etatSauvegarde, libelleDelai, lirePartageTexte } from '../lib/sauvegarde.js'
import { cleValide } from '../lib/reglages.js'
import { LIBELLES, MODES } from '../lib/apparence.js'
import { REGLES } from '../lib/imageListe.js'
import { jetonValide, urlRelaisValide } from '../lib/relais.js'
import { verifierMiseAJour } from '../lib/miseAJour.js'

export default function ReglagesSheet({ sets, lectureSeule, mode, onModeChange, regleImage, onRegleImage, relais, onRelaisChange, onTesterRelais, majDates, onMajDates, nbBoites = 0, nbRendus = 0, majBoites = { etat: '', message: '' }, onSauvegarderBoites, cle, onCleChange, onTesterCle, onAppliquer, derniereSauvegarde, persistance, onSauvegardeFaite, onFermer }) {
  const [apercu, setApercu] = useState(null)
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState('')
  // L'export s'affiche dans sa section, le résultat d'un import dans la sienne.
  const [resultatExport, setResultatExport] = useState('')
  const [confirmerRemplacement, setConfirmerRemplacement] = useState(false)
  const [saisieCle, setSaisieCle] = useState('')
  const [etatCle, setEtatCle] = useState({ type: '', message: '' })
  const [test, setTest] = useState(false)
  const [maj, setMaj] = useState({ etat: '', message: '' })
  // Dates de sortie : l'adresse du relais et son jeton facultatif, saisis ici et gardés sur l'appareil.
  const [saisieUrl, setSaisieUrl] = useState(relais.url)
  const [saisieJeton, setSaisieJeton] = useState(relais.jeton)
  const [etatRelais, setEtatRelais] = useState({ type: '', message: '' })
  const [testRelais, setTestRelais] = useState(false)
  const urlPropre = urlRelaisValide(saisieUrl)
  const relaisSaisi = Boolean(urlPropre) && jetonValide(saisieJeton)
  async function testerLeRelais() {
    setTestRelais(true)
    setEtatRelais({ type: '', message: '' })
    const r = await onTesterRelais({ url: urlPropre, jeton: saisieJeton.trim() })
    setEtatRelais({ type: r.ok ? 'ok' : 'erreur', message: r.message })
    setTestRelais(false)
  }
  function enregistrerLeRelais() {
    const r = onRelaisChange({ url: urlPropre, jeton: saisieJeton.trim() })
    setEtatRelais(r.ok ? { type: 'ok', message: 'Relais enregistré.' } : { type: 'erreur', message: r.erreur })
  }
  function supprimerLeRelais() {
    onRelaisChange({ url: '', jeton: '' })
    setSaisieUrl('')
    setSaisieJeton('')
    setEtatRelais({ type: 'ok', message: 'Relais supprimé.' })
  }

  // Un appui : on regarde si le serveur a une autre version que celle affichée. Si oui, on recharge tout
  // de suite (la page d'accueil passe par le réseau d'abord, le rechargement apporte donc la dernière
  // version) ; sinon on le dit, et si la vérification échoue on le dit aussi : jamais « à jour » par défaut.
  async function verifierMaj() {
    setMaj({ etat: 'charge', message: 'Vérification…' })
    const r = await verifierMiseAJour()
    if (r === 'obsolete') {
      setMaj({ etat: 'ok', message: 'Nouvelle version trouvée : rechargement…' })
      setTimeout(() => location.reload(), 400)
      return
    }
    setMaj(r === 'a-jour'
      ? { etat: 'ok', message: `Tu as la dernière version (${__COMMIT__}).` }
      : r === 'inconnu'
        ? { etat: 'ok', message: 'Rien à comparer (mode développement).' }
        : { etat: 'erreur', message: 'Impossible de vérifier : pas de connexion.' })
  }

  const saisieValide = cleValide(saisieCle)

  function enregistrerCle() {
    const r = onCleChange(saisieCle.trim())
    if (!r.ok) return setEtatCle({ type: 'erreur', message: r.erreur })
    setSaisieCle('')
    setEtatCle({ type: 'ok', message: 'Clé enregistrée sur cet appareil.' })
  }

  function supprimerCle() {
    const r = onCleChange('')
    setEtatCle(r.ok ? { type: 'ok', message: 'Clé supprimée.' } : { type: 'erreur', message: r.erreur })
  }

  // Teste la clé saisie si elle l'est, sinon celle qui est enregistrée : on peut
  // ainsi vérifier une clé avant de l'enregistrer.
  async function testerCle() {
    setTest(true)
    setEtatCle({ type: '', message: '' })
    const r = await onTesterCle(saisieValide ? saisieCle.trim() : cle)
    setTest(false)
    setEtatCle(r.ok ? { type: 'ok', message: 'Clé valide : Rebrickable répond.' } : { type: 'erreur', message: r.message })
  }

  // La date de sauvegarde ne se note qu'après un export qui a eu lieu ; si l'écriture
  // de cette date échoue, la sauvegarde reste valable mais on le dit.
  function noter(message) {
    const r = onSauvegardeFaite()
    setResultatExport(r.ok ? message : `${message} La date de sauvegarde n'a pas pu être enregistrée.`)
  }

  function exporterMaintenant() {
    const { nom, contenu } = exporter(sets)
    telecharger(nom, contenu)
    noter(`${sets.length} set${sets.length > 1 ? 's' : ''} exporté${sets.length > 1 ? 's' : ''} dans ${nom}.`)
  }

  async function partagerMaintenant() {
    const { nom, contenu } = exporter(sets)
    const texte = lirePartageTexte()
    const r = await partager(nom, contenu, undefined, { texte })
    if (r.mode === 'annule') return setResultatExport('Partage annulé : rien n\'a été sauvegardé.')
    if (r.mode === 'echec') {
      // Le JSON refusé, on passe au texte pour la prochaine fois (le geste de l'utilisateur est
      // consommé : retenter tout de suite dans la même pression échouerait aussi).
      if (!texte) {
        ecrirePartageTexte(true)
        return setResultatExport(`Partage refusé (${r.erreur}). Réessaie : envoi en .txt.`)
      }
      return setResultatExport(`Partage refusé (${r.erreur}). Utilise « Exporter la collection ».`)
    }
    noter(r.mode === 'partage' ? `Sauvegarde partagée (${r.nom}).` : `Partage indisponible : ${nom} téléchargé.`)
  }

  async function choisirFichier(e) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    setApercu(null)
    setErreur('')
    setResultat('')
    setConfirmerRemplacement(false)
    if (!fichier) return
    let texte
    try { texte = await fichier.text() } catch { return setErreur('Le fichier n\'a pas pu être lu.') }
    const r = lireImport(texte)
    if (r.erreur) return setErreur(r.erreur)
    setApercu(r)
  }

  function appliquerFusion() {
    const r = fusionner(sets, apercu.sets)
    onAppliquer(r.sets)
    setResultat(`Fusion faite : ${r.ajoutes} ajouté${r.ajoutes > 1 ? 's' : ''}, ${r.misAJour} mis à jour.`)
    setApercu(null)
  }

  function appliquerRemplacement() {
    onAppliquer(apercu.sets)
    setResultat(`Collection remplacée : ${apercu.sets.length} set${apercu.sets.length > 1 ? 's' : ''}.`)
    setApercu(null)
    setConfirmerRemplacement(false)
  }

  return (
    <Sheet ouvert onFermer={onFermer} titre="Réglages">
      <details className="reglage">
        <summary>Apparence</summary>
        <div className="stats__puces" role="group" aria-label="Thème">
          {MODES.map((m) => (
            <button key={m} type="button" className="puce" aria-pressed={mode === m} onClick={() => onModeChange(m)}>
              {LIBELLES[m]}
            </button>
          ))}
        </div>
        <p className="reglage__aide">Image des sets dans la liste, quand tu n'en as pas choisi une sur leur fiche.</p>
        <div className="stats__puces" role="group" aria-label="Image de la liste">
          {REGLES.map((r) => (
            <button key={r.cle} type="button" className="puce" aria-pressed={regleImage === r.cle} onClick={() => onRegleImage(r.cle)}>
              {r.libelle}
            </button>
          ))}
        </div>
      </details>

      <details className="reglage">
        <summary>Rebrickable</summary>
        <p className="reglage__aide">
          Remplit un set depuis son numéro. Reste sur cet appareil, jamais exportée.
        </p>
        {cle && <p className="reglage__aide">Clé enregistrée (…{cle.slice(-4)}).</p>}
        <label className="formulaire__champ">
          {cle ? 'Remplacer la clé' : 'Clé API'}
          <input
            className="champ"
            type="password"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={saisieCle}
            onChange={(e) => { setSaisieCle(e.target.value); setEtatCle({ type: '', message: '' }) }}
          />
        </label>
        {saisieCle !== '' && !saisieValide && (
          <p className="reglage__aide reglage__aide--erreur">Clé invalide (ni espace ni accent).</p>
        )}
        <div className="sheet__pied">
          <button type="button" className="bouton" disabled={test || (!saisieValide && !cle)} onClick={testerCle}>
            {test ? 'Test…' : 'Tester'}
          </button>
          <button type="button" className="bouton bouton--plein" disabled={!saisieValide} onClick={enregistrerCle}>Enregistrer</button>
        </div>
        {cle && <button type="button" className="bouton bouton--danger" onClick={supprimerCle}>Supprimer la clé</button>}
        {etatCle.message && (
          <p className={`avis${etatCle.type === 'erreur' ? ' avis--erreur' : ''}`} role={etatCle.type === 'erreur' ? 'alert' : 'status'}>{etatCle.message}</p>
        )}
      </details>

      <details className="reglage">
        <summary>Images sur l'appareil</summary>
        <p className="reglage__aide">
          Chaque boîte affichée est gardée sur cet appareil : si BrickLink est en panne, elle reste visible. Les rendus Rebrickable se copient par le relais. {nbBoites} boîte{nbBoites > 1 ? 's' : ''} et {nbRendus} rendu{nbRendus > 1 ? 's' : ''} sauvegardé{nbBoites + nbRendus > 1 ? 's' : ''}, hors export.
        </p>
        <button type="button" className="bouton" disabled={majBoites.etat === 'charge'} onClick={onSauvegarderBoites}>Sauvegarder toutes les images</button>
        {majBoites.message && (
          <p className={`avis${majBoites.etat === 'erreur' ? ' avis--erreur' : ''}`} role={majBoites.etat === 'erreur' ? 'alert' : 'status'}>{majBoites.message}</p>
        )}
      </details>

      <details className="reglage">
        <summary>Dates de sortie</summary>
        <p className="reglage__aide">
          Les dates viennent de Brickset, par un relais à toi (dossier <code>relais</code> du dépôt). L'adresse reste sur cet appareil, jamais exportée.
        </p>
        <label className="formulaire__champ">
          Adresse du relais
          <input
            className="champ"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://bricks-relais.….workers.dev"
            value={saisieUrl}
            onChange={(e) => { setSaisieUrl(e.target.value); setEtatRelais({ type: '', message: '' }) }}
          />
        </label>
        {saisieUrl !== '' && !urlPropre && <p className="reglage__aide reglage__aide--erreur">Adresse invalide (https, sans identifiants ni paramètres).</p>}
        <label className="formulaire__champ">
          Jeton (facultatif)
          <input
            className="champ"
            type="password"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={saisieJeton}
            onChange={(e) => { setSaisieJeton(e.target.value); setEtatRelais({ type: '', message: '' }) }}
          />
        </label>
        {saisieJeton !== '' && !jetonValide(saisieJeton) && <p className="reglage__aide reglage__aide--erreur">Jeton invalide (8 caractères au moins, ni espace ni accent).</p>}
        <div className="sheet__pied">
          <button type="button" className="bouton" disabled={testRelais || !relaisSaisi} onClick={testerLeRelais}>{testRelais ? 'Test…' : 'Tester'}</button>
          <button type="button" className="bouton bouton--plein" disabled={!relaisSaisi} onClick={enregistrerLeRelais}>Enregistrer</button>
        </div>
        {relais.url && <button type="button" className="bouton bouton--danger" onClick={supprimerLeRelais}>Supprimer le relais</button>}
        {etatRelais.message && (
          <p className={`avis${etatRelais.type === 'erreur' ? ' avis--erreur' : ''}`} role={etatRelais.type === 'erreur' ? 'alert' : 'status'}>{etatRelais.message}</p>
        )}
        <button type="button" className="bouton" disabled={lectureSeule || !relais.url || majDates.etat === 'charge'} onClick={onMajDates}>Mettre à jour les dates</button>
        {majDates.message && (
          <p className={`avis${majDates.etat === 'erreur' ? ' avis--erreur' : ''}`} role={majDates.etat === 'erreur' ? 'alert' : 'status'}>{majDates.message}</p>
        )}
      </details>

      <details className="reglage">
        <summary>Sauvegarde</summary>
        <p className="reglage__aide">Données stockées sur cet appareil. Exporte pour les sauvegarder.</p>
        <p className="reglage__aide">
          Dernière sauvegarde : {libelleDelai(etatSauvegarde({ nbSets: sets.length, derniere: derniereSauvegarde }).jours)}.
        </p>
        <p className="reglage__aide">
          {persistance === 'protege' && 'Stockage protégé.'}
          {persistance === 'non-garanti' && 'Stockage non garanti : installe l\'app et sauvegarde.'}
          {persistance === 'inconnu' && 'Protection inconnue : sauvegarde régulièrement.'}
        </p>
        <div className="sheet__pied">
          <button type="button" className="bouton" onClick={exporterMaintenant} disabled={sets.length === 0}>Exporter la collection</button>
          {partageDisponible(undefined, { texte: lirePartageTexte() }) && (
            <button type="button" className="bouton bouton--plein" onClick={partagerMaintenant} disabled={sets.length === 0}>Partager la sauvegarde</button>
          )}
        </div>
        {resultatExport && <p className="avis" role="status">{resultatExport}</p>}
      </details>

      <details className="reglage">
        <summary>Importer un fichier</summary>
        <label className="bouton bouton--fichier">
          Choisir un fichier JSON
          <input type="file" accept=".json,.txt,application/json,text/plain" onChange={choisirFichier} className="visuellement-cache" />
        </label>

        {erreur && <p className="avis avis--erreur" role="alert">{erreur}</p>}

        {apercu && (
          <div className="avis" role="status">
            <p>
              {apercu.sets.length} set{apercu.sets.length > 1 ? 's' : ''} lu{apercu.sets.length > 1 ? 's' : ''}
              {apercu.corriges > 0 && `, ${apercu.corriges} corrigé${apercu.corriges > 1 ? 's' : ''}`}
              {apercu.rejetes > 0 && `, ${apercu.rejetes} ignoré${apercu.rejetes > 1 ? 's' : ''}`}.
            </p>
            {confirmerRemplacement ? (
              <>
                <p>Remplacer tes {sets.length} set{sets.length > 1 ? 's' : ''} par ces {apercu.sets.length} ? Les sets absents du fichier seront perdus.</p>
                <div className="sheet__pied">
                  <button type="button" className="bouton" onClick={() => { exporterMaintenant(); setResultat('Collection exportée avant le remplacement.') }}>Exporter d'abord</button>
                  <button type="button" className="bouton bouton--danger" onClick={appliquerRemplacement}>Confirmer</button>
                </div>
                <button type="button" className="bouton" onClick={() => setConfirmerRemplacement(false)}>Annuler</button>
              </>
            ) : (
              <div className="sheet__pied">
                <button type="button" className="bouton" disabled={lectureSeule} onClick={() => setConfirmerRemplacement(true)}>Remplacer</button>
                <button type="button" className="bouton bouton--plein" disabled={lectureSeule} onClick={appliquerFusion}>Fusionner</button>
              </div>
            )}
          </div>
        )}

        {resultat && <p className="avis" role="status">{resultat}</p>}
      </details>

      <details className="reglage">
        <summary>Mise à jour</summary>
        <button type="button" className="bouton" disabled={maj.etat === 'charge'} onClick={verifierMaj}>
          {maj.etat === 'charge' ? 'Vérification…' : 'Vérifier les mises à jour'}
        </button>
        {maj.message && maj.etat !== 'charge' && (
          <p className={`avis${maj.etat === 'erreur' ? ' avis--erreur' : ''}`} role={maj.etat === 'erreur' ? 'alert' : 'status'}>{maj.message}</p>
        )}
      </details>

      <p className="reglage__version">Version {__COMMIT__}</p>
    </Sheet>
  )
}
