const test = require('node:test');
const assert = require('node:assert');
const Pista3D = require('../js/pista3d.js');
const Dados = require('../js/data.js');

test('pista 3D: todo circuito de monoposto gera um laço fechado, sem se cruzar e com a extensão da ficha', () => {
  for (const [regiao, lista] of Object.entries(Dados.KARTODROMOS)) for (const p of lista) {
    if (p.tracado) continue;
    const t = Pista3D.tracado(p);
    assert.ok(t.length > 40 && t.every((q) => isFinite(q[0]) && isFinite(q[1])), `${regiao}/${p.id}: pontos`);
    assert.ok(Pista3D.limpo(t, 22), `${regiao}/${p.id}: se cruza ou passa perto demais de si mesmo`);
    const razao = Pista3D.perimetro(t) / p.extensao;
    assert.ok(razao > 0.9 && razao < 1.1, `${regiao}/${p.id}: perímetro ${razao}`);
  }
});

test('pista 3D: o traçado é sempre o mesmo para a mesma pista', () => {
  const p = Dados.KARTODROMOS.f1.find((x) => x.id === 'monza');
  assert.deepStrictEqual(Pista3D.tracado(p), Pista3D.tracado({ ...p }));
});
