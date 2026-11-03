import { useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import { normaliserNumero } from '../lib/numero.js'
import { normaliserSet, ETATS } from '../lib/model.js'
import { messageErreur, MESSAGES } from '../lib/rebrickable.js'

const RECHERCHE_VIDE = { etat: 'repos', message: '', avertissements: [] }
const VIDE = { numero: '', nom: '', theme: '', annee: '', pieces: '', etat: '', notes: '' }

function versChamps(set) {
  return {
    numero: set.numero,
    nom: set.nom,
    theme: set.theme,
    annee: set.annee ?? '',
    pieces: set.pieces ?? '',
    etat: set.etat ?? '',
    notes: set.notes,
  }
}

// Sert à l'ajout et à la modification. La validation finale est celle du
// modèle (normaliserSet) : un set qui passe ici est un set que le stockage
// acceptera, sans deuxième jeu de règles à tenir à jour.
export default function FormulaireSet({ initial, statutParDefaut, themesConnus, compterExemplaires, aCle, onChercher, onLot, onValider, onFermer }) {
  const [champs, setChamps] = useState(initial ? versChamps(initial) : VIDE)
  const [statut, setStatut] = useState(initial?.statut ?? statutParDefaut)
  const [erreur, setErreur] = useState('')
  const [doublonConfirme, setDoublonConfirme] = useState(false)
  const [avertissement, setAvertissement] = useState('')
  const [image, setImage] = useState(initial?.image ?? null)
  const [recherche, setRecherche] = useState(RECHERCHE_VIDE)
  // Numérote les recherches : une réponse qui arrive après que le numéro a changé
  // appartient à un autre set et ne doit pas remplir le formulaire.
  const jeton = useRef(0)

  const maj = (cle) => (e) => {
    if (cle === 'numero') {
      jeton.current += 1
      setRecherche(RECHERCHE_VIDE)
      // L'image n'appartient qu'au numéro pour lequel elle a été trouvée.
      setImage(initial && normaliserNumero(e.target.value) === initial.numero ? initial.image : null)
    }
    setChamps((c) => ({ ...c, [cle]: e.target.value }))
    setErreur('')
    setAvertissement('')
    setDoublonConfirme(false)
  }

  async function chercher() {
    const numero = normaliserNumero(champs.numero)
    if (!numero) return setRecherche({ etat: 'erreur', message: MESSAGES.numero, avertissements: [] })
    jeton.current += 1
    const mien = jeton.current
    setRecherche({ etat: 'charge', message: 'Recherche…', avertissements: [] })
    try {
      const { set, avertissements } = await onChercher(numero)
      if (mien !== jeton.current) return
      setChamps((c) => ({
        ...c,
        numero: set.numero,
        nom: set.nom,
        theme: set.theme || c.theme,
        annee: set.annee ?? '',
        pieces: set.pieces ?? '',
      }))
      setImage(set.image)
      setErreur('')
      // En modification, la recherche remplace nom, thème, année, pièces et image,
      // mais jamais le statut, l'état ni les notes : ce sont des choix de l'utilisateur.
      setRecherche({ etat: 'ok', message: `Rempli depuis Rebrickable : vérifie et ${initial ? 'enregistre' : 'ajoute'}.`, avertissements })
    } catch (e) {
      if (mien !== jeton.current) return
      setRecherche({ etat: 'erreur', message: `${messageErreur(e)} Tu peux saisir à la main.`, avertissements: [] })
    }
  }

  function valider(e) {
    e.preventDefault()
    const numero = normaliserNumero(champs.numero)
    if (!numero) return setErreur('Numéro invalide : saisis par exemple 75192 ou 75192-1.')
    if (champs.nom.trim() === '') return setErreur('Le nom est obligatoire.')
    for (const [cle, libelle] of [['annee', 'L\'année'], ['pieces', 'Le nombre de pièces']]) {
      const v = String(champs[cle]).trim()
      if (v !== '' && !/^\d+$/.test(v)) return setErreur(`${libelle} doit être un nombre entier.`)
    }

    const brut = {
      numero,
      nom: champs.nom,
      theme: champs.theme,
      annee: String(champs.annee).trim() === '' ? null : champs.annee,
      pieces: String(champs.pieces).trim() === '' ? null : champs.pieces,
      statut,
      etat: statut === 'possédé' && champs.etat !== '' ? champs.etat : null,
      notes: champs.notes,
      image,
    }
    const verifie = normaliserSet(brut)
    if (!verifie || verifie.corrections > 0) return setErreur('Une valeur est hors limites : vérifie l\'année (depuis 1949) et les pièces.')

    // Un deuxième exemplaire est légitime (deux boîtes, deux états), mais le plus
    // souvent un doublon est une erreur de saisie : on demande une confirmation.
    if (!initial && !doublonConfirme) {
      const n = compterExemplaires(numero)
      if (n > 0) {
        setAvertissement(`Ce set est déjà présent (${n} exemplaire${n > 1 ? 's' : ''}). Ajoute-le quand même si tu en as bien un autre.`)
        setDoublonConfirme(true)
        return
      }
    }
    onValider(brut)
  }

  return (
    <Sheet ouvert onFermer={onFermer} titre={initial ? 'Modifier le set' : 'Ajouter un set'}>
      <form className="formulaire" onSubmit={valider} noValidate>
        {!initial && onLot && (
          <button type="button" className="bouton" onClick={onLot}>Ajouter plusieurs sets d'un coup…</button>
        )}
        <div className="formulaire__champ">
          <label htmlFor="champ-numero">Numéro</label>
          <div className="formulaire__recherche">
            <input id="champ-numero" className="champ" inputMode="numeric" autoComplete="off" placeholder="75192" value={champs.numero} onChange={maj('numero')} />
            {aCle && (
              <button type="button" className="bouton" disabled={recherche.etat === 'charge'} onClick={chercher}>
                {recherche.etat === 'charge' ? '…' : 'Chercher'}
              </button>
            )}
          </div>
          {!aCle && (
            <span className="formulaire__aide">Pour remplir automatiquement, ajoute ta clé Rebrickable dans les Réglages.</span>
          )}
          {recherche.message && (
            <span className={`formulaire__aide${recherche.etat === 'erreur' ? ' formulaire__aide--erreur' : ''}`} role={recherche.etat === 'erreur' ? 'alert' : 'status'}>
              {recherche.message}
            </span>
          )}
          {recherche.avertissements.map((a) => <span key={a} className="formulaire__aide" role="status">{a}</span>)}
          {image && <img className="formulaire__apercu" src={image} alt="" />}
        </div>
        <label className="formulaire__champ">
          Nom
          <input className="champ" autoComplete="off" value={champs.nom} onChange={maj('nom')} />
        </label>
        <label className="formulaire__champ">
          Thème
          <input className="champ" list="themes-connus" autoComplete="off" value={champs.theme} onChange={maj('theme')} />
          <datalist id="themes-connus">
            {themesConnus.map((t) => <option key={t} value={t} />)}
          </datalist>
        </label>
        <div className="formulaire__ligne">
          <label className="formulaire__champ">
            Année
            <input className="champ" inputMode="numeric" autoComplete="off" value={champs.annee} onChange={maj('annee')} />
          </label>
          <label className="formulaire__champ">
            Pièces
            <input className="champ" inputMode="numeric" autoComplete="off" value={champs.pieces} onChange={maj('pieces')} />
          </label>
        </div>
        <div className="formulaire__ligne">
          <label className="formulaire__champ">
            Statut
            <select className="champ" value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="possédé">Possédé</option>
              <option value="souhaité">Souhaité</option>
            </select>
          </label>
          {statut === 'possédé' && (
            <label className="formulaire__champ">
              État
              <select className="champ" value={champs.etat} onChange={maj('etat')}>
                <option value="">Non précisé</option>
                {ETATS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
          )}
        </div>
        <label className="formulaire__champ">
          Notes
          <textarea className="champ champ--texte" rows={3} value={champs.notes} onChange={maj('notes')} />
        </label>

        {erreur && <p className="avis avis--erreur" role="alert">{erreur}</p>}
        {avertissement && <p className="avis" role="status">{avertissement}</p>}

        <div className="sheet__pied">
          <button type="button" className="bouton" onClick={onFermer}>Annuler</button>
          <button type="submit" className="bouton bouton--plein">
            {initial ? 'Enregistrer' : doublonConfirme ? 'Ajouter quand même' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
