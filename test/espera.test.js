const test = require('node:test');
const assert = require('node:assert');
const Carreira = require('../js/carreira.js');

const H = 60 * 60 * 1000;
function temporadaTerminada(seed = 5) {
  const e = Carreira.novoJogo({ seed });
  e.espera = { ate: Date.now() + 24 * H };
  e.relogioMax = Date.now();
  return e;
}

test('espera entre temporadas: 24 h para quem não tem Premium, e some com o Premium', () => {
  Carreira.definirPremium(false);
  const e = temporadaTerminada();
  const agora = e.relogioMax;
  assert.ok(Math.abs(Carreira.esperaTemporada(e, agora) - 24 * H) < 1000);
  assert.ok(Math.abs(Carreira.esperaTemporada(e, agora + 10 * H) - 14 * H) < 1000);
  assert.strictEqual(Carreira.esperaTemporada(e, agora + 25 * H), 0);
  Carreira.definirPremium(true);
  assert.strictEqual(Carreira.esperaTemporada(temporadaTerminada(), Date.now()), 0);
  Carreira.definirPremium(false);
});

test('espera entre temporadas: voltar a hora do aparelho não muda a espera; o anúncio libera', () => {
  Carreira.definirPremium(false);
  const e = temporadaTerminada();
  const agora = e.relogioMax;
  Carreira.esperaTemporada(e, agora + 10 * H); // o relógio guardado avança 10 h
  assert.ok(Math.abs(Carreira.esperaTemporada(e, agora) - 14 * H) < 1000, 'hora voltada para trás: continua faltando 14 h');
  Carreira.liberarEspera(e);
  assert.strictEqual(Carreira.esperaTemporada(e, agora), 0);
});

test('espera entre temporadas: save antigo, sem espera guardada, joga direto', () => {
  Carreira.definirPremium(false);
  const e = Carreira.novoJogo({ seed: 9 });
  delete e.espera;
  assert.strictEqual(Carreira.esperaTemporada(e), 0);
});
