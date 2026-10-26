const test = require('node:test');
const assert = require('node:assert');
const Pista3D = require('../js/pista3d.js');
const Dados = require('../js/data.js');

test('pista 3D: o traçado real de Spa fecha o laço e tem a extensão da ficha', () => {
  const spa = Dados.KARTODROMOS.f1.find((p) => p.id === 'spa');
  const t = Pista3D.tracado(spa);
  assert.ok(t.length >= 200 && t.every((q) => isFinite(q[0]) && isFinite(q[1])));
  assert.ok(Math.abs(Pista3D.perimetro(t) / spa.extensao - 1) < 0.01);
});

test('pista 3D: circuito sem traçado real não tem pista 3D', () => {
  const monaco = Dados.KARTODROMOS.f1.find((p) => p.id === 'monaco');
  assert.strictEqual(Pista3D.tracado(monaco), null);
  assert.strictEqual(Pista3D.html(monaco), '');
});
