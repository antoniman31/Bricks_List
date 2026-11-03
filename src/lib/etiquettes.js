// Étiquettes libres (« cadeau », « à offrir »…). Volontairement bornées : au-delà de
// quelques mots courts, ce n'est plus une étiquette mais une note, et la note existe déjà.
export const ETIQUETTES_MAX = 8;
export const ETIQUETTE_LONGUEUR_MAX = 30;

// Deux écritures qui ne diffèrent que par la casse ou les accents (« Cadeau », « cadeau »,
// « cadéau ») sont la même étiquette : sans cela le filtre en proposerait trois.
export function cleEtiquette(s) {
  return String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

// Une liste venue du stockage, d'un import ou d'un champ est une entrée non fiable :
// on garde les textes non vides, tronqués, sans doublon, dans la limite. Ce qui a été
// écarté se compte (`corrige`) pour que l'application puisse l'annoncer.
export function normaliserEtiquettes(brut) {
  if (brut == null) return { liste: [], corrige: false };
  if (!Array.isArray(brut)) return { liste: [], corrige: true };
  const liste = [];
  const vues = new Set();
  let corrige = false;
  for (const e of brut) {
    if (typeof e !== 'string') { corrige = true; continue; }
    const texte = e.replace(/\s+/g, ' ').trim().slice(0, ETIQUETTE_LONGUEUR_MAX).trim();
    if (texte !== e) corrige = true;
    const cle = cleEtiquette(texte);
    if (cle === '' || vues.has(cle)) { corrige = true; continue; }
    if (liste.length >= ETIQUETTES_MAX) { corrige = true; continue; }
    vues.add(cle);
    liste.push(texte);
  }
  return { liste, corrige };
}

// « cadeau, à offrir ; Noël » → ['cadeau', 'à offrir', 'Noël'].
export function analyserSaisie(texte) {
  return String(texte ?? '').split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);
}

// Ce que le formulaire enregistre : les doublons (« cadeau, Cadeau ») sont retirés sans
// bruit, car ce n'est pas une faute ; seuls les vrais dépassements sont refusés, avec un
// message qui dit quoi corriger, plutôt qu'une correction silencieuse qui perdrait du texte.
export function preparerSaisie(texte) {
  const brut = analyserSaisie(texte);
  const trop_long = brut.find((e) => e.replace(/\s+/g, ' ').length > ETIQUETTE_LONGUEUR_MAX);
  if (trop_long) return { liste: [], erreur: `« ${trop_long.slice(0, 12)}… » dépasse ${ETIQUETTE_LONGUEUR_MAX} caractères.` };
  const { liste } = normaliserEtiquettes(brut);
  if (liste.length < new Set(brut.map(cleEtiquette)).size) return { liste: [], erreur: `${ETIQUETTES_MAX} étiquettes au plus.` };
  return { liste, erreur: '' };
}

export function formaterSaisie(liste) {
  return liste.join(', ');
}

// Les étiquettes déjà utilisées, une seule écriture par étiquette (la première rencontrée),
// proposées en suggestion et en filtre, comme les thèmes et les emplacements.
export function etiquettesConnues(sets) {
  const parCle = new Map();
  for (const s of sets) {
    for (const e of s.etiquettes ?? []) {
      const cle = cleEtiquette(e);
      if (!parCle.has(cle)) parCle.set(cle, e);
    }
  }
  return [...parCle.values()].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

// Ajoute l'étiquette à la saisie, ou la retire si elle y est déjà.
export function basculerDansSaisie(texte, etiquette) {
  const liste = analyserSaisie(texte);
  const cle = cleEtiquette(etiquette);
  const reste = liste.filter((e) => cleEtiquette(e) !== cle);
  return formaterSaisie(reste.length < liste.length ? reste : [...liste, etiquette]);
}

export function aEtiquette(set, etiquette) {
  const cle = cleEtiquette(etiquette);
  return (set.etiquettes ?? []).some((e) => cleEtiquette(e) === cle);
}

// Les deux gestes de la fiche : chacun rend la nouvelle liste, ou un message si la limite
// empêche le geste. La fiche enregistre aussitôt, donc rien ne doit être tronqué en silence.
export function basculerEtiquette(liste, etiquette) {
  const cle = cleEtiquette(etiquette);
  const reste = liste.filter((e) => cleEtiquette(e) !== cle);
  if (reste.length < liste.length) return { liste: reste, erreur: '' };
  if (liste.length >= ETIQUETTES_MAX) return { liste, erreur: `${ETIQUETTES_MAX} étiquettes au plus.` };
  return { liste: [...liste, etiquette], erreur: '' };
}

export function ajouterEtiquettes(liste, saisie) {
  const p = preparerSaisie(saisie);
  if (p.erreur) return { liste, erreur: p.erreur };
  const toutes = [...liste, ...p.liste];
  if (new Set(toutes.map(cleEtiquette)).size > ETIQUETTES_MAX) return { liste, erreur: `${ETIQUETTES_MAX} étiquettes au plus.` };
  return { liste: normaliserEtiquettes(toutes).liste, erreur: '' };
}
