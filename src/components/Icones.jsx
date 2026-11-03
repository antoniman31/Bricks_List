// Icônes de l'interface, tracées au trait (même style que la navigation). Décoratives :
// le nom accessible est toujours porté par le bouton qui les contient (aria-label).
const TRACES = {
  recherche: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  reglages: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  filtres: <path d="M4 6h16M7 12h10M10 18h4" />,
  selection: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12l3 3 5-6" /></>,
}

export default function Icone({ nom }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRACES[nom]}
    </svg>
  )
}
