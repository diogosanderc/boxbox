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
  // sem mecânico contratado, só o piloto fala
  assert.strictEqual(Carreira.saidaTreino(e).saida.dica, null);
  assert.ok(Carreira.contratarMecanico(e).ok);
  for (let i = 1; i < Carreira.SAIDAS_TREINO; i++) {
    const r = Carreira.saidaTreino(e);
    assert.ok(r.ok);
    assert.ok(r.saida.frases.length > 0);
    assert.match(r.saida.dica, /^Mecânico:/);
  }
  assert.strictEqual(Carreira.saidaTreino(e).ok, false);
});

test('kart não para nos boxes nem muda de modo (os rivais não atacam no fim)', () => {
  const e = Carreira.novoJogo({ seed: 4 });
  Carreira.iniciarFimDeSemana(e);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  const c = Engine.simularCompleta(Carreira.criarCorrida(e));
  assert.ok(c.carros.every((x) => x.paradas === 0));
  assert.ok(c.carros.every((x) => x.modo === 'normal'));
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

test('o mecânico é contratado por etapa e só ajuda durante o treino livre', () => {
  const e = Carreira.novoJogo({ seed: 8 });
  Carreira.iniciarFimDeSemana(e);
  for (let i = 0; i < Carreira.SAIDAS_TREINO; i++) Carreira.saidaTreino(e);
  assert.strictEqual(Carreira.contratarMecanico(e).ok, false);
  assert.strictEqual(Carreira.pedirSugestao(e, 'treino').ok, false);
  const f = Carreira.novoJogo({ seed: 8 });
  Carreira.iniciarFimDeSemana(f);
  Carreira.irParaClassificacao(f);
  assert.strictEqual(Carreira.contratarMecanico(f).ok, false);
  assert.strictEqual(Carreira.pedirSugestao(f, 'quali').ok, false);
  const g = Carreira.novoJogo({ seed: 8 });
  Carreira.iniciarFimDeSemana(g);
  Carreira.saidaTreino(g);
  assert.strictEqual(Carreira.pedirSugestao(g, 'treino').ok, false); // ainda sem mecânico
  const antes = g.dinheiro;
  assert.ok(Carreira.contratarMecanico(g).ok);
  assert.strictEqual(g.dinheiro, antes - Carreira.precoMecanico(g));
  assert.strictEqual(Carreira.contratarMecanico(g).ok, false); // não cobra duas vezes
  assert.strictEqual(Carreira.pedirSugestao(g, 'treino').ok, true);
  // na etapa seguinte o mecânico precisa ser contratado de novo
  Carreira.irParaClassificacao(g);
  Carreira.classificar(g);
  Carreira.concluirCorrida(g, Engine.simularCompleta(Carreira.criarCorrida(g)));
  Carreira.concluirEtapa(g);
  Carreira.iniciarFimDeSemana(g);
  assert.strictEqual(g.fds.mecanico, false);
});

test('no grid o acerto é livre, mas o mecânico e o motor não', () => {
  const e = Carreira.novoJogo({ seed: 8 });
  Carreira.iniciarFimDeSemana(e);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  const novo = { pressao: 15, eixo: 2, bitola: 0, coroa: 78, carburacao: 3 };
  Carreira.definirSetup(e, novo);
  assert.deepStrictEqual(e.fds.setup, novo);
  assert.strictEqual(Carreira.pedirSugestao(e, 'grid').ok, false);
  assert.strictEqual(Carreira.revisarMotor(e).ok, false);
  // trocar o jogo de pneus continua permitido
  Carreira.comprarPneu(e, 'chuva');
  const chuva = e.pneus.filter((p) => p.tipo === 'chuva').sort((a, b) => a.uso - b.uso)[0];
  Carreira.escolherPneu(e, chuva.id);
  const corrida = Carreira.criarCorrida(e);
  assert.deepStrictEqual(e.fds.setupCorrida, novo);
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

test('nenhum traçado de kartódromo se cruza', () => {
  const lado = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const cruza = (a, b, c, d) => lado(a, b, c) * lado(a, b, d) < 0 && lado(c, d, a) * lado(c, d, b) < 0;
  for (const k of [...Dados.KARTODROMOS.br, ...Dados.KARTODROMOS.eu]) {
    const P = k.tracado;
    const n = P.length;
    assert.ok(n >= 8, k.id);
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        assert.ok(!cruza(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n]), `${k.id}: segmentos ${i} e ${j} se cruzam`);
      }
    }
  }
});

test('caderno anota treinos, classificação e corrida com as posições certas, em ordem', () => {
  const e = Carreira.novoJogo({ seed: 21 });
  Carreira.iniciarFimDeSemana(e);
  const pista = Carreira.pistaAtual(e);
  Carreira.saidaTreino(e);
  Carreira.saidaTreino(e);
  const saidas = e.fds.saidas.map((x) => x.posicao);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  const grid = e.fds.quali.findIndex((q) => q.id === 'jogador') + 1;
  const res = Carreira.concluirCorrida(e, Engine.simularCompleta(Carreira.criarCorrida(e)));
  const cad = e.caderno[pista.id];
  assert.deepStrictEqual(cad.map((l) => l.sessao), ['treino', 'treino', 'quali', 'corrida']);
  assert.deepStrictEqual(cad.slice(0, 2).map((l) => l.posicao), saidas);
  assert.strictEqual(cad[2].posicao, grid);
  assert.strictEqual(cad[3].posicao, res.pos);
  assert.strictEqual(cad[3].fora, res.fora);
  assert.ok(cad.every((l) => l.etapa === 1));
});

test('pendências antes da etapa: slick novo, chuva prevista e motor', () => {
  const e = Carreira.novoJogo({ seed: 31 });
  e.calendario[e.etapa].clima.tarde.chance = 10;
  assert.deepStrictEqual(Carreira.pendenciasEtapa(e), []);
  for (const p of e.pneus) p.uso = 20;
  e.calendario[e.etapa].clima.tarde.chance = 60;
  e.motorHoras = Carreira.HORAS_REVISAO;
  assert.deepStrictEqual(Carreira.pendenciasEtapa(e).map((x) => x.id), ['slick', 'chuva', 'motor']);
  e.dinheiro = 100000;
  Carreira.comprarPneu(e, 'slick');
  Carreira.comprarPneu(e, 'chuva');
  Carreira.revisarMotor(e);
  assert.deepStrictEqual(Carreira.pendenciasEtapa(e), []);
});

module.exports = { jogarFimDeSemana };

test('diagnóstico depois da corrida e anotação no caderno', () => {
  const pista = Dados.KARTODROMOS.br.find((p) => p.tipo === 'travada');
  const clima = { manha: { tempAr: 20, chove: false }, tarde: { tempAr: 26, chove: false, inicioChuva: null } };
  const cond = Kart.condicao(clima, 'corrida', false);
  const ideal = Kart.arredondarSetup(Kart.acertoIdeal(pista, cond, 'slick'));
  assert.strictEqual(Kart.diagnostico(ideal, pista, cond, 'slick').ajustes.length, 0);
  // eixo mole demais e carburação rica demais: o diagnóstico aponta a direção certa
  const ruim = { ...ideal, eixo: 0, carburacao: 3 };
  const d = Kart.diagnostico(ruim, pista, cond, 'slick');
  const textos = d.ajustes.map((a) => a.texto).join(' | ');
  assert.match(textos, /Eixo mais duro/);
  assert.match(textos, /Carburação mais pobre/);
  assert.ok(d.sentiu.length > 0);
  assert.match(Kart.diagnostico(ideal, pista, Kart.condicao(clima, 'corrida', true), 'slick').pneu, /chuva/);

  const e = Carreira.novoJogo({ seed: 12 });
  Carreira.iniciarFimDeSemana(e);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  Carreira.concluirCorrida(e, Engine.simularCompleta(Carreira.criarCorrida(e)));
  const r = e.fds.resultado;
  assert.ok(r.diagnostico && Array.isArray(r.diagnostico.ajustes));
  assert.ok(Carreira.anotarCorrida(e, 'Começar com eixo duro aqui').ok);
  const entrada = e.caderno[Carreira.pistaAtual(e).id].filter((l) => l.sessao === 'corrida').pop();
  assert.strictEqual(entrada.nota.texto, 'Começar com eixo duro aqui');
  assert.deepStrictEqual(entrada.nota.ajustes, r.diagnostico.ajustes.map((a) => a.texto));
  assert.ok(r.anotado);
});

test('o piloto comenta o que mudou na pista entre as sessões', () => {
  const pista = Dados.KARTODROMOS.br.find((p) => p.altitude >= 700);
  const clima = { manha: { tempAr: 18, chove: false }, tarde: { tempAr: 26, chove: false, inicioChuva: null } };
  const manha = Kart.condicao(clima, 'treino', false);
  const tarde = Kart.condicao(clima, 'quali', false);
  const treino = Kart.falaCondicoes(pista, manha, null, 0).join(' ');
  assert.match(treino, /verde/);
  assert.match(treino, /alto/);
  const quali = Kart.falaCondicoes(pista, tarde, manha, 60).join(' ');
  assert.match(quali, /asfalto está pelando/);
  assert.match(quali, /emborrachou/);
  assert.match(quali, /ar esquentou/);
  assert.match(quali, /chuva/);
  assert.match(Kart.falaCondicoes(pista, Kart.condicao(clima, 'quali', true), manha, 90).join(' '), /Choveu/);
  const e = Carreira.novoJogo({ seed: 2 });
  Carreira.iniciarFimDeSemana(e);
  for (const s of ['treino', 'quali', 'grid']) assert.ok(Carreira.leituraPista(e, s).length > 0);
});
