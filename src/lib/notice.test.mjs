import { test } from 'node:test';
import assert from 'node:assert/strict';
import { urlNotice } from './notice.js';

test('urlNotice : le numéro sans le suffixe de version, sur lego.com en français', () => {
  assert.equal(urlNotice('75192-1'), 'https://www.lego.com/fr-fr/service/building-instructions/75192');
  assert.equal(urlNotice('75192'), 'https://www.lego.com/fr-fr/service/building-instructions/75192');
  assert.equal(urlNotice('10294-2'), 'https://www.lego.com/fr-fr/service/building-instructions/10294');
  assert.equal(urlNotice(' 40098-1 '), 'https://www.lego.com/fr-fr/service/building-instructions/40098');
});

test('urlNotice : un numéro invalide ne donne aucun lien, et rien ne s\'injecte dans l\'adresse', () => {
  for (const v of [null, undefined, '', 'abc', '75192-1/../x', '75192?x=1', 'javascript:alert(1)', '12', '123456789-1', {}]) assert.equal(urlNotice(v), null, String(v));
});
