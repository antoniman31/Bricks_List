// Parcourt chaque écran de l'application, dans les deux thèmes et trois largeurs,
// et vérifie ce qu'une relecture de code ne voit pas : accessibilité (axe-core,
// WCAG 2.1 A et AA, dont les contrastes), cibles tactiles d'au moins 44 px,
// débordements horizontaux, et position de la navigation (barre du bas / rail).
//
// Lance `vite preview` sur le dossier `dist` : construire d'abord (`npm run build`).
// Sortie non nulle au moindre écart, pour bloquer le déploiement.
//
//   CHROMIUM=/opt/pw-browsers/chromium npm run verif:ui   (navigateur local)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PORT = 4174;
const URL = `http://localhost:${PORT}/Bricks_List/`;
const THEMES = ['dark', 'light'];
const LARGEURS = [360, 412, 900];

// Une collection qui exerce les cas difficiles : textes longs, données absentes,
// états variés, wishlist, image absente et image présente.
const THEMES_SETS = ['Star Wars', 'Icons', 'Technic', 'Ideas', 'City'];
const SETS = [];
for (let i = 0; i < 16; i += 1) {
  SETS.push({
    id: `p${i}`, numero: `${10000 + i}-1`, nom: `Set numéro ${i} avec un nom assez long pour passer à la ligne`,
    theme: i % 7 === 3 ? '' : THEMES_SETS[i % 5], annee: i % 6 === 2 ? null : 2008 + ((i * 3) % 17),
    pieces: i % 5 === 1 ? null : 300 + i * 211, statut: 'possédé', etat: ['scellé', 'monté', 'démonté', 'incomplet', null][i % 5],
    emplacement: i % 3 === 0 ? 'étagère 2' : '', boite: ['oui', 'non', null][i % 3], notice: [null, 'oui', 'non'][i % 3],
    etiquettes: i % 3 === 1 ? ['cadeau', 'à revendre'] : [],
    dateAchat: i % 4 === 0 ? '2026-03-01' : null, dateMontage: i % 8 === 0 ? '2026-03-15' : null,
    notes: 'une note', image: i % 2 ? 'https://cdn.rebrickable.com/media/sets/test.png' : null, dateAjout: `2026-0${1 + (i % 9)}-10T00:00:00.000Z`,
  });
}
for (let k = 0; k < 3; k += 1) {
  SETS.push({ id: `w${k}`, numero: `${20000 + k}-1`, nom: `Souhait ${k}`, theme: 'Icons', annee: 2024, pieces: 1500 * (k + 1), statut: 'souhaité', priorite: ['forte', 'un-jour', 'pas-presse', null][k % 4], etat: null, notes: '', image: null, dateAjout: '2026-10-10T00:00:00.000Z' });
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function attendreServeur() {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(URL)).ok) return; } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('vite preview ne répond pas : le dossier dist existe-t-il (npm run build) ?');
}

// Les écarts d'une page ouverte sur un écran donné.
async function verifier(page, largeur) {
  const axe = await page.evaluate(async (source) => {
    // eslint-disable-next-line no-new-func
    new Function(source).call(window);
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return r.violations.map((v) => `${v.id} (${v.nodes.length}) ${v.nodes[0].target.join(' ')} : ${v.help}`);
  }, AXE);

  const mesures = await page.evaluate((largeurPage) => {
    const visible = (r, s) => r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    const petits = [];
    for (const el of document.querySelectorAll('button, select, input:not([type=hidden]), textarea, a[href]')) {
      if (el.disabled) continue;
      // Une case ou un champ fichier se touche par son <label> : c'est lui la cible.
      const cible = el.matches('input[type=checkbox], input[type=file]') ? el.closest('label') ?? el : el;
      const r = cible.getBoundingClientRect(); const s = getComputedStyle(cible);
      if (visible(r, s) && r.height < 43.5) petits.push(`${el.tagName.toLowerCase()} « ${(el.textContent || el.getAttribute('aria-label') || el.placeholder || '').trim().slice(0, 24)} » ${Math.round(r.height)} px`);
    }
    const nav = document.querySelector('.nav')?.getBoundingClientRect();
    const dialogue = document.querySelector('dialog[open]');
    const corps = dialogue?.querySelector('.sheet__corps');
    const rd = dialogue?.getBoundingClientRect();
    return {
      petits: [...new Set(petits)],
      debordePage: document.documentElement.scrollWidth > innerWidth,
      debordeFeuille: Boolean(dialogue) && (rd.left < 0 || rd.right > innerWidth + 0.5 || corps.scrollWidth > corps.clientWidth),
      nav: nav ? { enBas: Math.abs(nav.bottom - innerHeight) < 1 && nav.width >= innerWidth - 1, aGauche: nav.left === 0 && nav.top === 0 && nav.width < 200 && Math.abs(nav.bottom - innerHeight) < 1 } : null,
      largeurPage,
    };
  }, largeur);

  const ecarts = [...axe.map((a) => `axe : ${a}`), ...mesures.petits.map((p) => `cible < 44 px : ${p}`)];
  if (mesures.debordePage) ecarts.push('débordement horizontal de la page');
  if (mesures.debordeFeuille) ecarts.push('feuille qui déborde de l\'écran');
  if (!mesures.nav) ecarts.push('navigation absente');
  else if (largeur < 600 && !mesures.nav.enBas) ecarts.push('navigation : devrait être une barre en bas');
  else if (largeur >= 600 && !mesures.nav.aGauche) ecarts.push('navigation : devrait être un rail à gauche');
  return ecarts;
}

const ECRANS = {
  'liste': async () => {},
  'liste par emplacement': async (p) => { await p.selectOption('select.champ', 'emplacement'); await p.waitForSelector('.rangee'); },
  'liste par emplacement (sélection)': async (p) => {
    await p.selectOption('select.champ', 'emplacement');
    await p.click('button:has-text("Sélectionner")');
    await p.locator('.rangee button:has-text("Choisir ce groupe")').first().click();
  },
  'wishlist (tri par priorité)': async (p) => {
    await p.click('.nav__item:has-text("Wishlist")');
    await p.selectOption('select.champ', 'priorite');
  },
  'formulaire (dates)': async (p) => { await p.locator('.carte').first().click(); await p.click('dialog[open] button:has-text("Modifier")'); await p.locator('input[type=date]').first().scrollIntoViewIfNeeded(); },
  'filtres (étiquette)': async (p) => { await p.click('button:has-text("Filtres")'); await p.click('.groupe__ligne:has-text("Étiquette")'); },
  'stats': async (p) => { await p.click('.nav__item:has-text("Stats")'); await p.waitForSelector('.stats'); },
  'wishlist': async (p) => { await p.click('.nav__item:has-text("Wishlist")'); },
  'recherche (résultats de l\'autre onglet)': async (p) => { await p.fill('input[type=search]', 'Souhait'); await p.waitForSelector('.ailleurs'); },
  'filtres': async (p) => { await p.click('button:has-text("Filtres")'); await p.click('.groupe__ligne:has-text("Emplacement")'); },
  'fiche': async (p) => { await p.locator('.carte').first().click(); },
  'formulaire (erreur)': async (p) => { await p.click('header >> text=Ajouter'); await p.click('button[type=submit]'); },
  'formulaire (recherche par nom)': async (p) => {
    await p.evaluate(() => localStorage.setItem('bl_rebrickable', 'cle-de-test-0123456789'));
    await p.reload(); await p.waitForSelector('.carte');
    await p.click('header >> text=Ajouter');
    await p.fill('#champ-recherche-nom', 'millennium falcon'); await p.keyboard.press('Enter'); await p.waitForSelector('.resultat');
  },
  'sélection (cartes cochées)': async (p) => {
    await p.click('button:has-text("Sélectionner")');
    await p.locator('.carte').nth(0).click(); await p.locator('.carte').nth(1).click();
    await p.waitForSelector('.carte[aria-checked=true]');
  },
  'modification en masse (aperçu)': async (p) => {
    await p.click('button:has-text("Sélectionner")');
    await p.locator('.carte').nth(0).click(); await p.locator('.carte').nth(1).click(); await p.locator('.carte').nth(2).click();
    await p.click('.nav__item:has-text("Modifier")');
    await p.fill('dialog[open] input[list=emplacements-masse]', 'étagère 3');
    await p.locator('dialog[open] label:has-text("État") select').selectOption('monté');
    await p.click('dialog[open] button:has-text("Voir l\'aperçu")');
    await p.waitForSelector('.masse__ligne');
  },
  'suppression en masse': async (p) => {
    await p.click('button:has-text("Sélectionner")');
    await p.locator('.carte').nth(0).click(); await p.locator('.carte').nth(1).click();
    await p.click('.nav__item:has-text("Supprimer")');
    await p.waitForSelector('.masse__ligne');
  },
  'réglages': async (p) => { await p.click('header >> text=Réglages'); },
  'lot (vérification)': async (p) => {
    await p.click('header >> text=Ajouter'); await p.click('button:has-text("Ajouter plusieurs sets")');
    await p.fill('dialog[open] textarea', '10001\n10002\n99001'); await p.click('dialog[open] button:has-text("Continuer")'); await p.waitForSelector('.coche');
  },
};

const serveur = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let total = 0;
const echecs = [];
try {
  await attendreServeur();
  const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  for (const theme of THEMES) {
    for (const largeur of LARGEURS) {
      const ctx = await navigateur.newContext({ colorScheme: theme, viewport: { width: largeur, height: 900 } });
      await ctx.route('https://cdn.rebrickable.com/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
      // Un Rebrickable de test : une recherche par nom paginée, et un thème.
      await ctx.route('https://rebrickable.com/api/v3/lego/**', (r) => {
        const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, accept, content-type', 'access-control-allow-methods': 'GET, OPTIONS' };
        if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
        const u = new globalThis.URL(r.request().url());
        const json = (corps) => r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(corps) });
        if (u.pathname.startsWith('/api/v3/lego/themes/')) return json({ id: 158, parent_id: null, name: 'Star Wars' });
        return json({ count: 25, next: 'https://rebrickable.com/api/v3/lego/sets/?page=2', previous: null, results: [75192, 10179, 7965].map((n, i) => ({ set_num: `${n}-1`, name: `Millennium Falcon version ${i + 1} avec un nom assez long pour passer à la ligne`, year: 2017 - i, theme_id: 158, num_parts: 7541 - i * 1000, set_img_url: 'https://cdn.rebrickable.com/media/sets/x.png' })) });
      });
      for (const [nom, aller] of Object.entries(ECRANS)) {
        const page = await ctx.newPage();
        page.setDefaultTimeout(4000);
        const erreursPage = [];
        page.on('pageerror', (e) => erreursPage.push(String(e)));
        await page.goto(URL);
        // Chaque écran part d'un état identique : les pages d'un même contexte partagent leur
        // stockage, et une clé laissée par un écran précédent changerait le suivant.
        await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('bl_v1', JSON.stringify({ version: 1, sets: s })); localStorage.setItem('bl_theme', 'auto'); }, SETS);
        await page.reload();
        await page.waitForSelector('.carte');
        // Un écran qu'on ne peut pas atteindre (un bouton masqué, un délai dépassé)
        // est un écart comme un autre : on le rapporte au lieu de planter.
        const ecarts = [];
        try {
          await aller(page);
          ecarts.push(...await verifier(page, largeur));
        } catch (e) {
          ecarts.push(`écran inaccessible : ${String(e.message).split('\n')[0]}`);
        }
        for (const e of erreursPage) ecarts.push(`erreur JavaScript : ${e}`);
        total += 1;
        for (const e of ecarts) echecs.push(`[${theme} ${largeur}px · ${nom}] ${e}`);
        await page.close();
      }
      await ctx.close();
    }
  }
  await navigateur.close();
} finally {
  serveur.kill();
}

console.log(`${total} écrans vérifiés (${THEMES.length} thèmes × ${LARGEURS.length} largeurs × ${Object.keys(ECRANS).length} écrans).`);
if (echecs.length > 0) {
  console.error(`\n${echecs.length} écart(s) :`);
  for (const e of echecs) console.error(` - ${e}`);
  process.exit(1);
}
console.log('Aucun écart.');
