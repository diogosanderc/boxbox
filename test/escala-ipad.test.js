const test = require('node:test');
const assert = require('node:assert');
const { viewportPara } = require('../js/escala-ipad.js');

const esc = (txt) => +txt.match(/initial-scale=([\d.]+)/)[1];
const larg = (txt) => +txt.match(/width=(\d+)/)[1];

test('iPhone: viewport normal, sem ampliar', () => {
  for (const [l, a] of [[375, 667], [393, 852], [430, 932], [667, 375]]) {
    assert.match(viewportPara(l, a), /width=device-width/, `${l}x${a}`);
  }
});

test('iPad em pé: a coluna de 480 px é ampliada para ocupar a tela', () => {
  const v = viewportPara(820, 1180);
  assert.ok(esc(v) > 1.3 && esc(v) < 1.8, v);
  assert.ok(larg(v) * esc(v) >= 819 && larg(v) * esc(v) <= 821, 'a largura ampliada cobre a tela: ' + v);
  assert.ok(larg(v) >= 480, 'cabe a coluna inteira');
});

test('iPad deitado: a altura limita a ampliação e a coluna fica centrada', () => {
  const v = viewportPara(1366, 1024);
  assert.ok(esc(v) <= 1024 / 700 + 0.001, v);
  assert.ok(larg(v) > 480, 'sobra largura dos lados: ' + v);
  assert.ok(esc(v) >= 1.2, v);
});
