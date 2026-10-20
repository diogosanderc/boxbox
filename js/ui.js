// Interface do jogo no navegador.
(function () {
  'use strict';

  const Dados = window.BoxDados;
  const Engine = window.BoxEngine;
  const Kart = window.BoxKart;
  const C = window.BoxCarreira;
  const CHAVE_SAVE = 'boxbox-piloto-v1';
  const VELOCIDADES = [{ nome: '1×', ms: 900 }, { nome: '2×', ms: 400 }, { nome: '5×', ms: 140 }];

  const app = document.getElementById('app');
  const statusEl = document.getElementById('status');

  let estado = null;
  let tela = { nome: 'inicio' };
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
    tela = nova;
    render();
    window.scrollTo(0, 0);
  }

  function telaDaFase() {
    if (!estado) return { nome: 'inicio' };
    return { nome: estado.fase, aba: 'resumo' };
  }

  // ---------- ajuda: as explicações ficam atrás de um "?" ----------
  const AJUDAS = {
    jogo: ['Como jogar', 'Você é um piloto de kart de 12 anos e também o cabeça da carreira. Escolha a equipe, cuide do dinheiro, acerte o kart em cada pista e decida quais propostas aceitar. Meta: chegar à Fórmula 4.'],
    equipe: ['Escolhendo a equipe', 'Kart e motor dizem quão rápido é o material. O mecânico ajuda no acerto. A sobra é o que fica do caixa depois de pagar as 8 etapas: é com ela que você compra pneus e revisa o motor. As outras equipes podem te chamar depois, se você andar bem.'],
    etapa: ['Fim de semana', 'De manhã tem treino livre; à tarde, classificação e corrida. A tarde costuma ser mais quente, e o acerto que funcionou de manhã pode não servir.'],
    clima: ['Previsão do tempo', 'A chance de chuva é só previsão e pode errar. No kart não tem pit stop: o pneu que você escolher vai até a bandeirada.'],
    cabeca: ['Moral e confiança', 'Confiança é a cabeça na pista: alta dá ritmo e regularidade, baixa faz errar. Moral é a motivação: alta faz o piloto evoluir mais rápido e explicar melhor o que sente no kart. O psicólogo ajuda uma vez por etapa.'],
    oficina: ['Oficina', `O motor perde força depois de ${C.HORAS_REVISAO} etapas sem revisão. Pneu de kart dura pouco: um jogo novo aguenta mais ou menos uma bateria e meia. Treine com pneu velho e guarde o novo para a classificação.`],
    patrocinio: ['Patrocínio', 'Cada empresa paga por etapa e dá um bônus no fim do ano se a meta for cumprida. Vitórias e pódios aumentam a popularidade e atraem empresas maiores.'],
    olheiros: ['Olheiros e propostas', 'Andar bem com olheiros assistindo traz propostas. Piloto de fábrica não paga nada, mas pode receber ordem para deixar o companheiro passar. Desconfie de equipe que promete demais.'],
    setup: ['Acerto do kart', 'Pressão: como o pneu esquenta. Eixo: aderência da traseira. Bitola: como o kart entra na curva. Relação: força na saída × velocidade na reta. Carburação: mistura do motor (pobre demais pode travar). O acerto ideal muda com a pista, o calor e a chuva, e ninguém te conta qual é.'],
    radio: ['Rádio', 'Depois de cada saída, o piloto conta o que sentiu e o mecânico dá um palpite. Pilotos experientes e motivados descrevem melhor o problema.'],
    quali: ['Classificação', 'A volta lançada define o grid. O acerto e o pneu daqui continuam na corrida, mas ainda dá para mexer no grid.'],
    grid: ['Antes da largada', 'Última chance de mexer no kart e trocar o pneu. Na corrida o asfalto tem mais borracha que na classificação.'],
    pilotagem: ['Pilotagem', 'Atacar ganha tempo, mas gasta pneu e aumenta o risco de rodar. Poupar segura o pneu para o fim.'],
    temporada: ['Próximo ano', 'Terminar no top 3 ou ter muita popularidade abre o campeonato seguinte. Cada degrau custa mais e tem rivais mais fortes. No começo do ano a família ajuda com um dinheiro.'],
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

  // ---------- peças visuais ----------
  function cartao(icone, titulo, corpo, { ajuda, classe = '', extra = '' } = {}) {
    return `<section class="painel ${classe}">
      <header class="cartao-topo"><h2 class="cartao-titulo">${titulo}</h2>${extra}<span class="espaco"></span>${ajuda ? botaoAjuda(ajuda) : ''}</header>
      ${corpo}
    </section>`;
  }

  const tile = (rotulo, valor, classe = '') => `<div class="tile"><span>${rotulo}</span><b class="${classe}">${valor}</b></div>`;
  const chip = (conteudo, classe = '') => `<span class="chip ${classe}">${conteudo}</span>`;
  const nivelClasse = (v) => (v < 30 ? 'negativo' : v < 45 ? 'aviso' : 'dinheiro');

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

  function condicaoChips(sessao) {
    const clima = C.climaAtual(estado);
    const molhado = sessao === 'treino' ? clima.manha.chove : clima.tarde.inicioChuva === 'quali';
    const c = Kart.condicao(clima, sessao === 'treino' ? 'treino' : 'quali', molhado);
    return `<div class="chips">${chip(molhado ? '🌧 Molhado' : '☀️ Seco', molhado ? 'chip-azul' : '')}${chip(`🌡 Ar ${c.tempAr}°`)}${chip(`Asfalto ${c.tempPista}°`)}
      ${sessao !== 'treino' && !molhado ? chip(`💧 Corrida ${clima.tarde.chance}%`) : ''}</div>`;
  }

  const desgastePct = (uso) => Math.min(100, Math.round((uso / 26) * 100));

  // Jogos de pneus como cartões; no fim de semana dá para escolher tocando no cartão.
  function pneusVisuais(selecionavel) {
    if (!estado.pneus.length) return '<p class="aviso">Nenhum jogo de pneus!</p>';
    return `<div class="pneus">${estado.pneus.map((p, i) => {
      const pct = desgastePct(p.uso);
      const classe = pct >= 100 ? 'negativo' : pct >= 60 ? 'aviso' : 'dinheiro';
      const ativo = selecionavel && estado.fds.pneuId === p.id;
      const conteudo = `<span class="pneu-roda ${p.tipo}" aria-hidden="true"></span>
        <span class="pneu-nome">${Kart.PNEUS_KART[p.tipo].nome} <span class="fraco">#${i + 1}</span></span>
        <span class="pneu-trilho"><i class="${classe}-fundo" style="width:${Math.max(4, 100 - pct)}%"></i></span>
        <span class="pneu-estado ${classe}">${pct === 0 ? 'novo' : pct >= 100 ? 'acabado' : `${100 - pct}%`}</span>`;
      return selecionavel
        ? `<button class="pneu-card ${ativo ? 'ativo' : ''}" data-acao="escolher-pneu" data-id="${p.id}" aria-pressed="${ativo}">${conteudo}</button>`
        : `<div class="pneu-card">${conteudo}<button class="pneu-x" data-acao="descartar-pneu" data-id="${p.id}" data-confirmar="Descartar?" aria-label="Descartar jogo ${i + 1}">×</button></div>`;
    }).join('')}</div>`;
  }

  // ---------- topo ----------
  function atualizarStatus() {
    if (!estado) { statusEl.innerHTML = ''; return; }
    const p = estado.piloto;
    statusEl.innerHTML = `<span class="chips">${chip(`💰 ${reais(estado.dinheiro)}`, estado.dinheiro < C.custoEtapa(estado) ? 'chip-vermelho' : '')}
      ${chip(`😊 ${p.moral}`, 'chip-' + nivelClasse(p.moral))}${chip(`🔥 ${p.confianca}`, 'chip-' + nivelClasse(p.confianca))}</span>`;
  }

  function render() {
    atualizarStatus();
    const telas = { inicio: telaInicio, equipe: telaEquipe, paddock: telaPaddock, pista: telaPista, fds: telaFimDeSemana, relatorio: telaRelatorio, f4: telaF4, falencia: telaFalencia };
    telas[tela.nome]();
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
  };
  const icone = (nome, classe = '') => `<svg class="ico ${classe}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;

  function navInferior(atual) {
    const itens = [['resumo', 'etapa', 'Etapa'], ['campeonato', 'campeonato', 'Tabela'], ['piloto', 'piloto', 'Piloto'], ['caderno', 'caderno', 'Caderno'], ['noticias', 'noticias', 'Notícias']];
    return `<div class="nav-espaco" aria-hidden="true"></div><nav class="nav-inferior" aria-label="Paddock">${itens.map(([id, ic, nome]) => `<button data-acao="aba" data-aba="${id}" class="${atual === id ? 'ativo' : ''}" aria-current="${atual === id ? 'page' : 'false'}">${icone(ic)}<span>${nome}</span></button>`).join('')}</nav>`;
  }

  // Desenho estilizado de cada kartódromo: uma curva fechada gerada pela semente do nome.
  function tracado(pista, classe = '') {
    let h = 7;
    for (const ch of pista.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = Engine.criarRng(h);
    const n = { travada: 15, mista: 12, veloz: 9 }[pista.tipo];
    const pts = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
      const dobra = rnd() < (pista.tipo === 'veloz' ? 0.2 : 0.38) ? 0.48 + rnd() * 0.17 : 1; // curvas que entram para dentro
      const r = (0.62 + rnd() * 0.38) * dobra;
      pts.push([Math.cos(ang) * r * 1.4, Math.sin(ang) * r * 0.8]);
    }
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const esc2 = Math.min(260 / (x1 - x0), 140 / (y1 - y0));
    const P = pts.map(([x, y]) => [20 + (x - x0) * esc2 + (260 - (x1 - x0) * esc2) / 2, 20 + (y - y0) * esc2 + (140 - (y1 - y0) * esc2) / 2]);
    // Catmull-Rom fechado -> curvas de Bézier
    let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const [a, b, c, e] = [P[(i - 1 + n) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]];
      // Tensão baixa: curvas mais fechadas e trechos mais retos, como um traçado de verdade.
      const c1 = [b[0] + (c[0] - a[0]) / 10, b[1] + (c[1] - a[1]) / 10];
      const c2 = [c[0] - (e[0] - b[0]) / 10, c[1] - (e[1] - b[1]) / 10];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
    }
    const id = `brilho-${pista.id}-${classe || 'x'}`;
    return `<svg class="tracado ${classe}" viewBox="0 0 300 180" role="img" aria-label="Traçado de ${esc(pista.nome)}">
      <defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <path d="${d} Z" fill="none" stroke="var(--destaque-vivo)" stroke-width="6" stroke-linejoin="round" filter="url(#${id})"/>
      <circle cx="${P[0][0].toFixed(1)}" cy="${P[0][1].toFixed(1)}" r="5" fill="#fff"/>
    </svg>`;
  }

  // ---------- início ----------
  function telaInicio() {
    const save = carregar();
    app.innerHTML = `
      <div class="painel tela-nome">
        <div class="linha"><span class="capacete" aria-hidden="true">🏎️</span><span class="espaco"></span>${botaoAjuda('jogo')}</div>
        <h1>Do kart à Fórmula 1</h1>
        <div class="campo"><label for="nome-piloto">Nome do piloto</label>
          <input type="text" id="nome-piloto" value="${esc(tela.nomePiloto || '')}" placeholder="Seu nome" maxlength="30" autocomplete="off"></div>
        <button class="principal grande" data-acao="entrar">Entrar no paddock</button>
        ${save ? `<button class="grande" data-acao="continuar">Continuar: ${esc(save.piloto.nome)} · ${save.ano}</button>` : ''}
      </div>`;
    if (!save) document.getElementById('nome-piloto').focus();
  }

  // Cores claras (como amarelo) pedem texto escuro por cima.
  function corClara(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b > 160;
  }

  const kmil = (x) => `${(x / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;

  function telaEquipe() {
    app.innerHTML = `
      <div class="linha cabecalho-tela"><button data-acao="trocar-nome" aria-label="Trocar nome">←</button><h1>Escolha sua equipe</h1><span class="espaco"></span>${botaoAjuda('equipe')}</div>
      <div class="equipes-iniciais">
        ${tela.opcoes.map((id) => {
          const e = C.equipeBase(id);
          const porte = C.porteDe(id);
          const sobra = e.caixa - e.custoEtapa * C.ETAPAS;
          return `<article class="equipe-card ${corClara(e.cor) ? 'topo-claro' : ''}" style="--cor-equipe:${e.cor}">
            <header class="equipe-topo"><span class="etiqueta">${C.PORTES[porte].nome}</span><h2>${esc(e.nome)}</h2></header>
            <div class="equipe-corpo">
              <p class="fraco">${esc(e.descricao)}</p>
              <div>${barra('Kart', e.material)}${barra('Mecânico', e.mecanico)}</div>
              <div class="tiles">${tile('Caixa R$', kmil(e.caixa))}${tile('Etapa R$', kmil(e.custoEtapa))}${tile('Sobra R$', kmil(sobra), sobra < 10000 ? 'aviso' : 'dinheiro')}</div>
              <button class="principal grande" data-acao="escolher-equipe" data-id="${id}">Correr aqui</button>
            </div>
          </article>`;
        }).join('')}
      </div>`;
  }

  // ---------- paddock ----------
  const iniciais = (nome) => nome.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

  // Os quatro primeiros do campeonato e você, como avatares redondos.
  function avatares() {
    const tabela = C.classificacaoCampeonato(estado);
    const eu = tabela.findIndex((x) => x.id === 'jogador');
    const ids = tabela.slice(0, 4).map((x, i) => i);
    if (eu >= 4) ids.push(eu); else ids.push(4);
    return `<div class="avatares">${ids.map((i) => {
      const x = tabela[i];
      const eq = C.equipeBase(x.equipe);
      const jogador = x.id === 'jogador';
      return `<div class="avatar ${jogador ? 'eu' : ''}"><span class="avatar-circulo" style="--cor-equipe:${eq.cor}">${esc(iniciais(x.nome))}</span>
        <span class="avatar-nome">${jogador ? 'Você' : esc(x.nome.split(' ')[0])}</span><span class="avatar-pos">P${i + 1}</span></div>`;
    }).join('')}</div>`;
  }

  function cartaoProximaEtapa() {
    const pista = C.pistaAtual(estado);
    const clima = C.climaAtual(estado);
    const custo = C.custoEtapa(estado);
    const semDinheiro = estado.dinheiro < custo;
    return `<section class="hero">
      <button class="hero-visual" data-acao="ver-pista" aria-label="Ver a pista ${esc(pista.nome)}">
        ${tracado(pista, 'hero-tracado')}
        <span class="pill">● Etapa ${estado.etapa + 1}/${C.ETAPAS}</span>
        <span class="hero-titulo"><b>${esc(pista.nome)}</b><span>${icone('local', 'ico-p')} ${esc(pista.local)}</span></span>
      </button>
      <div class="hero-rodape">
        <div class="climas">${climaBloco('Manhã', clima.manha)}${climaBloco('Tarde', clima.tarde)}</div>
        <div class="hero-acao">
          ${semDinheiro
            ? `<button class="grande" data-acao="pular-etapa" data-confirmar="Confirmar: ficar fora">Ficar fora · falta ${reais(custo - estado.dinheiro)}</button>`
            : `<button class="principal grande" data-acao="ir-fds">Ir para a pista · ${estado.contrato && estado.contrato.custoEtapa === 0 ? 'grátis' : reais(custo)}</button>`}
        </div>
      </div>
    </section>`;
  }

  // Feed do paddock: alertas, ofertas, propostas e notícias, no estilo de mensagens de rádio.
  function itemFeed(cor, titulo, texto, acoes = '') {
    return `<article class="feed-item ${cor}"><b class="feed-titulo">${titulo}</b>${texto ? `<p>${texto}</p>` : ''}${acoes}</article>`;
  }

  function feedPaddock() {
    const itens = [];
    if (estado.motorHoras >= C.HORAS_REVISAO) {
      itens.push(itemFeed('amarelo', 'Motor · revisão', estado.motorHoras > C.HORAS_REVISAO ? 'Motor cansado, perdendo força.' : 'Hora de revisar o motor.',
        `<button data-acao="revisar">Revisar · ${reais(C.precoRevisao(estado))}</button>`));
    }
    if (!estado.pneus.some((p) => p.tipo === 'slick' && p.uso < 5)) {
      itens.push(itemFeed('amarelo', 'Pneus', 'Nenhum slick novo para a classificação.',
        `<button data-acao="comprar-pneu" data-tipo="slick">+ Slick · ${reais(C.precoPneu(estado, 'slick'))}</button>`));
    }
    for (const pr of estado.propostas) itens.push(cartaoProposta(pr));
    for (const o of estado.ofertasPatrocinio) {
      itens.push(itemFeed('verde', `Patrocínio · ${esc(o.empresa)}`, `${reais(o.porEtapa)} por etapa · 🎯 ${C.textoMeta(o.meta)} · 🎁 +${reais(o.bonus)}`,
        `<div class="botoes-2"><button class="principal" data-acao="aceitar-patrocinio" data-id="${o.id}">Aceitar</button><button data-acao="recusar-patrocinio" data-id="${o.id}">Recusar</button></div>`));
    }
    for (const o of estado.olheiros || []) itens.push(itemFeed('azul', 'Olheiro no paddock', esc(o.nome)));
    for (const n of estado.noticias.slice(0, 3)) itens.push(itemFeed('cinza', 'Notícia', esc(n.texto)));
    return `<section class="secao"><div class="secao-topo"><h2>Feed do paddock</h2><span class="espaco"></span>${botaoAjuda('olheiros')}</div>
      <div class="feed">${itens.join('') || '<p class="vazio">Tudo calmo no paddock.</p>'}</div></section>`;
  }

  function cartaoCabeca() {
    const p = estado.piloto;
    return cartao('🧠', 'Cabeça', `
      <div class="aneis">${anel('Moral', p.moral)}${anel('Confiança', p.confianca)}</div>
      <p class="fala">“${esc(C.humor(p))}”</p>
      <button data-acao="psicologo">🛋 Psicólogo · ${reais(C.precoPsicologo(estado))}</button>`, { ajuda: 'cabeca' });
  }

  function cartaoOficina() {
    const saude = Math.max(0, C.HORAS_REVISAO + 1 - estado.motorHoras);
    const segs = Array.from({ length: C.HORAS_REVISAO + 1 }, (_, i) => `<i class="${i < saude ? (saude <= 1 ? 'aviso-fundo' : 'dinheiro-fundo') : ''}"></i>`).join('');
    return cartao('🔧', 'Oficina', `
      <div class="motor"><span>Motor</span><span class="segmentos-motor" role="img" aria-label="Saúde do motor ${saude} de ${C.HORAS_REVISAO + 1}">${segs}</span>
        <button data-acao="revisar">Revisar · ${reais(C.precoRevisao(estado))}</button></div>
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
    return cartao('', 'Patrocínio', `
      ${estado.patrocinios.map((o) => linhaPatrocinio(o, false)).join('') || '<p class="vazio">Sem patrocinador. Ofertas aparecem no feed.</p>'}
      <div class="chips">${chip(`⭐ Popularidade ${Math.round(estado.piloto.popularidade)}`)}</div>`,
    { ajuda: 'patrocinio', extra: `<span class="vagas" aria-label="${estado.patrocinios.length} de ${C.MAX_PATROCINIOS}">${vagas}</span>` });
  }

  function cartaoProposta(pr) {
    const atual = C.equipeBase(estado.equipeId);
    const tipo = { fabrica: 'Piloto de fábrica', desconto: 'Vaga com desconto', furada: 'Vaga com desconto' }[pr.tipo];
    return `<article class="feed-item vermelho"><b class="feed-titulo">Box box box · proposta</b>
      <p><b>${esc(pr.nome)}</b> · ${tipo}${pr.segundoPiloto ? ' · ⚠ segundo piloto' : ''}</p>
      <div class="tiles">${tile('Kart', `${pr.materialPrometido} <span class="fraco">vs ${atual.material}</span>`)}${tile('Por etapa', pr.custoEtapa ? reais(pr.custoEtapa) : 'Grátis', 'dinheiro')}${tile('Multa', reais(pr.multa), 'aviso')}</div>
      <div class="botoes-2"><button class="principal" data-acao="aceitar-proposta" data-id="${pr.id}" data-confirmar="Confirmar troca">Aceitar</button><button data-acao="recusar-proposta" data-id="${pr.id}">Recusar</button></div>
    </article>`;
  }

  function tabelaCampeonato() {
    const tabela = C.classificacaoCampeonato(estado);
    return `<div class="painel tabela-ajustada"><table>
      <tr><th>#</th><th>Piloto</th><th class="opc">Equipe</th><th class="num">V</th><th class="num opc">Pód.</th><th class="num">Pts</th></tr>
      ${tabela.map((x, i) => {
        const eq = C.equipeBase(x.equipe);
        return `<tr class="${x.id === 'jogador' ? 'jogador' : ''}"><td>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
          <td class="nome"><span class="cor" style="background:${eq.cor}"></span>${esc(x.nome)}</td><td class="fraco opc">${esc(eq.nome)}</td>
          <td class="num">${x.vitorias}</td><td class="num opc">${x.podios}</td><td class="num"><b>${x.pontos}</b></td></tr>`;
      }).join('')}</table></div>`;
  }

  function painelPiloto() {
    const p = estado.piloto;
    const ultimos = estado.historico.slice(-10).reverse();
    return `<div class="grade">
      ${cartao('🧑', esc(p.nome), `${C.ATRIBUTOS.map((a) => barra(C.NOMES_ATRIBUTOS[a], p[a])).join('')}
        <div class="aneis">${anel('Moral', p.moral)}${anel('Confiança', p.confianca)}</div>`, { ajuda: 'cabeca' })}
      ${cartao('📈', 'Últimas corridas', ultimos.length
        ? `<div class="resultados">${ultimos.map((h) => `<div class="resultado-bolinha ${h.fora ? 'fora' : h.pos === 1 ? 'ouro' : h.pos <= 3 ? 'podio' : h.pos <= 10 ? 'pontos' : ''}" title="${esc(h.pista)} ${h.ano}">${h.fora ? '✕' : h.pos}</div>`).join('')}</div>`
        : '<p class="vazio">Nenhuma corrida ainda.</p>')}
    </div>`;
  }

  function painelCaderno() {
    const pistas = Object.keys(estado.caderno);
    if (!pistas.length) return cartao('📓', 'Caderno', '<p class="vazio">Cada saída de treino e cada classificação aparecem aqui.</p>');
    const todas = [...Dados.KARTODROMOS.br, ...Dados.KARTODROMOS.eu];
    return `<div class="grade">${pistas.map((id) => {
      const pista = todas.find((x) => x.id === id);
      const linhas = estado.caderno[id].slice().sort((a, b) => a.posicao - b.posicao).slice(0, 6);
      return cartao('📓', esc(pista.nome), `<div class="anotacoes">${linhas.map((l) => `<div class="anotacao">
          <div class="item-topo"><span class="chips">${chip(l.sessao === 'treino' ? 'Treino' : 'Classif.')}${chip(l.molhado ? '🌧' : '☀️')}${chip(`${l.tempPista}°`)}</span>
            <b>${tempoVolta(l.tempo)} <span class="pos-mini">P${l.posicao}</span></b></div>
          <div class="fraco">${Kart.PNEUS_KART[l.pneu].nome} · ${esc(Kart.descreverSetup(l.setup))}</div>
        </div>`).join('')}</div>`);
    }).join('')}</div>`;
  }

  function telaPaddock() {
    const aba = tela.aba || 'resumo';
    const conteudo = {
      resumo: () => `${avatares()}${cartaoProximaEtapa()}${feedPaddock()}<div class="grade grade-4">${cartaoCabeca()}${cartaoOficina()}${cartaoPatrocinio()}</div>`,
      campeonato: () => `<h1>Campeonato</h1>${tabelaCampeonato()}`,
      piloto: () => `<h1>${esc(estado.piloto.nome)}</h1>${painelPiloto()}`,
      caderno: () => `<h1>Caderno de acertos</h1>${painelCaderno()}`,
      noticias: () => `<h1>Notícias</h1><div class="feed">${estado.noticias.map((n) => itemFeed('cinza', String(n.ano), esc(n.texto))).join('')}</div>`,
    }[aba]();
    app.innerHTML = `
      ${conteudo}
      ${aba === 'piloto' ? '<div class="rodape"><button class="discreto" data-acao="abandonar" data-confirmar="Toque de novo para apagar">Apagar carreira</button></div>' : ''}
      ${navInferior(aba)}`;
  }

  const SOBRE_TIPO = {
    travada: 'Traçado travado, cheio de curvas lentas e grampos. Premia tração na saída e um kart que vira fácil.',
    mista: 'Traçado misto, com retas médias e curvas de todos os tipos. O equilíbrio do acerto faz a diferença.',
    veloz: 'Traçado veloz, de retas longas e curvas rápidas. Pede velocidade final e coragem nas tangências.',
  };

  function telaPista() {
    const pista = C.pistaAtual(estado);
    const camp = C.campeonato(estado.campeonato);
    const aba = tela.aba || 'pista';
    const extensao = (pista.tempoBase * 75 / 3600).toFixed(2).replace('.', ',');
    const anotacoes = (estado.caderno[pista.id] || []).slice().sort((a, b) => a.posicao - b.posicao).slice(0, 6);
    app.innerHTML = `
      <div class="detalhe">
        <div class="linha"><button class="redondo" data-acao="voltar-paddock-pista" aria-label="Voltar">${icone('voltar')}</button></div>
        <div class="detalhe-titulo"><h1>${esc(pista.nome)}</h1><p>${icone('local', 'ico-p')} ${esc(pista.local)}</p></div>
        <div class="segmentado" role="tablist">
          <button role="tab" data-acao="aba-pista" data-aba="pista" class="${aba === 'pista' ? 'ativo' : ''}" aria-selected="${aba === 'pista'}">Pista</button>
          <button role="tab" data-acao="aba-pista" data-aba="caderno" class="${aba === 'caderno' ? 'ativo' : ''}" aria-selected="${aba === 'caderno'}">Caderno</button>
        </div>
        ${aba === 'pista' ? `
          <div class="pista-palco">${tracado(pista, 'grande')}</div>
          <section class="secao"><h2>Sobre</h2><p class="fraco sobre">${SOBRE_TIPO[pista.tipo]} ${pista.altitude >= 700 ? 'Na altitude o motor perde força e a carburação muda.' : ''}</p></section>
          <div class="tiles tiles-2">${tile('Extensão', `${extensao} km`)}${tile('Voltas', camp.voltas)}${tile('Altitude', `${pista.altitude} m`)}${tile('Tipo', tipoPista[pista.tipo].replace(/^\S+\s/, ''))}</div>`
        : `<div class="anotacoes">${anotacoes.length ? anotacoes.map((l) => `<div class="anotacao">
            <div class="item-topo"><span class="chips">${chip(l.sessao === 'treino' ? 'Treino' : 'Classif.')}${chip(l.molhado ? '🌧' : '☀️')}${chip(`${l.tempPista}°`)}</span>
              <b>${tempoVolta(l.tempo)} <span class="pos-mini">P${l.posicao}</span></b></div>
            <div class="fraco">${Kart.PNEUS_KART[l.pneu].nome} · ${esc(Kart.descreverSetup(l.setup))}</div></div>`).join('') : '<p class="vazio">Você ainda não andou aqui.</p>'}</div>`}
        ${estado.dinheiro >= C.custoEtapa(estado) ? `<button class="principal grande" data-acao="ir-fds">Ir para a pista · ${reais(C.custoEtapa(estado))}</button>` : ''}
      </div>`;
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
      return `<div class="ajuste"><span>${a.nome}</span>${controle}</div>`;
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
    const cabecalho = `<div class="linha cabecalho-tela"><h1>${esc(pista.nome)}</h1>${chip(tipoPista[pista.tipo])}</div>${passosFds(fds.sessao)}`;
    if (fds.sessao === 'treino' || fds.sessao === 'quali') app.innerHTML = cabecalho + telaAcerto();
    else if (fds.sessao === 'grid') app.innerHTML = cabecalho + telaGrid();
    else if (fds.sessao === 'corrida') { app.innerHTML = cabecalho + htmlCorrida(); atualizarCorrida(); if (!corrida.terminou && !tela.pausado) iniciarTimer(); }
    else app.innerHTML = cabecalho + telaResultadoCorrida();
  }

  function aviseGasto() {
    const p = estado.pneus.find((x) => x.id === estado.fds.pneuId);
    return p && p.uso > 15 ? chip('⚠ Pneu gasto para a corrida', 'chip-amarelo') : '';
  }

  function botaoMecanico() {
    const usado = estado.fds.sugestaoUsada;
    return `<button data-acao="sugestao" ${usado ? 'disabled' : ''}>🔧 ${usado ? 'Mecânico já ajudou' : 'Pedir ao mecânico'}</button>`;
  }

  function telaAcerto() {
    const fds = estado.fds;
    const treino = fds.sessao === 'treino';
    const restantes = C.SAIDAS_TREINO - fds.saidas.length;
    const saidas = fds.saidas.slice().reverse();
    const contador = Array.from({ length: C.SAIDAS_TREINO }, (_, i) => `<i class="${i < fds.saidas.length ? 'feita' : ''}"></i>`).join('');
    return `<div class="corrida">
      <div class="coluna">
        ${cartao(treino ? '🌅' : '⏱', treino ? 'Treino livre' : 'Classificação', `${condicaoChips(treino ? 'treino' : 'quali')}${editorSetup()}`, { ajuda: treino ? 'setup' : 'quali' })}
        ${cartao('🛞', 'Pneu', `${pneusVisuais(true)}${aviseGasto()}`)}
        <div class="acoes">
          ${treino
            ? `<button class="principal grande" data-acao="saida" ${restantes ? '' : 'disabled'}>Sair para a pista <span class="etapas" aria-label="${restantes} saídas restantes">${contador}</span></button>
               <div class="botoes-2">${botaoMecanico()}<button data-acao="ir-quali">Ir para a classificação →</button></div>`
            : `<button class="principal grande" data-acao="classificar">Fazer a volta lançada</button>${botaoMecanico()}`}
        </div>
      </div>
      ${cartao('📻', 'Rádio', saidas.length ? saidas.map((s, i) => `<div class="saida">
          <div class="item-topo"><span class="chip">Saída ${saidas.length - i}</span><b class="tempo">${tempoVolta(s.tempo)}</b><span class="pos-mini ${s.posicao <= 3 ? 'top' : ''}">P${s.posicao}</span></div>
          <div class="fraco mini">${esc(Kart.descreverSetup(s.setup))}</div>
          ${s.frases.map((f) => `<div class="bolha piloto"><span aria-hidden="true">🧑</span><p>${esc(f)}</p></div>`).join('')}
          <div class="bolha mecanico"><span aria-hidden="true">🔧</span><p>${esc(s.dica.replace(/^Mecânico: /, ''))}</p></div>
        </div>`).join('') : '<p class="vazio">📻 Ajuste o kart e saia para a pista.</p>', { ajuda: 'radio' })}
    </div>`;
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
          <div class="largada-info">${condicaoChips('quali')}${mudou ? chip('✎ Acerto alterado', 'chip-amarelo') : ''}</div>
          <button class="principal grande" data-acao="largar">Largar!</button>
        </section>
        ${cartao('🔩', 'Acerto para a corrida', editorSetup(), { ajuda: 'grid' })}
        ${cartao('🛞', 'Pneu', `${pneusVisuais(true)}${aviseGasto()}`)}
        <div class="botoes-2">${mudou ? '<button data-acao="desfazer-grid">↺ Acerto da classificação</button>' : ''}${botaoMecanico()}</div>
      </div>
      ${cartao('🚦', 'Grid', `<div class="tabela-ajustada"><table><tr><th>Pos</th><th>Piloto</th><th class="num opc">Tempo</th><th class="num">Dif.</th></tr>
        ${fds.quali.map((q, i) => {
          const eqId = q.id === 'jogador' ? estado.equipeId : estado.rivais.find((r) => r.id === q.id).equipe;
          const eq = C.equipeBase(eqId);
          return `<tr class="${q.id === 'jogador' ? 'jogador' : ''}"><td>${i + 1}</td><td class="nome"><span class="cor" style="background:${eq.cor}"></span>${esc(C.nomeDe(estado, q.id))}</td>
            <td class="num opc">${tempoVolta(q.tempo)}</td><td class="num">${i ? '+' + (q.tempo - pole).toFixed(3) : ''}</td></tr>`;
        }).join('')}</table></div>`)}
    </div>`;
  }

  const ICONE_MODO = { atacar: '⚡', normal: '➖', poupar: '🛡' };

  function htmlCorrida() {
    return `<div class="corrida">
      <section class="painel">
        <div class="controles-corrida">
          <span id="volta" class="volta"></span><span id="clima-corrida"></span><span class="espaco"></span>
          <button data-acao="play" id="btn-play"></button>
          <div class="segmentos velocidades">${VELOCIDADES.map((v, i) => `<button data-acao="velocidade" data-i="${i}" class="${tela.vel === i ? 'ativo' : ''}">${v.nome}</button>`).join('')}</div>
          <button data-acao="pular">⏭ Fim</button>
        </div>
        <div class="tabela-ajustada" id="tabela"></div>
      </section>
      <div class="coluna">
        ${cartao('🎮', 'Pilotagem', `<div id="info-jogador" class="chips"></div>
          <div class="segmentos modos">${Object.entries(Engine.MODOS).map(([k, m]) => `<button data-acao="modo" data-modo="${k}">${ICONE_MODO[k]} ${m.nome}</button>`).join('')}</div>`, { ajuda: 'pilotagem' })}
        ${cartao('📣', 'Corrida', '<div class="eventos" id="eventos"></div>')}
      </div>
    </div>`;
  }

  function atualizarCorrida() {
    const ordem = corrida.carros.slice().sort((a, b) => a.pos - b.pos);
    const lider = ordem[0];
    document.getElementById('volta').innerHTML = corrida.volta === 0 ? 'Grid' : `Volta <b>${corrida.volta}</b>/${corrida.totalVoltas}`;
    document.getElementById('clima-corrida').innerHTML = corrida.molhado ? chip('🌧 Molhado', 'chip-azul') : '';
    document.getElementById('btn-play').textContent = corrida.terminou ? 'Ver resultado' : tela.pausado ? '▶' : '❚❚';
    document.getElementById('btn-play').classList.toggle('principal', corrida.terminou);
    document.getElementById('tabela').innerHTML = `<table>
      <tr><th>Pos</th><th>Piloto</th><th class="num">Dif.</th><th class="opc">Pneu</th><th class="num opc">Última</th></tr>
      ${ordem.map((c) => {
        const ganho = c.largada - c.pos;
        const dif = c.fora ? 'Fora' : c === lider ? '' : `+${(c.tempo - lider.tempo).toFixed(1)}`;
        return `<tr class="${c.jogador ? 'jogador' : ''} ${c.fora ? 'fora' : ''}">
          <td>${c.pos}<span class="${ganho > 0 ? 'dinheiro' : 'negativo'} mini">${ganho > 0 ? ' ▲' + ganho : ganho < 0 ? ' ▼' + -ganho : ''}</span></td>
          <td class="nome"><span class="cor" style="background:${c.equipe.cor}"></span>${esc(c.piloto.nome)}</td>
          <td class="num">${dif}</td><td class="opc">${Kart.PNEUS_KART[c.tipoPneu].nome}</td>
          <td class="num fraco opc">${tempoVolta(c.ultimaVolta)}</td></tr>`;
      }).join('')}</table>`;
    document.getElementById('eventos').innerHTML = corrida.eventos.slice().reverse().slice(0, 60)
      .map((e) => `<div class="ev-${e.tipo} ${e.carroId === 'jogador' ? 'ev-jogador' : ''}"><span class="v">V${e.volta}</span>${esc(e.texto)}</div>`).join('');
    const eu = corrida.carros.find((c) => c.jogador);
    document.getElementById('info-jogador').innerHTML = eu.fora
      ? chip(`✕ ${esc(eu.motivoFora)}`, 'chip-vermelho')
      : `${chip(`P${eu.pos}`, 'chip-grande')}${chip(`🛞 ${100 - desgastePct(eu.uso)}%`)}${chip(`🔥 ${estado.piloto.confianca}`)}`;
    app.querySelectorAll('[data-acao="modo"]').forEach((b) => { b.classList.toggle('ativo', b.dataset.modo === eu.modo); b.disabled = eu.fora || corrida.terminou; });
  }

  function iniciarTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      Engine.passo(corrida);
      atualizarCorrida();
      if (corrida.terminou) { clearInterval(timer); timer = null; }
    }, VELOCIDADES[tela.vel].ms);
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
          ${r.eventos.map((e) => chip(`⚠ ${esc(e)}`, 'chip-amarelo')).join('')}
          ${(r.cabeca || []).length ? `<div class="chips">${r.cabeca.map((x) => [
            x.confianca ? chip(`🔥 ${sinal(x.confianca)}`, x.confianca > 0 ? 'chip-dinheiro' : 'chip-negativo') : '',
            x.moral ? chip(`😊 ${sinal(x.moral)}`, x.moral > 0 ? 'chip-dinheiro' : 'chip-negativo') : '',
          ].join('')).join('')}</div>` : ''}
          ${r.olheiros.length ? `<div class="chips">${r.olheiros.map((o) => chip(`👀 ${esc(o)}`)).join('')}</div>` : ''}
          <button class="principal grande" data-acao="voltar-paddock">Voltar ao paddock</button>
        </section>
      </div>
      ${cartao('🏁', 'Resultado', `<div class="tabela-ajustada"><table><tr><th>Pos</th><th>Piloto</th><th class="num">Dif.</th><th class="num">Pts</th></tr>
        ${fds.classificacao.map((x) => `<tr class="${x.id === 'jogador' ? 'jogador' : ''} ${x.fora ? 'fora' : ''}">
          <td>${x.fora ? 'NC' : x.pos}</td><td class="nome"><span class="cor" style="background:${C.equipeBase(x.equipe).cor}"></span>${esc(C.nomeDe(estado, x.id))}</td>
          <td class="num">${x.fora ? 'Fora' : x.pos === 1 ? '🏁' : '+' + x.dif.toFixed(1)}</td><td class="num"><b>${x.pontos || ''}</b></td></tr>`).join('')}
        </table></div>`)}
    </div>`;
  }

  // ---------- fim de temporada ----------
  function telaRelatorio() {
    const r = estado.relatorio;
    const camp = C.campeonato(r.campeonato);
    const escolha = tela.proximo || r.opcoes[r.opcoes.length - 1];
    const ganhos = r.premios.reduce((t, p) => t + p.valor, 0) + r.bonus.filter((b) => b.cumpriu).reduce((t, b) => t + b.valor, 0);
    app.innerHTML = `
      <div class="linha cabecalho-tela"><h1>Temporada ${r.ano}</h1>${chip(esc(camp.curto))}</div>
      ${estado.propostas.length ? cartao('🚀', 'Propostas para a F4', estado.propostas.map((p) => `<div class="item">
          <div class="item-topo"><b>${esc(p.nome)}</b></div><p class="fraco">${esc(p.texto)}</p>
          <button class="principal grande" data-acao="aceitar-proposta" data-id="${p.id}">Assinar e subir para a F4</button></div>`).join(''), { classe: 'destaque' }) : ''}
      <div class="grade">
        <section class="painel resultado-hero ${r.pos <= 3 ? 'bom' : ''}">
          <div class="pos-grande"><span>Campeonato</span><b>${r.pos <= 3 ? ['🥇', '🥈', '🥉'][r.pos - 1] : ''} P${r.pos}</b></div>
          <div class="tiles">${tile('Pontos', r.pontos)}${tile('Campeão', esc(r.campeao.split(' ')[0]))}${tile('Ganhos', '+' + reais(ganhos), 'dinheiro')}</div>
        </section>
        ${cartao('📈', 'Evolução', r.evolucao.length
          ? r.evolucao.map((x) => `<div class="barra"><span>${C.NOMES_ATRIBUTOS[x.a]}</span><span class="trilho"><i style="width:${x.depois}%"></i></span><b>${x.depois} <span class="dinheiro mini">${sinal(x.depois - x.antes)}</span></b></div>`).join('')
          : '<p class="vazio">Sem evolução este ano.</p>')}
        ${cartao('💰', 'Dinheiro', `
          ${r.premios.map((p) => `<div class="item-topo"><span>🏆 ${esc(p.texto)}</span><b class="dinheiro">+${reais(p.valor)}</b></div>`).join('')}
          ${r.bonus.map((b) => `<div class="item-topo"><span>${b.cumpriu ? '✅' : '❌'} ${esc(b.empresa)}</span><b class="${b.cumpriu ? 'dinheiro' : 'fraco'}">${b.cumpriu ? '+' + reais(b.valor) : '—'}</b></div>`).join('')}
          ${tile('Caixa', reais(estado.dinheiro))}`)}
        ${cartao('📅', 'Próximo ano', `<div class="escolhas">${r.opcoes.map((id) => {
            const c = C.campeonato(id);
            return `<button class="escolha ${escolha === id ? 'ativo' : ''}" data-acao="escolher-proximo" data-id="${id}" aria-pressed="${escolha === id}">
              <b>${esc(c.curto)}</b><span class="chips">${chip(id === r.campeonato ? '↺ Repetir' : '⬆ Subir', id === r.campeonato ? '' : 'chip-dinheiro')}${chip(`💸 ×${c.custo}`)}${c.regiao === 'eu' ? chip('🇪🇺') : ''}</span></button>`;
          }).join('')}</div>
          <button class="principal grande" data-acao="nova-temporada">Começar ${estado.ano}</button>`, { ajuda: 'temporada' })}
      </div>`;
  }

  function telaF4() {
    const f = estado.final;
    const vitorias = estado.historico.filter((h) => !h.fora && h.pos === 1).length;
    app.innerHTML = `<section class="painel destaque tela-nome">
      <span class="capacete" aria-hidden="true">🏆</span>
      <h1>Rumo à Fórmula 4!</h1>
      <p><b>${esc(estado.piloto.nome)}</b> assinou com <b>${esc(f.proposta.nome)}</b> aos ${f.idade} anos.</p>
      <div class="tiles">${tile('Corridas', estado.historico.length)}${tile('Vitórias', vitorias)}${tile('Caixa', reais(estado.dinheiro), 'dinheiro')}</div>
      <p class="fraco">Próximo capítulo: F4, F3, F2 e a Superlicença.</p>
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
        ir({ nome: 'equipe', nomePiloto: nome, seed, opcoes: C.equipesIniciais(seed) });
        break;
      }
      case 'trocar-nome':
        ir({ nome: 'inicio', nomePiloto: tela.nomePiloto });
        break;
      case 'escolher-equipe':
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
        ir({ nome: 'inicio' });
        break;
      case 'aba':
        tela.aba = alvo.dataset.aba;
        render();
        break;
      case 'psicologo':
        if (erro(C.sessaoPsicologo(estado))) { salvar(); render(); aviso('Boa conversa. O piloto saiu mais leve.'); }
        break;
      case 'revisar':
        if (erro(C.revisarMotor(estado))) { salvar(); render(); aviso('Motor revisado.'); }
        break;
      case 'comprar-pneu':
        if (erro(C.comprarPneu(estado, alvo.dataset.tipo))) { salvar(); render(); }
        break;
      case 'descartar-pneu':
        C.descartarPneu(estado, id);
        salvar();
        render();
        break;
      case 'aceitar-patrocinio':
        if (erro(C.aceitarPatrocinio(estado, id))) { salvar(); render(); }
        break;
      case 'recusar-patrocinio':
        C.recusarPatrocinio(estado, id);
        salvar();
        render();
        break;
      case 'aceitar-proposta':
        if (erro(C.aceitarProposta(estado, id))) { salvar(); ir(telaDaFase()); }
        break;
      case 'recusar-proposta':
        C.recusarProposta(estado, id);
        salvar();
        render();
        break;
      case 'ir-fds':
        if (erro(C.iniciarFimDeSemana(estado))) { salvar(); ir({ nome: 'fds' }); }
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
      case 'sugestao':
        if (erro(C.pedirSugestao(estado, estado.fds.sessao))) { salvar(); render(); aviso('O mecânico ajustou o kart.'); }
        break;
      case 'saida':
        if (erro(C.saidaTreino(estado))) { salvar(); render(); }
        break;
      case 'ir-quali':
        C.irParaClassificacao(estado);
        salvar();
        render();
        break;
      case 'classificar':
        if (erro(C.classificar(estado))) { salvar(); render(); }
        break;
      case 'desfazer-grid':
        estado.fds.setup = { ...estado.fds.setupCorrida };
        estado.fds.pneuId = estado.fds.pneuCorrida;
        salvar();
        render();
        break;
      case 'largar':
        corrida = C.criarCorrida(estado);
        estado.fds.sessao = 'corrida';
        ir({ nome: 'fds', vel: 1, pausado: false });
        break;
      case 'play':
        if (corrida.terminou) return finalizarCorrida();
        tela.pausado = !tela.pausado;
        if (tela.pausado) { clearInterval(timer); timer = null; } else iniciarTimer();
        atualizarCorrida();
        break;
      case 'velocidade':
        tela.vel = +alvo.dataset.i;
        app.querySelectorAll('[data-acao="velocidade"]').forEach((b) => b.classList.toggle('ativo', b === alvo));
        if (timer) iniciarTimer();
        break;
      case 'pular':
        finalizarCorrida();
        break;
      case 'modo':
        corrida.carros.find((c) => c.jogador).modo = alvo.dataset.modo;
        atualizarCorrida();
        break;
      case 'voltar-paddock':
        C.concluirEtapa(estado);
        salvar();
        ir(telaDaFase());
        break;
      case 'nova-temporada':
        if (erro(C.proximaTemporada(estado, tela.proximo || estado.relatorio.opcoes[estado.relatorio.opcoes.length - 1]))) { salvar(); ir(telaDaFase()); }
        break;
    }
  });

  // Enter no campo do nome entra no paddock.
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
