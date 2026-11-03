import { useSyncExternalStore } from 'react'

// Grand écran : à partir de 840 px de large (classe « expanded » d'Android). La liste et le détail
// d'un set tiennent alors côte à côte ; dessous, le détail s'ouvre par-dessus, en feuille.
// Lu à l'exécution et non par le CSS seul, parce que le composant affiché n'est pas le même.
const REQUETE = '(min-width: 840px)'

function abonner(rappel) {
  const mq = matchMedia(REQUETE)
  mq.addEventListener('change', rappel)
  return () => mq.removeEventListener('change', rappel)
}

export default function useLarge() {
  return useSyncExternalStore(abonner, () => matchMedia(REQUETE).matches, () => false)
}
