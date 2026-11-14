import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleExtra, choixExtra, estImageBoite, lireCleExtra, lireGalerie, nomDeChoix, nomImageBrickset, urlImageBrickset } from './galerie.js';

const BASE = 'https://images.brickset.com/sets/AdditionalImages/75192-1/';

test('nomImageBrickset : seulement la galerie de Brickset, sans paramètres ni chemin tordu', () => {
  assert.equal(nomImageBrickset(`${BASE}75192_Box1_V39.jpg`), '75192_Box1_V39.jpg');
  assert.equal(nomImageBrickset(`${BASE}75192_BI_Cover_&_Side_Color_Comp.jpg`), '75192_BI_Cover_&_Side_Color_Comp.jpg');
  assert.equal(nomImageBrickset(`${BASE}tn_75192_alt10_jpg.jpg`), 'tn_75192_alt10_jpg.jpg');
  for (const v of [
    `http://images.brickset.com/sets/AdditionalImages/75192-1/a.jpg`, `https://evil.example/sets/AdditionalImages/75192-1/a.jpg`,
    `https://images.brickset.com.evil.example/sets/AdditionalImages/75192-1/a.jpg`, 'https://images.brickset.com/sets/75192-1.jpg',
    `${BASE}a.jpg?x=1`, `${BASE}a.jpg#x`, `${BASE}..%2Fa.jpg`, `${BASE}a..jpg`, `${BASE}a.svg`, `${BASE}a.gif`, `${BASE}${'a'.repeat(100)}.jpg`,
    'https://u:p@images.brickset.com/sets/AdditionalImages/75192-1/a.jpg', 'https://images.brickset.com:8443/sets/AdditionalImages/75192-1/a.jpg',
    'https://images.brickset.com/sets/AdditionalImages/../x/a.jpg', null, 42, '',
  ]) assert.equal(nomImageBrickset(v), null, String(v));
  assert.equal(urlImageBrickset(`${BASE}a.jpg`), `${BASE}a.jpg`);
  assert.equal(urlImageBrickset('https://evil.example/a.jpg'), null);
});

test('clés et choix de liste : aller-retour, formes bancales refusées', () => {
  assert.equal(cleExtra('75192-1', 'a.jpg'), '75192-1|a.jpg');
  assert.deepEqual(lireCleExtra('75192-1|75192_Box1_V39.jpg'), { numero: '75192-1', nom: '75192_Box1_V39.jpg' });
  for (const v of ['75192|a.jpg', '75192-1|', '|a.jpg', '75192-1|../a.jpg', '75192-1|a.gif', '75192-1', null, 4]) assert.equal(lireCleExtra(v), null, String(v));
  assert.equal(choixExtra('a.jpg'), 'extra:a.jpg');
  assert.equal(nomDeChoix('extra:a.jpg'), 'a.jpg');
  for (const v of ['extra:', 'extra:../a.jpg', 'extra:a.gif', 'photo', 'rendu', 'extra', null, 3]) assert.equal(nomDeChoix(v), null, String(v));
});

test('estImageBoite : le nom parle de boîte', () => {
  assert.equal(estImageBoite('75192_Box1_V39.jpg'), true);
  assert.equal(estImageBoite('75192_alt10.jpg'), false);
});

test('lireGalerie : la réponse du relais ou le tableau stocké, filtrés, sans doublon, 40 au plus', () => {
  const brut = { images: [
    { url: `${BASE}a.jpg`, miniature: `${BASE}tn_a.jpg` },
    { url: `${BASE}a.jpg`, miniature: null },
    { url: 'https://evil.example/b.jpg' },
    { url: `${BASE}75192_Box1_V39.jpg`, miniature: 'https://evil.example/t.jpg' },
    null, 'x',
  ] };
  const g = lireGalerie(brut);
  assert.deepEqual(g, [
    { url: `${BASE}a.jpg`, miniature: `${BASE}tn_a.jpg`, nom: 'a.jpg', boite: false },
    { url: `${BASE}75192_Box1_V39.jpg`, miniature: null, nom: '75192_Box1_V39.jpg', boite: true },
  ]);
  assert.deepEqual(lireGalerie(g), g); // relu depuis le stockage : même résultat
  assert.deepEqual(lireGalerie({ images: [] }), []);
  for (const v of [null, undefined, 'x', 3, {}, { images: 'oui' }]) assert.equal(lireGalerie(v), null, String(v));
  const beaucoup = Array.from({ length: 100 }, (_, i) => ({ url: `${BASE}i${i}.jpg` }));
  assert.equal(lireGalerie(beaucoup).length, 40);
});
