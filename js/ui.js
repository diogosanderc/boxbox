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
      <header class="cartao-topo"><span class="icone" aria-hidden="true">${icone}</span><h3>${titulo}</h3>${extra}<span class="espaco"></span>${ajuda ? botaoAjuda(ajuda) : ''}</header>
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
    const eq = C.equipeBase(estado.equipeId);
    const camp = C.campeonato(estado.campeonato);
    const p = estado.piloto;
    statusEl.innerHTML = `<span class="status-piloto"><span class="cor" style="background:${eq.cor}"></span><b>${esc(p.nome)}</b> <span class="fraco">${p.idade}a · ${camp.curto} ${estado.ano}</span></span>
      <span class="chips">${chip(`💰 ${reais(estado.dinheiro)}`, estado.dinheiro < C.custoEtapa(estado) ? 'chip-vermelho' : '')}
      ${chip(`😊 ${p.moral}`, 'chip-' + nivelClasse(p.moral))}${chip(`🔥 ${p.confianca}`, 'chip-' + nivelClasse(p.confianca))}</span>`;
  }

  function render() {
    atualizarStatus();
    const telas = { inicio: telaInicio, equipe: telaEquipe, paddock: telaPaddock, fds: telaFimDeSemana, relatorio: telaRelatorio, f4: telaF4, falencia: telaFalencia };
    telas[tela.nome]();
  }

  function abas(lista, atual) {
    return `<nav class="abas">${lista.map(([id, icone, nome]) => `<button data-acao="aba" data-aba="${id}" class="${atual === id ? 'ativo' : ''}"><span aria-hidden="true">${icone}</span><span>${nome}</span></button>`).join('')}</nav>`;
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
  function cartaoProximaEtapa() {
    const pista = C.pistaAtual(estado);
    const clima = C.climaAtual(estado);
    const custo = C.custoEtapa(estado);
    const semDinheiro = estado.dinheiro < custo;
    const pontos = Array.from({ length: C.ETAPAS }, (_, i) => `<i class="${i < estado.etapa ? 'feita' : i === estado.etapa ? 'atual' : ''}"></i>`).join('');
    return `<section class="painel hero">
      <header class="cartao-topo"><span class="icone" aria-hidden="true">🏁</span><h3>Etapa ${estado.etapa + 1}/${C.ETAPAS}</h3><span class="etapas" aria-hidden="true">${pontos}</span><span class="espaco"></span>${botaoAjuda('etapa')}</header>
      <div class="hero-corpo">
        <div class="hero-pista">
          <h2>${esc(pista.nome)}</h2>
          <div class="chips">${chip(tipoPista[pista.tipo])}${chip(`⛰ ${pista.altitude} m`)}${chip(esc(pista.local))}</div>
        </div>
        <div class="climas">${climaBloco('Manhã', clima.manha)}${climaBloco('Tarde', clima.tarde)}${botaoAjuda('clima')}</div>
        <div class="hero-acao">
          ${tile('Custo da etapa', estado.contrato && estado.contrato.custoEtapa === 0 ? 'Grátis' : reais(custo), semDinheiro ? 'negativo' : '')}
          ${semDinheiro
            ? '<button class="grande" data-acao="pular-etapa" data-confirmar="Confirmar: ficar fora">Ficar fora da etapa</button>'
            : '<button class="principal grande" data-acao="ir-fds">Ir para a pista</button>'}
        </div>
      </div>
    </section>`;
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
    const ofertas = estado.ofertasPatrocinio;
    return cartao('💼', 'Patrocínio', `
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
    return cartao('👀', 'Olheiros', `
      ${olheiros.length ? `<div class="chips">${olheiros.map((o) => chip(esc(o.nome))).join('')}</div>` : '<p class="vazio">Ninguém importante hoje.</p>'}
      ${estado.propostas.map(cartaoProposta).join('')}`, { ajuda: 'olheiros' });
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
      resumo: () => `${cartaoProximaEtapa()}<div class="grade grade-4">${cartaoCabeca()}${cartaoOficina()}${cartaoPatrocinio()}${cartaoOlheiros()}</div>`,
      campeonato: tabelaCampeonato,
      piloto: painelPiloto,
      caderno: painelCaderno,
      noticias: () => cartao('📰', 'Notícias', `<div class="noticias">${estado.noticias.map((n) => `<div><span class="chip">${n.ano}</span> ${esc(n.texto)}</div>`).join('')}</div>`),
    }[aba]();
    const pos = C.posicaoNoCampeonato(estado);
    app.innerHTML = `
      <div class="linha cabecalho-tela"><h1>Paddock</h1><span class="espaco"></span>${chip(`🏆 P${pos} · ${estado.pontos.jogador} pts`, 'chip-grande')}</div>
      ${abas([['resumo', '🏁', 'Etapa'], ['campeonato', '🏆', 'Tabela'], ['piloto', '🧑', 'Piloto'], ['caderno', '📓', 'Caderno'], ['noticias', '📰', 'Notícias']], aba)}
      ${conteudo}
      <div class="rodape"><button class="discreto" data-acao="abandonar" data-confirmar="Toque de novo para apagar">Apagar carreira</button></div>`;
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
