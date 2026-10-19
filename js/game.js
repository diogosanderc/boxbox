// Lógica da carreira: academia, escada das categorias, dinheiro, patrocínios e Superlicença.
// O estado é só JSON (sem funções) para poder ser salvo no navegador.
(function (root) {
  'use strict';

  const Dados = typeof require === 'function' ? require('./data.js') : root.BoxDados;
  const Engine = typeof require === 'function' ? require('./engine.js') : root.BoxEngine;

  const ATRIBUTOS = ['ritmo', 'consistencia', 'pneus', 'largada', 'ultrapassagem', 'defesa'];
  const NOMES_ATRIBUTOS = { ritmo: 'Ritmo', consistencia: 'Consistência', pneus: 'Pneus', largada: 'Largada', ultrapassagem: 'Ultrapassagem', defesa: 'Defesa' };
  const PESOS_NOTA = { ritmo: 0.4, consistencia: 0.2, pneus: 0.1, largada: 0.1, ultrapassagem: 0.1, defesa: 0.1 };
  const ETAPAS = 8;
  const VAGAS_POR_EQUIPE = 2;
  const LIMITE_PILOTOS = 6;
  const COMISSAO_F1 = 0.15; // fatia do salário de F1 que fica com a academia
  const TAXA_LIBERACAO_F1 = 1.0; // a equipe de F1 paga à academia ao contratar
  const CUSTO_ESTRUTURA = 0.25; // custo fixo anual da academia
  const receitaEscola = (reputacao) => arred(0.3 + reputacao * 0.02); // escola de pilotagem e eventos, por ano
  const NIVEIS = {
    olheiros: { nome: 'Olheiros', custos: [0.4, 1.0, 2.0], descricao: 'Estimativa de potencial mais precisa e mais talentos no radar.' },
    treinamento: { nome: 'Centro de treinamento', custos: [0.5, 1.2, 2.5], descricao: 'Seus pilotos evoluem mais rápido.' },
  };
  const MANUTENCAO_NIVEL = 0.1; // por nível, por ano
  const DIFICULDADES = {
    facil: { nome: 'Investidor rico', dinheiro: 6 },
    normal: { nome: 'Normal', dinheiro: 3 },
    dificil: { nome: 'Fundo de quintal', dinheiro: 1.2 },
  };

  const arred = (x, casas = 2) => Math.round(x * 10 ** casas) / 10 ** casas;
  const limitar = (x, min, max) => Math.max(min, Math.min(max, x));
  const sortear = (rnd, lista) => lista[Math.floor(rnd() * lista.length)];

  const categoria = (id) => Dados.CATEGORIAS.find((c) => c.id === id);
  const proximaCategoria = (id) => (categoria(id) ? Dados.CATEGORIAS[categoria(id).ordem + 1] || null : null);
  const piloto = (estado, id) => estado.pilotos.find((p) => p.id === id);
  const equipe = (estado, id) => Object.values(estado.equipes).flat().find((e) => e.id === id);
  const meusPilotos = (estado) => estado.pilotos.filter((p) => p.academia && !p.aposentado);

  function nota(p) {
    return Math.round(ATRIBUTOS.reduce((s, a) => s + p[a] * PESOS_NOTA[a], 0));
  }

  // Cada chamada gera um RNG novo e determinístico a partir da semente do jogo.
  function rngDe(estado) {
    estado.contador += 1;
    return Engine.criarRng(estado.seed * 31 + estado.contador * 7919);
  }

  function superlicenca(p, ano) {
    return p.superlicenca.filter((s) => s.ano > ano - 3 && s.ano <= ano).reduce((t, s) => t + s.pontos, 0);
  }

  // ---------- geração ----------
  function gerarPiloto(estado, rnd, { idade, nivel, potencial, categoria: cat }) {
    const pais = sortear(rnd, Dados.PAISES);
    const nomes = Dados.NOMES[pais];
    const p = {
      id: `p${estado.proxId++}`,
      nome: `${sortear(rnd, nomes.p)} ${sortear(rnd, nomes.s)}`,
      pais, idade, categoria: cat, equipe: null, academia: false, aposentado: false,
      pot: {}, potencial: 0, estimativa: null,
      popularidade: Math.round(3 + rnd() * 8),
      dinheiroFamilia: rnd() < 0.12 ? arred(0.5 + rnd() * 2.5, 1) : rnd() < 0.45 ? arred(0.02 + rnd() * 0.25) : 0,
      pontos: 0, vitorias: 0, podios: 0,
      superlicenca: [], historico: [], patrocinio: null, f1: null,
      plano: null,
    };
    for (const a of ATRIBUTOS) p[a] = Math.round(limitar(nivel + rnd.gauss() * 4, 30, 97));
    p.potencial = Math.round(limitar(potencial != null ? potencial : nivel + 4 + Math.abs(rnd.gauss()) * 8, nivel, 99));
    for (const a of ATRIBUTOS) p.pot[a] = Math.round(limitar(p.potencial + rnd.gauss() * 4, p[a], 99));
    estado.pilotos.push(p);
    return p;
  }

  function estimarPotencial(estado, p, rnd) {
    const erro = 10 - 3 * estado.academia.olheiros;
    p.estimativa = Math.round(limitar(p.potencial + rnd.gauss() * erro, 40, 99));
  }

  function carroDoTier(rnd, tier) {
    const base = 88 - tier * 1.6;
    const parte = () => Math.round(base + rnd.gauss() * 1.5);
    return { motor: parte(), aero: parte(), chassi: parte(), confiabilidade: Math.round(limitar(88 - tier + rnd.gauss() * 3, 75, 97)) };
  }

  function novoJogo({ nomeAcademia = 'Academia Box Box', dificuldade = 'normal', seed = Date.now() % 1e9 } = {}) {
    const estado = {
      versao: 1, seed, contador: 0, proxId: 1, ano: 2027, etapa: 0, fase: 'pretemporada',
      academia: {
        nome: nomeAcademia, dificuldade, dinheiro: DIFICULDADES[dificuldade].dinheiro,
        reputacao: 10, olheiros: 0, treinamento: 0, titulos: 0, pilotosF1: 0,
      },
      pilotos: [], equipes: {}, prospectos: [], ofertas: {}, calendario: null,
      resultados: [], noticias: [], relatorio: null,
    };
    const rnd = rngDe(estado);
    for (const cat of Dados.CATEGORIAS) {
      estado.equipes[cat.id] = Dados.EQUIPES[cat.id].map((nome, i) => ({
        id: `${cat.id}-${i}`, nome, cor: Dados.CORES[i], categoria: cat.id, tier: i, carro: carroDoTier(rnd, i),
      }));
      const vagas = Dados.EQUIPES[cat.id].length * VAGAS_POR_EQUIPE;
      for (let i = 0; i < vagas + 2; i++) {
        const idade = cat.idadeMin + Math.floor(rnd() * (cat.idadeMax - cat.idadeMin - 1));
        gerarPiloto(estado, rnd, { idade, nivel: cat.nivel + rnd.gauss() * 4, categoria: cat.id });
      }
    }
    // Dois garotos de kart para começar a academia.
    for (const [idade, nivel, pot] of [[12, 55, 86], [13, 58, 78]]) {
      const p = gerarPiloto(estado, rnd, { idade, nivel, potencial: pot, categoria: 'kart' });
      p.academia = true;
      estimarPotencial(estado, p, rnd);
    }
    noticia(estado, `${nomeAcademia} abre as portas com dois garotos do kart. O sonho: a Fórmula 1.`);
    prepararPretemporada(estado);
    return estado;
  }

  function noticia(estado, texto) {
    estado.noticias.unshift({ ano: estado.ano, texto });
    estado.noticias = estado.noticias.slice(0, 60);
  }

  // ---------- pré-temporada ----------
  function prepararPretemporada(estado) {
    const rnd = rngDe(estado);
    estado.fase = 'pretemporada';
    estado.etapa = 0;
    for (const p of estado.pilotos) {
      if (p.categoria !== 'f1') p.equipe = null;
      p.plano = null;
    }
    // Novos garotos no kart: os que você não contratar entram no grid como rivais.
    const novos = [];
    const qtdKart = 5 + estado.academia.olheiros;
    for (let i = 0; i < qtdKart; i++) {
      const idade = 11 + Math.floor(rnd() * 4);
      const potencial = Math.round(limitar(62 + Math.abs(rnd.gauss()) * 13, 55, 98));
      novos.push(gerarPiloto(estado, rnd, { idade, nivel: 49 + (idade - 11) * 3 + rnd.gauss() * 3, potencial, categoria: 'kart' }));
    }
    // Pilotos sem academia em F4/F3 que estão disponíveis.
    const livres = estado.pilotos.filter((p) => !p.academia && !p.aposentado && ['f4', 'f3'].includes(p.categoria));
    const agentes = [];
    for (let i = 0; i < 3 && livres.length; i++) agentes.push(livres.splice(Math.floor(rnd() * livres.length), 1)[0]);

    estado.prospectos = [...novos, ...agentes].map((p) => {
      estimarPotencial(estado, p, rnd);
      const cat = categoria(p.categoria);
      const custo = arred(0.02 + Math.max(0, p.estimativa - 68) * 0.008 + cat.ordem * 0.1 + Math.max(0, nota(p) - cat.nivel) * 0.01);
      const reputacaoMin = Math.max(0, Math.round((p.estimativa - 80) * 1.5));
      return { id: p.id, custo, reputacaoMin };
    });
    gerarOfertas(estado, rnd);
  }

  function posicaoEsperada(p, cat) {
    return Math.round(limitar(10 - (nota(p) - cat.nivel) * 0.9, 1, 18));
  }

  function gerarOfertas(estado, rnd) {
    estado.ofertas = {};
    for (const p of meusPilotos(estado)) {
      if (p.categoria === 'f1') continue;
      const cat = categoria(p.categoria);
      const n = p.popularidade < 4 ? (rnd() < 0.6 ? 1 : 0) : Math.min(3, 1 + Math.floor(rnd() * 2.5));
      const esperado = posicaoEsperada(p, cat);
      estado.ofertas[p.id] = Array.from({ length: n }, () => {
        const valor = arred(cat.patrocinio * (0.6 + p.popularidade / 25) * (0.7 + rnd() * 0.6));
        let meta;
        if (esperado <= 3 && rnd() < 0.4) {
          meta = { tipo: 'vitorias', alvo: 1 + Math.floor(rnd() * 3) };
        } else {
          meta = { tipo: 'posicao', alvo: Math.round(limitar(esperado + Math.floor(rnd() * 5) - 2, 1, 18)) };
        }
        const dificuldade = meta.tipo === 'vitorias' ? meta.alvo : Math.max(0, esperado - meta.alvo);
        return { empresa: sortear(rnd, Dados.PATROCINADORES), valor, meta, bonus: arred(valor * (0.3 + dificuldade * 0.2)) };
      });
    }
  }

  function textoMeta(meta) {
    if (meta.tipo === 'vitorias') return `vencer ${meta.alvo} corrida${meta.alvo > 1 ? 's' : ''}`;
    return meta.alvo === 1 ? 'ser campeão' : `terminar o campeonato no top ${meta.alvo}`;
  }

  function contratar(estado, id) {
    const pr = estado.prospectos.find((x) => x.id === id);
    if (!pr) return { ok: false, erro: 'Piloto não está disponível.' };
    if (meusPilotos(estado).filter((p) => p.categoria !== 'f1').length >= LIMITE_PILOTOS) return { ok: false, erro: `Limite de ${LIMITE_PILOTOS} pilotos na academia.` };
    if (estado.academia.reputacao < pr.reputacaoMin) return { ok: false, erro: `Ele só assina com academias de reputação ${pr.reputacaoMin}+.` };
    if (estado.academia.dinheiro < pr.custo) return { ok: false, erro: 'Dinheiro insuficiente.' };
    const p = piloto(estado, id);
    estado.academia.dinheiro = arred(estado.academia.dinheiro - pr.custo);
    p.academia = true;
    estado.prospectos = estado.prospectos.filter((x) => x.id !== id);
    noticia(estado, `${p.nome} (${p.idade} anos) assina com a ${estado.academia.nome}.`);
    return { ok: true };
  }

  function dispensar(estado, id) {
    const p = piloto(estado, id);
    p.academia = false;
    p.patrocinio = null;
    p.plano = null;
    estado.academia.reputacao = Math.max(0, estado.academia.reputacao - 1);
    noticia(estado, `${p.nome} deixa a academia.`);
  }

  function melhorarAcademia(estado, tipo) {
    const nivel = estado.academia[tipo];
    const custo = NIVEIS[tipo].custos[nivel];
    if (custo == null) return { ok: false, erro: 'Nível máximo.' };
    if (estado.academia.dinheiro < custo) return { ok: false, erro: 'Dinheiro insuficiente.' };
    estado.academia.dinheiro = arred(estado.academia.dinheiro - custo);
    estado.academia[tipo] += 1;
    return { ok: true };
  }

  // Categorias em que o piloto pode correr no próximo ano: a atual (se a idade permitir) ou a seguinte.
  function categoriasPossiveis(p) {
    const atual = categoria(p.categoria);
    const prox = proximaCategoria(p.categoria);
    const lista = [];
    if (atual && p.idade <= atual.idadeMax) lista.push(atual);
    if (prox && p.idade >= prox.idadeMin) lista.push(prox);
    return lista;
  }

  function precoVaga(estado, eq, p) {
    const cat = categoria(eq.categoria);
    const tier = 1.4 - eq.tier * 0.08;
    const talento = limitar(1 - (nota(p) - cat.nivel) / 15, 0.25, 1.3);
    return arred(cat.custoVaga * tier * talento);
  }

  const custoParaAcademia = (estado, eq, p) => arred(Math.max(0, precoVaga(estado, eq, p) - p.dinheiroFamilia));

  function vagasOcupadasPeloJogador(estado, equipeId, excetoId) {
    return meusPilotos(estado).filter((p) => p.id !== excetoId && p.plano && p.plano.equipe === equipeId).length;
  }

  function planejar(estado, pilotoId, equipeId, ofertaIdx) {
    const p = piloto(estado, pilotoId);
    if (!equipeId) { p.plano = null; return { ok: true }; }
    const eq = equipe(estado, equipeId);
    if (!categoriasPossiveis(p).some((c) => c.id === eq.categoria)) return { ok: false, erro: 'Categoria não permitida para este piloto.' };
    if (vagasOcupadasPeloJogador(estado, equipeId, pilotoId) >= VAGAS_POR_EQUIPE) return { ok: false, erro: 'Equipe sem vaga.' };
    p.plano = { equipe: equipeId, oferta: ofertaIdx != null ? ofertaIdx : (p.plano ? p.plano.oferta : null) };
    return { ok: true };
  }

  function escolherOferta(estado, pilotoId, idx) {
    const p = piloto(estado, pilotoId);
    if (!p.plano) p.plano = { equipe: null, oferta: null };
    p.plano.oferta = p.plano.oferta === idx ? null : idx;
  }

  // As vagas precisam caber no caixa; o custo fixo da estrutura pode deixá-lo negativo
  // (se o ano terminar no vermelho, é falência).
  function resumoPretemporada(estado) {
    const estrutura = CUSTO_ESTRUTURA + (estado.academia.olheiros + estado.academia.treinamento) * MANUTENCAO_NIVEL;
    let vagas = 0;
    let receitas = 0;
    for (const p of meusPilotos(estado)) {
      if (!p.plano || !p.plano.equipe) continue;
      vagas += custoParaAcademia(estado, equipe(estado, p.plano.equipe), p);
      const of = p.plano.oferta != null && (estado.ofertas[p.id] || [])[p.plano.oferta];
      if (of) receitas += of.valor;
    }
    const disponivel = estado.academia.dinheiro + receitas - vagas;
    return {
      estrutura: arred(estrutura), vagas: arred(vagas), receitas: arred(receitas),
      cabe: disponivel >= 0, saldo: arred(disponivel - estrutura),
    };
  }

  function iniciarTemporada(estado) {
    const resumo = resumoPretemporada(estado);
    if (!resumo.cabe) return { ok: false, erro: 'Dinheiro insuficiente para pagar as vagas.' };
    const rnd = rngDe(estado);
    estado.academia.dinheiro = resumo.saldo;

    for (const p of estado.pilotos) { p.pontos = 0; p.vitorias = 0; p.podios = 0; }

    for (const p of meusPilotos(estado)) {
      if (p.categoria === 'f1') continue;
      if (p.plano && p.plano.equipe) {
        const eq = equipe(estado, p.plano.equipe);
        p.categoria = eq.categoria;
        p.equipe = eq.id;
        const of = p.plano.oferta != null ? (estado.ofertas[p.id] || [])[p.plano.oferta] : null;
        p.patrocinio = of ? { ...of, categoria: eq.categoria } : null;
      } else {
        p.equipe = null;
        p.patrocinio = null;
        noticia(estado, `${p.nome} fica sem vaga em ${estado.ano}.`);
      }
      p.plano = null;
    }

    // A IA preenche as vagas restantes: os melhores pilotos vão para as melhores equipes.
    for (const cat of Dados.CATEGORIAS) {
      const vagas = [];
      for (const eq of estado.equipes[cat.id]) {
        const ocupadas = estado.pilotos.filter((p) => p.equipe === eq.id).length;
        for (let i = ocupadas; i < VAGAS_POR_EQUIPE; i++) vagas.push(eq);
      }
      const ia = estado.pilotos
        .filter((p) => !p.academia && !p.aposentado && p.categoria === cat.id && p.idade <= cat.idadeMax)
        .sort((a, b) => nota(b) - nota(a));
      for (const eq of vagas) {
        const p = ia.shift() || gerarPiloto(estado, rnd, {
          idade: cat.idadeMin + Math.floor(rnd() * 3), nivel: cat.nivel + rnd.gauss() * 4, categoria: cat.id,
        });
        p.equipe = eq.id;
      }
    }

    estado.calendario = {
      pistas: embaralhar(rnd, Dados.PISTAS.map((p) => p.id)).slice(0, ETAPAS),
      kart: embaralhar(rnd, Dados.KARTODROMOS.map((p) => p.id)).slice(0, ETAPAS),
    };
    estado.fase = 'temporada';
    estado.etapa = 0;
    estado.resultados = [];
    return { ok: true };
  }

  function embaralhar(rnd, lista) {
    const l = lista.slice();
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    return l;
  }

  // ---------- temporada ----------
  function pistaDaEtapa(estado, catId) {
    const cat = categoria(catId);
    if (catId === 'kart') {
      const k = Dados.KARTODROMOS.find((x) => x.id === estado.calendario.kart[estado.etapa]);
      return { ...k, nome: `Kart · ${k.nome}` };
    }
    const base = Dados.PISTAS.find((x) => x.id === estado.calendario.pistas[estado.etapa]);
    return {
      ...base,
      nome: `${cat.nome} · ${base.nome}`,
      voltas: Math.max(10, Math.round(base.voltas * cat.voltas)),
      tempoBase: arred(base.tempoBase * cat.tempo, 1),
    };
  }

  function entradas(estado, catId) {
    return estado.pilotos
      .filter((p) => p.categoria === catId && p.equipe && !p.aposentado)
      .map((p) => {
        const eq = equipe(estado, p.equipe);
        return { id: p.id, piloto: p, carro: eq.carro, equipe: { id: eq.id, nome: eq.nome, cor: eq.cor }, jogador: p.academia };
      });
  }

  // Monta a classificação e a corrida de uma categoria nesta etapa (determinístico pela semente).
  function prepararCorrida(estado, catId, pneusIniciais) {
    const cat = categoria(catId);
    const pista = pistaDaEtapa(estado, catId);
    const seed = estado.seed + estado.ano * 10007 + estado.etapa * 101 + cat.ordem * 13;
    const quali = Engine.classificar(pista, entradas(estado, catId), seed);
    const corrida = Engine.criarCorrida(pista, quali.map((q) => q.entrada), seed + 1, {
      pneusIniciais, regraCompostos: cat.regraCompostos, pneuPadrao: cat.pneuPadrao,
    });
    return { quali, corrida };
  }

  const categoriasComPilotos = (estado) => Dados.CATEGORIAS.filter((c) => meusPilotos(estado).some((p) => p.categoria === c.id && p.equipe));

  // Aplica os resultados de todas as categorias da etapa. corridas: { catId: corridaTerminada }
  function concluirEtapa(estado, corridas = {}) {
    const resumo = { etapa: estado.etapa + 1, categorias: {} };
    for (const cat of Dados.CATEGORIAS) {
      const corrida = corridas[cat.id] && corridas[cat.id].terminou
        ? corridas[cat.id]
        : Engine.simularCompleta(prepararCorrida(estado, cat.id).corrida);
      const res = Engine.resultado(corrida);
      const peso = 1 + cat.ordem * 0.5;
      for (const r of res) {
        const p = piloto(estado, r.id);
        p.pontos += r.pontos;
        if (!r.fora && r.pos === 1) { p.vitorias += 1; p.popularidade += 3 * peso; }
        if (!r.fora && r.pos <= 3) { p.podios += 1; p.popularidade += 1.5 * peso; }
        if (r.pontos > 0) p.popularidade += 0.3 * peso;
        if (p.academia && !r.fora && r.pos <= 3) estado.academia.reputacao += r.pos === 1 ? 0.5 : 0.2;
      }
      resumo.categorias[cat.id] = {
        pista: corrida.pista.nome,
        podio: res.filter((r) => !r.fora).slice(0, 3).map((r) => r.id),
        meus: res.filter((r) => piloto(estado, r.id).academia).map((r) => ({ id: r.id, pos: r.pos, fora: r.fora, pontos: r.pontos })),
      };
    }
    estado.resultados.push(resumo);
    estado.etapa += 1;
    if (estado.etapa >= ETAPAS) fimDeTemporada(estado);
    return resumo;
  }

  function classificacaoCategoria(estado, catId) {
    return estado.pilotos
      .filter((p) => p.categoria === catId && p.equipe && !p.aposentado)
      .sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.podios - a.podios);
  }

  // ---------- fim de temporada ----------
  function evoluir(p, rnd, treino) {
    const taxa = p.idade <= 14 ? 0.3 : p.idade <= 17 ? 0.25 : p.idade <= 20 ? 0.18 : p.idade <= 23 ? 0.1 : p.idade <= 27 ? 0.04 : 0;
    const correu = p.equipe || p.categoria === 'f1' ? 1 : 0.4;
    for (const a of ATRIBUTOS) {
      const falta = p.pot[a] - p[a];
      if (falta > 0) {
        const ganho = falta * taxa * correu * (0.6 + rnd() * 0.8) * (1 + treino * 0.2);
        p[a] = Math.min(p.pot[a], p[a] + Math.floor(ganho) + (rnd() < ganho % 1 ? 1 : 0));
      }
      if (p.idade >= 31 && rnd() < 0.5) p[a] = Math.max(40, p[a] - 1);
    }
  }

  function fimDeTemporada(estado) {
    const rnd = rngDe(estado);
    const ac = estado.academia;
    const ano = estado.ano;
    const rel = { ano, campeoes: {}, meus: [], f1: [], bonus: [], premios: [], receitaF1: 0, escola: receitaEscola(ac.reputacao), reputacaoAntes: ac.reputacao, dinheiroAntes: ac.dinheiro };

    // Campeonatos e pontos de Superlicença
    for (const cat of Dados.CATEGORIAS) {
      const tabela = classificacaoCategoria(estado, cat.id);
      const peso = 1 + cat.ordem * 0.5;
      tabela.forEach((p, i) => {
        const pts = cat.superlicenca[i] || 0;
        if (pts) p.superlicenca.push({ ano, pontos: pts, categoria: cat.id });
        const eq = equipe(estado, p.equipe);
        p.historico.push({ ano, categoria: cat.id, equipe: eq.nome, pos: i + 1, pontos: p.pontos, vitorias: p.vitorias });
        if (p.academia) rel.meus.push({ id: p.id, categoria: cat.id, pos: i + 1, superlicenca: pts });
      });
      tabela.slice(0, 3).forEach((p, i) => {
        if (!p.academia) return;
        const premio = arred(cat.premio / 2 ** i);
        ac.dinheiro = arred(ac.dinheiro + premio);
        rel.premios.push({ id: p.id, categoria: cat.id, pos: i + 1, valor: premio });
      });
      const campeao = tabela[0];
      if (campeao) {
        rel.campeoes[cat.id] = campeao.id;
        campeao.popularidade += 8 * peso;
        if (campeao.academia) {
          ac.titulos += 1;
          ac.reputacao += 5 + cat.ordem * 3;
          noticia(estado, `🏆 ${campeao.nome} é campeão de ${cat.nome} ${ano} pela ${ac.nome}!`);
        }
      }
    }

    ac.dinheiro = arred(ac.dinheiro + rel.escola);

    // Metas de patrocínio
    for (const p of meusPilotos(estado)) {
      if (!p.patrocinio) continue;
      const pos = classificacaoCategoria(estado, p.categoria).indexOf(p) + 1;
      const meta = p.patrocinio.meta;
      const cumpriu = meta.tipo === 'vitorias' ? p.vitorias >= meta.alvo : pos > 0 && pos <= meta.alvo;
      if (cumpriu) ac.dinheiro = arred(ac.dinheiro + p.patrocinio.bonus);
      rel.bonus.push({ id: p.id, empresa: p.patrocinio.empresa, meta: textoMeta(meta), cumpriu, bonus: p.patrocinio.bonus });
      p.patrocinio = null;
    }

    // Pilotos que já estão na F1: comissão, risco de perder a vaga, aposentadoria
    for (const p of estado.pilotos.filter((x) => x.categoria === 'f1' && !x.aposentado)) {
      if (p.academia) {
        const comissao = arred(p.f1.salario * COMISSAO_F1);
        ac.dinheiro = arred(ac.dinheiro + comissao);
        rel.receitaF1 = arred(rel.receitaF1 + comissao);
        p.f1.temporadas += 1;
      }
      if (p.idade >= 37 || (nota(p) < 82 && rnd() < 0.3)) {
        p.aposentado = true;
        if (p.academia) noticia(estado, `${p.nome} perde a vaga na ${p.f1.equipe} e deixa a F1 após ${p.f1.temporadas} temporada(s).`);
      }
    }

    // Vagas na F1: os melhores candidatos com Superlicença são contratados
    const vagas = 2 + Math.floor(rnd() * 3);
    const candidatos = estado.pilotos
      .filter((p) => !p.aposentado && ['f2', 'f3'].includes(p.categoria) && p.equipe
        && p.idade + 1 >= Dados.IDADE_MIN_F1 && superlicenca(p, ano) >= Dados.PONTOS_SUPERLICENCA)
      .map((p) => ({ p, score: nota(p) + p.popularidade * 0.03 + (p.categoria === 'f2' ? 2 : 0) + rnd.gauss() * 1.5 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, vagas);
    for (const { p } of candidatos) {
      const salario = arred(limitar(0.5 + (nota(p) - 78) * 0.6, 0.5, 10), 1);
      p.categoria = 'f1';
      p.equipe = null;
      p.f1 = { equipe: sortear(rnd, Dados.EQUIPES_F1), salario, estreia: ano + 1, temporadas: 0 };
      rel.f1.push(p.id);
      if (p.academia) {
        ac.pilotosF1 += 1;
        ac.reputacao += 15;
        ac.dinheiro = arred(ac.dinheiro + TAXA_LIBERACAO_F1);
        noticia(estado, `🏁 ${p.nome} vai para a FÓRMULA 1! Contrato com a ${p.f1.equipe} (€${salario}M/ano).`);
      } else {
        noticia(estado, `${p.nome} é anunciado pela ${p.f1.equipe} para a F1 ${ano + 1}.`);
      }
    }

    // Evolução, idade e popularidade
    for (const p of estado.pilotos.filter((x) => !x.aposentado)) {
      evoluir(p, rnd, p.academia ? ac.treinamento : 0.5);
      p.idade += 1;
      p.popularidade = Math.round(p.popularidade * 0.85 * 10) / 10;
      if (p.academia && p.estimativa != null) p.estimativa = Math.round((p.estimativa + p.potencial) / 2);
    }

    // Seus pilotos que passaram da idade da F2 sem chegar à F1 desistem
    for (const p of meusPilotos(estado)) {
      const cat = categoria(p.categoria);
      if (cat && cat.id === 'f2' && p.idade > cat.idadeMax) {
        p.aposentado = true;
        noticia(estado, `${p.nome} chega aos ${p.idade} anos sem vaga na F1 e encerra a carreira nos monopostos.`);
      }
    }

    // A IA sobe de categoria ou se aposenta
    const tabelas = Object.fromEntries(Dados.CATEGORIAS.map((c) => [c.id, classificacaoCategoria(estado, c.id)]));
    for (const p of estado.pilotos.filter((x) => !x.academia && !x.aposentado && x.categoria !== 'f1')) {
      const cat = categoria(p.categoria);
      const prox = proximaCategoria(p.categoria);
      const pos = tabelas[cat.id].indexOf(p) + 1;
      const podeSubir = prox && p.idade >= prox.idadeMin;
      if (p.idade > cat.idadeMax) {
        if (podeSubir && nota(p) >= prox.nivel - 5) p.categoria = prox.id;
        else p.aposentado = true;
      } else if (podeSubir && ((pos > 0 && pos <= 5 && rnd() < 0.7) || (nota(p) >= prox.nivel && rnd() < 0.5))) {
        p.categoria = prox.id;
      } else if (!p.equipe && rnd() < 0.4) {
        p.aposentado = true;
      }
    }
    // Remove aposentados que nunca passaram pela academia (mantém o estado pequeno)
    estado.pilotos = estado.pilotos.filter((p) => !p.aposentado || p.academia);

    // Pequenas mudanças de força nas equipes
    for (const eq of Object.values(estado.equipes).flat()) {
      for (const parte of ['motor', 'aero', 'chassi']) eq.carro[parte] = Math.round(limitar(eq.carro[parte] + rnd.gauss() * 1.2, 70, 97));
    }

    ac.reputacao = Math.round(ac.reputacao);
    rel.reputacaoDepois = ac.reputacao;
    rel.dinheiroDepois = ac.dinheiro;
    estado.relatorio = rel;
    estado.ano += 1;
    if (ac.dinheiro < 0) {
      estado.fase = 'falencia';
      return;
    }
    prepararPretemporada(estado);
    estado.fase = 'relatorio';
  }

  const Jogo = {
    ATRIBUTOS, NOMES_ATRIBUTOS, receitaEscola, ETAPAS, LIMITE_PILOTOS, COMISSAO_F1, NIVEIS, DIFICULDADES, CUSTO_ESTRUTURA, MANUTENCAO_NIVEL,
    categoria, proximaCategoria, piloto, equipe, meusPilotos, nota, superlicenca, textoMeta, posicaoEsperada,
    novoJogo, contratar, dispensar, melhorarAcademia, categoriasPossiveis, precoVaga, custoParaAcademia,
    planejar, escolherOferta, resumoPretemporada, iniciarTemporada,
    pistaDaEtapa, prepararCorrida, categoriasComPilotos, concluirEtapa, classificacaoCategoria,
  };
  if (typeof module === 'object' && module.exports) module.exports = Jogo;
  else root.BoxJogo = Jogo;
})(this);
