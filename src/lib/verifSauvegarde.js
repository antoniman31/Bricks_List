// « Vérifier ma sauvegarde » : compare un fichier d'export à la collection de l'appareil SANS rien modifier. C'est un contrôle,
// pas un import : la seule question est « ce fichier me permettrait-il de tout retrouver ? ». Logique pure (testée) ; la
// lecture du fichier (`lireImport`) et des clés d'images de l'appareil (`clesImages`) se font ailleurs.
import { GROUPES } from './imagesExport.js';

// Deux fiches sont les mêmes si elles ont les mêmes champs, dans n'importe quel ordre.
const trier = (v) => (Array.isArray(v) ? v.map(trier) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, trier(v[k])])) : v);
const empreinte = (set) => JSON.stringify(trier(set));

const pluriel = (n, un, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;
const nomDe = (s) => (s.nom ? `${s.nom} (${s.numero})` : s.numero);
// Au plus cinq noms, le reste résumé : une liste de cinquante sets n'aide personne.
const noms = (sets, max = 5) => `${sets.slice(0, max).map(nomDe).join(', ')}${sets.length > max ? '…' : ''}`;

export function comparerSauvegarde({ fichier, actuels, cles }) {
  const parId = (liste) => new Map(liste.map((s) => [s.id, s]));
  const f = parId(fichier.sets);
  const a = parId(actuels);
  const absentsDuFichier = actuels.filter((s) => !f.has(s.id));
  const absentsDeLAppareil = fichier.sets.filter((s) => !a.has(s.id));
  const modifies = fichier.sets.filter((s) => a.has(s.id) && empreinte(s) !== empreinte(a.get(s.id)));

  const lignes = [`${pluriel(fichier.sets.length, 'set')} dans le fichier, ${actuels.length} sur l'appareil.`];
  if (absentsDuFichier.length > 0) lignes.push(`${pluriel(absentsDuFichier.length, 'set')} de l'appareil ${absentsDuFichier.length > 1 ? 'manquent' : 'manque'} dans le fichier : ${noms(absentsDuFichier)}.`);
  if (absentsDeLAppareil.length > 0) lignes.push(`${pluriel(absentsDeLAppareil.length, 'set')} du fichier ${absentsDeLAppareil.length > 1 ? 'sont absents' : 'est absent'} de l'appareil : ${noms(absentsDeLAppareil)}.`);
  if (modifies.length > 0) lignes.push(`${pluriel(modifies.length, 'set')} ${modifies.length > 1 ? 'diffèrent' : 'diffère'} (prix, dates, état…) : ${noms(modifies)}.`);
  if (fichier.corriges > 0) lignes.push(`${pluriel(fichier.corriges, 'fiche', 'fiches')} du fichier ${fichier.corriges > 1 ? 'ont été corrigées' : 'a été corrigée'} à la lecture.`);
  if (fichier.rejetes > 0) lignes.push(`${pluriel(fichier.rejetes, 'fiche')} du fichier ${fichier.rejetes > 1 ? 'sont inutilisables' : 'est inutilisable'}.`);

  // Les images : celles de l'appareil doivent toutes être dans le fichier (c'est ce qui permet de les retrouver).
  let imagesDifferent = false;
  if (fichier.images === null || fichier.images === undefined) {
    lignes.push('Ce fichier ne contient pas d\'images.');
    imagesDifferent = Boolean(cles) && GROUPES.some((g) => (cles[g] ?? []).length > 0);
    if (imagesDifferent) lignes.push('Les images de l\'appareil ne seraient pas retrouvées.');
  } else if (!cles) {
    lignes.push('Les images de l\'appareil n\'ont pas pu être lues : comparaison impossible.');
    imagesDifferent = true;
  } else {
    let dansFichier = 0;
    let surAppareil = 0;
    let manquantes = 0;
    let enTrop = 0;
    for (const g of GROUPES) {
      const cf = new Set(fichier.images[g].map(([cle]) => cle));
      const ca = new Set(cles[g] ?? []);
      dansFichier += cf.size;
      surAppareil += ca.size;
      manquantes += [...ca].filter((c) => !cf.has(c)).length;
      enTrop += [...cf].filter((c) => !ca.has(c)).length;
    }
    lignes.push(`${pluriel(dansFichier, 'image')} dans le fichier, ${surAppareil} sur l'appareil.`);
    if (manquantes > 0) lignes.push(`${pluriel(manquantes, 'image')} de l'appareil ${manquantes > 1 ? 'manquent' : 'manque'} dans le fichier.`);
    if (enTrop > 0) lignes.push(`${pluriel(enTrop, 'image')} du fichier ${enTrop > 1 ? 'ne sont pas' : 'n\'est pas'} sur l'appareil.`);
    if (fichier.images.refusees > 0) lignes.push(`${pluriel(fichier.images.refusees, 'image')} du fichier ${fichier.images.refusees > 1 ? 'sont illisibles' : 'est illisible'}.`);
    imagesDifferent = manquantes > 0 || enTrop > 0 || fichier.images.refusees > 0;
  }

  const identique = absentsDuFichier.length === 0 && absentsDeLAppareil.length === 0 && modifies.length === 0 && !imagesDifferent && !(fichier.corriges > 0) && !(fichier.rejetes > 0);
  return { identique, titre: identique ? 'Ce fichier correspond à ta collection.' : 'Ce fichier diffère de ta collection.', lignes };
}
