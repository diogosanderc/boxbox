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
  const ETAPAS = 8; // kart e F4; da F3 em diante, o calendário real (campeonato.etapas)
  const etapasDe = (estado) => campeonato(estado.campeonato).etapas || ETAPAS;
  // Saídas no treino livre: 2 de graça, 4 com o Premium.
  const SAIDAS_TREINO = 4;
  const SAIDAS_GRATIS = 2;
  const VOLTAS_POR_SAIDA = 6;
  // Motor de kart conta horas de uso: cada saída de treino, a classificação e a corrida somam.
  // Passou de HORAS_REVISAO sem revisão, perde força e fica mais frágil.
  const HORAS_REVISAO = 3.5;
  const HORAS = { saida: 0.12, amaciar: 0.03, quali: 0.08, corrida: 0.3 };
  const somarHoras = (estado, h) => { estado.motorHoras = Math.round((estado.motorHoras + h) * 100) / 100; };
  // Já pede revisão antes da próxima etapa? (uma etapa inteira gasta cerca de 0,9 h)
  const motorPedeRevisao = (estado) => estado.motorHoras >= HORAS_REVISAO - 0.9;
  // Idade mínima da FIA para a Fórmula 4.
  const IDADE_F4 = 15;
  const CUSTO_REVISAO = 3900; // revisão completa do motor de kart: US$ 1.290–1.543
  // Motor engripado: retífica expressa (cara, corre a próxima etapa) ou normal (mais barata, perde a etapa).
  const CUSTO_RETIFICA = { expressa: 8500, normal: 3900 };
  // Prêmio por etapa para os 10 primeiros, multiplicado pelo custo do campeonato.
  const PONTOS_SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];
  const PONTO_POLE = 1;
  const PONTO_VOLTA_RAPIDA = 1;
  const PREMIO_ETAPA = [3000, 2000, 1500, 1200, 1000, 800, 600, 400, 300, 200];
  // Os 4 primeiros do campeonato sobem de degrau (no Europeu, para a F4).
  const VAGAS_SUBIDA = 4;
  // Premium (compra única no app): mais patrocinadores, mais espaço de pneus e anotações no caderno.
  // A carreira inteira é grátis; o Premium só amplia o que dá para fazer nela.
  let premium = false;
  const definirPremium = (v) => { premium = !!v; };

  // ---------- espera entre temporadas (quem não tem o Premium) ----------
  // A temporada inteira é livre; ao terminar, a próxima só abre depois de 24 h. O Premium joga a qualquer hora.
  // O relógio guardado nunca anda para trás: voltar a hora do aparelho não alonga nem encurta a espera.
  const ESPERA_TEMPORADA_MS = 24 * 60 * 60 * 1000;
  function relogio(estado, agora = Date.now()) {
    estado.relogioMax = Math.max(estado.relogioMax || 0, agora);
    return estado.relogioMax;
  }
  // Milissegundos que faltam para a próxima temporada abrir (0 = liberada ou Premium).
  function esperaTemporada(estado, agora = Date.now()) {
    if (premium || !estado.espera) return 0;
    return Math.max(0, estado.espera.ate - relogio(estado, agora));
  }
  const liberarEspera = (estado) => { estado.espera = null; };
  const ehPremium = () => premium;
  const MAX_PATROCINIOS = 5;
  const PATROCINIOS_GRATIS = 2;
  const saidasTreino = () => (premium ? SAIDAS_TREINO : SAIDAS_GRATIS);
  const maxPatrocinios = () => (premium ? MAX_PATROCINIOS : PATROCINIOS_GRATIS);
  const pedePremium = (erro) => ({ ok: false, premium: true, erro });
  const APOIO_FAMILIA = 8000; // por temporada (só no kart), multiplicado pelo custo do campeonato

  const limitar = (x, min, max) => Math.max(min, Math.min(max, x));
  const sortear = (rnd, lista) => lista[Math.floor(rnd() * lista.length)];
  const campeonato = (id) => Dados.CAMPEONATOS.find((c) => c.id === id);
  // Nomes das equipes desta carreira (sorteados no novo jogo); sem sorteio, valem os nomes de Dados.EQUIPES.
  let nomesEquipes = {};
  const equipeBase = (id) => {
    const e = Dados.EQUIPES.find((x) => x.id === id) || Object.values(Dados.EQUIPES_MONO).flat().find((x) => x.id === id);
    return e && nomesEquipes[id] ? { ...e, nome: nomesEquipes[id] } : e;
  };

  // Sorteia um nome diferente para cada equipe, sempre o mesmo para a mesma semente.
  function sortearNomesEquipes(seed) {
    const rnd = Engine.criarRng((seed ^ 0x5bd1e995) >>> 0);
    const pool = Dados.NOMES_EQUIPES.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return Object.fromEntries(Dados.EQUIPES.map((e, i) => [e.id, pool[i]]));
  }

  function usarNomesEquipes(nomes) {
    nomesEquipes = nomes || {};
  }

  function rngDe(estado) {
    estado.contador += 1;
    return Engine.criarRng(estado.seed * 31 + estado.contador * 7919);
  }

  function nota(p) {
    return Math.round(p.ritmo * 0.4 + p.consistencia * 0.2 + (p.largada + p.ultrapassagem + p.defesa + p.chuva) * 0.1);
  }

  function noticia(estado, texto) {
    // n: número sequencial, para saber quais o jogador ainda não leu.
    estado.seqNoticia = (estado.seqNoticia || 0) + 1;
    estado.noticias.unshift({ ano: estado.ano, etapa: estado.etapa + 1, texto, n: estado.seqNoticia });
    estado.noticias = estado.noticias.slice(0, 80);
  }

  // ---------- criação ----------
  // No começo, só três equipes abrem as portas para um garoto de 12 anos: uma de cada porte.
  const PORTES = {
    ponta: { nome: 'Equipe de ponta', equipes: ['fulmine', 'orbital', 'velox', 'rapido'] },
    media: { nome: 'Intermediária', equipes: ['tempesta', 'faisca', 'piccolo', 'ninja'] },
    pequena: { nome: 'Equipe pequena', equipes: ['formiga', 'garagem'] },
  };
  const PORTES_F4 = {
    ponta: ['f4-vortex', 'f4-rossa', 'f4-apex', 'f4-lionheart'],
    media: ['f4-scorpio', 'f4-aquila', 'f4-mistral', 'f4-nordwind'],
    pequena: ['f4-pampa', 'f4-box13'],
  };
  const porteDe = (id) => {
    const e = equipeBase(id);
    return (e && e.porte) || Object.keys(PORTES).find((k) => PORTES[k].equipes.includes(id) || PORTES_F4[k].includes(id));
  };

  // Categoria do carro no campeonato atual: 'kart' ou 'f4' (monoposto, vale da F4 à F1), e as equipes do campeonato.
  const categoriaDe = (estado) => campeonato(estado.campeonato).categoria || 'kart';
  const equipesDaCategoria = (estado) => (categoriaDe(estado) !== 'kart' ? Dados.EQUIPES_MONO[estado.campeonato] : Dados.EQUIPES);
  // Escada dos monopostos: os 4 primeiros de cada um recebem proposta do seguinte.
  const PROXIMA_CATEGORIA = { f4: 'f3', f3: 'f2', f2: 'f1' };
  // O teto dos atributos sobe a cada categoria: 100 só na F1. A preparação (físico e simulador) soma até +4.
  const TETO_CATEGORIA = { regional: 58, nacional: 66, internacional: 72, f4: 80, f3: 87, f2: 92, f1: 100 };
  const POTENCIAL_MAXIMO = 100;
  function tetoDe(estado, campId) {
    const prep = Object.values(estado.preparacao || {}).reduce((t, n) => t + n, 0);
    return Math.min(POTENCIAL_MAXIMO, (TETO_CATEGORIA[campId || estado.campeonato] || TETO_CATEGORIA.regional) + prep);
  }
  const sincronizarTeto = (estado) => { if (estado.piloto) estado.piloto.potencial = tetoDe(estado); };
  // O modelo do carro (ajustes, acerto ideal, falas) acompanha a categoria.
  function sincronizarCategoria(estado) {
    sincronizarTeto(estado);
    Kart.usarCategoria(categoriaDe(estado));
  }

  function equipesIniciais(seed) {
    const rnd = Engine.criarRng(seed * 13 + 7);
    return Object.values(PORTES).map((p) => sortear(rnd, p.equipes));
  }
  // usados: sobrenomes já no grid (inclui o do jogador), para ninguém repetir sobrenome.
  function gerarRival(estado, rnd, nivel, regiao, usados = new Set()) {
    const pais = sortear(rnd, Dados.PAISES[regiao]);
    const n = Dados.NOMES[pais];
    let sobrenome = sortear(rnd, n.s);
    for (let i = 0; i < 30 && usados.has(sobrenome); i++) sobrenome = sortear(rnd, n.s);
    usados.add(sobrenome);
    const idades = { f4: [15, 3], f3: [16, 4], f2: [18, 5], f1: [19, 17] }[estado.campeonato] || [11, 5];
    const p = { id: `r${estado.proxId++}`, nome: `${sortear(rnd, n.p)} ${sobrenome}`, pais, idade: idades[0] + Math.floor(rnd() * idades[1]) };
    for (const a of ATRIBUTOS) p[a] = Math.round(limitar(nivel + rnd.gauss() * 5, 35, 95));
    return p;
  }

  // ---------- rival de carreira ----------
  // Um piloto da mesma idade que começa no kart junto com o jogador e sobe as mesmas categorias.
  // Fica guardado em estado.rivalCarreira (atributos, potencial, placar) e entra em cada grid novo.
  function criarRivalCarreira(estado) {
    const rnd = Engine.criarRng((estado.seed || 1) * 7 + 3);
    const camp = campeonato('regional');
    const usados = new Set([sobrenomeJogador(estado)]);
    const base = gerarRival({ ...estado, campeonato: 'regional', proxId: 0 }, rnd, camp.nivel + 2, 'br', usados);
    return { ...base, id: 'rc', idade: estado.piloto ? estado.piloto.idade : 12, potencial: Math.round(limitar(89 + rnd.gauss() * 2, 85, 93)), duelo: { eu: 0, ele: 0 }, temporadas: [] };
  }
  function colocarRivalCarreira(estado, rivais, camp) {
    if (!estado.piloto) return;
    if (!estado.rivalCarreira) estado.rivalCarreira = criarRivalCarreira(estado);
    const rc = estado.rivalCarreira;
    // Subiu de categoria junto: chega pelo menos perto do nível dela.
    for (const a of ATRIBUTOS) rc[a] = Math.max(rc[a], Math.min(rc.potencial, camp.nivel - 3));
    const { duelo, temporadas, potencial, ...piloto } = rc;
    // Ocupa o lugar do rival de nota mais parecida (o grid continua com a mesma força).
    let i = 0;
    rivais.forEach((r, j) => { if (Math.abs(nota(r) - nota(rc)) < Math.abs(nota(rivais[i]) - nota(rc))) i = j; });
    // Sobrenome repetido no grid: ele entra no lugar desse piloto.
    const sobrenome = (n) => n.split(' ').slice(1).join(' ');
    const igual = rivais.findIndex((r) => sobrenome(r.nome) === sobrenome(rc.nome));
    if (igual >= 0) i = igual;
    // O rival de carreira corre sempre por outra equipe (o companheiro já tem o cartão dele): se a vaga
    // escolhida é da equipe do jogador, troca de equipe com o rival mais parecido de outra equipe.
    if (rivais[i].equipe === estado.equipeId) {
      let j = -1;
      rivais.forEach((r, k) => { if (k !== i && r.equipe !== estado.equipeId && (j < 0 || Math.abs(nota(r) - nota(rc)) < Math.abs(nota(rivais[j]) - nota(rc)))) j = k; });
      if (j >= 0) [rivais[i].equipe, rivais[j].equipe] = [rivais[j].equipe, rivais[i].equipe];
    }
    rivais[i] = { ...piloto, equipe: rivais[i].equipe };
  }
  const rivalCarreira = (estado) => (estado.rivalCarreira && estado.rivais.find((r) => r.id === 'rc')) || null;

  // Monta o grid do campeonato: 2 pilotos por equipe (10 equipes e 19 rivais; na F1, 11 equipes e 21 rivais); você ocupa uma vaga na sua equipe.
  function montarGrid(estado) {
    const rnd = rngDe(estado);
    const camp = campeonato(estado.campeonato);
    const usados = new Set([sobrenomeJogador(estado)]);
    const rivais = Array.from({ length: equipesDaCategoria(estado).length * 2 - 1 }, () => gerarRival(estado, rnd, camp.nivel, camp.regiao, usados))
      .sort((a, b) => nota(b) - nota(a));
    const vagas = [];
    for (const e of equipesDaCategoria(estado)) {
      vagas.push(e.id);
      if (e.id !== estado.equipeId) vagas.push(e.id);
    }
    // Melhores pilotos tendem a ir para as melhores equipes (com alguma bagunça).
    const lista = equipesDaCategoria(estado);
    vagas.sort((a, b) => lista.findIndex((e) => e.id === a) - lista.findIndex((e) => e.id === b) + rnd.gauss() * 3);
    rivais.forEach((r, i) => { r.equipe = vagas[i]; });
    colocarRivalCarreira(estado, rivais, camp);
    estado.rivais = rivais;
    estado.pontos = { jogador: 0, ...Object.fromEntries(rivais.map((r) => [r.id, 0])) };
    estado.seguindo = null; // rivais novos a cada temporada
    estado.vitorias = {};
    estado.podios = {};
    novoDuelo(estado);
  }

  // ---------- companheiro de equipe ----------
  // Placar da temporada contra o colega de equipe (classificação e corrida). Bater o companheiro anima o piloto.
  function companheiro(estado) {
    return estado.rivais.find((r) => r.equipe === estado.equipeId) || null;
  }
  function novoDuelo(estado) {
    const c = companheiro(estado);
    estado.duelo = c ? { id: c.id, quali: [0, 0], corrida: [0, 0] } : null;
  }
  function placarDuelo(estado, tipo, eu, ele) {
    if (!estado.duelo || estado.duelo.id !== (companheiro(estado) || {}).id) novoDuelo(estado);
    if (!estado.duelo || eu == null || ele == null) return null;
    const venci = eu < ele;
    estado.duelo[tipo][venci ? 0 : 1] += 1;
    return venci;
  }

  // O nome do piloto fica com a inicial de cada nome em maiúscula ("Diogo Sander", "Diogo da Silva").
  // Só a carteirinha de piloto, na abertura da carreira, mostra o nome em caixa alta.
  const PARTICULAS_NOME = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  const nomeDoPiloto = (n) => String(n || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').split(' ')
    .map((p, i) => (i > 0 && PARTICULAS_NOME.has(p) ? p : p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1))).join(' ');
  // Sobrenome do jogador no formato dos nomes do grid ("SANDER" -> "Sander"), para não repetir no grid.
  const sobrenomeJogador = (estado) => (estado.piloto ? estado.piloto.nome.split(' ').slice(1).join(' ').toLocaleLowerCase('pt-BR').replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase('pt-BR')) : '');

  function novoJogo({ nome = 'Você', equipeId = 'faisca', seed = Date.now() % 1e9 } = {}) {
    const nomesSorteados = sortearNomesEquipes(seed);
    usarNomesEquipes(nomesSorteados);
    const estado = {
      nomesEquipes: nomesSorteados,
      versao: 2, seed, contador: 0, proxId: 1, ano: 2027, idadeInicial: 12,
      campeonato: 'regional', etapa: 0, fase: 'paddock',
      equipeId, contrato: null, dinheiro: equipeBase(equipeId).caixa,
      piloto: null, rivais: [], pontos: {}, vitorias: {}, podios: {},
      pneus: [], proxPneu: 1, motorHoras: 0, motorEmHoras: true,
      patrocinios: [], ofertasPatrocinio: [], propostas: [], interesse: {},
      calendario: [], fds: null, ultimoFds: null, caderno: {}, noticias: [], historico: [], relatorio: null,
      evolucao: [], temporadas: [], seguindo: null,
    };
    const rnd = rngDe(estado);
    const p = { id: 'jogador', nome: nomeDoPiloto(nome), pais: 'BRA', idade: 12, popularidade: 5, moral: 60, confianca: 50 };
    for (const a of ATRIBUTOS) p[a] = Math.round(limitar(47 + rnd.gauss() * 1.5, 45, 49));
    // Teto de atributos: vem da categoria (ver TETO_CATEGORIA) e é calculado em sincronizarCategoria.
    p.potencial = TETO_CATEGORIA.regional;
    // Oculto: sensibilidade (quão bem o piloto sente o kart).
    p.sensibilidade = Math.round(limitar(55 + rnd.gauss() * 12, 30, 85));
    estado.piloto = p;
    comprarPneu(estado, 'slick', true);
    comprarPneu(estado, 'slick', true);
    comprarPneu(estado, 'chuva', true);
    iniciarTemporada(estado);
    noticia(estado, `${nome}, 12 anos, estreia no kart pela ${equipeBase(equipeId).nome}.`);
    return estado;
  }

  // Parada no box na F4 (para trocar para pneu de chuva), em segundos.
  const LUVAS_F1 = 5; // etapas de salário pagas ao assinar com uma equipe de F1
  const PIT_F4 = 24;

  function iniciarTemporada(estado) {
    sincronizarCategoria(estado);
    const rnd = rngDe(estado);
    const camp = campeonato(estado.campeonato);
    const pistas = Dados.KARTODROMOS[camp.regiao].slice();
    for (let i = pistas.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pistas[i], pistas[j]] = [pistas[j], pistas[i]];
    }
    const escolhidas = pistas.slice(0, camp.etapas || ETAPAS);
    // Da F3 à F1 as etapas seguem a ordem do calendário real (Austrália no começo, Abu Dhabi no fim).
    if (camp.ordem >= 4) escolhidas.sort((a, b) => Dados.KARTODROMOS[camp.regiao].indexOf(a) - Dados.KARTODROMOS[camp.regiao].indexOf(b));
    estado.calendario = escolhidas.map((p) => ({ pista: p.id, clima: Kart.gerarClima(p, camp, rnd) }));
    estado.etapa = 0;
    estado.fase = 'paddock';
    estado.fds = null;
    estado.desenvolvimento = {}; // carro novo a cada ano
    estado.distribuidos = {}; // pontos investidos ficam valendo (não dá mais para devolver)
    // Pneus também zeram a cada ano: o estoque velho sai e a equipe entrega um jogo novo
    // (no kart e na F4, dois slicks e um de chuva; da F3 em diante, um de cada tipo).
    if (estado.temporadas && estado.temporadas.length) {
      estado.pneus = [];
      const kit = quatroPneus(estado) ? tiposPneu(estado) : ['slick', 'slick', 'chuva'];
      for (const t of kit) comprarPneu(estado, t, true);
      noticia(estado, `Temporada nova, pneus novos: a equipe entrega ${listaE(kit.map((t) => nomePneu(estado, t).toLowerCase()).filter((x, i, l) => l.indexOf(x) === i))}${kit.length === 3 ? ' (dois slicks)' : ''}. O estoque do ano passado ficou para trás.`);
    }
    if ((estado.ano > 2027 || estado.etapa > 0) && !camp.categoria) {
      const apoio = Math.round(APOIO_FAMILIA * camp.custo);
      estado.dinheiro += apoio;
      noticia(estado, `A família junta US$ ${apoio.toLocaleString('pt-BR')} para a temporada.`);
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
      : p.confianca >= 45 ? `Tranquilo com o ${Kart.veiculo} e com o próprio ritmo.`
        : p.confianca >= 30 ? 'Inseguro, freando mais cedo do que devia.'
          : 'Sem confiança nenhuma, com medo de errar.';
    const extra = p.moral < 25 ? ' Anda desmotivado e já falou em largar as corridas.' : p.moral >= 80 ? ' Super motivado.' : '';
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
  // Equipe de F4 que cada olheiro oferecia antes (de ponta) -> id do olheiro.
  const ENTRADA_F4_ANTIGA = { 'f4-apex': 'apex-f4', 'f4-lionheart': 'lionheart-f4', 'f4-scorpio': 'scorpio-f4', 'f4-vortex': 'vortex-academia', 'f4-rossa': 'rossa-academia' };
  function migrar(estado) {
    // Carreiras antigas, sem sorteio, continuam com os nomes originais.
    usarNomesEquipes(estado && estado.nomesEquipes);
    if (estado && estado.campeonato) sincronizarCategoria(estado);
    // Ajustes que entraram depois (caster): saves antigos, com o fim de semana em andamento, ganham o padrão.
    if (estado && estado.campeonato) {
      // Ajustes que entraram depois ganham o padrão; valores fora da faixa atual (pressão e cambagem da F1 mudaram de faixa)
      // são trazidos para dentro dela, no passo do knob.
      const completar = (st) => {
        if (!st || typeof st !== 'object') return;
        for (const k of Kart.ORDEM_AJUSTES) {
          const a = Kart.AJUSTES[k];
          if (!(k in st) || typeof st[k] !== 'number') { st[k] = a.padrao; continue; }
          if (a.tipo === 'numero') st[k] = Math.round((Math.max(a.min, Math.min(a.max, st[k])) - a.min) / a.passo) * a.passo + a.min;
          else st[k] = Math.max(0, Math.min(a.opcoes.length - 1, Math.round(st[k])));
        }
      };
      if (estado.fds) { completar(estado.fds.setup); completar(estado.fds.setupCorrida); }
      completar(estado.desafio && estado.desafio.setup);
    }
    if (estado && estado.piloto) estado.piloto.nome = nomeDoPiloto(estado.piloto.nome);
    // Carreiras antigas contavam o motor em etapas; agora são horas (cerca de 0,9 h por etapa).
    if (estado && estado.piloto && !estado.motorEmHoras) { estado.motorHoras = Math.round((estado.motorHoras || 0) * 0.9 * 100) / 100; estado.motorEmHoras = true; }
    if (estado && estado.piloto && estado.piloto.moral == null) {
      estado.piloto.moral = 60;
      estado.piloto.confianca = 50;
    }
    // A F4 passou a começar sempre numa equipe de entrada: vagas guardadas ou propostas ainda abertas
    // de carreiras antigas vão para a equipe nova do mesmo olheiro.
    if (estado && estado.piloto) {
      const doOlheiro = (pr) => {
        const o = Dados.OLHEIROS.find((x) => x.tipo === pr.tipo && (x.nome === pr.nome || ENTRADA_F4_ANTIGA[pr.equipe] === x.id));
        return o ? { ...pr, nome: o.nome, equipe: o.equipe } : pr;
      };
      if (estado.f4Reservada && ENTRADA_F4_ANTIGA[estado.f4Reservada.equipe]) estado.f4Reservada = doOlheiro(estado.f4Reservada);
      if (estado.propostas) estado.propostas = estado.propostas.map((pr) => ((pr.tipo === 'f4' || pr.tipo === 'academia') && ENTRADA_F4_ANTIGA[pr.equipe] ? doOlheiro(pr) : pr));
    }
    if (estado && !estado.evolucao) { estado.evolucao = []; estado.temporadas = []; estado.seguindo = null; }
    // Versões antigas paravam na tela "Rumo à F3": agora a F3 é jogável.
    if (estado && estado.fase === 'f4' && estado.final && estado.final.categoria === 'f3') {
      estado.final = null;
      entrarNaCategoria(estado, { tipo: 'subida', campeonato: 'f3', pago: true, equipe: 'f3-prima' });
    }
    return estado;
  }

  // Seguir um rival: ele aparece no paddock e nos avisos da corrida. Tocar de novo deixa de seguir.
  function seguir(estado, id) {
    estado.seguindo = estado.seguindo === id ? null : id;
  }

  // ---------- equipe, kart e dinheiro ----------
  function custoEtapa(estado) {
    if (estado.campeonato === 'f1') return 0; // na F1 a equipe paga o piloto
    if (estado.contrato && estado.contrato.equipe === estado.equipeId) return estado.contrato.custoEtapa;
    return Math.round(equipeBase(estado.equipeId).custoEtapa * campeonato(estado.campeonato).custo);
  }

  // ---------- banco (só com o Premium) ----------
  // Empréstimo para investir no carro e na carreira: um por vez, pago em parcelas descontadas a cada
  // etapa. Parcela que o caixa não cobre atrasa: multa de 10% no saldo, moral e popularidade caem.
  // Quitar antes do prazo dá desconto de metade dos juros que ainda não venceram.
  const LIMITE_EMPRESTIMO = { regional: 7000, nacional: 14000, internacional: 29000, f4: 135000, f3: 900000, f2: 2800000, f1: 10000000 };
  const PRAZOS_EMPRESTIMO = { 4: 0.08, 8: 0.15, 12: 0.25 }; // etapas: juros totais
  const MULTA_ATRASO = 0.1;
  // Popularidade alta aumenta o crédito (até +50%).
  const limiteEmprestimo = (estado) => Math.round((LIMITE_EMPRESTIMO[estado.campeonato] || 7000) * (1 + Math.min(100, estado.piloto.popularidade) / 200) / 1000) * 1000;
  function simularEmprestimo(valor, prazo) {
    const juros = Math.round(valor * PRAZOS_EMPRESTIMO[prazo]);
    return { valor, prazo, juros, total: valor + juros, parcela: Math.ceil((valor + juros) / prazo) };
  }
  function pegarEmprestimo(estado, valor, prazo) {
    if (!premium) return pedePremium('O banco é do Premium: empréstimo para investir no carro e na carreira.');
    if (estado.fase === 'fds') return { ok: false, erro: 'O banco atende no paddock, entre as etapas.' };
    if (estado.emprestimo) return { ok: false, erro: 'Quite o empréstimo atual antes de pegar outro.' };
    if (!PRAZOS_EMPRESTIMO[prazo]) return { ok: false, erro: 'Prazo inválido.' };
    valor = Math.round(valor);
    if (!(valor >= 1000) || valor > limiteEmprestimo(estado)) return { ok: false, erro: 'Valor fora do limite do banco.' };
    const s = simularEmprestimo(valor, +prazo);
    estado.emprestimo = { valor, prazo: +prazo, juros: s.juros, saldo: s.total, parcela: s.parcela, restantes: +prazo, atrasos: 0 };
    estado.dinheiro += valor;
    noticia(estado, `${estado.piloto.nome} pega US$ ${valor.toLocaleString('pt-BR')} emprestados no banco, em ${prazo} parcelas de US$ ${s.parcela.toLocaleString('pt-BR')}.`);
    return { ok: true, ...s };
  }
  // Quanto custa quitar hoje: o saldo menos metade dos juros que ainda não venceram.
  function valorQuitacao(estado) {
    const e = estado.emprestimo;
    if (!e) return 0;
    const jurosFuturos = e.juros * Math.min(e.restantes, e.prazo) / e.prazo;
    return Math.max(0, Math.round(e.saldo - jurosFuturos / 2));
  }
  function quitarEmprestimo(estado) {
    const e = estado.emprestimo;
    if (!e) return { ok: false, erro: 'Não há empréstimo.' };
    const valor = valorQuitacao(estado);
    if (estado.dinheiro < valor) return { ok: false, erro: 'Dinheiro insuficiente para quitar.' };
    estado.dinheiro -= valor;
    estado.emprestimo = null;
    noticia(estado, `${estado.piloto.nome} quita o empréstimo do banco antes do prazo.`);
    return { ok: true, valor };
  }
  // A cada etapa: desconta a parcela ou registra o atraso.
  function cobrarParcela(estado) {
    const e = estado.emprestimo;
    if (!e) return;
    const parcela = Math.min(e.parcela, e.saldo);
    if (estado.dinheiro >= parcela) {
      estado.dinheiro -= parcela;
      e.saldo -= parcela;
      e.restantes = Math.max(0, e.restantes - 1);
      if (e.saldo <= 0) {
        estado.emprestimo = null;
        noticia(estado, `Última parcela paga: ${estado.piloto.nome} está livre do banco.`);
      } else if (e.restantes === 0) {
        e.restantes = 1; // sobrou saldo de multas: mais uma parcela
        e.parcela = e.saldo;
      }
      return;
    }
    const multa = Math.round(parcela * MULTA_ATRASO);
    e.saldo += multa;
    e.atrasos += 1;
    e.parcela = Math.ceil(e.saldo / Math.max(1, e.restantes));
    mexerCabeca(estado, { moral: -6 });
    estado.piloto.popularidade = Math.max(0, Math.round((estado.piloto.popularidade - 2) * 10) / 10);
    noticia(estado, `Parcela do banco atrasada: multa de US$ ${multa.toLocaleString('pt-BR')}. Os patrocinadores não gostam de piloto com conta atrasada.`);
  }

  // Quanto custa o ano seguinte com esta equipe, para a escolha no relatório. O contrato do monoposto
  // só continua na mesma equipe e na mesma categoria; trocando, vale o preço cheio. Na F1, salário (negativo).
  function custoTemporada(estado, campId, equipeId) {
    const camp = campeonato(campId);
    const base = equipeBase(equipeId);
    const etapas = camp.etapas || ETAPAS;
    const contrato = estado.contrato && estado.contrato.equipe === equipeId && campId === estado.campeonato && camp.ordem >= 3;
    if (campId === 'f1') {
      const salario = (contrato && estado.contrato.salario) || base.salario || 0;
      return { etapa: -salario, temporada: -salario * etapas, etapas, contrato };
    }
    const etapa = contrato ? estado.contrato.custoEtapa : Math.round(base.custoEtapa * camp.custo / 100) * 100;
    return { etapa, temporada: etapa * etapas, etapas, contrato };
  }

  // Salário por etapa (só na F1).
  function salarioEtapa(estado) {
    if (estado.campeonato !== 'f1') return 0;
    if (estado.contrato && estado.contrato.equipe === estado.equipeId && estado.contrato.salario) return estado.contrato.salario;
    return equipeBase(estado.equipeId).salario || 0;
  }

  function carroDe(estado, equipeId, jogador) {
    const e = equipeBase(equipeId);
    const cansaco = jogador ? Math.max(0, estado.motorHoras - HORAS_REVISAO) * 1.6 : 0;
    // Na F1 o jogador pode pagar por desenvolvimento do carro (vale a temporada).
    const dev = jogador && estado.campeonato === 'f1' ? (estado.desenvolvimento || {}) : {};
    const d = (area) => (dev[area] || 0) * GANHO_DEV;
    return {
      motor: Math.round(e.material - cansaco + d('motor')), aero: e.material + d('aero'), chassi: e.material + d('chassi'),
      confiabilidade: Math.round(82 + e.organizacao / 7 - cansaco),
      ...(jogador ? { box: EQUIPE_BOX[nivelBox(estado)] } : {}),
    };
  }

  // ---------- desenvolvimento do carro (F1) ----------
  // Peças novas para o carro do jogador: cada nível soma 2 pontos na área até o fim da temporada
  // (no ano seguinte o carro é novo). É para onde vai o dinheiro grande da F1.
  const AREAS_DEV = { aero: 'Aerodinâmica', motor: 'Motor', chassi: 'Chassi' };
  const NIVEL_DEV_MAX = 3;
  const GANHO_DEV = 2;
  // Peças novas (US$, 1º nível; cada nível seguinte custa mais um pacote): aero = asas + assoalho,
  // motor = unidade de potência híbrida, chassi = monocoque + câmbio.
  const PRECO_DEV = { aero: 500000, motor: 9500000, chassi: 1400000 };
  const nivelDev = (estado, area) => (estado.desenvolvimento && estado.desenvolvimento[area]) || 0;
  const precoDev = (estado, area) => PRECO_DEV[area] * (nivelDev(estado, area) + 1);
  function desenvolverCarro(estado, area) {
    if (estado.campeonato !== 'f1') return { ok: false, erro: 'O desenvolvimento do carro é da F1.' };
    if (!AREAS_DEV[area]) return { ok: false, erro: 'Área inválida.' };
    if (estado.fase === 'fds') return { ok: false, erro: 'Peças novas só entram no paddock.' };
    if (nivelDev(estado, area) >= NIVEL_DEV_MAX) return { ok: false, erro: `${AREAS_DEV[area]} já está no máximo desta temporada.` };
    const preco = precoDev(estado, area);
    if (estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente.' };
    estado.dinheiro -= preco;
    estado.desenvolvimento = { ...(estado.desenvolvimento || {}), [area]: nivelDev(estado, area) + 1 };
    noticia(estado, `Peças novas de ${AREAS_DEV[area].toLowerCase()} no carro de ${estado.piloto.nome}.`);
    return { ok: true };
  }

  // ---------- preparação do piloto ----------
  // Preparador físico e simulador: cada nível sobe o teto em 1 e já melhora dois atributos.
  const PREPARACAO = {
    fisico: { nome: 'Preparador físico', texto: 'Mais resistência e reflexo: consistência e largada.', atributos: ['consistencia', 'largada'] },
    simulador: { nome: 'Simulador', texto: 'Voltas virtuais em cada pista: ritmo e cuidado com os pneus.', atributos: ['ritmo', 'pneus'] },
  };
  const NIVEL_PREP_MAX = 2;
  const nivelPrep = (estado, tipo) => (estado.preparacao && estado.preparacao[tipo]) || 0;
  const precoPrep = (estado, tipo) => Math.round(15000 * campeonato(estado.campeonato).custo * (nivelPrep(estado, tipo) + 1) / 1000) * 1000;
  function prepararPiloto(estado, tipo) {
    const info = PREPARACAO[tipo];
    if (!info) return { ok: false, erro: 'Preparação inválida.' };
    if (estado.fase === 'fds') return { ok: false, erro: 'A preparação é feita entre as etapas.' };
    if (nivelPrep(estado, tipo) >= NIVEL_PREP_MAX) return { ok: false, erro: `${info.nome} já está no nível máximo.` };
    const preco = precoPrep(estado, tipo);
    if (estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente.' };
    estado.dinheiro -= preco;
    estado.preparacao = { ...(estado.preparacao || {}), [tipo]: nivelPrep(estado, tipo) + 1 };
    const p = estado.piloto;
    sincronizarTeto(estado);
    for (const a of info.atributos) p[a] = Math.min(p.potencial, p[a] + 1);
    noticia(estado, `${p.nome} começa a trabalhar com ${tipo === 'fisico' ? 'um preparador físico' : 'o simulador'} (nível ${nivelPrep(estado, tipo)}).`);
    return { ok: true };
  }

  // O que os olheiros acham do teto do piloto: uma faixa que fica mais estreita com as temporadas.
  function tetoEstimado(estado) {
    const p = estado.piloto;
    const largura = Math.max(2, 6 - 2 * (estado.temporadas || []).length);
    const desvio = ((estado.seed || 0) % 3) - 1; // os olheiros erram um pouco, sempre para o mesmo lado
    const centro = p.potencial + desvio;
    return { min: Math.round(centro - largura / 2), max: Math.round(centro + largura / 2) };
  }

  // ---------- equipe de box (monopostos) ----------
  // Treinar e equipar os mecânicos do box: parada mais rápida (alguns centésimos), mais regular e
  // com menos chance de problema. O nível 1 é o de todo mundo; o 2 e o 3 são do Premium e custam dinheiro.
  const EQUIPE_BOX = {
    1: { ganho: 0, regularidade: 1, falha: 0.04, nome: 'Equipe padrão' },
    2: { ganho: 0.12, regularidade: 0.8, falha: 0.03, nome: 'Equipe treinada' },
    3: { ganho: 0.25, regularidade: 0.6, falha: 0.015, nome: 'Equipe de elite' },
  };
  const NIVEL_BOX_MAX = 3;
  const nivelBox = (estado) => Math.min(NIVEL_BOX_MAX, Math.max(1, estado.nivelBox || 1));
  const precoBox = (estado) => Math.round(30000 * campeonato(estado.campeonato).custo * nivelBox(estado) / 1000) * 1000;
  function melhorarBox(estado) {
    if (categoriaDe(estado) === 'kart') return { ok: false, erro: 'No kart não tem pit stop.' };
    if (nivelBox(estado) >= NIVEL_BOX_MAX) return { ok: false, erro: 'A equipe de box já está no nível máximo.' };
    if (!premium) return pedePremium('Melhorar a equipe de box é do Premium.');
    const preco = precoBox(estado);
    if (estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente.' };
    estado.dinheiro -= preco;
    estado.nivelBox = nivelBox(estado) + 1;
    noticia(estado, `A equipe de box de ${estado.piloto.nome} agora é nível ${estado.nivelBox}/${NIVEL_BOX_MAX}: ${EQUIPE_BOX[estado.nivelBox].nome.toLowerCase()}.`);
    return { ok: true, preco };
  }

  // Estoque de pneus: começa com MAX_PNEUS jogos; dá para comprar mais espaço, até o limite da categoria.
  const MAX_PNEUS = 4;
  const LIMITE_ESPACO = { kart: 8, f4: 10, f3: 12, f2: 14, f1: 16 };
  const PRECO_ESPACO = 2500; // por vaga, multiplicado pelo custo do campeonato e encarecendo a cada vaga
  const espacoPneus = (estado) => MAX_PNEUS + (estado.espacoExtra || 0);
  const limiteEspaco = (estado) => LIMITE_ESPACO[estado.campeonato] || LIMITE_ESPACO.kart;
  const precoEspaco = (estado) => Math.round(PRECO_ESPACO * campeonato(estado.campeonato).custo * (1 + 0.25 * (estado.espacoExtra || 0)) / 100) * 100;
  function comprarEspaco(estado) {
    if (!premium) return pedePremium('Mais espaço no estoque de pneus é do Premium.');
    if (espacoPneus(estado) >= limiteEspaco(estado)) return { ok: false, erro: `O estoque já está no máximo desta categoria (${limiteEspaco(estado)} jogos).` };
    const preco = precoEspaco(estado);
    if (estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente.' };
    estado.dinheiro -= preco;
    estado.espacoExtra = (estado.espacoExtra || 0) + 1;
    return { ok: true, preco };
  }
  const VIDA_PNEU = 26; // voltas até o pneu "cair"
  // Pneu novo (zerado) rende menos nas primeiras voltas; amaciado (1 a 4 voltas) rende o máximo.
  const AMACIAR_VOLTAS = 2;
  // Da F3 em diante o estoque tem quatro tipos: macio (o slick), médio, duro e chuva.
  // Cada um seco vira um composto na corrida. Para correr é obrigatório ter o de chuva e um composto de seco
  // (dois na F2 e na F1, que têm parada); com menos que os quatro dá para ir, mas o fim de semana é só com o
  // estoque (sem compra na pista).
  const TIPOS_KART = ['slick', 'chuva'];
  const TIPOS_F3 = ['slick', 'medio', 'duro', 'chuva'];
  const COMPOSTO_DO_TIPO = { slick: 'M', medio: 'Md', duro: 'D' };
  const TIPO_DO_COMPOSTO = { M: 'slick', Md: 'medio', D: 'duro' };
  const quatroPneus = (estado) => campeonato(estado.campeonato).ordem >= 4;
  const tiposPneu = (estado) => (quatroPneus(estado) ? TIPOS_F3 : TIPOS_KART);
  const nomePneu = (estado, tipo) => (quatroPneus(estado) && tipo === 'slick' ? 'Macio' : Kart.PNEUS_KART[tipo].nome);
  // Voltas até o pneu cair: da F3 em diante depende do composto.
  const vidaDoPneu = (estado, tipo) => (quatroPneus(estado) && COMPOSTO_DO_TIPO[tipo] ? Engine.PNEUS[COMPOSTO_DO_TIPO[tipo]].vida : VIDA_PNEU);
  // Mínimo para correr: o pneu de chuva e os compostos de seco que a corrida pede. Na F3 não há parada,
  // então basta um; na F2 e na F1 a parada obrigatória pede dois diferentes. O resto é opcional
  // (sem ele, os rivais têm uma opção a mais).
  const compostosMinimos = (estado) => (campeonato(estado.campeonato).compostos ? 2 : 1);
  // F3 (como a de verdade): um único composto de seco por etapa, definido pelo asfalto da pista
  // (liso: macio; médio: médio; abrasivo: duro). Os outros compostos não servem naquela etapa.
  // Escolha livre de composto e parada obrigatória só na F2 e na F1.
  const COMPOSTO_DO_ASFALTO = { liso: 'slick', medio: 'medio', abrasivo: 'duro' };
  const compostoUnico = (estado) => quatroPneus(estado) && !campeonato(estado.campeonato).compostos;
  function compostoDaEtapa(estado, i = estado.etapa) {
    if (!compostoUnico(estado)) return null;
    const etapa = estado.calendario[i];
    const pista = etapa && Dados.KARTODROMOS[campeonato(estado.campeonato).regiao].find((x) => x.id === etapa.pista);
    return (pista && COMPOSTO_DO_ASFALTO[pista.asfalto]) || 'medio';
  }
  // O pneu de seco "padrão" da etapa: o composto da etapa na F3; o slick (macio) nas outras categorias.
  const secoDaEtapa = (estado) => compostoDaEtapa(estado) || 'slick';
  // Pneu que pode ir para o carro nesta etapa (na F3, só o composto da etapa e o de chuva).
  const pneuValeNaEtapa = (estado, tipo) => !compostoUnico(estado) || tipo === 'chuva' || tipo === compostoDaEtapa(estado);
  function estoqueImpede(estado) {
    if (!quatroPneus(estado)) return null;
    if (compostoUnico(estado)) {
      const comp = compostoDaEtapa(estado);
      const tem = (t) => estado.pneus.some((p) => p.tipo === t);
      if (tem(comp) && tem('chuva')) return null;
      const falta = [tem(comp) ? '' : `o pneu ${nomePneu(estado, comp).toLowerCase()}`, tem('chuva') ? '' : 'o pneu de chuva'].filter(Boolean).join(' e ');
      return `Sem pneu para correr: falta ${falta}. Na F3 cada etapa tem um único composto de seco: em ${pistaAtual(estado).nome} é o ${nomePneu(estado, comp).toLowerCase()}, mais o de chuva.`;
    }
    const minimo = compostosMinimos(estado);
    const secos = ['slick', 'medio', 'duro'].filter((t) => estado.pneus.some((p) => p.tipo === t)).length;
    const chuva = estado.pneus.some((p) => p.tipo === 'chuva');
    if (secos >= minimo && chuva) return null;
    const faltaSeco = secos >= minimo ? '' : secos ? 'mais um composto de seco' : minimo === 2 ? 'dois compostos de seco' : 'um pneu de seco';
    const falta = [faltaSeco, chuva ? '' : 'o pneu de chuva'].filter(Boolean).join(' e ');
    const regra = minimo === 2
      ? `Na ${campeonato(estado.campeonato).curto} a parada é obrigatória: é preciso ter dois compostos de seco (macio, médio ou duro) e o de chuva.`
      : `Na ${campeonato(estado.campeonato).curto} é preciso ter pelo menos um composto de seco (macio, médio ou duro) e o de chuva.`;
    return `Sem pneu para correr: falta ${falta}. ${regra}`;
  }
  // "a, b e c"
  const listaE = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}` : l[0] || '');
  const faltaNoEstoque = (estado) => (!quatroPneus(estado) ? []
    : (compostoUnico(estado) ? [compostoDaEtapa(estado), 'chuva'] : TIPOS_F3).filter((t) => !estado.pneus.some((p) => p.tipo === t)));

  // Preço do pneu sobe com a categoria até a F3; na F2 e na F1 fica no nível da F3 (como o mecânico).
  const FATOR_PNEU = { regional: 1, nacional: 1.25, internacional: 1.6, f4: 3, f3: 6, f2: 10, f1: 12 };
  const custoPneu = (estado) => FATOR_PNEU[estado.campeonato] || 1;

  const pneuNovo = (p) => p.uso < 1;
  const pneuAmaciado = (p) => p.uso >= 1 && p.uso <= 4;
  // Segundos a mais numa volta por causa de pneu ainda zerado (some depois de ~3 voltas).
  const penalidadeZerado = (uso) => Math.max(0, 0.3 * (1 - uso / 2));

  function comprarPneu(estado, tipo, gratis = false) {
    if (!tiposPneu(estado).includes(tipo)) return { ok: false, erro: 'Esse pneu não é usado nesta categoria.' };
    // Da F3 em diante o fim de semana é com o estoque que foi para a pista: compra só no paddock.
    if (!gratis && quatroPneus(estado) && estado.fase === 'fds') return { ok: false, erro: 'Na pista não dá para comprar pneu: o fim de semana é com o estoque que você trouxe.' };
    // Estoque cheio sem o Premium: é a hora de mostrar o espaço extra.
    if (estado.pneus.length >= espacoPneus(estado) && !premium && !gratis && espacoPneus(estado) < limiteEspaco(estado)) {
      return pedePremium(`Estoque cheio (${espacoPneus(estado)} jogos). Com o Premium cabem até ${limiteEspaco(estado)} nesta categoria. Sem ele, venda, doe ou descarte um pneu para abrir vaga.`);
    }
    if (estado.pneus.length >= espacoPneus(estado)) {
      const mais = espacoPneus(estado) < limiteEspaco(estado) ? ', ou compre mais espaço na oficina' : ` (o estoque já está no máximo desta categoria)`;
      return { ok: false, erro: `Estoque cheio (${espacoPneus(estado)} jogos): venda, doe ou descarte um pneu${mais}.` };
    }
    const preco = Math.round(Kart.PNEUS_KART[tipo].preco * custoPneu(estado));
    if (!gratis && estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente para os pneus.' };
    if (!gratis) estado.dinheiro -= preco;
    // Jogo novo entra junto com os do mesmo tipo (macio, médio, duro e chuva, nessa ordem).
    estado.pneus.push({ id: `pn${estado.proxPneu++}`, tipo, uso: 0 });
    estado.pneus.sort((a, b) => TIPOS_F3.indexOf(a.tipo) - TIPOS_F3.indexOf(b.tipo));
    return { ok: true };
  }

  // Repor estoque (oficina): compra o que falta para o próximo fim de semana. Da F3 em diante, um jogo de
  // cada tipo que faltar; em toda categoria, um seco novo para classificar e um de chuva se não houver.
  function reporEstoque(estado) {
    if (estado.fase === 'fds') return { ok: false, erro: 'Na pista não dá para comprar pneu.' };
    const querer = [...faltaNoEstoque(estado)];
    const seco = secoDaEtapa(estado);
    if (!querer.includes(seco) && !estado.pneus.some((p) => p.tipo === seco && p.uso < 5)) querer.unshift(seco);
    if (!querer.includes('chuva') && !estado.pneus.some((p) => p.tipo === 'chuva')) querer.push('chuva');
    if (!querer.length) return { ok: false, erro: 'O estoque já está em dia.' };
    const comprados = [];
    let gasto = 0;
    for (const t of querer) {
      const antes = estado.dinheiro;
      const r = comprarPneu(estado, t);
      if (!r.ok) {
        if (!comprados.length) return r; // estoque cheio (com a oferta do Premium) ou sem dinheiro
        break;
      }
      comprados.push(nomePneu(estado, t).toLowerCase());
      gasto += antes - estado.dinheiro;
    }
    return { ok: true, comprados, gasto, texto: listaE(comprados) };
  }

  function descartarPneu(estado, id) {
    estado.pneus = estado.pneus.filter((p) => p.id !== id);
  }

  // Venda de pneu usado para equipes menores: até metade do preço, menos quanto mais gasto.
  function valorVendaPneu(estado, p) {
    const preco = Kart.PNEUS_KART[p.tipo].preco * custoPneu(estado);
    return Math.round(preco * Math.max(0.05, 0.5 * (1 - p.uso / vidaDoPneu(estado, p.tipo))) / 10) * 10;
  }

  // Vender ou doar só pneu no fim (80% gasto ou mais): ninguém quer um jogo pela metade, e o estoque
  // não vira atalho. Jogar fora pode sempre, mas sem retorno.
  const GASTO_PARA_SAIR = 0.8;
  const pneuNoFim = (estado, p) => p.uso >= vidaDoPneu(estado, p.tipo) * GASTO_PARA_SAIR;
  const ERRO_MEIA_VIDA = 'Só dá para vender ou doar pneu no fim da vida (80% gasto ou mais). Para abrir vaga antes disso, só jogando fora.';

  // Depois da etapa: jogo que chegou ao fim vira notícia (uma vez por jogo), para conferir a oficina.
  function avisarPneusNoFim(estado) {
    const novos = estado.pneus.filter((p) => pneuNoFim(estado, p) && !p.avisadoFim);
    if (!novos.length) return;
    for (const p of novos) p.avisadoFim = true;
    const numero = (p) => estado.pneus.filter((x) => x.tipo === p.tipo).indexOf(p) + 1;
    const nomes = novos.map((p) => `${nomePneu(estado, p.tipo).toLowerCase()} #${numero(p)}`).join(', ');
    noticia(estado, `${novos.length > 1 ? 'Pneus' : 'Pneu'} no fim da vida (${nomes}): verifique os pneus na oficina antes da próxima corrida. Dá para vender ou doar e abrir vaga para um jogo novo.`);
  }

  function venderPneu(estado, id) {
    const p = pneuPorId(estado, id);
    if (!p) return { ok: false, erro: 'Pneu não encontrado.' };
    if (estado.fase === 'fds') return { ok: false, erro: 'Pneu só se vende no paddock.' };
    if (!pneuNoFim(estado, p)) return { ok: false, erro: ERRO_MEIA_VIDA };
    const valor = valorVendaPneu(estado, p);
    estado.dinheiro += valor;
    descartarPneu(estado, id);
    return { ok: true, valor };
  }

  // Doar para a escolinha de kart: sem dinheiro, mas o piloto e o público gostam (uma vez por etapa).
  function doarPneu(estado, id) {
    const p = pneuPorId(estado, id);
    if (!p) return { ok: false, erro: 'Pneu não encontrado.' };
    if (estado.fase === 'fds') return { ok: false, erro: 'A doação é feita no paddock.' };
    if (!pneuNoFim(estado, p)) return { ok: false, erro: ERRO_MEIA_VIDA };
    if (estado.doacaoEtapa === `${estado.ano}-${estado.etapa}`) return { ok: false, erro: 'Você já doou nesta etapa.' };
    descartarPneu(estado, id);
    estado.doacaoEtapa = `${estado.ano}-${estado.etapa}`;
    mexerCabeca(estado, { moral: 3 }, 'Doou pneus para a escolinha');
    estado.piloto.popularidade = Math.min(100, Math.round((estado.piloto.popularidade + 1) * 10) / 10);
    noticia(estado, `${estado.piloto.nome} doa pneus para a escolinha de kart.`);
    return { ok: true };
  }

  // Amaciar: duas voltas rápidas com o pneu novo no treino, sem gastar uma saída.
  function amaciarPneu(estado) {
    const fds = estado.fds;
    if (!fds || fds.sessao !== 'treino') return { ok: false, erro: 'Só dá para amaciar pneu no treino livre.' };
    const p = pneuPorId(estado, fds.pneuId);
    if (!p || !pneuNovo(p)) return { ok: false, erro: 'Escolha um jogo de pneus novo para amaciar.' };
    p.uso = AMACIAR_VOLTAS;
    somarHoras(estado, HORAS.amaciar);
    return { ok: true };
  }

  // O motor só é revisado no paddock: no fim de semana não dá para mexer nele.
  function revisarMotor(estado) {
    if (estado.fase === 'fds') return { ok: false, erro: 'Não dá para mexer no motor durante o fim de semana.' };
    if (estado.motorQuebrado) return { ok: false, erro: 'O motor engripou: precisa de retífica, não de revisão.' };
    if (!(estado.motorHoras > 0)) return { ok: false, erro: 'O motor acabou de ser revisado: está 100%.' };
    const custo = precoRevisao(estado);
    if (estado.dinheiro < custo) return { ok: false, erro: 'Dinheiro insuficiente para a revisão.' };
    estado.dinheiro -= custo;
    estado.motorHoras = 0;
    return { ok: true };
  }

  // ---------- mecânico ----------
  // O kart não vem com mecânico: o jogador acerta sozinho. Dá para contratar um para o fim de semana:
  // - iniciante: paga uma vez e fica o fim de semana todo; dá palpites.
  // - experiente: análise técnica (o que mudar e quanto); fora da sessão em que foi contratado, cobra hora extra.
  // - profissional: monta o kart para você; muito caro, e também cobra hora extra.
  const MECANICOS = {
    iniciante: { nome: 'Mecânico iniciante', icone: 'chave', preco: 400, extra: 0, qualidade: 60, faz: 'palpite',
      descricao: 'Dá palpites sobre o que mexer. Fica o fim de semana todo.' },
    experiente: { nome: 'Mecânico experiente', icone: 'ajustes', preco: 800, extra: 300, qualidade: 82, faz: 'tecnica',
      descricao: 'Anos de pista: diz o que mudar e quanto. Cobra hora extra a cada sessão a mais.' },
    pro: { nome: 'Técnico profissional', icone: 'trofeu', preco: 2000, extra: 800, qualidade: 96, faz: 'monta',
      descricao: 'Monta o acerto para você. Muito caro, e cobra hora extra a cada sessão a mais.' },
  };
  const SESSOES_MECANICO = ['treino', 'quali', 'grid'];

  // Na F2 e na F1 a equipe já tem engenheiros: o mecânico contratado à parte não acompanha o custo da categoria.
  const FATOR_MECANICO = { regional: 1, nacional: 1.25, internacional: 1.6, f4: 3, f3: 5, f2: 6, f1: 6 };
  const custoMecanico = (estado) => FATOR_MECANICO[estado.campeonato] || 1;
  const precoMecanico = (estado, tipo) => Math.round(MECANICOS[tipo].preco * custoMecanico(estado) / 50) * 50;
  const precoHoraExtra = (estado, tipo) => Math.round(MECANICOS[tipo].extra * custoMecanico(estado) / 50) * 50;

  // O mecânico contratado (ou null). Carreiras antigas guardavam só true.
  function mecanicoDoFds(fds) {
    if (!fds || !fds.mecanico) return null;
    if (fds.mecanico === true) fds.mecanico = { tipo: 'experiente', sessoes: { treino: true }, usos: {} };
    return fds.mecanico;
  }

  // O mecânico está trabalhando nesta sessão?
  function mecanicoAtivo(estado) {
    const m = mecanicoDoFds(estado.fds);
    return !!m && (m.tipo === 'iniciante' || !!m.sessoes[estado.fds.sessao]);
  }

  function contratarMecanico(estado, tipo = 'iniciante') {
    const fds = estado.fds;
    if (!MECANICOS[tipo]) return { ok: false, erro: 'Mecânico desconhecido.' };
    if (!fds || !SESSOES_MECANICO.includes(fds.sessao)) return { ok: false, erro: 'O mecânico é contratado no fim de semana, antes da largada.' };
    if (mecanicoDoFds(fds)) return { ok: false, erro: 'Você já tem um mecânico neste fim de semana.' };
    const preco = precoMecanico(estado, tipo);
    if (estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente para contratar o mecânico.' };
    estado.dinheiro -= preco;
    fds.mecanico = { tipo, sessoes: { [fds.sessao]: true }, usos: {} };
    return { ok: true, preco };
  }

  // Hora extra: o experiente e o profissional trabalham numa sessão a mais.
  function pagarHoraExtra(estado) {
    const m = mecanicoDoFds(estado.fds);
    if (!m) return { ok: false, erro: 'Você está sem mecânico.' };
    if (mecanicoAtivo(estado)) return { ok: false, erro: 'O mecânico já está trabalhando nesta sessão.' };
    const preco = precoHoraExtra(estado, m.tipo);
    if (estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente para a hora extra.' };
    estado.dinheiro -= preco;
    m.sessoes[estado.fds.sessao] = true;
    return { ok: true, preco };
  }

  // Condição da pista na sessão atual (para o mecânico pensar no acerto certo).
  function condicaoSessao(estado, sessao = estado.fds.sessao) {
    const clima = climaAtual(estado);
    if (sessao === 'treino') return Kart.condicao(clima, 'treino', clima.manha.chove);
    return Kart.condicao(clima, sessao === 'grid' ? 'corrida' : 'quali', clima.tarde.inicioChuva === 'quali');
  }

  // O que falta antes de ir para a pista: slick novo, pneu de chuva (se a previsão pede) e revisão do motor.
  function pendenciasEtapa(estado) {
    const lista = [];
    if (estado.motorQuebrado) lista.push({ id: 'retifica', texto: 'Motor engripado: sem retífica, não dá para correr.' });
    const falta = faltaNoEstoque(estado);
    const impede = estoqueImpede(estado);
    // Abaixo do mínimo, a pendência bloqueia; acima dele, é só um aviso.
    for (const t of falta) {
      lista.push({ id: t, bloqueia: !!impede, texto: impede ? `Sem pneu ${nomePneu(estado, t).toLowerCase()} no estoque.` : `Sem pneu ${nomePneu(estado, t).toLowerCase()} no estoque. No fim de semana só dá para usar o que estiver nele, e os rivais vão ter os quatro tipos.` });
    }
    const seco = secoDaEtapa(estado);
    if (!falta.includes(seco) && !estado.pneus.some((p) => p.tipo === seco && p.uso < 5)) {
      lista.push({ id: seco, texto: `Nenhum ${nomePneu(estado, seco).toLowerCase()} novo para a classificação e a corrida${compostoUnico(estado) ? ` (o composto da F3 em ${pistaAtual(estado).nome})` : ''}.` });
    }
    const clima = estado.calendario[estado.etapa] && estado.calendario[estado.etapa].clima;
    if (clima && clima.tarde.chance >= 40 && !falta.includes('chuva') && !estado.pneus.some((p) => p.tipo === 'chuva' && p.uso < 15)) {
      lista.push({ id: 'chuva', texto: `Previsão de ${clima.tarde.chance}% de chuva à tarde e nenhum pneu de chuva em bom estado.` });
    }
    if (!estado.motorQuebrado && motorPedeRevisao(estado)) {
      const h = `${String(estado.motorHoras).replace('.', ',')} h de ${String(HORAS_REVISAO).replace('.', ',')} h`;
      lista.push({ id: 'motor', texto: estado.motorHoras > HORAS_REVISAO ? `Motor cansado, perdendo força (${h}).` : `Motor na hora da revisão (${h}).` });
    }
    return lista;
  }

  const precoPneu = (estado, tipo) => Math.round(Kart.PNEUS_KART[tipo].preco * custoPneu(estado));
  // A retífica também sobe com o desgaste: o motor que engripou depois de muitas horas sem revisão está mais danificado.
  // Preço de referência na hora da revisão (~2,6 h), cerca de 1,3 vezes isso no limite (3,5 h) e mais que o dobro bem depois dele.
  const precoRetifica = (estado, tipo) => {
    const uso = Math.min(1.6, Math.max(0, estado.motorHoras || 0) / HORAS_REVISAO);
    return Math.round(CUSTO_RETIFICA[tipo] * campeonato(estado.campeonato).custo * (0.7 + 0.9 * Math.pow(uso, 1.5)) / 10) * 10;
  };

  // Conserta o motor engripado. Expressa: fica pronto para esta etapa. Normal: o motor fica na oficina e o piloto perde a etapa.
  function retificarMotor(estado, tipo) {
    if (!estado.motorQuebrado) return { ok: false, erro: 'O motor está inteiro.' };
    if (estado.fase === 'fds') return { ok: false, erro: 'Não dá para mexer no motor durante o fim de semana.' };
    const preco = precoRetifica(estado, tipo);
    if (estado.dinheiro < preco) return { ok: false, erro: 'Dinheiro insuficiente para a retífica.' };
    estado.dinheiro -= preco;
    estado.motorQuebrado = false;
    estado.motorHoras = 0;
    if (tipo === 'normal') pularEtapa(estado, 'motor');
    return { ok: true };
  }

  // Quanto mais gasto o motor, mais cara a revisão: no meio do caminho (na hora da revisão, ~2,6 h) custa o preço de referência;
  // logo depois de uma corrida sai por menos da metade, e passado o limite chega a mais que o dobro.
  const precoRevisao = (estado) => {
    const uso = Math.min(1.6, Math.max(0, estado.motorHoras || 0) / HORAS_REVISAO);
    return Math.round(CUSTO_REVISAO * campeonato(estado.campeonato).custo * (0.3 + 1.1 * Math.pow(uso, 1.5)) / 10) * 10;
  };

  // ---------- patrocínio ----------
  function gerarOfertasPatrocinio(estado, rnd, quantidade) {
    const pop = estado.piloto.popularidade;
    const porte = pop < 15 ? 0 : pop < 40 ? 1 : 2;
    const camp = campeonato(estado.campeonato);
    for (let i = 0; i < quantidade; i++) {
      const empresa = sortear(rnd, Dados.PATROCINADORES[porte]);
      if (estado.patrocinios.some((p) => p.empresa === empresa) || estado.ofertasPatrocinio.some((p) => p.empresa === empresa)) continue;
      const porEtapa = Math.round((1300 + Math.min(pop, 80) * 30) * [1, 1.3, 1.6][porte] * camp.patroc * (0.7 + rnd() * 0.6) / 100) * 100;
      const meta = rnd() < 0.5
        ? { tipo: 'posicao', alvo: Math.round(limitar(10 - porte * 3 + Math.floor(rnd() * 5) - 2, 1, 15)) }
        : { tipo: 'podios', alvo: 1 + porte + Math.floor(rnd() * 2) };
      estado.ofertasPatrocinio.push({
        id: `pt${estado.proxId++}`, empresa, porEtapa, meta, bonus: Math.round(porEtapa * (2 + porte) / 100) * 100,
        expira: estado.etapa + 2,
      });
      // A oferta também chega nas notícias (o sino), com atalho para o cartão de patrocínio nas Finanças.
      noticia(estado, `${empresa} quer patrocinar ${estado.piloto.nome}: US$ ${porEtapa.toLocaleString('pt-BR')} por etapa. Veja a oferta nas Finanças.`);
    }
  }

  function textoMeta(meta) {
    if (meta.tipo === 'podios') return `${meta.alvo} pódio${meta.alvo > 1 ? 's' : ''} na temporada`;
    return meta.alvo === 1 ? 'ser campeão' : `terminar o campeonato no top ${meta.alvo}`;
  }

  // Duração do contrato: 3 ou 6 meses (uma fração do calendário) ou a temporada toda.
  // Contrato curto paga um pouco mais por etapa, mas só o da temporada tem meta e bônus.
  const DURACOES_PATROCINIO = {
    3: { nome: '3 meses', fracao: 1 / 4, extra: 1.15 },
    6: { nome: '6 meses', fracao: 1 / 2, extra: 1.08 },
    temporada: { nome: 'Temporada', fracao: null, extra: 1 },
  };
  // Opções que cabem no que falta da temporada (um contrato curto mais longo que isso não faz sentido).
  function duracoesPatrocinio(estado, of) {
    const faltam = etapasDe(estado) - estado.etapa;
    return Object.entries(DURACOES_PATROCINIO).map(([id, d]) => {
      const etapas = d.fracao ? Math.max(1, Math.round(etapasDe(estado) * d.fracao)) : faltam;
      return { id, nome: d.nome, etapas, porEtapa: Math.round(of.porEtapa * d.extra / 100) * 100, bonus: d.fracao ? 0 : of.bonus };
    }).filter((o) => o.id === 'temporada' || o.etapas < faltam);
  }

  // Contrato curto que acabou: a vaga no macacão fica livre e aparece outra empresa interessada.
  function vencerPatrocinios(estado, rnd) {
    const vencidos = estado.patrocinios.filter((p) => p.ate != null && p.ate <= estado.etapa);
    if (!vencidos.length) return;
    estado.patrocinios = estado.patrocinios.filter((p) => !vencidos.includes(p));
    for (const p of vencidos) noticia(estado, `Acabou o contrato com a ${p.empresa}. A vaga no macacão está livre.`);
    if (estado.etapa < etapasDe(estado)) gerarOfertasPatrocinio(estado, rnd, vencidos.length);
  }

  function aceitarPatrocinio(estado, id, duracao = 'temporada') {
    if (estado.patrocinios.length >= maxPatrocinios()) {
      return premium ? { ok: false, erro: `No máximo ${MAX_PATROCINIOS} patrocinadores no macacão.` }
        : pedePremium(`Sem o Premium cabem ${PATROCINIOS_GRATIS} patrocinadores no macacão.`);
    }
    const of = estado.ofertasPatrocinio.find((o) => o.id === id);
    if (!of) return { ok: false, erro: 'Oferta expirada.' };
    const d = duracoesPatrocinio(estado, of).find((x) => x.id === String(duracao));
    if (!d) return { ok: false, erro: 'Esse prazo não cabe no que falta da temporada.' };
    estado.ofertasPatrocinio = estado.ofertasPatrocinio.filter((o) => o.id !== id);
    estado.patrocinios.push({ ...of, porEtapa: d.porEtapa, bonus: d.bonus, duracao: d.id, ate: d.id === 'temporada' ? null : estado.etapa + d.etapas });
    mexerCabeca(estado, { moral: 2 });
    noticia(estado, `${of.empresa} fecha patrocínio com ${estado.piloto.nome}${d.id === 'temporada' ? ' para a temporada' : ` por ${d.nome}`}.`);
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
    const minhaPos = equipesDaCategoria(estado).findIndex((e) => e.id === estado.equipeId);
    const melhores = equipesDaCategoria(estado).slice(0, minhaPos);
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

  // Propostas da categoria seguinte: quanto melhor a posição, melhor a equipe.
  // P1 e P2 entram pelo programa de jovens (a equipe paga); P3 e P4 pagam 60%. Na F1, salário.
  function propostasDeSubida(estado, destino, pos, rnd) {
    const lista = Dados.EQUIPES_MONO[destino];
    // Na F1 o estreante começa numa equipe do meio: as de ponta chamam depois, por resultado.
    const faixas = (destino === 'f1' ? { 1: [4, 6], 2: [5, 7], 3: [6, 8], 4: [7, 9] } : { 1: [0, 2], 2: [1, 3], 3: [3, 5], 4: [5, 7] })[pos];
    const sorteio = () => faixas[0] + Math.floor(rnd() * (faixas[1] - faixas[0] + 1));
    const indices = pos === 1 ? [...new Set([faixas[0], sorteio()])] : [sorteio()];
    const prox = campeonato(destino);
    return indices.map((i) => {
      const e = lista[Math.min(i, lista.length - 1)];
      const pago = pos <= 2;
      const texto = destino === 'f1'
        ? `Vaga de piloto titular na ${prox.curto}. Salário de US$ ${e.salario.toLocaleString('pt-BR')} por etapa e luvas de US$ ${(e.salario * LUVAS_F1).toLocaleString('pt-BR')} ao assinar.`
        : pago ? `Vaga na ${prox.curto} pelo programa de jovens pilotos: a equipe paga a temporada.`
          : `Vaga na ${prox.curto} para o próximo ano. Você paga 40% do orçamento da equipe.`;
      return { id: `pr${estado.proxId++}`, tipo: 'subida', campeonato: destino, pago, parte: pago ? 0 : 0.4, equipe: e.id, nome: `${e.nome} (${prox.curto})`, texto };
    });
  }

  function aceitarProposta(estado, id) {
    const pr = estado.propostas.find((p) => p.id === id);
    if (!pr) return { ok: false, erro: 'Proposta expirada.' };
    if (pr.tipo === 'subida') return entrarNaCategoria(estado, pr);
    if (pr.tipo === 'f3') return entrarNaCategoria(estado, { tipo: 'subida', campeonato: 'f3', pago: true, equipe: 'f3-prima' }); // proposta de versão antiga
    if (pr.tipo === 'f4' || pr.tipo === 'academia') return entrarNaCategoria(estado, { ...pr, campeonato: 'f4', pago: pr.tipo === 'academia' });
    if (estado.dinheiro < pr.multa) return { ok: false, erro: 'Dinheiro insuficiente para pagar a multa de rescisão.' };
    estado.dinheiro -= pr.multa;
    const antiga = estado.equipeId;
    // O rival mais fraco da nova equipe vai para a sua antiga vaga.
    const daNova = estado.rivais.filter((r) => r.equipe === pr.equipe).sort((a, b) => nota(a) - nota(b));
    if (daNova.length >= 2) daNova[0].equipe = antiga;
    estado.equipeId = pr.equipe;
    novoDuelo(estado); // companheiro novo, placar novo
    estado.contrato = { equipe: pr.equipe, custoEtapa: pr.custoEtapa, segundoPiloto: pr.segundoPiloto, tipo: pr.tipo };
    mexerCabeca(estado, { moral: 5 });
    estado.propostas = estado.propostas.filter((p) => p.tipo === 'f4' || p.tipo === 'academia');
    noticia(estado, `${estado.piloto.nome} troca a ${equipeBase(antiga).nome} pela ${pr.nome}.`);
    if (pr.tipo === 'furada') noticia(estado, `Boatos no paddock: a ${pr.nome} anda atrasando pagamentos e o material não é o que dizem...`);
    return { ok: true };
  }

  // Atalho do modo desenvolvedor: a carreira já começa numa categoria de monoposto, com a idade e a
  // evolução de quem subiu até ali (F4 aos 15, F3 aos 16, F2 aos 17, F1 aos 18), numa equipe do meio.
  const INICIO_DEV = {
    f4: { idade: 15, ganho: 18, popularidade: 35, equipe: 'f4-apex' },
    f3: { idade: 16, ganho: 22, popularidade: 45, equipe: 'f3-campo' },
    f2: { idade: 17, ganho: 26, popularidade: 55, equipe: 'f2-hitec' },
    f1: { idade: 18, ganho: 30, popularidade: 65, equipe: 'f1-grove' },
  };
  function comecarEm(estado, campId) {
    const ini = INICIO_DEV[campId] || INICIO_DEV.f4;
    const p = estado.piloto;
    estado.ano += ini.idade - p.idade;
    p.idade = ini.idade;
    for (const a of ATRIBUTOS) p[a] = Math.min(tetoDe(estado, campId), p[a] + ini.ganho);
    p.popularidade = ini.popularidade;
    estado.dinheiro = Math.round(120000 * campeonato(campId).custo / 4 / 1000) * 1000;
    estado.noticias = [];
    // Atalho de teste: chega com o estoque da categoria (o do kart fica para trás).
    estado.pneus = [];
    if (campeonato(campId).ordem < 4) for (const t of ['slick', 'slick', 'chuva']) comprarPneu(estado, t, true);
    return entrarNaCategoria(estado, { tipo: 'subida', campeonato: campId, pago: true, equipe: ini.equipe });
  }
  const comecarNaF4 = (estado) => comecarEm(estado, 'f4');

  // Assina com uma equipe de monoposto (F4, F3, F2 ou F1) e começa a temporada lá.
  function entrarNaCategoria(estado, pr) {
    const campId = pr.campeonato || 'f4';
    const camp = campeonato(campId);
    const equipeId = pr.equipe || Dados.EQUIPES_MONO[campId][2].id;
    const vinhaDoKart = categoriaDe(estado) === 'kart';
    estado.campeonato = campId;
    sincronizarTeto(estado);
    estado.equipeId = equipeId;
    const base = equipeBase(equipeId);
    estado.contrato = {
      equipe: equipeId, tipo: pr.tipo, segundoPiloto: false,
      custoEtapa: pr.pago || campId === 'f1' ? 0 : Math.round(base.custoEtapa * camp.custo * (pr.parte || 0.6) / 100) * 100,
      salario: campId === 'f1' ? base.salario : 0,
    };
    estado.propostas = [];
    estado.seguindo = null;
    noticia(estado, vinhaDoKart ? `${estado.piloto.nome} assina com a ${base.nome} e deixa o kart rumo aos monopostos!` : `${estado.piloto.nome} assina com a ${base.nome} e sobe para a ${camp.curto}!`);
    iniciarTemporada(estado);
    noticia(estado, `${estado.piloto.nome} estreia na ${camp.nome} em ${estado.ano}.`);
    // Da F3 em diante são quatro tipos de pneu: na estreia a equipe entrega um jogo de cada um que faltar.
    const falta = faltaNoEstoque(estado);
    for (const t of falta) comprarPneu(estado, t, true);
    if (falta.length) noticia(estado, `A ${base.nome} entrega um jogo de ${listaE(falta.map((t) => nomePneu(estado, t).toLowerCase()))}: ${compostoUnico(estado) ? 'na F3 cada etapa tem um único composto de seco, mais o de chuva' : `na ${camp.curto} é preciso ter macio, médio, duro e chuva no estoque`}.`);
    // Chegar à F1 é o fim da escada: primeiro a festa da Superlicença, depois o paddock.
    // Ao assinar, a equipe paga luvas: cinco etapas de salário de uma vez.
    if (campId === 'f1') {
      const luvas = base.salario * LUVAS_F1;
      estado.dinheiro += luvas;
      noticia(estado, `${estado.piloto.nome} recebe US$ ${luvas.toLocaleString('pt-BR')} de luvas da ${base.nome}.`);
      estado.fase = 'superlicenca';
      estado.final = { equipe: base.nome, ano: estado.ano, idade: estado.piloto.idade };
    }
    return { ok: true, f4: campId === 'f4' };
  }

  function recusarProposta(estado, id) {
    estado.propostas = estado.propostas.filter((p) => p.id !== id);
  }

  // ---------- fim de semana ----------
  const DESGASTE_ASFALTO = { liso: 0.8, medio: 0.9, abrasivo: 1.05 };

  // ---------- recorde da pista ----------
  // Recorde inicial (fictício, mas fixo para cada pista): um pouco mais rápido que a pole de um campeonato forte.
  function recordeInicial(pista) {
    const rnd = Engine.criarRng([...pista.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) >>> 0);
    const pais = Dados.KARTODROMOS.br.some((p) => p.id === pista.id) ? 'BRA' : 'ITA';
    const nomes = Dados.NOMES[pais];
    const nome = `${nomes.p[Math.floor(rnd() * nomes.p.length)]} ${nomes.s[Math.floor(rnd() * nomes.s.length)]}`;
    return { tempo: Math.round((pista.tempoBase - 0.75 - rnd() * 0.3) * 1000) / 1000, nome, ano: 2020 + Math.floor(rnd() * 6), jogador: false };
  }

  // Kart e F4 usam o id da pista; da F3 à F1 o recorde é por categoria (a mesma pista aparece em várias).
  const chaveRecorde = (estado, pista) => (campeonato(estado.campeonato).ordem >= 4 ? `${estado.campeonato}:${pista.id}` : pista.id);
  function recordePista(estado, pista = pistaAtual(estado)) {
    return (estado.recordes && estado.recordes[chaveRecorde(estado, pista)]) || recordeInicial(pista);
  }

  // Confere uma volta contra o recorde. Devolve true se for um novo recorde.
  function tentarRecorde(estado, tempo, id, sessao) {
    const pista = pistaAtual(estado);
    if (!(tempo < recordePista(estado, pista).tempo)) return false;
    if (!estado.recordes) estado.recordes = {};
    estado.recordes[chaveRecorde(estado, pista)] = { tempo: Math.round(tempo * 1000) / 1000, nome: nomeDe(estado, id), ano: estado.ano, sessao, jogador: id === 'jogador', pista: pista.nome, campeonato: estado.campeonato };
    noticia(estado, `Recorde da pista em ${pista.nome}: ${nomeDe(estado, id)} faz ${tempo.toFixed(3)}!`);
    return id === 'jogador';
  }

  // O melhor tempo de uma sessão (de quem for) contra o recorde.
  function conferirRecorde(estado, tempos, sessao) {
    const melhor = tempos.filter((t) => t.tempo).sort((a, b) => a.tempo - b.tempo)[0];
    return melhor ? tentarRecorde(estado, melhor.tempo, melhor.id, sessao) : false;
  }

  function pistaAtual(estado) {
    const etapa = estado.calendario[estado.etapa];
    const camp = campeonato(estado.campeonato);
    const p = Dados.KARTODROMOS[camp.regiao].find((x) => x.id === etapa.pista);
    return {
      ...p, voltas: camp.voltas, perdaBox: camp.compostos ? 20 : 99,
      // Asfalto abrasivo gasta mais pneu; liso, menos. Retas longas facilitam a ultrapassagem.
      // Com compostos (F2 e F1) o desgaste é escalado por categoria (desgasteComposto, em data.js) para as corridas do jogo
      // pedirem uma parada (automática). Com acerto equilibrado e asfalto médio, na F2 (30 voltas) e na F1 (40) o macio dura
      // ~15 voltas, o médio ~22 e o duro ~30: uma parada cobre a corrida.
      desgaste: (DESGASTE_ASFALTO[p.asfalto] || 0.9) * (camp.compostos ? camp.desgasteComposto || 1.5 : 1),
      ultrapassagem: p.ultrapassagem != null ? p.ultrapassagem : { travada: 0.4, mista: 0.55, veloz: 0.7 }[p.tipo],
      peso: { motor: 1, aero: 0.3, chassi: 1.4 },
    };
  }

  const climaAtual = (estado) => estado.calendario[estado.etapa].clima;

  // ---------- desafio do dia ----------
  // Uma pista da categoria do jogador, uma condição fixa e 3 voltas lançadas para acertar o carro.
  // O tempo-alvo é o do próprio piloto com o acerto perfeito; medalha pela distância até ele.
  // Cada desafio dura 24 h a partir da primeira volta; depois disso sai o próximo. Antes da primeira
  // volta ele espera o jogador. (O campo "semana" guarda o número do desafio; o nome ficou de quando era semanal.)
  const DIA_MS = 86400000;
  const TENTATIVAS_DESAFIO = 3;
  const fusoMs = (agora) => new Date(agora).getTimezoneOffset() * 60000;
  const diaDesafio = (agora) => Math.floor((agora - fusoMs(agora)) / DIA_MS);
  // Início do desafio guardado (saves de quando ele virava à meia-noite: o começo daquele dia).
  const inicioDesafio = (st, agora) => (st.inicio != null ? st.inicio
    : st.tentativas && st.tentativas.length ? st.semana * DIA_MS + fusoMs(agora) : null);
  // Número do desafio valendo agora: o atual até completar 24 h da primeira volta, depois o seguinte.
  function numeroDesafio(estado, agora) {
    const st = estado.desafio;
    if (!st) return diaDesafio(agora);
    const inicio = inicioDesafio(st, agora);
    return inicio != null && agora >= inicio + DIA_MS ? st.semana + 1 : st.semana;
  }
  // Voltas que ainda dá para fazer neste desafio e quando sai o próximo (24 h depois da primeira volta).
  function voltasDesafio(estado, agora = Date.now()) {
    const d = desafioDaSemana(estado, agora);
    const st = estadoDesafio(estado, d);
    const restantes = Math.max(0, TENTATIVAS_DESAFIO - st.tentativas.length);
    return { restantes, reabreEm: restantes ? null : d.fim };
  }
  const MEDALHAS = [['ouro', 0.12], ['prata', 0.4], ['bronze', 0.9]];
  // Sem o Premium, o desafio é de graça no primeiro dia em que o jogador corre; depois, só com o Premium.
  const SEMANAS_DESAFIO_GRATIS = 1;
  const semanasJogadas = (estado) => estado.semanasDesafio || [];
  function desafioLiberado(estado, agora = Date.now()) {
    if (premium) return true;
    const dia = numeroDesafio(estado, agora);
    const jogadas = semanasJogadas(estado);
    return jogadas.includes(dia) || jogadas.length < SEMANAS_DESAFIO_GRATIS;
  }
  function desafioDaSemana(estado, agora = Date.now()) {
    const semana = numeroDesafio(estado, agora);
    const rnd = Engine.criarRng(semana * 7919 + 13);
    const camp = campeonato(estado.campeonato);
    const lista = Dados.KARTODROMOS[camp.regiao];
    const base = lista[Math.floor(rnd() * lista.length)];
    const pista = { ...base, peso: { motor: 1, aero: 0.3, chassi: 1.4 } };
    const clima = Kart.gerarClima(base, camp, rnd);
    const molhado = rnd() < 0.25;
    const cond = Kart.condicao(clima, 'quali', molhado);
    const pneu = molhado ? 'chuva' : 'slick';
    const entrada = entradaJogador(estado);
    const volta = (setup) => Engine.ritmoBase(entrada, pista) - 0.6 + Kart.efeito(setup, pista, cond, pneu).tempo + chuvaPiloto(estado.piloto, cond);
    const alvo = volta(Kart.arredondarSetup(Kart.acertoIdeal(pista, cond, pneu)));
    // Fim: 24 h depois da primeira volta (null enquanto ninguém correu).
    const st = estado.desafio;
    const inicio = st && st.semana === semana && st.campeonato === camp.id ? inicioDesafio(st, agora) : null;
    const fim = inicio != null ? inicio + DIA_MS : null;
    return { semana, campeonato: camp.id, pista, cond, pneu, molhado, alvo, volta, medalhas: MEDALHAS.map(([m, d]) => ({ medalha: m, tempo: alvo + d })), fim };
  }
  // Estado do desafio atual (zera quando sai o próximo ou o jogador muda de categoria).
  function estadoDesafio(estado, d = desafioDaSemana(estado)) {
    const atual = estado.desafio;
    if (!atual || atual.semana !== d.semana || atual.campeonato !== d.campeonato) {
      estado.desafio = { semana: d.semana, campeonato: d.campeonato, setup: Kart.setupPadrao(), tentativas: [], melhor: null, medalha: null, medalhas: (atual && atual.medalhas) || {} };
    }
    return estado.desafio;
  }
  // Prêmio em dinheiro por medalha: uma etapa da equipe (ouro), metade (prata) ou um quarto (bronze).
  // Na F1, onde a equipe paga o piloto, valores fixos. Só conta a melhor medalha da semana.
  const FRACAO_MEDALHA = { ouro: 1, prata: 0.5, bronze: 0.25 };
  function premioMedalha(estado, medalha) {
    if (!medalha) return 0;
    if (estado.campeonato === 'f1') return 500000 * FRACAO_MEDALHA[medalha];
    const etapa = Math.round(equipeBase(estado.equipeId).custoEtapa * campeonato(estado.campeonato).custo);
    return Math.round(etapa * FRACAO_MEDALHA[medalha] / 100) * 100;
  }

  // O desafio chega num aviso (modal) a cada 24 h: aceitar abre o desafio, declinar espera o próximo.
  // estado.desafioProximo: quando o aviso aparece de novo (o primeiro, 24 h depois de começar a usar).
  function desafioModalPendente(estado, agora = Date.now()) {
    if (estado.fase !== 'paddock') return false;
    if (estado.desafioProximo == null) { estado.desafioProximo = agora + DIA_MS; return false; }
    return agora >= estado.desafioProximo;
  }
  // Desafio aceito e ainda dentro das 24 h (só então o cartão do desafio aparece no paddock).
  function desafioAtivo(estado, agora = Date.now()) {
    const st = estado.desafio;
    if (!st || st.aceito === false || st.campeonato !== estado.campeonato) return false;
    const inicio = inicioDesafio(st, agora);
    return inicio != null && agora < inicio + DIA_MS;
  }
  function aceitarDesafio(estado, agora = Date.now()) {
    if (!desafioLiberado(estado, agora)) {
      estado.desafioProximo = agora + DIA_MS;
      return pedePremium('O desafio do dia grátis já foi. Com o Premium, tem desafio novo todo dia.');
    }
    const d = desafioDaSemana(estado, agora);
    const st = estadoDesafio(estado, d);
    if (st.inicio == null) st.inicio = agora;
    st.aceito = true;
    if (!semanasJogadas(estado).includes(d.semana)) estado.semanasDesafio = [...semanasJogadas(estado), d.semana];
    estado.desafioProximo = st.inicio + DIA_MS;
    return { ok: true };
  }
  function declinarDesafio(estado, agora = Date.now()) {
    const st = estadoDesafio(estado, desafioDaSemana(estado, agora));
    if (st.inicio == null) st.inicio = agora; // este desafio passa; o próximo sai 24 h depois
    st.aceito = false;
    estado.desafioProximo = agora + DIA_MS;
  }

  function tentarDesafio(estado, agora = Date.now()) {
    if (estado.fase === 'fds') return { ok: false, erro: 'O desafio é no paddock, entre as etapas.' };
    if (!desafioLiberado(estado, agora)) return pedePremium('O desafio da semana grátis já foi. Com o Premium, tem desafio novo toda semana.');
    const d = desafioDaSemana(estado, agora);
    const st = estadoDesafio(estado, d);
    if (!semanasJogadas(estado).includes(d.semana)) estado.semanasDesafio = [...semanasJogadas(estado), d.semana];
    const v = voltasDesafio(estado, agora);
    if (!v.restantes) return { ok: false, erro: 'As 3 voltas deste desafio já foram. O próximo sai 24 h depois da primeira volta.' };
    if (st.inicio == null) st.inicio = inicioDesafio(st, agora) ?? agora;
    const rnd = Engine.criarRng(d.semana * 31 + st.tentativas.length * 7 + 1);
    const tempo = Math.round((d.volta(st.setup) + rnd.gauss() * 0.04) * 1000) / 1000;
    const ideal = Kart.arredondarSetup(Kart.acertoIdeal(d.pista, d.cond, d.pneu));
    const frases = Kart.feedbackPiloto(Kart.erros(st.setup, ideal), limitar(estado.piloto.sensibilidade || 50, 10, 95), rnd);
    st.tentativas.push({ tempo, setup: { ...st.setup }, frases });
    if (st.melhor == null || tempo < st.melhor) st.melhor = tempo;
    const m = d.medalhas.find((x) => st.melhor <= x.tempo);
    const ordem = ['ouro', 'prata', 'bronze'];
    const nova = m && (!st.medalha || ordem.indexOf(m.medalha) < ordem.indexOf(st.medalha)) ? m.medalha : null;
    let premio = 0;
    if (nova) {
      // Paga a diferença para a medalha anterior da semana (bronze e depois ouro = só o que falta).
      premio = Math.max(0, premioMedalha(estado, nova) - premioMedalha(estado, st.medalha));
      estado.dinheiro += premio;
      st.premio = (st.premio || 0) + premio;
      st.medalha = nova;
      st.medalhas[nova] = (st.medalhas[nova] || 0) + 1;
      if (nova === 'ouro') estado.piloto.popularidade = Math.min(100, Math.round((estado.piloto.popularidade + 1) * 10) / 10);
    }
    if (nova) noticia(estado, `${estado.piloto.nome} leva a medalha de ${nova} no desafio do dia${premio ? ` e ganha US$ ${premio.toLocaleString('pt-BR')}` : ''}.`);
    const depois = voltasDesafio(estado, agora);
    return { ok: true, tempo, melhor: st.melhor, medalha: st.medalha, nova, premio, restantes: depois.restantes, reabreEm: depois.reabreEm };
  }
  // Pressão mínima da Pirelli na pista (só F1): o acerto nunca fica abaixo dela.
  function comPiso(setup, pista) {
    const piso = Kart.pisoPressao(pista);
    if (piso != null && Kart.AJUSTES.pressao && setup.arrefecimento != null && setup.pressao < piso) return { ...setup, pressao: piso };
    return setup;
  }
  function ajustarDesafio(estado, mudancas) {
    const st = estadoDesafio(estado);
    st.setup = comPiso(Kart.arredondarSetup({ ...st.setup, ...mudancas }), desafioDaSemana(estado).pista);
  }

  function iniciarFimDeSemana(estado) {
    const custo = custoEtapa(estado);
    if (estado.motorQuebrado) return { ok: false, erro: 'O motor engripou: faça a retífica antes de ir para a pista.' };
    const impede = estoqueImpede(estado);
    if (impede) return { ok: false, erro: impede };
    if (estado.dinheiro < custo) return { ok: false, erro: 'Dinheiro insuficiente para pagar a equipe nesta etapa.' };
    estado.dinheiro -= custo;
    estado.dinheiro += salarioEtapa(estado);
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
      sessao: 'treino', saidas: [], mecanico: null, ia, cabeca: [],
      // Começa do acerto da etapa anterior (se for da mesma categoria).
      setup: comPiso(anterior && Kart.ORDEM_AJUSTES.every((k) => k in anterior) ? { ...anterior } : Kart.setupPadrao(), pista),
      pneuId: (pneuMaisNovo(estado, manha.molhado ? 'chuva' : secoDaEtapa(estado)) || {}).id || null,
      quali: null, resultado: null, custoPago: custo,
    };
    estado.fase = 'fds';
    return { ok: true };
  }

  // Sem dinheiro para a etapa: os rivais correm sem você (resultado sorteado pela força de cada um).
  function pularEtapa(estado, motivo) {
    const rnd = rngDe(estado);
    noticia(estado, `${estado.piloto.nome} fica fora da etapa de ${pistaAtual(estado).nome} ${motivo === 'motor' ? 'com o motor na retífica' : 'por falta de dinheiro'}.`);
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
    // Da F3 em diante o composto pesa: macio mais rápido e gasta mais; duro, o contrário.
    const comp = quatroPneus(estado) && COMPOSTO_DO_TIPO[pneuTipo];
    const pn = comp ? Engine.PNEUS[comp] : Engine.PNEUS.Md;
    let melhor = Infinity;
    for (let i = 0; i < voltas; i++) {
      const t = Engine.ritmoBase(entrada, pista) - 0.6
        + ef.tempo + cab.tempo + chuvaPiloto(entrada.piloto, cond)
        + pn.ritmo - Engine.PNEUS.Md.ritmo + pn.desgaste * (usoPneu + i * ef.desgaste)
        + penalidadeZerado(usoPneu + i * ef.desgaste)
        + rnd.gauss() * (0.35 - entrada.piloto.consistencia * 0.0025) * ef.sigma * cab.sigma;
      melhor = Math.min(melhor, t);
    }
    return { tempo: melhor, efeito: ef };
  }

  // ---------- cores do carro e do capacete (Premium) ----------
  const PALETA_CORES = [
    { nome: 'Vermelho', hex: '#e10600' }, { nome: 'Laranja', hex: '#ff7a00' }, { nome: 'Amarelo', hex: '#ffd400' }, { nome: 'Verde', hex: '#1fb95a' },
    { nome: 'Água', hex: '#00b3a4' }, { nome: 'Azul', hex: '#1e5bc6' }, { nome: 'Marinho', hex: '#12307a' }, { nome: 'Roxo', hex: '#7a5cff' },
    { nome: 'Rosa', hex: '#ff4f9a' }, { nome: 'Vinho', hex: '#8a1230' }, { nome: 'Dourado', hex: '#c9a227' }, { nome: 'Branco', hex: '#f2f2f2' },
    { nome: 'Cinza', hex: '#8a93a6' }, { nome: 'Preto', hex: '#15171c' },
  ];
  const HEX_VALIDOS = new Set(PALETA_CORES.map((c) => c.hex));
  // Cores do jogador; sem escolha, o carro e o capacete usam a cor da equipe e os detalhes ficam no padrão do modelo.
  function coresDoPiloto(estado) {
    const eq = equipeBase(estado.equipeId), c = estado.cores || {};
    return { carro: c.carro || eq.cor, detalhe: c.detalhe || null, halo: c.halo || null, capacete: c.capacete || eq.cor };
  }
  function definirCores(estado, cores) {
    if (!premium) return pedePremium('Escolher as cores do carro, dos detalhes e do capacete é do Premium.');
    const eq = equipeBase(estado.equipeId);
    const ok = (v, pad) => v == null || v === pad || HEX_VALIDOS.has(v);
    if (!ok(cores.carro, eq.cor) || !ok(cores.detalhe, null) || !ok(cores.halo, null) || !ok(cores.capacete, eq.cor)) return { ok: false, erro: 'Cor inválida.' };
    estado.cores = { carro: cores.carro === eq.cor ? null : cores.carro || null, detalhe: cores.detalhe || null, halo: cores.halo || null, capacete: cores.capacete === eq.cor ? null : cores.capacete || null };
    return { ok: true };
  }

  function entradaJogador(estado) {
    const e = equipeBase(estado.equipeId);
    return { id: 'jogador', piloto: estado.piloto, carro: carroDe(estado, e.id, true), equipe: { id: e.id, nome: e.nome, cor: coresDoPiloto(estado).carro }, jogador: true };
  }

  function entradaRival(estado, r) {
    const e = equipeBase(r.equipe);
    return { id: r.id, piloto: r, carro: carroDe(estado, e.id, false), equipe: { id: e.id, nome: e.nome, cor: e.cor }, jogador: false };
  }

  // O acerto fica livre em todas as sessões, inclusive no grid.
  function definirSetup(estado, setup) {
    estado.fds.setup = comPiso(Kart.arredondarSetup({ ...estado.fds.setup, ...setup }), pistaAtual(estado));
  }

  function escolherPneu(estado, id) {
    const p = pneuPorId(estado, id);
    if (!p) return { ok: false, erro: 'Pneu não encontrado.' };
    if (!pneuValeNaEtapa(estado, p.tipo)) return { ok: false, erro: `Na F3 só vale o ${nomePneu(estado, compostoDaEtapa(estado)).toLowerCase()} nesta etapa (e o de chuva).` };
    estado.fds.pneuId = id;
    return { ok: true };
  }

  // O que o mecânico (se estiver trabalhando no treino) diz depois de uma saída.
  function dicaDaSaida(estado, e, pista, cond, tipoPneu, rnd) {
    if (!mecanicoAtivo(estado)) return null;
    const info = MECANICOS[mecanicoDoFds(estado.fds).tipo];
    if (info.faz === 'palpite') return Kart.dicaMecanico(e, info.qualidade, rnd);
    const { itens } = Kart.analiseTecnica(estado.fds.setup, pista, cond, tipoPneu, info.qualidade, rnd);
    if (!itens.length) return 'Mecânico: não mexe em nada, está no ponto.';
    return `Mecânico: ${itens.slice(0, 2).map((x) => `${x.nome}, ${x.acao}`).join('. ')}.`;
  }

  // Uma saída para a pista no treino livre: tempo, posição na tabela, o que o piloto sente e, se contratado, a dica do mecânico.
  function saidaTreino(estado) {
    const fds = estado.fds;
    if (fds.saidas.length >= saidasTreino()) {
      return premium ? { ok: false, erro: 'O treino livre acabou.' }
        : pedePremium(`Sem o Premium são ${SAIDAS_GRATIS} saídas no treino livre. Com ele, ${SAIDAS_TREINO}.`);
    }
    const pneu = pneuPorId(estado, fds.pneuId);
    if (!pneu) return { ok: false, erro: 'Escolha um jogo de pneus.' };
    const rnd = rngDe(estado);
    const pista = pistaAtual(estado);
    const clima = climaAtual(estado);
    const cond = Kart.condicao(clima, 'treino', clima.manha.chove);
    const { tempo, efeito } = voltaLancada(estado, entradaJogador(estado), fds.setup, pneu.tipo, pneu.uso, cond, rnd, VOLTAS_POR_SAIDA);
    pneu.uso += VOLTAS_POR_SAIDA * efeito.desgaste * pista.desgaste / 0.9;
    somarHoras(estado, HORAS.saida);

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
      dica: dicaDaSaida(estado, e, pista, cond, pneu.tipo, rnd),
    };
    if (cond.molhado && pneu.tipo === 'slick') saida.frases.unshift('Está molhado! Com slick não dá pra andar.');
    if (pneu.uso > 20) saida.frases.push('Os pneus já estão no fim, difícil saber se o problema é o acerto.');
    saida.recorde = conferirRecorde(estado, [{ id: 'jogador', tempo }, ...estado.rivais.map((r, i) => ({ id: r.id, tempo: tempos[i] }))], 'treino');
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

  // Pede ajuda ao mecânico (uma vez por sessão): palpite (iniciante), análise técnica (experiente)
  // ou o kart montado (profissional).
  function pedirSugestao(estado) {
    const fds = estado.fds;
    const m = mecanicoDoFds(fds);
    if (!m) return { ok: false, erro: 'Você está sem mecânico neste fim de semana.' };
    if (!mecanicoAtivo(estado)) return { ok: false, erro: 'O mecânico só trabalha nesta sessão com hora extra.' };
    if (m.usos[fds.sessao]) return { ok: false, erro: 'O mecânico já ajudou nesta sessão.' };
    const info = MECANICOS[m.tipo];
    const pista = pistaAtual(estado);
    const cond = condicaoSessao(estado);
    const pneu = pneuPorId(estado, fds.pneuId);
    const tipoPneu = pneu ? pneu.tipo : 'slick';
    const rnd = rngDe(estado);
    let conselho;
    if (info.faz === 'palpite') {
      conselho = [Kart.dicaMecanico(Kart.erros(fds.setup, Kart.acertoIdeal(pista, cond, tipoPneu)), info.qualidade, rnd).replace(/^Mecânico: /, '')];
    } else if (info.faz === 'tecnica') {
      conselho = Kart.analiseTecnica(fds.setup, pista, cond, tipoPneu, info.qualidade, rnd).lista;
    } else {
      fds.setup = Kart.sugestaoMecanico(pista, cond, tipoPneu, info.qualidade, rnd);
      conselho = [`Montei o ${Kart.veiculo} para essas condições. Pode acelerar.`];
    }
    m.usos[fds.sessao] = conselho;
    return { ok: true, faz: info.faz, conselho };
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
    const pneu = pneuMaisNovo(estado, clima.tarde.inicioChuva === 'quali' ? 'chuva' : secoDaEtapa(estado));
    if (pneu) estado.fds.pneuId = pneu.id;
    estado.fds.sessao = 'quali';
  }

  // ---------- sprint ----------
  // Corrida curta antes da principal. Na F2 o top 10 da classificação larga invertido.
  function temSprint(estado) {
    const s = campeonato(estado.campeonato).sprint;
    return s === true || (Array.isArray(s) && s.includes(estado.calendario[estado.etapa].pista));
  }
  const sprintPendente = (estado) => !!(estado.fds && estado.fds.sprint && !estado.fds.sprint.feito);
  // Ordem de largada da próxima corrida (sprint ou principal).
  function ordemLargada(estado) {
    const q = estado.fds.quali;
    if (!sprintPendente(estado) || estado.campeonato !== 'f2') return q;
    return [...q.slice(0, 10).reverse(), ...q.slice(10)];
  }
  const voltasSprint = (camp) => Math.ceil(camp.voltas * 0.45);

  // ---------- compostos (F3, F2 e F1) ----------
  // Só no seco: se a classificação já foi molhada, todo mundo larga de pneu de chuva e não há regra.
  // O composto de largada é o do jogo de pneus montado (do estoque). A regra dos dois compostos é só da F2 e da F1.
  const usaCompostos = (estado) => quatroPneus(estado) && climaAtual(estado).tarde.inicioChuva !== 'quali';
  const compostoMontado = (estado) => COMPOSTO_DO_TIPO[(pneuPorId(estado, estado.fds && estado.fds.pneuId) || {}).tipo] || null;
  const melhorJogo = (estado, tipo, fora = []) => estado.pneus.filter((p) => p.tipo === tipo && !fora.includes(p.id)).sort((a, b) => a.uso - b.uso)[0] || null;
  function escolherComposto(estado, composto) {
    if (!Engine.PNEUS[composto]) return { ok: false, erro: 'Composto inválido.' };
    if (!pneuValeNaEtapa(estado, TIPO_DO_COMPOSTO[composto])) return { ok: false, erro: `Na F3 só vale o ${nomePneu(estado, compostoDaEtapa(estado)).toLowerCase()} nesta etapa.` };
    const jogo = melhorJogo(estado, TIPO_DO_COMPOSTO[composto]);
    if (!jogo) return { ok: false, erro: `Sem pneu ${Engine.PNEUS[composto].nome.toLowerCase()} no estoque.` };
    estado.fds.composto = composto;
    estado.fds.pneuId = jogo.id;
    return { ok: true };
  }
  // Quantas voltas o composto aguenta antes de cair de rendimento, para este piloto nesta pista (descontando o que o jogo já rodou).
  const vidaComposto = (estado, composto, uso = 0) => Math.max(0, Math.floor(Engine.vidaPneu(composto, estado.piloto, pistaAtual(estado)) * (1 - uso / Engine.PNEUS[composto].vida)));

  // Depois da classificação e da sprint, a equipe monta o jogo menos gasto do mesmo tipo para a corrida
  // (da F3 em diante, em que o jogador corre com o estoque). Ele ainda pode trocar no grid.
  function montarJogoMaisNovo(estado) {
    const fds = estado.fds;
    const atual = quatroPneus(estado) && pneuPorId(estado, fds.pneuId);
    const melhor = atual && melhorJogo(estado, atual.tipo);
    if (melhor && melhor.uso < atual.uso) { fds.pneuId = melhor.id; fds.pneuCorrida = melhor.id; }
  }

  // Os jogos que o jogador usou na corrida voltam para o estoque com o desgaste.
  function devolverPneus(estado, corrida) {
    const carro = corrida.carros.find((c) => c.jogador);
    const jogos = corrida.jogosJogador || [];
    if (jogos.length) jogos[jogos.length - 1].uso = carro.uso;
    for (const j of jogos) {
      const p = pneuPorId(estado, j.id);
      if (p) p.uso = Math.round(j.uso);
    }
  }

  function concluirSprint(estado, corrida) {
    const fds = estado.fds;
    const res = Engine.resultado(corrida);
    for (const r of res) {
      r.pontos = !r.fora && r.pos <= PONTOS_SPRINT.length ? PONTOS_SPRINT[r.pos - 1] : 0;
      estado.pontos[r.id] = (estado.pontos[r.id] || 0) + r.pontos;
    }
    const meu = res.find((r) => r.id === 'jogador');
    devolverPneus(estado, corrida);
    montarJogoMaisNovo(estado);
    if (!meu.fora && meu.pos <= 3) mexerCabeca(estado, { confianca: 3 }, `Pódio na sprint (P${meu.pos})`);
    fds.sprint = {
      feito: true, pos: meu.pos, fora: meu.fora, motivo: meu.motivoFora, pontos: meu.pontos,
      classificacao: res.slice(0, 8).map((r) => ({ id: r.id, pos: r.pos, pontos: r.pontos, fora: r.fora, equipe: r.equipe })),
    };
    (estado.sprints || (estado.sprints = [])).push({ ano: estado.ano, campeonato: estado.campeonato, etapa: estado.etapa + 1, pos: meu.pos, fora: meu.fora });
    fds.sessao = 'grid';
    return fds.sprint;
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
    somarHoras(estado, HORAS.quali);
    for (const r of estado.rivais) {
      const ia = fds.ia[r.id];
      tempos.push({ id: r.id, tempo: voltaLancada(estado, entradaRival(estado, r), ia.tarde, ia.pneu, AMACIAR_VOLTAS, cond, rnd, 3).tempo });
    }
    tempos.sort((a, b) => a.tempo - b.tempo);
    fds.quali = tempos;
    fds.recordeQuali = conferirRecorde(estado, tempos, 'classificação');
    fds.setupCorrida = { ...fds.setup };
    fds.setupQuali = { ...fds.setup };
    fds.pneuCorrida = fds.pneuId;
    montarJogoMaisNovo(estado);
    fds.sprint = temSprint(estado) ? { feito: false } : null;
    const comp = companheiro(estado);
    const posComp = comp ? tempos.findIndex((t) => t.id === comp.id) : -1;
    if (posComp >= 0) fds.dueloQuali = placarDuelo(estado, 'quali', tempos.findIndex((t) => t.id === 'jogador'), posComp);
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
    const sprint = sprintPendente(estado);
    const grid = ordemLargada(estado).map((q) => entradas[q.id]);
    // F3 em diante no seco: cada um larga com o composto que escolheu. Na F2 e na F1, na corrida principal
    // é obrigatório usar dois (uma parada).
    const compostos = usaCompostos(estado);
    const quatro = quatroPneus(estado);
    const regra = compostos && !!campeonato(estado.campeonato).compostos && !sprint;
    // O jogador só troca para um jogo do estoque que ainda não usou nesta corrida.
    const jogos = pneuJogador.id ? [{ id: pneuJogador.id, uso: pneuJogador.uso }] : [];
    const jogoLivre = (tipo) => melhorJogo(estado, tipo, jogos.map((j) => j.id));
    const trocarJogo = (c, p) => {
      if (jogos.length) jogos[jogos.length - 1].uso = c.uso;
      jogos.push({ id: p.id, uso: p.uso });
      return p.uso;
    };
    const chuvaDesde = clima.tarde.inicioChuva === 'quali' ? 1 : clima.tarde.voltaChuva;
    const monoposto = categoriaDe(estado) !== 'kart';
    const ajusteVolta = (c, v, corrida) => {
      const molhado = chuvaDesde != null && v >= chuvaDesde;
      if (molhado && !corrida.chuvaAnunciada) {
        corrida.chuvaAnunciada = true;
        if (v > 1) Engine.registrar(corrida, 'Começou a chover!', 'sc');
      }
      corrida.molhado = molhado;
      const cond = Kart.condicao(clima, 'corrida', molhado);
      const setup = c.jogador ? fds.setupCorrida : fds.ia[c.id].tarde;
      // Troca para o pneu de chuva: automática, para o jogador e para os rivais. A equipe chama o carro uma ou duas voltas
      // depois que a chuva começa. O jogo de chuva do jogador sai do estoque, com o desgaste dele; sem jogo de chuva o carro
      // segue de seco.
      let pit = 0;
      const querChuva = monoposto && molhado && c.tipoPneu !== 'chuva' && v >= chuvaDesde + (c.id.charCodeAt(c.id.length - 1) % 2);
      const jogoChuva = c.jogador && querChuva ? jogoLivre('chuva') : null;
      if (c.jogador && querChuva && !jogoChuva && !corrida.semChuvaAvisado) {
        corrida.semChuvaAvisado = true;
        Engine.registrar(corrida, 'Sem pneu de chuva no estoque: o carro segue com pneu de seco.', 'alerta', c.id);
      }
      if (querChuva && (!c.jogador || jogoChuva)) {
        c.tipoPneu = 'chuva';
        c.uso = jogoChuva ? trocarJogo(c, jogoChuva) : 0;
        if (c.usados && c.usados.length < 2) c.usados.push('chuva'); // pneu de chuva dispensa a regra dos dois compostos
        pit = PIT_F4 - (c.jogador ? EQUIPE_BOX[nivelBox(estado)].ganho : 0);
        Engine.registrar(corrida, `${c.piloto.nome} para no box e coloca pneu de chuva.`, 'box', c.id);
      }
      const pneu = c.tipoPneu;
      const ef = Kart.efeito(setup, pista, cond, pneu);
      ef.tempo += pit;
      // Na F2 e na F1 o desgaste é acelerado para pedir parada no seco; pneu de chuva na pista molhada gasta bem menos.
      if (molhado && pneu === 'chuva' && campeonato(estado.campeonato).compostos) ef.desgaste = (ef.desgaste || 1) * 0.55;
      // Motor passado da revisão aguenta menos quando é forçado.
      if (c.jogador) ef.quebra *= 1 + 0.5 * Math.max(0, estado.motorHoras - HORAS_REVISAO + 0.9) / 0.9;
      if (c.jogador && !quatro) ef.tempo += penalidadeZerado(c.uso);
      const cab = c.jogador ? efeitoCabeca(c.piloto) : { tempo: 0, sigma: 1, erro: 1 };
      return { ...ef, tempo: ef.tempo + cab.tempo + chuvaPiloto(c.piloto, cond), sigma: ef.sigma * cab.sigma, erro: ef.erro * cab.erro };
    };
    if (sprint) pista.voltas = voltasSprint(campeonato(estado.campeonato));
    const corrida = Engine.criarCorrida(pista, grid, estado.seed + estado.ano * 1009 + estado.etapa * 31 + (sprint ? 17 : 0), {
      // Safety car só na F2 e na F1 (no kart e nas categorias de base a corrida segue em bandeira verde).
      // DRS da F3 em diante (como na vida real; F4 e kart não têm).
      drs: campeonato(estado.campeonato).ordem >= 4,
      efeitoCombustivel: campeonato(estado.campeonato).compostos ? 0.055 : 0.035,
      regraCompostos: regra, semBox: !regra, semSafetyCar: !campeonato(estado.campeonato).safetyCar, chanceSafetyCar: 0.02, semModos: true, ajusteVolta,
      ...(compostos ? { pneusIniciais: { jogador: COMPOSTO_DO_TIPO[pneuJogador.tipo] || 'Md' } } : { pneuPadrao: 'Md' }),
      // F3: todo o grid larga com o composto da etapa.
      ...(compostos && compostoUnico(estado) ? { pneuPadrao: COMPOSTO_DO_TIPO[compostoDaEtapa(estado)] } : {}),
    });
    corrida.sprint = sprint;
    corrida.compostos = compostos;
    corrida.jogosJogador = jogos;
    if (monoposto) corrida.temJogo = (tipo) => !!jogoLivre(tipo);
    if (monoposto) corrida.jogosLivres = (tipo) => estado.pneus.filter((p) => p.tipo === tipo && !jogos.some((j) => j.id === p.id)).length;
    if (quatro) {
      // Na parada, o jogador recebe um jogo do estoque: o composto pedido ou, se não houver, outro seco que tenha.
      corrida.trocaPneu = (c, desejado) => {
        if (!c.jogador) return undefined;
        // Para cada composto seco com jogo livre: o jogo com mais vida e quantas voltas ele ainda aguenta.
        const restantes = corrida.totalVoltas - corrida.volta + 1;
        const precisaOutro = corrida.regraCompostos && c.usados.length === 1 && c.usados[0] !== 'chuva' ? c.usados[0] : null;
        const opcoes = Engine.ORDEM_PNEUS.filter((k) => pneuValeNaEtapa(estado, TIPO_DO_COMPOSTO[k])).map((k) => {
          const jogo = jogoLivre(TIPO_DO_COMPOSTO[k]);
          if (!jogo) return null;
          const aguenta = Engine.vidaPneu(k, c.piloto, corrida.pista) * Math.max(0, 1 - jogo.uso / Engine.PNEUS[k].vida);
          return { k, jogo, aguenta, regra: k !== precisaOutro };
        }).filter(Boolean);
        if (!opcoes.length) {
          if (!corrida.semJogoAvisado) Engine.registrar(corrida, 'Sem pneu seco no estoque para trocar: o carro segue na pista.', 'alerta', c.id);
          corrida.semJogoAvisado = true;
          return null;
        }
        // O pedido vale se o jogo dele cumpre a regra e aguenta pelo menos metade do que falta (ou metade da vida).
        const pedido = opcoes.find((o) => o.k === desejado);
        const bom = (o) => o.regra && o.aguenta >= Math.min(restantes, Engine.vidaPneu(o.k, c.piloto, corrida.pista) * 0.5);
        const escolha = pedido && bom(pedido) ? pedido
          : opcoes.slice().sort((a, b) => (b.regra - a.regra) || (Math.min(b.aguenta, restantes) - Math.min(a.aguenta, restantes)) || (Engine.ORDEM_PNEUS.indexOf(a.k) - Engine.ORDEM_PNEUS.indexOf(b.k)))[0];
        if (escolha.k !== desejado) {
          const motivo = pedido ? `o jogo de ${Engine.PNEUS[desejado].nome.toLowerCase()} está gasto` : `sem ${Engine.PNEUS[desejado].nome.toLowerCase()} no estoque`;
          Engine.registrar(corrida, `${motivo[0].toUpperCase()}${motivo.slice(1)}: vai de ${Engine.PNEUS[escolha.k].nome.toLowerCase()}.`, 'box', c.id);
        }
        return { pneu: escolha.k, uso: trocarJogo(c, escolha.jogo) };
      };
    }
    for (const c of corrida.carros) {
      // O jogador usa o jogo do estoque, com o desgaste que ele tiver. Os rivais largam com o jogo da
      // classificação (3 voltas de uso), como faria quem tem o estoque em dia.
      c.uso = c.jogador ? pneuJogador.uso : campeonato(estado.campeonato).compostos ? 3 : 1;
      c.tipoPneu = c.jogador ? pneuJogador.tipo : fds.ia[c.id].pneu;
    }
    return corrida;
  }

  // Aplica a corrida terminada: ordens de equipe, pontos, dinheiro, popularidade, olheiros.
  function concluirCorrida(estado, corrida) {
    if (corrida.sprint) return concluirSprint(estado, corrida);
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

    // Ponto extra para a pole e para a volta mais rápida (só para quem termina entre os 10 primeiros).
    const poleId = fds.quali[0].id;
    const naPontuacao = res.filter((r) => !r.fora && r.pos <= 10 && r.melhorVolta);
    const vrId = naPontuacao.length ? naPontuacao.reduce((m, r) => (r.melhorVolta < m.melhorVolta ? r : m)).id : null;
    for (const r of res) {
      if (r.id === poleId) r.pontos += PONTO_POLE;
      if (r.id === vrId) r.pontos += PONTO_VOLTA_RAPIDA;
    }

    for (const r of res) {
      estado.pontos[r.id] = (estado.pontos[r.id] || 0) + r.pontos;
      if (!r.fora && r.pos === 1) estado.vitorias[r.id] = (estado.vitorias[r.id] || 0) + 1;
      if (!r.fora && r.pos <= 3) estado.podios[r.id] = (estado.podios[r.id] || 0) + 1;
    }
    const meu = res.find((r) => r.id === 'jogador');
    const p = estado.piloto;
    // Duelo com o companheiro: só conta se pelo menos um dos dois terminou.
    const comp = companheiro(estado);
    const dele = comp && res.find((r) => r.id === comp.id);
    // Rival de carreira: quem terminou na frente (abandono conta como último).
    const rc = rivalCarreira(estado);
    const delePos = rc && res.find((r) => r.id === 'rc');
    if (delePos && !(meu.fora && delePos.fora)) {
      const eu = meu.fora ? 99 : meu.pos;
      const ele = delePos.fora ? 99 : delePos.pos;
      estado.rivalCarreira.duelo[eu < ele ? 'eu' : 'ele'] += 1;
    }
    let dueloCorrida = null;
    if (dele && !(meu.fora && dele.fora)) {
      dueloCorrida = placarDuelo(estado, 'corrida', meu.fora ? 99 : meu.pos, dele.fora ? 99 : dele.pos);
      // Para o cartão do companheiro: onde cada um terminou na última corrida.
      estado.duelo.ultima = { eu: meu.fora ? null : meu.pos, ele: dele.fora ? null : dele.pos };
      if (dueloCorrida) mexerCabeca(estado, { moral: 2 }, 'Terminou na frente do companheiro de equipe');
      else mexerCabeca(estado, { moral: -1 }, 'Terminou atrás do companheiro de equipe');
    }
    let ganho = 0;
    if (!meu.fora && meu.pos <= PREMIO_ETAPA.length) ganho += Math.round(PREMIO_ETAPA[meu.pos - 1] * (camp.premios || camp.custo));
    const patroc = estado.patrocinios.reduce((s, x) => s + x.porEtapa, 0);
    ganho += patroc;
    estado.dinheiro += ganho;
    if (!meu.fora) {
      if (meu.pos === 1) p.popularidade += 4 * camp.popularidade;
      else if (meu.pos <= 3) p.popularidade += 2 * camp.popularidade;
      else if (meu.pos <= 10) p.popularidade += 0.5 * camp.popularidade;
    }
    p.popularidade = Math.min(100, Math.round(p.popularidade * 10) / 10);

    devolverPneus(estado, corrida);
    const carro = corrida.carros.find((c) => c.jogador);
    somarHoras(estado, HORAS.corrida);
    if (meu.fora && (meu.motivoFora === 'Motor engripou' || meu.motivoFora === 'Superaquecimento')) {
      estado.motorQuebrado = true;
      noticia(estado, meu.motivoFora === 'Superaquecimento'
        ? `O motor de ${p.nome} superaqueceu! A equipe vai precisar de uma retífica.`
        : `O motor de ${p.nome} engripou! A equipe vai precisar de uma retífica.`);
    }

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
    // Andar na frente ensina mais: pódio e top 5 aceleram a evolução.
    const aprendizado = meu.fora ? 0.12 : meu.pos <= 3 ? 0.3 : meu.pos <= 5 ? 0.22 : 0.15;
    // No primeiro ano (12 anos) a criança aprende depressa: a temporada de estreia fica jogável para quem acabou de começar.
    evoluir(p, rnd, aprendizado * fatorMoral(p) * EVOLUCAO_AUTOMATICA * (p.idade <= 12 ? 2 : 1));
    const recordeCorrida = conferirRecorde(estado, corrida.carros.map((c) => ({ id: c.id, tempo: c.melhorVolta })), 'corrida');
    fds.resultado = { companheiro: comp ? { nome: comp.nome, pos: dele.pos, fora: dele.fora, venci: dueloCorrida } : null, pole: poleId === 'jogador', voltaRapida: vrId === 'jogador', recorde: recordeCorrida, pos: meu.pos, fora: meu.fora, motivo: meu.motivoFora, pontos: meu.pontos, ganho, patrocinio: patroc, eventos, olheiros: estado.olheiros.map((o) => o.nome), cabeca: fds.cabeca || [] };
    atualizarInteresse(estado, meu.fora ? 99 : meu.pos, rnd);
    estado.historico.push({ ano: estado.ano, campeonato: camp.id, etapa: estado.etapa + 1, pista: pistaAtual(estado).nome, pos: meu.pos, fora: meu.fora,
      largada, pole: poleId === 'jogador', voltaRapida: vrId === 'jogador', pontos: meu.pontos, chuva: !!corrida.molhado, idade: p.idade });
    const clima = climaAtual(estado);
    // O diagnóstico vale para as condições em que a maior parte da corrida foi disputada: se a chuva só pegou
    // o final (ou o começo), o acerto avaliado é o do seco, e a chuva vira um aviso à parte.
    const voltaChuva = clima.tarde.inicioChuva === 'quali' ? 1 : clima.tarde.voltaChuva;
    const totalVoltas = corrida.totalVoltas || camp.voltas || 1;
    const fracMolhada = voltaChuva ? Math.max(0, totalVoltas - voltaChuva + 1) / totalVoltas : 0;
    const molhadoDiag = fracMolhada >= 0.5;
    const condFinal = Kart.condicao(clima, 'corrida', molhadoDiag);
    const tipoLargada = (pneuPorId(estado, fds.pneuCorrida) || {}).tipo || 'slick';
    const tipoPneu = molhadoDiag ? (carro.tipoPneu || tipoLargada) : tipoLargada;
    const choveuNaCorrida = !!corrida.molhado && clima.tarde.inicioChuva === 'corrida';
    fds.resultado.diagnostico = {
      ...Kart.diagnostico(fds.setupCorrida, pistaAtual(estado), condFinal, tipoPneu),
      tempAr: condFinal.tempAr, tempPista: condFinal.tempPista, molhado: condFinal.molhado,
      choveuNaCorrida,
      nota: choveuNaCorrida && !molhadoDiag ? `A chuva só pegou o fim da corrida (a partir da volta ${voltaChuva}): o diagnóstico vale para o seco.` : null,
    };
    registrarCaderno(estado, condFinal, {
      sessao: 'corrida', setup: { ...fds.setupCorrida }, pneu: tipoPneu,
      tempo: carro.melhorVolta, posicao: meu.pos, fora: meu.fora,
    });
    fds.sessao = 'fim';
    fds.classificacao = res.map((r) => ({ id: r.id, pos: r.pos, fora: r.fora, motivo: r.motivoFora, pontos: r.pontos, dif: r.diferenca, equipe: r.equipe, pole: r.id === poleId, voltaRapida: r.id === vrId }));
    return fds.resultado;
  }

  // Guarda o diagnóstico da corrida (e uma anotação livre do jogador) no caderno da pista.
  function anotarCorrida(estado, texto) {
    if (!premium) return pedePremium('Anotar no caderno é do Premium.');
    const fds = estado.fds;
    const r = fds && fds.resultado;
    if (!r || !r.diagnostico) return { ok: false, erro: 'Nada para anotar.' };
    const lista = estado.caderno[pistaAtual(estado).id] || [];
    const entrada = lista.slice().reverse().find((l) => l.sessao === 'corrida' && l.ano === estado.ano && l.etapa === estado.etapa + 1);
    if (!entrada) return { ok: false, erro: 'Nada para anotar.' };
    const d = r.diagnostico;
    entrada.nota = { sentiu: d.sentiu, ajustes: d.ajustes.map((a) => a.texto), pneu: d.pneu, motor: d.motor || null, texto: String(texto || '').trim().slice(0, 300) };
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
    vencerPatrocinios(estado, rnd);
    cobrarParcela(estado);
    avisarPneusNoFim(estado);
    estado.propostas = estado.propostas.filter((o) => o.expira >= estado.etapa || o.tipo === 'f4' || o.tipo === 'academia' || o.tipo === 'subida');
    if (rnd() < 0.3 + estado.piloto.popularidade / 100) gerarOfertasPatrocinio(estado, rnd, 1);
    // A confiança volta aos poucos para o normal; aperto de dinheiro pesa na moral.
    const p = estado.piloto;
    p.confianca = Math.round(p.confianca + (50 - p.confianca) * 0.15);
    if (estado.etapa < etapasDe(estado) && estado.dinheiro < custoEtapa(estado) * 1.5) {
      mexerCabeca(estado, { moral: -4 });
      noticia(estado, `${p.nome} sente o peso das contas apertadas em casa.`);
    }
    if (p.moral < 20) noticia(estado, `${p.nome} anda desmotivado e já falou em largar as corridas.`);
    if (estado.etapa >= etapasDe(estado)) return fimDeTemporada(estado);
    // Sem dinheiro para pagar a próxima etapa, sem proposta de equipe nem banco: acabou a carreira.
    if (estado.dinheiro < custoEtapa(estado) && !estado.propostas.length && !(premium && !estado.emprestimo)) {
      estado.fase = 'falencia';
      noticia(estado, `${p.nome} não tem como pagar a próxima etapa.`);
      return;
    }
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
  // O piloto evolui de dois jeitos: sozinho, com a idade e as corridas (a experiência, mais devagar),
  // e com os pontos de evolução que o jogador distribui no fim de cada temporada: 8 por disputar o ano,
  // bônus pela posição no campeonato e +1 por vitória. Cada ponto vale +1 no atributo, até o potencial.
  // Calibrado em simulações de carreira (jogador que prioriza o ritmo): o piloto sai do kart com ~47 e a média
  // dos atributos passa de 70 na F4, de 85 na F3 e de 90 na F2; o ritmo acompanha o teto da categoria.
  // Quem joga bem chega à F1 entre 19 e 21 anos com a média acima de 93. Ver docs/evolucao.md.
  const EVOLUCAO_AUTOMATICA = 0.6;
  const EVOLUCAO_LENTA = 0.5; // fração da distância até o teto que o piloto anda por etapa (era a taxa cheia)
  const PONTOS_BASE_EVOLUCAO = 8;
  const BONUS_EVOLUCAO = { 1: 10, 2: 8, 3: 6, 4: 5 };
  const BONUS_ATE_P10 = 3;
  const MAX_BONUS_VITORIAS = 4;
  const bonusVitorias = (vitorias) => Math.min(MAX_BONUS_VITORIAS, vitorias || 0);
  const bonusPosicao = (pos) => BONUS_EVOLUCAO[pos] || (pos <= 10 ? BONUS_ATE_P10 : 0);
  const pontosEvolucaoDa = (pos, vitorias = 0) => PONTOS_BASE_EVOLUCAO + bonusPosicao(pos) + bonusVitorias(vitorias);
  // Cada ponto vale +1 em qualquer atributo (custo fixo). O − tira 1 de qualquer atributo e devolve o ponto,
  // para redistribuir: o que se ganha de um lado se perde do outro. Dá para mexer entre as etapas, nunca no meio do fim de semana.
  const PISO_ATRIBUTO = 30;
  const custoPonto = () => 1;
  // Saldo de cada atributo desde o último fim de temporada (positivo: recebeu; negativo: cedeu).
  const mexerSaldo = (estado, a, delta) => { estado.distribuidos = { ...(estado.distribuidos || {}), [a]: ((estado.distribuidos || {})[a] || 0) + delta }; };
  function investirPonto(estado, a) {
    const p = estado.piloto;
    if (!ATRIBUTOS.includes(a)) return { ok: false, erro: 'Atributo inválido.' };
    if (!(estado.pontosEvolucao > 0)) return { ok: false, erro: 'Sem pontos de evolução.' };
    if (p[a] >= p.potencial) return { ok: false, erro: `${NOMES_ATRIBUTOS[a]} já está no teto da categoria.` };
    p[a] += 1;
    estado.pontosEvolucao -= 1;
    mexerSaldo(estado, a, 1);
    return { ok: true, custo: 1 };
  }
  // Tira 1 do atributo e devolve o ponto. Serve para desfazer um investimento ou para mudar de lugar um ponto.
  function devolverPonto(estado, a) {
    const p = estado.piloto;
    if (!ATRIBUTOS.includes(a)) return { ok: false, erro: 'Atributo inválido.' };
    if (estado.fase === 'fds') return { ok: false, erro: 'Redistribua os pontos entre as etapas.' };
    if (p[a] <= PISO_ATRIBUTO) return { ok: false, erro: `${NOMES_ATRIBUTOS[a]} não pode ficar abaixo de ${PISO_ATRIBUTO}.` };
    p[a] -= 1;
    estado.pontosEvolucao = (estado.pontosEvolucao || 0) + 1;
    mexerSaldo(estado, a, -1);
    return { ok: true, custo: 1 };
  }

  function evoluir(p, rnd, fator) {
    const taxa = (p.idade <= 14 ? 0.3 : p.idade <= 17 ? 0.22 : 0.12) * EVOLUCAO_LENTA;
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
    const rel = { ano: estado.ano, campeonato: camp.id, pos, pontos: estado.pontos.jogador, campeao: tabela[0].nome, premios: [], bonus: [], dinheiroAntes: estado.dinheiro,
      vitorias: estado.vitorias.jogador || 0, podios: estado.podios.jogador || 0,
      duelo: estado.duelo && companheiro(estado) ? { ...estado.duelo, nome: companheiro(estado).nome, pontosEle: estado.pontos[estado.duelo.id] || 0 } : null };

    rel.podio = tabela.slice(0, 3).map((t) => ({ id: t.id, nome: t.nome, equipe: t.equipe }));
    if (pos <= VAGAS_SUBIDA) {
      const premio = Math.round(camp.premioCampeao / 2 ** (pos - 1));
      estado.dinheiro += premio;
      rel.premios.push({ texto: `Prêmio de P${pos} no campeonato`, valor: premio });
      estado.piloto.popularidade += pos === 1 ? 10 * camp.popularidade : 4 * camp.popularidade;
    }
    for (const pt of estado.patrocinios.filter((x) => x.ate == null)) {
      const cumpriu = pt.meta.tipo === 'podios' ? (estado.podios.jogador || 0) >= pt.meta.alvo : pos <= pt.meta.alvo;
      if (cumpriu) estado.dinheiro += pt.bonus;
      rel.bonus.push({ empresa: pt.empresa, meta: textoMeta(pt.meta), cumpriu, valor: pt.bonus });
    }
    estado.patrocinios = [];
    estado.ofertasPatrocinio = [];

    const p = estado.piloto;
    const antes = Object.fromEntries(ATRIBUTOS.map((a) => [a, p[a]]));
    if (pos === 1) mexerCabeca(estado, { moral: 15, confianca: 10 });
    evoluir(p, rnd, fatorMoral(p) * EVOLUCAO_AUTOMATICA);
    rel.pontosEvolucao = pontosEvolucaoDa(pos, rel.vitorias);
    estado.pontosEvolucao = (estado.pontosEvolucao || 0) + rel.pontosEvolucao;
    estado.distribuidos = {};
    p.moral = Math.round(p.moral + (60 - p.moral) * 0.3);
    p.sensibilidade = Math.min(95, p.sensibilidade + 3);
    p.idade += 1;
    p.popularidade = Math.round(p.popularidade * 0.8 * 10) / 10;
    rel.evolucao = ATRIBUTOS.map((a) => ({ a, antes: antes[a], depois: p[a] })).filter((x) => x.depois !== x.antes);

    // Rival de carreira: posição no campeonato, evolução e a notícia da disputa particular.
    if (rivalCarreira(estado)) {
      const r = estado.rivalCarreira;
      const rpos = tabela.findIndex((x) => x.id === 'rc') + 1;
      r.temporadas.push({ ano: rel.ano, campeonato: camp.id, pos: rpos });
      evoluir(r, rnd, 1);
      r.idade += 1;
      rel.rival = { nome: r.nome, pos: rpos };
      noticia(estado, rpos < pos ? `${r.nome}, seu rival desde o kart, termina à sua frente: P${rpos} contra P${pos}.` : `Na disputa com ${r.nome}, rival desde o kart, você leva a melhor: P${pos} contra P${rpos}.`);
    }

    // Opções para o próximo ano
    // O próximo degrau é sempre da mesma categoria (a F4 só se alcança por proposta).
    // Subir sem proposta só vale dentro do kart; nos monopostos a categoria seguinte vem por proposta.
    const proximo = !camp.categoria && Dados.CAMPEONATOS.find((c) => c.ordem === camp.ordem + 1 && !c.categoria);
    rel.opcoes = [camp.id];
    if (proximo && (pos <= VAGAS_SUBIDA || p.popularidade >= 20 * (camp.ordem + 1))) rel.opcoes.push(proximo.id);

    // Equipes de F4 e academias de F1: só para quem brilhou nos campeonatos maiores.
    const propostasF4 = [];
    const interesseF4 = Dados.OLHEIROS.filter((o) => o.tipo === 'f4').map((o) => ({ o, i: estado.interesse[o.id] || 0 })).sort((a, b) => b.i - a.i);
    const noKart = (camp.categoria || 'kart') === 'kart';
    if (noKart && ((camp.ordem === 2 && pos <= VAGAS_SUBIDA) || (camp.ordem === 1 && pos === 1) || (interesseF4[0] && interesseF4[0].i >= 40))) {
      const o = interesseF4[0].o;
      // Por que as equipes vieram: mostrado acima das propostas.
      if (camp.ordem === 2 && pos === 1) rel.motivoF4 = 'Campeão europeu! As equipes de F4 e as academias de F1 querem você.';
      else if (camp.ordem === 2 && pos <= VAGAS_SUBIDA) rel.motivoF4 = `Você terminou em P${pos} no ${camp.curto}: os ${VAGAS_SUBIDA} primeiros chamam a atenção das equipes de F4${pos <= 2 ? ' e das academias de F1' : ''}.`;
      else if (camp.ordem === 1 && pos === 1) rel.motivoF4 = 'O título brasileiro chamou a atenção de uma equipe de F4.';
      else rel.motivoF4 = `${o.nome} acompanhou suas corridas e gostou do que viu.`;
      propostasF4.push({ id: `pr${estado.proxId++}`, tipo: 'f4', nome: o.nome, equipe: o.equipe, texto: 'Vaga numa equipe de entrada da Fórmula 4 para o próximo ano. Você paga 60% do orçamento da equipe.' });
    }
    if (noKart && camp.ordem === 2 && pos <= 2) {
      const a = sortear(rnd, Dados.OLHEIROS.filter((x) => x.tipo === 'academia'));
      propostasF4.push({ id: `pr${estado.proxId++}`, tipo: 'academia', nome: a.nome, equipe: a.equipe, texto: 'Entrar no programa de jovens pilotos de uma equipe de F1: eles pagam a F4, numa equipe parceira de entrada.' });
    }
    // A FIA só deixa correr de F4 a partir dos 15 anos: a proposta fica guardada até lá.
    if (noKart) {
      const novas = propostasF4.splice(0, propostasF4.length);
      if (p.idade >= IDADE_F4) {
        if (estado.f4Reservada && !novas.some((x) => x.tipo === estado.f4Reservada.tipo)) {
          if (!novas.length) rel.motivoF4 = `Você completou ${IDADE_F4} anos: a vaga guardada na F4 chegou.`;
          novas.push({ ...estado.f4Reservada, id: `pr${estado.proxId++}` });
        }
        estado.f4Reservada = null;
        propostasF4.push(...novas);
      } else if (novas.length) {
        const melhor = novas.find((x) => x.tipo === 'academia') || novas[0];
        estado.f4Reservada = { ...melhor };
        rel.f4Espera = { nome: melhor.nome, idade: IDADE_F4 };
        noticia(estado, `${melhor.nome} quer ${p.nome} na F4 assim que completar ${IDADE_F4} anos.`);
      }
    }
    // Nos monopostos, os 4 primeiros recebem proposta da categoria seguinte (F4 → F3 → F2 → F1).
    const destino = !noKart && pos <= VAGAS_SUBIDA && PROXIMA_CATEGORIA[camp.id];
    if (destino) {
      const prox = campeonato(destino);
      rel.motivoF4 = pos === 1 ? `Campeão da ${camp.curto}! As equipes de ${prox.curto} querem você.` : `Você terminou em P${pos} na ${camp.curto}: os ${VAGAS_SUBIDA} primeiros chamam a atenção das equipes de ${prox.curto}.`;
      propostasF4.push(...propostasDeSubida(estado, destino, pos, rnd));
    }
    rel.equipes = equipesDisponiveis(estado, pos);
    estado.propostas = propostasF4;
    rel.propostasF4 = propostasF4.map((x) => x.nome);
    rel.dinheiroDepois = estado.dinheiro;

    const lista = equipesDaCategoria(estado);
    const custoMinimo = Math.round(lista[lista.length - 1].custoEtapa * camp.custo);
    estado.relatorio = rel;
    estado.espera = { ate: relogio(estado) + ESPERA_TEMPORADA_MS };
    estado.temporadas.push({ ano: rel.ano, campeonato: rel.campeonato, pos: rel.pos, pontos: rel.pontos, idade: estado.piloto.idade - 1,
      dueloVenci: rel.duelo ? rel.duelo.corrida[0] > rel.duelo.corrida[1] : null });
    estado.ano += 1;
    estado.fase = estado.dinheiro < custoMinimo && !propostasF4.length ? 'falencia' : 'relatorio';
    noticia(estado, `${p.nome} termina ${rel.ano} em P${pos} na ${camp.nome}. Campeão: ${rel.campeao}.`);
    // Subida dentro do kart (Regional → Brasileiro → Europeu): a vaga vira notícia.
    if (proximo && rel.opcoes.includes(proximo.id)) {
      noticia(estado, `${p.nome} conquistou a vaga e pode correr o ${proximo.nome} em ${rel.ano + 1}!${pos <= VAGAS_SUBIDA ? ` O P${pos} no ${camp.curto} garantiu a subida.` : ' A popularidade abriu as portas.'}`);
    }
    if (camp.id === 'f1' && pos === 1) {
      const n = estado.temporadas.filter((t) => t.campeonato === 'f1' && t.pos === 1).length;
      noticia(estado, `${n === 1 ? 'Campeão mundial!' : `${n}º título mundial!`} Próxima meta: o ${['', 'bi', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa'][n] || `${n + 1}º `}campeonato.`);
    }
    // Aos 38 anos a carreira acaba: o relatório só oferece pendurar o capacete.
    rel.aposentadoria = p.idade >= IDADE_APOSENTADORIA;
    if (rel.aposentadoria) estado.propostas = [];
  }

  // Mercado de fim de ano: quais equipes aceitam o piloto para o próximo ano.
  // A sua sempre aceita; as pequenas também; as intermediárias querem top 12 (ou alguma popularidade);
  // as de ponta querem top 6 (ou popularidade alta).
  function equipesDisponiveis(estado, pos) {
    const pop = estado.piloto.popularidade;
    return equipesDaCategoria(estado).map((e) => e.id).filter((id) => {
      if (id === estado.equipeId) return true;
      const porte = porteDe(id);
      if (porte === 'pequena') return true;
      if (porte === 'media') return pos <= 12 || pop >= 15;
      // Na F1, as equipes de ponta só chamam quem terminou no top 6 ou venceu o duelo com o companheiro.
      if (estado.campeonato === 'f1') return pos <= 6 || !!(estado.duelo && estado.duelo.corrida[0] > estado.duelo.corrida[1]);
      return pos <= 6 || pop >= 30;
    });
  }

  // Começa o ano seguinte no campeonato e na equipe escolhidos.
  function proximaTemporada(estado, campeonatoId, equipeId = estado.equipeId) {
    if (estado.relatorio && estado.relatorio.aposentadoria) return { ok: false, erro: `Aos ${IDADE_APOSENTADORIA} anos é hora de pendurar o capacete.` };
    if (!estado.relatorio.opcoes.includes(campeonatoId)) return { ok: false, erro: 'Campeonato não disponível.' };
    const equipes = estado.relatorio.equipes || [estado.equipeId];
    if (!equipes.includes(equipeId)) return { ok: false, erro: 'Essa equipe não aceitou você.' };
    if (equipeId !== estado.equipeId) {
      const lista = equipesDaCategoria(estado);
      const antes = lista.findIndex((e) => e.id === estado.equipeId);
      const depois = lista.findIndex((e) => e.id === equipeId);
      noticia(estado, `${estado.piloto.nome} troca a ${equipeBase(estado.equipeId).nome} pela ${equipeBase(equipeId).nome} para ${estado.ano}.`);
      if (depois < antes) mexerCabeca(estado, { moral: 4 });
      estado.equipeId = equipeId;
    }
    estado.campeonato = campeonatoId;
    sincronizarTeto(estado);
    // Contrato de monoposto (60%, programa de jovens ou salário) continua na mesma equipe; trocar de equipe ou de campeonato zera.
    if (!(estado.contrato && estado.contrato.equipe === estado.equipeId && categoriaDe(estado) !== 'kart')) estado.contrato = null;
    estado.propostas = estado.propostas.filter((p) => p.tipo !== 'f4' && p.tipo !== 'academia' && p.tipo !== 'subida');
    iniciarTemporada(estado);
    noticia(estado, `${estado.piloto.nome} disputa a ${campeonato(campeonatoId).nome} em ${estado.ano}.`);
    return { ok: true };
  }

  // ---------- recordes e conquistas ----------
  // Números da carreira inteira, do kart à F1.
  function recordesCarreira(estado) {
    const h = estado.historico;
    const ok = h.filter((x) => !x.fora);
    const sprints = estado.sprints || [];
    const porCategoria = {};
    for (const x of h) {
      const c = porCategoria[x.campeonato] || (porCategoria[x.campeonato] = { corridas: 0, vitorias: 0, podios: 0, melhor: null });
      c.corridas += 1;
      if (!x.fora) {
        if (x.pos === 1) c.vitorias += 1;
        if (x.pos <= 3) c.podios += 1;
        c.melhor = c.melhor == null ? x.pos : Math.min(c.melhor, x.pos);
      }
    }
    for (const t of estado.temporadas) {
      const c = porCategoria[t.campeonato];
      if (c) { c.titulos = (c.titulos || 0) + (t.pos === 1 ? 1 : 0); c.melhorCampeonato = Math.min(c.melhorCampeonato || 99, t.pos); }
    }
    const primeira = ok.find((x) => x.pos === 1);
    const pistas = Object.entries(estado.recordes || {}).filter(([, r]) => r.jogador).map(([chave, r]) => ({ chave, ...r }));
    return {
      corridas: h.length,
      vitorias: ok.filter((x) => x.pos === 1).length,
      podios: ok.filter((x) => x.pos <= 3).length,
      poles: h.filter((x) => x.pole).length,
      voltasRapidas: h.filter((x) => x.voltaRapida).length,
      pontos: h.reduce((t, x) => t + (x.pontos || 0), 0),
      abandonos: h.length - ok.length,
      titulos: estado.temporadas.filter((t) => t.pos === 1).length,
      sprintsVencidas: sprints.filter((x) => !x.fora && x.pos === 1).length,
      primeiraVitoria: primeira ? { ano: primeira.ano, pista: primeira.pista, campeonato: primeira.campeonato } : null,
      porCategoria,
      pistas,
    };
  }

  // Conquistas: ids estáveis, prontos para virar conquistas do Game Center.
  const titulo = (camp) => (e) => e.temporadas.some((t) => t.campeonato === camp && t.pos === 1);
  const correu = (camp) => (e) => e.campeonato === camp || e.historico.some((h) => h.campeonato === camp);
  const CONQUISTAS = [
    { id: 'primeira_corrida', nome: 'Bandeirada', texto: 'Termine a primeira corrida.', ok: (e) => e.historico.some((h) => !h.fora) },
    { id: 'primeiros_pontos', nome: 'Primeiros pontos', texto: 'Termine entre os 10 primeiros.', ok: (e) => e.historico.some((h) => !h.fora && h.pos <= 10) },
    { id: 'primeiro_podio', nome: 'Pódio', texto: 'Termine entre os 3 primeiros.', ok: (e) => e.historico.some((h) => !h.fora && h.pos <= 3) },
    { id: 'primeira_vitoria', nome: 'Primeira vitória', texto: 'Vença uma corrida.', ok: (e) => e.historico.some((h) => !h.fora && h.pos === 1) },
    { id: 'primeira_pole', nome: 'Pole position', texto: 'Faça a pole na classificação.', ok: (e) => e.historico.some((h) => h.pole) },
    { id: 'volta_rapida', nome: 'Volta mais rápida', texto: 'Faça a volta mais rápida de uma corrida.', ok: (e) => e.historico.some((h) => h.voltaRapida) },
    { id: 'hat_trick', nome: 'Hat-trick', texto: 'Pole, vitória e volta mais rápida na mesma etapa.', ok: (e) => e.historico.some((h) => h.pole && h.voltaRapida && !h.fora && h.pos === 1) },
    { id: 'escalada', nome: 'Escalada', texto: 'Vença largando de P10 ou mais atrás.', ok: (e) => e.historico.some((h) => !h.fora && h.pos === 1 && h.largada >= 10) },
    { id: 'mestre_chuva', nome: 'Mestre da chuva', texto: 'Vença uma corrida com chuva.', ok: (e) => e.historico.some((h) => !h.fora && h.pos === 1 && h.chuva) },
    { id: 'dono_da_pista', nome: 'Dono da pista', texto: 'Bata um recorde de pista.', ok: (e) => Object.values(e.recordes || {}).some((r) => r.jogador) },
    { id: 'rei_interlagos', nome: 'Rei de Interlagos', texto: 'Tenha o recorde de Interlagos, no kart ou na F1.', ok: (e) => Object.entries(e.recordes || {}).some(([k, r]) => r.jogador && /(^|:)(interlagos|pace)$/.test(k)) },
    { id: 'sprint', nome: 'Rei do sábado', texto: 'Vença uma corrida sprint.', ok: (e) => (e.sprints || []).some((x) => !x.fora && x.pos === 1) },
    { id: 'dez_vitorias', nome: '10 vitórias', texto: 'Some 10 vitórias na carreira.', ok: (e) => e.historico.filter((h) => !h.fora && h.pos === 1).length >= 10 },
    { id: 'cinquenta_corridas', nome: 'Veterano', texto: 'Dispute 50 corridas.', ok: (e) => e.historico.length >= 50 },
    { id: 'companheiro', nome: 'Primeiro piloto', texto: 'Termine uma temporada vencendo o duelo com o companheiro.', ok: (e) => e.temporadas.some((t) => t.dueloVenci) },
    { id: 'campeao_regional', nome: 'Campeão regional', texto: 'Vença a Copa Paulista de Kart.', ok: titulo('regional') },
    { id: 'campeao_brasileiro', nome: 'Campeão brasileiro', texto: 'Vença o Brasileiro de Kart.', ok: titulo('nacional') },
    { id: 'campeao_europeu', nome: 'Campeão europeu', texto: 'Vença o Europeu de Kart.', ok: titulo('internacional') },
    { id: 'chegou_f4', nome: 'Monoposto', texto: 'Chegue à F4.', ok: correu('f4') },
    { id: 'campeao_f4', nome: 'Campeão da F4', texto: 'Vença a F4.', ok: titulo('f4') },
    { id: 'chegou_f3', nome: 'Fórmula 3', texto: 'Chegue à F3.', ok: correu('f3') },
    { id: 'campeao_f3', nome: 'Campeão da F3', texto: 'Vença a F3.', ok: titulo('f3') },
    { id: 'chegou_f2', nome: 'Fórmula 2', texto: 'Chegue à F2.', ok: correu('f2') },
    { id: 'campeao_f2', nome: 'Campeão da F2', texto: 'Vença a F2.', ok: titulo('f2') },
    { id: 'superlicenca', nome: 'Superlicença', texto: 'Chegue à Fórmula 1.', ok: correu('f1') },
    { id: 'primeira_vitoria_f1', nome: 'Vencedor de GP', texto: 'Vença um GP de Fórmula 1.', ok: (e) => e.historico.some((h) => h.campeonato === 'f1' && !h.fora && h.pos === 1) },
    { id: 'campeao_mundial', nome: 'Campeão mundial', texto: 'Vença o Mundial de Fórmula 1.', ok: titulo('f1') },
    { id: 'campeao_jovem', nome: 'Prodígio', texto: 'Seja campeão mundial com menos de 21 anos.', ok: (e) => e.temporadas.some((t) => t.campeonato === 'f1' && t.pos === 1 && t.idade < 21) },
    // Metas de lenda, para depois do primeiro título.
    { id: 'bicampeao', nome: 'Bicampeão', texto: 'Vença o Mundial de Fórmula 1 duas vezes.', ok: (e) => e.temporadas.filter((t) => t.campeonato === 'f1' && t.pos === 1).length >= 2 },
    { id: 'tricampeao', nome: 'Tricampeão', texto: 'Vença o Mundial de Fórmula 1 três vezes.', ok: (e) => e.temporadas.filter((t) => t.campeonato === 'f1' && t.pos === 1).length >= 3 },
    { id: 'vinte_gps', nome: '20 GPs', texto: 'Vença 20 GPs de Fórmula 1.', ok: (e) => e.historico.filter((h) => h.campeonato === 'f1' && !h.fora && h.pos === 1).length >= 20 },
    { id: 'dez_poles_f1', nome: 'Rei da classificação', texto: 'Faça 10 poles na Fórmula 1.', ok: (e) => e.historico.filter((h) => h.campeonato === 'f1' && h.pole).length >= 10 },
    { id: 'desafio_ouro', nome: 'Ouro no desafio', texto: 'Ganhe a medalha de ouro num desafio do dia.', ok: (e) => !!(e.desafio && e.desafio.medalhas && e.desafio.medalhas.ouro) },
    { id: 'galeria', nome: 'Galeria da fama', texto: 'Encerre a carreira com um título mundial.', ok: (e) => e.fase === 'aposentado' && titulo('f1')(e) },
  ];

  // ---------- fim da carreira ----------
  // Aposentadoria: a partir dos 21 anos, ou a qualquer momento depois de um título mundial. Aos 38 é obrigatória.
  const IDADE_APOSENTADORIA = 38;
  const podeEncerrar = (estado) => estado.fase === 'relatorio' && (estado.piloto.idade >= 21 || titulo('f1')(estado));
  function galeriaDaFama(estado) {
    const h = estado.historico;
    const ok = h.filter((x) => !x.fora);
    const f1 = h.filter((x) => x.campeonato === 'f1');
    return {
      nome: estado.piloto.nome, idade: estado.piloto.idade, anoFim: estado.ano - 1, temporadas: estado.temporadas.length,
      corridas: h.length, vitorias: ok.filter((x) => x.pos === 1).length, podios: ok.filter((x) => x.pos <= 3).length, poles: h.filter((x) => x.pole).length,
      titulos: estado.temporadas.filter((t) => t.pos === 1).map((t) => ({ ano: t.ano, campeonato: t.campeonato })),
      f1: { corridas: f1.length, vitorias: f1.filter((x) => !x.fora && x.pos === 1).length, podios: f1.filter((x) => !x.fora && x.pos <= 3).length, poles: f1.filter((x) => x.pole).length,
        titulos: estado.temporadas.filter((t) => t.campeonato === 'f1' && t.pos === 1).length,
        melhor: Math.min(...estado.temporadas.filter((t) => t.campeonato === 'f1').map((t) => t.pos), 99) },
      conquistas: Object.keys(estado.conquistas || {}).length, totalConquistas: CONQUISTAS.length,
      escada: estado.temporadas.map((t) => ({ ano: t.ano, campeonato: t.campeonato, pos: t.pos })),
    };
  }
  function encerrarCarreira(estado) {
    if (!podeEncerrar(estado)) return { ok: false, erro: 'Ainda é cedo para pendurar o capacete.' };
    estado.fase = 'aposentado';
    estado.propostas = [];
    estado.galeria = galeriaDaFama(estado);
    const t = estado.galeria.f1.titulos;
    noticia(estado, `${estado.piloto.nome} anuncia a aposentadoria aos ${estado.piloto.idade} anos${t ? `, com ${t} ${t > 1 ? 'títulos mundiais' : 'título mundial'}` : ''}.`);
    return { ok: true };
  }
  // Confere as conquistas e devolve as novas (para avisar o jogador).
  function conferirConquistas(estado) {
    if (!estado.conquistas) estado.conquistas = {};
    const novas = [];
    for (const c of CONQUISTAS) {
      if (estado.conquistas[c.id] || !c.ok(estado)) continue;
      estado.conquistas[c.id] = { ano: estado.ano };
      novas.push(c);
    }
    return novas;
  }

  const Carreira = {
    sortearNomesEquipes, usarNomesEquipes, categoriaDe, equipesDaCategoria, PIT_F4,
    VAGAS_SUBIDA, IDADE_F4, motorPedeRevisao, equipesDisponiveis, ATRIBUTOS, NOMES_ATRIBUTOS, ETAPAS, etapasDe, VOLTAS_POR_SAIDA, seguir, pendenciasEtapa, PORTES, porteDe, equipesIniciais, humor, sessaoPsicologo, precoPsicologo, migrar, efeitoCabeca, APOIO_FAMILIA, SAIDAS_TREINO, SAIDAS_GRATIS, saidasTreino, HORAS_REVISAO, MAX_PATROCINIOS,
    compostoDaEtapa, compostoUnico, secoDaEtapa, pneuValeNaEtapa,
    investirPonto, devolverPonto, custoPonto, PISO_ATRIBUTO, TETO_CATEGORIA, POTENCIAL_MAXIMO, pontosEvolucaoDa, EVOLUCAO_AUTOMATICA,
    PONTOS_BASE_EVOLUCAO, BONUS_EVOLUCAO, BONUS_ATE_P10, MAX_BONUS_VITORIAS, bonusPosicao, bonusVitorias,
    limiteEmprestimo, simularEmprestimo, pegarEmprestimo, quitarEmprestimo, valorQuitacao, PRAZOS_EMPRESTIMO, MULTA_ATRASO,
    definirPremium, ehPremium, maxPatrocinios, PATROCINIOS_GRATIS, EQUIPE_BOX, NIVEL_BOX_MAX, nivelBox, precoBox, melhorarBox,
    PALETA_CORES, coresDoPiloto, definirCores,
    campeonato, condicaoSessao, equipeBase, nota, novoJogo, comecarNaF4, comecarEm, custoEtapa, custoTemporada, salarioEtapa, AREAS_DEV, NIVEL_DEV_MAX, GANHO_DEV, nivelDev, precoDev, desenvolverCarro, PREPARACAO, NIVEL_PREP_MAX, nivelPrep, precoPrep, prepararPiloto, tetoEstimado, PROXIMA_CATEGORIA, carroDe, comprarPneu, reporEstoque, descartarPneu, espacoPneus, limiteEspaco, precoEspaco, comprarEspaco, revisarMotor, retificarMotor, MECANICOS, precoMecanico, precoHoraExtra, mecanicoDoFds, mecanicoAtivo, contratarMecanico, pagarHoraExtra, venderPneu, valorVendaPneu, doarPneu, pneuNoFim, GASTO_PARA_SAIR, amaciarPneu, pneuNovo, pneuAmaciado, MAX_PNEUS, precoRetifica, precoPneu, precoRevisao,
    textoMeta, DURACOES_PATROCINIO, duracoesPatrocinio, aceitarPatrocinio, recusarPatrocinio, aceitarProposta, recusarProposta,
    esperaTemporada, liberarEspera, ESPERA_TEMPORADA_MS, pistaAtual, climaAtual, leituraPista, recordePista, iniciarFimDeSemana, pularEtapa, definirSetup, escolherPneu, saidaTreino, pedirSugestao,
    irParaClassificacao, classificar, criarCorrida, concluirCorrida, anotarCorrida, concluirEtapa, nomeDe,
    classificacaoCampeonato, posicaoNoCampeonato, proximaTemporada, companheiro, recordesCarreira, CONQUISTAS, conferirConquistas, nomeDoPiloto, rivalCarreira, desafioDaSemana, desafioLiberado, desafioModalPendente, desafioAtivo, aceitarDesafio, declinarDesafio, premioMedalha, estadoDesafio, tentarDesafio, ajustarDesafio, voltasDesafio, TENTATIVAS_DESAFIO, podeEncerrar, encerrarCarreira, galeriaDaFama, IDADE_APOSENTADORIA, concluirSprint, ordemLargada, sprintPendente, voltasSprint, PONTOS_SPRINT, usaCompostos, escolherComposto, vidaComposto, compostoMontado, quatroPneus, tiposPneu, nomePneu, vidaDoPneu, faltaNoEstoque, estoqueImpede, compostosMinimos, COMPOSTO_DO_TIPO, TIPO_DO_COMPOSTO,
  };
  if (typeof module === 'object' && module.exports) module.exports = Carreira;
  else root.BoxCarreira = Carreira;
})(this);
