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
  // Motor de kart conta horas de uso: cada saída de treino, a classificação e a corrida somam.
  // Passou de HORAS_REVISAO sem revisão, perde força e fica mais frágil.
  const HORAS_REVISAO = 3.5;
  const HORAS = { saida: 0.12, amaciar: 0.03, quali: 0.08, corrida: 0.3 };
  const somarHoras = (estado, h) => { estado.motorHoras = Math.round((estado.motorHoras + h) * 100) / 100; };
  // Já pede revisão antes da próxima etapa? (uma etapa inteira gasta cerca de 0,9 h)
  const motorPedeRevisao = (estado) => estado.motorHoras >= HORAS_REVISAO - 0.9;
  // Idade mínima da FIA para a Fórmula 4.
  const IDADE_F4 = 15;
  const CUSTO_REVISAO = 2500;
  // Motor engripado: retífica expressa (cara, corre a próxima etapa) ou normal (mais barata, perde a etapa).
  const CUSTO_RETIFICA = { expressa: 15000, normal: 6000 };
  // Prêmio por etapa para os 10 primeiros, multiplicado pelo custo do campeonato.
  const PREMIO_ETAPA = [3000, 2000, 1500, 1200, 1000, 800, 600, 400, 300, 200];
  // Os 4 primeiros do campeonato sobem de degrau (no Europeu, para a F4).
  const VAGAS_SUBIDA = 4;
  const MAX_PATROCINIOS = 3;
  const APOIO_FAMILIA = 20000; // por temporada, multiplicado pelo custo do campeonato

  const limitar = (x, min, max) => Math.max(min, Math.min(max, x));
  const sortear = (rnd, lista) => lista[Math.floor(rnd() * lista.length)];
  const campeonato = (id) => Dados.CAMPEONATOS.find((c) => c.id === id);
  // Nomes das equipes desta carreira (sorteados no novo jogo); sem sorteio, valem os nomes de Dados.EQUIPES.
  let nomesEquipes = {};
  const equipeBase = (id) => {
    const e = Dados.EQUIPES.find((x) => x.id === id) || Dados.EQUIPES_F4.find((x) => x.id === id);
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
  const PORTES_F4 = {
    ponta: ['f4-vortex', 'f4-rossa', 'f4-apex', 'f4-lionheart'],
    media: ['f4-scorpio', 'f4-aquila', 'f4-mistral', 'f4-nordwind'],
    pequena: ['f4-pampa', 'f4-box13'],
  };
  const porteDe = (id) => Object.keys(PORTES).find((k) => PORTES[k].equipes.includes(id) || PORTES_F4[k].includes(id));

  // Categoria do campeonato atual (kart ou f4) e as equipes dela.
  const categoriaDe = (estado) => campeonato(estado.campeonato).categoria || 'kart';
  const equipesDaCategoria = (estado) => (categoriaDe(estado) === 'f4' ? Dados.EQUIPES_F4 : Dados.EQUIPES);
  // O modelo do carro (ajustes, acerto ideal, falas) acompanha a categoria.
  function sincronizarCategoria(estado) {
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
    const p = { id: `r${estado.proxId++}`, nome: `${sortear(rnd, n.p)} ${sobrenome}`, pais, idade: 11 + Math.floor(rnd() * 5) };
    for (const a of ATRIBUTOS) p[a] = Math.round(limitar(nivel + rnd.gauss() * 5, 35, 95));
    return p;
  }

  // Monta o grid do campeonato: 19 rivais em 10 equipes (2 vagas cada); você ocupa uma vaga na sua equipe.
  function montarGrid(estado) {
    const rnd = rngDe(estado);
    const camp = campeonato(estado.campeonato);
    const usados = new Set([estado.piloto ? estado.piloto.nome.split(' ').slice(1).join(' ') : '']);
    const rivais = Array.from({ length: 19 }, () => gerarRival(estado, rnd, camp.nivel, camp.regiao, usados))
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
    estado.rivais = rivais;
    estado.pontos = { jogador: 0, ...Object.fromEntries(rivais.map((r) => [r.id, 0])) };
    estado.seguindo = null; // rivais novos a cada temporada
    estado.vitorias = {};
    estado.podios = {};
  }

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

  // Parada no box na F4 (para trocar para pneu de chuva), em segundos.
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
    // Carreiras antigas, sem sorteio, continuam com os nomes originais.
    usarNomesEquipes(estado && estado.nomesEquipes);
    if (estado && estado.campeonato) sincronizarCategoria(estado);
    // Carreiras antigas contavam o motor em etapas; agora são horas (cerca de 0,9 h por etapa).
    if (estado && estado.piloto && !estado.motorEmHoras) { estado.motorHoras = Math.round((estado.motorHoras || 0) * 0.9 * 100) / 100; estado.motorEmHoras = true; }
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
    const cansaco = jogador ? Math.max(0, estado.motorHoras - HORAS_REVISAO) * 1.6 : 0;
    return {
      motor: Math.round(e.material - cansaco), aero: e.material, chassi: e.material,
      confiabilidade: Math.round(82 + e.organizacao / 7 - cansaco),
    };
  }

  // Estoque de pneus: no máximo MAX_PNEUS jogos guardados.
  const MAX_PNEUS = 6;
  const VIDA_PNEU = 26; // voltas até o pneu "cair"
  // Pneu novo (zerado) rende menos nas primeiras voltas; amaciado (1 a 4 voltas) rende o máximo.
  const AMACIAR_VOLTAS = 2;
  const pneuNovo = (p) => p.uso < 1;
  const pneuAmaciado = (p) => p.uso >= 1 && p.uso <= 4;
  // Segundos a mais numa volta por causa de pneu ainda zerado (some depois de ~3 voltas).
  const penalidadeZerado = (uso) => Math.max(0, 0.3 * (1 - uso / 2));

  function comprarPneu(estado, tipo, gratis = false) {
    if (estado.pneus.length >= MAX_PNEUS) return { ok: false, erro: `Estoque cheio (${MAX_PNEUS} jogos): venda, doe ou descarte um pneu.` };
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

  // Venda de pneu usado para equipes menores: até metade do preço, menos quanto mais gasto.
  function valorVendaPneu(estado, p) {
    const preco = Kart.PNEUS_KART[p.tipo].preco * campeonato(estado.campeonato).custo;
    return Math.round(preco * Math.max(0.05, 0.5 * (1 - p.uso / VIDA_PNEU)) / 10) * 10;
  }

  function venderPneu(estado, id) {
    const p = pneuPorId(estado, id);
    if (!p) return { ok: false, erro: 'Pneu não encontrado.' };
    if (estado.fase === 'fds') return { ok: false, erro: 'Pneu só se vende no paddock.' };
    const valor = valorVendaPneu(estado, p);
    estado.dinheiro += valor;
    descartarPneu(estado, id);
    return { ok: true, valor };
  }

  // Doar para a escolinha de kart: sem dinheiro, mas o piloto e o público gostam (uma vez por etapa).
  function doarPneu(estado, id) {
    if (!pneuPorId(estado, id)) return { ok: false, erro: 'Pneu não encontrado.' };
    if (estado.fase === 'fds') return { ok: false, erro: 'A doação é feita no paddock.' };
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
    const custo = Math.round(CUSTO_REVISAO * campeonato(estado.campeonato).custo);
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
    iniciante: { nome: 'Mecânico iniciante', icone: 'chave', preco: 3000, extra: 0, qualidade: 60, faz: 'palpite',
      descricao: 'Dá palpites sobre o que mexer. Fica o fim de semana todo.' },
    experiente: { nome: 'Mecânico experiente', icone: 'ajustes', preco: 6000, extra: 2500, qualidade: 82, faz: 'tecnica',
      descricao: 'Anos de kart: diz o que mudar e quanto. Cobra hora extra a cada sessão a mais.' },
    pro: { nome: 'Técnico profissional', icone: 'trofeu', preco: 16000, extra: 6000, qualidade: 96, faz: 'monta',
      descricao: 'Monta o kart para você. Muito caro, e cobra hora extra a cada sessão a mais.' },
  };
  const SESSOES_MECANICO = ['treino', 'quali', 'grid'];

  const precoMecanico = (estado, tipo) => Math.round(MECANICOS[tipo].preco * campeonato(estado.campeonato).custo / 100) * 100;
  const precoHoraExtra = (estado, tipo) => Math.round(MECANICOS[tipo].extra * campeonato(estado.campeonato).custo / 100) * 100;

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
    if (!estado.pneus.some((p) => p.tipo === 'slick' && p.uso < 5)) {
      lista.push({ id: 'slick', texto: 'Nenhum slick novo para a classificação e a corrida.' });
    }
    const clima = estado.calendario[estado.etapa] && estado.calendario[estado.etapa].clima;
    if (clima && clima.tarde.chance >= 40 && !estado.pneus.some((p) => p.tipo === 'chuva' && p.uso < 15)) {
      lista.push({ id: 'chuva', texto: `Previsão de ${clima.tarde.chance}% de chuva à tarde e nenhum pneu de chuva em bom estado.` });
    }
    if (!estado.motorQuebrado && motorPedeRevisao(estado)) {
      const h = `${String(estado.motorHoras).replace('.', ',')} h de ${String(HORAS_REVISAO).replace('.', ',')} h`;
      lista.push({ id: 'motor', texto: estado.motorHoras > HORAS_REVISAO ? `Motor cansado, perdendo força (${h}).` : `Motor na hora da revisão (${h}).` });
    }
    return lista;
  }

  const precoPneu = (estado, tipo) => Math.round(Kart.PNEUS_KART[tipo].preco * campeonato(estado.campeonato).custo);
  const precoRetifica = (estado, tipo) => Math.round(CUSTO_RETIFICA[tipo] * campeonato(estado.campeonato).custo);

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

  const precoRevisao = (estado) => Math.round(CUSTO_REVISAO * campeonato(estado.campeonato).custo);

  // ---------- patrocínio ----------
  function gerarOfertasPatrocinio(estado, rnd, quantidade) {
    const pop = estado.piloto.popularidade;
    const porte = pop < 15 ? 0 : pop < 40 ? 1 : 2;
    const camp = campeonato(estado.campeonato);
    for (let i = 0; i < quantidade; i++) {
      const empresa = sortear(rnd, Dados.PATROCINADORES[porte]);
      if (estado.patrocinios.some((p) => p.empresa === empresa) || estado.ofertasPatrocinio.some((p) => p.empresa === empresa)) continue;
      const porEtapa = Math.round((1300 + Math.min(pop, 80) * 30) * [1, 1.3, 1.6][porte] * Math.sqrt(camp.custo) * (0.7 + rnd() * 0.6) / 100) * 100;
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

  function aceitarProposta(estado, id) {
    const pr = estado.propostas.find((p) => p.id === id);
    if (!pr) return { ok: false, erro: 'Proposta expirada.' };
    if (pr.tipo === 'f3') {
      estado.fase = 'f4';
      estado.final = { proposta: pr, ano: estado.ano, idade: estado.piloto.idade, categoria: 'f3' };
      noticia(estado, `${estado.piloto.nome} assina com ${pr.nome} e sobe para a Fórmula 3!`);
      return { ok: true };
    }
    if (pr.tipo === 'f4' || pr.tipo === 'academia') return entrarNaF4(estado, pr);
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

  // Assina com uma equipe de F4: começa a temporada de monopostos (fim do kart).
  // Atalho da abertura: a carreira já começa na F4, aos 15 anos, como se tivesse feito três anos de kart.
  function comecarNaF4(estado) {
    const p = estado.piloto;
    estado.ano += IDADE_F4 - p.idade;
    p.idade = IDADE_F4;
    for (const a of ATRIBUTOS) p[a] = Math.min(p.potencial, p[a] + 18);
    p.popularidade = 35;
    estado.dinheiro = 120000;
    estado.noticias = [];
    return entrarNaF4(estado, { tipo: 'f4', equipe: 'f4-apex' });
  }

  function entrarNaF4(estado, pr) {
    const equipeId = pr.equipe || 'f4-apex';
    estado.campeonato = 'f4';
    estado.equipeId = equipeId;
    const base = equipeBase(equipeId);
    estado.contrato = {
      equipe: equipeId, tipo: pr.tipo, segundoPiloto: false,
      custoEtapa: pr.tipo === 'academia' ? 0 : Math.round(base.custoEtapa * campeonato('f4').custo * 0.6 / 100) * 100,
    };
    estado.propostas = [];
    estado.seguindo = null;
    noticia(estado, `${estado.piloto.nome} assina com a ${base.nome} e deixa o kart rumo aos monopostos!`);
    iniciarTemporada(estado);
    noticia(estado, `${estado.piloto.nome} estreia na ${campeonato('f4').nome} em ${estado.ano}.`);
    return { ok: true, f4: true };
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

  function recordePista(estado, pista = pistaAtual(estado)) {
    return (estado.recordes && estado.recordes[pista.id]) || recordeInicial(pista);
  }

  // Confere uma volta contra o recorde. Devolve true se for um novo recorde.
  function tentarRecorde(estado, tempo, id, sessao) {
    const pista = pistaAtual(estado);
    if (!(tempo < recordePista(estado, pista).tempo)) return false;
    if (!estado.recordes) estado.recordes = {};
    estado.recordes[pista.id] = { tempo: Math.round(tempo * 1000) / 1000, nome: nomeDe(estado, id), ano: estado.ano, sessao, jogador: id === 'jogador' };
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
      ...p, voltas: camp.voltas, perdaBox: 99,
      // Asfalto abrasivo gasta mais pneu; liso, menos. Retas longas facilitam a ultrapassagem.
      desgaste: DESGASTE_ASFALTO[p.asfalto] || 0.9,
      ultrapassagem: p.ultrapassagem != null ? p.ultrapassagem : { travada: 0.4, mista: 0.55, veloz: 0.7 }[p.tipo],
      peso: { motor: 1, aero: 0.3, chassi: 1.4 },
    };
  }

  const climaAtual = (estado) => estado.calendario[estado.etapa].clima;

  function iniciarFimDeSemana(estado) {
    const custo = custoEtapa(estado);
    if (estado.motorQuebrado) return { ok: false, erro: 'O motor engripou: faça a retífica antes de ir para a pista.' };
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
      sessao: 'treino', saidas: [], mecanico: null, ia, cabeca: [],
      // Começa do acerto da etapa anterior (se for da mesma categoria).
      setup: anterior && Kart.ORDEM_AJUSTES.every((k) => k in anterior) ? { ...anterior } : Kart.setupPadrao(),
      pneuId: (pneuMaisNovo(estado, manha.molhado ? 'chuva' : 'slick') || {}).id || null,
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
    let melhor = Infinity;
    for (let i = 0; i < voltas; i++) {
      const t = Engine.ritmoBase(entrada, pista) - 0.6
        + ef.tempo + cab.tempo + chuvaPiloto(entrada.piloto, cond)
        + Engine.PNEUS.Md.desgaste * (usoPneu + i * ef.desgaste)
        + penalidadeZerado(usoPneu + i * ef.desgaste)
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

  // O acerto fica livre em todas as sessões, inclusive no grid.
  function definirSetup(estado, setup) {
    estado.fds.setup = Kart.arredondarSetup({ ...estado.fds.setup, ...setup });
  }

  function escolherPneu(estado, id) {
    if (pneuPorId(estado, id)) estado.fds.pneuId = id;
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
    if (fds.saidas.length >= SAIDAS_TREINO) return { ok: false, erro: 'O treino livre acabou.' };
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
      conselho = ['Montei o kart para essas condições. Pode acelerar.'];
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
    const monoposto = categoriaDe(estado) === 'f4';
    const ajusteVolta = (c, v, corrida) => {
      const molhado = chuvaDesde != null && v >= chuvaDesde;
      if (molhado && !corrida.chuvaAnunciada) {
        corrida.chuvaAnunciada = true;
        if (v > 1) Engine.registrar(corrida, 'Começou a chover!', 'sc');
      }
      corrida.molhado = molhado;
      const cond = Kart.condicao(clima, 'corrida', molhado);
      const setup = c.jogador ? fds.setupCorrida : fds.ia[c.id].tarde;
      // Na F4 dá para parar no box e trocar para pneu de chuva (o jogador pede; a IA para uma ou duas voltas depois da chuva).
      let pit = 0;
      if (monoposto && molhado && c.tipoPneu === 'slick' && (c.jogador ? corrida.boxJogador : v >= chuvaDesde + (c.id.charCodeAt(c.id.length - 1) % 2))) {
        c.tipoPneu = 'chuva';
        c.uso = 0;
        pit = PIT_F4;
        corrida.boxJogador = c.jogador ? false : corrida.boxJogador;
        Engine.registrar(corrida, `${c.piloto.nome} para no box e coloca pneu de chuva.`, 'box', c.id);
      }
      const pneu = c.tipoPneu;
      const ef = Kart.efeito(setup, pista, cond, pneu);
      ef.tempo += pit;
      // Motor passado da revisão aguenta menos quando é forçado.
      if (c.jogador) ef.quebra *= 1 + 0.5 * Math.max(0, estado.motorHoras - HORAS_REVISAO + 0.9) / 0.9;
      if (c.jogador) ef.tempo += penalidadeZerado(c.uso);
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

    // Pneu usado na corrida volta para o estoque com o desgaste.
    const pneu = pneuPorId(estado, fds.pneuCorrida);
    const carro = corrida.carros.find((c) => c.jogador);
    if (pneu) pneu.uso = Math.round(carro.uso);
    somarHoras(estado, HORAS.corrida);
    if (meu.fora && meu.motivoFora === 'Motor engripou') {
      estado.motorQuebrado = true;
      noticia(estado, `O motor de ${p.nome} engripou! A equipe vai precisar de uma retífica.`);
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
    evoluir(p, rnd, aprendizado * fatorMoral(p));
    const recordeCorrida = conferirRecorde(estado, corrida.carros.map((c) => ({ id: c.id, tempo: c.melhorVolta })), 'corrida');
    fds.resultado = { recorde: recordeCorrida, pos: meu.pos, fora: meu.fora, motivo: meu.motivoFora, pontos: meu.pontos, ganho, patrocinio: patroc, eventos, olheiros: estado.olheiros.map((o) => o.nome), cabeca: fds.cabeca || [] };
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

    if (pos <= VAGAS_SUBIDA) {
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
    // O próximo degrau é sempre da mesma categoria (a F4 só se alcança por proposta).
    const proximo = Dados.CAMPEONATOS.find((c) => c.ordem === camp.ordem + 1 && (c.categoria || 'kart') === (camp.categoria || 'kart'));
    rel.opcoes = [camp.id];
    if (proximo && (pos <= VAGAS_SUBIDA || p.popularidade >= 20 * (camp.ordem + 1))) rel.opcoes.push(proximo.id);

    // Equipes de F4 e academias de F1: só para quem brilhou nos campeonatos maiores.
    const propostasF4 = [];
    const interesseF4 = Dados.OLHEIROS.filter((o) => o.tipo === 'f4').map((o) => ({ o, i: estado.interesse[o.id] || 0 })).sort((a, b) => b.i - a.i);
    const noKart = (camp.categoria || 'kart') === 'kart';
    if (noKart && ((camp.ordem === 2 && pos <= VAGAS_SUBIDA) || (camp.ordem === 1 && pos === 1) || (interesseF4[0] && interesseF4[0].i >= 40))) {
      const o = interesseF4[0].o;
      propostasF4.push({ id: `pr${estado.proxId++}`, tipo: 'f4', nome: o.nome, equipe: o.equipe, texto: 'Vaga na Fórmula 4 para o próximo ano. Você paga 60% do orçamento da equipe.' });
    }
    if (noKart && camp.ordem === 2 && pos <= 2) {
      const a = sortear(rnd, Dados.OLHEIROS.filter((x) => x.tipo === 'academia'));
      propostasF4.push({ id: `pr${estado.proxId++}`, tipo: 'academia', nome: a.nome, equipe: a.equipe, texto: 'Entrar no programa de jovens pilotos de uma equipe de F1: eles pagam a F4.' });
    }
    // A FIA só deixa correr de F4 a partir dos 15 anos: a proposta fica guardada até lá.
    if (noKart) {
      const novas = propostasF4.splice(0, propostasF4.length);
      if (p.idade >= IDADE_F4) {
        if (estado.f4Reservada && !novas.some((x) => x.tipo === estado.f4Reservada.tipo)) novas.push({ ...estado.f4Reservada, id: `pr${estado.proxId++}` });
        estado.f4Reservada = null;
        propostasF4.push(...novas);
      } else if (novas.length) {
        const melhor = novas.find((x) => x.tipo === 'academia') || novas[0];
        estado.f4Reservada = { ...melhor };
        rel.f4Espera = { nome: melhor.nome, idade: IDADE_F4 };
        noticia(estado, `${melhor.nome} quer ${p.nome} na F4 assim que completar ${IDADE_F4} anos.`);
      }
    }
    // Na F4, os 4 primeiros recebem proposta para a F3 (próximo capítulo).
    if (!noKart && pos <= VAGAS_SUBIDA) {
      propostasF4.push({ id: `pr${estado.proxId++}`, tipo: 'f3', nome: pos === 1 ? 'Academia Vortex (F3)' : 'Apex Racing (F3)', texto: 'Vaga na Fórmula 3 para o próximo ano.' });
    }
    rel.equipes = equipesDisponiveis(estado, pos);
    estado.propostas = propostasF4;
    rel.propostasF4 = propostasF4.map((x) => x.nome);
    rel.dinheiroDepois = estado.dinheiro;

    const lista = equipesDaCategoria(estado);
    const custoMinimo = Math.round(lista[lista.length - 1].custoEtapa * camp.custo);
    estado.relatorio = rel;
    estado.temporadas.push({ ano: rel.ano, campeonato: rel.campeonato, pos: rel.pos, pontos: rel.pontos });
    estado.ano += 1;
    estado.fase = estado.dinheiro < custoMinimo && !propostasF4.length ? 'falencia' : 'relatorio';
    noticia(estado, `${p.nome} termina ${rel.ano} em P${pos} na ${camp.nome}. Campeão: ${rel.campeao}.`);
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
      return pos <= 6 || pop >= 30;
    });
  }

  // Começa o ano seguinte no campeonato e na equipe escolhidos.
  function proximaTemporada(estado, campeonatoId, equipeId = estado.equipeId) {
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
    // Contrato de F4 (60% ou academia) continua na mesma equipe; trocar de equipe ou de campeonato zera.
    if (!(estado.contrato && estado.contrato.equipe === estado.equipeId && categoriaDe(estado) === 'f4')) estado.contrato = null;
    estado.propostas = estado.propostas.filter((p) => p.tipo !== 'f4' && p.tipo !== 'academia');
    iniciarTemporada(estado);
    noticia(estado, `${estado.piloto.nome} disputa a ${campeonato(campeonatoId).nome} em ${estado.ano}.`);
    return { ok: true };
  }

  const Carreira = {
    sortearNomesEquipes, usarNomesEquipes, categoriaDe, equipesDaCategoria, PIT_F4,
    VAGAS_SUBIDA, IDADE_F4, motorPedeRevisao, equipesDisponiveis, ATRIBUTOS, NOMES_ATRIBUTOS, ETAPAS, VOLTAS_POR_SAIDA, seguir, pendenciasEtapa, PORTES, porteDe, equipesIniciais, humor, sessaoPsicologo, precoPsicologo, migrar, efeitoCabeca, APOIO_FAMILIA, SAIDAS_TREINO, HORAS_REVISAO, MAX_PATROCINIOS,
    campeonato, equipeBase, nota, novoJogo, comecarNaF4, custoEtapa, carroDe, comprarPneu, descartarPneu, revisarMotor, retificarMotor, MECANICOS, precoMecanico, precoHoraExtra, mecanicoDoFds, mecanicoAtivo, contratarMecanico, pagarHoraExtra, venderPneu, valorVendaPneu, doarPneu, amaciarPneu, pneuNovo, pneuAmaciado, MAX_PNEUS, precoRetifica, precoPneu, precoRevisao,
    textoMeta, aceitarPatrocinio, recusarPatrocinio, aceitarProposta, recusarProposta,
    pistaAtual, climaAtual, leituraPista, recordePista, iniciarFimDeSemana, pularEtapa, definirSetup, escolherPneu, saidaTreino, pedirSugestao,
    irParaClassificacao, classificar, criarCorrida, concluirCorrida, anotarCorrida, concluirEtapa, nomeDe,
    classificacaoCampeonato, posicaoNoCampeonato, proximaTemporada,
  };
  if (typeof module === 'object' && module.exports) module.exports = Carreira;
  else root.BoxCarreira = Carreira;
})(this);
