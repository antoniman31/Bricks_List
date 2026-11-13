// Prix officiel d'un set (le prix public de lancement), en euros : seulement pour la wishlist, où il sert à
// savoir ce qu'on s'apprête à dépenser. Ni prix du marché, ni prix payé (décision de cadrage).
// Saisi à la main (jamais écrasé par une mise à jour) ou pré-rempli avec le prix allemand de Brickset par le
// relais : la France n'a pas de source, l'Allemagne est la seule région en euros, d'où la marque « DE ».
export const SOURCES_PRIX = ['manuelle', 'brickset-de'];
export const PRIX_MAX = 10000;

// Un prix en euros, arrondi au centime, ou null. Zéro et le négatif ne sont pas des prix.
export function prixValide(v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > PRIX_MAX) return null;
  return Math.round(v * 100) / 100;
}

// Ce que l'utilisateur tape : « 849,99 », « 849.99 », « 849 € », « 1 299,99 ». Renvoie le prix ou null.
export function lirePrixSaisi(texte) {
  if (typeof texte !== 'string' || texte.length > 20) return null;
  const propre = texte.replace(/[\s €]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(propre)) return null;
  return prixValide(Number(propre));
}

// « 850 € » pour un prix rond, « 89,90 € » sinon (jamais « 89,9 € »).
const EURO_ROND = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const EURO = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formaterPrix = (n) => (prixValide(n) === null ? '' : Number.isInteger(n) ? EURO_ROND.format(n) : EURO.format(n));
// Dans un champ de saisie : « 849,99 », sans symbole.
export const prixPourSaisie = (n) => (prixValide(n) === null ? '' : String(n).replace('.', ','));

// Tranches du filtre. `sans-prix` sert à repérer ce qu'il reste à renseigner.
export const TRANCHES_PRIX = [
  { cle: 'moins-50', libelle: 'Moins de 50 €', min: 0, max: 50 },
  { cle: '50-100', libelle: '50 à 100 €', min: 50, max: 100 },
  { cle: '100-200', libelle: '100 à 200 €', min: 100, max: 200 },
  { cle: '200-plus', libelle: '200 € et plus', min: 200, max: Infinity },
  { cle: 'sans-prix', libelle: 'Sans prix' },
];

export function correspondPrix(set, cle) {
  const tranche = TRANCHES_PRIX.find((t) => t.cle === cle);
  if (!tranche) return true;
  const p = prixValide(set?.prix);
  if (tranche.cle === 'sans-prix') return p === null;
  return p !== null && p >= tranche.min && p < tranche.max;
}

// Du moins cher au plus cher (ou l'inverse) ; les sets sans prix toujours en dernier, dans les deux sens.
export function comparerPrix(sens = 1) {
  return (a, b) => {
    const pa = prixValide(a?.prix);
    const pb = prixValide(b?.prix);
    if (pa === null || pb === null) return pa === pb ? 0 : pa === null ? 1 : -1;
    return (pa - pb) * sens;
  };
}

// Total de ce qui est affiché : somme des prix connus, et nombre de sets sans prix (le total serait trompeur
// sans cette précision). Calculé en centimes entiers pour éviter les écarts de virgule flottante.
export function totalPrix(sets) {
  let centimes = 0;
  let avecPrix = 0;
  let sansPrix = 0;
  for (const s of sets) {
    const p = prixValide(s?.prix);
    if (p === null) sansPrix += 1;
    else { centimes += Math.round(p * 100); avecPrix += 1; }
  }
  return { total: centimes / 100, avecPrix, sansPrix };
}

export function libelleTotal({ total, avecPrix, sansPrix }) {
  if (avecPrix === 0) return '';
  const sans = sansPrix > 0 ? ` · ${sansPrix} sans prix` : '';
  return `${formaterPrix(total)}${sans}`;
}

// Sets à interroger pour leur prix : ceux de la wishlist sans prix, ou dont le prix vient de Brickset (il peut
// avoir changé). Jamais un prix saisi à la main.
export function aPreRemplir(set) {
  return set?.statut === 'souhaité' && set.prixSource !== 'manuelle' && (prixValide(set.prix) === null || set.prixSource === 'brickset-de');
}
