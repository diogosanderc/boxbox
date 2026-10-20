// Física "escondida" do kart: acerto ideal por pista e condição, efeito do desequilíbrio no ritmo,
// clima e o que o piloto e o mecânico dizem. O jogador nunca vê o acerto ideal nem o número de desequilíbrio.
(function (root) {
  'use strict';

  const AJUSTES = {
    pressao: { nome: 'Pressão dos pneus', tipo: 'numero', min: 9, max: 16, passo: 0.5, unidade: 'psi', padrao: 12 },
    eixo: { nome: 'Eixo traseiro', tipo: 'opcoes', opcoes: ['Mole', 'Médio', 'Duro'], padrao: 1 },
    bitola: { nome: 'Bitola dianteira', tipo: 'opcoes', opcoes: ['Estreita', 'Média', 'Larga'], padrao: 1 },
    coroa: { nome: 'Relação (coroa)', tipo: 'numero', min: 76, max: 90, passo: 1, unidade: 'dentes', padrao: 82 },
    carburacao: { nome: 'Carburação', tipo: 'numero', min: -3, max: 3, passo: 1, unidade: '', padrao: 0, rotulo: (v) => (v === 0 ? 'Padrão' : v < 0 ? `${-v} volta(s) mais pobre` : `${v} volta(s) mais rica`) },
  };
  const ORDEM_AJUSTES = ['pressao', 'eixo', 'bitola', 'coroa', 'carburacao'];

  // Quanto cada unidade de erro pesa e a "escala" de tolerância de cada ajuste.
  const TOLERANCIA = { pressao: 1.0, eixo: 0.7, bitola: 0.8, coroa: 3, carburacao: 1.2 };
  const PESO = { pressao: 0.25, eixo: 0.3, bitola: 0.2, coroa: 0.2, carburacao: 0.2 };

  const PNEUS_KART = {
    slick: { nome: 'Slick', preco: 1600 },
    chuva: { nome: 'Chuva', preco: 1400 },
  };

  const limitar = (x, min, max) => Math.max(min, Math.min(max, x));

  function setupPadrao() {
    return Object.fromEntries(ORDEM_AJUSTES.map((k) => [k, AJUSTES[k].padrao]));
  }

  // ---------- clima ----------
  // Gera a previsão e o que realmente vai acontecer. A previsão erra um pouco.
  function gerarClima(pista, campeonato, rnd) {
    const base = pista.clima + rnd.gauss() * 4;
    const chance = limitar(campeonato.chuva + rnd.gauss() * 0.2, 0.02, 0.85);
    const prevista = (c) => Math.round(limitar(c + rnd.gauss() * 0.12, 0, 0.95) * 20) * 5; // em %, de 5 em 5
    const manhaChove = rnd() < chance * 0.7;
    const tardeChove = rnd() < chance;
    const sessao = (tempAr, chove, chancePrev) => ({ tempAr: Math.round(tempAr), chance: chancePrev, chove });
    const clima = {
      manha: sessao(base - 4, manhaChove, prevista(chance * 0.7)),
      tarde: sessao(base + 2, tardeChove, prevista(chance)),
    };
    // Se chover à tarde, pode já estar chovendo na classificação ou começar no meio da corrida.
    clima.tarde.inicioChuva = tardeChove ? (rnd() < 0.5 ? 'quali' : 'corrida') : null;
    clima.tarde.voltaChuva = tardeChove && clima.tarde.inicioChuva === 'corrida' ? 3 + Math.floor(rnd() * 10) : null;
    return clima;
  }

  // Condição da pista numa sessão. borracha: 0 (pista "verde") a 1 (bem emborrachada).
  function condicao(clima, sessao, molhado) {
    const periodo = sessao === 'treino' ? clima.manha : clima.tarde;
    const sol = !molhado;
    return {
      tempAr: periodo.tempAr,
      tempPista: periodo.tempAr + (sol ? (sessao === 'treino' ? 6 : 14) : 2),
      molhado,
      borracha: molhado ? 0 : { treino: 0.3, quali: 0.6, corrida: 0.8 }[sessao],
    };
  }

  // ---------- acerto ideal (segredo do jogo) ----------
  function acertoIdeal(pista, cond, pneu) {
    const tipo = { travada: -1, mista: 0, veloz: 1 }[pista.tipo];
    const ideal = {};
    ideal.pressao = pneu === 'chuva' ? 14.5 : 12.5 - (cond.tempPista - 30) / 10;
    ideal.eixo = cond.molhado ? 0.2 : 1 + tipo * 0.4 + (cond.tempPista - 30) / 15 + cond.borracha * 0.4 - 0.2;
    ideal.bitola = 1 - tipo * 0.6 + (cond.molhado ? 0.6 : 0);
    ideal.coroa = 82 - tipo * 3 + pista.altitude / 400 + (cond.molhado ? 2 : 0);
    ideal.carburacao = (20 - cond.tempAr) / 7 - pista.altitude / 500;
    ideal.pressao = limitar(ideal.pressao, 9, 16);
    ideal.eixo = limitar(ideal.eixo, 0, 2);
    ideal.bitola = limitar(ideal.bitola, 0, 2);
    ideal.coroa = limitar(ideal.coroa, 76, 90);
    ideal.carburacao = limitar(ideal.carburacao, -3, 3);
    return ideal;
  }

  // Erros normalizados, com sinal (positivo = valor acima do ideal).
  function erros(setup, ideal) {
    return Object.fromEntries(ORDEM_AJUSTES.map((k) => [k, (setup[k] - ideal[k]) / TOLERANCIA[k]]));
  }

  function desequilibrio(e) {
    return ORDEM_AJUSTES.reduce((s, k) => s + PESO[k] * e[k] * e[k], 0);
  }

  // Efeito do acerto e do pneu numa volta: segundos a mais, irregularidade, risco de erro, desgaste e quebra.
  function efeito(setup, pista, cond, pneu) {
    const e = erros(setup, acertoIdeal(pista, cond, pneu));
    const d = desequilibrio(e);
    const r = {
      tempo: Math.min(3.5, 0.45 * Math.pow(d, 0.9)),
      sigma: 1 + 0.4 * Math.min(d, 3),
      erro: 1 + 0.6 * Math.min(d, 4),
      desgaste: 1 + 0.25 * Math.abs(e.pressao) + 0.2 * Math.abs(e.eixo),
      quebra: 0,
      motivoQuebra: 'Quebra',
    };
    if (e.carburacao < -1.5) {
      r.quebra = 0.004 * (-e.carburacao - 1.5 + 0.5);
      r.motivoQuebra = 'Motor travou (carburação pobre)';
    }
    if (cond.molhado && pneu === 'slick') {
      r.tempo += 5;
      r.erro *= 4;
    } else if (!cond.molhado && pneu === 'chuva') {
      r.tempo += 2;
      r.desgaste *= 2.5;
    }
    if (cond.molhado) r.tempo += 4; // pista molhada é mais lenta para todo mundo
    return r;
  }

  // ---------- o que o piloto e o mecânico dizem ----------
  const SINTOMAS = {
    pressao: ['O kart está pesado, os pneus demoram a pegar temperatura.', 'Os pneus superaquecem e o kart escorrega depois de algumas voltas.'],
    eixo: ['O kart está amarrado, pulando no meio das curvas.', 'A traseira está solta, o kart escapa na saída das curvas.'],
    bitola: ['O kart sai de frente, não quer virar na entrada.', 'A frente morde demais, o kart fica nervoso na entrada de curva.'],
    coroa: ['Falta força na saída das curvas, o kart demora a embalar.', 'O motor estoura o giro antes do fim da reta.'],
    carburacao: ['O motor está quente e gritando demais... dá medo de travar.', 'O motor está afogando, engasga nas retomadas.'],
  };
  const VAGOS = ['Não sei explicar, o kart não está legal.', 'Está faltando alguma coisa, mas não sei o quê.', 'Hoje o kart está estranho.'];

  // Frases do piloto depois de uma saída para a pista. Quanto maior a sensibilidade, mais certeiro.
  function feedbackPiloto(e, sensibilidade, rnd) {
    const ordenados = ORDEM_AJUSTES
      .map((k) => ({ k, peso: PESO[k] * e[k] * e[k], sinal: e[k] > 0 ? 1 : 0 }))
      .sort((a, b) => b.peso - a.peso);
    if (ordenados[0].peso < 0.06) return ['O kart está muito bom! Equilibrado, dá pra acelerar tudo.'];
    const frases = [];
    const acerto = 0.35 + sensibilidade / 150;
    for (const item of ordenados.slice(0, 2)) {
      if (item.peso < 0.06) break;
      const r = rnd();
      if (r < acerto) frases.push(SINTOMAS[item.k][item.sinal]);
      else if (r < acerto + (1 - acerto) * 0.6) frases.push(VAGOS[Math.floor(rnd() * VAGOS.length)]);
      else {
        // Pilotos inexperientes às vezes reclamam da coisa errada.
        const outro = ORDEM_AJUSTES[Math.floor(rnd() * ORDEM_AJUSTES.length)];
        frases.push(SINTOMAS[outro][rnd() < 0.5 ? 0 : 1]);
      }
    }
    return [...new Set(frases)];
  }

  function dicaMecanico(e, mecanico, rnd) {
    const pior = ORDEM_AJUSTES.map((k) => ({ k, peso: PESO[k] * e[k] * e[k] })).sort((a, b) => b.peso - a.peso)[0];
    if (pior.peso < 0.06) return 'Mecânico: não mexe em nada, está no ponto.';
    if (rnd() > mecanico / 110) return 'Mecânico: difícil dizer... vamos testar e ver o cronômetro.';
    const onde = { pressao: 'na pressão', eixo: 'no eixo', bitola: 'na bitola dianteira', coroa: 'na relação', carburacao: 'na carburação' };
    const verbo = e[pior.k] > 0
      ? { pressao: 'baixar', eixo: 'amolecer', bitola: 'fechar', coroa: 'tirar dentes da coroa', carburacao: 'empobrecer' }[pior.k]
      : { pressao: 'subir', eixo: 'endurecer', bitola: 'abrir', coroa: 'pôr mais dentes na coroa', carburacao: 'enriquecer' }[pior.k];
    const forte = Math.abs(e[pior.k]) > 1.5 ? ' bastante' : '';
    return `Mecânico: eu mexeria ${onde[pior.k]}. Tentaria ${verbo}${forte}.`;
  }

  function arredondarSetup(s) {
    const r = {};
    for (const k of ORDEM_AJUSTES) {
      const a = AJUSTES[k];
      if (a.tipo === 'opcoes') r[k] = limitar(Math.round(s[k]), 0, a.opcoes.length - 1);
      else r[k] = limitar(Math.round(s[k] / a.passo) * a.passo, a.min, a.max);
    }
    return r;
  }

  // Acerto sugerido pelo mecânico para uma condição: perto do ideal, com erro que depende da qualidade dele.
  function sugestaoMecanico(pista, cond, pneu, mecanico, rnd) {
    const ideal = acertoIdeal(pista, cond, pneu);
    const ruido = (100 - mecanico) / 40;
    const s = {};
    for (const k of ORDEM_AJUSTES) s[k] = ideal[k] + rnd.gauss() * ruido * TOLERANCIA[k];
    return arredondarSetup(s);
  }

  // Acerto que uma equipe da IA usa (mecânicos melhores chegam mais perto do ideal).
  function setupIA(pista, cond, pneu, mecanico, rnd) {
    return sugestaoMecanico(pista, cond, pneu, Math.min(98, mecanico + 10), rnd);
  }

  function descreverSetup(s) {
    return ORDEM_AJUSTES.map((k) => {
      const a = AJUSTES[k];
      if (a.tipo === 'opcoes') return a.opcoes[s[k]];
      if (a.rotulo) return `carb. ${s[k] > 0 ? '+' : ''}${s[k]}`;
      return `${s[k]}${a.unidade === 'psi' ? ' psi' : a.unidade === 'dentes' ? 'z' : ''}`;
    }).join(' · ');
  }

  const Kart = {
    AJUSTES, ORDEM_AJUSTES, PNEUS_KART,
    setupPadrao, gerarClima, condicao, acertoIdeal, erros, desequilibrio, efeito,
    feedbackPiloto, dicaMecanico, sugestaoMecanico, setupIA, arredondarSetup, descreverSetup,
  };
  if (typeof module === 'object' && module.exports) module.exports = Kart;
  else root.BoxKart = Kart;
})(this);
