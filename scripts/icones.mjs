// Fabrique les icônes PNG de la PWA à partir de public/favicon.svg.
// Les icônes « maskable » laissent une marge de sécurité de 20 % : Android
// découpe le bord en cercle ou en carré arrondi selon le lanceur.
//
// La marge reprend la couleur de fond du SVG (son premier <rect>) au lieu d'une valeur
// écrite ici : une couleur codée en dur dans ce script laissait un liseré de l'ancienne
// icône dès que le dessin changeait.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const fond = /<rect[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(svg)?.[1];
if (!fond) throw new Error('favicon.svg : couleur de fond introuvable (premier <rect> avec fill="#rrggbb")');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await navigateur.newPage();

async function png(taille, marge, fichier) {
  const interieur = Math.round(taille * (1 - 2 * marge));
  await page.setViewportSize({ width: taille, height: taille });
  await page.setContent(
    `<body style="margin:0;background:${fond};display:grid;place-items:center;width:${taille}px;height:${taille}px">` +
    `<div style="width:${interieur}px;height:${interieur}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`,
  );
  await page.screenshot({ path: new URL(`../public/${fichier}`, import.meta.url).pathname });
}

for (const t of [192, 512]) {
  await png(t, 0, `icon-${t}.png`);
  await png(t, 0.2, `icon-${t}-maskable.png`);
}
await navigateur.close();
