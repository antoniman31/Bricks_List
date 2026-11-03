import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { normaliserNumero } from '../lib/numero.js'
import { normaliserSet, ETATS } from '../lib/model.js'

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
export default function FormulaireSet({ initial, statutParDefaut, themesConnus, compterExemplaires, onValider, onFermer }) {
  const [champs, setChamps] = useState(initial ? versChamps(initial) : VIDE)
  const [statut, setStatut] = useState(initial?.statut ?? statutParDefaut)
  const [erreur, setErreur] = useState('')
  const [doublonConfirme, setDoublonConfirme] = useState(false)
  const [avertissement, setAvertissement] = useState('')

  const maj = (cle) => (e) => {
    setChamps((c) => ({ ...c, [cle]: e.target.value }))
    setErreur('')
    setAvertissement('')
    setDoublonConfirme(false)
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
      image: initial?.image ?? null,
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
        <label className="formulaire__champ">
          Numéro
          <input className="champ" inputMode="numeric" autoComplete="off" placeholder="75192" value={champs.numero} onChange={maj('numero')} />
        </label>
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
