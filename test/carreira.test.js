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
  for (const p of estado.pneus.slice()) if (Carreira.pneuNoFim(estado, p)) Carreira.venderPneu(estado, p.id);
  for (const t of Carreira.faltaNoEstoque(estado)) Carreira.comprarPneu(estado, t);
  if (!estado.pneus.some((p) => p.tipo === 'slick' && p.uso < 5)) Carreira.comprarPneu(estado, 'slick');
  if (estado.pneus.filter((p) => p.tipo === 'slick').length < 2) Carreira.comprarPneu(estado, 'slick');
  if (Carreira.motorPedeRevisao(estado)) Carreira.revisarMotor(estado);
  if (estado.motorQuebrado && !Carreira.retificarMotor(estado, 'expressa').ok) { Carreira.retificarMotor(estado, 'normal'); return null; }
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
  const ruim = { ...Kart.setupPadrao(), pressao: 15, eixo: 0, bitola: 2, coroa: 76, carburacao: 3, bitolaTraseira: 0, alturaBanco: 2 };
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
  assert.ok(Carreira.contratarMecanico(e, 'experiente').ok);
  Carreira.definirPremium(true);
  for (let i = 1; i < Carreira.SAIDAS_TREINO; i++) {
    const r = Carreira.saidaTreino(e);
    assert.ok(r.ok);
    assert.ok(r.saida.frases.length > 0);
    assert.match(r.saida.dica, /^Mecânico:/);
  }
  assert.strictEqual(Carreira.saidaTreino(e).ok, false);
  Carreira.definirPremium(false);
});

test('treino livre: 2 saídas de graça, 4 com o Premium', () => {
  Carreira.definirPremium(false);
  const e = Carreira.novoJogo({ seed: 4 });
  Carreira.iniciarFimDeSemana(e);
  assert.ok(Carreira.saidaTreino(e).ok);
  assert.ok(Carreira.saidaTreino(e).ok);
  const r = Carreira.saidaTreino(e);
  assert.ok(!r.ok && r.premium);
  Carreira.definirPremium(true);
  assert.ok(Carreira.saidaTreino(e).ok);
  assert.ok(Carreira.saidaTreino(e).ok);
  assert.ok(!Carreira.saidaTreino(e).premium && !Carreira.saidaTreino(e).ok);
  Carreira.definirPremium(false);
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

test('três tipos de mecânico: iniciante fica o fim de semana; experiente e profissional cobram hora extra', () => {
  const fds = (seed) => { const e = Carreira.novoJogo({ seed }); e.dinheiro = 1e6; Carreira.iniciarFimDeSemana(e); return e; };
  // sem mecânico, ninguém ajuda
  const nada = fds(8);
  assert.strictEqual(Carreira.pedirSugestao(nada).ok, false);

  // iniciante: paga uma vez e trabalha no treino, na classificação e no grid; dá palpite, não mexe no kart
  const a = fds(8);
  let din = a.dinheiro;
  assert.ok(Carreira.contratarMecanico(a, 'iniciante').ok);
  assert.strictEqual(a.dinheiro, din - Carreira.precoMecanico(a, 'iniciante'));
  assert.strictEqual(Carreira.contratarMecanico(a, 'pro').ok, false); // um por fim de semana
  const setup = { ...a.fds.setup };
  const r = Carreira.pedirSugestao(a);
  assert.ok(r.ok && r.faz === 'palpite');
  assert.deepStrictEqual(a.fds.setup, setup);
  assert.strictEqual(Carreira.pedirSugestao(a).ok, false); // uma vez por sessão
  Carreira.irParaClassificacao(a);
  assert.ok(Carreira.mecanicoAtivo(a));
  assert.ok(Carreira.pedirSugestao(a).ok);
  Carreira.classificar(a);
  assert.ok(Carreira.mecanicoAtivo(a));
  assert.strictEqual(Carreira.pagarHoraExtra(a).ok, false);

  // experiente: análise técnica; na sessão seguinte precisa de hora extra
  const b = fds(8);
  assert.ok(Carreira.contratarMecanico(b, 'experiente').ok);
  const t = Carreira.pedirSugestao(b);
  assert.ok(t.ok && t.faz === 'tecnica' && t.conselho.length >= 1);
  Carreira.irParaClassificacao(b);
  assert.strictEqual(Carreira.mecanicoAtivo(b), false);
  assert.strictEqual(Carreira.pedirSugestao(b).ok, false);
  din = b.dinheiro;
  assert.ok(Carreira.pagarHoraExtra(b).ok);
  assert.strictEqual(b.dinheiro, din - Carreira.precoHoraExtra(b, 'experiente'));
  assert.ok(Carreira.pedirSugestao(b).ok);

  // profissional: monta o kart perto do ideal para a sessão
  const c = fds(8);
  assert.ok(Carreira.precoMecanico(c, 'pro') > Carreira.precoMecanico(c, 'experiente'));
  assert.ok(Carreira.precoHoraExtra(c, 'pro') > Carreira.precoHoraExtra(c, 'experiente'));
  Carreira.irParaClassificacao(c);
  assert.ok(Carreira.contratarMecanico(c, 'pro').ok);
  assert.strictEqual(Carreira.pedirSugestao(c).faz, 'monta');
  const clima = Carreira.climaAtual(c);
  const cond = Kart.condicao(clima, 'quali', clima.tarde.inicioChuva === 'quali');
  const pneu = c.pneus.find((p) => p.id === c.fds.pneuId).tipo;
  const ideal = Kart.acertoIdeal(Carreira.pistaAtual(c), cond, pneu);
  assert.ok(Kart.desequilibrio(Kart.erros(c.fds.setup, ideal)) < Kart.desequilibrio(Kart.erros(Kart.setupPadrao(), ideal)) || Kart.desequilibrio(Kart.erros(c.fds.setup, ideal)) < 0.3);

  // na etapa seguinte começa sem mecânico
  Carreira.classificar(c);
  Carreira.concluirCorrida(c, Engine.simularCompleta(Carreira.criarCorrida(c)));
  Carreira.concluirEtapa(c);
  Carreira.iniciarFimDeSemana(c);
  assert.strictEqual(c.fds.mecanico, null);
});


test('no grid o acerto é livre, mas o mecânico e o motor não', () => {
  const e = Carreira.novoJogo({ seed: 8 });
  Carreira.iniciarFimDeSemana(e);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  const novo = { ...Kart.setupPadrao(), pressao: 15, eixo: 2, bitola: 0, coroa: 78, carburacao: 3 };
  Carreira.definirSetup(e, novo);
  assert.deepStrictEqual(e.fds.setup, novo);
  assert.strictEqual(Carreira.pedirSugestao(e).ok, false); // sem mecânico contratado
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
  const e = Carreira.novoJogo({ seed: 13 });
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
  e.pneus = [];
  Carreira.comprarPneu(e, 'slick');
  Carreira.comprarPneu(e, 'chuva');
  Carreira.comprarPneu(e, 'slick');
  assert.deepStrictEqual(e.pneus.map((p) => p.tipo), ['slick', 'slick', 'chuva']);
});

test('nenhum traçado de kartódromo se cruza', () => {
  const lado = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const cruza = (a, b, c, d) => lado(a, b, c) * lado(a, b, d) < 0 && lado(c, d, a) * lado(c, d, b) < 0;
  for (const k of [...Dados.KARTODROMOS.br, ...Dados.KARTODROMOS.eu]) {
    const P = k.tracado;
    if (!P) continue; // pistas novas ainda sem desenho
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
  Carreira.descartarPneu(e, e.pneus[0].id); // estoque de 4: abre vaga
  Carreira.comprarPneu(e, 'slick');
  Carreira.comprarPneu(e, 'chuva');
  Carreira.revisarMotor(e);
  assert.deepStrictEqual(Carreira.pendenciasEtapa(e), []);
});

module.exports = { jogarFimDeSemana };

test('diagnóstico depois da corrida e anotação no caderno', () => {
  Carreira.definirPremium(true);
  try {
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
  } finally { Carreira.definirPremium(false); }
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

test('forçar o motor pode engripá-lo; a retífica é cara e a normal custa a etapa', () => {
  const pista = Dados.KARTODROMOS.br.find((p) => p.altitude < 100);
  const clima = { manha: { tempAr: 10, chove: false }, tarde: { tempAr: 12, chove: false, inicioChuva: null } };
  const cond = Kart.condicao(clima, 'corrida', false);
  const ideal = Kart.arredondarSetup(Kart.acertoIdeal(pista, cond, 'slick'));
  assert.strictEqual(Kart.efeito(ideal, pista, cond, 'slick').quebra, 0);
  const forcado = Kart.efeito({ ...ideal, carburacao: -3, coroa: 90 }, pista, cond, 'slick');
  assert.ok(forcado.quebra > 0.02);
  assert.strictEqual(forcado.motivoQuebra, 'Motor engripou');
  assert.ok(Kart.diagnostico({ ...ideal, carburacao: -3 }, pista, cond, 'slick').motor);

  const e = Carreira.novoJogo({ seed: 3 });
  e.motorQuebrado = true;
  assert.strictEqual(Carreira.iniciarFimDeSemana(e).ok, false);
  assert.strictEqual(Carreira.revisarMotor(e).ok, false);
  assert.ok(Carreira.pendenciasEtapa(e).some((x) => x.id === 'retifica'));
  const antes = e.dinheiro;
  assert.ok(Carreira.retificarMotor(e, 'expressa').ok);
  assert.strictEqual(e.dinheiro, antes - Carreira.precoRetifica(e, 'expressa'));
  assert.strictEqual(e.etapa, 0);
  assert.ok(Carreira.iniciarFimDeSemana(e).ok);

  const f = Carreira.novoJogo({ seed: 3 });
  f.motorQuebrado = true;
  assert.ok(Carreira.precoRetifica(f, 'normal') < Carreira.precoRetifica(f, 'expressa'));
  assert.ok(Carreira.retificarMotor(f, 'normal').ok);
  assert.strictEqual(f.motorQuebrado, false);
  assert.strictEqual(f.etapa, 1); // perdeu a etapa
});

test('todo kartódromo tem ficha completa, e o asfalto muda o desgaste do pneu', () => {
  for (const p of [...Dados.KARTODROMOS.br, ...Dados.KARTODROMOS.eu]) {
    assert.ok(p.extensao > 0 && p.largura > 0 && p.retas.length > 0 && p.sobre, p.id);
    assert.ok(['altas', 'baixas', 'sem'].includes(p.zebras), p.id);
    assert.ok(['liso', 'medio', 'abrasivo'].includes(p.asfalto), p.id);
    assert.ok(p.curvas.lentas + p.curvas.medias + p.curvas.rapidas > 0, p.id);
  }
  const e = Carreira.novoJogo({ seed: 1 });
  const desgastes = new Set();
  for (let i = 0; i < Carreira.ETAPAS; i++) { e.etapa = i; desgastes.add(Carreira.pistaAtual(e).desgaste); }
  assert.ok(desgastes.size > 1);
});

test('recorde da pista: inicial fixo e quebrado por uma volta mais rápida', () => {
  const e = Carreira.novoJogo({ seed: 5 });
  Carreira.iniciarFimDeSemana(e);
  const r0 = Carreira.recordePista(e);
  assert.ok(r0.tempo > 30 && r0.nome && !r0.jogador);
  assert.deepStrictEqual(Carreira.recordePista(Carreira.novoJogo({ seed: 99 }), Carreira.pistaAtual(e)), r0);
  // o jogador faz uma volta bem abaixo do recorde no treino
  const pista = Carreira.pistaAtual(e);
  e.piloto.ritmo = 600;
  const r = Carreira.saidaTreino(e);
  assert.ok(r.saida.tempo < r0.tempo);
  assert.ok(r.saida.recorde);
  const novo = Carreira.recordePista(e);
  assert.ok(novo.jogador && novo.tempo < r0.tempo && novo.sessao === 'treino');
  assert.strictEqual(e.recordes[pista.id].tempo, novo.tempo);
});

test('kart quase no ponto: o piloto elogia em vez de reclamar', () => {
  const rnd = Engine.criarRng(1);
  const e = Object.fromEntries(Kart.ORDEM_AJUSTES.map((k) => [k, 0]));
  e.pressao = 0.7; // um detalhe
  for (let i = 0; i < 20; i++) {
    const f = Kart.feedbackPiloto(e, 40, rnd);
    assert.match(f[0], /bom/);
    assert.ok(!f.some((x) => /estranho|não está legal|alguma coisa/.test(x)));
  }
});

test('pneus usados: vender, doar, estoque cheio e amaciar', () => {
  const e = Carreira.novoJogo({ seed: 6 });
  const [novo, , chuva] = e.pneus;
  // venda: pneu novo vale metade; gasto vale bem menos
  const v0 = Carreira.valorVendaPneu(e, novo);
  assert.strictEqual(v0, Math.round(Kart.PNEUS_KART.slick.preco * 0.5 / 10) * 10);
  assert.ok(Carreira.valorVendaPneu(e, { ...novo, uso: 20 }) < v0 / 2);
  // Pneu com vida não sai: vender ou doar só no fim (80% gasto ou mais).
  assert.strictEqual(Carreira.venderPneu(e, novo.id).ok, false);
  assert.strictEqual(Carreira.doarPneu(e, chuva.id).ok, false);
  novo.uso = 21; // 81% de 26 voltas
  const v1 = Carreira.valorVendaPneu(e, novo);
  const din = e.dinheiro;
  assert.ok(Carreira.venderPneu(e, novo.id).ok);
  assert.strictEqual(e.dinheiro, din + v1);
  // doação: moral sobe, só uma vez por etapa
  const moral = e.piloto.moral;
  chuva.uso = 22;
  assert.ok(Carreira.doarPneu(e, chuva.id).ok);
  assert.ok(e.piloto.moral > moral);
  e.pneus[0].uso = 25;
  assert.strictEqual(Carreira.doarPneu(e, e.pneus[0].id).ok, false);
  // estoque cheio
  e.dinheiro = 1e6;
  while (e.pneus.length < Carreira.MAX_PNEUS) assert.ok(Carreira.comprarPneu(e, 'slick').ok);
  assert.strictEqual(Carreira.comprarPneu(e, 'slick').ok, false);
  e.pneus[0].uso = 0;
  // amaciar no treino: pneu novo vira amaciado sem gastar saída
  Carreira.iniciarFimDeSemana(e);
  const zerado = e.pneus.find((p) => p.uso === 0 && p.tipo === 'slick');
  Carreira.escolherPneu(e, zerado.id);
  assert.ok(Carreira.amaciarPneu(e).ok);
  assert.ok(Carreira.pneuAmaciado(zerado));
  assert.strictEqual(e.fds.saidas.length, 0);
  assert.strictEqual(Carreira.amaciarPneu(e).ok, false);
});

test('pneu amaciado rende mais que zerado na classificação', () => {
  let somaZerado = 0, somaAmaciado = 0;
  for (let seed = 1; seed <= 30; seed++) {
    for (const amaciar of [false, true]) {
      const e = Carreira.novoJogo({ seed });
      Carreira.iniciarFimDeSemana(e);
      if (amaciar) Carreira.amaciarPneu(e);
      Carreira.irParaClassificacao(e);
      const p = e.pneus.find((x) => x.id === e.fds.pneuId);
      if (amaciar) p.uso = 2; else p.uso = 0;
      Carreira.classificar(e);
      const t = e.fds.quali.find((q) => q.id === 'jogador').tempo;
      if (amaciar) somaAmaciado += t; else somaZerado += t;
    }
  }
  assert.ok(somaAmaciado < somaZerado);
});

test('nomes variados: mais de 500 nomes e sobrenomes e ninguém repete sobrenome no grid', () => {
  const unicos = new Set();
  for (const n of Object.values(Dados.NOMES)) { n.p.forEach((x) => unicos.add(x)); n.s.forEach((x) => unicos.add(x)); }
  assert.ok(unicos.size > 500, `só ${unicos.size}`);
  const nomes = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const e = Carreira.novoJogo({ seed, nome: 'Diogo Sander' });
    const sobrenomes = e.rivais.map((r) => r.nome.split(' ').slice(1).join(' '));
    assert.strictEqual(new Set(sobrenomes).size, sobrenomes.length);
    assert.ok(!sobrenomes.includes('Sander'));
    e.rivais.forEach((r) => nomes.add(r.nome));
  }
  assert.ok(nomes.size > 450); // 30 grids x 19 rivais quase sem repetição
});

test('nomes das equipes sorteados a cada carreira, sem repetir', () => {
  const a = Carreira.sortearNomesEquipes(1);
  const b = Carreira.sortearNomesEquipes(2);
  assert.strictEqual(new Set(Object.values(a)).size, Dados.EQUIPES.length);
  assert.notDeepStrictEqual(a, b);
  assert.deepStrictEqual(Carreira.sortearNomesEquipes(1), a);
  const e = Carreira.novoJogo({ seed: 1, equipeId: 'garagem' });
  assert.strictEqual(Carreira.equipeBase('garagem').nome, a.garagem);
  assert.strictEqual(Carreira.equipeBase('garagem').custoEtapa, Dados.EQUIPES.find((x) => x.id === 'garagem').custoEtapa);
  // carreira antiga, sem sorteio, mantém os nomes originais
  Carreira.migrar({ ...e, nomesEquipes: undefined });
  assert.strictEqual(Carreira.equipeBase('garagem').nome, 'Garagem do Zé');
  Carreira.migrar(e);
  assert.strictEqual(Carreira.equipeBase('garagem').nome, a.garagem);
  // em 30 carreiras aparecem muitos nomes diferentes
  const vistos = new Set();
  for (let s = 1; s <= 30; s++) Object.values(Carreira.sortearNomesEquipes(s)).forEach((n) => vistos.add(n));
  assert.ok(vistos.size > 60);
});

test('equilíbrio: acerto ideal briga pelo top 4 no Regional; sem mexer no acerto, fica no meio', () => {
  const temporada = (seed, estrategia) => {
    const e = Carreira.novoJogo({ seed, equipeId: 'faisca' });
    for (let i = 0; i < Carreira.ETAPAS; i++) jogarFimDeSemana(e, estrategia);
    return e.relatorio.pos;
  };
  const sementes = [1, 2, 3, 4, 5, 6, 7, 8];
  const ideal = sementes.map((s) => temporada(s, 'ideal'));
  const padrao = sementes.map((s) => temporada(s, 'padrao'));
  assert.ok(ideal.filter((p) => p <= Carreira.VAGAS_SUBIDA).length >= 6, `ideal: ${ideal}`);
  assert.ok(ideal.reduce((a, b) => a + b) < padrao.reduce((a, b) => a + b), `ideal ${ideal} x padrão ${padrao}`);
});

test('mercado de fim de ano: quem anda bem escolhe equipe melhor; a troca vale no ano seguinte', () => {
  const e = Carreira.novoJogo({ seed: 2, equipeId: 'garagem' });
  e.piloto.popularidade = 0;
  assert.deepStrictEqual(Carreira.equipesDisponiveis(e, 18).sort(), ['formiga', 'garagem']);
  assert.ok(Carreira.equipesDisponiveis(e, 10).includes('faisca'));
  assert.ok(!Carreira.equipesDisponiveis(e, 10).includes('fulmine'));
  assert.ok(Carreira.equipesDisponiveis(e, 3).includes('fulmine'));
  for (let i = 0; i < Carreira.ETAPAS; i++) jogarFimDeSemana(e, 'ideal');
  const r = e.relatorio;
  const outra = r.equipes.find((id) => id !== 'garagem');
  assert.strictEqual(Carreira.proximaTemporada(e, r.opcoes[0], 'equipe-que-nao-existe').ok, false);
  assert.ok(Carreira.proximaTemporada(e, r.opcoes[0], outra).ok);
  assert.strictEqual(e.equipeId, outra);
  // a vaga do jogador na nova equipe: só um rival nela
  assert.strictEqual(e.rivais.filter((x) => x.equipe === outra).length, 1);
});

test('F4: proposta leva aos monopostos, com carro, pistas e equipes próprias', () => {
  const e = Carreira.novoJogo({ seed: 4, equipeId: 'fulmine' });
  e.dinheiro = 1e6;
  // simula o fim do kart com uma proposta de F4 na mão
  for (let i = 0; i < Carreira.ETAPAS; i++) jogarFimDeSemana(e, 'ideal');
  e.propostas = [{ id: 'prx', tipo: 'f4', nome: 'Apex Junior (F4)', equipe: 'f4-apex' }];
  const r = Carreira.aceitarProposta(e, 'prx');
  assert.ok(r.ok && r.f4);
  assert.strictEqual(e.campeonato, 'f4');
  assert.strictEqual(e.equipeId, 'f4-apex');
  assert.strictEqual(e.fase, 'paddock');
  assert.strictEqual(Kart.categoria(), 'f4');
  assert.ok(Kart.ORDEM_AJUSTES.includes('asaTraseira'));
  assert.ok(Dados.KARTODROMOS.f4.some((p) => p.id === Carreira.pistaAtual(e).id));
  assert.ok(e.rivais.every((x) => x.equipe.startsWith('f4-')));
  // contrato: paga 60% do orçamento da equipe
  assert.strictEqual(Carreira.custoEtapa(e), Math.round(Carreira.equipeBase('f4-apex').custoEtapa * 4 * 0.6 / 100) * 100);
  // o fim de semana começa com o acerto padrão do F4 (não herda o do kart)
  Carreira.iniciarFimDeSemana(e);
  assert.deepStrictEqual(Object.keys(e.fds.setup).sort(), Kart.ORDEM_AJUSTES.slice().sort());
  // acerto ideal do F4: pista veloz pede menos asa que pista travada
  const cond = Kart.condicao({ manha: { tempAr: 20 }, tarde: { tempAr: 20 } }, 'quali', false);
  const veloz = Dados.KARTODROMOS.f4.find((p) => p.tipo === 'veloz');
  const travada = Dados.KARTODROMOS.f4.find((p) => p.tipo === 'travada');
  assert.ok(Kart.acertoIdeal(veloz, cond, 'slick').asaTraseira < Kart.acertoIdeal(travada, cond, 'slick').asaTraseira);
  // e a chuva pede mais asa
  assert.ok(Kart.acertoIdeal(veloz, { ...cond, molhado: true }, 'chuva').asaTraseira > Kart.acertoIdeal(veloz, cond, 'slick').asaTraseira);
  Carreira.migrar({ ...e, campeonato: 'regional' }); // volta o modelo do kart para os outros testes
  assert.strictEqual(Kart.categoria(), 'kart');
});

test('F4: com chuva, quem para no box para pneu de chuva anda mais rápido', () => {
  const tempos = {};
  for (const box of [false, true]) {
    let soma = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const e = Carreira.novoJogo({ seed });
      e.dinheiro = 1e6;
      e.propostas = [{ id: 'p', tipo: 'academia', nome: 'Vortex', equipe: 'f4-vortex' }];
      Carreira.aceitarProposta(e, 'p');
      Carreira.iniciarFimDeSemana(e);
      const clima = Carreira.climaAtual(e);
      clima.tarde.inicioChuva = 'corrida'; clima.tarde.voltaChuva = 4; clima.tarde.chove = true;
      Carreira.irParaClassificacao(e);
      Carreira.classificar(e);
      const c = Carreira.criarCorrida(e);
      c.boxJogador = box;
      Engine.simularCompleta(c);
      const eu = c.carros.find((x) => x.jogador);
      if (box) assert.strictEqual(eu.tipoPneu, 'chuva');
      soma += eu.fora ? 20 : eu.pos;
    }
    tempos[box] = soma;
  }
  Carreira.migrar({ campeonato: 'regional' });
  assert.ok(tempos[true] < tempos[false], JSON.stringify(tempos));
});

test('F4: os 4 primeiros recebem proposta de F3', () => {
  const e = Carreira.novoJogo({ seed: 9 });
  e.dinheiro = 1e6;
  e.propostas = [{ id: 'p', tipo: 'academia', nome: 'Vortex', equipe: 'f4-vortex' }];
  Carreira.aceitarProposta(e, 'p');
  for (let i = 0; i < Carreira.ETAPAS; i++) jogarFimDeSemana(e, 'ideal');
  const pos = e.relatorio.pos;
  assert.strictEqual(e.propostas.some((p) => p.tipo === 'subida' && p.campeonato === 'f3'), pos <= Carreira.VAGAS_SUBIDA);
  assert.ok(!e.relatorio.opcoes.includes('internacional'));
  Carreira.migrar({ campeonato: 'regional' });
});

test('F4 só a partir dos 15 anos: a proposta fica guardada', () => {
  const e = Carreira.novoJogo({ seed: 3, equipeId: 'fulmine' });
  e.campeonato = 'nacional';
  e.piloto.idade = 13; // vira 14 no fim do ano
  for (const r of e.rivais) e.pontos[r.id] = 0;
  e.pontos.jogador = 999; // campeão brasileiro
  e.etapa = Carreira.ETAPAS - 1;
  Carreira.concluirEtapa(e);
  assert.strictEqual(e.relatorio.pos, 1);
  assert.strictEqual(e.propostas.length, 0);
  assert.ok(e.relatorio.f4Espera && e.f4Reservada);
  // no ano seguinte, já com 15, a proposta chega mesmo sem novo título
  Carreira.proximaTemporada(e, 'nacional');
  e.pontos.jogador = 0;
  e.etapa = Carreira.ETAPAS - 1;
  Carreira.concluirEtapa(e);
  assert.strictEqual(e.piloto.idade, 15);
  assert.ok(e.propostas.some((p) => p.tipo === 'f4' || p.tipo === 'academia'));
  assert.strictEqual(e.f4Reservada, null);
});

// Leva o jogador direto ao fim de temporada numa posição escolhida.
function fecharTemporada(e, pos) {
  const ids = e.rivais.map((r) => r.id);
  const ordem = ids.slice(); ordem.splice(pos - 1, 0, 'jogador');
  ordem.forEach((id, i) => { e.pontos[id] = 400 - i * 10; });
  e.etapa = Carreira.etapasDe(e) - 1;
  Carreira.concluirEtapa(e);
  assert.strictEqual(e.relatorio.pos, pos);
}

test('escada dos monopostos: F4 → F3 → F2 → F1, com Superlicença no fim', () => {
  const e = Carreira.novoJogo({ seed: 21 });
  Carreira.comecarNaF4(e);
  assert.strictEqual(e.campeonato, 'f4');
  for (const [de, para] of [['f4', 'f3'], ['f3', 'f2'], ['f2', 'f1']]) {
    assert.strictEqual(e.campeonato, de);
    fecharTemporada(e, 1);
    const pr = e.propostas.filter((p) => p.tipo === 'subida');
    assert.ok(pr.length >= 1 && pr.every((p) => p.campeonato === para), JSON.stringify(e.propostas));
    assert.ok(e.relatorio.motivoF4.includes('Campeão'));
    assert.ok(Carreira.aceitarProposta(e, pr[0].id).ok);
    assert.strictEqual(e.campeonato, para);
    assert.ok(Dados.EQUIPES_MONO[para].some((x) => x.id === e.equipeId));
    assert.ok(Dados.KARTODROMOS[para].some((p) => p.id === Carreira.pistaAtual(e).id));
    assert.strictEqual(Kart.categoria(), { f3: 'f4', f2: 'f2', f1: 'f1' }[para]); // F2 e F1 têm carros mais complexos
  }
  assert.strictEqual(e.fase, 'superlicenca');
  assert.ok(e.final && e.final.equipe);
  // Na F1 não há proposta para subir: os 4 primeiros só repetem.
  e.fase = 'paddock';
  fecharTemporada(e, 2);
  assert.ok(!e.propostas.some((p) => p.tipo === 'subida'));
  Carreira.migrar({ campeonato: 'regional' });
});

test('F1: a equipe paga salário em vez de cobrar a etapa', () => {
  const e = Carreira.novoJogo({ seed: 5 });
  Carreira.comecarNaF4(e);
  e.propostas = [{ id: 'x', tipo: 'subida', campeonato: 'f1', pago: true, equipe: 'f1-grove', nome: 'Grove' }];
  Carreira.aceitarProposta(e, 'x');
  e.fase = 'paddock';
  assert.strictEqual(Carreira.custoEtapa(e), 0);
  const salario = Carreira.salarioEtapa(e);
  assert.ok(salario > 0);
  const antes = e.dinheiro;
  assert.ok(Carreira.iniciarFimDeSemana(e).ok);
  assert.strictEqual(e.dinheiro, antes + salario);
  Carreira.migrar({ campeonato: 'regional' });
});

test('F3 a F1: calendário na ordem real e recorde separado por categoria', () => {
  const e = Carreira.novoJogo({ seed: 8 });
  Carreira.comecarNaF4(e);
  e.propostas = [{ id: 'x', tipo: 'subida', campeonato: 'f2', pago: true, equipe: 'f2-prima', nome: 'Prima' }];
  Carreira.aceitarProposta(e, 'x');
  const lista = Dados.KARTODROMOS.f2.map((p) => p.id);
  const ordem = e.calendario.map((c) => lista.indexOf(c.pista));
  assert.deepStrictEqual(ordem, ordem.slice().sort((a, b) => a - b));
  assert.strictEqual(e.calendario.length, 14); // F2: calendário real completo
  assert.strictEqual(new Set(e.calendario.map((c) => c.pista)).size, 14);
  // a volta recorde da F2 não vale para a F4 na mesma pista
  const pista = Carreira.pistaAtual(e);
  const recF2 = Carreira.recordePista(e, pista).tempo;
  assert.ok(Math.abs(recF2 - pista.tempoBase) < 2);
  Carreira.migrar({ campeonato: 'regional' });
});

test('todas as pistas e equipes de F3, F2 e F1 têm dados completos', () => {
  for (const reg of ['f3', 'f2', 'f1']) {
    assert.ok(Dados.KARTODROMOS[reg].length >= Carreira.ETAPAS);
    for (const p of Dados.KARTODROMOS[reg]) {
      for (const k of ['extensao', 'retas', 'curvas', 'zebras', 'asfalto', 'sobre', 'tempoBase']) assert.ok(p[k] != null, `${reg}/${p.id} sem ${k}`);
    }
    const eqs = Dados.EQUIPES_MONO[reg];
    assert.strictEqual(eqs.length, 10);
    for (const x of eqs) assert.ok(['ponta', 'media', 'pequena'].includes(x.porte));
    if (reg === 'f1') for (const x of eqs) assert.ok(x.salario > 0);
  }
});

test('pole e volta mais rápida valem 1 ponto cada', () => {
  const e = Carreira.novoJogo({ seed: 31 });
  jogarFimDeSemana(e, 'ideal');
  const soma = Object.values(e.pontos).reduce((a, b) => a + b, 0);
  // 25+18+15+12+10+8+6+4+2+1 = 101, mais a pole e a volta mais rápida (se alguém do top 10 fez)
  assert.ok(soma === 102 || soma === 103, `soma ${soma}`);
  const h = e.historico[e.historico.length - 1];
  assert.ok('pole' in h && 'voltaRapida' in h && 'largada' in h);
});

test('F2: sprint antes da corrida principal, com top 10 invertido e pontos 8-7-...-1', () => {
  const e = Carreira.novoJogo({ seed: 13 });
  Carreira.comecarNaF4(e);
  e.propostas = [{ id: 'x', tipo: 'subida', campeonato: 'f2', pago: true, equipe: 'f2-prima', nome: 'Prima' }];
  Carreira.aceitarProposta(e, 'x');
  assert.ok(Carreira.iniciarFimDeSemana(e).ok);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  assert.ok(Carreira.sprintPendente(e));
  const q = e.fds.quali.map((x) => x.id);
  const ordem = Carreira.ordemLargada(e).map((x) => x.id);
  assert.deepStrictEqual(ordem.slice(0, 10), q.slice(0, 10).reverse());
  const sprint = Carreira.criarCorrida(e);
  assert.ok(sprint.sprint && sprint.totalVoltas < 18);
  Engine.simularCompleta(sprint);
  const antes = Object.values(e.pontos).reduce((a, b) => a + b, 0);
  Carreira.concluirSprint(e, sprint);
  const depois = Object.values(e.pontos).reduce((a, b) => a + b, 0);
  assert.strictEqual(depois - antes, 36);
  assert.ok(!Carreira.sprintPendente(e) && e.fds.sessao === 'grid');
  const principal = Carreira.criarCorrida(e);
  assert.ok(!principal.sprint);
  assert.deepStrictEqual(principal.carros.map((c) => c.id), q); // principal larga na ordem da classificação
  Carreira.migrar({ campeonato: 'regional' });
});

test('F1 no seco: compostos com parada obrigatória; quem escolhe macio larga com ele', () => {
  const e = Carreira.novoJogo({ seed: 17 });
  Carreira.comecarNaF4(e);
  e.propostas = [{ id: 'x', tipo: 'subida', campeonato: 'f1', pago: true, equipe: 'f1-rossa', nome: 'Rossa' }];
  Carreira.aceitarProposta(e, 'x');
  e.fase = 'paddock';
  const cl = Carreira.climaAtual(e); cl.tarde.inicioChuva = null; cl.tarde.chove = false; cl.manha.chove = false;
  assert.ok(Carreira.iniciarFimDeSemana(e).ok);
  assert.ok(Carreira.usaCompostos(e));
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  if (Carreira.sprintPendente(e)) Carreira.concluirSprint(e, Engine.simularCompleta(Carreira.criarCorrida(e)));
  assert.ok(Carreira.escolherComposto(e, 'M').ok);
  const c = Carreira.criarCorrida(e);
  const eu = c.carros.find((x) => x.jogador);
  assert.strictEqual(eu.pneu, 'M');
  assert.strictEqual(eu.uso, 0);
  Engine.simularCompleta(c);
  for (const carro of c.carros.filter((x) => !x.fora)) assert.ok(carro.paradas >= 1 && carro.usados.length >= 2, `${carro.id} ${carro.usados}`);
  assert.ok(Carreira.vidaComposto(e, 'M') < Carreira.vidaComposto(e, 'D'));
  Carreira.migrar({ campeonato: 'regional' });
});

test('companheiro de equipe: placar de classificação e corrida ao longo da temporada', () => {
  const e = Carreira.novoJogo({ seed: 41 });
  const comp = Carreira.companheiro(e);
  assert.ok(comp && comp.equipe === e.equipeId);
  for (let i = 0; i < 3; i++) jogarFimDeSemana(e, 'ideal');
  assert.strictEqual(e.duelo.id, comp.id);
  assert.strictEqual(e.duelo.quali[0] + e.duelo.quali[1], 3);
  assert.ok(e.duelo.corrida[0] + e.duelo.corrida[1] <= 3);
  // Até o fim da temporada: uma classificação por etapa corrida, e o relatório guarda o placar.
  let corridas = 3;
  while (e.fase !== 'relatorio' && e.fase !== 'falencia') if (jogarFimDeSemana(e, 'ideal')) corridas++;
  assert.strictEqual(e.relatorio.duelo.quali[0] + e.relatorio.duelo.quali[1], corridas);
  assert.strictEqual(e.temporadas.at(-1).dueloVenci, e.relatorio.duelo.corrida[0] > e.relatorio.duelo.corrida[1]);
});

test('recordes da carreira e conquistas com ids estáveis', () => {
  const e = Carreira.novoJogo({ seed: 51 });
  for (let i = 0; i < 4; i++) jogarFimDeSemana(e, 'ideal');
  const r = Carreira.recordesCarreira(e);
  assert.strictEqual(r.corridas, 4);
  assert.ok(r.porCategoria.regional.corridas === 4);
  const novas = Carreira.conferirConquistas(e);
  assert.ok(novas.some((c) => c.id === 'primeira_corrida'));
  assert.strictEqual(Carreira.conferirConquistas(e).length, 0); // não repete
  const ids = Carreira.CONQUISTAS.map((c) => c.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9_]+$/);
});

test('estoque de pneus: compra de espaço até 8 no kart, cada vaga mais cara', () => {
  Carreira.definirPremium(true);
  try {
  const e = Carreira.novoJogo({ seed: 61 });
  e.dinheiro = 1e6;
  assert.strictEqual(Carreira.espacoPneus(e), 4);
  const p1 = Carreira.precoEspaco(e);
  assert.ok(Carreira.comprarEspaco(e).ok);
  assert.ok(Carreira.precoEspaco(e) > p1);
  assert.ok(Carreira.comprarEspaco(e).ok);
  assert.ok(Carreira.comprarEspaco(e).ok);
  assert.ok(Carreira.comprarEspaco(e).ok);
  assert.strictEqual(Carreira.espacoPneus(e), 8);
  assert.ok(!Carreira.comprarEspaco(e).ok); // limite do kart
  while (e.pneus.length < 8) assert.ok(Carreira.comprarPneu(e, 'slick').ok);
  assert.ok(!Carreira.comprarPneu(e, 'slick').ok);
  e.campeonato = 'f1';
  assert.strictEqual(Carreira.limiteEspaco(e), 16);
  assert.ok(Carreira.comprarEspaco(e).ok);
  Carreira.migrar({ campeonato: 'regional' });
  } finally { Carreira.definirPremium(false); }
});

test('safety car só na F2 e na F1', () => {
  const contar = (campId, equipe) => {
    let total = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const e = Carreira.novoJogo({ seed });
      if (campId !== 'regional') {
        Carreira.comecarNaF4(e);
        e.propostas = [{ id: 'x', tipo: 'subida', campeonato: campId, pago: true, equipe, nome: 'x' }];
        Carreira.aceitarProposta(e, 'x');
        e.fase = 'paddock';
      }
      e.dinheiro = 1e7;
      Carreira.iniciarFimDeSemana(e);
      Carreira.irParaClassificacao(e);
      Carreira.classificar(e);
      if (Carreira.sprintPendente(e)) Carreira.concluirSprint(e, Engine.simularCompleta(Carreira.criarCorrida(e)));
      const c = Engine.simularCompleta(Carreira.criarCorrida(e));
      total += c.eventos.filter((ev) => /SAFETY CAR/.test(ev.texto)).length;
    }
    Carreira.migrar({ campeonato: 'regional' });
    return total;
  };
  assert.strictEqual(contar('regional'), 0);
  assert.ok(contar('f1', 'f1-grove') > 0);
});

test('Premium: sem ele, 2 patrocinadores, sem espaço extra e sem anotar no caderno', () => {
  const e = Carreira.novoJogo({ seed: 71 });
  e.dinheiro = 1e6;
  assert.strictEqual(Carreira.ehPremium(), false);
  assert.strictEqual(Carreira.maxPatrocinios(), 2);
  const r = Carreira.comprarEspaco(e);
  assert.ok(!r.ok && r.premium);
  e.ofertasPatrocinio = [1, 2, 3].map((i) => ({ id: `o${i}`, empresa: `E${i}`, porEtapa: 100, bonus: 0, meta: { tipo: 'posicao', alvo: 10 } }));
  assert.ok(Carreira.aceitarPatrocinio(e, 'o1').ok);
  assert.ok(Carreira.aceitarPatrocinio(e, 'o2').ok);
  const r3 = Carreira.aceitarPatrocinio(e, 'o3');
  assert.ok(!r3.ok && r3.premium);
  Carreira.definirPremium(true);
  try {
    assert.strictEqual(Carreira.maxPatrocinios(), 5);
    assert.ok(Carreira.aceitarPatrocinio(e, 'o3').ok);
    assert.ok(Carreira.comprarEspaco(e).ok);
  } finally { Carreira.definirPremium(false); }
});

test('equipe de box: nível 2 e 3 só com Premium, e o pit fica mais rápido', () => {
  const e = Carreira.novoJogo({ seed: 81 });
  Carreira.comecarEm(e, 'f2');
  e.fase = 'paddock';
  e.dinheiro = 1e7;
  assert.strictEqual(Carreira.nivelBox(e), 1);
  const r = Carreira.melhorarBox(e);
  assert.ok(!r.ok && r.premium);
  Carreira.definirPremium(true);
  try {
    assert.ok(Carreira.melhorarBox(e).ok);
    assert.ok(Carreira.melhorarBox(e).ok);
    assert.strictEqual(Carreira.nivelBox(e), 3);
    assert.ok(!Carreira.melhorarBox(e).ok);
    assert.ok(Carreira.carroDe(e, e.equipeId, true).box.ganho > 0);
  } finally { Carreira.definirPremium(false); }
  // No motor da corrida: mesma corrida, só muda a equipe de box do jogador.
  const tempoDeBox = (box) => {
    let soma = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const pista = { tempoBase: 80, voltas: 3, desgaste: 1, perdaBox: 0, ultrapassagem: 0.5, peso: { motor: 1, aero: 1, chassi: 1 } };
      const piloto = { ritmo: 80, consistencia: 80, largada: 80, ultrapassagem: 80, defesa: 80, pneus: 80 };
      const c = Engine.criarCorrida(pista, [{ id: 'jogador', jogador: true, piloto, carro: { motor: 80, aero: 80, chassi: 80, confiabilidade: 100, box }, equipe: { id: 'x', cor: '#fff' } }], seed, { semSafetyCar: true });
      c.carros[0].boxPedido = 'Md';
      Engine.passo(c);
      soma += c.carros[0].ultimaVolta;
    }
    return soma / 200;
  };
  assert.ok(tempoDeBox(Carreira.EQUIPE_BOX[3]) < tempoDeBox(Carreira.EQUIPE_BOX[1]));
  Carreira.migrar({ campeonato: 'regional' });
});

test('patrocínio: 3 meses, 6 meses ou temporada; contrato curto acaba e libera a vaga', () => {
  const e = Carreira.novoJogo({ seed: 12 });
  const [a, b] = e.ofertasPatrocinio;
  const prazos = Carreira.duracoesPatrocinio(e, a);
  assert.deepStrictEqual(prazos.map((d) => d.id), ['3', '6', 'temporada']);
  assert.ok(prazos[0].porEtapa > a.porEtapa && prazos[0].bonus === 0);
  assert.strictEqual(prazos[2].bonus, a.bonus);
  assert.ok(Carreira.aceitarPatrocinio(e, a.id, '3').ok);
  assert.ok(Carreira.aceitarPatrocinio(e, b.id, 'temporada').ok);
  const curto = e.patrocinios.find((p) => p.empresa === a.empresa);
  assert.strictEqual(curto.ate, prazos[0].etapas);
  for (let i = 0; i < prazos[0].etapas; i++) {
    assert.ok(e.patrocinios.some((p) => p.empresa === a.empresa));
    Carreira.pularEtapa(e);
  }
  assert.ok(!e.patrocinios.some((p) => p.empresa === a.empresa), 'contrato de 3 meses acabou');
  assert.ok(e.patrocinios.some((p) => p.empresa === b.empresa), 'o da temporada continua');
  assert.ok(e.noticias.some((n) => n.texto.includes(`contrato com a ${a.empresa}`)));
  assert.ok(e.ofertasPatrocinio.length > 0, 'aparece outra empresa');
});

test('F3 em diante: macio, médio, duro e chuva no estoque; sem eles não corre, e a parada usa jogo do estoque', () => {
  const e = Carreira.novoJogo({ seed: 23 });
  assert.ok(!Carreira.comprarPneu(e, 'medio').ok, 'no kart não existe médio');
  Carreira.comecarEm(e, 'f2');
  e.fase = 'paddock';
  // Na estreia a equipe completa os quatro tipos.
  for (const t of ['slick', 'medio', 'duro', 'chuva']) assert.ok(e.pneus.some((p) => p.tipo === t), t);
  assert.strictEqual(Carreira.nomePneu(e, 'slick'), 'Macio');
  // Sem duro no estoque: pendência, mas dá para ir; na pista não se compra e o duro fica bloqueado.
  const duros = e.pneus.filter((p) => p.tipo === 'duro');
  e.pneus = e.pneus.filter((p) => p.tipo !== 'duro');
  assert.ok(Carreira.pendenciasEtapa(e).some((x) => x.id === 'duro'));
  const cl = Carreira.climaAtual(e); cl.tarde.inicioChuva = null; cl.tarde.chove = false; cl.manha.chove = false;
  assert.ok(Carreira.iniciarFimDeSemana(e).ok);
  assert.ok(!Carreira.comprarPneu(e, 'duro').ok);
  assert.ok(!Carreira.escolherComposto(e, 'D').ok);
  e.pneus.push(...duros); // (só para seguir o teste com os quatro)
  // Mínimo: na F3 (sem parada) o composto da etapa e o de chuva; na F2 e na F1, dois de seco e o de chuva.
  const f = Carreira.novoJogo({ seed: 25 });
  Carreira.comecarEm(f, 'f3');
  f.fase = 'paddock';
  for (const t of ['slick', 'medio', 'duro']) Carreira.comprarPneu(f, t, true);
  const comp = Carreira.compostoDaEtapa(f);
  f.pneus = f.pneus.filter((p) => p.tipo === comp || p.tipo === 'chuva');
  assert.ok(!Carreira.estoqueImpede(f), 'na F3 o composto da etapa + chuva basta');
  f.pneus = f.pneus.filter((p) => p.tipo === 'chuva');
  for (const t of ['slick', 'medio', 'duro'].filter((t) => t !== comp)) Carreira.comprarPneu(f, t, true);
  assert.ok(Carreira.estoqueImpede(f), 'outro composto não serve na etapa');
  assert.ok(Carreira.pendenciasEtapa(f).some((x) => x.bloqueia));
  assert.ok(!Carreira.iniciarFimDeSemana(f).ok);
  Carreira.comprarPneu(f, comp);
  assert.ok(!Carreira.estoqueImpede(f));
  const f2 = Carreira.novoJogo({ seed: 26 });
  Carreira.comecarEm(f2, 'f2');
  f2.pneus = f2.pneus.filter((p) => p.tipo === 'slick' || p.tipo === 'chuva');
  assert.ok(Carreira.estoqueImpede(f2), 'na F2 só macio não basta');
  Carreira.comprarPneu(f2, 'duro');
  assert.ok(!Carreira.estoqueImpede(f2), 'na F2 macio + duro + chuva basta');
  f.pneus = f.pneus.filter((p) => p.tipo !== 'chuva');
  assert.ok(/chuva/.test(Carreira.estoqueImpede(f)));
  Carreira.comprarPneu(f, 'chuva');
  assert.ok(Carreira.iniciarFimDeSemana(f).ok);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  if (Carreira.sprintPendente(e)) Carreira.concluirSprint(e, Engine.simularCompleta(Carreira.criarCorrida(e)));
  // Larga de médio, com o jogo do estoque (e o desgaste dele).
  assert.ok(Carreira.escolherComposto(e, 'Md').ok);
  const medio = e.pneus.find((p) => p.id === e.fds.pneuId);
  medio.uso = 4;
  assert.strictEqual(Carreira.compostoMontado(e), 'Md');
  const c = Carreira.criarCorrida(e);
  const eu = c.carros.find((x) => x.jogador);
  assert.strictEqual(eu.pneu, 'Md');
  assert.strictEqual(eu.uso, 4);
  Engine.simularCompleta(c);
  if (!eu.fora) assert.ok(eu.paradas >= 1);
  // Cada jogo usado volta ao estoque gasto; o de largada e o da parada são jogos diferentes.
  const usados = c.jogosJogador.map((j) => j.id);
  assert.strictEqual(new Set(usados).size, usados.length);
  Carreira.concluirCorrida(e, c);
  assert.ok(e.pneus.find((p) => p.id === medio.id).uso > 4);
  // Sem nenhum jogo seco livre, a parada não acontece.
  const so = Carreira.novoJogo({ seed: 24 });
  Carreira.comecarEm(so, 'f2');
  so.fase = 'paddock';
  const cl2 = Carreira.climaAtual(so); cl2.tarde.inicioChuva = null; cl2.tarde.chove = false; cl2.manha.chove = false;
  assert.ok(Carreira.iniciarFimDeSemana(so).ok);
  Carreira.irParaClassificacao(so);
  Carreira.classificar(so);
  if (Carreira.sprintPendente(so)) Carreira.concluirSprint(so, Engine.simularCompleta(Carreira.criarCorrida(so)));
  Carreira.escolherComposto(so, 'M');
  const c2 = Carreira.criarCorrida(so);
  so.pneus = so.pneus.filter((p) => p.id === so.fds.pneuCorrida || p.tipo === 'chuva');
  Engine.simularCompleta(c2);
  assert.strictEqual(c2.carros.find((x) => x.jogador).paradas, 0);
  assert.ok(c2.eventos.some((ev) => ev.texto.includes('Sem pneu seco no estoque')));
});

test('estoque cheio sem Premium oferece o Premium; com Premium, só avisa', () => {
  const e = Carreira.novoJogo({ seed: 31 });
  e.dinheiro = 1e6;
  Carreira.definirPremium(false);
  while (e.pneus.length < Carreira.espacoPneus(e)) assert.ok(Carreira.comprarPneu(e, 'slick').ok);
  const r = Carreira.comprarPneu(e, 'slick');
  assert.ok(!r.ok && r.premium && /Premium/.test(r.erro));
  Carreira.definirPremium(true);
  assert.ok(Carreira.comprarEspaco(e).ok);
  assert.ok(Carreira.comprarPneu(e, 'slick').ok);
  while (Carreira.espacoPneus(e) < Carreira.limiteEspaco(e)) Carreira.comprarEspaco(e);
  while (e.pneus.length < Carreira.espacoPneus(e)) Carreira.comprarPneu(e, 'slick');
  const r2 = Carreira.comprarPneu(e, 'slick');
  assert.ok(!r2.ok && !r2.premium);
  Carreira.definirPremium(false);
});

test('pneu no fim da vida vira notícia uma vez, para conferir a oficina', () => {
  const e = Carreira.novoJogo({ seed: 33 });
  e.pneus[1].uso = 22; // 85% de 26 voltas
  Carreira.pularEtapa(e);
  const avisos = () => e.noticias.filter((n) => n.texto.includes('verifique os pneus na oficina'));
  assert.strictEqual(avisos().length, 1);
  assert.match(avisos()[0].texto, /slick #2/);
  Carreira.pularEtapa(e);
  assert.strictEqual(avisos().length, 1, 'não repete o aviso do mesmo jogo');
});

test('F2: parada escolhe o jogo com vida (não para de novo) e a corrida usa o jogo menos gasto', () => {
  const e = Carreira.novoJogo({ seed: 5 });
  Carreira.comecarEm(e, 'f2');
  e.fase = 'paddock';
  const cl = Carreira.climaAtual(e); cl.tarde.inicioChuva = null; cl.tarde.chove = false; cl.manha.chove = false; cl.tarde.chance = 0;
  e.espacoExtra = 1; // um macio a mais (como quem tem o Premium)
  assert.ok(Carreira.comprarPneu(e, 'slick').ok);
  assert.ok(Carreira.iniciarFimDeSemana(e).ok);
  Carreira.irParaClassificacao(e);
  const quali = e.pneus.find((p) => p.id === e.fds.pneuId);
  Carreira.classificar(e);
  // Depois da classificação a equipe monta o macio menos gasto, não o da volta rápida.
  assert.notStrictEqual(e.fds.pneuId, quali.id);
  if (Carreira.sprintPendente(e)) Carreira.concluirCorrida(e, Engine.simularCompleta(Carreira.criarCorrida(e)));
  assert.ok(Carreira.escolherComposto(e, 'M').ok);
  e.pneus.find((p) => p.tipo === 'medio').uso = 40; // médio no fim
  const c = Carreira.criarCorrida(e);
  const eu = c.carros.find((x) => x.jogador);
  eu.auto = false;
  eu.boxPedido = 'Md'; // pede médio, que está gasto: vai de duro
  Engine.simularCompleta(c);
  assert.deepStrictEqual(eu.usados.slice(0, 2), ['M', 'D']);
  assert.ok(c.eventos.some((ev) => /médio está gasto/.test(ev.texto)));
  assert.strictEqual(eu.paradas, 1);
});

test('aposentadoria: a partir dos 21 (ou depois do título), obrigatória aos 38, com galeria da fama', () => {
  const e = Carreira.novoJogo({ seed: 9 });
  Carreira.comecarEm(e, 'f1');
  e.fase = 'paddock';
  fecharTemporada(e, 1);
  assert.ok(e.noticias.some((n) => /Próxima meta: o bicampeonato/.test(n.texto)));
  assert.ok(Carreira.podeEncerrar(e), 'campeão mundial pode parar mesmo jovem');
  assert.ok(Carreira.encerrarCarreira(e).ok);
  assert.strictEqual(e.fase, 'aposentado');
  assert.strictEqual(e.galeria.f1.titulos, 1);
  assert.ok(Carreira.conferirConquistas(e).some((c) => c.id === 'galeria'));
  // Aos 38 o relatório não oferece outra temporada.
  const v = Carreira.novoJogo({ seed: 10 });
  Carreira.comecarEm(v, 'f2');
  v.fase = 'paddock';
  v.piloto.idade = 37;
  fecharTemporada(v, 8);
  assert.ok(v.relatorio.aposentadoria);
  assert.ok(!Carreira.proximaTemporada(v, 'f2').ok);
  assert.ok(Carreira.encerrarCarreira(v).ok);
  // Kart aos 13: cedo demais.
  const k = Carreira.novoJogo({ seed: 11 });
  fecharTemporada(k, 5);
  assert.ok(!Carreira.podeEncerrar(k));
});

test('preparação sobe o teto; desenvolvimento do carro só na F1 e zera no ano seguinte', () => {
  const e = Carreira.novoJogo({ seed: 14 });
  e.dinheiro = 1e7;
  const teto = e.piloto.potencial;
  assert.ok(Carreira.prepararPiloto(e, 'simulador').ok);
  assert.ok(Carreira.prepararPiloto(e, 'simulador').ok);
  assert.ok(!Carreira.prepararPiloto(e, 'simulador').ok, 'máximo de 2 níveis');
  assert.strictEqual(e.piloto.potencial, teto + 2);
  const t = Carreira.tetoEstimado(e);
  assert.ok(t.min <= e.piloto.potencial + 1 && t.max >= e.piloto.potencial - 1);
  assert.ok(!Carreira.desenvolverCarro(e, 'aero').ok, 'no kart não tem desenvolvimento');
  Carreira.comecarEm(e, 'f1');
  e.fase = 'paddock';
  e.dinheiro = 1e8;
  const antes = Carreira.carroDe(e, e.equipeId, true).aero;
  assert.ok(Carreira.desenvolverCarro(e, 'aero').ok);
  assert.strictEqual(Carreira.carroDe(e, e.equipeId, true).aero, antes + Carreira.GANHO_DEV);
  fecharTemporada(e, 9);
  Carreira.proximaTemporada(e, 'f1');
  assert.strictEqual(Carreira.nivelDev(e, 'aero'), 0, 'carro novo no ano seguinte');
});

test('F1: P9 sem vencer o companheiro não chama as equipes de ponta', () => {
  const e = Carreira.novoJogo({ seed: 15 });
  Carreira.comecarEm(e, 'f1');
  e.fase = 'paddock';
  e.piloto.popularidade = 90;
  e.duelo.corrida = [0, 5];
  fecharTemporada(e, 9);
  assert.ok(!e.relatorio.equipes.some((id) => Carreira.porteDe(id) === 'ponta'));
});

test('repor estoque, rival de carreira, telemetria e desafio da semana', () => {
  const e = Carreira.novoJogo({ seed: 16 });
  // Rival de carreira no grid desde o kart, com placar.
  assert.ok(Carreira.rivalCarreira(e));
  jogarFimDeSemana(e, 'ideal');
  assert.strictEqual(e.rivalCarreira.duelo.eu + e.rivalCarreira.duelo.ele, 1);
  // Repor estoque da F3 em diante: um de cada que faltar.
  Carreira.comecarEm(e, 'f3');
  e.fase = 'paddock';
  const comp = Carreira.compostoDaEtapa(e);
  e.pneus = e.pneus.filter((p) => p.tipo !== comp && p.tipo !== 'chuva');
  const r = Carreira.reporEstoque(e);
  assert.ok(r.ok && new RegExp(Carreira.nomePneu(e, comp), 'i').test(r.texto) && /chuva/.test(r.texto), JSON.stringify(r));
  assert.ok(Carreira.rivalCarreira(e), 'o rival sobe junto');
  // Telemetria: soma dos trechos = total.
  const pista = Carreira.pistaAtual(e);
  const cond = Kart.condicao(Carreira.climaAtual(e), 'treino', false);
  const t = Kart.telemetria(Kart.setupPadrao(), pista, cond, 'slick');
  assert.ok(Math.abs(t.trechos.reduce((s, x) => s + x.perda, 0) - t.total) < 1e-9);
  // Desafio: 3 voltas por semana; acerto perfeito dá ouro.
  const agora = Date.UTC(2026, 9, 21);
  const d = Carreira.desafioDaSemana(e, agora);
  Carreira.estadoDesafio(e, d).setup = Kart.arredondarSetup(Kart.acertoIdeal(d.pista, d.cond, d.pneu));
  const v = Carreira.tentarDesafio(e, agora);
  assert.strictEqual(v.medalha, 'ouro');
  Carreira.tentarDesafio(e, agora);
  Carreira.tentarDesafio(e, agora);
  assert.ok(!Carreira.tentarDesafio(e, agora).ok);
  assert.ok(Carreira.conferirConquistas(e).some((c) => c.id === 'desafio_ouro'));
});

test('desafio do dia: grátis no primeiro dia, depois só com o Premium', () => {
  Carreira.definirPremium(false);
  const e = Carreira.novoJogo({ seed: 17 });
  const s1 = Date.UTC(2026, 9, 21), s2 = s1 + 7 * 86400000;
  assert.ok(Carreira.tentarDesafio(e, s1).ok);
  assert.ok(Carreira.tentarDesafio(e, s1).ok, 'a semana grátis vale as 3 voltas');
  const r = Carreira.tentarDesafio(e, s2);
  assert.ok(!r.ok && r.premium);
  Carreira.definirPremium(true);
  assert.ok(Carreira.tentarDesafio(e, s2).ok);
  Carreira.definirPremium(false);
});

test('F4: o box para chuva usa o pneu de chuva do estoque, e cada jogo volta com o próprio desgaste', () => {
  const e = Carreira.novoJogo({ seed: 18 });
  Carreira.comecarEm(e, 'f4');
  e.fase = 'paddock';
  const cl = Carreira.climaAtual(e); cl.tarde.inicioChuva = 'corrida'; cl.tarde.voltaChuva = 4; cl.tarde.chove = true; cl.tarde.chance = 80; cl.manha.chove = false;
  assert.ok(Carreira.iniciarFimDeSemana(e).ok);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  const slick = e.pneus.find((p) => p.id === e.fds.pneuCorrida);
  const chuva = e.pneus.find((p) => p.tipo === 'chuva');
  const usoSlick = slick.uso;
  const c = Carreira.criarCorrida(e);
  while (!c.terminou) { if (c.molhado && !c.pediu) { c.boxJogador = true; c.pediu = true; } Engine.passo(c); }
  assert.deepStrictEqual(c.jogosJogador.map((j) => j.id), [slick.id, chuva.id]);
  Carreira.concluirCorrida(e, c);
  assert.ok(chuva.uso > 0, 'o pneu de chuva volta gasto');
  assert.ok(slick.uso > usoSlick && slick.uso < usoSlick + 10, 'o slick só gasta as voltas antes da chuva');
  // Sem pneu de chuva no estoque, não troca.
  const f = Carreira.novoJogo({ seed: 19 });
  Carreira.comecarEm(f, 'f4');
  f.fase = 'paddock';
  const cf = Carreira.climaAtual(f); cf.tarde.inicioChuva = 'corrida'; cf.tarde.voltaChuva = 3; cf.tarde.chove = true; cf.manha.chove = false;
  Carreira.iniciarFimDeSemana(f);
  Carreira.irParaClassificacao(f);
  Carreira.classificar(f);
  f.pneus = f.pneus.filter((p) => p.tipo !== 'chuva');
  const c2 = Carreira.criarCorrida(f);
  while (!c2.terminou) { if (c2.molhado) c2.boxJogador = true; Engine.passo(c2); }
  assert.strictEqual(c2.carros.find((x) => x.jogador).tipoPneu, 'slick');
  assert.ok(c2.eventos.some((ev) => /Sem pneu de chuva/.test(ev.texto)));
});

test('nome do piloto com iniciais maiúsculas, também em carreiras antigas', () => {
  const e = Carreira.novoJogo({ seed: 20, nome: '  DIOGO   sânder ' });
  assert.strictEqual(e.piloto.nome, 'Diogo Sânder');
  assert.strictEqual(Carreira.nomeDoPiloto('ana da silva'), 'Ana da Silva');
  const antigo = JSON.parse(JSON.stringify(e));
  antigo.piloto.nome = 'PÉRICLES CHAMUSKA';
  Carreira.migrar(antigo);
  assert.strictEqual(antigo.piloto.nome, 'Péricles Chamuska');
  // O sobrenome do jogador não se repete no grid.
  assert.ok(!e.rivais.some((r) => r.nome.split(' ').slice(1).join(' ').toUpperCase() === 'SÂNDER'));
});

test('desafio do dia paga por medalha, só a diferença quando melhora', () => {
  Carreira.definirPremium(true);
  const e = Carreira.novoJogo({ seed: 21 });
  const agora = Date.UTC(2026, 9, 22);
  const d = Carreira.desafioDaSemana(e, agora);
  const ouro = Carreira.premioMedalha(e, 'ouro');
  assert.ok(ouro > 0 && Carreira.premioMedalha(e, 'bronze') === Math.round(ouro / 4 / 100) * 100);
  const ideal = Kart.arredondarSetup(Kart.acertoIdeal(d.pista, d.cond, d.pneu));
  const st = Carreira.estadoDesafio(e, d);
  st.setup = { ...ideal };
  const antes = e.dinheiro;
  const r = Carreira.tentarDesafio(e, agora);
  assert.strictEqual(r.medalha, 'ouro');
  assert.strictEqual(e.dinheiro, antes + ouro);
  Carreira.tentarDesafio(e, agora);
  assert.strictEqual(e.dinheiro, antes + ouro, 'ouro de novo não paga outra vez');
  Carreira.comecarEm(e, 'f1');
  assert.strictEqual(Carreira.premioMedalha(e, 'ouro'), 500000);
  Carreira.definirPremium(false);
});

test('desafio do dia: 3 voltas e o próximo sai 24 h depois da primeira volta', () => {
  Carreira.definirPremium(true);
  const e = Carreira.novoJogo({ seed: 22 });
  const DIA = 86400000;
  const t0 = Date.UTC(2026, 9, 19, 22); // tarde da noite: não pode virar à meia-noite
  const d0 = Carreira.desafioDaSemana(e, t0);
  assert.strictEqual(d0.fim, null, 'antes da primeira volta o desafio espera o jogador');
  for (let i = 0; i < 3; i++) assert.ok(Carreira.tentarDesafio(e, t0 + i * 60000).ok);
  const r = Carreira.tentarDesafio(e, t0 + 3 * 60000);
  assert.ok(!r.ok && /24 h/.test(r.erro));
  const v = Carreira.voltasDesafio(e, t0 + 3 * 60000);
  assert.strictEqual(v.restantes, 0);
  assert.strictEqual(v.reabreEm, t0 + DIA);
  // Passou a meia-noite: continua o mesmo desafio, sem voltas.
  assert.strictEqual(Carreira.desafioDaSemana(e, t0 + 4 * 3600000).semana, d0.semana);
  assert.strictEqual(Carreira.voltasDesafio(e, t0 + 4 * 3600000).restantes, 0);
  // 24 h depois da primeira volta: desafio novo, com 3 voltas.
  const d1 = Carreira.desafioDaSemana(e, t0 + DIA);
  assert.strictEqual(d1.semana, d0.semana + 1);
  assert.strictEqual(Carreira.voltasDesafio(e, t0 + DIA).restantes, 3);
  assert.ok(Carreira.tentarDesafio(e, t0 + DIA + 1000).ok);
  assert.strictEqual(Carreira.voltasDesafio(e, t0 + DIA + 2000).restantes, 2);
  Carreira.definirPremium(false);
});

test('desafio do dia: save antigo (virava à meia-noite) segue valendo até a meia-noite daquele dia', () => {
  Carreira.definirPremium(true);
  const e = Carreira.novoJogo({ seed: 23 });
  const t0 = Date.UTC(2026, 9, 19, 15);
  for (let i = 0; i < 3; i++) Carreira.tentarDesafio(e, t0);
  delete e.desafio.inicio;
  const { reabreEm } = Carreira.voltasDesafio(e, t0);
  assert.ok(reabreEm > t0 && reabreEm - t0 <= 86400000);
  assert.strictEqual(Carreira.voltasDesafio(e, reabreEm).restantes, 3);
  Carreira.definirPremium(false);
});

test('rival de carreira nunca é o companheiro de equipe', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const e = Carreira.novoJogo({ seed });
    const rc = Carreira.rivalCarreira(e);
    assert.ok(rc && rc.equipe !== e.equipeId, `seed ${seed}`);
    assert.ok(e.rivais.filter((r) => r.equipe === e.equipeId).length === 1, `seed ${seed}: um companheiro só`);
  }
});

test('banco: só com o Premium, parcela por etapa, atraso com multa e quitação com desconto', () => {
  Carreira.definirPremium(false);
  const e = Carreira.novoJogo({ seed: 31 });
  e.fase = 'paddock';
  const r0 = Carreira.pegarEmprestimo(e, 10000, 8);
  assert.ok(!r0.ok && r0.premium, 'sem Premium não tem banco');
  Carreira.definirPremium(true);
  const limite = Carreira.limiteEmprestimo(e);
  assert.ok(limite >= 20000);
  assert.ok(!Carreira.pegarEmprestimo(e, limite + 1000, 8).ok, 'acima do limite');
  const antes = e.dinheiro;
  const r = Carreira.pegarEmprestimo(e, 20000, 8);
  assert.ok(r.ok);
  assert.strictEqual(e.dinheiro, antes + 20000);
  assert.strictEqual(r.total, 23000);
  assert.strictEqual(r.parcela, 2875);
  assert.ok(!Carreira.pegarEmprestimo(e, 1000, 4).ok, 'um por vez');
  // Uma etapa: paga a parcela.
  jogarFimDeSemana(e, 'ideal');
  assert.strictEqual(e.emprestimo.restantes, 7);
  assert.strictEqual(e.emprestimo.saldo, 23000 - 2875);
  // Sem dinheiro: atrasa, multa e moral cai.
  e.fase = 'paddock';
  const saldo = e.emprestimo.saldo;
  e.dinheiro = 0;
  const moral = e.piloto.moral;
  Carreira.concluirEtapa(e);
  assert.strictEqual(e.emprestimo.restantes, 7);
  assert.strictEqual(e.emprestimo.saldo, saldo + Math.round(2875 * 0.1));
  assert.ok(e.piloto.moral < moral);
  // Quitar antes: paga menos que o saldo.
  e.fase = 'paddock';
  e.dinheiro = 1e6;
  const q = Carreira.valorQuitacao(e);
  assert.ok(q < e.emprestimo.saldo);
  assert.ok(Carreira.quitarEmprestimo(e).ok);
  assert.strictEqual(e.emprestimo, null);
  assert.strictEqual(e.dinheiro, 1e6 - q);
  Carreira.definirPremium(false);
});

test('F4: olheiros e academias só oferecem equipe de entrada; propostas antigas migram', () => {
  const entrada = Dados.EQUIPES_F4.slice(-4).map((e) => e.id);
  for (const o of Dados.OLHEIROS) assert.ok(entrada.includes(o.equipe), `${o.nome} oferece ${o.equipe}`);
  const e = Carreira.novoJogo({ seed: 41 });
  e.propostas = [{ id: 'a', tipo: 'f4', nome: 'Apex Junior (F4)', equipe: 'f4-apex' }, { id: 'b', tipo: 'academia', nome: 'Academia Vortex (equipe de F1)', equipe: 'f4-vortex' }];
  e.f4Reservada = { id: 'c', tipo: 'f4', nome: 'Lionheart F4', equipe: 'f4-lionheart' };
  Carreira.migrar(e);
  assert.deepStrictEqual(e.propostas.map((p) => p.equipe), ['f4-mistral', 'f4-box13']);
  assert.strictEqual(e.f4Reservada.equipe, 'f4-nordwind');
});

test('pneus zeram a cada temporada: a equipe entrega um jogo novo', () => {
  Carreira.definirPremium(false);
  const e = Carreira.novoJogo({ seed: 43 });
  while (e.fase !== 'fimTemporada' && e.fase !== 'relatorio') { jogarFimDeSemana(e, 'ideal'); if (e.fase === 'paddock') continue; break; }
  assert.ok(e.pneus.some((p) => p.uso > 0), 'no fim do ano o estoque está gasto');
  const rel = e.relatorio;
  assert.ok(Carreira.proximaTemporada(e, rel.opcoes[0], e.equipeId).ok);
  assert.deepStrictEqual(e.pneus.map((p) => p.tipo).sort(), ['chuva', 'slick', 'slick']);
  assert.ok(e.pneus.every((p) => !p.uso));
  assert.ok(e.noticias.some((n) => /pneus novos/.test(n.texto)));
});

test('subida no kart vira notícia: conquistou a vaga no campeonato seguinte', () => {
  const e = Carreira.novoJogo({ seed: 44 });
  e.piloto.popularidade = 99; // garante a vaga
  while (e.fase === 'paddock') jogarFimDeSemana(e, 'ideal');
  assert.ok(e.relatorio.opcoes.includes('nacional'));
  assert.ok(e.noticias.some((n) => /conquistou a vaga e pode correr o Campeonato Brasileiro de Kart em \d{4}/.test(n.texto)), e.noticias.map((n) => n.texto).join('\n'));
});

test('pontos de evolução: ganhos pela temporada, investidos até o limite e devolvidos até a temporada começar', () => {
  assert.strictEqual(Carreira.pontosEvolucaoDa(1, 3), 23);
  assert.strictEqual(Carreira.pontosEvolucaoDa(7, 0), 11);
  assert.strictEqual(Carreira.pontosEvolucaoDa(15, 0), 8);
  const e = Carreira.novoJogo({ seed: 45 });
  while (e.fase === 'paddock') jogarFimDeSemana(e, 'ideal');
  const r = e.relatorio;
  assert.strictEqual(e.pontosEvolucao, Carreira.pontosEvolucaoDa(r.pos, r.vitorias));
  const antes = e.piloto.chuva;
  assert.ok(Carreira.investirPonto(e, 'chuva').ok);
  assert.ok(Carreira.investirPonto(e, 'chuva').ok);
  assert.ok(Carreira.devolverPonto(e, 'chuva').ok);
  assert.strictEqual(e.piloto.chuva, antes + 1);
  assert.ok(!Carreira.devolverPonto(e, 'largada').ok, 'só devolve o que investiu');
  e.piloto.ritmo = e.piloto.potencial;
  assert.ok(!Carreira.investirPonto(e, 'ritmo').ok, 'não passa do limite');
  const sobra = e.pontosEvolucao;
  assert.ok(Carreira.proximaTemporada(e, r.opcoes[0], e.equipeId).ok);
  assert.ok(!Carreira.devolverPonto(e, 'chuva').ok, 'com a temporada começada, fica valendo');
  assert.strictEqual(e.pontosEvolucao, sobra, 'o que sobrou fica guardado');
});

test('F3: um único composto de seco por etapa, pelo asfalto; o grid inteiro larga com ele', () => {
  const e = Carreira.novoJogo({ seed: 47 });
  Carreira.comecarEm(e, 'f3');
  e.fase = 'paddock';
  e.espacoExtra = 2;
  for (const t of ['slick', 'medio', 'duro']) Carreira.comprarPneu(e, t, true);
  const vistos = new Set();
  for (let i = 0; i < e.calendario.length; i++) vistos.add(Carreira.compostoDaEtapa(e, i));
  assert.ok(vistos.size >= 2, 'o composto muda conforme a pista');
  const comp = Carreira.compostoDaEtapa(e);
  const outro = ['slick', 'medio', 'duro'].find((t) => t !== comp);
  const cl = Carreira.climaAtual(e); cl.manha.chove = false; cl.tarde.chove = false; cl.tarde.inicioChuva = null; cl.tarde.voltaChuva = null;
  assert.ok(Carreira.iniciarFimDeSemana(e).ok);
  const jogoOutro = e.pneus.find((p) => p.tipo === outro);
  assert.ok(!Carreira.escolherPneu(e, jogoOutro.id).ok, 'outro composto não vai para o carro');
  assert.strictEqual(e.pneus.find((p) => p.id === e.fds.pneuId).tipo, comp, 'a equipe monta o composto da etapa');
  Carreira.saidaTreino(e);
  Carreira.irParaClassificacao(e);
  Carreira.classificar(e);
  const corrida = Carreira.criarCorrida(e);
  const k = Carreira.COMPOSTO_DO_TIPO[comp];
  assert.ok(corrida.carros.every((c) => c.pneu === k), 'todo o grid com o composto da etapa');
  // Na F2 a escolha continua livre.
  const f = Carreira.novoJogo({ seed: 48 });
  Carreira.comecarEm(f, 'f2');
  assert.strictEqual(Carreira.compostoDaEtapa(f), null);
});

test('pontos de evolução: com tudo no limite, 5 pontos elevam o limite do piloto (até 99) e dá para devolver', () => {
  const e = Carreira.novoJogo({ seed: 46 });
  e.pontosEvolucao = 12;
  e.distribuidos = {};
  for (const a of Carreira.ATRIBUTOS) e.piloto[a] = e.piloto.potencial;
  assert.ok(!Carreira.investirPonto(e, 'ritmo').ok, 'tudo no limite: não investe');
  const lim = e.piloto.potencial;
  assert.ok(Carreira.elevarLimite(e).ok);
  assert.strictEqual(e.piloto.potencial, lim + 1);
  assert.strictEqual(e.pontosEvolucao, 7);
  assert.ok(Carreira.investirPonto(e, 'ritmo').ok, 'agora cabe +1');
  assert.ok(!Carreira.devolverPonto(e, 'limite').ok, 'com o atributo usando o limite, não devolve');
  assert.ok(Carreira.devolverPonto(e, 'ritmo').ok);
  assert.ok(Carreira.devolverPonto(e, 'limite').ok);
  assert.strictEqual(e.piloto.potencial, lim);
  assert.strictEqual(e.pontosEvolucao, 12);
  e.pontosEvolucao = 4;
  assert.ok(!Carreira.elevarLimite(e).ok, 'faltam pontos');
  e.pontosEvolucao = 50;
  e.piloto.potencial = 99;
  assert.ok(!Carreira.elevarLimite(e).ok, 'máximo 99');
});
