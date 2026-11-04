import { useEffect, useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import ChoixEmplacement from './ChoixEmplacement.jsx'
import Vignette from './Vignette.jsx'
import { normaliserNumero } from '../lib/numero.js'
import { normaliserSet, ETATS } from '../lib/model.js'
import { memeEmplacement } from '../lib/emplacements.js'
import { lireDernierAjout, ecrireDernierAjout } from '../lib/dernierAjout.js'
import { messageErreur, MOTS_MIN } from '../lib/rebrickable.js'

// Délai avant de lancer la recherche par nom pendant la frappe : assez court pour répondre,
// assez long pour ne pas interroger Rebrickable à chaque lettre.
const DELAI_RECHERCHE = 600

// Le geste le plus fréquent : un champ (numéro ou nom), un rangement repris du dernier ajout,
// et c'est ajouté. Tout le reste (thème, dates, notes, étiquettes…) vit dans « Plus d'options ».
export default function AjoutRapide({ statut, aCle, lieux, compterExemplaires, onChercher, onRechercherNom, onChoisirResultat, onAjouter, onPlus, onLot, onFermer }) {
  const [saisie, setSaisie] = useState('')
  const [nom, setNom] = useState('')
  // Le rangement du dernier ajout, sans un emplacement qui n'existe plus (set supprimé depuis).
  const [depart] = useState(() => {
    const d = lireDernierAjout()
    const connu = lieux.find((l) => memeEmplacement(l.nom, d.lieu))
    return { lieu: connu ? connu.nom : '', etat: d.etat }
  })
  const [lieu, setLieu] = useState(depart.lieu)
  const [etat, setEtat] = useState(depart.etat)
  const [rangementOuvert, setRangementOuvert] = useState(false)
  const [doublon, setDoublon] = useState('')
  const [message, setMessage] = useState('')
  const [charge, setCharge] = useState(false)
  // Sans clé Rebrickable, ou si la recherche échoue, le nom se saisit à la main. Il reste
  // facultatif : vide, le set s'appelle « Set 75192 » et se complète plus tard, comme l'ajout par lot.
  const [nomManuel, setNomManuel] = useState(!aCle)
  const [recherche, setRecherche] = useState({ etat: 'repos', message: '', resultats: [] })
  const jeton = useRef(0)

  const numero = normaliserNumero(saisie)
  const mots = saisie.trim()
  // Un numéro valide ajoute ; un texte qui n'en est pas un cherche par nom.
  const parNom = numero === null && mots !== ''
  const possede = statut === 'possédé'

  async function lancerRecherche(texte) {
    jeton.current += 1
    const mien = jeton.current
    setRecherche({ etat: 'charge', message: 'Recherche…', resultats: [] })
    try {
      const r = await onRechercherNom(texte, 1)
      if (mien !== jeton.current) return
      setRecherche({ etat: 'ok', message: r.resultats.length === 0 ? 'Aucun résultat. Noms en anglais (« falcon »).' : '', resultats: r.resultats })
    } catch (err) {
      if (mien !== jeton.current) return
      setRecherche({ etat: 'erreur', message: messageErreur(err), resultats: [] })
    }
  }

  // La recherche part seule après une pause de frappe ; Entrée la lance tout de suite.
  useEffect(() => {
    if (!aCle || !parNom || mots.length < MOTS_MIN) return undefined
    const t = setTimeout(() => lancerRecherche(mots), DELAI_RECHERCHE)
    return () => clearTimeout(t)
  }, [saisie]) // eslint-disable-line react-hooks/exhaustive-deps

  // Taper invalide la recherche en cours : une réponse qui arrive après ne concerne plus le texte.
  function changerSaisie(v) {
    jeton.current += 1
    setRecherche({ etat: 'repos', message: '', resultats: [] })
    change(setSaisie)(v)
  }

  function retenir() {
    if (possede) ecrireDernierAjout({ lieu, etat })
  }

  // Le même ajout pour le numéro saisi et pour un résultat de recherche : le rangement et l'état
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
    retenir()
    onAjouter(brut)
  }

  async function ajouter(e) {
    e.preventDefault()
    if (parNom) { jeton.current += 1; return lancerRecherche(mots) }
    if (!numero || charge) return
    const existants = compterExemplaires(numero)
    if (existants > 0 && doublon !== numero) {
      setMessage(`Déjà présent (${existants} exemplaire${existants > 1 ? 's' : ''}).`)
      return setDoublon(numero)
    }
    let trouve = { nom: nom.trim(), theme: '', annee: null, pieces: null, image: null }
    if (!nomManuel) {
      setCharge(true)
      setMessage('Recherche…')
      try {
        trouve = (await onChercher(numero)).set
      } catch (err) {
        setCharge(false)
        setNomManuel(true)
        return setMessage(`${messageErreur(err)} Saisis le nom ou ajoute sans.`)
      }
      setCharge(false)
    }
    envoyer(trouve, numero)
  }

  async function choisirResultat(r) {
    if (charge) return
    const existants = compterExemplaires(r.numero)
    if (existants > 0 && doublon !== r.numero) {
      setDoublon(r.numero)
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

  const change = (setter) => (v) => { setter(v); setMessage(''); setDoublon('') }

  return (
    <Sheet
      ouvert
      onFermer={onFermer}
      titre="Ajouter un set"
      modifie={saisie !== '' || nom !== ''}
      actionHaut={onLot ? <button type="button" className="bouton bouton--texte" onClick={onLot}>Plusieurs</button> : null}
      pied={(
        <>
          <button type="button" className="bouton bouton--texte" onClick={() => onPlus({ numero: numero ? saisie : '', emplacement: lieu, etat })}>Plus d'options</button>
          <button type="submit" form="ajout-rapide" className="bouton bouton--plein" disabled={!numero || charge}>
            {doublon && doublon === numero ? 'Ajouter quand même' : 'Ajouter'}
          </button>
        </>
      )}
    >
      <form id="ajout-rapide" className="formulaire ajout" onSubmit={ajouter} noValidate>
        <label className="ajout__champ" htmlFor="rapide-champ">
          <span className="visuellement-cache">Numéro ou nom du set</span>
          <input
            id="rapide-champ"
            className="champ champ--grand"
            inputMode="search"
            autoComplete="off"
            autoFocus
            placeholder={aCle ? 'Numéro ou nom (75192, falcon)' : 'Numéro (ex. 75192)'}
            value={saisie}
            onChange={(e) => changerSaisie(e.target.value)}
          />
        </label>
        {saisie === '' && <p className="formulaire__aide">{aCle ? 'Un numéro, ou un nom en anglais.' : 'Un numéro (ex. 75192). La recherche par nom demande une clé Rebrickable (Réglages).'}</p>}
        {parNom && !aCle && <p className="formulaire__aide">Numéro invalide (ex. 75192). Chercher par nom : clé Rebrickable requise (Réglages).</p>}

        {parNom && aCle && recherche.message && (
          <p className={`formulaire__aide${recherche.etat === 'erreur' ? ' formulaire__aide--erreur' : ''}`} role={recherche.etat === 'erreur' ? 'alert' : 'status'}>{recherche.message}</p>
        )}
        {parNom && aCle && recherche.resultats.length > 0 && (
          <ul className="resultats">
            {recherche.resultats.map((r) => (
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

        {numero && nomManuel && (
          <label className="formulaire__champ">
            Nom (facultatif)
            <input className="champ" autoComplete="off" value={nom} onChange={(e) => change(setNom)(e.target.value)} />
          </label>
        )}

        {possede && (
          <div className="rangement-ligne">
            <button type="button" className="resume" aria-expanded={rangementOuvert} onClick={() => setRangementOuvert((o) => !o)}>
              <span className="resume__libelle">Rangement</span>
              <span className="resume__valeur">{lieu || 'Sans emplacement'} · {etat || 'Non précisé'}</span>
            </button>
            {rangementOuvert && (
              <div className="rangement-ligne__corps">
                <ChoixEmplacement libelle="Emplacement de rangement" lieux={lieux} valeur={lieu} vide="Sans emplacement" uneLigne onChange={change(setLieu)} />
                <div className="groupe__options groupe__options--ligne" role="group" aria-label="État">
                  <button type="button" className="puce" aria-pressed={etat === ''} onClick={() => change(setEtat)('')}>Non précisé</button>
                  {ETATS.map((x) => (
                    <button key={x} type="button" className="puce" aria-pressed={etat === x} onClick={() => change(setEtat)(x)}>{x}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {message && <p className="avis" role="status">{message}</p>}
      </form>
    </Sheet>
  )
}
