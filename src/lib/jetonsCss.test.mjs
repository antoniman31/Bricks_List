import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Règle commune « Design » : couleurs par jetons, jamais en dur. Les valeurs ne vivent que dans les deux blocs de jetons (thème sombre
// sur `:root`, thème clair sur `html[data-theme='light']`) ; tout le reste du CSS les lit par `var(--…)`. Ce test lit le CSS tel quel.
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

// Retire un bloc de premier niveau, de son sélecteur à la première accolade fermante en début de ligne.
function sansBloc(texte, debut) {
  const lignes = texte.split('\n');
  const i = lignes.findIndex((l) => l.startsWith(debut));
  assert.ok(i >= 0, `bloc de jetons introuvable : ${debut}`);
  const j = lignes.findIndex((l, k) => k > i && l === '}');
  assert.ok(j > i, `fin du bloc introuvable : ${debut}`);
  return lignes.map((l, k) => (k >= i && k <= j ? '' : l)).join('\n');
}

test('aucune couleur en dur hors des deux blocs de jetons', () => {
  const sansJetons = sansBloc(sansBloc(css, ':root {'), "html[data-theme='light'] {");
  // Les commentaires peuvent citer une valeur (« 9,5:1 », un hexadécimal) sans la porter : on les vide en gardant les lignes.
  const nu = sansJetons.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''));
  const trouvees = [];
  nu.split('\n').forEach((ligne, i) => {
    for (const m of ligne.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|hwb|lab|lch)\(/g)) trouvees.push(`ligne ${i + 1} : ${m[0]}`);
  });
  assert.deepEqual(trouvees, [], `couleurs en dur à passer en jetons :\n${trouvees.join('\n')}`);
});

test('les jetons de couleur existent dans les deux thèmes', () => {
  const noms = (debut) => {
    const lignes = css.split('\n');
    const i = lignes.findIndex((l) => l.startsWith(debut));
    const j = lignes.findIndex((l, k) => k > i && l === '}');
    return new Set(lignes.slice(i, j).flatMap((l) => [...l.matchAll(/^\s*(--[\w-]+)\s*:/g)].map((m) => m[1])));
  };
  const sombre = noms(':root {');
  const clair = noms("html[data-theme='light'] {");
  // Un jeton de couleur défini d'un seul côté lirait la valeur du thème sombre dans le clair (ou rien du tout).
  const orphelins = [...sombre].filter((n) => /voile|sur-photo|filet/.test(n) && !clair.has(n));
  assert.deepEqual(orphelins, [], `jetons absents du thème clair : ${orphelins.join(', ')}`);
});
