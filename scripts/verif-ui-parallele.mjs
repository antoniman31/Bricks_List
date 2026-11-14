// Lance `verif-ui.mjs` en parallèle : quatre copies, chacune avec son navigateur et son serveur de prévisualisation sur son propre port,
// chacune jouant un quart des parcours. Les contrôles sont exactement les mêmes que dans le mode en série (`npm run verif:ui:serie`) :
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

const PORT_DE_BASE = 4174;
// Une copie par cœur, quatre au plus : au-delà, les délais (4 s par geste) se mettraient à dépasser.
const COPIES = Math.max(1, Math.min(4, availableParallelism()));

// Chaque copie joue les parcours dont le rang vaut i modulo n, dans toutes les configurations : la charge est ainsi répartie à parts égales
// (répartir par largeur laissait la plus chargée finir bien après les autres).
function lancer(rang) {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, ['scripts/verif-ui.mjs'], {
      env: { ...process.env, VERIF_PORT: String(PORT_DE_BASE + rang), VERIF_PARTIE: `${rang}/${COPIES}` },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let sortie = '';
    enfant.stdout.on('data', (d) => { sortie += d; });
    enfant.stderr.on('data', (d) => { sortie += d; });
    enfant.on('error', (e) => resoudre({ code: 1, sortie: `${sortie}\nimpossible de lancer la copie : ${e.message}` }));
    enfant.on('close', (code) => resoudre({ code, sortie }));
  });
}

const resultats = await Promise.all(Array.from({ length: COPIES }, (_, i) => lancer(i)));

let ecrans = 0;
let parcours = 0;
const ecarts = [];
const plantages = [];
for (const [i, r] of resultats.entries()) {
  const m = /(\d+) écrans vérifiés \((\d+) parcours/.exec(r.sortie);
  if (m) { ecrans += Number(m[1]); parcours = Number(m[2]); } else plantages.push(`copie ${i + 1} : pas de bilan.\n${r.sortie.trim().split('\n').slice(-8).join('\n')}`);
  // Les lignes d'écart du mode en série : « - [thème largeur · parcours] message ».
  for (const ligne of r.sortie.split('\n')) if (/^ - \[/.test(ligne)) ecarts.push(ligne);
  if (r.code !== 0 && m && !/ - \[/.test(r.sortie)) plantages.push(`copie ${i + 1} : code de sortie ${r.code} sans écart listé.\n${r.sortie.trim().split('\n').slice(-8).join('\n')}`);
}

console.log(`${ecrans} écrans vérifiés (${parcours} parcours ; ceux qui vérifient un comportement en 360 et 1280 px seulement, les autres aux 6 configurations).`);
if (ecarts.length > 0 || plantages.length > 0) {
  const n = ecarts.length + plantages.length;
  console.error(`\n${n} écart(s) :`);
  for (const e of ecarts) console.error(e);
  for (const p of plantages) console.error(` - ${p}`);
  process.exit(1);
}
console.log('Aucun écart.');
