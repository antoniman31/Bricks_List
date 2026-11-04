import { useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import ChoixEmplacement from './ChoixEmplacement.jsx'
import { normaliserNumero } from '../lib/numero.js'
import { normaliserSet, ETATS } from '../lib/model.js'
import Vignette from './Vignette.jsx'
import { messageErreur, MESSAGES, MOTS_MIN } from '../lib/rebrickable.js'

// Le geste le plus fréquent : un numéro, un rangement, un état, et c'est ajouté. Tout le reste
// (thème, dates, notes, étiquettes…) vit dans le formulaire complet, « Plus d'options ».
export default function AjoutRapide({ statut, aCle, lieux, compterExemplaires, onChercher, onRechercherNom, onChoisirResultat, onAjouter, onPlus, onLot, onFermer }) {
  const [numero, setNumero] = useState('')
  const [nom, setNom] = useState('')
  const [lieu, setLieu] = useState('')
  const [etat, setEtat] = useState('')
  const [doublon, setDoublon] = useState(false)
  const [message, setMessage] = useState('')
  const [charge, setCharge] = useState(false)
  // Sans clé Rebrickable, ou si la recherche échoue, le nom se saisit à la main. Il reste
  // facultatif : vide, le set s'appelle « Set 75192 » et se complète plus tard, comme l'ajout par lot.
  const [nomManuel, setNomManuel] = useState(!aCle)

  // Recherche par nom : une page de résultats, et le numéro dont le doublon a déjà été signalé
  // (un deuxième appui sur le même résultat vaut confirmation).
  const [nomRech, setNomRech] = useState({ mots: '', etat: 'repos', message: '', resultats: [], total: 0 })
  const [doublonNumero, setDoublonNumero] = useState('')
  const jetonNom = useRef(0)

  const valide = normaliserNumero(numero) !== null
  const possede = statut === 'possédé'

  async function ajouter(e) {
    e.preventDefault()
    const n = normaliserNumero(numero)
    if (!n || charge) return
    const existants = compterExemplaires(n)
    if (existants > 0 && !doublon) {
      setMessage(`Déjà présent (${existants} exemplaire${existants > 1 ? 's' : ''}).`)
      setDoublon(true)
      return
    }
    let trouve = { nom: nom.trim(), theme: '', annee: null, pieces: null, image: null }
    if (!nomManuel) {
      setCharge(true)
      setMessage('Recherche…')
      try {
        trouve = (await onChercher(n)).set
      } catch (err) {
        setCharge(false)
        setNomManuel(true)
        return setMessage(`${messageErreur(err)} Saisis le nom ou ajoute sans.`)
      }
      setCharge(false)
    }
    envoyer(trouve, n)
  }

  // Le même ajout pour le numéro saisi et pour un résultat de recherche : l'emplacement et l'état
  // choisis dans la feuille s'appliquent aux deux.
  function envoyer(trouve, n) {
    const brut = {
      ...trouve,
      numero: n,
      statut,
      etat: possede && etat !== '' ? etat : null,
      emplacement: possede ? lieu : '',
      notes: '',
    }
    if (!normaliserSet(brut)) return setMessage('Set refusé.')
    onAjouter(brut)
  }

  async function chercherParNom() {
    const mots = nomRech.mots.trim()
    if (mots.length < MOTS_MIN) return setNomRech((r) => ({ ...r, etat: 'erreur', message: MESSAGES.requete }))
    jetonNom.current += 1
    const mien = jetonNom.current
    setNomRech((r) => ({ ...r, etat: 'charge', message: 'Recherche…' }))
    try {
      const r = await onRechercherNom(mots, 1)
      if (mien !== jetonNom.current) return
      setNomRech((x) => ({ ...x, etat: 'ok', message: r.resultats.length === 0 ? 'Aucun résultat. Noms en anglais (« falcon »).' : '', resultats: r.resultats, total: r.total }))
    } catch (err) {
      if (mien !== jetonNom.current) return
      setNomRech((x) => ({ ...x, etat: 'erreur', message: messageErreur(err) }))
    }
  }

  async function choisirResultat(r) {
    if (charge) return
    const existants = compterExemplaires(r.numero)
    if (existants > 0 && doublonNumero !== r.numero) {
      setDoublonNumero(r.numero)
      return setMessage(`Déjà présent (${existants} exemplaire${existants > 1 ? 's' : ''}). Appuie encore pour l'ajouter.`)
    }
    setCharge(true)
    setMessage('Récupération…')
    try {
      const { set } = await onChoisirResultat(r)
      setCharge(false)
      envoyer(set, r.numero)
    } catch (err) {
      setCharge(false)
      setMessage(messageErreur(err))
    }
  }

  const change = (setter) => (v) => { setter(v); setMessage(''); setDoublon(false) }

  return (
    <Sheet
      ouvert
      onFermer={onFermer}
      titre="Ajouter un set"
      modifie={numero !== '' || nom !== ''}
      pied={(
        <>
          <button type="button" className="bouton" onClick={() => onPlus({ numero, emplacement: lieu, etat })}>Plus d'options</button>
          <button type="submit" form="ajout-rapide" className="bouton bouton--plein" disabled={!valide || charge}>
            {doublon ? 'Ajouter quand même' : 'Ajouter'}
          </button>
        </>
      )}
    >
      <form id="ajout-rapide" className="formulaire" onSubmit={ajouter} noValidate>
        <div className="formulaire__champ">
          <label htmlFor="rapide-numero">Numéro</label>
          <input id="rapide-numero" className="champ" inputMode="numeric" autoComplete="off" autoFocus placeholder="75192" value={numero} onChange={(e) => change(setNumero)(e.target.value)} />
          {!valide && <span className="formulaire__aide">Saisis un numéro (ex. 75192) ou cherche par nom.</span>}
        </div>
        {aCle ? (
          <div className="formulaire__champ">
            <label htmlFor="rapide-recherche-nom">Ou chercher par nom</label>
            <div className="formulaire__recherche">
              <input
                id="rapide-recherche-nom"
                className="champ"
                autoComplete="off"
                placeholder="millennium falcon"
                value={nomRech.mots}
                onChange={(e) => { jetonNom.current += 1; setNomRech((r) => ({ ...r, mots: e.target.value, etat: r.etat === 'charge' ? 'repos' : r.etat, message: '' })) }}
                // Entrée lance la recherche : sans cela elle validerait le numéro.
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); chercherParNom() } }}
              />
              <button type="button" className="bouton" disabled={nomRech.etat === 'charge'} onClick={chercherParNom}>
                {nomRech.etat === 'charge' ? '…' : 'Chercher'}
              </button>
            </div>
            <span className="formulaire__aide">Noms en anglais (« falcon »).</span>
            {nomRech.message && (
              <span className={`formulaire__aide${nomRech.etat === 'erreur' ? ' formulaire__aide--erreur' : ''}`} role={nomRech.etat === 'erreur' ? 'alert' : 'status'}>{nomRech.message}</span>
            )}
            {nomRech.resultats.length > 0 && (
              <ul className="resultats">
                {nomRech.resultats.map((r) => (
                  <li key={r.numero}>
                    <button type="button" className="resultat" disabled={charge} onClick={() => choisirResultat(r)}>
                      <Vignette image={r.image} numero={r.numero} variante="mini" />
                      <span className="resultat__texte">
                        <span className="resultat__nom">{r.nom}</span>
                        <span className="resultat__details">{[r.numero, r.annee, r.pieces != null ? `${r.pieces.toLocaleString('fr-FR')} pièces` : null].filter((d) => d != null).join(' · ')}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="formulaire__aide">Recherche par nom : clé Rebrickable requise (Réglages).</p>
        )}
        {nomManuel && (
          <label className="formulaire__champ">
            Nom (facultatif)
            <input className="champ" autoComplete="off" value={nom} onChange={(e) => change(setNom)(e.target.value)} />
          </label>
        )}
        {possede && (
          <>
            <div className="formulaire__champ">
              <span>Emplacement de rangement</span>
              <ChoixEmplacement libelle="Emplacement de rangement" lieux={lieux} valeur={lieu} vide="Sans emplacement" onChange={change(setLieu)} />
            </div>
            <div className="formulaire__champ">
              <span>État</span>
              <div className="groupe__options" role="group" aria-label="État">
                <button type="button" className="puce" aria-pressed={etat === ''} onClick={() => change(setEtat)('')}>Non précisé</button>
                {ETATS.map((x) => (
                  <button key={x} type="button" className="puce" aria-pressed={etat === x} onClick={() => change(setEtat)(x)}>{x}</button>
                ))}
              </div>
            </div>
          </>
        )}
        {message && <p className="avis" role="status">{message}</p>}
        {onLot && <button type="button" className="bouton" onClick={onLot}>Ajouter plusieurs sets…</button>}
      </form>
    </Sheet>
  )
}
