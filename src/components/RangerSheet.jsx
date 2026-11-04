import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { memeEmplacement } from '../lib/emplacements.js'

// Choisir où ranger un set depuis sa fiche. La recherche n'apparaît qu'au-delà de quelques
// emplacements : en dessous, elle ne ferait qu'ajouter un champ à un choix déjà lisible.
const SEUIL_RECHERCHE = 8

export default function RangerSheet({ lieux, actuel, recent, onChoisir, onFermer }) {
  const [filtre, setFiltre] = useState('')
  const [nouveau, setNouveau] = useState('')
  const q = filtre.trim().toLowerCase()
  // Le dernier emplacement utilisé passe en tête : on range souvent plusieurs sets à la suite.
  const ordonnes = [...lieux].sort((a, b) => memeEmplacement(b.nom, recent) - memeEmplacement(a.nom, recent))
  const visibles = ordonnes.filter((l) => l.nom.toLowerCase().includes(q))

  return (
    <Sheet ouvert onFermer={onFermer} titre="Ranger dans…">
      {lieux.length > SEUIL_RECHERCHE && (
        <input className="champ" type="search" aria-label="Chercher un emplacement" placeholder="Chercher" value={filtre} onChange={(e) => setFiltre(e.target.value)} />
      )}
      <ul className="rangement">
        {visibles.map((l) => (
          <li key={l.nom}>
            <button type="button" className="rangement__ligne" aria-pressed={memeEmplacement(l.nom, actuel)} onClick={() => onChoisir(l.nom)}>
              <span>{l.nom}{memeEmplacement(l.nom, recent) && ' (dernier utilisé)'}</span>
              <span className="rangement__n">{l.n}</span>
            </button>
          </li>
        ))}
        {actuel && (
          <li>
            <button type="button" className="rangement__ligne" onClick={() => onChoisir('')}>Sans emplacement</button>
          </li>
        )}
      </ul>
      <form className="rangement__nouveau" onSubmit={(e) => { e.preventDefault(); if (nouveau.trim()) onChoisir(nouveau.trim()) }}>
        <input className="champ" autoComplete="off" maxLength={60} aria-label="Nouvel emplacement" placeholder="Nouvel emplacement" value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
        <button type="submit" className="bouton bouton--plein" disabled={nouveau.trim() === ''}>Ranger</button>
      </form>
    </Sheet>
  )
}
