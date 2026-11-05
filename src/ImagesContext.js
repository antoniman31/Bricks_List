import { createContext } from 'react'

// Ce que les cartes ont besoin de savoir pour choisir leur image : quels sets ont une photo
// personnelle (liste d'identifiants, lue une fois, sans ouvrir les images), la règle des Réglages
// pour les sets sans choix, et de quoi relire la liste après l'ajout ou le retrait d'une photo.
export default createContext({ photos: new Set(), regle: 'boite', rafraichir: () => {} })
