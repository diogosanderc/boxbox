// O acerto ideal escondido precisa seguir a lógica do automobilismo: estes testes guardam as direções que as fontes
// (reportagens técnicas, regulamento Pirelli/FIA) sustentam, para uma mudança de fórmula não virar o carro de cabeça para baixo.
const test = require('node:test');
const assert = require('node:assert');
const Kart = require('../js/kart.js');
const Dados = require('../js/data.js');

const pistas = Object.fromEntries(Dados.KARTODROMOS.f1.map((p) => [p.id, p]));
const seco = (p, extra = {}) => ({ molhado: false, tempAr: p.clima, tempPista: p.clima + 11, borracha: 0.8, ...extra });
const chuva = (p) => ({ molhado: true, tempAr: p.clima - 3, tempPista: p.clima - 1, borracha: 0 });
const ideal = (p, c, pneu = 'slick', cat = 'f1') => { Kart.usarCategoria(cat); return Kart.acertoIdeal(p, c, pneu); };

const monza = () => pistas.monza, monaco = () => pistas.monaco, mexico = () => pistas.mexico;
const existe = () => assert.ok(pistas.monza && pistas.monaco && pistas.mexico, 'pistas de referência');

test('equilíbrio F1: Monza (veloz) pede pouca asa, carro plano, mapa forte e ERS nas retas; Mônaco o contrário', () => {
  existe();
  const a = ideal(monza(), seco(monza())), b = ideal(monaco(), seco(monaco()));
  assert.ok(a.asaTraseira < b.asaTraseira - 2, 'asa traseira');
  assert.ok(a.asaDianteira < b.asaDianteira - 2, 'asa dianteira');
  assert.ok(a.rake < b.rake, 'rake');
  assert.ok(a.mapa > b.mapa + 1, 'mapa do motor');
  assert.ok(a.ers > b.ers + 1, 'ERS: Monza escassa (retas), Mônaco farta (curvas)');
  assert.ok(a.diferencial < b.diferencial, 'diferencial: Mônaco mais travado');
});

test('equilíbrio F1: altitude (México) pede asa alta e o máximo de arrefecimento', () => {
  existe();
  const m = ideal(mexico(), seco(mexico())), z = ideal(monza(), seco(monza()));
  assert.ok(m.asaTraseira > z.asaTraseira + 2);
  assert.ok(m.arrefecimento >= 1.9);
  assert.ok(m.arrefecimento > z.arrefecimento);
});

test('equilíbrio F1: chuva pede mais asa, carro mais alto, suspensão mais macia, freio para trás e diferencial mais aberto', () => {
  for (const p of Object.values(pistas)) {
    const s = ideal(p, seco(p)), c = ideal(p, chuva(p), 'chuva');
    assert.ok(c.asaTraseira > s.asaTraseira, `${p.nome}: asa`);
    assert.ok(c.altura >= s.altura, `${p.nome}: altura`);
    assert.ok(c.suspensao <= s.suspensao, `${p.nome}: suspensão`);
    assert.ok(c.freio < s.freio, `${p.nome}: freio`);
    assert.ok(c.diferencial <= s.diferencial, `${p.nome}: diferencial`);
  }
});

test('equilíbrio F1: pista quente pede pressão inicial menor, fria pede maior (cerca de 1,25 psi por 10 °C), sempre dentro do piso da Pirelli', () => {
  const p = monza();
  const quente = ideal(p, seco(p, { tempAr: p.clima + 3, tempPista: p.clima + 8 })).pressao;
  const frio = ideal(p, seco(p, { tempAr: p.clima - 8, tempPista: p.clima - 2 })).pressao;
  assert.ok(quente < frio);
  assert.ok(Math.abs((frio - quente) - 1.25 * 1.0) < 0.6, 'inclinação perto de 1,25 psi por 10 °C');
  Kart.usarCategoria('f1');
  const { min, max } = Kart.AJUSTES.pressao;
  for (const q of Object.values(pistas)) for (const c of [seco(q), chuva(q)]) {
    const v = ideal(q, c, c.molhado ? 'chuva' : 'slick').pressao;
    assert.ok(v >= min && v <= max, `${q.nome}: pressão ${v}`);
    assert.ok(v >= Kart.pisoPressao(q), `${q.nome}: pressão ${v} abaixo do piso`);
  }
});

test('equilíbrio F1: calor e altitude abrem o arrefecimento; frio e chuva fecham', () => {
  const p = pistas.silverstone || monza();
  const base = ideal(p, seco(p)).arrefecimento;
  assert.ok(ideal(p, seco(p, { tempAr: p.clima + 10, tempPista: p.clima + 27 })).arrefecimento > base);
  assert.ok(ideal(p, seco(p, { tempAr: p.clima - 8, tempPista: p.clima - 2 })).arrefecimento < base);
  assert.ok(ideal(p, chuva(p), 'chuva').arrefecimento < base);
});

test('equilíbrio F1: cambagem fica na faixa da Pirelli e é mais negativa em pista veloz', () => {
  Kart.usarCategoria('f1');
  for (const p of Object.values(pistas)) {
    const v = ideal(p, seco(p)).camber;
    assert.ok(v >= -3.5 && v <= -2.5, `${p.nome}: ${v}`);
  }
  assert.ok(ideal(monza(), seco(monza())).camber < ideal(monaco(), seco(monaco())).camber);
});

test('equilíbrio: cada pista pede um acerto diferente (nenhum ajuste fica parado) e quase nada fica preso no limite', () => {
  Kart.usarCategoria('f1');
  for (const k of ['asaTraseira', 'altura', 'rake', 'diferencial', 'mapa', 'ers', 'suspensao']) {
    const vals = Object.values(pistas).map((p) => ideal(p, seco(p))[k]);
    assert.ok(Math.max(...vals) - Math.min(...vals) >= 0.8, `${k} varia pouco entre as pistas`);
  }
  for (const [nome, cond] of [['seco', seco], ['chuva', chuva]]) {
    for (const k of Kart.ORDEM_AJUSTES) {
      const a = Kart.AJUSTES[k], lo = a.tipo === 'opcoes' ? 0 : a.min, hi = a.tipo === 'opcoes' ? a.opcoes.length - 1 : a.max;
      const presos = Object.values(pistas).filter((p) => { const v = ideal(p, cond(p), nome === 'chuva' ? 'chuva' : 'slick')[k]; return v <= lo + 1e-6 || v >= hi - 1e-6; }).length;
      assert.ok(presos <= 12, `${k} (${nome}): ${presos} de 24 pistas pedem o limite do knob`);
    }
  }
});

test('equilíbrio: o acerto afinado desgasta menos o pneu que o de fábrica, que desgasta menos que um carro muito fora', () => {
  Kart.usarCategoria('f1');
  const p = pistas.silverstone || monza(), c = seco(p);
  const id = Kart.acertoIdeal(p, c, 'slick');
  const afinado = Kart.arredondarSetup(id), fabrica = Kart.setupPadrao();
  const fora = Object.fromEntries(Kart.ORDEM_AJUSTES.map((k) => { const a = Kart.AJUSTES[k]; return [k, a.tipo === 'opcoes' ? (Math.round(id[k]) >= 1 ? 0 : a.opcoes.length - 1) : (id[k] > (a.min + a.max) / 2 ? a.min : a.max)]; }));
  const d = (s) => Kart.efeito(s, p, c, 'slick').desgaste;
  assert.ok(d(afinado) < d(fabrica), 'afinado < fábrica');
  assert.ok(d(fabrica) < d(fora), 'fábrica < muito fora');
});

test('equilíbrio F1: piso de pressão varia por circuito (Mônaco baixo, Spa/Silverstone alto)', () => {
  Kart.usarCategoria('f1');
  const piso = (id) => Kart.pisoPressao(pistas[id]);
  assert.ok(piso('monaco') < piso('spa'));
});
