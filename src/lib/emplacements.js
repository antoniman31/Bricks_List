// Deux écritures qui ne diffèrent que par la casse, les accents ou les espaces (« Salon »,
// « salon », « Salón ») sont le même emplacement : sans cela, le regroupement, le filtre et les
// puces en feraient plusieurs, et on chercherait un set dans le mauvais « Salon ».
// Même règle que pour les étiquettes (`cleEtiquette`).
export function cleEmplacement(s) {
  return String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function memeEmplacement(a, b) {
  const cle = cleEmplacement(a);
  return cle !== '' && cle === cleEmplacement(b);
}

// L'écriture affichée pour chaque emplacement : la plus fréquente dans la collection, et à égalité la
// première rencontrée. Les sets gardent chacun leur écriture, seul l'affichage est unifié.
// Rend une Map clé → écriture.
export function ecrituresEmplacements(sets) {
  const parCle = new Map();
  for (const s of sets) {
    const cle = cleEmplacement(s.emplacement);
    if (cle === '') continue;
    if (!parCle.has(cle)) parCle.set(cle, new Map());
    const ecritures = parCle.get(cle);
    ecritures.set(s.emplacement, (ecritures.get(s.emplacement) ?? 0) + 1);
  }
  const retenues = new Map();
  for (const [cle, ecritures] of parCle) {
    let meilleure = null;
    let max = 0;
    for (const [texte, n] of ecritures) if (n > max) { meilleure = texte; max = n; }
    retenues.set(cle, meilleure);
  }
  return retenues;
}
