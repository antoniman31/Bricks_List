import { createContext } from 'react'

// Ce que les cartes ont besoin de savoir pour choisir leur image : quels sets ont une photo
// personnelle (liste d'identifiants, lue une fois, sans ouvrir les images), la règle des Réglages
// pour les sets sans choix, et de quoi relire la liste après l'ajout ou le retrait d'une photo. Aussi : les
// numéros dont la photo de boîte est gardée sur l'appareil (`boites`) et de quoi en sauvegarder une (`sauverBoite`), et ceux dont le rendu Rebrickable est gardé (`rendus`), les images de la galerie Brickset gardées (`extras`, clés « numéro|nom ») et de quoi relire les boîtes et ces images (`rafraichirBoites`, `rafraichirExtras`).
export default createContext({ photos: new Set(), regle: 'boite', rafraichir: () => {}, boites: new Set(), sauverBoite: () => {}, rendus: new Set(), extras: new Set(), rafraichirExtras: () => {}, rafraichirBoites: () => {} })
