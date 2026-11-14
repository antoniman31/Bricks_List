// Lance `verif-ui.mjs` en parallèle : une copie par largeur d'écran (les deux thèmes chacune), chacune avec son navigateur et son serveur
// de prévisualisation sur son propre port. Les contrôles sont exactement les mêmes que dans le mode en série (`npm run verif:ui:serie`) :
// seule la répartition change, ce qui divise le temps par trois ou quatre sur une machine à quatre cœurs (le CI de GitHub en a quatre).
// Construire d'abord (`vite build`) : le dossier `dist` est partagé en lecture seule.
//
// Sortie au même format que le mode en série (« N écrans vérifiés… », « Aucun écart. » ou « K écart(s) : » et la liste), code non nul au
// moindre écart ou si une copie plante : le CI et les habitudes de lecture ne changent pas.
//
//   CHROMIUM=/opt/pw-browsers/chromium npm run verif:ui          (parallèle)
//   CHROMIUM=/opt/pw-browsers/chromium npm run verif:ui:serie    (une seule copie, pour comprendre un échec)
//   VERIF_FILTRE=texte  ne rejoue que les parcours dont le nom contient ce texte (transmis aux copies).
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';

const THEMES = ['dark', 'light'];
const LARGEURS = [360, 412, 900, 1280];
const PORT_DE_BASE = 4174;
// Une copie par largeur, sans dépasser le nombre de cœurs : au-delà, les délais (4 s par geste) se mettraient à dépasser.
const COPIES = Math.max(1, Math.min(LARGEURS.length, availableParallelism()));

// Répartition des largeurs entre les copies, à tour de rôle (la plus large et la plus étroite ne finissent pas ensemble sur la même).
const groupes = Array.from({ length: COPIES }, () => []);
LARGEURS.forEach((l, i) => groupes[i % COPIES].push(l));

function lancer(largeurs, rang) {
  const configs = largeurs.flatMap((l) => THEMES.map((t) => `${t}:${l}`)).join(',');
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, ['scripts/verif-ui.mjs'], {
      env: { ...process.env, VERIF_PORT: String(PORT_DE_BASE + rang), VERIF_CONFIGS: configs },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let sortie = '';
    enfant.stdout.on('data', (d) => { sortie += d; });
    enfant.stderr.on('data', (d) => { sortie += d; });
    enfant.on('error', (e) => resoudre({ code: 1, sortie: `${sortie}\nimpossible de lancer la copie : ${e.message}` }));
    enfant.on('close', (code) => resoudre({ code, sortie }));
  });
}

const resultats = await Promise.all(groupes.map((g, i) => lancer(g, i)));

let ecrans = 0;
let parcours = 0;
const ecarts = [];
const plantages = [];
for (const [i, r] of resultats.entries()) {
  const m = /(\d+) écrans vérifiés \((\d+) thèmes × (\d+) largeurs × (\d+) écrans\)/.exec(r.sortie);
  if (m) { ecrans += Number(m[1]); parcours = Number(m[4]); } else plantages.push(`copie ${i + 1} (largeurs ${groupes[i].join(', ')}) : pas de bilan.\n${r.sortie.trim().split('\n').slice(-8).join('\n')}`);
  // Les lignes d'écart du mode en série : « - [thème largeur · parcours] message ».
  for (const ligne of r.sortie.split('\n')) if (/^ - \[/.test(ligne)) ecarts.push(ligne);
  if (r.code !== 0 && m && !/ - \[/.test(r.sortie)) plantages.push(`copie ${i + 1} : code de sortie ${r.code} sans écart listé.\n${r.sortie.trim().split('\n').slice(-8).join('\n')}`);
}

console.log(`${ecrans} écrans vérifiés (${THEMES.length} thèmes × ${LARGEURS.length} largeurs × ${parcours} écrans).`);
if (ecarts.length > 0 || plantages.length > 0) {
  const n = ecarts.length + plantages.length;
  console.error(`\n${n} écart(s) :`);
  for (const e of ecarts) console.error(e);
  for (const p of plantages) console.error(` - ${p}`);
  process.exit(1);
}
console.log('Aucun écart.');
