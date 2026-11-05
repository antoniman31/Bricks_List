// Dates « jour » (achat, montage) : une chaîne AAAA-MM-JJ, pas un instant. C'est ce que
// donne un champ date, et ça évite tout décalage de fuseau : un set acheté le 3 novembre
// au soir reste du 3 novembre, quelle que soit l'heure UTC.

const FORME = /^(\d{4})-(\d{2})-(\d{2})$/;
const ANNEE_MIN = 1949;

const deux = (n) => String(n).padStart(2, '0');

// Aujourd'hui dans le fuseau de l'appareil.
export function aujourdhuiISO(maintenant = new Date()) {
  return `${maintenant.getFullYear()}-${deux(maintenant.getMonth() + 1)}-${deux(maintenant.getDate())}`;
}

// Une date venue du stockage, d'un import ou d'un champ est une entrée non fiable :
// forme exacte, jour qui existe (pas de 31 février), pas avant les premières briques,
// pas dans le futur. Un jour de tolérance couvre un appareil réglé sur un autre fuseau.
export function dateValide(v, maintenant = new Date()) {
  if (typeof v !== 'string') return null;
  const m = FORME.exec(v);
  if (!m) return null;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (annee < ANNEE_MIN) return null;
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return null;
  const demain = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1);
  return v <= aujourdhuiISO(demain) ? v : null;
}

// Une date de sortie, elle, est souvent dans le futur (un set annoncé) : mêmes exigences de forme et de
// jour réel, mais l'avenir est permis, dans une limite (dix ans) qui écarte les valeurs absurdes.
export function dateSortieValide(v, maintenant = new Date()) {
  if (typeof v !== 'string') return null;
  const m = FORME.exec(v);
  if (!m) return null;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (annee < ANNEE_MIN || annee > maintenant.getFullYear() + 10) return null;
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return null;
  return v;
}

// Le dernier jour qu'un champ « date de sortie » propose : fin de l'année dans dix ans.
export const finSortiePossible = (maintenant = new Date()) => `${maintenant.getFullYear() + 10}-12-31`;

// Nombre de jours (calendaires) d'aujourd'hui à `iso` : positif dans le futur, 0 aujourd'hui, négatif avant.
export function joursJusque(iso, maintenant = new Date()) {
  const m = FORME.exec(iso ?? '');
  if (!m) return null;
  const cible = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const aujourdhui = Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  return Math.round((cible - aujourdhui) / 86_400_000);
}

export function anneeDe(iso) {
  return typeof iso === 'string' && FORME.test(iso) ? Number(iso.slice(0, 4)) : null;
}

// « 3 novembre 2026 », construit sans passer par un instant UTC (qui décalerait le jour).
export function formaterDate(iso) {
  const m = FORME.exec(iso ?? '');
  if (!m) return '';
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
