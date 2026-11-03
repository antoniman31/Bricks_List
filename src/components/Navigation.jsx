// Navigation principale : barre du bas sur téléphone, rail à gauche dès 600 px
// (voir .nav dans index.css). Le pouce atteint le bas de l'écran, pas le haut.
//
// Ce sont de vrais boutons dans un <nav>, avec aria-current sur la section
// affichée : on change de vue dans la même page, ce n'est pas un jeu d'onglets
// qui demanderait panneaux associés et navigation aux flèches.
const ICONES = {
  possédé: <path d="M4 11h16v8H4zM7 11V8h3v3M14 11V8h3v3" />,
  souhaité: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  stats: <path d="M5 20V11M12 20V4M19 20v-6" />,
}

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
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {ICONES[s.cle]}
            </svg>
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
