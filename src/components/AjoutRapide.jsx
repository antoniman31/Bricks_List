import { useState } from 'react'
import Sheet from './Sheet.jsx'
import ChoixEmplacement from './ChoixEmplacement.jsx'
import { normaliserNumero } from '../lib/numero.js'
import { normaliserSet, ETATS } from '../lib/model.js'
import { messageErreur } from '../lib/rebrickable.js'

// Le geste le plus fréquent : un numéro, un rangement, un état, et c'est ajouté. Tout le reste
// (thème, dates, notes, étiquettes…) vit dans le formulaire complet, « Plus d'options ».
export default function AjoutRapide({ statut, aCle, lieux, compterExemplaires, onChercher, onAjouter, onPlus, onLot, onFermer }) {
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
          {!valide && <span className="formulaire__aide">Saisis le numéro du set (ex. 75192).</span>}
        </div>
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
