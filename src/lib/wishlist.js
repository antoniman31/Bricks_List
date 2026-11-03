import { LIBELLES_PRIORITE, PRIORITES } from './model.js';
import { trier } from './recherche.js';

const nombre = (n) => n.toLocaleString('fr-FR');
const pluriel = (n, mot) => `${nombre(n)} ${mot}${n > 1 ? 's' : ''}`;

// Texte de la wishlist à coller dans un message (famille, anniversaire, Noël). Du texte
// brut : il doit se lire tel quel dans n'importe quelle messagerie, sans mise en forme.
// Les sets sont classés par priorité ; les titres de groupes n'apparaissent que si au
// moins une priorité est renseignée, sinon une seule rubrique « Non précisée » ne
// servirait à rien.
export function texteWishlist(sets) {
  const souhaits = sets.filter((s) => s.statut === 'souhaité');
  if (souhaits.length === 0) return '';

  const connues = souhaits.filter((s) => s.pieces != null);
  const totalPieces = connues.reduce((t, s) => t + s.pieces, 0);
  const entete = [pluriel(souhaits.length, 'set')];
  if (totalPieces > 0) entete.push(`${nombre(totalPieces)} pièces${connues.length < souhaits.length ? ' connues' : ''}`);

  const ligne = (s) => {
    const details = [s.pieces != null ? `${nombre(s.pieces)} pièces` : null].filter(Boolean);
    return `• ${s.nom} (${s.numero})${details.length ? `, ${details.join(', ')}` : ''}\n  https://rebrickable.com/sets/${encodeURIComponent(s.numero)}/`;
  };

  const classes = trier(souhaits, 'priorite');
  const blocs = [];
  if (souhaits.some((s) => s.priorite)) {
    for (const [cle, libelle] of [...PRIORITES.map((p) => [p, LIBELLES_PRIORITE[p]]), ['', 'Non précisée']]) {
      const groupe = classes.filter((s) => (s.priorite ?? '') === cle);
      if (groupe.length > 0) blocs.push(`${libelle}\n${groupe.map(ligne).join('\n')}`);
    }
  } else {
    blocs.push(classes.map(ligne).join('\n'));
  }
  return `Ma wishlist LEGO : ${entete.join(', ')}\n\n${blocs.join('\n\n')}\n`;
}
