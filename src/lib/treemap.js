// Blocs proportionnels (« treemap ») : chaque thème est un rectangle dont la surface suit son
// nombre de sets. Algorithme « squarified » : on remplit le rectangle par rangées en gardant les
// blocs aussi proches du carré que possible, pour qu'ils restent lisibles et faciles à toucher.

function pireRapport(ligne, cote) {
  const somme = ligne.reduce((a, b) => a + b, 0);
  const max = Math.max(...ligne);
  const min = Math.min(...ligne);
  return Math.max((cote * cote * max) / (somme * somme), (somme * somme) / (cote * cote * min));
}

// `valeurs` : les tailles, dans n'importe quel ordre. Rend un rectangle par valeur, dans le même
// ordre, dans un cadre largeur × hauteur. Une valeur nulle ou négative donne un rectangle vide.
export function treemap(valeurs, largeur = 100, hauteur = 100) {
  const rects = valeurs.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const total = valeurs.reduce((s, v) => s + (v > 0 ? v : 0), 0);
  if (total <= 0) return rects;

  const ordre = valeurs.map((_, i) => i).filter((i) => valeurs[i] > 0).sort((a, b) => valeurs[b] - valeurs[a] || a - b);
  const surfaces = ordre.map((i) => (valeurs[i] / total) * largeur * hauteur);
  let x = 0, y = 0, w = largeur, h = hauteur;
  let debut = 0;
  while (debut < ordre.length) {
    const cote = Math.min(w, h);
    let ligne = [surfaces[debut]];
    let pire = pireRapport(ligne, cote);
    let fin = debut + 1;
    while (fin < ordre.length) {
      const essai = [...ligne, surfaces[fin]];
      const p = pireRapport(essai, cote);
      if (p > pire) break;
      ligne = essai;
      pire = p;
      fin += 1;
    }
    const somme = ligne.reduce((a, b) => a + b, 0);
    if (w >= h) {
      const lw = somme / h;
      let cy = y;
      ligne.forEach((s, k) => { const rh = s / lw; rects[ordre[debut + k]] = { x, y: cy, w: lw, h: rh }; cy += rh; });
      x += lw; w -= lw;
    } else {
      const lh = somme / w;
      let cx = x;
      ligne.forEach((s, k) => { const rw = s / lh; rects[ordre[debut + k]] = { x: cx, y, w: rw, h: lh }; cx += rw; });
      y += lh; h -= lh;
    }
    debut = fin;
  }
  return rects;
}

// Les blocs d'un écran : les plus gros thèmes, et un bloc « Autres » qui absorbe les plus petits.
// Un bloc trop petit pour être lu et touché (moins de `min` d'un côté, dans un cadre largeur × hauteur)
// est versé dans « Autres », un par un en commençant par le plus petit, jusqu'à ce que tout tienne.
// `barres` : { cle, libelle, sets, filtre }. Rend des blocs { cle, libelle, sets, filtre, autres, nb, rect, echelle }.
export function blocsProportionnels(barres, { largeur = 100, hauteur = 62, min = 16, max = 8 } = {}) {
  const items = barres
    .filter((b) => b.sets > 0)
    .map((b) => ({ cle: b.cle, libelle: b.libelle, sets: b.sets, filtre: b.filtre, autres: false, nb: 1 }))
    .sort((a, b) => b.sets - a.sets);
  let blocs = items.slice(0, max);
  let reste = items.slice(max);

  const fusionner = (petit) => {
    reste = [...reste, petit];
  };
  const construire = () => {
    const autres = reste.length > 0
      ? [{ cle: '__autres', libelle: `Autres (${reste.reduce((n, b) => n + b.nb, 0)})`, sets: reste.reduce((s, b) => s + b.sets, 0), filtre: null, autres: true, nb: reste.reduce((n, b) => n + b.nb, 0) }]
      : [];
    return [...blocs, ...autres].sort((a, b) => b.sets - a.sets);
  };

  for (;;) {
    const courants = construire();
    const rects = treemap(courants.map((b) => b.sets), largeur, hauteur);
    const trop = rects.some((r) => r.w < min || r.h < min);
    const candidats = blocs.filter(() => true);
    if (!trop || courants.length <= 2 || candidats.length === 0) {
      const maxSets = Math.max(1, ...courants.map((b) => b.sets));
      return courants.map((b, i) => ({ ...b, rect: rects[i], echelle: echelle(b.sets / maxSets) }));
    }
    // verse le plus petit bloc non-« Autres » dans « Autres »
    const petit = candidats[candidats.length - 1];
    blocs = blocs.filter((b) => b !== petit);
    fusionner(petit);
  }
}

// De 1 (faible) à 5 (fort) : l'intensité de la teinte suit la taille du bloc.
function echelle(rapport) {
  if (rapport > 0.8) return 5;
  if (rapport > 0.6) return 4;
  if (rapport > 0.4) return 3;
  if (rapport > 0.2) return 2;
  return 1;
}
