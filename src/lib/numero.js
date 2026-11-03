// Rebrickable identifie un set par « numéro-version » (75192-1). Le suffixe
// existe parce qu'un même numéro a pu être réédité : l'omettre rend l'appel
// ambigu. À la saisie on accepte « 75192 » et on complète avec la version 1,
// ce qui couvre l'immense majorité des sets.
export function normaliserNumero(saisie) {
  const s = String(saisie ?? '').trim();
  if (/^\d{3,7}-\d{1,2}$/.test(s)) return s;
  if (/^\d{3,7}$/.test(s)) return `${s}-1`;
  return null;
}
