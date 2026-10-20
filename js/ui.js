// Interface do jogo no navegador.
(function () {
  'use strict';

  const Dados = window.BoxDados;
  const Engine = window.BoxEngine;
  const Kart = window.BoxKart;
  const C = window.BoxCarreira;
  const CHAVE_SAVE = 'boxbox-piloto-v1';
  const MS_POR_VOLTA = 1000; // ritmo único do ao vivo: uma volta por segundo

  const app = document.getElementById('app');
  const statusEl = document.getElementById('status');
  // Cabeçalho compacto: o cabeçalho grande some ao rolar; esta barra fina volta quando o jogador rola para cima.
  const barraMini = document.createElement('div');
  barraMini.className = 'topo-mini';
  barraMini.setAttribute('aria-hidden', 'true');
  document.body.appendChild(barraMini);
  let ultimoScroll = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const altura = document.querySelector('.topo').offsetHeight;
    const subindo = y < ultimoScroll - 4;
    const descendo = y > ultimoScroll + 4;
    if (y <= altura || !estado || document.body.classList.contains('sem-topo')) barraMini.classList.remove('visivel');
    else if (subindo) barraMini.classList.add('visivel');
    else if (descendo) barraMini.classList.remove('visivel');
    if (subindo || descendo) ultimoScroll = y;
  }, { passive: true });

  let estado = null;
  let tela = { nome: 'abertura' };
  let timer = null;
  let corrida = null; // a bateria em andamento não é salva

  // ---------- utilidades ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reais = (x) => `R$ ${Math.round(x).toLocaleString('pt-BR')}`;
  const tipoPista = { travada: '🌀 Travada', mista: '〰️ Mista', veloz: '💨 Veloz' };

  function tempoVolta(s) {
    if (s == null || !isFinite(s)) return '—';
    const m = Math.floor(s / 60);
    return m ? `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}` : s.toFixed(3);
  }

  function salvar() {
    try { localStorage.setItem(CHAVE_SAVE, JSON.stringify(estado)); } catch (e) { /* sem armazenamento: segue sem salvar */ }
  }
  function carregar() {
    try { return JSON.parse(localStorage.getItem(CHAVE_SAVE)); } catch (e) { return null; }
  }
  function apagarSave() {
    try { localStorage.removeItem(CHAVE_SAVE); } catch (e) { /* ignora */ }
  }

  let timerAviso = null;
  function aviso(texto) {
    const el = document.getElementById('aviso');
    el.textContent = texto;
    el.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { el.hidden = true; }, 3500);
  }
  const erro = (r) => { if (r && !r.ok) aviso(r.erro); return r && r.ok; };

  function ir(nova) {
    if (timer) { clearInterval(timer); timer = null; }
    // Avisos da tela anterior não seguem para a próxima.
    clearTimeout(timerAviso);
    document.getElementById('aviso').hidden = true;
    tela = nova;
    render();
    window.scrollTo(0, 0);
  }

  function telaDaFase() {
    if (!estado) return { nome: 'abertura' };
    return { nome: estado.fase, aba: 'resumo' };
  }

  // ---------- ajuda: as explicações ficam atrás de um "?" ----------
  const AJUDAS = {
    jogo: ['Como jogar', 'Você é um piloto de kart de 12 anos e também o cabeça da carreira. Escolha a equipe, cuide do dinheiro, acerte o kart em cada pista e decida quais propostas aceitar. Meta: chegar à Fórmula 4.'],
    equipe: ['Escolhendo a equipe', 'Kart diz quão rápido é o material; estrutura, quão confiável. O kart não vem com mecânico: você acerta sozinho e pode contratar um mecânico no fim de semana. A sobra é o que fica do caixa depois de pagar as 8 etapas: é com ela que você compra pneus e revisa o motor. As outras equipes podem te chamar depois, se você andar bem.'],
    etapa: ['Fim de semana', 'De manhã tem treino livre; à tarde, classificação e corrida. A tarde costuma ser mais quente, e o acerto que funcionou de manhã pode não servir.'],
    clima: ['Previsão do tempo', 'A chance de chuva é só previsão e pode errar. No kart não tem pit stop: o pneu que você escolher vai até a bandeirada.'],
    cabeca: ['Moral e confiança', 'Confiança é a cabeça na pista: alta dá ritmo e regularidade, baixa faz errar. Moral é a motivação: alta faz o piloto evoluir mais rápido e explicar melhor o que sente no kart. O psicólogo ajuda uma vez por etapa.'],
    oficina: ['Oficina', `Toque num jogo de pneus para vender, doar ou jogar fora (cabem ${C.MAX_PNEUS} no estoque). Pneu zerado rende um pouco menos nas primeiras voltas: dá para amaciar no treino. O motor conta horas de uso: cada saída, a classificação e a corrida somam. Passou de ${String(C.HORAS_REVISAO).replace('.', ',')} h sem revisão, ele perde força e fica frágil. Forçar o motor (carburação pobre demais ou dentes demais na coroa) pode engripá-lo, e a retífica é cara: a expressa deixa correr a etapa seguinte; a normal faz o piloto perder uma etapa.`],
    patrocinio: ['Patrocínio', 'Cada empresa paga por etapa e dá um bônus no fim do ano se a meta for cumprida. Vitórias e pódios aumentam a popularidade e atraem empresas maiores.'],
    olheiros: ['Olheiros e propostas', 'Andar bem com olheiros assistindo traz propostas. Piloto de fábrica não paga nada, mas pode receber ordem para deixar o companheiro passar. Desconfie de equipe que promete demais.'],
    setup: ['Acerto do kart', 'Pressão: como o pneu esquenta. Eixo e bitola traseira: aderência da traseira. Bitola dianteira: como o kart entra na curva. Altura do banco: quanto peso o kart transfere nas curvas. Relação: força na saída × velocidade na reta. Carburação: mistura do motor (pobre demais pode engripar). O acerto ideal muda com a pista, o calor e a chuva, e ninguém te conta qual é.'],
    radio: ['Rádio', 'Depois de cada saída, o piloto conta o que sentiu. Pilotos experientes e motivados descrevem melhor o problema. Com um mecânico contratado, ele também comenta: o iniciante dá palpites; o experiente e o profissional dizem o que mudar e quanto.'],
    mecanico: ['Mecânico', 'O kart não vem com mecânico: o acerto é seu. Dá para contratar um para o fim de semana. O iniciante é barato, dá palpites e fica no treino, na classificação e na corrida. O experiente faz uma análise técnica (o que mudar e quanto) e o profissional monta o kart para você; os dois cobram hora extra para trabalhar em cada sessão depois daquela em que foram contratados. Em cada sessão, cada um ajuda uma vez.'],
    quali: ['Classificação', 'A volta lançada define o grid. À tarde o ar e o asfalto estão mais quentes e a pista tem mais borracha: isso muda o kart inteiro, não só os pneus. Depois do treino livre ninguém mexe no kart por você: o acerto é seu. O acerto e o pneu daqui continuam na corrida, com ajustes finos no grid.'],
    grid: ['Antes da largada', 'No grid ainda dá para mexer em todo o acerto e trocar o jogo de pneus. Só o motor não: revisão é no paddock. Na corrida o asfalto tem ainda mais borracha que na classificação.'],
    // Um "?" para cada ajuste do kart: o que ele significa.
    pressao: ['Pressão dos pneus', 'É quanto ar vai no pneu (em psi). Ela decide como o pneu esquenta e quanto dura: pressão certa deixa a borracha na temperatura ideal.'],
    eixo: ['Eixo traseiro', 'É a barra que segura as rodas de trás. O kart não tem diferencial: o eixo precisa torcer na curva. Mole torce mais e dá mais aderência atrás; duro torce menos e deixa a traseira mais livre.'],
    bitolaTraseira: ['Bitola traseira', 'É a largura entre as rodas de trás. Estreita dá mais aderência atrás; larga solta a traseira para o kart não arrastar nas curvas. Na chuva, abrir ajuda o peso a passar para as rodas de fora.'],
    alturaBanco: ['Altura do banco', 'É a altura em que o banco (e o piloto) vai preso no chassi. Banco alto joga mais peso para as rodas de fora na curva e dá aderência; banco baixo deixa o kart mais estável e livre.'],
    bitola: ['Bitola dianteira', 'É a largura entre as rodas da frente. Larga faz o kart virar mais fácil na entrada da curva; estreita deixa a frente mais calma e o kart mais estável e rápido na reta.'],
    coroa: ['Relação (coroa)', 'É o número de dentes da coroa, a engrenagem do eixo traseiro. Mais dentes: mais força na saída das curvas, mas o motor chega no limite antes do fim da reta. Menos dentes: mais velocidade final, menos força. Dentes demais fazem o motor passar do giro e o forçam.'],
    carburacao: ['Carburação', 'É a mistura de ar e gasolina do motor. Rica tem mais gasolina: o motor fica mais frio e seguro, mas engasga se passar do ponto. Pobre tem menos: o motor grita mais, mas esquenta e pode engripar (o pistão trava).'],
    diagnostico: ['Diagnóstico', 'Depois da bandeirada o piloto conta o que sentiu no kart e para que lado cada ajuste deveria ter ido nas condições da corrida. Anote no caderno: da próxima vez nessa pista, com tempo parecido, você já sabe por onde começar.'],
    setupF4: ['Acerto do F4', 'Asas: seguram o carro nas curvas, mas freiam na reta. Suspensão: como o carro passa nas zebras e responde nas curvas. Altura: perto do chão tem mais aderência, mas pode bater. Pressão: como o pneu esquenta. Relação: força na saída × velocidade na reta. O acerto ideal muda com a pista, o calor, o ar e a chuva.'],
    asaDianteira: ['Asa dianteira', 'É a asa na frente do carro. Mais asa: a frente gruda mais nas curvas, mas o carro fica nervoso atrás e perde um pouco na reta. Menos asa: a frente escapa nas curvas rápidas.'],
    asaTraseira: ['Asa traseira', 'É a asa de trás, a que mais segura o carro no chão. Mais asa: traseira firme nas curvas de alta, mas o carro fica lento na reta. Menos asa: mais velocidade final, traseira mais solta.'],
    suspensao: ['Suspensão', 'É a firmeza das molas e amortecedores. Macia: o carro absorve zebras e ondulações, mas rola nas curvas. Dura: responde rápido, mas pula nas zebras.'],
    altura: ['Altura do carro', 'É a distância do assoalho até o chão. Baixa: o carro gruda mais (efeito solo), mas pode bater no chão. Alta: mais seguro em ondulações e na chuva, com menos aderência.'],
    relacao: ['Relação do câmbio', 'É o escalonamento das marchas. Curta: mais força na saída das curvas, mas a última marcha acaba antes do fim da reta. Longa: mais velocidade final, menos força nas retomadas.'],
    temporada: ['Próximo ano', 'Os 4 primeiros do campeonato sobem: Regional → Brasileiro → Europeu → F4 (o campeão brasileiro também recebe proposta de F4). Muita popularidade também abre o campeonato seguinte. Cada degrau custa mais e tem rivais mais fortes. No começo do ano a família ajuda com um dinheiro.'],
  };

  const botaoAjuda = (chave) => `<button class="ajuda" data-acao="ajuda" data-chave="${chave}" aria-label="Ajuda: ${esc(AJUDAS[chave][0])}">?</button>`;

  const balao = document.createElement('div');
  balao.className = 'balao-fundo';
  balao.hidden = true;
  balao.innerHTML = '<div class="balao" role="dialog" aria-modal="true" aria-labelledby="balao-titulo"><h3 id="balao-titulo"></h3><p></p><button class="principal" data-fechar>Entendi</button></div>';
  document.body.appendChild(balao);
  function abrirAjuda(chave) {
    const [titulo, texto] = AJUDAS[chave];
    balao.querySelector('h3').textContent = titulo;
    balao.querySelector('p').textContent = texto;
    balao.hidden = false;
    balao.querySelector('[data-fechar]').focus();
  }
  balao.addEventListener('click', (ev) => { if (ev.target === balao || ev.target.closest('[data-fechar]')) balao.hidden = true; });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') balao.hidden = true; });

  // ---------- "na pista": barra animada enquanto o treino ou a volta lançada acontece ----------
  const naPista = document.createElement('div');
  naPista.className = 'na-pista-fundo';
  naPista.hidden = true;
  naPista.innerHTML = `<div class="na-pista" role="status" aria-live="polite">
    <span class="subtitulo" data-titulo></span>
    <b class="na-pista-passo" data-passo></b>
    <div class="na-pista-trilho"><i data-barra></i><span class="na-pista-kart" data-kart aria-hidden="true">🏎️</span></div>
    <span class="fraco mini" data-dica></span>
  </div>`;
  document.body.appendChild(naPista);
  const menosMovimento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // passos: textos mostrados em sequência; ao terminar chama depois().
  function animarPista(titulo, passos, dica, depois) {
    const duracao = menosMovimento() ? 400 : 450 * passos.length;
    const el = (q) => naPista.querySelector(q);
    el('[data-titulo]').textContent = titulo;
    el('[data-dica]').textContent = dica;
    naPista.hidden = false;
    const inicio = performance.now();
    const quadro = (agora) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      el('[data-barra]').style.width = `${t * 100}%`;
      el('[data-kart]').style.left = `${t * 100}%`;
      el('[data-passo]').textContent = passos[Math.min(passos.length - 1, Math.floor(t * passos.length))];
      if (t < 1) requestAnimationFrame(quadro);
      else setTimeout(() => { naPista.hidden = true; depois(); }, 180);
    };
    requestAnimationFrame(quadro);
  }

  // ---------- peças visuais ----------
  function cartao(titulo, corpo, { ajuda, classe = '', extra = '' } = {}) {
    return `<section class="painel ${classe}">
      <header class="cartao-topo"><h3>${titulo}</h3>${extra}<span class="espaco"></span>${ajuda ? botaoAjuda(ajuda) : ''}</header>
      ${corpo}
    </section>`;
  }

  const tile = (rotulo, valor, classe = '') => `<div class="tile"><span>${rotulo}</span><b class="${classe}">${valor}</b></div>`;
  const chip = (conteudo, classe = '') => `<span class="chip ${classe}">${conteudo}</span>`;
  // Moral e confiança: até 40 vermelho, de 41 a 69 amarelo, a partir de 70 verde.
  const nivelClasse = (v) => (v <= 40 ? 'negativo' : v < 70 ? 'aviso' : 'dinheiro');

  function anel(rotulo, valor) {
    return `<div class="anel-bloco"><div class="anel ${nivelClasse(valor)}" style="--v:${valor}" role="img" aria-label="${rotulo} ${valor} de 100"><b>${valor}</b></div><span>${rotulo}</span></div>`;
  }

  function barra(rotulo, valor, max = 100) {
    return `<div class="barra"><span>${rotulo}</span><span class="trilho"><i style="width:${(valor / max) * 100}%"></i></span><b>${valor}</b></div>`;
  }

  const iconeClima = (chance) => (chance < 20 ? '☀️' : chance < 50 ? '⛅' : '🌧');

  function climaBloco(rotulo, periodo) {
    return `<div class="clima"><span class="clima-icone" aria-hidden="true">${iconeClima(periodo.chance)}</span>
      <div><span class="fraco">${rotulo}</span><b>${periodo.tempAr}°C</b><span class="chuva">💧 ${periodo.chance}%</span></div></div>`;
  }

  // Recorde da pista: tempo, quem fez e quando.
  function linhaRecorde() {
    const r = C.recordePista(estado);
    return `<div class="recorde ${r.jogador ? 'meu' : ''}"><span aria-hidden="true">🏆</span><span>Recorde da pista</span><b>${tempoVolta(r.tempo)}</b><small>${esc(r.jogador ? 'Você' : r.nome)} · ${r.ano}</small></div>`;
  }

  // Condições da sessão. À tarde mostra quanto o ar e o asfalto mudaram desde o treino,
  // e em todas mostra a borracha na pista (que o jogador não teria como saber).
  function condicaoChips(sessao) {
    const clima = C.climaAtual(estado);
    const molhado = sessao === 'treino' ? clima.manha.chove : clima.tarde.inicioChuva === 'quali';
    const c = Kart.condicao(clima, sessao === 'treino' ? 'treino' : 'quali', molhado);
    const t = sessao === 'treino' ? null : Kart.condicao(clima, 'treino', clima.manha.chove);
    const delta = (agora, antes) => (t && agora !== antes ? ` <small>${agora > antes ? '+' : '−'}${Math.abs(agora - antes)}</small>` : '');
    const borracha = molhado ? '' : chip(sessao === 'treino' ? 'Pouca borracha' : sessao === 'grid' ? 'Muita borracha' : 'Mais borracha');
    return `${linhaRecorde()}<div class="chips">${chip(molhado ? '🌧 Molhado' : '☀️ Seco', molhado ? 'chip-azul' : '')}${chip(`🌡 Ar ${c.tempAr}°${delta(c.tempAr, t && t.tempAr)}`)}${chip(`Asfalto ${c.tempPista}°${delta(c.tempPista, t && t.tempPista)}`)}${borracha}
      ${sessao !== 'treino' && !molhado ? chip(`💧 Corrida ${clima.tarde.chance}%`) : ''}</div>`;
  }

  const desgastePct = (uso) => Math.min(100, Math.round((uso / 26) * 100));

  // Jogos de pneus como cartões; no fim de semana dá para escolher tocando no cartão.
  function pneusVisuais(selecionavel) {
    if (!estado.pneus.length) return '<p class="aviso">Nenhum jogo de pneus!</p>';
    const ordem = ['slick', 'chuva'];
    const lista = estado.pneus.slice().sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo));
    const numero = (p) => estado.pneus.filter((x) => x.tipo === p.tipo).indexOf(p) + 1;
    return `<div class="pneus">${lista.map((p) => {
      const i = numero(p) - 1;
      const pct = desgastePct(p.uso);
      const classe = pct >= 100 ? 'negativo' : pct >= 60 ? 'aviso' : 'dinheiro';
      const ativo = selecionavel && estado.fds.pneuId === p.id;
      const conteudo = `<span class="pneu-roda ${p.tipo}" aria-hidden="true"></span>
        <span class="pneu-nome">${Kart.PNEUS_KART[p.tipo].nome} <span class="fraco">#${i + 1}</span></span>
        <span class="pneu-trilho"><i class="${classe}-fundo" style="width:${Math.max(4, 100 - pct)}%"></i></span>
        <span class="pneu-estado ${classe}">${C.pneuNovo(p) ? 'novo' : C.pneuAmaciado(p) ? 'amaciado' : pct >= 100 ? 'acabado' : `${100 - pct}%`}</span>`;
      return selecionavel
        ? `<button class="pneu-card ${ativo ? 'ativo' : ''}" data-acao="escolher-pneu" data-id="${p.id}" aria-pressed="${ativo}">${conteudo}</button>`
        : `<button class="pneu-card" data-acao="pneu-opcoes" data-id="${p.id}" aria-label="Opções do ${Kart.PNEUS_KART[p.tipo].nome} ${i + 1}">${conteudo}<span class="pneu-mais" aria-hidden="true">⋯</span></button>`;
    }).join('')}</div>`;
  }

  // ---------- topo ----------
  function atualizarStatus() {
    if (!estado) { statusEl.innerHTML = ''; barraMini.innerHTML = ''; return; }
    const eq = C.equipeBase(estado.equipeId);
    const camp = C.campeonato(estado.campeonato);
    const p = estado.piloto;
    const iniciais = p.nome.split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
    const custo = C.custoEtapa(estado);
    const apertado = estado.dinheiro < custo;
    const kpi = (icone, rotulo, valor, classe, extra) => `<div class="kpi ${classe}"><span class="kpi-rotulo"><span aria-hidden="true">${icone}</span>${rotulo}</span><b class="kpi-valor">${valor}</b>${extra}</div>`;
    const medidor = (v) => `<span class="kpi-barra" aria-hidden="true"><i style="width:${v}%"></i></span>`;
    barraMini.innerHTML = `<b class="mini-nome">${esc(p.nome)}</b>
      <span class="${estado.dinheiro < 0 ? 'negativo' : 'dinheiro'}">💰 ${reais(estado.dinheiro)}</span>
      <span class="${nivelClasse(p.moral)}">😊 ${p.moral}</span><span class="${nivelClasse(p.confianca)}">🔥 ${p.confianca}</span>`;
    statusEl.innerHTML = `<div class="perfil">
        <span class="avatar ${corClara(eq.cor) ? 'avatar-claro' : ''}" style="background:${eq.cor}" aria-hidden="true">${esc(iniciais)}</span>
        <span class="perfil-texto"><b>${esc(p.nome)}</b><small>${p.idade} anos · ${esc(eq.nome)}</small></span>
        <span class="perfil-camp"><small>${estado.ano}</small><b>${esc(camp.curto)}</b></span>
      </div>
      <div class="kpis">
        ${kpi('💰', 'Caixa', reais(estado.dinheiro), `kpi-caixa ${estado.dinheiro < 0 ? 'negativo' : 'dinheiro'} ${apertado ? 'apertado' : ''}`, apertado ? '<small class="kpi-sub">Não paga a etapa</small>' : '')}
        ${kpi('😊', 'Moral', p.moral, nivelClasse(p.moral), medidor(p.moral))}
        ${kpi('🔥', 'Confiança', p.confianca, nivelClasse(p.confianca), medidor(p.confianca))}
      </div>`;
  }

  function render() {
    atualizarStatus();
    // Abertura, nome, carregamento e equipe ocupam a tela toda, sem o cabeçalho do piloto.
    document.body.classList.toggle('sem-topo', ['abertura', 'inicio', 'carregando', 'equipe'].includes(tela.nome));
    const telas = { abertura: telaAbertura, inicio: telaInicio, carregando: telaCarregando, equipe: telaEquipe, paddock: telaPaddock, pista: telaPista, fds: telaFimDeSemana, relatorio: telaRelatorio, f4: telaF4, falencia: telaFalencia };
    telas[tela.nome]();
  }

  function abas(lista, atual) {
    return `<nav class="abas">${lista.map(([id, icone, nome]) => `<button data-acao="aba" data-aba="${id}" class="${atual === id ? 'ativo' : ''}"><span aria-hidden="true">${icone}</span><span>${nome}</span></button>`).join('')}</nav>`;
  }

  // Ícones em traço (estilo Feather), desenhados inline.
  const ICONES = {
    etapa: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    campeonato: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
    piloto: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    caderno: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    noticias: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
    local: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    voltar: '<polyline points="15 18 9 12 15 6"/>',
    regua: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    voltas: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    montanha: '<path d="M3 20l6-10 4 6 3-4 5 8z"/>',
    largura: '<path d="M3 12h18"/><polyline points="7 8 3 12 7 16"/><polyline points="17 8 21 12 17 16"/>',
    sentido: '<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>',
    bandeira: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  };
  // Título em caixa alta: primeira palavra forte, o resto fino ("KARTÓDROMO internacional...").
  const tituloForte = (texto) => {
    const [primeira, ...resto] = String(texto).split(' ');
    return `<span class="t-forte">${esc(primeira)}</span>${resto.length ? ` <span class="t-fino">${esc(resto.join(' '))}</span>` : ''}`;
  };
  const icone = (nome, classe = '') => `<svg class="ico ${classe}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;

  // ---------- início ----------
  // Abertura: logotipo e "Iniciar jogo" (e "Continuar" quando há carreira salva).
  function telaAbertura() {
    const save = carregar();
    app.innerHTML = `
      <div class="abertura">
        <div class="abertura-marca">
          <img class="logo-img" src="img/logo.png" alt="Superlicença: do kart ao topo" width="1200" height="776">
        </div>
        <div class="abertura-acoes">
          <button class="principal grande" data-acao="iniciar">Iniciar jogo</button>
          ${save ? `<button class="grande" data-acao="continuar">Continuar · ${esc(save.piloto.nome)} · ${save.ano}</button>` : ''}
        </div>
      </div>`;
  }

  // Progresso do início: dois traços (nome e equipe).
  const progressoInicio = (passo) => `<div class="progresso-inicio" aria-label="Passo ${passo} de 2"><i class="${passo >= 1 ? 'feito' : ''}"></i><i class="${passo >= 2 ? 'feito' : ''}"></i></div>`;

  // Iniciais do nome para a "foto" da licença.
  const iniciaisDe = (nome) => String(nome || '').trim().split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  // Licença de piloto que se monta enquanto o jogador digita o nome.
  function cartaoLicenca(nome) {
    const vazio = !String(nome || '').trim();
    return `<div class="licenca ${vazio ? 'vazia' : ''}" aria-hidden="true">
      <div class="licenca-topo"><img src="img/logo-barra.png" alt="" width="1000" height="146"><span>Licença de piloto</span></div>
      <div class="licenca-corpo">
        <span class="licenca-foto" data-licenca-iniciais>${vazio ? '?' : esc(iniciaisDe(nome))}</span>
        <div class="licenca-dados">
          <small>Nome</small>
          <b data-licenca-nome>${vazio ? 'Seu nome aqui' : esc(nome)}</b>
          <div class="licenca-campos">
            <span><small>Idade</small><b>12</b></span>
            <span><small>Categoria</small><b>Kart</b></span>
            <span><small>País</small><b>BRA</b></span>
          </div>
        </div>
      </div>
    </div>`;
  }

  // Nome do piloto: a licença se preenche enquanto ele digita.
  function telaInicio() {
    const nome = tela.nomePiloto || '';
    app.innerHTML = `
      <div class="tela-inicio">
        <div class="inicio-topo">
          <button class="voltar" data-acao="voltar-abertura">${icone('voltar')}<span>Voltar</span></button>
          ${progressoInicio(1)}
          <span class="redondo-vazio"></span>
        </div>
        <div class="inicio-texto">
          <h1>Qual é o seu nome, piloto?</h1>
          <p class="fraco">Você tem 12 anos e começa a carreira no kart. O sonho: a Superlicença para correr na Fórmula 1.</p>
        </div>
        ${cartaoLicenca(nome)}
        <label class="campo-nome"><span>Nome na licença</span>
          <input type="text" id="nome-piloto" value="${esc(nome)}" placeholder="Ex.: Diogo Sander" maxlength="30" autocomplete="off" autocapitalize="words" enterkeyhint="next"></label>
      </div>
      <div class="barra-confirmar">
        <button class="principal grande" data-acao="entrar" ${nome.trim() ? '' : 'disabled'}>Continuar</button>
      </div>`;
    document.getElementById('nome-piloto').focus();
  }

  // Barra de carregamento entre o nome e a escolha da equipe.
  const PASSOS_CARREGANDO = ['Abrindo o paddock…', 'Chamando as equipes…', 'Conferindo os karts…', 'Tudo pronto!'];
  function telaCarregando() {
    app.innerHTML = `
      <div class="abertura carregando">
        <div class="abertura-marca"><img class="logo-img logo-img-menor" src="img/logo.png" alt="Superlicença" width="1200" height="776"></div>
        <div class="carregando-bloco" role="status" aria-live="polite">
          <div class="carregando-trilho"><i data-barra></i></div>
          <span class="fraco" data-passo>${PASSOS_CARREGANDO[0]}</span>
        </div>
      </div>`;
    const duracao = menosMovimento() ? 500 : 2200;
    const inicio = performance.now();
    const minha = tela;
    const quadro = (agora) => {
      if (tela !== minha) return;
      const t = Math.min(1, (agora - inicio) / duracao);
      app.querySelector('[data-barra]').style.width = `${t * 100}%`;
      app.querySelector('[data-passo]').textContent = PASSOS_CARREGANDO[Math.min(PASSOS_CARREGANDO.length - 1, Math.floor(t * PASSOS_CARREGANDO.length))];
      if (t < 1) requestAnimationFrame(quadro);
      else setTimeout(() => { if (tela === minha) ir({ ...minha, nome: 'equipe', escolhida: null }); }, 250);
    };
    requestAnimationFrame(quadro);
  }

  // A cor da equipe é clara? (para escolher texto escuro por cima)
  function corClara(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b > 160;
  }

  const kmil = (x) => `${(x / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;

  // Pontos fortes e fracos de uma equipe, em etiquetas.
  function etiquetasEquipe(e, sobra) {
    const t = [];
    if (e.material >= 86) t.push(['⚡ Kart muito rápido', 'bom']); else if (e.material <= 76) t.push(['🐢 Kart mais lento', 'ruim']);
    if (e.organizacao >= 85) t.push(['🛡 Kart confiável', 'bom']); else if (e.organizacao <= 55) t.push(['⚠ Quebra mais', 'ruim']);
    if (sobra >= 25000) t.push(['💰 Sobra dinheiro', 'bom']); else if (sobra < 12000) t.push(['💸 Orçamento apertado', 'ruim']);
    if (!t.length) t.push(['⚖️ Equilibrada', 'neutro']);
    return t.map(([texto, tipo]) => `<span class="tag tag-${tipo}">${texto}</span>`).join('');
  }

  // Escolha da equipe: cartões selecionáveis e confirmação embaixo.
  function telaEquipe() {
    const escolhida = tela.escolhida && C.equipeBase(tela.escolhida);
    app.innerHTML = `
      <div class="tela-equipe">
        <div class="linha"><button class="voltar" data-acao="trocar-nome">${icone('voltar')}<span>Voltar</span></button><span class="espaco"></span>${botaoAjuda('equipe')}</div>
        <div>${progressoInicio(2)}<h1>Escolha sua equipe</h1>
          <p class="fraco">Três equipes abriram as portas para ${esc(tela.nomePiloto)}. Toque em uma para escolher.</p></div>
        <div class="equipes-iniciais">
          ${tela.opcoes.map((id) => {
            const e = C.equipeBase(id);
            const porte = C.porteDe(id);
            const sobra = e.caixa - e.custoEtapa * C.ETAPAS;
            const sel = tela.escolhida === id;
            return `<button class="equipe-card ${sel ? 'selecionada' : ''} ${corClara(e.cor) ? 'topo-claro' : ''}" style="--cor-equipe:${e.cor}" data-acao="selecionar-equipe" data-id="${id}" aria-pressed="${sel}">
              <span class="equipe-topo"><span class="etiqueta">${C.PORTES[porte].nome}</span><span class="equipe-check" aria-hidden="true">${sel ? '✓' : ''}</span><b class="equipe-nome">${esc(e.nome)}</b></span>
              <span class="equipe-corpo">
                <span class="fraco equipe-desc">${esc(e.descricao)}</span>
                <span class="tags">${etiquetasEquipe(e, sobra)}</span>
                <span class="equipe-barras">${barra('Kart', e.material)}${barra('Estrutura', e.organizacao)}</span>
                <span class="equipe-dinheiro">
                  <span><small>Caixa</small><b>R$ ${kmil(e.caixa)}</b></span>
                  <span><small>Por etapa</small><b class="negativo">−R$ ${kmil(e.custoEtapa)}</b></span>
                  <span><small>Sobra no ano</small><b class="${sobra < 12000 ? 'aviso' : 'dinheiro'}">R$ ${kmil(sobra)}</b></span>
                </span>
              </span>
            </button>`;
          }).join('')}
        </div>
      </div>
      <div class="barra-confirmar">
        <button class="principal grande" data-acao="escolher-equipe" data-id="${escolhida ? tela.escolhida : ''}" ${escolhida ? '' : 'disabled'}>${escolhida ? `Correr pela ${esc(escolhida.nome)}` : 'Escolha uma equipe'}</button>
      </div>`;
  }

  // ---------- paddock ----------
  function botaoResolver(id) {
    if (id === 'retifica') return '';
    if (id === 'motor') return `<button data-acao="revisar">Revisar · ${reais(C.precoRevisao(estado))}</button>`;
    return `<button class="principal" data-acao="comprar-pneu" data-tipo="${id}">+ ${id === 'slick' ? 'Slick' : 'Chuva'} · ${reais(C.precoPneu(estado, id))}</button>`;
  }

  function checklist() {
    // O motor engripado tem o seu próprio bloco logo abaixo.
    const pend = C.pendenciasEtapa(estado).filter((x) => x.id !== 'retifica');
    if (!pend.length) return `<div class="checklist ok">✓ Tudo pronto: pneus e motor em dia.</div>`;
    return `<div class="checklist"><b>⚠ Antes de ir para a pista</b>${pend.map((x) => `<div class="pendencia"><span>${esc(x.texto)}</span>${botaoResolver(x.id)}</div>`).join('')}</div>`;
  }

  // Folha que sobe ao tocar em "Ir para a pista" quando ainda falta algo.
  function folhaChecagem() {
    if (!tela.checagem) return '';
    const pend = C.pendenciasEtapa(estado);
    return `<div class="folha-fundo" data-acao-fundo="fechar-checagem"><div class="folha" role="dialog" aria-modal="true" aria-labelledby="folha-titulo">
      <h3 id="folha-titulo">${pend.length ? 'Antes de ir…' : 'Tudo pronto!'}</h3>
      ${pend.length ? pend.map((x) => `<div class="pendencia"><span>${esc(x.texto)}</span>${botaoResolver(x.id)}</div>`).join('') : '<p class="fraco">Pneus e motor em dia.</p>'}
      <div class="botoes-2"><button data-acao="fechar-checagem">Voltar</button>
        <button class="${pend.length ? '' : 'principal'}" data-acao="ir-fds-confirmado">${pend.length ? 'Ir mesmo assim' : 'Ir para a pista'}</button></div>
    </div></div>`;
  }

  function chipRival() {
    if (!estado.seguindo) return '';
    const tabela = C.classificacaoCampeonato(estado);
    const i = tabela.findIndex((x) => x.id === estado.seguindo);
    if (i < 0) return '';
    const eu = tabela.findIndex((x) => x.id === 'jogador');
    const dif = tabela[i].pontos - tabela[eu].pontos;
    return chip(`★ ${esc(tabela[i].nome.split(' ')[0])} ${sigla(tabela[i].nome)} · P${i + 1} · ${dif === 0 ? 'empatado' : dif > 0 ? `${dif} pts à frente` : `${-dif} pts atrás`}`, 'chip-amarelo');
  }

  function cartaoProximaEtapa() {
    const pista = C.pistaAtual(estado);
    const clima = C.climaAtual(estado);
    const custo = C.custoEtapa(estado);
    const semDinheiro = estado.dinheiro < custo;
    const pontos = Array.from({ length: C.ETAPAS }, (_, i) => `<i class="${i < estado.etapa ? 'feita' : i === estado.etapa ? 'atual' : ''}"></i>`).join('');
    return `<section class="painel hero">
      <header class="cartao-topo"><h3>Etapa ${estado.etapa + 1}/${C.ETAPAS}</h3><span class="etapas" aria-hidden="true">${pontos}</span><span class="espaco"></span>${botaoAjuda('etapa')}</header>
      <div class="hero-corpo">
        <div class="hero-pista">
          <h2>${tituloForte(pista.nome)}</h2>
          <div class="chips">${chip(tipoPista[pista.tipo])}${chip(`⛰ ${pista.altitude} m`)}${chip(esc(pista.local))}</div>
          <button class="ver-pista" data-acao="ver-pista"><span class="ver-pista-texto"><b>Ver pista</b><small>Retas, curvas, zebras e asfalto</small></span><span aria-hidden="true">›</span></button>
          ${chipRival()}
        </div>
        <div class="climas">${climaBloco('Manhã', clima.manha)}${climaBloco('Tarde', clima.tarde)}${botaoAjuda('clima')}</div>
        <div class="hero-acao">
          ${checklist()}
          ${tile('Custo da etapa', estado.contrato && estado.contrato.custoEtapa === 0 ? 'Grátis' : `−${reais(custo)}`, estado.contrato && estado.contrato.custoEtapa === 0 ? '' : 'negativo')}
          ${estado.motorQuebrado ? blocoRetifica(custo) : semDinheiro
            ? '<button class="grande" data-acao="pular-etapa" data-confirmar="Confirmar: ficar fora">Ficar fora da etapa</button>'
            : '<button class="principal grande" data-acao="ir-fds">Ir para a pista</button>'}
        </div>
      </div>
    </section>`;
  }

  // Motor engripado: retífica expressa (corre esta etapa) ou normal (mais barata, perde a etapa).
  function blocoRetifica(custo) {
    const expressa = C.precoRetifica(estado, 'expressa');
    const normal = C.precoRetifica(estado, 'normal');
    const podeExpressa = estado.dinheiro >= expressa + custo;
    const podeNormal = estado.dinheiro >= normal;
    return `<div class="retifica">
      <b>💥 Motor engripado</b>
      <p class="fraco">Sem retífica não dá para correr. A expressa deixa o motor pronto para esta etapa; a normal é mais barata, mas o piloto fica fora desta etapa.</p>
      <button class="compra principal" data-acao="retificar" data-tipo="expressa" data-confirmar="Confirmar: −${reais(expressa)}" ${podeExpressa ? '' : 'disabled'}><b>Retífica expressa</b><span>−${reais(expressa)} · corre esta etapa</span></button>
      <button class="compra" data-acao="retificar" data-tipo="normal" data-confirmar="Confirmar: −${reais(normal)}" ${podeNormal ? '' : 'disabled'}><b>Retífica normal</b><span>−${reais(normal)} · fica fora desta etapa</span></button>
      ${podeNormal ? '' : '<button class="grande" data-acao="pular-etapa" data-confirmar="Confirmar: ficar fora">Ficar fora da etapa</button>'}
    </div>`;
  }

  function cartaoCabeca() {
    const p = estado.piloto;
    return cartao('Cabeça', `
      <div class="aneis">${anel('Moral', p.moral)}${anel('Confiança', p.confianca)}</div>
      <p class="fala">“${esc(C.humor(p))}”</p>
      <button data-acao="psicologo">🛋 Psicólogo · ${reais(C.precoPsicologo(estado))}</button>`, { ajuda: 'cabeca' });
  }

  // Folha com o que fazer com um jogo de pneus: vender, doar ou descartar.
  function folhaPneu() {
    const p = tela.pneuOpcoes && estado.pneus.find((x) => x.id === tela.pneuOpcoes);
    if (!p) return '';
    const n = estado.pneus.filter((x) => x.tipo === p.tipo).indexOf(p) + 1;
    const pct = desgastePct(p.uso);
    const jaDoou = estado.doacaoEtapa === `${estado.ano}-${estado.etapa}`;
    return `<div class="folha-fundo" data-acao-fundo="fechar-pneu"><div class="folha folha-neutra" role="dialog" aria-modal="true" aria-labelledby="folha-pneu-titulo">
      <h3 id="folha-pneu-titulo">${Kart.PNEUS_KART[p.tipo].nome} #${n} · ${C.pneuNovo(p) ? 'novo' : `${100 - pct}% de vida`}</h3>
      <button class="compra" data-acao="vender-pneu" data-id="${p.id}"><b>💰 Vender para outra equipe</b><span class="dinheiro">+${reais(C.valorVendaPneu(estado, p))}</span></button>
      <button class="compra" data-acao="doar-pneu" data-id="${p.id}" ${jaDoou ? 'disabled' : ''}><b>🤝 Doar para a escolinha</b><span>${jaDoou ? 'Você já doou nesta etapa' : 'Moral e popularidade sobem'}</span></button>
      <button class="compra" data-acao="descartar-pneu" data-id="${p.id}" data-confirmar="Confirmar: jogar fora"><b>🗑 Jogar fora</b><span>Sem retorno</span></button>
      <button data-acao="fechar-pneu">Cancelar</button>
    </div></div>`;
  }

  function cartaoOficina() {
    // Horas de uso do motor desde a última revisão (a barra enche até a hora da revisão).
    const horas = estado.motorHoras;
    const pct = Math.min(100, (horas / C.HORAS_REVISAO) * 100);
    const classe = estado.motorQuebrado || horas > C.HORAS_REVISAO ? 'negativo' : C.motorPedeRevisao(estado) ? 'aviso' : 'dinheiro';
    const fmt = (h) => String(h).replace('.', ',');
    return cartao('Oficina', `
      <div class="motor"><span>Motor</span><span class="motor-horas" role="img" aria-label="Motor com ${fmt(horas)} horas de uso, revisão a cada ${fmt(C.HORAS_REVISAO)} horas">
          <span class="pneu-trilho"><i class="${classe}-fundo" style="width:${Math.max(4, pct)}%"></i></span><small class="${classe}">${fmt(horas)} h de ${fmt(C.HORAS_REVISAO)} h</small></span>
        ${estado.motorQuebrado ? '<span class="negativo"><b>Engripado</b></span>' : `<button data-acao="revisar">Revisar · ${reais(C.precoRevisao(estado))}</button>`}</div>
      <div class="linha"><span class="fraco mini">Pneus no estoque</span><span class="espaco"></span><b class="${estado.pneus.length >= C.MAX_PNEUS ? 'aviso' : ''}">${estado.pneus.length}/${C.MAX_PNEUS}</b></div>
      ${pneusVisuais(false)}
      <div class="botoes-2">
        <button class="compra" data-acao="comprar-pneu" data-tipo="slick"><b>+ Slick</b><span>${reais(C.precoPneu(estado, 'slick'))}</span></button>
        <button class="compra" data-acao="comprar-pneu" data-tipo="chuva"><b>+ Chuva</b><span>${reais(C.precoPneu(estado, 'chuva'))}</span></button>
      </div>`, { ajuda: 'oficina' });
  }

  function linhaPatrocinio(o, oferta) {
    return `<div class="item">
      <div class="item-topo"><b>${esc(o.empresa)}</b><b class="dinheiro">${reais(o.porEtapa)}<span class="fraco">/etapa</span></b></div>
      <div class="chips">${chip(`🎯 ${C.textoMeta(o.meta)}`)}${chip(`🎁 +${reais(o.bonus)}`)}</div>
      ${oferta ? `<div class="botoes-2"><button class="principal" data-acao="aceitar-patrocinio" data-id="${o.id}">Aceitar</button><button data-acao="recusar-patrocinio" data-id="${o.id}">Recusar</button></div>` : ''}
    </div>`;
  }

  function cartaoPatrocinio() {
    const vagas = Array.from({ length: C.MAX_PATROCINIOS }, (_, i) => `<i class="${i < estado.patrocinios.length ? 'cheia' : ''}"></i>`).join('');
    const ofertas = estado.ofertasPatrocinio;
    return cartao('Patrocínio', `
      ${estado.patrocinios.map((o) => linhaPatrocinio(o, false)).join('')}
      ${ofertas.length ? `<span class="subtitulo">Ofertas</span>${ofertas.map((o) => linhaPatrocinio(o, true)).join('')}` : ''}
      ${!estado.patrocinios.length && !ofertas.length ? '<p class="vazio">Nenhuma empresa por enquanto.</p>' : ''}
      <div class="chips">${chip(`⭐ Popularidade ${Math.round(estado.piloto.popularidade)}`)}</div>`,
    { ajuda: 'patrocinio', extra: `<span class="vagas" aria-label="${estado.patrocinios.length} de ${C.MAX_PATROCINIOS}">${vagas}</span>` });
  }

  function cartaoProposta(pr) {
    const atual = C.equipeBase(estado.equipeId);
    const nova = C.equipeBase(pr.equipe);
    const tipo = { fabrica: 'Piloto de fábrica', desconto: 'Vaga com desconto', furada: 'Vaga com desconto' }[pr.tipo];
    return `<div class="item" style="border-left:4px solid ${nova.cor}">
      <div class="item-topo"><b>${esc(pr.nome)}</b>${chip(tipo)}</div>
      <div class="tiles">${tile('Kart', `${pr.materialPrometido} <span class="fraco">vs ${atual.material}</span>`)}${tile('Por etapa', pr.custoEtapa ? reais(pr.custoEtapa) : 'Grátis', 'dinheiro')}${tile('Multa', reais(pr.multa), 'aviso')}</div>
      ${pr.segundoPiloto ? chip('⚠ Segundo piloto', 'chip-amarelo') : ''}
      <div class="botoes-2"><button class="principal" data-acao="aceitar-proposta" data-id="${pr.id}" data-confirmar="Confirmar troca">Aceitar</button><button data-acao="recusar-proposta" data-id="${pr.id}">Recusar</button></div>
    </div>`;
  }

  function cartaoOlheiros() {
    const olheiros = estado.olheiros || [];
    return cartao('Olheiros', `
      ${olheiros.length ? `<div class="chips">${olheiros.map((o) => chip(esc(o.nome))).join('')}</div>` : '<p class="vazio">Ninguém importante hoje.</p>'}
      ${estado.propostas.map(cartaoProposta).join('')}`, { ajuda: 'olheiros' });
  }

  const semAcento = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Sigla de 3 letras do sobrenome (FER, MON…), como na cronometragem.
  const sigla = (nome) => semAcento(nome.trim().split(/\s+/).pop()).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  // "Lucas FERRAZ": primeiro nome normal, sobrenome em caixa alta e negrito.
  function nomeDestaque(nome) {
    const partes = nome.trim().split(/\s+/);
    if (partes.length < 2) return `<b>${esc(nome.toUpperCase())}</b>`;
    return `${esc(partes[0])} <b>${esc(partes.slice(1).join(' ').toUpperCase())}</b>`;
  }

  function listaCampeonato() {
    const tabela = C.classificacaoCampeonato(estado);
    const camp = C.campeonato(estado.campeonato);
    const proximo = Dados.CAMPEONATOS[camp.ordem + 1];
    const destino = proximo ? proximo.curto : 'F4';
    return `<div class="classificacao">${tabela.map((x, i) => {
      const eq = C.equipeBase(x.equipe);
      const eu = x.id === 'jogador';
      const seguido = estado.seguindo === x.id;
      const corte = i === C.VAGAS_SUBIDA ? `<div class="camp-corte"><span>▲ Os ${C.VAGAS_SUBIDA} primeiros sobem para o ${destino}</span></div>` : '';
      return `${corte}<div class="camp-linha ${eu ? 'jogador' : ''} ${seguido ? 'seguido' : ''} ${i < C.VAGAS_SUBIDA ? 'sobe' : ''}">
        <span class="camp-pos"><b>${i + 1}</b><small>${x.pontos} pts</small></span>
        <i class="camp-cor" style="background:${eq.cor}"></i>
        <span class="camp-nome"><span>${nomeDestaque(x.nome)}</span><small>${esc(eq.nome)}${x.vitorias ? ` · ${x.vitorias} vitória${x.vitorias > 1 ? 's' : ''}` : ''}</small></span>
        ${eu ? '<span class="chip">Você</span>' : `<button class="seguir ${seguido ? 'ativo' : ''}" data-acao="seguir" data-id="${x.id}" aria-pressed="${seguido}" aria-label="${seguido ? 'Deixar de seguir' : 'Seguir'} ${esc(x.nome)}">${seguido ? '★' : '☆'}</button>`}
      </div>`;
    }).join('')}</div>`;
  }

  // Calendário da temporada: resultado nas etapas que passaram, "agora" na atual.
  function calendario() {
    const camp = C.campeonato(estado.campeonato);
    const todas = Dados.KARTODROMOS[camp.regiao];
    return `<div class="calendario">${estado.calendario.map((et, i) => {
      const pista = todas.find((k) => k.id === et.pista);
      const feito = estado.historico.find((h) => h.ano === estado.ano && h.campeonato === estado.campeonato && h.etapa === i + 1);
      let status;
      if (i === estado.etapa && estado.fase !== 'relatorio') status = '<span class="agora">Agora</span>';
      else if (feito) status = `<span class="pos-mini ${!feito.fora && feito.pos <= 3 ? 'top' : ''}">${feito.fora ? 'Abandono' : 'P' + feito.pos}</span>`;
      else if (i < estado.etapa) status = '<span class="fraco mini">Fora</span>';
      else status = '';
      return `<div class="cal-linha ${i === estado.etapa ? 'atual' : i < estado.etapa ? 'passada' : ''}">
        <span class="cal-num">E${i + 1}</span>
        <span class="cal-nome"><b>${esc(pista.nome)}</b><small>${esc(pista.local)} · ${tipoPista[pista.tipo].replace(/^\S+\s/, '')}</small></span>
        ${status}
      </div>`;
    }).join('')}</div>`;
  }

  // Gráfico de linha da posição (P1 em cima). Uma série só: sem legenda, rótulo direto no último e no melhor ponto.
  function graficoPosicao(pontos, maxPos = 20) {
    if (pontos.length < 2) return '<p class="vazio">O gráfico aparece depois de duas etapas.</p>';
    const [L, R, T, B] = [34, 300, 14, 132];
    const x = (i) => L + (pontos.length === 1 ? 0 : (i * (R - L)) / (pontos.length - 1));
    const y = (pos) => T + ((pos - 1) * (B - T)) / (maxPos - 1);
    const grade = [1, 5, 10, 15, 20].filter((g) => g <= maxPos).map((g) => `<line x1="${L}" x2="${R}" y1="${y(g)}" y2="${y(g)}" class="g-grade"/><text x="${L - 8}" y="${y(g) + 4}" class="g-eixo" text-anchor="end">P${g}</text>`).join('');
    const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.pos).toFixed(1)}`).join(' ');
    const melhor = pontos.reduce((m, p, i) => (p.pos < pontos[m].pos ? i : m), 0);
    const ultimo = pontos.length - 1;
    const marcas = pontos.map((p, i) => `<g class="g-ponto" tabindex="0" aria-label="${esc(p.rotulo)}: P${p.pos}">
        <circle cx="${x(i)}" cy="${y(p.pos)}" r="13" class="g-alvo"/>
        <circle cx="${x(i)}" cy="${y(p.pos)}" r="4.5" class="g-marca"/>
        <g class="g-dica"><rect x="${Math.min(R - 92, Math.max(0, x(i) - 46))}" y="${y(p.pos) > 60 ? y(p.pos) - 40 : y(p.pos) + 12}" width="92" height="26" rx="6"/>
          <text x="${Math.min(R - 46, Math.max(46, x(i)))}" y="${y(p.pos) > 60 ? y(p.pos) - 23 : y(p.pos) + 29}" text-anchor="middle">${esc(p.rotulo)} · P${p.pos}</text></g>
      </g>`).join('');
    const rotulo = (i) => `<text x="${Math.min(R - 4, x(i) + 8)}" y="${y(pontos[i].pos) - 9}" class="g-rotulo" text-anchor="${i === ultimo ? 'end' : 'start'}">P${pontos[i].pos}</text>`;
    const eixoX = `<text x="${L}" y="${B + 20}" class="g-eixo">${esc(pontos[0].curto)}</text><text x="${R}" y="${B + 20}" class="g-eixo" text-anchor="end">${esc(pontos[ultimo].curto)}</text>`;
    return `<svg class="grafico" viewBox="0 0 310 158" role="img" aria-label="Posição no campeonato: de P${pontos[0].pos} para P${pontos[ultimo].pos}, melhor P${pontos[melhor].pos}">
      ${grade}<path d="${linha}" class="g-linha"/>${marcas}${rotulo(ultimo)}${melhor !== ultimo ? rotulo(melhor) : ''}${eixoX}
    </svg>`;
  }

  // "nesta etapa", "há 2 etapas", "em 2027"
  function quando(n) {
    if (n.ano !== estado.ano) return `em ${n.ano}`;
    const atual = estado.fase === 'relatorio' ? C.ETAPAS : estado.etapa + 1;
    const d = atual - (n.etapa || atual);
    return d <= 0 ? 'nesta etapa' : d === 1 ? 'na etapa passada' : `há ${d} etapas`;
  }

  // Ondinha de áudio (decorativa) para as falas do rádio; o formato vem do próprio texto.
  function onda(texto) {
    let h = 7;
    for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const barras = Array.from({ length: 14 }, (_, i) => { h = (h * 1103515245 + 12345) >>> 0; return 30 + (h % 70) * (i % 3 === 0 ? 1 : 0.7); });
    return `<span class="onda" aria-hidden="true">${barras.map((v) => `<i style="height:${Math.round(v)}%"></i>`).join('')}</span>`;
  }

  function painelPiloto() {
    const p = estado.piloto;
    const ultimos = estado.historico.slice(-10).reverse();
    return `<div class="grade">
      ${cartao(esc(p.nome), `${C.ATRIBUTOS.map((a) => barra(C.NOMES_ATRIBUTOS[a], p[a])).join('')}
        <div class="aneis">${anel('Moral', p.moral)}${anel('Confiança', p.confianca)}</div>`, { ajuda: 'cabeca' })}
      ${cartao(`Campeonato ${estado.ano}`, graficoPosicao(estado.evolucao.filter((e) => e.ano === estado.ano && e.campeonato === estado.campeonato).map((e) => ({ rotulo: `Etapa ${e.etapa}`, curto: `E${e.etapa}`, pos: e.pos }))))}
      ${estado.temporadas.length >= 2 ? cartao('Carreira', graficoPosicao(estado.temporadas.map((t) => ({ rotulo: `${t.ano} ${C.campeonato(t.campeonato).curto}`, curto: String(t.ano), pos: t.pos })))) : ''}
      ${cartao('Últimas corridas', ultimos.length
        ? `<div class="resultados">${ultimos.map((h) => `<div class="resultado-bolinha ${h.fora ? 'fora' : h.pos === 1 ? 'ouro' : h.pos <= 3 ? 'podio' : h.pos <= 10 ? 'pontos' : ''}" title="${esc(h.pista)} ${h.ano}">${h.fora ? '✕' : h.pos}</div>`).join('')}</div>`
        : '<p class="vazio">Nenhuma corrida ainda.</p>')}
    </div>`;
  }

  // Anotações agrupadas por fim de semana (mais recente primeiro), em ordem: treinos, classificação, corrida.
  function notaCaderno(n) {
    const pedia = [n.motor, n.pneu, ...n.ajustes].filter(Boolean);
    return `<div class="nota">
      ${n.sentiu.map((f) => `<p>🧑 ${esc(f)}</p>`).join('')}
      ${pedia.length ? `<span class="subtitulo">O kart pedia</span><ul class="diagnostico">${pedia.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${n.texto ? `<p class="nota-texto">📝 ${esc(n.texto)}</p>` : ''}
    </div>`;
  }

  function blocosCaderno(lista) {
    const grupos = new Map();
    for (const l of lista) {
      const chave = `${l.ano}-${l.campeonato || ''}-${l.etapa || 0}`;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(l);
    }
    return [...grupos.values()].reverse().map((itens) => {
      const l0 = itens[0];
      let treino = 0;
      const linhas = itens.map((l) => {
        const nome = l.sessao === 'treino' ? `Treino ${++treino}` : l.sessao === 'corrida' ? 'Corrida' : 'Classificação';
        const pos = l.fora ? 'Abandono' : `P${l.posicao}`;
        return `<div class="anotacao ${l.sessao === 'corrida' ? 'anotacao-corrida' : ''}">
          <div class="item-topo"><span class="chips">${chip(nome, l.sessao === 'corrida' ? 'chip-grande' : '')}${chip(l.molhado ? '🌧' : '☀️')}${chip(`${l.tempPista}°`)}</span>
            <b>${l.tempo ? tempoVolta(l.tempo) : '—'} <span class="pos-mini ${!l.fora && l.posicao <= 3 ? 'top' : ''}">${pos}</span></b></div>
          <div class="fraco">${Kart.PNEUS_KART[l.pneu].nome} · ${esc(Kart.descreverSetup(l.setup))}</div>
          ${l.nota ? notaCaderno(l.nota) : ''}
        </div>`;
      }).join('');
      return `<div class="anotacoes"><span class="subtitulo">${l0.ano}${l0.etapa ? ` · etapa ${l0.etapa}` : ''}${l0.campeonato ? ` · ${esc(C.campeonato(l0.campeonato).curto)}` : ''}</span>${linhas}</div>`;
    }).join('');
  }

  function painelCaderno() {
    const pistas = Object.keys(estado.caderno);
    if (!pistas.length) return cartao('Caderno', '<p class="vazio">Cada saída de treino, a classificação e a corrida aparecem aqui.</p>');
    const todas = [...Dados.KARTODROMOS.br, ...Dados.KARTODROMOS.eu, ...Dados.KARTODROMOS.f4];
    return `<div class="grade">${pistas.map((id) => cartao(esc(todas.find((x) => x.id === id).nome), blocosCaderno(estado.caderno[id]))).join('')}</div>`;
  }

  function telaPaddock() {
    const aba = tela.aba || 'resumo';
    const conteudo = {
      resumo: () => `${cartaoProximaEtapa()}<div class="grade">${cartaoCabeca()}${cartaoOficina()}${cartaoPatrocinio()}${cartaoOlheiros()}</div>`,
      campeonato: () => `<div class="grade">${cartao('Classificação', listaCampeonato())}${cartao(`Calendário ${estado.ano}`, calendario())}</div>`,
      piloto: painelPiloto,
      caderno: painelCaderno,
      noticias: () => cartao('Notícias', `<div class="noticias">${estado.noticias.map((n) => `<article class="noticia"><b>${esc(n.texto)}</b><small>${quando(n)}</small></article>`).join('')}</div>`),
    }[aba]();
    const pos = C.posicaoNoCampeonato(estado);
    app.innerHTML = `
      <div class="linha cabecalho-tela"><h1>Paddock</h1><span class="espaco"></span>${chip(`🏆 P${pos} · ${estado.pontos.jogador} pts`, 'chip-grande')}</div>
      ${abas([['resumo', '🏁', 'Etapa'], ['campeonato', '🏆', 'Tabela'], ['piloto', '🧑', 'Piloto'], ['caderno', '📓', 'Caderno'], ['noticias', '📰', 'Notícias']], aba)}
      ${conteudo}
      <div class="rodape"><button class="discreto" data-acao="abandonar" data-confirmar="Toque de novo para apagar">Apagar carreira</button></div>
      ${folhaChecagem()}${folhaPneu()}`;
  }

  const SOBRE_TIPO = {
    travada: 'Traçado travado, cheio de curvas lentas e grampos. Premia tração na saída e um kart que vira fácil.',
    mista: 'Traçado misto, com retas médias e curvas de todos os tipos. O equilíbrio do acerto faz a diferença.',
    veloz: 'Traçado veloz, de retas longas e curvas rápidas. Pede velocidade final e coragem nas tangências.',
  };

  // Ficha detalhada do traçado: retas, curvas, zebras, asfalto, desnível e onde ultrapassar.
  const ZEBRAS = {
    altas: ['Altas', 'Cortar demais desequilibra o kart.'],
    baixas: ['Baixas', 'Dá para cortar bastante.'],
    sem: ['Sem zebra', 'Sair do traçado custa caro.'],
  };
  const ASFALTO = {
    liso: ['Liso', 'Poupa o pneu.'],
    medio: ['Médio', 'Desgaste normal de pneu.'],
    abrasivo: ['Abrasivo', 'Áspero: gasta muito pneu.'],
  };
  function fichaPista(p) {
    const longas = p.retas.filter((m) => m >= 200).length;
    const nCurvas = p.curvas.lentas + p.curvas.medias + p.curvas.rapidas;
    const facil = p.ultrapassagem >= 0.65 ? 'Fácil' : p.ultrapassagem >= 0.5 ? 'Média' : 'Difícil';
    const linha = (icone, rotulo, valor, detalhe = '') => `<div class="ficha-linha"><span class="ficha-icone" aria-hidden="true">${icone}</span>
      <span class="ficha-rotulo">${rotulo}</span><span class="ficha-valor"><b>${valor}</b>${detalhe ? `<small>${detalhe}</small>` : ''}</span></div>`;
    return [
      linha('🛣️', 'Retas', `${p.retas.length} ${p.retas.length === 1 ? 'reta' : 'retas'}${longas ? ` · ${longas} ${longas === 1 ? 'longa' : 'longas'}` : ''}`, p.retas.map((m) => `${m} m`).join(' · ')),
      linha('↪️', 'Curvas', `${nCurvas} curvas`, `${p.curvas.lentas} lentas · ${p.curvas.medias} médias · ${p.curvas.rapidas} rápidas`),
      linha('⤵️', 'Grampos', p.grampos, p.grampos >= 2 ? 'Freadas fortes e tração na saída.' : ''),
      linha('🟥', 'Zebras', ZEBRAS[p.zebras][0], ZEBRAS[p.zebras][1]),
      linha('⬛', 'Asfalto', ASFALTO[p.asfalto][0], ASFALTO[p.asfalto][1]),
      linha('⛰️', 'Desnível', esc(p.desnivel)),
      linha('🏁', 'Ultrapassagem', facil, esc(p.ondePassar)),
    ].join('');
  }

  // Sobre, números e traçado da pista: usado na tela "Ver pista" e na folha aberta durante o fim de semana.
  function conteudoPista(pista, camp) {
    const extensao = ((pista.extensao || pista.tempoBase * 21) / 1000).toFixed(2).replace('.', ',');
    return `${linhaRecorde()}<section class="secao"><h2>Sobre</h2><p class="fraco sobre">${esc(pista.sobre || SOBRE_TIPO[pista.tipo])} ${pista.altitude >= 700 ? 'Na altitude o motor perde força e a carburação muda.' : ''}</p></section>
      <div class="dados">
        ${dado('regua', 'Extensão', `${extensao} km`)}${dado('voltas', 'Voltas', camp.voltas)}${dado('montanha', 'Altitude', `${pista.altitude} m`)}
        ${dado('bandeira', 'Tipo', tipoPista[pista.tipo].replace(/^\S+\s/, ''))}${pista.largura ? dado('largura', 'Largura', `${pista.largura} m`) : ''}${pista.sentido ? dado('sentido', 'Sentido', pista.sentido.replace(/^./, (c) => c.toUpperCase())) : ''}
      </div>
      ${pista.retas ? `<section class="secao"><h2>Traçado</h2><div class="ficha">${fichaPista(pista)}</div></section>` : ''}`;
  }

  // Folha com a ficha da pista, aberta por cima do treino, da classificação, do grid ou da corrida
  // (fica fora do #app para não interromper a corrida ao vivo).
  const folhaPista = document.createElement('div');
  folhaPista.className = 'folha-fundo';
  folhaPista.hidden = true;
  document.body.appendChild(folhaPista);
  folhaPista.addEventListener('click', (ev) => { if (ev.target === folhaPista || ev.target.closest('[data-fechar]')) folhaPista.hidden = true; });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') folhaPista.hidden = true; });
  function abrirFichaPista() {
    const pista = C.pistaAtual(estado);
    folhaPista.innerHTML = `<div class="folha folha-pista" role="dialog" aria-modal="true" aria-labelledby="folha-pista-titulo">
      <div class="folha-pista-topo"><h3 id="folha-pista-titulo">${esc(pista.nome)}</h3><button class="redondo" data-fechar aria-label="Fechar">✕</button></div>
      ${conteudoPista(pista, C.campeonato(estado.campeonato))}
      <button class="principal grande" data-fechar>Voltar</button>
    </div>`;
    folhaPista.hidden = false;
    folhaPista.querySelector('.folha').scrollTop = 0;
  }

  // Linha de dado: ícone, rótulo em caixa alta e valor grande.
  const dado = (ic, rotulo, valor) => `<div class="dado">${icone(ic)}<span>${rotulo}</span><b>${valor}</b></div>`;

  function telaPista() {
    const pista = C.pistaAtual(estado);
    const camp = C.campeonato(estado.campeonato);
    const aba = tela.aba || 'pista';
    const anotacoes = estado.caderno[pista.id] || [];
    app.innerHTML = `
      <div class="detalhe">
        <div class="linha"><button class="voltar" data-acao="voltar-paddock-pista">${icone('voltar')}<span>Paddock</span></button></div>
        <div class="detalhe-titulo"><h1>${tituloForte(pista.nome)}</h1><p>${icone('local', 'ico-p')} ${esc(pista.local)}</p></div>
        <div class="segmentado" role="tablist">
          <button role="tab" data-acao="aba-pista" data-aba="pista" class="${aba === 'pista' ? 'ativo' : ''}" aria-selected="${aba === 'pista'}">Pista</button>
          <button role="tab" data-acao="aba-pista" data-aba="caderno" class="${aba === 'caderno' ? 'ativo' : ''}" aria-selected="${aba === 'caderno'}">Caderno</button>
        </div>
        ${aba === 'pista' ? conteudoPista(pista, camp)
        : `<div class="anotacoes">${anotacoes.length ? blocosCaderno(anotacoes) : '<p class="vazio">Você ainda não andou aqui.</p>'}</div>`}
        ${estado.dinheiro >= C.custoEtapa(estado) ? `<button class="principal grande" data-acao="ir-fds">Ir para a pista · ${reais(C.custoEtapa(estado))}</button>` : ''}
      </div>
      ${folhaChecagem()}`;
  }

  // ---------- fim de semana ----------
  function editorSetup() {
    const s = estado.fds.setup;
    return `<div class="setup">${Kart.ORDEM_AJUSTES.map((k) => {
      const a = Kart.AJUSTES[k];
      let controle;
      if (a.tipo === 'opcoes') {
        controle = `<div class="segmentos">${a.opcoes.map((o, i) => `<button data-acao="ajuste" data-k="${k}" data-valor="${i}" class="${s[k] === i ? 'ativo' : ''}">${o}</button>`).join('')}</div>`;
      } else {
        const rotulo = k === 'carburacao' ? (s[k] === 0 ? 'Padrão' : s[k] < 0 ? `Pobre ${-s[k]}` : `Rica ${s[k]}`) : `${s[k]} ${a.unidade === 'dentes' ? 'z' : a.unidade}`;
        controle = `<div class="passos"><button data-acao="ajuste" data-k="${k}" data-delta="-1" aria-label="Diminuir ${a.nome}" ${s[k] <= a.min ? 'disabled' : ''}>−</button>
          <b>${rotulo}</b><button data-acao="ajuste" data-k="${k}" data-delta="1" aria-label="Aumentar ${a.nome}" ${s[k] >= a.max ? 'disabled' : ''}>+</button></div>`;
      }
      return `<div class="ajuste"><span class="ajuste-nome">${a.nome}${botaoAjuda(k)}</span>${controle}</div>`;
    }).join('')}</div>`;
  }

  function passosFds(atual) {
    const passos = [['treino', 'Treino'], ['quali', 'Classificação'], ['grid', 'Corrida'], ['fim', 'Resultado']];
    const idx = passos.findIndex(([id]) => id === atual || (atual === 'corrida' && id === 'grid'));
    return `<div class="passos-fds">${passos.map(([, nome], i) => `<span class="${i === idx ? 'atual' : i < idx ? 'feito' : ''}">${i < idx ? '✓ ' : ''}${nome}</span>`).join('')}</div>`;
  }

  function telaFimDeSemana() {
    const fds = estado.fds;
    const pista = C.pistaAtual(estado);
    const cabecalho = `<div class="linha cabecalho-tela"><h1>${tituloForte(pista.nome)}</h1>${chip(tipoPista[pista.tipo])}<span class="espaco"></span><button class="ver-pista-mini" data-acao="ficha-pista">Ver pista ›</button></div>${passosFds(fds.sessao)}`;
    if (fds.sessao === 'treino' || fds.sessao === 'quali') app.innerHTML = cabecalho + telaAcerto();
    else if (fds.sessao === 'grid') app.innerHTML = cabecalho + telaGrid();
    else if (fds.sessao === 'corrida') { app.innerHTML = cabecalho + htmlCorrida(); atualizarCorrida(); if (!corrida.terminou && !tela.pausado) iniciarTimer(); }
    else app.innerHTML = cabecalho + telaResultadoCorrida();
    if (tela.largada && fds.sessao === 'grid') app.insertAdjacentHTML('beforeend', folhaLargada());
    else if (tela.mudancas === fds.sessao) app.insertAdjacentHTML('beforeend', folhaMudancas(fds.sessao));
  }

  // Resultado da classificação: a posição de largada vem antes de qualquer outra informação.
  function folhaLargada() {
    const q = estado.fds.quali;
    const i = q.findIndex((x) => x.id === 'jogador');
    const pos = i + 1;
    const dif = q[i].tempo - q[0].tempo;
    const titulo = pos === 1 ? 'Pole position!' : pos === 2 ? 'Primeira fila!' : pos <= 5 ? 'Ótima posição.' : pos <= 10 ? 'Bom lugar no grid.' : 'Vai ter que escalar o pelotão.';
    return `<div class="folha-fundo" data-acao-fundo="fechar-largada"><div class="folha folha-largada" role="dialog" aria-modal="true" aria-labelledby="folha-largada-titulo">
      <span class="passo-inicio">Classificação</span>
      <h3 id="folha-largada-titulo">Você vai largar em</h3>
      <div class="largada-grande ${pos <= 3 ? 'top' : ''}">P${pos}</div>
      <p class="fraco">${titulo} ${pos === 1 ? `Sua volta: ${tempoVolta(q[0].tempo)}.` : `Sua volta: ${tempoVolta(q[i].tempo)} (${dif.toFixed(3).replace('.', ',')} s atrás da pole).`}</p>
      ${estado.fds.recordeQuali ? chip('🏆 Novo recorde da pista!', 'chip-recorde') : ''}
      <button class="principal grande" data-acao="fechar-largada">Continuar</button>
    </div></div>`;
  }

  // A pista mudou o bastante para avisar? (a borracha sozinha não conta: ela sempre aumenta)
  function houveMudanca(sessao) {
    const clima = C.climaAtual(estado);
    const molhado = clima.tarde.inicioChuva === 'quali';
    const quali = Kart.condicao(clima, 'quali', molhado);
    const antes = sessao === 'grid' ? quali : Kart.condicao(clima, 'treino', clima.manha.chove);
    const agora = sessao === 'grid' ? Kart.condicao(clima, 'corrida', molhado) : quali;
    return antes.molhado !== agora.molhado || Math.abs(agora.tempAr - antes.tempAr) >= 2
      || Math.abs(agora.tempPista - antes.tempPista) >= 3 || (sessao === 'grid' && !agora.molhado && clima.tarde.chance >= 30);
  }

  // Folha que abre ao chegar na classificação e no grid: o que mudou na pista desde a sessão anterior.
  // Não diz o que mexer no kart, só chama a atenção para as condições.
  function folhaMudancas(sessao) {
    const clima = C.climaAtual(estado);
    const treino = Kart.condicao(clima, 'treino', clima.manha.chove);
    const molhado = clima.tarde.inicioChuva === 'quali';
    const quali = Kart.condicao(clima, 'quali', molhado);
    const antes = sessao === 'grid' ? quali : treino;
    const agora = sessao === 'grid' ? Kart.condicao(clima, 'corrida', molhado) : quali;
    const nomeAntes = sessao === 'grid' ? 'Classificação' : 'Treino';
    const nomeAgora = sessao === 'grid' ? 'Corrida' : 'Classificação';
    const borracha = (c) => (c.molhado ? 'Lavada' : c.borracha < 0.5 ? 'Pouca' : c.borracha < 0.7 ? 'Mais' : 'Muita');
    const ceu = (c) => (c.molhado ? '🌧 Chuva' : '☀️ Seco');
    const linha = (rotulo, a, b, delta = '') => `<div class="mudanca ${a === b ? '' : 'mudou'}">
      <span class="mudanca-rotulo">${rotulo}</span><span>${a}</span><span aria-hidden="true">${a === '' ? '' : '→'}</span><b>${b}${delta}</b></div>`;
    const dif = (a, b) => (a === b ? '' : ` <small>${b > a ? '+' : '−'}${Math.abs(b - a)}°</small>`);
    return `<div class="folha-fundo" data-acao-fundo="fechar-mudancas"><div class="folha folha-mudancas" role="dialog" aria-modal="true" aria-labelledby="folha-mudancas-titulo">
      <span class="passo-inicio">${nomeAntes} → ${nomeAgora}</span>
      <h3 id="folha-mudancas-titulo">As condições mudaram</h3>
      <div class="mudancas">
        ${linha('Céu', ceu(antes), ceu(agora))}
        ${linha('🌡 Ar', `${antes.tempAr}°`, `${agora.tempAr}°`, dif(antes.tempAr, agora.tempAr))}
        ${linha('Asfalto', `${antes.tempPista}°`, `${agora.tempPista}°`, dif(antes.tempPista, agora.tempPista))}
        ${linha('Borracha', borracha(antes), borracha(agora))}
        ${!agora.molhado ? `<div class="mudanca ${clima.tarde.chance >= 30 ? 'mudou' : ''}"><span class="mudanca-rotulo">💧 Chance de chuva na corrida</span><span></span><span></span><b>${clima.tarde.chance}%</b></div>` : ''}
      </div>
      ${C.leituraPista(estado, sessao).map((f) => `<div class="bolha piloto"><span aria-hidden="true">🧑</span><p>${esc(f)}</p></div>`).join('')}
      <p class="fraco">A pista não é a mesma de ${sessao === 'grid' ? 'agora há pouco' : 'manhã'}. Fique atento a como o kart vai se comportar.</p>
      <button class="principal grande" data-acao="fechar-mudancas">Entendi</button>
    </div></div>`;
  }

  // Pneu zerado rende menos nas primeiras voltas: no treino dá para amaciar sem gastar uma saída.
  function dicaAmaciar() {
    const p = estado.pneus.find((x) => x.id === estado.fds.pneuId);
    if (!p || !C.pneuNovo(p)) return '';
    if (estado.fds.sessao === 'treino') return '<button class="compra amaciar" data-acao="amaciar-pneu"><b>🔥 Amaciar este pneu</b><span>2 voltas rápidas, sem gastar uma saída</span></button>';
    return chip('⚠ Pneu zerado: rende menos nas primeiras voltas', 'chip-amarelo');
  }

  function aviseGasto() {
    const p = estado.pneus.find((x) => x.id === estado.fds.pneuId);
    return p && p.uso > 15 ? chip('⚠ Pneu gasto para a corrida', 'chip-amarelo') : '';
  }

  // Sem mecânico por padrão: contrata-se por etapa, e ele só ajuda durante o treino livre.
  // Card do mecânico: escolher um dos três tipos, pagar hora extra ou pedir ajuda nesta sessão.
  function cartaoMecanico() {
    const fds = estado.fds;
    const m = C.mecanicoDoFds(fds);
    if (!m) {
      return cartao('Mecânico', `<p class="fraco mini">Você está acertando o kart sozinho. Se quiser ajuda, contrate alguém para o fim de semana.</p>
        <div class="mecanicos">${Object.entries(C.MECANICOS).map(([tipo, x]) => {
          const preco = C.precoMecanico(estado, tipo);
          const extra = C.precoHoraExtra(estado, tipo);
          return `<button class="compra mecanico-opcao mec-${tipo}" data-acao="contratar-mecanico" data-tipo="${tipo}" data-confirmar="Confirmar: −${reais(preco)}" ${estado.dinheiro < preco ? 'disabled' : ''}>
            <b>${x.icone} ${x.nome}</b><span class="mecanico-desc">${x.descricao}</span>
            <span class="mecanico-preco"><b>${reais(preco)}</b>${extra ? ` · hora extra ${reais(extra)}` : ' · fim de semana todo'}</span></button>`;
        }).join('')}</div>`, { ajuda: 'mecanico' });
    }
    const info = C.MECANICOS[m.tipo];
    const ativo = C.mecanicoAtivo(estado);
    const conselho = m.usos[fds.sessao];
    const rotulo = { palpite: 'Pedir um palpite', tecnica: 'Pedir a análise técnica', monta: 'Montar o kart' }[info.faz];
    let corpo;
    if (!ativo) {
      const extra = C.precoHoraExtra(estado, m.tipo);
      corpo = `<p class="fraco mini">Ele trabalhou na sessão anterior. Para ficar nesta, cobra hora extra.</p>
        <button class="compra" data-acao="hora-extra" data-confirmar="Confirmar: −${reais(extra)}" ${estado.dinheiro < extra ? 'disabled' : ''}><b>⏱ Pagar hora extra</b><span>−${reais(extra)} · esta sessão</span></button>`;
    } else if (conselho) {
      // Palpite (iniciante) é uma frase; análise técnica e kart montado viram uma lista "ajuste → o que fazer".
      const itens = conselho.map((c) => c.split(': '));
      corpo = info.faz === 'tecnica' && itens.every((x) => x.length === 2)
        ? `<ul class="conselho">${itens.map(([nome, acao]) => `<li><span>${esc(nome)}</span><b>${esc(acao)}</b></li>`).join('')}</ul>`
        : `<p class="conselho-texto">${conselho.map((c) => esc(c)).join('<br>')}</p>`;
    } else {
      corpo = `<button class="principal" data-acao="sugestao">${info.icone} ${rotulo}</button>`;
    }
    return cartao('Mecânico', `<div class="linha"><b>${info.icone} ${info.nome}</b><span class="espaco"></span>${chip(ativo ? 'Trabalhando' : 'Fora desta sessão', ativo ? 'chip-dinheiro' : '')}</div>${corpo}`, { ajuda: 'mecanico' });
  }

  // Diferença para a saída anterior: verde se foi mais rápida, vermelho se foi mais lenta.
  function deltaSaida(atual, anterior) {
    if (!anterior) return '<span class="delta"></span>';
    const d = atual.tempo - anterior.tempo;
    const texto = `${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(3)}`;
    return `<span class="delta ${d < 0 ? 'melhor' : 'pior'}" title="Em relação à saída anterior">${texto}</span>`;
  }

  function telaAcerto() {
    const fds = estado.fds;
    const treino = fds.sessao === 'treino';
    const restantes = C.SAIDAS_TREINO - fds.saidas.length;
    const saidas = fds.saidas.slice().reverse();
    const contador = Array.from({ length: C.SAIDAS_TREINO }, (_, i) => `<i class="${i < fds.saidas.length ? 'feita' : ''}"></i>`).join('');
    return `<div class="corrida">
      <div class="coluna">
        ${cartao(treino ? 'Treino livre' : 'Classificação', `${condicaoChips(treino ? 'treino' : 'quali')}${leitura(fds.sessao)}${editorSetup()}`, { ajuda: treino ? (Kart.categoria() === 'f4' ? 'setupF4' : 'setup') : 'quali' })}
        ${cartaoMecanico()}
        ${cartao('Pneu', `${pneusVisuais(true)}${aviseGasto()}${dicaAmaciar()}<div class="botoes-2"><button class="compra" data-acao="comprar-pneu" data-tipo="slick"><b>+ Slick</b><span>${reais(C.precoPneu(estado, 'slick'))}</span></button><button class="compra" data-acao="comprar-pneu" data-tipo="chuva"><b>+ Chuva</b><span>${reais(C.precoPneu(estado, 'chuva'))}</span></button></div>`)}
        <div class="acoes">
          ${treino
            ? `<button class="principal grande" data-acao="saida" ${restantes ? '' : 'disabled'}>Sair para a pista <span class="etapas" aria-label="${restantes} saídas restantes">${contador}</span></button>
               <button class="grande" data-acao="ir-quali">Ir para a classificação →</button>`
            : '<button class="principal grande" data-acao="classificar">Fazer a volta lançada</button>'}
        </div>
      </div>
      ${cartao('Rádio', saidas.length ? saidas.map((s, i) => `<div class="saida">
          <div class="item-topo"><span class="chip">Saída ${saidas.length - i}</span>${s.recorde ? '<span class="chip chip-recorde">🏆 Recorde</span>' : ''}
            <span class="tempo-bloco">${deltaSaida(s, saidas[i + 1])}<b class="tempo">${tempoVolta(s.tempo)}</b></span>
            <span class="pos-mini ${s.posicao <= 3 ? 'top' : ''}">P${s.posicao}</span></div>
          <div class="fraco mini">${esc(Kart.descreverSetup(s.setup))}</div>
          ${s.frases.map((f) => `<div class="bolha piloto"><span aria-hidden="true">🧑</span><p>${onda(f)}${esc(f)}</p></div>`).join('')}
          ${s.dica ? `<div class="bolha mecanico"><span aria-hidden="true">🔧</span><p>${onda(s.dica)}${esc(s.dica.replace(/^Mecânico: /, ''))}</p></div>` : ''}
        </div>`).join('') : '<p class="vazio">📻 Ajuste o kart e saia para a pista.</p>', { ajuda: 'radio' })}
    </div>`;
  }

  // Falas do piloto sobre a pista antes da sessão: as pistas do que mudou.
  function leitura(sessao) {
    return `<div class="leitura">${C.leituraPista(estado, sessao).map((f) => `<div class="bolha piloto"><span aria-hidden="true">🧑</span><p>${esc(f)}</p></div>`).join('')}</div>`;
  }

  function telaGrid() {
    const fds = estado.fds;
    const pole = fds.quali[0].tempo;
    const meu = fds.quali.findIndex((q) => q.id === 'jogador') + 1;
    const mudou = fds.pneuId !== fds.pneuCorrida || Kart.ORDEM_AJUSTES.some((k) => fds.setup[k] !== fds.setupCorrida[k]);
    return `<div class="corrida">
      <div class="coluna">
        <section class="painel largada">
          <div class="pos-grande"><span>Largada</span><b>P${meu}</b></div>
          <div class="largada-info">${condicaoChips('grid')}${mudou ? chip('✎ Acerto alterado', 'chip-amarelo') : ''}</div>
          ${leitura('grid')}
          <button class="principal grande" data-acao="largar">Largar!</button>
        </section>
        ${cartao('Acerto', editorSetup(), { ajuda: 'grid' })}
        ${cartaoMecanico()}
        ${cartao('Pneu', `${pneusVisuais(true)}${aviseGasto()}${dicaAmaciar()}<div class="botoes-2"><button class="compra" data-acao="comprar-pneu" data-tipo="slick"><b>+ Slick</b><span>${reais(C.precoPneu(estado, 'slick'))}</span></button><button class="compra" data-acao="comprar-pneu" data-tipo="chuva"><b>+ Chuva</b><span>${reais(C.precoPneu(estado, 'chuva'))}</span></button></div>`)}
        ${mudou ? '<div class="botoes-2"><button data-acao="desfazer-grid">↺ Acerto da classificação</button></div>' : ''}
      </div>
      ${cartao('Grid', `<div class="tabela-ajustada"><table><tr><th>Pos</th><th>Piloto</th><th class="num opc">Tempo</th><th class="num">Dif.</th></tr>
        ${fds.quali.map((q, i) => {
          const eqId = q.id === 'jogador' ? estado.equipeId : estado.rivais.find((r) => r.id === q.id).equipe;
          const eq = C.equipeBase(eqId);
          return `<tr class="${q.id === 'jogador' ? 'jogador' : ''}"><td>${i + 1}</td><td class="nome"><span class="cor" style="background:${eq.cor}"></span>${esc(C.nomeDe(estado, q.id))}</td>
            <td class="num opc">${tempoVolta(q.tempo)}</td><td class="num">${i ? '+' + (q.tempo - pole).toFixed(3) : ''}</td></tr>`;
        }).join('')}</table></div>`)}
    </div>`;
  }

  function htmlCorrida() {
    return `<div class="corrida">
      <section class="painel">
        <div class="controles-corrida">
          <span id="volta" class="volta-grande"></span><span id="clima-corrida"></span><span class="espaco"></span>
          <button data-acao="play" id="btn-play"></button>
        </div>
        ${linhaRecorde()}
        <div class="tabela-ajustada" id="tabela"></div>
      </section>
      <div class="coluna">
        ${cartao(Kart.categoria() === 'f4' ? 'Seu carro' : 'Seu kart', `<div id="info-jogador" class="tiles tiles-4"></div>${Kart.categoria() === 'f4' ? '<div id="box-f4"></div>' : ''}`)}
        ${cartao('Corrida', '<div class="eventos" id="eventos"></div>')}
      </div>
    </div>`;
  }

  const STATUS_FORA = { Acidente: 'Rodou', Quebra: 'Quebrou' };
  const statusFora = (motivo) => STATUS_FORA[motivo] || (motivo && motivo.startsWith('Motor') ? 'Motor' : 'Fora');

  function atualizarCorrida() {
    const ordem = corrida.carros.slice().sort((a, b) => a.pos - b.pos);
    const lider = ordem[0];
    document.getElementById('volta').innerHTML = corrida.volta === 0 ? 'GRID' : `VOLTA <b>${corrida.volta}<span>/${corrida.totalVoltas}</span></b>`;
    document.getElementById('clima-corrida').innerHTML = corrida.molhado ? chip('🌧 Molhado', 'chip-azul') : '';
    document.getElementById('btn-play').textContent = corrida.terminou ? 'Ver resultado' : tela.pausado ? '▶' : '❚❚';
    document.getElementById('btn-play').classList.toggle('principal', corrida.terminou);
    document.getElementById('tabela').innerHTML = `<div class="ao-vivo">${ordem.map((c) => {
      const ganho = c.largada - c.pos;
      let dir;
      if (c.fora) dir = `<span class="status-fora">${statusFora(c.motivoFora)}</span>`;
      else if (c === lider) dir = '<span class="fraco">Líder</span>';
      else dir = `+${(c.tempo - lider.tempo).toFixed(1)}`;
      return `<div class="vivo-linha ${c.jogador ? 'jogador' : ''} ${c.fora ? 'fora' : ''} ${estado.seguindo === c.id ? 'seguido' : ''}">
        <b class="vivo-pos">${c.pos}</b><i class="camp-cor" style="background:${c.equipe.cor}"></i>
        <b class="vivo-sigla">${sigla(c.piloto.nome)}</b>
        <span class="vivo-nome">${esc(c.piloto.nome)}</span>
        <span class="vivo-ganho ${ganho > 0 ? 'dinheiro' : 'negativo'}">${ganho > 0 ? '▲' + ganho : ganho < 0 ? '▼' + -ganho : ''}</span>
        <span class="vivo-dif">${dir}</span>
      </div>`;
    }).join('')}</div>`;
    document.getElementById('eventos').innerHTML = corrida.eventos.slice().reverse().slice(0, 60)
      .map((e) => `<div class="ev-${e.tipo} ${e.carroId === 'jogador' ? 'ev-jogador' : ''}"><span class="v">V${e.volta}</span>${esc(e.texto)}</div>`).join('');
    const eu = corrida.carros.find((c) => c.jogador);
    const ganhou = eu.largada - eu.pos;
    // F4: com chuva e pneu slick, o jogador pode chamar o carro para o box.
    const boxF4 = document.getElementById('box-f4');
    if (boxF4) {
      boxF4.innerHTML = eu.fora || corrida.terminou ? ''
        : eu.tipoPneu === 'chuva' ? chip('🛞 Pneu de chuva', 'chip-azul')
          : corrida.boxJogador ? '<button class="grande" disabled>📻 Box pedido: entra na próxima volta</button>'
            : `<button class="grande ${corrida.molhado ? 'principal' : ''}" data-acao="box-chuva" ${corrida.molhado ? '' : 'disabled'}>🛞 Box: pneu de chuva${corrida.molhado ? '' : ' (só com chuva)'}</button>`;
    }
    document.getElementById('info-jogador').innerHTML = eu.fora
      ? tile('Fora', statusFora(eu.motivoFora), 'negativo')
      : `${tile('Posição', `P${eu.pos}`)}${tile('Largou', `P${eu.largada}`)}${tile('Ganhou', ganhou > 0 ? `▲${ganhou}` : ganhou < 0 ? `▼${-ganhou}` : '—', ganhou > 0 ? 'dinheiro' : ganhou < 0 ? 'negativo' : '')}${tile('Pneu', `${100 - desgastePct(eu.uso)}%`)}`;
    avisosDaCorrida(eu);
  }

  // Avisos rápidos durante a bateria: mudança de posição, chuva e o rival seguido.
  function avisosDaCorrida(eu) {
    const memo = tela.memoCorrida || (tela.memoCorrida = { pos: eu.largada, molhado: false, rivalFora: false });
    if (corrida.volta === 0) return;
    if (corrida.molhado && !memo.molhado) aviso('🌧 Começou a chover!');
    else if (!eu.fora && eu.pos !== memo.pos) aviso(eu.pos < memo.pos ? `▲ Você subiu para P${eu.pos}` : `▼ Você caiu para P${eu.pos}`);
    const rival = estado.seguindo && corrida.carros.find((c) => c.id === estado.seguindo);
    if (rival && rival.fora && !memo.rivalFora) aviso(`★ ${sigla(rival.piloto.nome)} está fora: ${statusFora(rival.motivoFora).toLowerCase()}`);
    memo.pos = eu.pos;
    memo.molhado = !!corrida.molhado;
    memo.rivalFora = !!(rival && rival.fora);
  }

  function iniciarTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      Engine.passo(corrida);
      atualizarCorrida();
      if (corrida.terminou) { clearInterval(timer); timer = null; }
    }, MS_POR_VOLTA);
  }

  function finalizarCorrida() {
    if (!corrida.terminou) Engine.simularCompleta(corrida);
    C.concluirCorrida(estado, corrida);
    corrida = null;
    salvar();
    ir({ nome: 'fds' });
  }

  const sinal = (n) => (n > 0 ? `+${n}` : `${n}`);

  function telaResultadoCorrida() {
    const fds = estado.fds;
    const r = fds.resultado;
    const medalha = r.fora ? '✕' : r.pos === 1 ? '🥇' : r.pos === 2 ? '🥈' : r.pos === 3 ? '🥉' : '';
    return `<div class="corrida">
      <div class="coluna">
        <section class="painel resultado-hero ${r.fora ? 'ruim' : r.pos <= 3 ? 'bom' : ''}">
          <div class="pos-grande"><span>${r.fora ? esc(r.motivo) : 'Chegada'}</span><b>${medalha} ${r.fora ? 'Abandono' : 'P' + r.pos}</b></div>
          <div class="tiles">${tile('Pontos', r.pontos)}${tile('Campeonato', 'P' + C.posicaoNoCampeonato(estado))}${tile('Caixa', '+' + reais(r.ganho), 'dinheiro')}</div>
          ${r.recorde ? chip('🏆 Novo recorde da pista na corrida!', 'chip-recorde') : ''}
          ${r.eventos.map((e) => chip(`⚠ ${esc(e)}`, 'chip-amarelo')).join('')}
          ${(r.cabeca || []).length ? `<div class="chips">${r.cabeca.map((x) => [
            x.confianca ? chip(`🔥 ${sinal(x.confianca)}`, x.confianca > 0 ? 'chip-dinheiro' : 'chip-negativo') : '',
            x.moral ? chip(`😊 ${sinal(x.moral)}`, x.moral > 0 ? 'chip-dinheiro' : 'chip-negativo') : '',
          ].join('')).join('')}</div>` : ''}
          ${r.olheiros.length ? `<div class="chips">${r.olheiros.map((o) => chip(`👀 ${esc(o)}`)).join('')}</div>` : ''}
          <button class="principal grande" data-acao="voltar-paddock">Voltar ao paddock</button>
        </section>
        ${r.diagnostico ? cartaoDiagnostico(r) : ''}
      </div>
      ${cartao('Resultado', `<div class="tabela-ajustada"><table><tr><th>Pos</th><th>Piloto</th><th class="num">Dif.</th><th class="num">Pts</th></tr>
        ${fds.classificacao.map((x) => `<tr class="${x.id === 'jogador' ? 'jogador' : ''} ${x.fora ? 'fora' : ''}">
          <td>${x.fora ? 'NC' : x.pos}</td><td class="nome"><span class="cor" style="background:${C.equipeBase(x.equipe).cor}"></span>${esc(C.nomeDe(estado, x.id))}</td>
          <td class="num">${x.fora ? 'Fora' : x.pos === 1 ? '🏁' : '+' + x.dif.toFixed(1)}</td><td class="num"><b>${x.pontos || ''}</b></td></tr>`).join('')}
        </table></div>`)}
    </div>`;
  }

  // Conversa depois da corrida: o que o piloto sentiu, o que mudar nessas condições e o botão de anotar.
  function cartaoDiagnostico(r) {
    const d = r.diagnostico;
    const ajustes = d.ajustes.length || d.pneu || d.motor
      ? `<ul class="diagnostico">${d.motor ? `<li class="negativo">${esc(d.motor)}</li>` : ''}${d.pneu ? `<li>${esc(d.pneu)}</li>` : ''}${d.ajustes.map((a) => `<li>${esc(a.texto)}</li>`).join('')}</ul>`
      : '<p class="fraco">Nada a mudar: o acerto estava no ponto.</p>';
    const anotar = r.anotado
      ? '<button class="grande" disabled>✓ Anotado no caderno</button>'
      : `<textarea id="nota-corrida" rows="2" maxlength="300" placeholder="Sua anotação (opcional)"></textarea>
         <button class="principal grande" data-acao="anotar">📝 Anotar no caderno</button>`;
    return cartao('Diagnóstico', `<div class="chips">${chip(d.molhado ? '🌧 Molhado' : '☀️ Seco', d.molhado ? 'chip-azul' : '')}${chip(`🌡 Ar ${d.tempAr}°`)}${chip(`Asfalto ${d.tempPista}°`)}${d.choveuNaCorrida ? chip('Choveu na corrida', 'chip-amarelo') : ''}</div>
      ${d.sentiu.map((f) => `<div class="bolha piloto"><span aria-hidden="true">🧑</span><p>${esc(f)}</p></div>`).join('')}
      <span class="subtitulo">Nessas condições, o kart pedia</span>
      ${ajustes}
      ${anotar}`, { ajuda: 'diagnostico' });
  }

  // ---------- fim de temporada ----------
  // Mercado de fim de ano: escolher a equipe do próximo ano entre as que aceitam o piloto.
  function escolhaEquipeAno(campId) {
    const r = estado.relatorio;
    const lista = r.equipes || [estado.equipeId];
    const escolhida = tela.proximaEquipe || estado.equipeId;
    const custoCamp = C.campeonato(campId).custo;
    const recusadas = Dados.EQUIPES.length - lista.length;
    return `<span class="subtitulo">Equipe para ${estado.ano}</span>
      <div class="equipes-ano">${lista.map((id) => {
        const e = C.equipeBase(id);
        const custo = Math.round(e.custoEtapa * custoCamp / 100) * 100;
        return `<button class="equipe-ano ${escolhida === id ? 'ativo' : ''}" data-acao="escolher-equipe-ano" data-id="${id}" aria-pressed="${escolhida === id}" style="--cor-equipe:${e.cor}">
          <i class="camp-cor" style="background:${e.cor}"></i>
          <span class="equipe-ano-nome"><b>${esc(e.nome)}</b><small>${C.PORTES[C.porteDe(id)].nome} · Kart ${e.material}${id === estado.equipeId ? ' · atual' : ''}</small></span>
          <b class="negativo">−${reais(custo)}<small>/etapa</small></b>
        </button>`;
      }).join('')}</div>
      ${recusadas ? `<p class="fraco mini">${recusadas} ${recusadas === 1 ? 'equipe não quis' : 'equipes não quiseram'} você este ano. Resultado e popularidade abrem mais portas.</p>` : ''}`;
  }

  function telaRelatorio() {
    const r = estado.relatorio;
    const camp = C.campeonato(r.campeonato);
    const escolha = tela.proximo || r.opcoes[r.opcoes.length - 1];
    const ganhos = r.premios.reduce((t, p) => t + p.valor, 0) + r.bonus.filter((b) => b.cumpriu).reduce((t, b) => t + b.valor, 0);
    app.innerHTML = `
      <div class="linha cabecalho-tela"><h1>Temporada ${r.ano}</h1>${chip(esc(camp.curto))}</div>
      ${r.f4Espera ? cartao('F4 garantida', `<p><b>${esc(r.f4Espera.nome)}</b> quer você na Fórmula 4, mas a FIA só permite a partir dos ${r.f4Espera.idade} anos. A vaga fica guardada: continue no kart e a proposta chega no fim da temporada em que você tiver ${r.f4Espera.idade}.</p>`, { classe: 'destaque' }) : ''}
      ${estado.propostas.length ? cartao(estado.propostas.some((p) => p.tipo === 'f3') ? 'Proposta para a F3' : 'Propostas para a F4', estado.propostas.map((p) => `<div class="item">
          <div class="item-topo"><b>${esc(p.nome)}</b></div><p class="fraco">${esc(p.texto)}</p>
          <button class="principal grande" data-acao="aceitar-proposta" data-id="${p.id}">Assinar e subir para a ${p.tipo === 'f3' ? 'F3' : 'F4'}</button></div>`).join(''), { classe: 'destaque' }) : ''}
      <div class="grade">
        <section class="painel resultado-hero ${r.pos <= 3 ? 'bom' : ''}">
          <div class="pos-grande"><span>Campeonato</span><b>${r.pos <= 3 ? ['🥇', '🥈', '🥉'][r.pos - 1] : ''} P${r.pos}</b></div>
          <div class="tiles">${tile('Pontos', r.pontos)}${tile('Campeão', esc(r.campeao.split(' ')[0]))}${tile('Ganhos', '+' + reais(ganhos), 'dinheiro')}</div>
        </section>
        ${cartao('Evolução', r.evolucao.length
          ? r.evolucao.map((x) => `<div class="barra"><span>${C.NOMES_ATRIBUTOS[x.a]}</span><span class="trilho"><i style="width:${x.depois}%"></i></span><b>${x.depois} <span class="dinheiro mini">${sinal(x.depois - x.antes)}</span></b></div>`).join('')
          : '<p class="vazio">Sem evolução este ano.</p>')}
        ${cartao('Dinheiro', `
          ${r.premios.map((p) => `<div class="item-topo"><span>🏆 ${esc(p.texto)}</span><b class="dinheiro">+${reais(p.valor)}</b></div>`).join('')}
          ${r.bonus.map((b) => `<div class="item-topo"><span>${b.cumpriu ? '✅' : '❌'} ${esc(b.empresa)}</span><b class="${b.cumpriu ? 'dinheiro' : 'fraco'}">${b.cumpriu ? '+' + reais(b.valor) : '—'}</b></div>`).join('')}
          ${tile('Caixa', reais(estado.dinheiro))}`)}
        ${cartao('Próximo ano', `<div class="escolhas">${r.opcoes.map((id) => {
            const c = C.campeonato(id);
            return `<button class="escolha ${escolha === id ? 'ativo' : ''}" data-acao="escolher-proximo" data-id="${id}" aria-pressed="${escolha === id}">
              <b>${esc(c.curto)}</b><span class="chips">${chip(id === r.campeonato ? '↺ Repetir' : '⬆ Subir', id === r.campeonato ? '' : 'chip-dinheiro')}${chip(`💸 ×${c.custo}`)}${c.regiao === 'eu' ? chip('🇪🇺') : ''}</span></button>`;
          }).join('')}</div>
          ${escolhaEquipeAno(escolha)}
          <button class="principal grande" data-acao="nova-temporada">Começar ${estado.ano}</button>`, { ajuda: 'temporada' })}
      </div>`;
  }

  function telaF4() {
    const f = estado.final;
    const vitorias = estado.historico.filter((h) => !h.fora && h.pos === 1).length;
    app.innerHTML = `<section class="painel destaque tela-nome">
      <span class="capacete" aria-hidden="true">🏆</span>
      <h1>Rumo à Fórmula ${f.categoria === 'f3' ? '3' : '4'}!</h1>
      <p><b>${esc(estado.piloto.nome)}</b> assinou com <b>${esc(f.proposta.nome)}</b> aos ${f.idade} anos.</p>
      <div class="tiles">${tile('Corridas', estado.historico.length)}${tile('Vitórias', vitorias)}${tile('Caixa', reais(estado.dinheiro), 'dinheiro')}</div>
      <p class="fraco">Próximo capítulo: ${f.categoria === 'f3' ? 'F3, F2 e a Superlicença' : 'F4, F3, F2 e a Superlicença'}.</p>
      <button class="grande" data-acao="abandonar">Nova carreira</button>
    </section>`;
  }

  function telaFalencia() {
    app.innerHTML = `<section class="painel tela-nome">
      <span class="capacete" aria-hidden="true">🪫</span>
      <h1>Fim da linha</h1>
      <p>Sem dinheiro para mais uma temporada, ${esc(estado.piloto.nome)} pendura o capacete aos ${estado.piloto.idade} anos.</p>
      <div class="tiles">${tile('Corridas', estado.historico.length)}${tile('Vitórias', estado.historico.filter((h) => !h.fora && h.pos === 1).length)}</div>
      <button class="principal grande" data-acao="abandonar">Nova carreira</button>
    </section>`;
  }

  // ---------- ações ----------
  app.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('button[data-acao]');
    if (!alvo || alvo.disabled) return;
    const { acao, id } = alvo.dataset;
    if (alvo.dataset.confirmar && alvo.dataset.armado !== '1') {
      alvo.dataset.armado = '1';
      alvo.textContent = alvo.dataset.confirmar;
      alvo.classList.add('principal');
      return;
    }

    switch (acao) {
      case 'seguir':
        C.seguir(estado, id);
        salvar();
        render();
        break;
      case 'ficha-pista':
        abrirFichaPista();
        break;
      case 'ver-pista':
        ir({ nome: 'pista', aba: 'pista' });
        break;
      case 'aba-pista':
        tela.aba = alvo.dataset.aba;
        render();
        break;
      case 'voltar-paddock-pista':
        ir({ nome: 'paddock', aba: 'resumo' });
        break;
      case 'ajuda':
        abrirAjuda(alvo.dataset.chave);
        break;
      case 'escolher-pneu':
        C.escolherPneu(estado, id);
        salvar();
        render();
        break;
      case 'escolher-proximo':
        tela.proximo = id;
        render();
        break;
      case 'entrar': {
        const nome = document.getElementById('nome-piloto').value.trim();
        if (!nome) { aviso('Escreva o nome do piloto.'); break; }
        const seed = Date.now() % 1e9;
        C.usarNomesEquipes(C.sortearNomesEquipes(seed));
        ir({ nome: 'carregando', nomePiloto: nome, seed, opcoes: C.equipesIniciais(seed) });
        break;
      }
      case 'iniciar':
        ir({ nome: 'inicio' });
        break;
      case 'voltar-abertura':
        ir({ nome: 'abertura' });
        break;
      case 'selecionar-equipe':
        tela.escolhida = id;
        render();
        break;
      case 'trocar-nome':
        ir({ nome: 'inicio', nomePiloto: tela.nomePiloto });
        break;
      case 'escolher-equipe':
        if (!id) break;
        estado = C.novoJogo({ nome: tela.nomePiloto, equipeId: id, seed: tela.seed });
        salvar();
        ir(telaDaFase());
        break;
      case 'continuar':
        estado = C.migrar(carregar());
        if (estado.fds && estado.fds.sessao === 'corrida') estado.fds.sessao = 'grid';
        ir(telaDaFase());
        break;
      case 'abandonar':
        apagarSave();
        estado = null;
        corrida = null;
        ir({ nome: 'abertura' });
        break;
      case 'aba':
        tela.aba = alvo.dataset.aba;
        render();
        break;
      case 'psicologo':
        if (erro(C.sessaoPsicologo(estado))) { salvar(); render(); aviso('Boa conversa. O piloto saiu mais leve.'); }
        break;
      case 'retificar': {
        const tipo = alvo.dataset.tipo;
        if (erro(C.retificarMotor(estado, tipo))) { salvar(); render(); aviso(tipo === 'normal' ? 'Motor na retífica: o piloto fica fora desta etapa.' : 'Motor retificado. Pronto para correr!'); }
        break;
      }
      case 'revisar':
        if (erro(C.revisarMotor(estado))) { salvar(); render(); aviso('Motor revisado.'); }
        break;
      case 'comprar-pneu':
        if (erro(C.comprarPneu(estado, alvo.dataset.tipo))) { salvar(); render(); }
        break;
      case 'descartar-pneu':
        C.descartarPneu(estado, id);
        tela.pneuOpcoes = null;
        salvar();
        render();
        break;
      case 'pneu-opcoes':
        tela.pneuOpcoes = id;
        render();
        break;
      case 'fechar-pneu':
        tela.pneuOpcoes = null;
        render();
        break;
      case 'vender-pneu': {
        const r = C.venderPneu(estado, id);
        if (erro(r)) { tela.pneuOpcoes = null; salvar(); render(); aviso(`Pneu vendido: +${reais(r.valor)}`); }
        break;
      }
      case 'doar-pneu':
        if (erro(C.doarPneu(estado, id))) { tela.pneuOpcoes = null; salvar(); render(); aviso('Pneus doados para a escolinha. A moral subiu!'); }
        break;
      case 'amaciar-pneu':
        if (erro(C.amaciarPneu(estado))) { salvar(); render(); aviso('Pneu amaciado: pronto para render o máximo.'); }
        break;
      case 'aceitar-patrocinio':
        if (erro(C.aceitarPatrocinio(estado, id))) { salvar(); render(); }
        break;
      case 'recusar-patrocinio':
        C.recusarPatrocinio(estado, id);
        salvar();
        render();
        break;
      case 'aceitar-proposta': {
        const r = C.aceitarProposta(estado, id);
        if (erro(r)) { salvar(); ir(telaDaFase()); if (r.f4) aviso('Bem-vindo à Fórmula 4! O carro é outro: asas, suspensão e box.'); }
        break;
      }
      case 'box-chuva':
        if (corrida && !corrida.terminou) { corrida.boxJogador = true; atualizarCorrida(); }
        break;
      case 'recusar-proposta':
        C.recusarProposta(estado, id);
        salvar();
        render();
        break;
      case 'ir-fds':
        if (C.pendenciasEtapa(estado).length) { tela.checagem = true; render(); break; }
      // sem pendências: segue direto
      // falls through
      case 'ir-fds-confirmado':
        if (erro(C.iniciarFimDeSemana(estado))) { salvar(); ir({ nome: 'fds' }); }
        break;
      case 'fechar-checagem':
        tela.checagem = false;
        render();
        break;
      case 'pular-etapa':
        C.pularEtapa(estado);
        salvar();
        ir(telaDaFase());
        break;
      case 'ajuste': {
        const k = alvo.dataset.k;
        const a = Kart.AJUSTES[k];
        const atual = estado.fds.setup[k];
        const novo = alvo.dataset.valor != null ? +alvo.dataset.valor : atual + (+alvo.dataset.delta) * a.passo;
        C.definirSetup(estado, { [k]: novo });
        salvar();
        render();
        break;
      }
      case 'contratar-mecanico':
        if (erro(C.contratarMecanico(estado, alvo.dataset.tipo))) { salvar(); render(); aviso(`${C.MECANICOS[alvo.dataset.tipo].nome} contratado para o fim de semana.`); }
        break;
      case 'hora-extra':
        if (erro(C.pagarHoraExtra(estado))) { salvar(); render(); aviso('O mecânico fica nesta sessão.'); }
        break;
      case 'sugestao': {
        const r = C.pedirSugestao(estado);
        if (erro(r)) { salvar(); render(); aviso(r.faz === 'monta' ? 'O técnico montou o kart.' : 'O mecânico deu a opinião dele.'); }
        break;
      }
      case 'saida': {
        const r = C.saidaTreino(estado);
        if (!erro(r)) break;
        salvar();
        const voltas = Array.from({ length: C.VOLTAS_POR_SAIDA }, (_, i) => `Volta ${i + 1}/${C.VOLTAS_POR_SAIDA}`);
        animarPista(`Treino livre · saída ${estado.fds.saidas.length}`, voltas, 'O piloto está sentindo o kart…', () => {
          render();
          if (r.saida.recorde) aviso('🏆 Novo recorde da pista!');
          // Leva o jogador até o rádio, onde aparecem o tempo e o que o piloto sentiu.
          const nova = app.querySelector('.saida');
          if (nova) nova.scrollIntoView({ behavior: menosMovimento() ? 'auto' : 'smooth', block: 'center' });
        });
        break;
      }
      case 'ir-quali':
        C.irParaClassificacao(estado);
        salvar();
        tela.mudancas = houveMudanca('quali') ? 'quali' : null;
        render();
        break;
      case 'fechar-mudancas':
        tela.mudancas = null;
        render();
        break;
      case 'fechar-largada':
        tela.largada = false;
        tela.mudancas = houveMudanca('grid') ? 'grid' : null;
        render();
        break;
      case 'classificar':
        if (!erro(C.classificar(estado))) break;
        salvar();
        animarPista('Classificação', ['Volta de saída', 'Volta lançada', 'Volta lançada', 'Volta de desaceleração'], 'Cronômetro ligado…', () => {
          tela.largada = true;
          render();
          if (estado.fds.recordeQuali) aviso('🏆 Novo recorde da pista!');
        });
        break;
      case 'desfazer-grid':
        estado.fds.setup = { ...(estado.fds.setupQuali || estado.fds.setupCorrida) };
        estado.fds.pneuId = estado.fds.pneuCorrida;
        salvar();
        render();
        break;
      case 'largar':
        corrida = C.criarCorrida(estado);
        estado.fds.sessao = 'corrida';
        ir({ nome: 'fds', pausado: false });
        break;
      case 'play':
        if (corrida.terminou) return finalizarCorrida();
        tela.pausado = !tela.pausado;
        if (tela.pausado) { clearInterval(timer); timer = null; } else iniciarTimer();
        atualizarCorrida();
        break;
      case 'anotar': {
        const campo = document.getElementById('nota-corrida');
        if (erro(C.anotarCorrida(estado, campo ? campo.value : ''))) { salvar(); render(); aviso('Anotado no caderno.'); }
        break;
      }
      case 'voltar-paddock':
        C.concluirEtapa(estado);
        salvar();
        ir(telaDaFase());
        break;
      case 'escolher-equipe-ano':
        tela.proximaEquipe = id;
        render();
        break;
      case 'nova-temporada':
        if (erro(C.proximaTemporada(estado, tela.proximo || estado.relatorio.opcoes[estado.relatorio.opcoes.length - 1], tela.proximaEquipe || estado.equipeId))) { salvar(); ir(telaDaFase()); }
        break;
    }
  });

  app.addEventListener('click', (ev) => {
    if (ev.target.dataset && ev.target.dataset.acaoFundo === 'fechar-checagem') { tela.checagem = false; render(); }
    if (ev.target.dataset && ev.target.dataset.acaoFundo === 'fechar-pneu') { tela.pneuOpcoes = null; render(); }
    if (ev.target.dataset && ev.target.dataset.acaoFundo === 'fechar-mudancas') { tela.mudancas = null; render(); }
    if (ev.target.dataset && ev.target.dataset.acaoFundo === 'fechar-largada') app.querySelector('.folha-largada [data-acao="fechar-largada"]').click();
  });

  // Enter no campo do nome entra no paddock.
  // Tela do nome: a licença e o botão acompanham o que é digitado (sem redesenhar a tela, para não perder o foco).
  app.addEventListener('input', (ev) => {
    if (ev.target.id !== 'nome-piloto') return;
    const nome = ev.target.value;
    tela.nomePiloto = nome;
    const vazio = !nome.trim();
    app.querySelector('.licenca').classList.toggle('vazia', vazio);
    app.querySelector('[data-licenca-nome]').textContent = vazio ? 'Seu nome aqui' : nome.trim();
    app.querySelector('[data-licenca-iniciais]').textContent = vazio ? '?' : iniciaisDe(nome);
    app.querySelector('[data-acao="entrar"]').disabled = vazio;
  });

  app.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.id === 'nome-piloto') app.querySelector('[data-acao="entrar"]').click();
  });

  app.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.dataset.acao === 'pneu') {
      C.escolherPneu(estado, el.dataset.id);
      salvar();
      if (estado.fds.sessao === 'grid') render();
    } else if (el.dataset.acao === 'proximo') {
      tela.proximo = el.dataset.id;
    }
  });

  render();
})();
