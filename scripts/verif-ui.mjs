// Parcourt chaque écran de l'application, dans les deux thèmes et quatre largeurs,
// et vérifie ce qu'une relecture de code ne voit pas : accessibilité (axe-core,
// WCAG 2.1 A et AA, dont les contrastes), cibles tactiles d'au moins 48 px,
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
const LARGEURS = [360, 412, 900, 1280];

// Une collection qui exerce les cas difficiles : textes longs, données absentes,
// états variés, wishlist, image absente et image présente.
const THEMES_SETS = ['Star Wars', 'Icons', 'Technic', 'Ideas', 'City'];
const SETS = [];
for (let i = 0; i < 16; i += 1) {
  SETS.push({
    id: `p${i}`, numero: i === 5 ? '10000-1' : `${10000 + i}-1`, // p0 et p5 : un doublon, pour le badge ×2
    nom: `Set numéro ${i} avec un nom assez long pour passer à la ligne`,
    theme: i % 7 === 3 ? '' : THEMES_SETS[i % 5], annee: i % 6 === 2 ? null : 2008 + ((i * 3) % 17),
    pieces: i % 5 === 1 ? null : 300 + i * 211, statut: 'possédé', etat: ['scellé', 'neuf', 'en cours', 'monté', null][i % 5],
    emplacement: i % 3 === 0 ? 'étagère 2' : '', boite: ['oui', 'non', null][i % 3], notice: [null, 'oui', 'non'][i % 3],
    etiquettes: i % 3 === 1 ? ['cadeau', 'à revendre'] : [],
    dateAchat: i % 4 === 0 ? '2026-03-01' : null, dateMontage: i % 8 === 0 ? '2026-03-15' : null,
    notes: 'une note', image: i % 2 ? 'https://cdn.rebrickable.com/media/sets/test.png' : null, dateAjout: `2026-0${1 + (i % 9)}-10T00:00:00.000Z`,
  });
}
for (let k = 0; k < 3; k += 1) {
  SETS.push({ id: `w${k}`, numero: `${20000 + k}-1`, nom: `Souhait ${k}`, theme: 'Icons', annee: 2024, pieces: 1500 * (k + 1), statut: 'souhaité', priorite: ['forte', 'un-jour', 'pas-presse', null][k % 4], etat: null, notes: '', image: null, dateSortie: [`${new Date().getFullYear() + 1}-03-01`, '2020-05-05', null][k], sortieSource: ['manuelle', 'brickset', null][k], dateAjout: '2026-10-10T00:00:00.000Z' });
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
      if (visible(r, s) && r.height < 47.5) petits.push(`${el.tagName.toLowerCase()} « ${(el.textContent || el.getAttribute('aria-label') || el.placeholder || '').trim().slice(0, 24)} » ${Math.round(r.height)} px`);
    }
    const nav = document.querySelector('.nav')?.getBoundingClientRect();
    const dialogue = document.querySelector('dialog[open]');
    const corps = dialogue?.querySelector('.sheet__corps');
    const rd = dialogue?.getBoundingClientRect();
    return {
      petits: [...new Set(petits)],
      debordePage: document.documentElement.scrollWidth > innerWidth,
      debordeFeuille: Boolean(dialogue) && (rd.left < 0 || rd.right > innerWidth + 0.5 || corps.scrollWidth > corps.clientWidth),
      saisie: Boolean(document.querySelector('.appli--saisie')),
      dockEnBas: (() => { const d = document.querySelector('.dock')?.getBoundingClientRect(); return Boolean(d) && d.bottom <= innerHeight + 0.5 && d.bottom > innerHeight - 120; })(),
      nav: nav ? { enBas: Math.abs(nav.bottom - innerHeight) < 1 && nav.width >= innerWidth - 1, aGauche: nav.left === 0 && nav.top === 0 && nav.width < 200 && Math.abs(nav.bottom - innerHeight) < 1 } : null,
      largeurPage,
    };
  }, largeur);

  const ecarts = [...axe.map((a) => `axe : ${a}`), ...mesures.petits.map((p) => `cible < 48 px : ${p}`)];
  if (mesures.debordePage) ecarts.push('débordement horizontal de la page');
  if (mesures.debordeFeuille) ecarts.push('feuille qui déborde de l\'écran');
  if (mesures.saisie && largeur < 600) {
    // Pendant la saisie la navigation est rangée à dessein ; la recherche doit alors rester visible en bas.
    if (!mesures.dockEnBas) ecarts.push('recherche : devrait rester visible en bas pendant la saisie');
  }
  else if (!mesures.nav) ecarts.push('navigation absente');
  else if (largeur < 600 && !mesures.nav.enBas) ecarts.push('navigation : devrait être une barre en bas');
  else if (largeur >= 600 && !mesures.nav.aGauche) ecarts.push('navigation : devrait être un rail à gauche');
  return ecarts;
}

// Les contrôles principaux n'ont plus de texte visible à toutes les largeurs : on les vise par leur nom accessible.
const AJOUTER = 'button[aria-label="Ajouter un set"]';
// Le + ouvre l'ajout rapide ; le formulaire complet est derrière « Plus d'options ».
const PLUS_OPTIONS = 'dialog[open] button:has-text("Plus d\'options")';
const FORMULAIRE = async (p) => { await p.click(AJOUTER); await p.click(PLUS_OPTIONS); await p.waitForSelector('.sheet--plein'); };
const REGLAGES = 'button[aria-label="Réglages"]';
const FILTRES = 'button[aria-label^="Filtres"]';
const GRILLE = 'button[aria-label="Afficher en grille"]';
const SELECTIONNER = 'button[aria-label="Sélectionner des sets"]';
// Le tri se règle dans la feuille « Filtres et tri » : on l'ouvre, on choisit, on la referme.
async function trier(p, libelle) {
  await p.click(FILTRES);
  await p.click(`dialog[open] .rubrique .puce:has-text("${libelle}")`);
  await p.click('dialog[open] .bouton--plein');
}

// Les parcours qui vérifient un comportement (et pas seulement un rendu) lèvent une erreur au moindre
// écart : elle est rapportée comme « écran inaccessible » avec ce message.
const exiger = (ok, message) => { if (!ok) throw new Error(message); };
async function filtrerTheme(p, theme) {
  await p.click(FILTRES);
  await p.click('dialog[open] .groupe__ligne:has-text("Thème")');
  await p.click(`dialog[open] .groupe:has(.groupe__ligne:has-text("Thème")) .puce:text-is("${theme}")`);
  await p.click('dialog[open] .bouton--plein');
}
// Choisit une « photo de téléphone » (1 600 × 1 200, dessinée à la volée) dans le champ galerie de la fiche.
async function choisirPhoto(p) {
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1200;
    const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 1600, 1200);
    g.addColorStop(0, '#c33'); g.addColorStop(1, '#36c'); x.fillStyle = g; x.fillRect(0, 0, 1600, 1200);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
    const champ = document.querySelector('input[type=file][accept="image/*"]:not([capture])');
    champ.files = dt.files; champ.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
// Taille (octets) de la première photo en stock, 0 s'il n'y en a aucune, -1 si la base est illisible.
// Nombre d'images gardées sur l'appareil dans un magasin d'IndexedDB (« boites » ou « rendus »), -1 si la base est illisible.
const nbBoitesStock = (p, magasin = 'boites') => p.evaluate((m) => new Promise((res) => {
  const o = indexedDB.open('bl_photos');
  o.onsuccess = () => {
    if (!o.result.objectStoreNames.contains(m)) return res(0);
    const g = o.result.transaction(m).objectStore(m).count();
    g.onsuccess = () => res(g.result); g.onerror = () => res(-1);
  };
  o.onerror = () => res(-1);
}), magasin);
const tailleEnStock = (p) => p.evaluate(() => new Promise((res) => {
  const o = indexedDB.open('bl_photos');
  o.onsuccess = () => { const g = o.result.transaction('photos').objectStore('photos').getAll(); g.onsuccess = () => res(g.result[0] ? g.result[0].size : 0); g.onerror = () => res(-1); };
  o.onerror = () => res(-1);
}));
const nbFiltresActifs = async (p) => Number(((await p.getAttribute(FILTRES, 'aria-label')).match(/(\d+) actif/) ?? [0, 0])[1]);

const ECRANS = {
  'liste': async () => {},
  // Comportements : chaque onglet garde ses filtres, et ils survivent à un rechargement.
  'filtres conservés après rechargement': async (p) => {
    const total = await p.locator('.carte').count();
    await filtrerTheme(p, 'Icons');
    const filtrees = await p.locator('.carte').count();
    exiger(filtrees > 0 && filtrees < total, 'le filtre ne réduit pas la liste');
    await p.reload(); await p.waitForSelector('.carte');
    exiger(await p.locator('.carte').count() === filtrees, 'le filtre n\'a pas survécu au rechargement');
    exiger(await nbFiltresActifs(p) === 1, 'la pastille ne compte pas le filtre rétabli');
  },
  'onglets : filtres indépendants': async (p) => {
    await filtrerTheme(p, 'Icons');
    await p.click('.nav__item:has-text("Wishlist")');
    exiger(await nbFiltresActifs(p) === 0, 'la wishlist hérite du filtre de la collection');
    await p.click(FILTRES);
    await p.click('dialog[open] .groupe__ligne:has-text("Priorité")');
    await p.locator('dialog[open] .groupe:has(.groupe__ligne:has-text("Priorité")) .puce').nth(1).click();
    await p.click('dialog[open] .bouton--plein');
    exiger(await nbFiltresActifs(p) === 1, 'le filtre de la wishlist n\'est pas appliqué');
    await p.click('.nav__item:has-text("Collection")');
    exiger(await nbFiltresActifs(p) === 1, 'la collection a perdu son filtre');
    await p.click(FILTRES);
    exiger(await p.locator('dialog[open] .groupe__ligne:has-text("Thème") .groupe__valeur:text-is("Icons")').count() === 1, 'la collection n\'a pas gardé son thème');
  },
  // Un export partagé en .txt (repli de Chrome Android) s'importe comme le .json.
  'import d\'un fichier .txt': async (p) => {
    await p.click(REGLAGES);
    await p.click('dialog[open] summary:has-text("Importer un fichier")');
    const contenu = JSON.stringify({ version: 1, sets: [{ id: 'imp1', numero: '30009-1', nom: 'Set importé', statut: 'possédé', theme: 'City', annee: 2024, pieces: 300, etat: 'neuf', dateAjout: '2026-10-10T00:00:00.000Z' }] });
    await p.setInputFiles('dialog[open] input[type=file]', { name: 'transfert.txt', mimeType: 'text/plain', buffer: Buffer.from(contenu) });
    await p.waitForSelector('dialog[open] .avis:has-text("1 set lu")');
    await p.click('dialog[open] button:has-text("Fusionner")');
    await p.waitForSelector('dialog[open] [role=status]:has-text("1 ajouté")');
    exiger(await p.evaluate(() => JSON.parse(localStorage.getItem('bl_v1')).sets.some((x) => x.numero === '30009-1')), 'le set importé n\'est pas enregistré');
  },
  // Boîte (BrickLink) si elle existe, sinon rendu Rebrickable, sinon le numéro. Le test simule BrickLink :
  // les numéros impairs ont une photo, les pairs répondent 404.
  'boîtes : repli sur le rendu puis le numéro': async (p) => {
    const base = { statut: 'possédé', theme: 'City', annee: 2024, pieces: 300, etat: 'neuf', dateAjout: '2026-10-11T00:00:00.000Z' };
    await p.evaluate((b) => {
      const d = JSON.parse(localStorage.getItem('bl_v1'));
      d.sets.push({ ...b, id: 'bA', numero: '30001-1', nom: 'Boîte test A', image: null }, { ...b, id: 'bB', numero: '30002-1', nom: 'Boîte test B', image: 'https://cdn.rebrickable.com/media/sets/test.png' }, { ...b, id: 'bC', numero: '30004-1', nom: 'Boîte test C', image: null });
      localStorage.setItem('bl_v1', JSON.stringify(d));
    }, base);
    await p.reload(); await p.waitForSelector('.carte');
    await p.fill('input[type=search]', 'Boîte test');
    await p.waitForFunction(() => document.querySelectorAll('.carte').length === 3);
    await p.waitForFunction(() => {
      const source = (c) => { const i = c.querySelector('img.vignette'); return !i ? 'numero' : i.src.includes('bricklink') ? 'boite' : i.src.includes('rebrickable') ? 'rendu' : '?'; };
      const lues = Object.fromEntries([...document.querySelectorAll('.carte')].map((c) => [c.querySelector('.carte__nom').textContent.trim().slice(-1), source(c)]));
      return lues.A === 'boite' && lues.B === 'rendu' && lues.C === 'numero';
    });
    await p.locator('input[type=search]').blur();
  },
  // Photo personnelle : l'onglet vide, la feuille de recadrage, puis le parcours complet (enregistrer, relire
  // après rechargement, retirer). La photo gardée doit être réduite (quelques centaines de Ko au plus).
  'fiche (ma photo, vide)': async (p) => {
    await p.locator('.carte').first().click();
    await p.click('button.puce:text-is("Ma photo")');
    await p.waitForSelector('.photo-vide');
  },
  'photo : recadrage': async (p) => {
    await p.locator('.carte').first().click();
    await p.click('button.puce:text-is("Ma photo")');
    await choisirPhoto(p);
    await p.waitForSelector('dialog[open] .recadrage__image');
  },
  // Boîtes gardées sur l'appareil : chaque boîte affichée depuis BrickLink est enregistrée, puis servie en premier
  // quand BrickLink ne répond plus. Le BrickLink de test donne une photo aux numéros impairs, 404 aux pairs.
  'boîtes : gardées puis servies sans BrickLink': async (p) => {
    for (let i = 0; i < 40 && await nbBoitesStock(p) === 0; i += 1) await p.waitForTimeout(150);
    exiger(await nbBoitesStock(p) > 0, 'aucune boîte affichée n\'a été gardée sur l\'appareil');
    await p.route('https://img.bricklink.com/**', (r) => r.abort());
    await p.reload(); await p.waitForSelector('.carte');
    await p.waitForFunction(() => document.querySelectorAll('.carte img.vignette[data-origine="boite"]').length > 0);
  },
  'boîtes : sauvegarder toutes (réglages)': async (p) => {
    await p.click(REGLAGES);
    await p.click('dialog[open] summary:has-text("Images sur")');
    await p.click('dialog[open] button:has-text("Sauvegarder toutes les images")');
    await p.waitForSelector('dialog[open] .avis:has-text("sauvegardée")', { timeout: 20000 });
    const attendu = await p.evaluate(() => new Set(JSON.parse(localStorage.getItem('bl_v1')).sets.map((x) => x.numero).filter((n) => parseInt(n, 10) % 2 === 1)).size);
    exiger(attendu > 0 && await nbBoitesStock(p) === attendu, `les boîtes disponibles doivent toutes être gardées (attendu ${attendu}, gardé ${await nbBoitesStock(p)})`);
  },
  // Rendus Rebrickable : leur CDN n'a pas de CORS, la copie passe par le relais (simulé ici). Sans relais configuré,
  // la sauvegarde le dit ; avec, les rendus sont gardés puis servis quand Rebrickable ne répond plus.
  'rendus : sans relais, la sauvegarde le dit': async (p) => {
    await p.evaluate(() => localStorage.removeItem('bl_relais'));
    await p.reload(); await p.waitForSelector('.carte');
    await p.click(REGLAGES);
    await p.click('dialog[open] summary:has-text("Images sur")');
    await p.click('dialog[open] button:has-text("Sauvegarder toutes les images")');
    await p.waitForSelector('dialog[open] [role=alert]:has-text("ajoute le relais")', { timeout: 20000 });
    exiger(await nbBoitesStock(p, 'rendus') === 0, 'sans relais, aucun rendu ne doit être gardé');
  },
  'rendus : copiés par le relais puis servis sans Rebrickable': async (p) => {
    let demandes = 0;
    await p.route('https://relais-test.example/image**', (r) => { demandes += 1; return r.fulfill({ status: 200, contentType: 'image/png', body: PNG, headers: { 'Access-Control-Allow-Origin': '*' } }); });
    await p.evaluate(() => localStorage.setItem('bl_relais', JSON.stringify({ url: 'https://relais-test.example', jeton: '' })));
    await p.reload(); await p.waitForSelector('.carte');
    await p.click(REGLAGES);
    await p.click('dialog[open] summary:has-text("Images sur")');
    await p.click('dialog[open] button:has-text("Sauvegarder toutes les images")');
    await p.waitForSelector('dialog[open] .avis:has-text("rendu")', { timeout: 20000 });
    const attendu = await p.evaluate(() => new Set(JSON.parse(localStorage.getItem('bl_v1')).sets.filter((x) => x.image).map((x) => x.numero)).size);
    exiger(attendu > 0 && await nbBoitesStock(p, 'rendus') === attendu, `tous les rendus doivent être gardés (attendu ${attendu}, gardé ${await nbBoitesStock(p, 'rendus')}, ${demandes} demandes au relais)`);
    // Rebrickable coupé, rendu demandé en premier : l'image vient de l'appareil.
    await p.route('https://cdn.rebrickable.com/**', (r) => r.abort());
    await p.evaluate(() => localStorage.setItem('bl_image_liste', 'rendu'));
    await p.reload(); await p.waitForSelector('.carte');
    await p.waitForFunction(() => document.querySelectorAll('.carte img.vignette[data-origine="rendu"]').length > 0);
  },
  // Dans un contexte de navigateur NEUF (aucun cache, aucun service worker, aucune boîte gardée) : un appareil qui n'a
  // jamais vu BrickLink. Les contextes du parcours partagent leurs caches, qui resservaient des images malgré la coupure.
  'boîtes : BrickLink en maintenance, la sauvegarde s\'arrête': async (p) => {
    const donnees = await p.evaluate(() => localStorage.getItem('bl_v1'));
    const neuf = await p.context().browser().newContext({ viewport: p.viewportSize() });
    try {
      let appels = 0;
      await neuf.route('https://img.bricklink.com/**', (r) => { appels += 1; return r.abort(); });
      await neuf.route('https://cdn.rebrickable.com/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
      const q = await neuf.newPage();
      q.setDefaultTimeout(4000);
      await q.goto(URL);
      await q.evaluate((d) => { localStorage.clear(); localStorage.setItem('bl_v1', d); }, donnees);
      await q.reload(); await q.waitForSelector('.carte');
      appels = 0;
      await q.click(REGLAGES);
      await q.click('dialog[open] summary:has-text("Images sur")');
      await q.click('dialog[open] button:has-text("Sauvegarder toutes les images")');
      try {
        await q.waitForSelector('dialog[open] [role=alert]:has-text("BrickLink ne répond pas")', { timeout: 20000 });
      } catch {
        const vu = (await q.locator('dialog[open] .avis').allInnerTexts()).join(' | ');
        throw new Error(`pas d'arrêt de la sauvegarde (${appels} demandes à BrickLink) ; la feuille dit : « ${vu} »`);
      }
      exiger(appels <= 6, `la sauvegarde doit s'arrêter vite quand BrickLink ne répond pas (${appels} demandes)`);
    } finally {
      await neuf.close();
    }
  },
  // Collection vers wishlist : la confirmation dit ce qui est perdu, la priorité se choisit, et l'annulation
  // juste après remet le set exactement comme avant (état et date d'achat compris).
  'fiche (remettre en wishlist)': async (p) => {
    await p.locator('.carte').first().click();
    await p.click('button.fiche__remise');
    await p.waitForSelector('[role=alertdialog]:has-text("Perdus")');
  },
  'remettre en wishlist : fiche, avec annulation': async (p) => {
    const lire = () => p.evaluate(() => JSON.parse(localStorage.getItem('bl_v1')).sets);
    const avant = await lire();
    await p.locator('.carte').first().click();
    await p.click('button.fiche__remise');
    await p.click('[role=alertdialog] .puce:text-is("Un jour")');
    await p.click('[role=alertdialog] button:has-text("Remettre en wishlist")');
    await p.waitForSelector('.avis:has-text("remis en wishlist")');
    const apres = await lire();
    const bouge = apres.filter((x) => x.statut === 'souhaité' && avant.find((y) => y.id === x.id)?.statut === 'possédé');
    exiger(bouge.length === 1, 'un seul set doit passer de la collection à la wishlist');
    exiger(bouge[0].priorite === 'un-jour' && bouge[0].etat === null && bouge[0].dateAchat === null && bouge[0].emplacement === '', 'la priorité doit être posée et les champs de collection effacés');
    exiger(bouge[0].etiquettes.length === (avant.find((y) => y.id === bouge[0].id).etiquettes ?? []).length, 'les étiquettes doivent être gardées');
    await p.click('.avis button:has-text("Annuler")');
    const restaure = (await lire()).find((x) => x.id === bouge[0].id);
    const origine = avant.find((x) => x.id === bouge[0].id);
    exiger(restaure.statut === 'possédé' && restaure.etat === origine.etat && restaure.dateAchat === origine.dateAchat, 'l\'annulation doit rendre l\'état et la date d\'achat');
  },
  'sélection : remettre en wishlist (aperçu)': async (p) => {
    await p.click(SELECTIONNER);
    await p.locator('.carte').nth(0).click(); await p.locator('.carte').nth(1).click();
    await p.click('.nav__item:has-text("Wishlist")');
    await p.waitForSelector('dialog[open] [role=alert]:has-text("Perdus")');
  },
  'remettre en wishlist : sélection': async (p) => {
    const nbSouhaites = () => p.evaluate(() => JSON.parse(localStorage.getItem('bl_v1')).sets.filter((x) => x.statut === 'souhaité').length);
    const avant = await nbSouhaites();
    await p.click(SELECTIONNER);
    await p.locator('.carte').nth(0).click(); await p.locator('.carte').nth(1).click();
    await p.click('.nav__item:has-text("Wishlist")');
    await p.click('dialog[open] .puce:text-is("Envie forte")');
    await p.click('dialog[open] button:has-text("Remettre 2 sets")');
    await p.waitForSelector('.avis:has-text("2 sets remis en wishlist")');
    exiger(await nbSouhaites() === avant + 2, 'deux sets doivent arriver en wishlist');
    await p.click('.avis button:has-text("Annuler")');
    exiger(await nbSouhaites() === avant, 'l\'annulation doit remettre les deux sets en collection');
  },
  // Dates de sortie : affichage, filtre, saisie à la main, puis mise à jour par le relais (simulé plus bas).
  'wishlist (dates de sortie)': async (p) => {
    await p.click('.nav__item:has-text("Wishlist")');
    await p.waitForSelector('.carte:has-text("Sort ")');
    exiger(await p.locator('button:has-text("Mettre à jour les dates")').count() === 1, 'le bouton « Mettre à jour les dates » manque');
  },
  'wishlist grille (dates de sortie)': async (p) => {
    await p.click(GRILLE);
    await p.click('.nav__item:has-text("Wishlist")');
    await p.waitForSelector('.carte--tuile .carte__sortie');
  },
  'filtres (sortie)': async (p) => {
    await p.click('.nav__item:has-text("Wishlist")');
    await p.click(FILTRES);
    await p.click('dialog[open] .groupe__ligne:has-text("Sortie")');
    await p.waitForSelector('dialog[open] .puce:text-is("À venir")');
  },
  'dates de sortie : filtre et tri': async (p) => {
    await p.click('.nav__item:has-text("Wishlist")');
    const total = await p.locator('.carte').count();
    await p.click(FILTRES);
    await p.click('dialog[open] .groupe:has(.groupe__ligne:has-text("Sortie")) .groupe__ligne');
    await p.click('dialog[open] .groupe:has(.groupe__ligne:has-text("Sortie")) .puce:text-is("À venir")');
    await p.click('dialog[open] .bouton--plein');
    exiger(await p.locator('.carte').count() === 1 && total > 1, 'le filtre « À venir » doit garder exactement le set annoncé');
    await p.click(FILTRES);
    await p.click('dialog[open] .groupe:has(.groupe__ligne:has-text("Sortie")) .puce:text-is("Déjà sorti")');
    await p.click('dialog[open] .bouton--plein');
    exiger(await p.locator('.carte').count() === 1, 'le filtre « Déjà sorti » doit garder exactement le set sorti');
  },
  'fiche : date de sortie saisie à la main': async (p) => {
    await p.click('.nav__item:has-text("Wishlist")');
    await p.locator('.carte:has-text("Souhait 2")').click();
    await p.click('.fiche__ligne--edit:has(dt:text-is("Sortie")) .fiche__valeur');
    const dans = new Date(); dans.setDate(dans.getDate() + 40);
    const iso = `${dans.getFullYear()}-${String(dans.getMonth() + 1).padStart(2, '0')}-${String(dans.getDate()).padStart(2, '0')}`;
    await p.fill('input[type=date][aria-label="Sortie"]', iso);
    await p.waitForSelector('.fiche__ligne--edit:has(dt:text-is("Sortie")) .fiche__valeur:has-text("dans 40 jours")');
    const stocke = await p.evaluate(() => JSON.parse(localStorage.getItem('bl_v1')).sets.find((x) => x.nom === 'Souhait 2'));
    exiger(stocke.dateSortie === iso && stocke.sortieSource === 'manuelle', 'la date saisie n\'est pas enregistrée comme manuelle');
  },
  'dates de sortie : mise à jour par le relais': async (p) => {
    await p.evaluate(() => localStorage.setItem('bl_relais', JSON.stringify({ url: 'https://relais.test', jeton: '' })));
    await p.reload(); await p.waitForSelector('.carte');
    await p.click('.nav__item:has-text("Wishlist")');
    await p.click('button:has-text("Mettre à jour les dates")');
    await p.waitForSelector('.avis:has-text("enregistrée")', { timeout: 20000 });
    const sets = await p.evaluate(() => JSON.parse(localStorage.getItem('bl_v1')).sets);
    const brickset = sets.filter((x) => x.sortieSource === 'brickset');
    exiger(brickset.length > 1, 'aucune date n\'a été enregistrée depuis le relais');
    exiger(brickset.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.dateSortie)), 'une date du relais est mal formée');
    const manuel = sets.find((x) => x.nom === 'Souhait 0');
    exiger(manuel.sortieSource === 'manuelle' && manuel.dateSortie.endsWith('-03-01'), 'une date saisie à la main a été écrasée');
  },
  // Image de la liste : choisie sur la fiche (étoile), puis par la règle des Réglages. La carte montre
  // la photo (une image « blob: », lue dans IndexedDB) seulement dans ces cas.
  'photo : choisie pour la liste (fiche)': async (p) => {
    const cartePhoto = () => p.evaluate(() => document.querySelectorAll('.carte img.vignette[data-origine="photo"]').length);
    await p.locator('.carte').first().click();
    await p.click('button.puce:has-text("Ma photo")');
    await choisirPhoto(p);
    await p.waitForSelector('dialog[open] .recadrage__image');
    await p.click('dialog[open] button:has-text("Enregistrer")');
    await p.waitForSelector('img.vignette--fiche[alt^="Ma photo"]');
    exiger(await cartePhoto() === 0, 'une photo non choisie apparaît déjà dans la liste');
    await p.click('button:has-text("Utiliser dans la liste")');
    await p.waitForSelector('.photo-fiche > .bouton[aria-pressed=true]');
    await p.waitForFunction(() => document.querySelectorAll('.carte img.vignette[data-origine="photo"]').length === 1);
    exiger(await p.evaluate(() => JSON.parse(localStorage.getItem('bl_v1')).sets.filter((x) => x.imageListe === 'photo').length) === 1, 'le choix n\'est pas enregistré dans la fiche');
    await p.click('.photo-fiche > .bouton[aria-pressed=true]');
    await p.waitForFunction(() => document.querySelectorAll('.carte img.vignette[data-origine="photo"]').length === 0);
  },
  'photo : règle des Réglages': async (p) => {
    await p.locator('.carte').first().click();
    await p.click('button.puce:has-text("Ma photo")');
    await choisirPhoto(p);
    await p.waitForSelector('dialog[open] .recadrage__image');
    await p.click('dialog[open] button:has-text("Enregistrer")');
    await p.waitForSelector('img.vignette--fiche[alt^="Ma photo"]');
    const fermer = p.locator('dialog[open] button[aria-label="Fermer"]');
    if (await fermer.count()) await fermer.click();
    await p.click(REGLAGES);
    await p.click('dialog[open] summary:has-text("Apparence")');
    await p.click('dialog[open] [aria-label="Image de la liste"] .puce:has-text("Ma photo")');
    await p.click('dialog[open] button[aria-label="Fermer"]');
    await p.waitForFunction(() => document.querySelectorAll('.carte img.vignette[data-origine="photo"]').length === 1);
    await p.reload(); await p.waitForSelector('.carte');
    await p.waitForFunction(() => document.querySelectorAll('.carte img.vignette[data-origine="photo"]').length === 1);
  },
  'photo : enregistrée, relue, retirée': async (p) => {
    await p.locator('.carte').first().click();
    await p.click('button.puce:text-is("Ma photo")');
    await choisirPhoto(p);
    await p.waitForSelector('dialog[open] .recadrage__image');
    await p.click('dialog[open] button:has-text("Enregistrer")');
    await p.waitForSelector('img.vignette--fiche[alt^="Ma photo"]');
    const octets = await tailleEnStock(p);
    exiger(octets > 0 && octets < 300 * 1024, `photo gardée de ${octets} octets (attendu : réduite, moins de 300 Ko)`);
    await p.reload(); await p.waitForSelector('.carte');
    await p.locator('.carte').first().click();
    await p.click('button.puce:text-is("Ma photo")');
    await p.waitForSelector('img.vignette--fiche[alt^="Ma photo"]');
    await p.click('.photo-actions button:has-text("Retirer")');
    await p.click('[role=alertdialog] button:has-text("Retirer")');
    await p.waitForSelector('.photo-vide');
    exiger(await tailleEnStock(p) === 0, 'la photo retirée est encore en stock');
  },
  'liste par emplacement': async (p) => { await trier(p, 'Emplacement'); await p.waitForSelector('.rangee'); },
  'liste par emplacement (sélection)': async (p) => {
    await trier(p, 'Emplacement');
    await p.click(SELECTIONNER);
    await p.locator('.rangee button:has-text("Choisir ce groupe")').first().click();
  },
  'wishlist (tri par priorité)': async (p) => {
    await p.click('.nav__item:has-text("Wishlist")');
    await trier(p, 'Priorité');
  },
  'formulaire (dates)': async (p) => { await p.locator('.carte').first().click(); await p.locator('dialog[open] button:has-text("Plus d\'options"), aside.detail button:has-text("Plus d\'options")').first().click(); await p.locator('input[type=date]').first().scrollIntoViewIfNeeded(); },
  'filtres (étiquette)': async (p) => { await p.click(FILTRES); await p.click('.groupe__ligne:has-text("Étiquette")'); },
  'grille': async (p) => { await p.click(GRILLE); await p.waitForSelector('.liste--grille'); },
  'grille (sélection)': async (p) => {
    await p.click(GRILLE); await p.click(SELECTIONNER);
    await p.locator('.carte').nth(0).click(); await p.locator('.carte').nth(1).click();
  },
  'grille par emplacement': async (p) => { await p.click(GRILLE); await trier(p, 'Emplacement'); await p.waitForSelector('.rangee .liste--grille'); },
  // À 840 px et plus : le panneau de détail à droite (le deuxième set choisi) ; dessous, la feuille.
  'détail d\'un set': async (p) => { await p.locator('.carte').nth(1).click(); },
  // Le bouton de thème de l'en-tête : un appui (auto vers clair), l'écran doit rester conforme.
  'bouton de thème': async (p) => { await p.click('button[aria-label^="Thème"]'); await p.waitForTimeout(150); },
  // Une nouvelle version est prête : le bandeau propose « Plus tard » et « Recharger » à toutes les largeurs.
  'nouvelle version (bandeau)': async (p) => {
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload(); await p.waitForSelector('.carte');
    // Le bandeau n'apparaît que si le serveur annonce un autre fichier de code que celui de la page : on le simule.
    await p.evaluate(() => {
      const reel = window.fetch.bind(window);
      window.fetch = (u, o) => (String(u).endsWith('/Bricks_List/') ? Promise.resolve(new Response('<script src="/Bricks_List/assets/index-NOUVEAU.js"></script>')) : reel(u, o));
      navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
    });
    await p.waitForSelector('.maj');
  },
  // Le bouton « Vérifier les mises à jour » des Réglages : le serveur de test sert le même build, donc « à jour ».
  'réglages (vérification de version)': async (p) => {
    await p.click(REGLAGES);
    await p.click('dialog[open] summary:has-text("Mise à jour")');
    await p.click('dialog[open] button:has-text("Vérifier les mises à jour")');
    await p.waitForSelector('dialog[open] [role=status]:has-text("dernière version")');
  },
  'stats': async (p) => { await p.click('.nav__item:has-text("Stats")'); await p.waitForSelector('.stats'); },
  'stats (détails dépliés)': async (p) => {
    await p.click('.nav__item:has-text("Stats")'); await p.waitForSelector('.stats');
    await p.click('.stats__detail:has-text("thèmes")');
    const annees = p.locator('.stats__detail:has-text("Voir par année")');
    if (await annees.count()) await annees.click();
  },
  'wishlist': async (p) => { await p.click('.nav__item:has-text("Wishlist")'); },
  'recherche (résultats de l\'autre onglet)': async (p) => { await p.fill('input[type=search]', 'Souhait'); await p.waitForSelector('.ailleurs'); await p.locator('input[type=search]').blur(); },
  // Clavier ouvert (champ actif) : sur téléphone la navigation se range, la recherche reste en bas de l'écran.
  'recherche (champ actif)': async (p) => { await p.locator('input[type=search]').focus(); await p.keyboard.type('Set'); },
  'filtres': async (p) => { await p.click(FILTRES); await p.click('.groupe__ligne:has-text("Emplacement")'); },
  'fiche': async (p) => { await p.locator('.carte').first().click(); },
  'fiche (ranger dans)': async (p) => {
    await p.locator('.carte').first().click();
    await p.click('.fiche__ligne--edit:has(dt:text-is("Emplacement")) .fiche__valeur');
    await p.waitForSelector('.rangement');
  },
  'fiche (état et étiquettes dépliés)': async (p) => {
    await p.locator('.carte').first().click();
    await p.click('.chiffres__cle');
    await p.click('.fiche__ligne--edit:has(dt:text-is("Étiquettes")) .fiche__valeur');
    await p.click('.fiche__ligne--edit:has(dt:text-is("Boîte")) .fiche__valeur');
    await p.click('.fiche__ligne--edit:has(dt:text-is("Acheté le")) .fiche__valeur');
    await p.waitForSelector('.fiche__edition');
  },
  'ajout rapide': async (p) => { await p.click(AJOUTER); await p.waitForSelector('#rapide-champ'); },
  'ajout rapide (numéro saisi)': async (p) => {
    await p.click(AJOUTER);
    await p.fill('#rapide-champ', '75192');
    await p.click('dialog[open] .resume');
    await p.click('dialog[open] .puce:has-text("Nouveau")');
    await p.waitForSelector('input[aria-label="Nom du nouvel emplacement"]');
  },
  'formulaire (erreur)': async (p) => { await FORMULAIRE(p); await p.click('dialog[open] button[type=submit]'); },
  'ajout rapide (recherche par nom)': async (p) => {
    await p.evaluate(() => localStorage.setItem('bl_rebrickable', 'cle-de-test-0123456789'));
    await p.reload(); await p.waitForSelector('.carte');
    await p.click(AJOUTER);
    await p.fill('#rapide-champ', 'millennium falcon'); await p.keyboard.press('Enter'); await p.waitForSelector('dialog[open] .resultat');
  },
  'formulaire (recherche par nom)': async (p) => {
    await p.evaluate(() => localStorage.setItem('bl_rebrickable', 'cle-de-test-0123456789'));
    await p.reload(); await p.waitForSelector('.carte');
    await FORMULAIRE(p);
    await p.fill('#champ-recherche-nom', 'millennium falcon'); await p.keyboard.press('Enter'); await p.waitForSelector('.resultat');
  },
  'sélection (cartes cochées)': async (p) => {
    await p.click(SELECTIONNER);
    await p.locator('.carte').nth(0).click(); await p.locator('.carte').nth(1).click();
    await p.waitForSelector('.carte[aria-checked=true]');
  },
  'modification en masse (aperçu)': async (p) => {
    await p.click(SELECTIONNER);
    await p.locator('.carte').nth(0).click(); await p.locator('.carte').nth(1).click(); await p.locator('.carte').nth(2).click();
    await p.click('.nav__item:has-text("Modifier")');
    await p.click('dialog[open] button.puce:has-text("Nouveau")');
    await p.fill('dialog[open] input[aria-label="Nom du nouvel emplacement"]', 'étagère 3');
    await p.locator('dialog[open] label:has-text("État") select').selectOption('monté');
    await p.click('dialog[open] [aria-label="Étiquettes à retirer"] .puce >> nth=0');
    await p.fill('dialog[open] input[aria-label="Nouvelles étiquettes"]', 'noël, à offrir');
    await p.click('dialog[open] button:has-text("Voir l\'aperçu")');
    await p.waitForSelector('.masse__ligne');
  },
  'modification en masse (étiquettes)': async (p) => {
    await p.click(SELECTIONNER);
    await p.locator('.carte').nth(0).click(); await p.locator('.carte').nth(1).click(); await p.locator('.carte').nth(2).click();
    await p.click('.nav__item:has-text("Modifier")');
    await p.click('dialog[open] [aria-label="Étiquettes à retirer"] .puce >> nth=0');
    await p.fill('dialog[open] input[aria-label="Nouvelles étiquettes"]', 'noël');
  },
  'suppression en masse': async (p) => {
    await p.click(SELECTIONNER);
    await p.locator('.carte').nth(0).click(); await p.locator('.carte').nth(1).click();
    await p.click('.nav__item:has-text("Supprimer")');
    await p.waitForSelector('.masse__ligne');
  },
  'réglages': async (p) => { await p.click(REGLAGES); },
  // Sections dépliées : le contenu le plus long, celui où un débordement se verrait.
  'réglages (tout déplié)': async (p) => {
    await p.click(REGLAGES);
    for (const s of await p.locator('dialog[open] summary').all()) await s.click();
  },
  'formulaire (abandon)': async (p) => {
    await p.click(AJOUTER);
    await p.fill('#rapide-champ', '75192');
    await p.click('dialog[open] button[aria-label="Fermer"]');
    await p.waitForSelector('.sheet__garde');
  },
  'lot (vérification)': async (p) => {
    await p.click(AJOUTER); await p.click('dialog[open] button:has-text("Plusieurs")');
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
      // Photos de boîte : une sur deux existe, l'autre répond 404 et doit retomber sur le rendu Rebrickable.
      await ctx.route('https://img.bricklink.com/**', (r) => (parseInt(r.request().url().split('/').pop(), 10) % 2
        ? r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG })
        : r.fulfill({ status: 404, contentType: 'text/html', body: '' })));
      // Un relais Brickset de test : les numéros divisibles par 3 n'ont pas de date, les autres sortent en juin.
      await ctx.route('https://relais.test/**', (r) => {
        const entetes = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'X-Jeton', 'content-type': 'application/json' };
        if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: entetes });
        const numero = new globalThis.URL(r.request().url()).searchParams.get('numero');
        const lancement = parseInt(numero, 10) % 3 === 0 ? null : `${new Date().getFullYear() + 1}-06-01`;
        return r.fulfill({ status: 200, headers: entetes, body: JSON.stringify({ numero, trouve: true, lancement, retrait: null, disponibilite: null }) });
      });
      // Un Rebrickable de test : une recherche par nom paginée, et un thème.
      await ctx.route('https://rebrickable.com/api/v3/lego/**', (r) => {
        const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, accept, content-type', 'access-control-allow-methods': 'GET, OPTIONS' };
        if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
        const u = new globalThis.URL(r.request().url());
        const json = (corps) => r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(corps) });
        if (u.pathname.startsWith('/api/v3/lego/themes/')) return json({ id: 158, parent_id: null, name: 'Star Wars' });
        return json({ count: 25, next: 'https://rebrickable.com/api/v3/lego/sets/?page=2', previous: null, results: [75192, 10179, 7965].map((n, i) => ({ set_num: `${n}-1`, name: `Millennium Falcon version ${i + 1} avec un nom assez long pour passer à la ligne`, year: 2017 - i, theme_id: 158, num_parts: 7541 - i * 1000, set_img_url: 'https://cdn.rebrickable.com/media/sets/x.png' })) });
      });
      // VERIF_FILTRE=texte : ne rejoue que les parcours dont le nom contient ce texte (pour comprendre un échec). VERIF_TRACE=1 :
      // affiche ce que la page écrit dans sa console.
      for (const [nom, aller] of Object.entries(ECRANS)) {
        if (process.env.VERIF_FILTRE && !nom.includes(process.env.VERIF_FILTRE)) continue;
        const page = await ctx.newPage();
        page.setDefaultTimeout(4000);
        const erreursPage = [];
        page.on('pageerror', (e) => erreursPage.push(String(e)));
        if (process.env.VERIF_TRACE) page.on('console', (m) => console.log(`[${theme} ${largeur}px · ${nom}] console ${m.type()}: ${m.text().slice(0, 160)}`));
        await page.goto(URL);
        // Chaque écran part d'un état identique : les pages d'un même contexte partagent leur
        // stockage, et une clé laissée par un écran précédent changerait le suivant.
        await page.evaluate(() => new Promise((fini) => { const q = indexedDB.deleteDatabase('bl_photos'); q.onsuccess = q.onerror = q.onblocked = () => fini(); }));
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
