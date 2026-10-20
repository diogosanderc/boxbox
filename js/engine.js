// Motor de simulação: classificação e corrida volta a volta.
// Não depende do navegador: roda igual no Node (testes) e na página.
(function (root) {
  'use strict';

  // ritmo: segundos a mais por volta em relação ao macio novo.
  // vida: voltas (em desgaste 1.0) até o pneu "cair do penhasco".
  // desgaste: segundos perdidos por volta de uso.
  const PNEUS = {
    M: { nome: 'Macio', cor: '#e10600', ritmo: 0, vida: 16, desgaste: 0.075 },
    Md: { nome: 'Médio', cor: '#ffd400', ritmo: 0.55, vida: 26, desgaste: 0.05 },
    D: { nome: 'Duro', cor: '#f2f2f2', ritmo: 1.0, vida: 38, desgaste: 0.035 },
  };
  const ORDEM_PNEUS = ['M', 'Md', 'D'];

  const MODOS = {
    atacar: { nome: 'Atacar', ritmo: -0.25, pneu: 1.35, risco: 1.6 },
    normal: { nome: 'Normal', ritmo: 0, pneu: 1, risco: 1 },
    poupar: { nome: 'Poupar', ritmo: 0.3, pneu: 0.7, risco: 0.6 },
  };

  const PONTOS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  const SEM_AJUSTE = { tempo: 0, sigma: 1, erro: 1, quebra: 0, desgaste: 1, motivoQuebra: 'Quebra' };
  const PENALIDADE_COMPOSTO = 10; // segundos por não usar dois compostos

  // Gerador pseudoaleatório com semente (mulberry32), para corridas reproduzíveis.
  function criarRng(seed) {
    let a = seed >>> 0;
    const rnd = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rnd.gauss = () => {
      const u = 1 - rnd();
      const v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return rnd;
  }

  const limitar = (x, min, max) => Math.max(min, Math.min(max, x));

  function forcaCarro(carro, pista) {
    const w = pista.peso;
    return (carro.motor * w.motor + carro.aero * w.aero + carro.chassi * w.chassi) / (w.motor + w.aero + w.chassi);
  }

  // Tempo de volta "limpo" do conjunto carro + piloto, sem pneu, combustível ou ruído.
  function ritmoBase(entrada, pista) {
    return pista.tempoBase
      - (forcaCarro(entrada.carro, pista) - 75) * 0.06
      - (entrada.piloto.ritmo - 80) * 0.035;
  }

  // Quanto o piloto preserva o pneu (pilotos com nota alta fazem o pneu durar mais).
  const fatorPneuPiloto = (piloto) => 0.85 + piloto.pneus / 100 * 0.3;

  // Vida útil de um composto, em voltas normais, para este piloto nesta pista.
  function vidaPneu(composto, piloto, pista) {
    return PNEUS[composto].vida * fatorPneuPiloto(piloto) / pista.desgaste;
  }

  function perdaPorDesgaste(composto, uso) {
    const p = PNEUS[composto];
    const alem = uso - p.vida;
    return p.desgaste * uso + (alem > 0 ? 0.35 * Math.pow(alem, 1.3) : 0);
  }

  // entradas: [{ id, piloto, carro, equipe: { id, nome, cor }, jogador }]
  function classificar(pista, entradas, seed) {
    const rnd = criarRng(seed);
    return entradas
      .map((e) => {
        const sigma = 0.3 - e.piloto.consistencia * 0.002;
        return { entrada: e, tempo: ritmoBase(e, pista) - 0.8 + rnd.gauss() * sigma };
      })
      .sort((a, b) => a.tempo - b.tempo);
  }

  // Escolhe o composto mais rápido que aguenta as voltas restantes (respeitando a regra dos dois compostos).
  function escolherPneu(carro, pista, restantes) {
    const precisaTrocar = carro.usados.length === 1 ? carro.usados[0] : null;
    for (const c of ORDEM_PNEUS) {
      if (c === precisaTrocar) continue;
      if (vidaPneu(c, carro.piloto, pista) * 0.95 >= restantes) return c;
    }
    return precisaTrocar === 'D' ? 'Md' : 'D';
  }

  // Sem a regra dos dois compostos, escolhe só pela duração.
  function escolherPneuLivre(carro, pista, restantes) {
    for (const c of ORDEM_PNEUS) {
      if (vidaPneu(c, carro.piloto, pista) * 0.95 >= restantes) return c;
    }
    return 'D';
  }

  function pneuInicialIA(pista, rnd) {
    if (pista.desgaste >= 1.2) return rnd() < 0.75 ? 'Md' : 'M';
    if (pista.desgaste <= 0.8) return rnd() < 0.6 ? 'Md' : 'D';
    return rnd() < 0.55 ? 'M' : 'Md';
  }

  // Decide se um carro em estratégia automática para nesta volta.
  function decidirParada(carro, corrida) {
    const pista = corrida.pista;
    const restantes = corrida.totalVoltas - corrida.volta + 1;
    const vida = PNEUS[carro.pneu].vida;
    const cumpriuRegra = carro.usados.length >= 2;
    const ritmoDesgaste = pista.desgaste / fatorPneuPiloto(carro.piloto);
    const chegaAoFim = carro.uso + restantes * ritmoDesgaste <= vida * 1.02;

    if (restantes <= 1) return false;
    if (!corrida.regraCompostos) return carro.uso >= vida * 1.25 && restantes > 3;
    if (!cumpriuRegra && restantes <= 4) return true;
    if (chegaAoFim && cumpriuRegra) return false;
    if (corrida.safetyCar > 0 && carro.uso >= vida * 0.5 && restantes > 8) return true;
    return carro.uso >= vida * carro.limiteStint && restantes > 2;
  }

  function criarCorrida(pista, grid, seed, opcoes = {}) {
    const rnd = criarRng(seed);
    const carros = grid.map((e, i) => {
      const pneu = (opcoes.pneusIniciais && opcoes.pneusIniciais[e.id]) || opcoes.pneuPadrao || pneuInicialIA(pista, rnd);
      return {
        id: e.id, piloto: e.piloto, carro: e.carro, equipe: e.equipe, jogador: !!e.jogador,
        largada: i + 1, pos: i + 1,
        tempo: i * 0.25, // diferença do grid
        pneu, uso: 0, idadePneu: 0, usados: [pneu], paradas: 0,
        modo: 'normal', auto: true, boxPedido: null,
        limiteStint: 0.82 + rnd() * 0.15,
        voltas: 0, ultimaVolta: null, melhorVolta: null,
        fora: false, motivoFora: null, paradoNestaVolta: false, penalidade: 0,
      };
    });
    return {
      pista, seed, volta: 0, totalVoltas: pista.voltas, carros,
      regraCompostos: opcoes.regraCompostos !== false,
      semBox: !!opcoes.semBox, semSafetyCar: !!opcoes.semSafetyCar, ajusteVolta: opcoes.ajusteVolta || null,
      safetyCar: 0, eventos: [], terminou: false, _rnd: rnd,
    };
  }

  function registrar(corrida, texto, tipo = 'info', carroId = null) {
    corrida.eventos.push({ volta: corrida.volta, texto, tipo, carroId });
  }

  function emPista(corrida) {
    return corrida.carros.filter((c) => !c.fora);
  }

  // Avança uma volta. Comandos do jogador (modo, auto, boxPedido) devem estar setados nos carros antes.
  function passo(corrida) {
    if (corrida.terminou) return corrida;
    const rnd = corrida._rnd;
    const pista = corrida.pista;
    corrida.volta += 1;
    const v = corrida.volta;
    const sc = corrida.safetyCar > 0;
    const ordemAnterior = emPista(corrida).sort((a, b) => a.pos - b.pos);
    let abandonosNaVolta = 0;

    for (const c of ordemAnterior) {
      c.paradoNestaVolta = false;
      const modo = MODOS[c.modo] || MODOS.normal;

      let parar = false;
      let novoPneu = null;
      if (c.boxPedido) {
        parar = true;
        novoPneu = c.boxPedido;
        c.boxPedido = null;
      } else if (!corrida.semBox && (c.auto || !c.jogador) && decidirParada(c, corrida)) {
        parar = true;
        novoPneu = (corrida.regraCompostos ? escolherPneu : escolherPneuLivre)(c, pista, corrida.totalVoltas - v + 1);
      }

      // Ajuste externo por volta (acerto do carro, clima...): segundos extras e multiplicadores de risco.
      const extra = { ...SEM_AJUSTE, ...(corrida.ajusteVolta ? corrida.ajusteVolta(c, v, corrida) : null) };
      let volta = ritmoBase(c, pista)
        + PNEUS[c.pneu].ritmo
        + perdaPorDesgaste(c.pneu, c.uso)
        + (corrida.totalVoltas - v) * 0.035 // combustível
        + modo.ritmo
        + extra.tempo
        + rnd.gauss() * (0.35 - c.piloto.consistencia * 0.0025) * extra.sigma;

      if (v === 1) volta += rnd.gauss() * 0.5 - (c.piloto.largada - 80) * 0.02;
      if (sc) volta = Math.max(volta, pista.tempoBase * 1.4) + rnd() * 0.2;

      if (parar) {
        let servico = 2.1 + Math.abs(rnd.gauss()) * 0.4;
        if (rnd() < 0.04) {
          servico += 2 + rnd() * 6;
          registrar(corrida, `Problema no pit stop de ${c.piloto.nome}!`, 'alerta', c.id);
        }
        volta += (sc ? pista.perdaBox * 0.5 : pista.perdaBox) + servico;
        registrar(corrida, `${c.piloto.nome} para nos boxes: ${PNEUS[c.pneu].nome} → ${PNEUS[novoPneu].nome} (${servico.toFixed(1)}s)`, 'box', c.id);
        c.pneu = novoPneu;
        c.uso = 0;
        c.idadePneu = 0;
        if (!c.usados.includes(novoPneu)) c.usados.push(novoPneu);
        c.paradas += 1;
        c.paradoNestaVolta = true;
        c.limiteStint = 0.82 + rnd() * 0.15;
      }

      // Quebras e erros
      const chanceQuebra = (1 - c.carro.confiabilidade / 100) * 0.006 + extra.quebra;
      const chanceErro = (100 - c.piloto.consistencia) * 0.00006 * modo.risco * (sc ? 0.2 : 1) * extra.erro;
      const sorteio = rnd();
      if (sorteio < chanceQuebra + chanceErro) {
        c.fora = true;
        c.motivoFora = sorteio < chanceQuebra ? (sorteio < extra.quebra ? extra.motivoQuebra : 'Quebra') : 'Acidente';
        registrar(corrida, `${c.piloto.nome} abandona: ${c.motivoFora.toLowerCase()}!`, 'abandono', c.id);
        abandonosNaVolta += 1;
        continue;
      }

      c.uso += (sc ? 0.4 : 1) * modo.pneu * extra.desgaste * pista.desgaste / fatorPneuPiloto(c.piloto);
      c.idadePneu += 1;
      c.tempo += volta;
      c.voltas = v;
      c.ultimaVolta = volta;
      if (!sc && !parar && (c.melhorVolta === null || volta < c.melhorVolta)) c.melhorVolta = volta;
    }

    // IA: ataca no fim da corrida
    for (const c of ordemAnterior) {
      if (!c.jogador && corrida.totalVoltas - v === 6) c.modo = 'atacar';
    }

    // Ordenação com disputa de posição: quem é mais rápido só passa se a ultrapassagem der certo.
    const lista = emPista(corrida).sort((a, b) => a.pos - b.pos);
    for (let i = 1; i < lista.length; i++) {
      let j = i;
      while (j > 0 && lista[j].tempo < lista[j - 1].tempo) {
        const frente = lista[j - 1];
        const tras = lista[j];
        const livre = sc || frente.paradoNestaVolta || tras.paradoNestaVolta;
        if (!livre) {
          const vantagem = frente.tempo - tras.tempo;
          const chance = limitar(
            0.15 + vantagem * 0.5 + (tras.piloto.ultrapassagem - frente.piloto.defesa) / 100 + pista.ultrapassagem * 0.4,
            0.03, 0.9,
          );
          if (rnd() >= chance) {
            tras.tempo = frente.tempo + 0.15 + rnd() * 0.3;
            break;
          }
          if (frente.jogador || tras.jogador || j === 1) {
            registrar(corrida, `${tras.piloto.nome} ultrapassa ${frente.piloto.nome} pela P${j}`, 'ultrapassagem', tras.id);
          }
        }
        lista[j - 1] = tras;
        lista[j] = frente;
        j -= 1;
      }
    }
    if (sc) {
      for (let i = 1; i < lista.length; i++) {
        lista[i].tempo = Math.min(lista[i].tempo, lista[i - 1].tempo + 0.6);
      }
    }
    lista.forEach((c, i) => { c.pos = i + 1; });
    const fora = corrida.carros.filter((c) => c.fora).sort((a, b) => b.voltas - a.voltas);
    fora.forEach((c, i) => { c.pos = lista.length + i + 1; });

    // Safety car
    if (sc) {
      corrida.safetyCar -= 1;
      if (corrida.safetyCar === 0) registrar(corrida, 'Safety car recolhido. Relargada!', 'sc');
    } else if (!corrida.semSafetyCar && v < corrida.totalVoltas - 3 && (abandonosNaVolta > 0 ? rnd() < 0.5 : rnd() < 0.004)) {
      corrida.safetyCar = 3 + Math.floor(rnd() * 3);
      registrar(corrida, 'SAFETY CAR na pista!', 'sc');
    }

    if (v >= corrida.totalVoltas) finalizar(corrida);
    return corrida;
  }

  function finalizar(corrida) {
    corrida.terminou = true;
    const chegaram = emPista(corrida);
    for (const c of chegaram) {
      if (corrida.regraCompostos && c.usados.length < 2) {
        c.penalidade = PENALIDADE_COMPOSTO;
        c.tempo += PENALIDADE_COMPOSTO;
        registrar(corrida, `${c.piloto.nome} punido em ${PENALIDADE_COMPOSTO}s (não usou dois compostos)`, 'alerta', c.id);
      }
    }
    chegaram.sort((a, b) => a.tempo - b.tempo).forEach((c, i) => { c.pos = i + 1; });
    const vencedor = chegaram[0];
    if (vencedor) registrar(corrida, `🏁 ${vencedor.piloto.nome} vence o ${corrida.pista.nome}!`, 'fim', vencedor.id);
  }

  function simularCompleta(corrida) {
    while (!corrida.terminou) passo(corrida);
    return corrida;
  }

  function resultado(corrida) {
    const ordem = corrida.carros.slice().sort((a, b) => a.pos - b.pos);
    const lider = ordem[0];
    return ordem.map((c) => ({
      id: c.id,
      pos: c.pos,
      equipe: c.equipe.id,
      pontos: !c.fora && c.pos <= PONTOS.length ? PONTOS[c.pos - 1] : 0,
      fora: c.fora,
      motivoFora: c.motivoFora,
      diferenca: c.fora ? null : c.tempo - lider.tempo,
      paradas: c.paradas,
      melhorVolta: c.melhorVolta,
    }));
  }

  const Engine = {
    PNEUS, ORDEM_PNEUS, MODOS, PONTOS,
    criarRng, forcaCarro, ritmoBase, vidaPneu, classificar,
    criarCorrida, passo, simularCompleta, resultado, escolherPneu, registrar,
  };
  if (typeof module === 'object' && module.exports) module.exports = Engine;
  else root.BoxEngine = Engine;
})(this);
