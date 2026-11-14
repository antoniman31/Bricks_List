// Le bloc « À venir » des Stats : les sorties et les retraits à venir des sets de la WISHLIST (les sets possédés n'ont rien à
// acheter), triés par date et groupés par mois. Un set annoncé peut avoir les deux (une sortie puis un retrait) : deux événements.
// Les sets sans date, déjà sortis ou déjà retirés n'y figurent pas. Pur : le texte « dans 3 mois » se fait à l'affichage.
import { joursJusque } from './dates.js';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// « 2027-03-18 » -> { cle: '2027-03', libelle: 'Mars 2027', jour: 18, moisCourt: 'mars' }.
export function reperesDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return null;
  const mois = Number(m[2]) - 1;
  if (mois < 0 || mois > 11) return null;
  return { cle: `${m[1]}-${m[2]}`, libelle: `${MOIS[mois][0].toUpperCase()}${MOIS[mois].slice(1)} ${m[1]}`, jour: Number(m[3]), moisCourt: MOIS_COURTS[mois] };
}

export function evenementsAVenir(sets, maintenant = new Date()) {
  const evts = [];
  for (const s of sets) {
    if (s?.statut !== 'souhaité') continue;
    const ajouter = (type, date) => {
      const jours = joursJusque(date, maintenant);
      const r = reperesDate(date);
      // Une sortie aujourd'hui est déjà sortie ; un retrait aujourd'hui est encore à la vente (dernier jour).
      if (jours === null || !r || (type === 'sortie' ? jours <= 0 : jours < 0)) return;
      evts.push({ id: s.id, nom: s.nom, type, date, jours, prix: s.prix ?? null, priorite: s.priorite ?? null, ...r });
    };
    ajouter('retrait', s.dateRetrait);
    ajouter('sortie', s.dateSortie);
  }
  // Par date ; le même jour, le retrait avant la sortie (c'est lui qui presse), puis par nom.
  evts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || (a.type === b.type ? 0 : a.type === 'retrait' ? -1 : 1) || a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  const mois = [];
  for (const e of evts) {
    const dernier = mois[mois.length - 1];
    if (dernier && dernier.cle === e.cle) dernier.evenements.push(e);
    else mois.push({ cle: e.cle, libelle: e.libelle, evenements: [e] });
  }
  return mois;
}
