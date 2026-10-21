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
  for (const p of estado.pneus.slice()) if (p.uso > 20) Carreira.venderPneu(estado, p.id);
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
  const din = e.dinheiro;
  assert.ok(Carreira.venderPneu(e, novo.id).ok);
  assert.strictEqual(e.dinheiro, din + v0);
  // doação: moral sobe, só uma vez por etapa
  const moral = e.piloto.moral;
  assert.ok(Carreira.doarPneu(e, chuva.id).ok);
  assert.ok(e.piloto.moral > moral);
  assert.strictEqual(Carreira.doarPneu(e, e.pneus[0].id).ok, false);
  // estoque cheio
  e.dinheiro = 1e6;
  while (e.pneus.length < Carreira.MAX_PNEUS) assert.ok(Carreira.comprarPneu(e, 'slick').ok);
  assert.strictEqual(Carreira.comprarPneu(e, 'slick').ok, false);
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
  const ideal = [1, 2, 3, 4].map((s) => temporada(s, 'ideal'));
  const padrao = [1, 2, 3, 4].map((s) => temporada(s, 'padrao'));
  assert.ok(ideal.filter((p) => p <= Carreira.VAGAS_SUBIDA).length >= 3, `ideal: ${ideal}`);
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
  const e = Carreira.novoJogo({ seed: 61 });
  e.dinheiro = 1e6;
  assert.strictEqual(Carreira.espacoPneus(e), 6);
  const p1 = Carreira.precoEspaco(e);
  assert.ok(Carreira.comprarEspaco(e).ok);
  assert.ok(Carreira.precoEspaco(e) > p1);
  assert.ok(Carreira.comprarEspaco(e).ok);
  assert.strictEqual(Carreira.espacoPneus(e), 8);
  assert.ok(!Carreira.comprarEspaco(e).ok); // limite do kart
  while (e.pneus.length < 8) assert.ok(Carreira.comprarPneu(e, 'slick').ok);
  assert.ok(!Carreira.comprarPneu(e, 'slick').ok);
  e.campeonato = 'f1';
  assert.strictEqual(Carreira.limiteEspaco(e), 16);
  assert.ok(Carreira.comprarEspaco(e).ok);
  Carreira.migrar({ campeonato: 'regional' });
});
