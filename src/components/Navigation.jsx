import Icone from './Icones.jsx'

// Navigation principale : barre du bas sur téléphone, rail à gauche dès 600 px
// (voir .nav dans index.css). Le pouce atteint le bas de l'écran, pas le haut.
//
// Ce sont de vrais boutons dans un <nav>, avec aria-current sur la section
// affichée : on change de vue dans la même page, ce n'est pas un jeu d'onglets
// qui demanderait panneaux associés et navigation aux flèches.
const ICONES = { possédé: 'collection', souhaité: 'souhaits', stats: 'stats' }

const SECTIONS = [
  { cle: 'possédé', libelle: 'Collection' },
  { cle: 'souhaité', libelle: 'Wishlist' },
  { cle: 'stats', libelle: 'Stats' },
]

export default function Navigation({ actuelle, nombres, onChoisir }) {
  return (
    <nav className="nav" aria-label="Sections">
      {SECTIONS.map((s) => (
        <button
          key={s.cle}
          type="button"
          className="nav__item"
          aria-current={actuelle === s.cle ? 'page' : undefined}
          onClick={() => onChoisir(s.cle)}
        >
          <span className="nav__icone" aria-hidden="true">
            <Icone nom={ICONES[s.cle]} />
          </span>
          <span className="nav__libelle">
            {s.libelle}
            {nombres[s.cle] != null && <span className="nav__nombre"> {nombres[s.cle]}</span>}
          </span>
        </button>
      ))}
    </nav>
  )
}
