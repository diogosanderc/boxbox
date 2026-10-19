const test = require('node:test');
const assert = require('node:assert');
const Engine = require('../js/engine.js');
const Jogo = require('../js/game.js');

// Estratégia simples de "jogador robô": sobe sempre que pode, na equipe mais barata, e aceita a primeira oferta.
function planejarTudo(estado) {
  for (const p of Jogo.meusPilotos(estado)) {
    if (p.categoria === 'f1') continue;
    const cats = Jogo.categoriasPossiveis(p);
    const cat = cats[cats.length - 1];
    if (!cat) continue;
    const equipes = estado.equipes[cat.id].slice().sort((a, b) => Jogo.custoParaAcademia(estado, a, p) - Jogo.custoParaAcademia(estado, b, p));
    for (const eq of equipes) {
      if (Jogo.planejar(estado, p.id, eq.id, (estado.ofertas[p.id] || []).length ? 0 : null).ok) break;
    }
    if (!Jogo.resumoPretemporada(estado).cabe) Jogo.planejar(estado, p.id, null);
  }
}

function jogarAno(estado) {
  planejarTudo(estado);
  const r = Jogo.iniciarTemporada(estado);
  assert.ok(r.ok, r.erro);
  while (estado.fase === 'temporada') Jogo.concluirEtapa(estado);
  if (estado.fase === 'relatorio') estado.fase = 'pretemporada';
}

test('novo jogo começa com dois pilotos de kart e prospectos', () => {
  const estado = Jogo.novoJogo({ seed: 1 });
  assert.strictEqual(Jogo.meusPilotos(estado).length, 2);
  assert.ok(Jogo.meusPilotos(estado).every((p) => p.categoria === 'kart'));
  assert.ok(estado.prospectos.length >= 5);
  assert.strictEqual(estado.fase, 'pretemporada');
});

test('mesma semente gera o mesmo jogo', () => {
  const a = Jogo.novoJogo({ seed: 9 });
  const b = Jogo.novoJogo({ seed: 9 });
  jogarAno(a);
  jogarAno(b);
  assert.deepStrictEqual(a, b);
});

test('temporada completa: todas as categorias com grid cheio e pontos distribuídos', () => {
  const estado = Jogo.novoJogo({ seed: 5 });
  planejarTudo(estado);
  assert.ok(Jogo.iniciarTemporada(estado).ok);
  for (const cat of ['kart', 'f4', 'f3', 'f2']) {
    assert.strictEqual(Jogo.classificacaoCategoria(estado, cat).length, 20, cat);
  }
  while (estado.fase === 'temporada') Jogo.concluirEtapa(estado);
  assert.strictEqual(estado.ano, 2028);
  assert.ok(estado.relatorio.campeoes.f2);
});

test('não deixa iniciar a temporada sem dinheiro', () => {
  const estado = Jogo.novoJogo({ seed: 2 });
  planejarTudo(estado);
  estado.academia.dinheiro = -100;
  assert.strictEqual(Jogo.iniciarTemporada(estado).ok, false);
});

test('contratar exige dinheiro e reputação', () => {
  const estado = Jogo.novoJogo({ seed: 3 });
  const pr = estado.prospectos[0];
  estado.academia.reputacao = 100;
  estado.academia.dinheiro = 0;
  assert.strictEqual(Jogo.contratar(estado, pr.id).ok, false);
  estado.academia.dinheiro = 10;
  assert.ok(Jogo.contratar(estado, pr.id).ok);
  assert.ok(Jogo.piloto(estado, pr.id).academia);
});

test('Superlicença soma os últimos 3 anos', () => {
  const p = { superlicenca: [{ ano: 2027, pontos: 12 }, { ano: 2028, pontos: 20 }, { ano: 2029, pontos: 15 }, { ano: 2030, pontos: 10 }] };
  assert.strictEqual(Jogo.superlicenca(p, 2030), 45);
  assert.strictEqual(Jogo.superlicenca(p, 2029), 47);
});

test('kart e F4 correm sem pit obrigatório; F2 exige dois compostos', () => {
  const estado = Jogo.novoJogo({ seed: 4 });
  planejarTudo(estado);
  Jogo.iniciarTemporada(estado);
  const kart = Engine.simularCompleta(Jogo.prepararCorrida(estado, 'kart').corrida);
  assert.ok(kart.carros.every((c) => c.paradas === 0 && c.penalidade === 0));
  const f2 = Engine.simularCompleta(Jogo.prepararCorrida(estado, 'f2').corrida);
  assert.ok(f2.carros.filter((c) => !c.fora).every((c) => c.usados.length >= 2 || c.penalidade > 0));
});

test('várias temporadas rodam sem erro e alguém chega à F1', () => {
  const estado = Jogo.novoJogo({ seed: 77, dificuldade: 'facil' });
  let chegaram = 0;
  for (let i = 0; i < 10 && estado.fase !== 'falencia'; i++) {
    jogarAno(estado);
    chegaram += estado.relatorio.f1.length;
  }
  assert.ok(chegaram > 0);
  assert.ok(estado.pilotos.length < 400, `estado cresceu demais: ${estado.pilotos.length}`);
});
