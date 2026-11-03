import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aujourdhuiISO, dateValide, anneeDe, formaterDate } from './dates.js';

const MAINTENANT = new Date(2026, 10, 3, 23, 30); // 3 novembre 2026, tard le soir

test('aujourdhuiISO suit le jour local, pas le jour UTC', () => {
  assert.equal(aujourdhuiISO(MAINTENANT), '2026-11-03');
  assert.equal(aujourdhuiISO(new Date(2026, 0, 5)), '2026-01-05');
});

test('dateValide accepte une vraie date passée ou du jour', () => {
  assert.equal(dateValide('2026-11-03', MAINTENANT), '2026-11-03');
  assert.equal(dateValide('2020-02-29', MAINTENANT), '2020-02-29');
  assert.equal(dateValide('1949-01-01', MAINTENANT), '1949-01-01');
});

test('dateValide refuse les formes et jours impossibles', () => {
  for (const v of ['2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10', '2026-11-3', '03/11/2026', '2026-11-03T10:00:00Z', ' 2026-11-03', '', null, undefined, 20261103, {}]) {
    assert.equal(dateValide(v, MAINTENANT), null, String(v));
  }
});

test('dateValide refuse avant 1949 et le futur (un jour de tolérance)', () => {
  assert.equal(dateValide('1948-12-31', MAINTENANT), null);
  assert.equal(dateValide('2026-11-04', MAINTENANT), '2026-11-04');
  assert.equal(dateValide('2026-11-05', MAINTENANT), null);
  assert.equal(dateValide('2099-01-01', MAINTENANT), null);
});

test('anneeDe et formaterDate', () => {
  assert.equal(anneeDe('2026-11-03'), 2026);
  assert.equal(anneeDe('n\'importe quoi'), null);
  assert.equal(formaterDate('2026-11-03'), (new Date(2026, 10, 3)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
  assert.match(formaterDate('2026-11-03'), /3 novembre 2026/);
  assert.equal(formaterDate('x'), '');
  assert.equal(formaterDate(null), '');
});
