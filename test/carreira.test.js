const test = require('node:test');
const assert = require('node:assert');
const Engine = require('../js/engine.js');
const Kart = require('../js/kart.js');
const Dados = require('../js/data.js');
const Carreira = require('../js/carreira.js');

// Joga um fim de semana inteiro. estrategia: 'padrao' (não mexe no acerto) ou 'ideal' (acerto perfeito, só para teste).
function jogarFimDeSemana(estado, estrategia = 'padrao') {
  // Cuidados básicos de paddock: patrocínio, pneu novo e revisão do motor quando der.
  for (const o of estado.ofertasPatrocinio.slice()) Carreira.aceitarPatrocinio(estado, o.id);
  if (!estado.pneus.some((p) => p.tipo === 'slick' && p.uso < 5)) Carreira.comprarPneu(estado, 'slick');
  if (estado.motorHoras >= Carreira.HORAS_REVISAO) Carreira.revisarMotor(estado);
  const r = Carreira.iniciarFimDeSemana(estado);
  if (!r.ok) { Carreira.pularEtapa(estado); return null; }
  const pista = Carreira.pistaAtual(estado);
  const clima = Carreira.climaAtual(estado);
  // Treina com o pneu mais velho e guarda o novo para a classificação e a corrida.
  const velho = estado.pneus.filter((p) => p.tipo === 'slick').sort((a, b) => b.uso - a.uso)[0];
  if (velho) Carreira.escolherPneu(estado, velho.id);
  for (let i = 0; i < 2; i++) Carreira.saidaTreino(estado);
  Carreira.irParaClassificacao(estado);
  const molhado = clima.tarde.inicioChuva === 'quali';
  const tipo = molhado ? 'chuva' : 'slick';
  const pneu = estado.pneus.filter((p) => p.tipo === tipo).sort((a, b) => a.uso - b.uso)[0];
  if (pneu) Carreira.escolherPneu(estado, pneu.id);
  if (estrategia === 'ideal') {
    estado.fds.setup = Kart.arredondarSetup(Kart.acertoIdeal(pista, Kart.condicao(clima, 'corrida', molhado), tipo));
  }
  Carreira.classificar(estado);
  const corrida = Engine.simularCompleta(Carreira.criarCorrida(estado));
  const res = Carreira.concluirCorrida(estado, corrida);
  Carreira.concluirEtapa(estado);
  return res;
}

test('novo jogo: equipe escolhida, dinheiro da equipe, 20 karts no grid', () => {
  const e = Carreira.novoJogo({ nome: 'Teste', equipeId: 'garagem', seed: 1 });
  assert.strictEqual(e.dinheiro, Dados.EQUIPES.find((x) => x.id === 'garagem').caixa);
  assert.strictEqual(e.rivais.length, 19);
  for (const eq of Dados.EQUIPES) {
    const n = e.rivais.filter((r) => r.equipe === eq.id).length + (eq.id === 'garagem' ? 1 : 0);
    assert.strictEqual(n, 2, eq.id);
  }
  assert.strictEqual(e.pneus.length, 3);
});

test('mesma semente, mesmo jogo', () => {
  const a = Carreira.novoJogo({ seed: 9 });
  const b = Carreira.novoJogo({ seed: 9 });
  jogarFimDeSemana(a);
  jogarFimDeSemana(b);
  assert.deepStrictEqual(a, b);
});

test('acerto ideal deixa o kart mais rápido que um acerto ruim', () => {
  const pista = Dados.KARTODROMOS.br[0];
  const cond = { tempAr: 30, tempPista: 44, molhado: false, borracha: 0.8 };
  const ideal = Kart.acertoIdeal(pista, cond, 'slick');
  const ruim = { pressao: 15, eixo: 0, bitola: 2, coroa: 76, carburacao: 3 };
  assert.ok(Kart.efeito(ideal, pista, cond, 'slick').tempo < 0.01);
  assert.ok(Kart.efeito(ruim, pista, cond, 'slick').tempo > 1.5);
});

test('o acerto ideal muda com a temperatura e com a chuva', () => {
  const pista = Dados.KARTODROMOS.br[0];
  const frio = Kart.acertoIdeal(pista, { tempAr: 15, tempPista: 20, molhado: false, borracha: 0.3 }, 'slick');
  const quente = Kart.acertoIdeal(pista, { tempAr: 32, tempPista: 46, molhado: false, borracha: 0.8 }, 'slick');
  const chuva = Kart.acertoIdeal(pista, { tempAr: 18, tempPista: 20, molhado: true, borracha: 0 }, 'chuva');
  assert.ok(frio.pressao > quente.pressao);
  assert.ok(frio.eixo < quente.eixo);
  assert.ok(chuva.eixo < frio.eixo);
});

test('slick na chuva é muito pior que pneu de chuva', () => {
  const pista = Dados.KARTODROMOS.br[0];
  const cond = { tempAr: 18, tempPista: 20, molhado: true, borracha: 0 };
  const s = Kart.setupPadrao();
  assert.ok(Kart.efeito(s, pista, cond, 'slick').tempo > Kart.efeito(s, pista, cond, 'chuva').tempo + 3);
});

test('treino limitado e feedback do piloto', () => {
  const e = Carreira.novoJogo({ seed: 3 });
  Carreira.iniciarFimDeSemana(e);
  for (let i = 0; i < Carreira.SAIDAS_TREINO; i++) {
    const r = Carreira.saidaTreino(e);
    assert.ok(r.ok);
    assert.ok(r.saida.frases.length > 0);
    assert.match(r.saida.dica, /^Mecânico:/);
  }
  assert.strictEqual(Carreira.saidaTreino(e).ok, false);
});

test('kart não para nos boxes', () => {
  const e = Carreira.novoJogo({ seed: 4 });
  Carreira.iniciarFimDeSemana(e);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  const c = Engine.simularCompleta(Carreira.criarCorrida(e));
  assert.ok(c.carros.every((x) => x.paradas === 0));
});

test('temporada completa gera relatório e opções para o ano seguinte', () => {
  const e = Carreira.novoJogo({ seed: 5, equipeId: 'fulmine' });
  for (let i = 0; i < Carreira.ETAPAS; i++) jogarFimDeSemana(e, 'ideal');
  assert.ok(['relatorio', 'falencia'].includes(e.fase));
  assert.strictEqual(e.ano, 2028);
  assert.strictEqual(e.piloto.idade, 13);
  assert.ok(e.relatorio.opcoes.includes('regional'));
  if (e.fase === 'relatorio') {
    assert.ok(Carreira.proximaTemporada(e, e.relatorio.opcoes[e.relatorio.opcoes.length - 1]).ok);
    assert.strictEqual(e.etapa, 0);
  }
});

test('sem dinheiro, a etapa é pulada e os rivais pontuam', () => {
  const e = Carreira.novoJogo({ seed: 6 });
  e.dinheiro = 0;
  assert.strictEqual(Carreira.iniciarFimDeSemana(e).ok, false);
  Carreira.pularEtapa(e);
  assert.strictEqual(e.etapa, 1);
  assert.strictEqual(e.pontos.jogador, 0);
  assert.strictEqual(Object.values(e.pontos).reduce((s, x) => s + x, 0), 101);
});

test('no grid dá para mudar o acerto e o pneu da corrida', () => {
  const e = Carreira.novoJogo({ seed: 8 });
  Carreira.iniciarFimDeSemana(e);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  const antes = { ...e.fds.setupCorrida };
  Carreira.definirSetup(e, { pressao: antes.pressao + 1, eixo: antes.eixo === 2 ? 0 : 2 });
  Carreira.comprarPneu(e, 'chuva');
  const novo = e.pneus[e.pneus.length - 1];
  Carreira.escolherPneu(e, novo.id);
  const corrida = Carreira.criarCorrida(e);
  assert.strictEqual(e.fds.setupCorrida.pressao, antes.pressao + 1);
  assert.strictEqual(e.fds.pneuCorrida, novo.id);
  assert.strictEqual(corrida.carros.find((c) => c.jogador).tipoPneu, 'chuva');
});

test('confiança alta deixa o piloto mais rápido e mais regular', () => {
  const alto = Carreira.efeitoCabeca({ confianca: 90 });
  const baixo = Carreira.efeitoCabeca({ confianca: 10 });
  assert.ok(alto.tempo < 0 && baixo.tempo > 0);
  assert.ok(alto.sigma < 1 && baixo.sigma > 1);
  assert.ok(alto.erro < baixo.erro);
});

test('resultado mexe na confiança e fica registrado', () => {
  const e = Carreira.novoJogo({ seed: 12 });
  const antes = e.piloto.confianca;
  const r = jogarFimDeSemana(e, 'ideal');
  assert.ok(r.cabeca.length >= 1);
  const delta = r.cabeca.reduce((t, x) => t + x.confianca, 0);
  assert.notStrictEqual(delta, 0);
  assert.ok(e.piloto.confianca >= 0 && e.piloto.confianca <= 100);
  assert.notStrictEqual(e.piloto.confianca, antes);
});

test('psicólogo: uma sessão por etapa, ajuda mais quem está mal', () => {
  const e = Carreira.novoJogo({ seed: 13 });
  e.piloto.moral = 20;
  e.piloto.confianca = 20;
  const dinheiro = e.dinheiro;
  assert.ok(Carreira.sessaoPsicologo(e).ok);
  assert.ok(e.piloto.moral > 25 && e.piloto.confianca > 25);
  assert.ok(e.dinheiro < dinheiro);
  assert.strictEqual(Carreira.sessaoPsicologo(e).ok, false);
});

test('ficar fora de uma etapa derruba a moral', () => {
  const e = Carreira.novoJogo({ seed: 14 });
  const antes = e.piloto.moral;
  Carreira.pularEtapa(e);
  assert.ok(e.piloto.moral < antes);
});

test('save antigo ganha moral e confiança', () => {
  const e = Carreira.novoJogo({ seed: 15 });
  delete e.piloto.moral;
  delete e.piloto.confianca;
  Carreira.migrar(e);
  assert.strictEqual(e.piloto.moral, 60);
  assert.strictEqual(e.piloto.confianca, 50);
});

test('no começo só 3 equipes: uma de ponta, uma intermediária e uma pequena', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const ops = Carreira.equipesIniciais(seed);
    assert.strictEqual(ops.length, 3);
    assert.deepStrictEqual(ops.map(Carreira.porteDe), ['ponta', 'media', 'pequena']);
    assert.deepStrictEqual(Carreira.equipesIniciais(seed), ops);
  }
});

test('pneu comprado entra junto com os do mesmo tipo', () => {
  const e = Carreira.novoJogo({ seed: 16 });
  e.dinheiro = 100000;
  Carreira.comprarPneu(e, 'slick');
  Carreira.comprarPneu(e, 'chuva');
  Carreira.comprarPneu(e, 'slick');
  assert.deepStrictEqual(e.pneus.map((p) => p.tipo), ['slick', 'slick', 'slick', 'slick', 'chuva', 'chuva']);
});

module.exports = { jogarFimDeSemana };
