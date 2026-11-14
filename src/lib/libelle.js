// Un libellé court venu de l'extérieur (sous-thème de Brickset, description d'une notice) : du texte d'une ligne, 60 caractères
// au plus. Renvoie null si ce n'est pas du texte ; '' reste '' (pour le sous-thème : « Brickset n'en a pas »).
export function libelleCourt(v) {
  return typeof v === 'string' ? v.replace(/\p{Cc}+/gu, ' ').trim().slice(0, 60) : null;
}
