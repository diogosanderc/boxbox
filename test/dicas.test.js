const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const Kart = require('../js/kart.js');
const Dados = require('../js/data.js');
const Dicas = require('../js/dicas.js');

const MODELOS = ['kart', 'f4', 'f2', 'f1'];
const base = { ...Dados.KARTODROMOS.f1.find((p) => p.id === 'barcelona'), tipo: 'mista', altitude: 0, zebras: 'baixas', desnivel: 'Plana', grampos: 0, retas: [300, 250], extensao: 4600 };
const condBase = { molhado: false, tempAr: 22, tempPista: 34, borracha: 0.5 };

// Como simular cada condição da dica: devolve [pista, condição, pneu].
const SIMULAR = {
  veloz: () => [{ ...base, tipo: 'veloz' }, condBase, 'slick'],
  travada: () => [{ ...base, tipo: 'travada' }, condBase, 'slick'],
  chuva: () => [base, { ...condBase, molhado: true, tempAr: 19, tempPista: 21, borracha: 0 }, 'chuva'],
  calor: () => [base, { ...condBase, tempAr: 34, tempPista: 50 }, 'slick'],
  frio: () => [base, { ...condBase, tempAr: 12, tempPista: 20 }, 'slick'],
  altitude: () => [{ ...base, altitude: 1500 }, condBase, 'slick'],
  borracha: () => [base, { ...condBase, borracha: 1 }, 'slick'],
  zebrasAltas: () => [{ ...base, zebras: 'altas' }, condBase, 'slick'],
  ondulada: () => [{ ...base, desnivel: 'Sobe e desce' }, condBase, 'slick'],
  grampos: () => [{ ...base, grampos: 3 }, condBase, 'slick'],
  retas: () => [{ ...base, retas: [1500, 1200] }, condBase, 'slick'],
};

test('dicas: todo knob de todo modelo tem dica, sintomas e ação coerentes com os extremos', () => {
  for (const cat of MODELOS) {
    Kart.usarCategoria(cat);
    for (const k of Kart.ORDEM_AJUSTES) {
      assert.ok(Dicas.DICAS[k], `${cat}/${k}: sem dica`);
      const d = Kart.dicaAjuste(k);
      assert.ok(d && d.sintomas.length === 2 && d.direcao.length === 2, `${cat}/${k}: sem sintomas`);
      assert.ok(Dicas.html(k, d).includes('dica-cond'));
    }
  }
});

test('dicas: as setas de cada condição concordam com a fórmula do acerto ideal', () => {
  const categoriaDe = (k) => (['freio', 'diferencial', 'mapa'].includes(k) ? 'f2' : ['arrefecimento', 'ers'].includes(k) ? 'f1' : ['asaDianteira', 'asaTraseira', 'suspensao', 'altura', 'relacao'].includes(k) ? 'f4' : null);
  for (const [k, d] of Object.entries(Dicas.DICAS)) {
    // knobs com mais de um modelo (pressão) são conferidos em todos; os demais no modelo onde existem
    const cats = categoriaDe(k) ? [categoriaDe(k)] : (k === 'pressao' ? MODELOS : ['kart']);
    for (const cat of cats) {
      Kart.usarCategoria(cat);
      const ref = Kart.acertoIdeal(base, condBase, 'slick')[k];
      for (const [cond, seta] of d.quando) {
        const [p, c, pneu] = SIMULAR[cond]();
        const v = Kart.acertoIdeal(p, c, pneu)[k];
        assert.ok(Math.sign(Math.round((v - ref) * 1000)) === Math.sign(seta), `${cat}/${k} com "${cond}": seta ${seta}, mas o ideal foi ${ref} → ${v}`);
      }
    }
  }
});

test('dicas: toda frase das dicas tem tradução para o inglês', () => {
  global.BoxI18n = require('../js/i18n.js');
  for (const f of ['dados', 'kart', 'carreira', 'corrida', 'ui', 'dicas']) require(`../js/i18n-en-${f}.js`);
  BoxI18n.usar('en');
  const textos = new Set(['Onde fica o ponto', 'Quando mexer', 'O piloto reclama de…', 'Ver no carro', 'Temperatura do pneu na corrida', 'Pneu frio', 'Pneu quente demais', 'Relação longa', 'Relação curta', 'O que a troca faz', 'Rotação no fim da reta', 'coroa menor: relação longa', 'coroa maior: relação curta', 'marchas mais esticadas', 'marchas mais curtas', 'Força na saída', 'Velocidade final', 'Sobra folga', 'Zona vermelha', 'pinhão', 'coroa', 'movimento', 'Onde o ajuste mexe', 'ângulo pequeno', 'ângulo grande', 'Aderência nas curvas', 'Velocidade na reta', 'pressão', 'arrasto', 'Carro baixo', 'Carro alto', 'rente ao chão', 'longe do chão', 'Aderência (efeito solo)', 'Risco de bater no chão', 'Suspensão macia', 'Suspensão dura', 'balança, mas absorve', 'firme, mas quica', 'Absorve as zebras', 'Resposta nas curvas', 'as rodas giram diferente', 'as rodas giram juntas', 'Tração na saída', 'Giro na entrada', 'dentro', 'fora', 'a traseira trava primeiro', 'a frente trava primeiro', 'Risco de travar a traseira', 'Risco de travar a frente', 'entradas de ar pequenas', 'entradas de ar grandes', 'Temperatura do motor']);
  for (const c of Object.values(Dicas.CONDICAO)) if (c.rotulo !== 'Chuva') textos.add(c.rotulo);
  for (const d of Object.values(Dicas.DICAS)) { d.extremos.forEach((t) => textos.add(t)); if (d.aviso) textos.add(d.aviso); }
  for (const cat of MODELOS) { Kart.usarCategoria(cat); for (const k of Kart.ORDEM_AJUSTES) { const d = Kart.dicaAjuste(k); d.sintomas.forEach((t) => textos.add(t)); d.direcao.forEach((t) => textos.add(t)); } }
  const faltam = [...textos].filter((t) => t !== 'Altitude' && BoxI18n.traduzir(t) === t);
  assert.deepStrictEqual(faltam, []);
  BoxI18n.usar('pt');
});
