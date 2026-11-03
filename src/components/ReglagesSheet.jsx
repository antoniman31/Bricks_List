import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { exporter, lireImport } from '../lib/partage.js'
import { fusionner } from '../lib/collection.js'
import { telecharger } from '../lib/fichier.js'
import { cleValide } from '../lib/reglages.js'
import { LIBELLES, MODES } from '../lib/apparence.js'

export default function ReglagesSheet({ sets, lectureSeule, mode, onModeChange, cle, onCleChange, onTesterCle, onAppliquer, onFermer }) {
  const [apercu, setApercu] = useState(null)
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState('')
  const [confirmerRemplacement, setConfirmerRemplacement] = useState(false)
  const [saisieCle, setSaisieCle] = useState('')
  const [etatCle, setEtatCle] = useState({ type: '', message: '' })
  const [test, setTest] = useState(false)

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

  function exporterMaintenant() {
    const { nom, contenu } = exporter(sets)
    telecharger(nom, contenu)
    setResultat(`${sets.length} set${sets.length > 1 ? 's' : ''} exporté${sets.length > 1 ? 's' : ''} dans ${nom}.`)
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
      <section className="reglage">
        <h3 className="reglage__titre">Apparence</h3>
        <div className="stats__puces" role="group" aria-label="Thème">
          {MODES.map((m) => (
            <button key={m} type="button" className="puce" aria-pressed={mode === m} onClick={() => onModeChange(m)}>
              {LIBELLES[m]}
            </button>
          ))}
        </div>
        <p className="reglage__aide">Automatique suit le réglage clair ou sombre du téléphone.</p>
      </section>

      <section className="reglage">
        <h3 className="reglage__titre">Rebrickable</h3>
        <p className="reglage__aide">
          La clé permet de remplir un set à partir de son numéro. Elle reste sur cet appareil et n'est jamais exportée.
          Compte gratuit sur rebrickable.com, puis Settings, API.
        </p>
        {cle && <p className="reglage__aide">Clé enregistrée (se termine par {cle.slice(-4)}).</p>}
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
          <p className="reglage__aide reglage__aide--erreur">Cette clé ne ressemble pas à une clé d'API (aucun espace ni accent).</p>
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
      </section>

      <section className="reglage">
        <h3 className="reglage__titre">Sauvegarde</h3>
        <p className="reglage__aide">Les données restent dans ce navigateur. Exporte-les pour les garder ou les passer d'un appareil à l'autre.</p>
        <button type="button" className="bouton" onClick={exporterMaintenant} disabled={sets.length === 0}>Exporter la collection</button>
      </section>

      <section className="reglage">
        <h3 className="reglage__titre">Importer un fichier</h3>
        <label className="bouton bouton--fichier">
          Choisir un fichier JSON
          <input type="file" accept=".json,application/json" onChange={choisirFichier} className="visuellement-cache" />
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
                  <button type="button" className="bouton" onClick={exporterMaintenant}>Exporter d'abord</button>
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
      </section>

      <p className="reglage__version">Version {__COMMIT__}</p>
    </Sheet>
  )
}
