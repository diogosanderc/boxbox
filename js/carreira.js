// Carreira do piloto: equipe, dinheiro, fim de semana (treino, classificação, corrida),
// campeonato, patrocínios, olheiros e propostas. O estado é só JSON para poder ser salvo.
(function (root) {
  'use strict';

  const Dados = typeof require === 'function' ? require('./data.js') : root.BoxDados;
  const Engine = typeof require === 'function' ? require('./engine.js') : root.BoxEngine;
  const Kart = typeof require === 'function' ? require('./kart.js') : root.BoxKart;

  const ATRIBUTOS = ['ritmo', 'consistencia', 'chuva', 'largada', 'ultrapassagem', 'defesa', 'pneus'];
  const NOMES_ATRIBUTOS = {
    ritmo: 'Ritmo', consistencia: 'Consistência', chuva: 'Chuva', largada: 'Largada',
    ultrapassagem: 'Ultrapassagem', defesa: 'Defesa', pneus: 'Cuidado com pneus',
  };
  const ETAPAS = 8;
  const SAIDAS_TREINO = 4;
  const VOLTAS_POR_SAIDA = 6;
  const HORAS_REVISAO = 3; // depois disso o motor perde força
  const CUSTO_REVISAO = 2500;
  const PREMIO_ETAPA = [1500, 800, 400]; // por pódio, multiplicado pelo custo do campeonato
  const MAX_PATROCINIOS = 3;
  const APOIO_FAMILIA = 25000; // por temporada, multiplicado pelo custo do campeonato

  const limitar = (x, min, max) => Math.max(min, Math.min(max, x));
  const sortear = (rnd, lista) => lista[Math.floor(rnd() * lista.length)];
  const campeonato = (id) => Dados.CAMPEONATOS.find((c) => c.id === id);
  const equipeBase = (id) => Dados.EQUIPES.find((e) => e.id === id);

  function rngDe(estado) {
    estado.contador += 1;
    return Engine.criarRng(estado.seed * 31 + estado.contador * 7919);
  }

  function nota(p) {
    return Math.round(p.ritmo * 0.4 + p.consistencia * 0.2 + (p.largada + p.ultrapassagem + p.defesa + p.chuva) * 0.1);
  }

  function noticia(estado, texto) {
    estado.noticias.unshift({ ano: estado.ano, etapa: estado.etapa + 1, texto });
    estado.noticias = estado.noticias.slice(0, 80);
  }

  // ---------- criação ----------
  // No começo, só três equipes abrem as portas para um garoto de 12 anos: uma de cada porte.
  const PORTES = {
    ponta: { nome: 'Equipe de ponta', equipes: ['fulmine', 'orbital', 'velox', 'rapido'] },
    media: { nome: 'Intermediária', equipes: ['tempesta', 'faisca', 'piccolo', 'ninja'] },
    pequena: { nome: 'Equipe pequena', equipes: ['formiga', 'garagem'] },
  };
  const porteDe = (id) => Object.keys(PORTES).find((k) => PORTES[k].equipes.includes(id));

  function equipesIniciais(seed) {
    const rnd = Engine.criarRng(seed * 13 + 7);
    return Object.values(PORTES).map((p) => sortear(rnd, p.equipes));
  }
  function gerarRival(estado, rnd, nivel, regiao) {
    const pais = sortear(rnd, Dados.PAISES[regiao]);
    const n = Dados.NOMES[pais];
    const p = { id: `r${estado.proxId++}`, nome: `${sortear(rnd, n.p)} ${sortear(rnd, n.s)}`, pais, idade: 11 + Math.floor(rnd() * 5) };
    for (const a of ATRIBUTOS) p[a] = Math.round(limitar(nivel + rnd.gauss() * 5, 35, 95));
    return p;
  }

  // Monta o grid do campeonato: 19 rivais em 10 equipes (2 vagas cada); você ocupa uma vaga na sua equipe.
  function montarGrid(estado) {
    const rnd = rngDe(estado);
    const camp = campeonato(estado.campeonato);
    const rivais = Array.from({ length: 19 }, () => gerarRival(estado, rnd, camp.nivel, camp.regiao))
      .sort((a, b) => nota(b) - nota(a));
    const vagas = [];
    for (const e of Dados.EQUIPES) {
      vagas.push(e.id);
      if (e.id !== estado.equipeId) vagas.push(e.id);
    }
    // Melhores pilotos tendem a ir para as melhores equipes (com alguma bagunça).
    vagas.sort((a, b) => Dados.EQUIPES.findIndex((e) => e.id === a) - Dados.EQUIPES.findIndex((e) => e.id === b) + rnd.gauss() * 3);
    rivais.forEach((r, i) => { r.equipe = vagas[i]; });
    estado.rivais = rivais;
    estado.pontos = { jogador: 0, ...Object.fromEntries(rivais.map((r) => [r.id, 0])) };
    estado.seguindo = null; // rivais novos a cada temporada
    estado.vitorias = {};
    estado.podios = {};
  }

  function novoJogo({ nome = 'Você', equipeId = 'faisca', seed = Date.now() % 1e9 } = {}) {
    const estado = {
      versao: 2, seed, contador: 0, proxId: 1, ano: 2027, idadeInicial: 12,
      campeonato: 'regional', etapa: 0, fase: 'paddock',
      equipeId, contrato: null, dinheiro: equipeBase(equipeId).caixa,
      piloto: null, rivais: [], pontos: {}, vitorias: {}, podios: {},
      pneus: [], proxPneu: 1, motorHoras: 0,
      patrocinios: [], ofertasPatrocinio: [], propostas: [], interesse: {},
      calendario: [], fds: null, ultimoFds: null, caderno: {}, noticias: [], historico: [], relatorio: null,
      evolucao: [], temporadas: [], seguindo: null,
    };
    const rnd = rngDe(estado);
    const p = { id: 'jogador', nome, pais: 'BRA', idade: 12, popularidade: 5, moral: 60, confianca: 50 };
    for (const a of ATRIBUTOS) p[a] = Math.round(limitar(55 + rnd.gauss() * 4, 45, 65));
    // Ocultos: potencial (até onde pode chegar) e sensibilidade (quão bem sente o kart).
    p.potencial = Math.round(limitar(86 + rnd.gauss() * 4, 78, 96));
    p.sensibilidade = Math.round(limitar(55 + rnd.gauss() * 12, 30, 85));
    estado.piloto = p;
    comprarPneu(estado, 'slick', true);
    comprarPneu(estado, 'slick', true);
    comprarPneu(estado, 'chuva', true);
    iniciarTemporada(estado);
    noticia(estado, `${nome}, 12 anos, estreia no kart pela ${equipeBase(equipeId).nome}.`);
    return estado;
  }

  function iniciarTemporada(estado) {
    const rnd = rngDe(estado);
    const camp = campeonato(estado.campeonato);
    const pistas = Dados.KARTODROMOS[camp.regiao].slice();
    for (let i = pistas.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pistas[i], pistas[j]] = [pistas[j], pistas[i]];
    }
    estado.calendario = pistas.slice(0, ETAPAS).map((p) => ({ pista: p.id, clima: Kart.gerarClima(p, camp, rnd) }));
    estado.etapa = 0;
    estado.fase = 'paddock';
    estado.fds = null;
    if (estado.ano > 2027 || estado.etapa > 0) {
      const apoio = Math.round(APOIO_FAMILIA * camp.custo);
      estado.dinheiro += apoio;
      noticia(estado, `A família junta R$ ${apoio.toLocaleString('pt-BR')} para a temporada.`);
    }
    montarGrid(estado);
    gerarOfertasPatrocinio(estado, rnd, 2);
    gerarOlheiros(estado, rnd);
  }

  // ---------- cabeça do piloto ----------
  // Confiança (dentro da pista): mexe no ritmo, na regularidade e no risco de erro.
  // Moral (fora da pista): mexe na evolução e em quão bem o piloto descreve o que sente no kart.
  const PRECO_PSICOLOGO = 1500;

  function mexerCabeca(estado, { moral = 0, confianca = 0 }, motivo) {
    const p = estado.piloto;
    p.moral = Math.round(limitar(p.moral + moral, 0, 100));
    p.confianca = Math.round(limitar(p.confianca + confianca, 0, 100));
    if (motivo && estado.fds && estado.fds.cabeca) estado.fds.cabeca.push({ motivo, moral, confianca });
  }

  function efeitoCabeca(p) {
    const c = (p.confianca - 50) / 50; // -1 (arrasado) a 1 (voando)
    return { tempo: -c * 0.25, sigma: 1 - c * 0.2, erro: Math.max(0.5, 1 - c * 0.5) };
  }

  const fatorMoral = (p) => 0.6 + p.moral / 125;

  function humor(p) {
    const frase = p.confianca >= 70 ? 'Confiante, acha que pode ganhar de qualquer um.'
      : p.confianca >= 45 ? 'Tranquilo com o kart e com o próprio ritmo.'
        : p.confianca >= 30 ? 'Inseguro, freando mais cedo do que devia.'
          : 'Sem confiança nenhuma, com medo de errar.';
    const extra = p.moral < 25 ? ' Anda desmotivado e já falou em largar o kart.' : p.moral >= 80 ? ' Super motivado.' : '';
    return frase + extra;
  }

  // Uma conversa com o psicólogo esportivo entre as etapas (uma vez por etapa).
  function sessaoPsicologo(estado) {
    const chave = `${estado.ano}-${estado.campeonato}-${estado.etapa}`;
    if (estado.psicologo === chave) return { ok: false, erro: 'Já teve sessão com o psicólogo antes desta etapa.' };
    const preco = Math.round(PRECO_PSICOLOGO * campeonato(estado.campeonato).custo);
    if (estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente para o psicólogo.' };
    estado.dinheiro -= preco;
    estado.psicologo = chave;
    const p = estado.piloto;
    // Ajuda mais quem está mal.
    mexerCabeca(estado, { moral: Math.round(4 + (60 - p.moral) * 0.15), confianca: Math.round(3 + (50 - p.confianca) * 0.15) });
    return { ok: true };
  }

  const precoPsicologo = (estado) => Math.round(PRECO_PSICOLOGO * campeonato(estado.campeonato).custo);

  // Saves antigos não tinham moral e confiança.
  function migrar(estado) {
    if (estado && estado.piloto && estado.piloto.moral == null) {
      estado.piloto.moral = 60;
      estado.piloto.confianca = 50;
    }
    if (estado && !estado.evolucao) { estado.evolucao = []; estado.temporadas = []; estado.seguindo = null; }
    return estado;
  }

  // Seguir um rival: ele aparece no paddock e nos avisos da corrida. Tocar de novo deixa de seguir.
  function seguir(estado, id) {
    estado.seguindo = estado.seguindo === id ? null : id;
  }

  // ---------- equipe, kart e dinheiro ----------
  function custoEtapa(estado) {
    if (estado.contrato && estado.contrato.equipe === estado.equipeId) return estado.contrato.custoEtapa;
    return Math.round(equipeBase(estado.equipeId).custoEtapa * campeonato(estado.campeonato).custo);
  }

  function carroDe(estado, equipeId, jogador) {
    const e = equipeBase(equipeId);
    const cansaco = jogador ? Math.max(0, estado.motorHoras - HORAS_REVISAO) * 1.5 : 0;
    return {
      motor: Math.round(e.material - cansaco), aero: e.material, chassi: e.material,
      confiabilidade: Math.round(82 + e.organizacao / 7 - cansaco),
    };
  }

  function comprarPneu(estado, tipo, gratis = false) {
    const preco = Math.round(Kart.PNEUS_KART[tipo].preco * campeonato(estado.campeonato).custo);
    if (!gratis && estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente para os pneus.' };
    if (!gratis) estado.dinheiro -= preco;
    // Jogo novo entra junto com os do mesmo tipo (slicks com slicks, chuva com chuva).
    const novo = { id: `pn${estado.proxPneu++}`, tipo, uso: 0 };
    const ultimo = estado.pneus.map((p) => p.tipo).lastIndexOf(tipo);
    if (ultimo >= 0) estado.pneus.splice(ultimo + 1, 0, novo);
    else estado.pneus.splice(tipo === 'slick' ? 0 : estado.pneus.length, 0, novo);
    return { ok: true };
  }

  function descartarPneu(estado, id) {
    estado.pneus = estado.pneus.filter((p) => p.id !== id);
  }

  function revisarMotor(estado) {
    const custo = Math.round(CUSTO_REVISAO * campeonato(estado.campeonato).custo);
    if (estado.dinheiro < custo) return { ok: false, erro: 'Dinheiro insuficiente para a revisão.' };
    estado.dinheiro -= custo;
    estado.motorHoras = 0;
    return { ok: true };
  }

  // O kart não vem com mecânico: o jogador acerta sozinho. O mecânico da equipe pode ser contratado
  // por etapa, só durante o treino livre; quanto melhor ele é, mais caro.
  function precoMecanico(estado) {
    const mec = equipeBase(estado.equipeId).mecanico;
    return Math.round((3000 + mec * 70) * campeonato(estado.campeonato).custo / 100) * 100;
  }

  function contratarMecanico(estado) {
    const fds = estado.fds;
    if (!fds || fds.sessao !== 'treino' || fds.saidas.length >= SAIDAS_TREINO) return { ok: false, erro: 'Só dá para contratar o mecânico durante o treino livre.' };
    if (fds.mecanico) return { ok: false, erro: 'O mecânico já está com você nesta etapa.' };
    const preco = precoMecanico(estado);
    if (estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente para contratar o mecânico.' };
    estado.dinheiro -= preco;
    fds.mecanico = true;
    return { ok: true, preco };
  }

  // O que falta antes de ir para a pista: slick novo, pneu de chuva (se a previsão pede) e revisão do motor.
  function pendenciasEtapa(estado) {
    const lista = [];
    if (!estado.pneus.some((p) => p.tipo === 'slick' && p.uso < 5)) {
      lista.push({ id: 'slick', texto: 'Nenhum slick novo para a classificação e a corrida.' });
    }
    const clima = estado.calendario[estado.etapa] && estado.calendario[estado.etapa].clima;
    if (clima && clima.tarde.chance >= 40 && !estado.pneus.some((p) => p.tipo === 'chuva' && p.uso < 15)) {
      lista.push({ id: 'chuva', texto: `Previsão de ${clima.tarde.chance}% de chuva à tarde e nenhum pneu de chuva em bom estado.` });
    }
    if (estado.motorHoras >= HORAS_REVISAO) {
      lista.push({ id: 'motor', texto: estado.motorHoras > HORAS_REVISAO ? 'Motor cansado, perdendo força.' : 'Motor na hora da revisão.' });
    }
    return lista;
  }

  const precoPneu = (estado, tipo) => Math.round(Kart.PNEUS_KART[tipo].preco * campeonato(estado.campeonato).custo);
  const precoRevisao = (estado) => Math.round(CUSTO_REVISAO * campeonato(estado.campeonato).custo);

  // ---------- patrocínio ----------
  function gerarOfertasPatrocinio(estado, rnd, quantidade) {
    const pop = estado.piloto.popularidade;
    const porte = pop < 15 ? 0 : pop < 40 ? 1 : 2;
    const camp = campeonato(estado.campeonato);
    for (let i = 0; i < quantidade; i++) {
      const empresa = sortear(rnd, Dados.PATROCINADORES[porte]);
      if (estado.patrocinios.some((p) => p.empresa === empresa) || estado.ofertasPatrocinio.some((p) => p.empresa === empresa)) continue;
      const porEtapa = Math.round((1000 + Math.min(pop, 80) * 60) * [1, 1.6, 2.5][porte] * camp.custo * (0.7 + rnd() * 0.6) / 100) * 100;
      const meta = rnd() < 0.5
        ? { tipo: 'posicao', alvo: Math.round(limitar(10 - porte * 3 + Math.floor(rnd() * 5) - 2, 1, 15)) }
        : { tipo: 'podios', alvo: 1 + porte + Math.floor(rnd() * 2) };
      estado.ofertasPatrocinio.push({
        id: `pt${estado.proxId++}`, empresa, porEtapa, meta, bonus: Math.round(porEtapa * (2 + porte) / 100) * 100,
        expira: estado.etapa + 2,
      });
    }
  }

  function textoMeta(meta) {
    if (meta.tipo === 'podios') return `${meta.alvo} pódio${meta.alvo > 1 ? 's' : ''} na temporada`;
    return meta.alvo === 1 ? 'ser campeão' : `terminar o campeonato no top ${meta.alvo}`;
  }

  function aceitarPatrocinio(estado, id) {
    if (estado.patrocinios.length >= MAX_PATROCINIOS) return { ok: false, erro: `No máximo ${MAX_PATROCINIOS} patrocinadores no macacão.` };
    const of = estado.ofertasPatrocinio.find((o) => o.id === id);
    if (!of) return { ok: false, erro: 'Oferta expirada.' };
    estado.ofertasPatrocinio = estado.ofertasPatrocinio.filter((o) => o.id !== id);
    estado.patrocinios.push(of);
    mexerCabeca(estado, { moral: 2 });
    noticia(estado, `${of.empresa} fecha patrocínio com ${estado.piloto.nome}.`);
    return { ok: true };
  }

  function recusarPatrocinio(estado, id) {
    estado.ofertasPatrocinio = estado.ofertasPatrocinio.filter((o) => o.id !== id);
  }

  // ---------- olheiros e propostas ----------
  function gerarOlheiros(estado, rnd) {
    const camp = campeonato(estado.campeonato);
    const lista = [];
    // Equipes de kart melhores que a sua sempre podem estar de olho.
    const minhaPos = Dados.EQUIPES.findIndex((e) => e.id === estado.equipeId);
    const melhores = Dados.EQUIPES.slice(0, minhaPos);
    if (melhores.length && rnd() < 0.6) {
      const e = sortear(rnd, melhores);
      lista.push({ id: e.id, nome: e.nome, tipo: 'kart' });
    }
    for (const o of Dados.OLHEIROS.filter((x) => x.nivelMin <= camp.ordem)) {
      if (rnd() < 0.25) lista.push({ id: o.id, nome: o.nome, tipo: o.tipo });
    }
    estado.olheiros = lista;
  }

  function atualizarInteresse(estado, pos, rnd) {
    const desempenho = pos <= 10 ? (11 - pos) : 0;
    for (const o of estado.olheiros) {
      estado.interesse[o.id] = (estado.interesse[o.id] || 0) + desempenho * (pos <= 3 ? 1.5 : 1);
    }
    // Propostas de equipes de kart melhores, no meio da temporada
    for (const o of estado.olheiros.filter((x) => x.tipo === 'kart')) {
      if ((estado.interesse[o.id] || 0) < 12 || estado.propostas.some((p) => p.equipe === o.id) || rnd() > 0.6) continue;
      const e = equipeBase(o.id);
      const camp = campeonato(estado.campeonato);
      const tipo = e.organizacao < 60 && rnd() < 0.7 ? 'furada' : rnd() < 0.35 ? 'fabrica' : 'desconto';
      const custoNormal = Math.round(e.custoEtapa * camp.custo);
      const proposta = {
        id: `pr${estado.proxId++}`, tipo, equipe: e.id, nome: e.nome, expira: estado.etapa + 1,
        multa: Math.round(custoEtapa(estado) * 1.5 / 100) * 100,
        materialPrometido: tipo === 'furada' ? Math.min(95, e.material + 6) : e.material,
        custoEtapa: tipo === 'fabrica' ? 0 : Math.round(custoNormal * (tipo === 'furada' ? 0.4 : 0.6) / 100) * 100,
        segundoPiloto: tipo === 'fabrica',
      };
      estado.propostas.push(proposta);
      noticia(estado, `${e.nome} faz uma proposta para ${estado.piloto.nome}!`);
    }
  }

  function aceitarProposta(estado, id) {
    const pr = estado.propostas.find((p) => p.id === id);
    if (!pr) return { ok: false, erro: 'Proposta expirada.' };
    if (pr.tipo === 'f4' || pr.tipo === 'academia') {
      estado.fase = 'f4';
      estado.final = { proposta: pr, ano: estado.ano, idade: estado.piloto.idade };
      noticia(estado, `🏁 ${estado.piloto.nome} assina com ${pr.nome} e deixa o kart rumo aos monopostos!`);
      return { ok: true };
    }
    if (estado.dinheiro < pr.multa) return { ok: false, erro: 'Dinheiro insuficiente para pagar a multa de rescisão.' };
    estado.dinheiro -= pr.multa;
    const antiga = estado.equipeId;
    // O rival mais fraco da nova equipe vai para a sua antiga vaga.
    const daNova = estado.rivais.filter((r) => r.equipe === pr.equipe).sort((a, b) => nota(a) - nota(b));
    if (daNova.length >= 2) daNova[0].equipe = antiga;
    estado.equipeId = pr.equipe;
    estado.contrato = { equipe: pr.equipe, custoEtapa: pr.custoEtapa, segundoPiloto: pr.segundoPiloto, tipo: pr.tipo };
    mexerCabeca(estado, { moral: 5 });
    estado.propostas = estado.propostas.filter((p) => p.tipo === 'f4' || p.tipo === 'academia');
    noticia(estado, `${estado.piloto.nome} troca a ${equipeBase(antiga).nome} pela ${pr.nome}.`);
    if (pr.tipo === 'furada') noticia(estado, `Boatos no paddock: a ${pr.nome} anda atrasando pagamentos e o material não é o que dizem...`);
    return { ok: true };
  }

  function recusarProposta(estado, id) {
    estado.propostas = estado.propostas.filter((p) => p.id !== id);
  }

  // ---------- fim de semana ----------
  function pistaAtual(estado) {
    const etapa = estado.calendario[estado.etapa];
    const camp = campeonato(estado.campeonato);
    const p = Dados.KARTODROMOS[camp.regiao].find((x) => x.id === etapa.pista);
    return {
      ...p, voltas: camp.voltas, perdaBox: 99, desgaste: 0.9,
      ultrapassagem: { travada: 0.4, mista: 0.55, veloz: 0.7 }[p.tipo],
      peso: { motor: 1, aero: 0.3, chassi: 1.4 },
    };
  }

  const climaAtual = (estado) => estado.calendario[estado.etapa].clima;

  function iniciarFimDeSemana(estado) {
    const custo = custoEtapa(estado);
    if (estado.dinheiro < custo) return { ok: false, erro: 'Dinheiro insuficiente para pagar a equipe nesta etapa.' };
    estado.dinheiro -= custo;
    const rnd = rngDe(estado);
    const pista = pistaAtual(estado);
    const clima = climaAtual(estado);
    const tarde = Kart.condicao(clima, 'quali', clima.tarde.inicioChuva === 'quali');
    const manha = Kart.condicao(clima, 'treino', clima.manha.chove);
    // A IA escolhe acerto e pneu: se já chove na classificação, todos vão de chuva; senão, decide pela previsão.
    const pneuIA = clima.tarde.inicioChuva === 'quali' ? 'chuva' : clima.tarde.chance >= 60 ? 'chuva' : 'slick';
    const ia = {};
    for (const r of estado.rivais) {
      const mec = equipeBase(r.equipe).mecanico;
      ia[r.id] = {
        treino: Kart.setupIA(pista, manha, manha.molhado ? 'chuva' : 'slick', mec, rnd),
        tarde: Kart.setupIA(pista, tarde, pneuIA, mec, rnd),
        pneu: pneuIA,
      };
    }
    const anterior = estado.ultimoFds && estado.ultimoFds.setup;
    estado.fds = {
      sessao: 'treino', saidas: [], mecanico: false, sugestaoUsada: false, ia, cabeca: [],
      setup: anterior ? { ...anterior } : Kart.setupPadrao(),
      pneuId: (pneuMaisNovo(estado, manha.molhado ? 'chuva' : 'slick') || {}).id || null,
      quali: null, resultado: null, custoPago: custo,
    };
    estado.fase = 'fds';
    return { ok: true };
  }

  // Sem dinheiro para a etapa: os rivais correm sem você (resultado sorteado pela força de cada um).
  function pularEtapa(estado) {
    const rnd = rngDe(estado);
    noticia(estado, `${estado.piloto.nome} fica fora da etapa de ${pistaAtual(estado).nome} por falta de dinheiro.`);
    mexerCabeca(estado, { moral: -8, confianca: -4 });
    const ordem = estado.rivais
      .map((r) => ({ r, score: nota(r) + equipeBase(r.equipe).material * 0.5 + rnd.gauss() * 4 }))
      .sort((a, b) => b.score - a.score);
    ordem.forEach(({ r }, i) => {
      estado.pontos[r.id] += Engine.PONTOS[i] || 0;
      if (i === 0) estado.vitorias[r.id] = (estado.vitorias[r.id] || 0) + 1;
      if (i < 3) estado.podios[r.id] = (estado.podios[r.id] || 0) + 1;
    });
    concluirEtapa(estado);
  }

  const pneuPorId = (estado, id) => estado.pneus.find((p) => p.id === id);

  // O jogo mais novo do tipo pedido (ou de qualquer tipo, se não houver).
  function pneuMaisNovo(estado, tipo) {
    const lista = estado.pneus.filter((p) => p.tipo === tipo);
    return (lista.length ? lista : estado.pneus).slice().sort((a, b) => a.uso - b.uso)[0] || null;
  }

  function chuvaPiloto(piloto, cond) {
    return cond.molhado ? (75 - piloto.chuva) * 0.03 : 0;
  }

  // Tempo de uma volta lançada (treino ou classificação), sem disputa com outros karts.
  function voltaLancada(estado, entrada, setup, pneuTipo, usoPneu, cond, rnd, voltas = 1) {
    const pista = pistaAtual(estado);
    const ef = Kart.efeito(setup, pista, cond, pneuTipo);
    const cab = entrada.jogador ? efeitoCabeca(entrada.piloto) : { tempo: 0, sigma: 1 };
    let melhor = Infinity;
    for (let i = 0; i < voltas; i++) {
      const t = Engine.ritmoBase(entrada, pista) - 0.6
        + ef.tempo + cab.tempo + chuvaPiloto(entrada.piloto, cond)
        + Engine.PNEUS.Md.desgaste * (usoPneu + i * ef.desgaste)
        + rnd.gauss() * (0.35 - entrada.piloto.consistencia * 0.0025) * ef.sigma * cab.sigma;
      melhor = Math.min(melhor, t);
    }
    return { tempo: melhor, efeito: ef };
  }

  function entradaJogador(estado) {
    const e = equipeBase(estado.equipeId);
    return { id: 'jogador', piloto: estado.piloto, carro: carroDe(estado, e.id, true), equipe: { id: e.id, nome: e.nome, cor: e.cor }, jogador: true };
  }

  function entradaRival(estado, r) {
    const e = equipeBase(r.equipe);
    return { id: r.id, piloto: r, carro: carroDe(estado, e.id, false), equipe: { id: e.id, nome: e.nome, cor: e.cor }, jogador: false };
  }

  // No grid só cabem ajustes finos em relação ao acerto da classificação; eixo e bitola ficam travados.
  const AJUSTE_FINO_GRID = { pressao: 1, eixo: 0, bitola: 0, coroa: 1, carburacao: 1 };

  function limitesGrid(estado) {
    const base = estado.fds.setupQuali || estado.fds.setupCorrida;
    return Object.fromEntries(Kart.ORDEM_AJUSTES.map((k) => [k, [base[k] - AJUSTE_FINO_GRID[k], base[k] + AJUSTE_FINO_GRID[k]]]));
  }

  function definirSetup(estado, setup) {
    const novo = Kart.arredondarSetup({ ...estado.fds.setup, ...setup });
    if (estado.fds.sessao === 'grid') {
      const lim = limitesGrid(estado);
      for (const k of Kart.ORDEM_AJUSTES) novo[k] = limitar(novo[k], lim[k][0], lim[k][1]);
    }
    estado.fds.setup = novo;
  }

  function escolherPneu(estado, id) {
    if (pneuPorId(estado, id)) estado.fds.pneuId = id;
  }

  // Uma saída para a pista no treino livre: tempo, posição na tabela, o que o piloto sente e, se contratado, a dica do mecânico.
  function saidaTreino(estado) {
    const fds = estado.fds;
    if (fds.saidas.length >= SAIDAS_TREINO) return { ok: false, erro: 'O treino livre acabou.' };
    const pneu = pneuPorId(estado, fds.pneuId);
    if (!pneu) return { ok: false, erro: 'Escolha um jogo de pneus.' };
    const rnd = rngDe(estado);
    const pista = pistaAtual(estado);
    const clima = climaAtual(estado);
    const cond = Kart.condicao(clima, 'treino', clima.manha.chove);
    const { tempo, efeito } = voltaLancada(estado, entradaJogador(estado), fds.setup, pneu.tipo, pneu.uso, cond, rnd, VOLTAS_POR_SAIDA);
    pneu.uso += VOLTAS_POR_SAIDA * efeito.desgaste;

    // Melhor tempo de cada rival até agora no treino (cada um também deu suas voltas).
    const tempos = estado.rivais.map((r) => {
      const ia = fds.ia[r.id];
      const usoIA = 2 + fds.saidas.length * VOLTAS_POR_SAIDA * 0.9;
      return voltaLancada(estado, entradaRival(estado, r), ia.treino, cond.molhado ? 'chuva' : 'slick', usoIA, cond, rnd, 3 + fds.saidas.length * 3).tempo;
    });
    const posicao = tempos.filter((t) => t < tempo).length + 1;
    const melhorGeral = Math.min(tempo, ...tempos);
    const e = Kart.erros(fds.setup, Kart.acertoIdeal(pista, cond, pneu.tipo));
    const saida = {
      setup: { ...fds.setup }, pneu: pneu.tipo, usoPneu: Math.round(pneu.uso), tempo, posicao, diferenca: tempo - melhorGeral,
      frases: Kart.feedbackPiloto(e, limitar(estado.piloto.sensibilidade + (estado.piloto.moral - 60) / 3, 10, 95), rnd),
      dica: fds.mecanico ? Kart.dicaMecanico(e, equipeBase(estado.equipeId).mecanico, rnd) : null,
    };
    if (cond.molhado && pneu.tipo === 'slick') saida.frases.unshift('Está molhado! Com slick não dá pra andar.');
    if (pneu.uso > 20) saida.frases.push('Os pneus já estão no fim, difícil saber se o problema é o acerto.');
    fds.saidas.push(saida);
    registrarCaderno(estado, cond, saida);
    return { ok: true, saida };
  }

  function registrarCaderno(estado, cond, saida) {
    const pista = pistaAtual(estado);
    const lista = estado.caderno[pista.id] || (estado.caderno[pista.id] = []);
    lista.push({
      ano: estado.ano, campeonato: estado.campeonato, etapa: estado.etapa + 1, sessao: saida.sessao || estado.fds.sessao,
      tempAr: cond.tempAr, tempPista: cond.tempPista, molhado: cond.molhado,
      setup: saida.setup, pneu: saida.pneu, tempo: saida.tempo, posicao: saida.posicao, fora: !!saida.fora,
    });
    if (lista.length > 60) lista.shift();
  }

  // O mecânico contratado propõe um acerto (uma vez por fim de semana, só no treino livre).
  function pedirSugestao(estado, sessao) {
    const fds = estado.fds;
    if (fds.sessao !== 'treino') return { ok: false, erro: 'O mecânico só mexe no kart durante o treino livre.' };
    if (fds.saidas.length >= SAIDAS_TREINO) return { ok: false, erro: 'O treino livre acabou: o mecânico não mexe mais no kart.' };
    if (!fds.mecanico) return { ok: false, erro: 'Você está sem mecânico nesta etapa.' };
    if (fds.sugestaoUsada) return { ok: false, erro: 'O mecânico já deu a sugestão dele neste fim de semana.' };
    const clima = climaAtual(estado);
    const cond = Kart.condicao(clima, 'treino', clima.manha.chove);
    const pneu = pneuPorId(estado, fds.pneuId);
    fds.setup = Kart.sugestaoMecanico(pistaAtual(estado), cond, pneu ? pneu.tipo : 'slick', equipeBase(estado.equipeId).mecanico, rngDe(estado));
    fds.sugestaoUsada = true;
    return { ok: true };
  }

  // O que o piloto comenta da pista antes de cada sessão (treino, classificação ou grid).
  function leituraPista(estado, sessao) {
    const clima = climaAtual(estado);
    const pista = pistaAtual(estado);
    const treino = Kart.condicao(clima, 'treino', clima.manha.chove);
    if (sessao === 'treino') return Kart.falaCondicoes(pista, treino, null, 0);
    const molhado = clima.tarde.inicioChuva === 'quali';
    const quali = Kart.condicao(clima, 'quali', molhado);
    if (sessao === 'quali') return Kart.falaCondicoes(pista, quali, treino, clima.tarde.chance);
    return Kart.falaCondicoes(pista, Kart.condicao(clima, 'corrida', molhado), quali, clima.tarde.chance);
  }

  function irParaClassificacao(estado) {
    const clima = climaAtual(estado);
    const pneu = pneuMaisNovo(estado, clima.tarde.inicioChuva === 'quali' ? 'chuva' : 'slick');
    if (pneu) estado.fds.pneuId = pneu.id;
    estado.fds.sessao = 'quali';
  }

  function classificar(estado) {
    const fds = estado.fds;
    const pneu = pneuPorId(estado, fds.pneuId);
    if (!pneu) return { ok: false, erro: 'Escolha um jogo de pneus.' };
    const rnd = rngDe(estado);
    const clima = climaAtual(estado);
    const cond = Kart.condicao(clima, 'quali', clima.tarde.inicioChuva === 'quali');
    const tempos = [{ id: 'jogador', tempo: voltaLancada(estado, entradaJogador(estado), fds.setup, pneu.tipo, pneu.uso, cond, rnd, 3).tempo }];
    pneu.uso += 3;
    for (const r of estado.rivais) {
      const ia = fds.ia[r.id];
      tempos.push({ id: r.id, tempo: voltaLancada(estado, entradaRival(estado, r), ia.tarde, ia.pneu, 1, cond, rnd, 3).tempo });
    }
    tempos.sort((a, b) => a.tempo - b.tempo);
    fds.quali = tempos;
    fds.setupCorrida = { ...fds.setup };
    fds.setupQuali = { ...fds.setup };
    fds.pneuCorrida = fds.pneuId;
    registrarCaderno(estado, cond, { setup: fds.setup, pneu: pneu.tipo, tempo: tempos.find((t) => t.id === 'jogador').tempo, posicao: tempos.findIndex((t) => t.id === 'jogador') + 1 });
    fds.sessao = 'grid';
    return { ok: true };
  }

  // Monta a corrida (não é salva: se a página recarregar, a bateria recomeça).
  function criarCorrida(estado) {
    const fds = estado.fds;
    // No grid o piloto ainda pode mexer no kart e trocar o pneu: vale o que estiver montado na largada.
    if (fds.sessao === 'grid' && pneuPorId(estado, fds.pneuId)) {
      fds.setupCorrida = { ...fds.setup };
      fds.pneuCorrida = fds.pneuId;
    }
    const pista = pistaAtual(estado);
    const clima = climaAtual(estado);
    const pneuJogador = pneuPorId(estado, fds.pneuCorrida) || { tipo: 'slick', uso: 0 };
    const entradas = Object.fromEntries([entradaJogador(estado), ...estado.rivais.map((r) => entradaRival(estado, r))].map((e) => [e.id, e]));
    const grid = fds.quali.map((q) => entradas[q.id]);
    const chuvaDesde = clima.tarde.inicioChuva === 'quali' ? 1 : clima.tarde.voltaChuva;
    const ajusteVolta = (c, v, corrida) => {
      const molhado = chuvaDesde != null && v >= chuvaDesde;
      if (molhado && !corrida.chuvaAnunciada) {
        corrida.chuvaAnunciada = true;
        if (v > 1) Engine.registrar(corrida, '🌧 Começou a chover!', 'sc');
      }
      corrida.molhado = molhado;
      const cond = Kart.condicao(clima, 'corrida', molhado);
      const setup = c.jogador ? fds.setupCorrida : fds.ia[c.id].tarde;
      const pneu = c.jogador ? pneuJogador.tipo : fds.ia[c.id].pneu;
      const ef = Kart.efeito(setup, pista, cond, pneu);
      const cab = c.jogador ? efeitoCabeca(c.piloto) : { tempo: 0, sigma: 1, erro: 1 };
      return { ...ef, tempo: ef.tempo + cab.tempo + chuvaPiloto(c.piloto, cond), sigma: ef.sigma * cab.sigma, erro: ef.erro * cab.erro };
    };
    const corrida = Engine.criarCorrida(pista, grid, estado.seed + estado.ano * 1009 + estado.etapa * 31, {
      regraCompostos: false, pneuPadrao: 'Md', semBox: true, semSafetyCar: true, semModos: true, ajusteVolta,
    });
    for (const c of corrida.carros) {
      c.uso = c.jogador ? pneuJogador.uso : 1;
      c.tipoPneu = c.jogador ? pneuJogador.tipo : fds.ia[c.id].pneu;
    }
    return corrida;
  }

  // Aplica a corrida terminada: ordens de equipe, pontos, dinheiro, popularidade, olheiros.
  function concluirCorrida(estado, corrida) {
    const fds = estado.fds;
    const res = Engine.resultado(corrida);
    const camp = campeonato(estado.campeonato);
    const eventos = [];

    // Contrato de piloto de fábrica: às vezes a equipe manda deixar o companheiro passar.
    if (estado.contrato && estado.contrato.segundoPiloto) {
      const i = res.findIndex((r) => r.id === 'jogador');
      const atras = res[i + 1];
      if (atras && !res[i].fora && !atras.fora && atras.equipe === estado.equipeId && Engine.criarRng(estado.seed + estado.etapa)() < 0.6) {
        [res[i], res[i + 1]] = [res[i + 1], res[i]];
        res[i].pos = i + 1;
        res[i + 1].pos = i + 2;
        eventos.push(`Ordem de equipe: você teve que deixar ${estado.rivais.find((r) => r.id === atras.id).nome} passar.`);
        mexerCabeca(estado, { moral: -8 }, 'Ordem de equipe');
        res.forEach((r, k) => { r.pontos = !r.fora && k < Engine.PONTOS.length ? Engine.PONTOS[k] : 0; });
      }
    }

    for (const r of res) {
      estado.pontos[r.id] = (estado.pontos[r.id] || 0) + r.pontos;
      if (!r.fora && r.pos === 1) estado.vitorias[r.id] = (estado.vitorias[r.id] || 0) + 1;
      if (!r.fora && r.pos <= 3) estado.podios[r.id] = (estado.podios[r.id] || 0) + 1;
    }
    const meu = res.find((r) => r.id === 'jogador');
    const p = estado.piloto;
    let ganho = 0;
    if (!meu.fora && meu.pos <= 3) ganho += Math.round(PREMIO_ETAPA[meu.pos - 1] * camp.custo);
    const patroc = estado.patrocinios.reduce((s, x) => s + x.porEtapa, 0);
    ganho += patroc;
    estado.dinheiro += ganho;
    if (!meu.fora) {
      if (meu.pos === 1) p.popularidade += 4 * camp.popularidade;
      else if (meu.pos <= 3) p.popularidade += 2 * camp.popularidade;
      else if (meu.pos <= 10) p.popularidade += 0.5 * camp.popularidade;
    }
    p.popularidade = Math.min(100, Math.round(p.popularidade * 10) / 10);

    // Pneu usado na corrida volta para o estoque com o desgaste.
    const pneu = pneuPorId(estado, fds.pneuCorrida);
    const carro = corrida.carros.find((c) => c.jogador);
    if (pneu) pneu.uso = Math.round(carro.uso);
    estado.motorHoras += 1;

    // Cabeça do piloto: o resultado em relação à largada pesa na confiança.
    const largada = fds.quali.findIndex((q) => q.id === 'jogador') + 1;
    if (meu.fora && meu.motivoFora === 'Acidente') mexerCabeca(estado, { confianca: -12, moral: -3 }, 'Acidente');
    else if (meu.fora) mexerCabeca(estado, { confianca: -2, moral: -5 }, `Abandono: ${meu.motivoFora.toLowerCase()}`);
    else {
      let conf = limitar(Math.round((largada - meu.pos) * 1.2), -8, 8);
      if (meu.pos <= 3) conf += 4;
      if (meu.pos === 1) conf += 4;
      const texto = meu.pos === 1 ? 'Vitória' : meu.pos <= 3 ? 'Pódio' : largada === meu.pos ? `Terminou onde largou (P${meu.pos})` : `Largou P${largada}, terminou P${meu.pos}`;
      mexerCabeca(estado, { confianca: conf, moral: meu.pos <= 3 ? 4 : meu.pos <= 10 ? 1 : -2 }, texto);
    }

    // Experiência: um pouco de evolução a cada corrida (mais com a moral alta)
    const rnd = rngDe(estado);
    evoluir(p, rnd, 0.15 * fatorMoral(p));
    fds.resultado = { pos: meu.pos, fora: meu.fora, motivo: meu.motivoFora, pontos: meu.pontos, ganho, patrocinio: patroc, eventos, olheiros: estado.olheiros.map((o) => o.nome), cabeca: fds.cabeca || [] };
    atualizarInteresse(estado, meu.fora ? 99 : meu.pos, rnd);
    estado.historico.push({ ano: estado.ano, campeonato: camp.id, etapa: estado.etapa + 1, pista: pistaAtual(estado).nome, pos: meu.pos, fora: meu.fora });
    const clima = climaAtual(estado);
    const condFinal = Kart.condicao(clima, 'corrida', !!corrida.molhado);
    const tipoPneu = carro.tipoPneu || (pneu ? pneu.tipo : 'slick');
    fds.resultado.diagnostico = {
      ...Kart.diagnostico(fds.setupCorrida, pistaAtual(estado), condFinal, tipoPneu),
      tempAr: condFinal.tempAr, tempPista: condFinal.tempPista, molhado: condFinal.molhado,
      choveuNaCorrida: !!corrida.molhado && clima.tarde.inicioChuva === 'corrida',
    };
    registrarCaderno(estado, condFinal, {
      sessao: 'corrida', setup: { ...fds.setupCorrida }, pneu: tipoPneu,
      tempo: carro.melhorVolta, posicao: meu.pos, fora: meu.fora,
    });
    fds.sessao = 'fim';
    fds.classificacao = res.map((r) => ({ id: r.id, pos: r.pos, fora: r.fora, motivo: r.motivoFora, pontos: r.pontos, dif: r.diferenca, equipe: r.equipe }));
    return fds.resultado;
  }

  // Guarda o diagnóstico da corrida (e uma anotação livre do jogador) no caderno da pista.
  function anotarCorrida(estado, texto) {
    const fds = estado.fds;
    const r = fds && fds.resultado;
    if (!r || !r.diagnostico) return { ok: false, erro: 'Nada para anotar.' };
    const lista = estado.caderno[pistaAtual(estado).id] || [];
    const entrada = lista.slice().reverse().find((l) => l.sessao === 'corrida' && l.ano === estado.ano && l.etapa === estado.etapa + 1);
    if (!entrada) return { ok: false, erro: 'Nada para anotar.' };
    const d = r.diagnostico;
    entrada.nota = { sentiu: d.sentiu, ajustes: d.ajustes.map((a) => a.texto), pneu: d.pneu, texto: String(texto || '').trim().slice(0, 300) };
    r.anotado = true;
    return { ok: true };
  }

  function nomeDe(estado, id) {
    return id === 'jogador' ? estado.piloto.nome : (estado.rivais.find((r) => r.id === id) || { nome: '?' }).nome;
  }

  // Volta ao paddock depois da corrida (ou de uma etapa pulada).
  function concluirEtapa(estado) {
    const rnd = rngDe(estado);
    // Posição no campeonato depois desta etapa (para o gráfico de evolução).
    estado.evolucao.push({ ano: estado.ano, campeonato: estado.campeonato, etapa: estado.etapa + 1, pos: posicaoNoCampeonato(estado), pontos: estado.pontos.jogador });
    if (estado.fds) estado.ultimoFds = { setup: estado.fds.setupCorrida || estado.fds.setup };
    estado.fds = null;
    estado.etapa += 1;
    estado.ofertasPatrocinio = estado.ofertasPatrocinio.filter((o) => o.expira >= estado.etapa);
    estado.propostas = estado.propostas.filter((o) => o.expira >= estado.etapa || o.tipo === 'f4' || o.tipo === 'academia');
    if (rnd() < 0.3 + estado.piloto.popularidade / 100) gerarOfertasPatrocinio(estado, rnd, 1);
    // A confiança volta aos poucos para o normal; aperto de dinheiro pesa na moral.
    const p = estado.piloto;
    p.confianca = Math.round(p.confianca + (50 - p.confianca) * 0.15);
    if (estado.etapa < ETAPAS && estado.dinheiro < custoEtapa(estado) * 1.5) {
      mexerCabeca(estado, { moral: -4 });
      noticia(estado, `${p.nome} sente o peso das contas apertadas em casa.`);
    }
    if (p.moral < 20) noticia(estado, `${p.nome} anda desmotivado e já falou em largar o kart.`);
    if (estado.etapa >= ETAPAS) return fimDeTemporada(estado);
    gerarOlheiros(estado, rnd);
    estado.fase = 'paddock';
  }

  function classificacaoCampeonato(estado) {
    const ids = ['jogador', ...estado.rivais.map((r) => r.id)];
    return ids
      .map((id) => ({ id, nome: nomeDe(estado, id), pontos: estado.pontos[id] || 0, vitorias: estado.vitorias[id] || 0, podios: estado.podios[id] || 0,
        equipe: id === 'jogador' ? estado.equipeId : estado.rivais.find((r) => r.id === id).equipe }))
      .sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.podios - a.podios);
  }

  function posicaoNoCampeonato(estado) {
    return classificacaoCampeonato(estado).findIndex((x) => x.id === 'jogador') + 1;
  }

  // ---------- evolução e fim de temporada ----------
  function evoluir(p, rnd, fator) {
    const taxa = p.idade <= 14 ? 0.3 : p.idade <= 17 ? 0.22 : 0.12;
    for (const a of ATRIBUTOS) {
      const falta = p.potencial - p[a];
      if (falta <= 0) continue;
      const ganho = falta * taxa * fator * (0.5 + rnd());
      p[a] = Math.min(p.potencial, p[a] + Math.floor(ganho) + (rnd() < ganho % 1 ? 1 : 0));
    }
  }

  function fimDeTemporada(estado) {
    const rnd = rngDe(estado);
    const camp = campeonato(estado.campeonato);
    const tabela = classificacaoCampeonato(estado);
    const pos = posicaoNoCampeonato(estado);
    const rel = { ano: estado.ano, campeonato: camp.id, pos, pontos: estado.pontos.jogador, campeao: tabela[0].nome, premios: [], bonus: [], dinheiroAntes: estado.dinheiro };

    if (pos <= 3) {
      const premio = Math.round(camp.premioCampeao / 2 ** (pos - 1));
      estado.dinheiro += premio;
      rel.premios.push({ texto: `Prêmio de P${pos} no campeonato`, valor: premio });
      estado.piloto.popularidade += pos === 1 ? 10 * camp.popularidade : 4 * camp.popularidade;
    }
    for (const pt of estado.patrocinios) {
      const cumpriu = pt.meta.tipo === 'podios' ? (estado.podios.jogador || 0) >= pt.meta.alvo : pos <= pt.meta.alvo;
      if (cumpriu) estado.dinheiro += pt.bonus;
      rel.bonus.push({ empresa: pt.empresa, meta: textoMeta(pt.meta), cumpriu, valor: pt.bonus });
    }
    estado.patrocinios = [];
    estado.ofertasPatrocinio = [];

    const p = estado.piloto;
    const antes = Object.fromEntries(ATRIBUTOS.map((a) => [a, p[a]]));
    if (pos === 1) mexerCabeca(estado, { moral: 15, confianca: 10 });
    evoluir(p, rnd, fatorMoral(p));
    p.moral = Math.round(p.moral + (60 - p.moral) * 0.3);
    p.sensibilidade = Math.min(95, p.sensibilidade + 3);
    p.idade += 1;
    p.popularidade = Math.round(p.popularidade * 0.8 * 10) / 10;
    rel.evolucao = ATRIBUTOS.map((a) => ({ a, antes: antes[a], depois: p[a] })).filter((x) => x.depois !== x.antes);

    // Opções para o próximo ano
    const proximo = Dados.CAMPEONATOS[camp.ordem + 1];
    rel.opcoes = [camp.id];
    if (proximo && (pos <= 3 || p.popularidade >= 20 * (camp.ordem + 1))) rel.opcoes.push(proximo.id);

    // Equipes de F4 e academias de F1: só para quem brilhou nos campeonatos maiores.
    const propostasF4 = [];
    const interesseF4 = Dados.OLHEIROS.filter((o) => o.tipo === 'f4').map((o) => ({ o, i: estado.interesse[o.id] || 0 })).sort((a, b) => b.i - a.i);
    if ((camp.ordem === 2 && pos <= 5) || (camp.ordem === 1 && pos === 1) || (interesseF4[0] && interesseF4[0].i >= 40)) {
      const o = interesseF4[0].o;
      propostasF4.push({ id: `pr${estado.proxId++}`, tipo: 'f4', nome: o.nome, texto: 'Vaga na Fórmula 4 para o próximo ano. Você paga parte do orçamento.' });
    }
    if (camp.ordem === 2 && pos <= 2) {
      const a = sortear(rnd, Dados.OLHEIROS.filter((x) => x.tipo === 'academia'));
      propostasF4.push({ id: `pr${estado.proxId++}`, tipo: 'academia', nome: a.nome, texto: 'Entrar no programa de jovens pilotos de uma equipe de F1: eles pagam a F4.' });
    }
    estado.propostas = propostasF4;
    rel.propostasF4 = propostasF4.map((x) => x.nome);
    rel.dinheiroDepois = estado.dinheiro;

    const custoMinimo = Math.round(Dados.EQUIPES[Dados.EQUIPES.length - 1].custoEtapa * camp.custo);
    estado.relatorio = rel;
    estado.temporadas.push({ ano: rel.ano, campeonato: rel.campeonato, pos: rel.pos, pontos: rel.pontos });
    estado.ano += 1;
    estado.fase = estado.dinheiro < custoMinimo && !propostasF4.length ? 'falencia' : 'relatorio';
    noticia(estado, `${p.nome} termina ${rel.ano} em P${pos} na ${camp.nome}. Campeão: ${rel.campeao}.`);
  }

  // Começa o ano seguinte no campeonato escolhido.
  function proximaTemporada(estado, campeonatoId) {
    if (!estado.relatorio.opcoes.includes(campeonatoId)) return { ok: false, erro: 'Campeonato não disponível.' };
    estado.campeonato = campeonatoId;
    estado.contrato = null;
    estado.propostas = estado.propostas.filter((p) => p.tipo !== 'f4' && p.tipo !== 'academia');
    iniciarTemporada(estado);
    noticia(estado, `${estado.piloto.nome} disputa a ${campeonato(campeonatoId).nome} em ${estado.ano}.`);
    return { ok: true };
  }

  const Carreira = {
    ATRIBUTOS, NOMES_ATRIBUTOS, ETAPAS, VOLTAS_POR_SAIDA, seguir, pendenciasEtapa, AJUSTE_FINO_GRID, limitesGrid, PORTES, porteDe, equipesIniciais, humor, sessaoPsicologo, precoPsicologo, migrar, efeitoCabeca, APOIO_FAMILIA, SAIDAS_TREINO, HORAS_REVISAO, MAX_PATROCINIOS,
    campeonato, equipeBase, nota, novoJogo, custoEtapa, carroDe, comprarPneu, descartarPneu, revisarMotor, precoPneu, precoRevisao, precoMecanico, contratarMecanico,
    textoMeta, aceitarPatrocinio, recusarPatrocinio, aceitarProposta, recusarProposta,
    pistaAtual, climaAtual, leituraPista, iniciarFimDeSemana, pularEtapa, definirSetup, escolherPneu, saidaTreino, pedirSugestao,
    irParaClassificacao, classificar, criarCorrida, concluirCorrida, anotarCorrida, concluirEtapa, nomeDe,
    classificacaoCampeonato, posicaoNoCampeonato, proximaTemporada,
  };
  if (typeof module === 'object' && module.exports) module.exports = Carreira;
  else root.BoxCarreira = Carreira;
})(this);
