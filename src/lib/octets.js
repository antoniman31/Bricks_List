// Des octets en mots : « 820 Ko », « 38 Mo », « 1,2 Go » (une décimale seulement au-dessus de 10 unités, pour ne pas
// afficher « 38,0 Mo »). Sert à l'espace utilisé dans les Réglages.
const FR = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export function formaterOctets(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${Math.round(n)} o`;
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} Ko`;
  if (n < 1024 ** 3) { const mo = n / 1024 ** 2; return `${mo >= 10 ? Math.round(mo) : FR.format(mo)} Mo`; }
  const go = n / 1024 ** 3;
  return `${go >= 10 ? Math.round(go) : FR.format(go)} Go`;
}

// La phrase de l'espace : le total du site (estimation du navigateur) et la part des images, ou seulement les images
// quand le navigateur ne donne pas d'estimation. Jamais un chiffre inventé : sans mesure, on le dit.
export function phraseEspace({ usage, images }) {
  const part = formaterOctets(images);
  const total = formaterOctets(usage);
  if (!part && !total) return 'Espace utilisé : mesure indisponible sur ce navigateur.';
  if (!total) return `${part} d'images gardées sur cet appareil.`;
  // Une estimation plus petite que les images mesurées est incohérente : on n'affiche que ce qu'on a mesuré.
  if (!part || usage < images) return `${total} utilisés sur cet appareil.`;
  return `${total} utilisés sur cet appareil, dont ${part} d'images.`;
}
