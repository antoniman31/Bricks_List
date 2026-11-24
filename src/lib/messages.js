// Messages du stockage de l'appareil, communs à tous les modules qui y écrivent.
// Forme « constat : action » (règle commune « Design ») : avant le 24/11/2026, six modules disaient
// « Stockage indisponible. » ou « Écriture impossible. » sans dire quoi faire.

// Pas de stockage du tout : Chrome le refuse au site (données de site bloquées).
export const STOCKAGE_BLOQUE = 'Stockage bloqué : autorise les données du site dans Chrome.';
export const STOCKAGE_PLEIN = 'Stockage plein : libère de la place, puis réessaie.';
// Écriture refusée sans motif connu : le plus souvent un stockage plein ou une navigation privée.
export const ECRITURE_IMPOSSIBLE = 'Écriture impossible : libère de la place ou quitte la navigation privée, puis réessaie.';
