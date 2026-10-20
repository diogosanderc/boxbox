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
  const tipoPista = { travada: 'Travada (curvas lentas)', mista: 'Mista', veloz: 'Veloz (retas longas)' };

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

  function atualizarStatus() {
    if (!estado) { statusEl.innerHTML = ''; return; }
    const eq = C.equipeBase(estado.equipeId);
    const camp = C.campeonato(estado.campeonato);
    statusEl.innerHTML = `<b>${esc(estado.piloto.nome)}</b> · ${estado.piloto.idade} anos · <span class="cor" style="background:${eq.cor}"></span>${esc(eq.nome)} · ${camp.curto} ${estado.ano}
      · <span class="${estado.dinheiro < C.custoEtapa(estado) ? 'negativo' : 'dinheiro'}">${reais(estado.dinheiro)}</span>`;
  }

  function render() {
    atualizarStatus();
    const telas = { inicio: telaInicio, paddock: telaPaddock, fds: telaFimDeSemana, relatorio: telaRelatorio, f4: telaF4, falencia: telaFalencia };
    telas[tela.nome]();
  }

  function abas(lista, atual, acao = 'aba') {
    return `<div class="abas">${lista.map(([id, nome]) => `<button data-acao="${acao}" data-aba="${id}" class="${atual === id ? 'ativo' : ''}">${nome}</button>`).join('')}</div>`;
  }

  function barra(rotulo, valor, max = 100) {
    return `<div class="barra"><span>${rotulo}</span><span class="trilho"><i style="width:${(valor / max) * 100}%"></i></span><b>${valor}</b></div>`;
  }

  // ---------- início: escolha da equipe ----------
  function telaInicio() {
    const save = carregar();
    const escolhida = tela.equipe || null;
    app.innerHTML = `
      <div class="painel" style="margin-bottom:16px;max-width:820px">
        <h1>Do kart à Fórmula 1</h1>
        <p>Você é um piloto de 12 anos começando no kart e também o cabeça da própria carreira. Escolhe a equipe, cuida do dinheiro,
        busca patrocínio, faz o <b>acerto do kart</b> para cada pista, clima e pneu, e decide quais propostas aceitar.</p>
        <p class="fraco">Escada: Copa Regional → Brasileiro → Europeu → proposta da Fórmula 4.</p>
        ${save ? `<p><button class="principal" data-acao="continuar">Continuar a carreira de ${esc(save.piloto.nome)} (${save.ano})</button></p>` : ''}
        <div class="campo"><label for="nome-piloto">Nome do piloto</label><input type="text" id="nome-piloto" value="${esc(tela.nomePiloto || '')}" placeholder="Seu nome" maxlength="30"></div>
      </div>
      <h2>Escolha sua equipe de kart</h2>
      <div class="equipes">
        ${Dados.EQUIPES.map((e) => `<button class="cartao-equipe ${escolhida === e.id ? 'ativo' : ''}" style="border-left-color:${e.cor}" data-acao="escolher-equipe" data-id="${e.id}">
          <b>${esc(e.nome)}</b>
          <div class="fraco" style="font-size:13px;margin-bottom:6px">${esc(e.descricao)}</div>
          ${barra('Material', e.material)}${barra('Mecânico', e.mecanico)}
          <div style="font-size:13px;margin-top:6px">Caixa inicial <b class="dinheiro">${reais(e.caixa)}</b> · custo por etapa <b>${reais(e.custoEtapa)}</b></div>
        </button>`).join('')}
      </div>
      <div class="barra-acao linha"><span class="fraco">${escolhida ? `Equipe: <b>${esc(C.equipeBase(escolhida).nome)}</b>` : 'Escolha uma equipe para começar.'}</span><span class="espaco"></span>
        <button class="principal" data-acao="novo-jogo" ${escolhida ? '' : 'disabled'}>Começar carreira</button></div>`;
  }

  // ---------- paddock (entre etapas) ----------
  function climaTexto(periodo) {
    return `${periodo.tempAr}°C · chance de chuva <b>${periodo.chance}%</b>`;
  }

  function painelProximaEtapa() {
    const pista = C.pistaAtual(estado);
    const clima = C.climaAtual(estado);
    const custo = C.custoEtapa(estado);
    const semDinheiro = estado.dinheiro < custo;
    return `<div class="painel">
      <h3>Etapa ${estado.etapa + 1} de ${C.ETAPAS} · ${esc(C.campeonato(estado.campeonato).nome)}</h3>
      <h2>${esc(pista.nome)}</h2>
      <p class="fraco" style="margin-top:-6px">${esc(pista.local)} · ${tipoPista[pista.tipo]} · ${pista.altitude} m de altitude</p>
      <div class="previsao">
        <div><span class="fraco">Manhã (treino livre)</span><br>${climaTexto(clima.manha)}</div>
        <div><span class="fraco">Tarde (classificação e corrida)</span><br>${climaTexto(clima.tarde)}</div>
      </div>
      <p>Custo da etapa: <b>${reais(custo)}</b>${estado.contrato && estado.contrato.custoEtapa === 0 ? ' (a equipe paga)' : ''}</p>
      ${semDinheiro
        ? `<p class="aviso">Dinheiro insuficiente para correr esta etapa.</p><button data-acao="pular-etapa" data-confirmar="Confirmar: ficar fora desta etapa">Ficar fora da etapa</button>`
        : '<button class="principal" data-acao="ir-fds">Ir para o fim de semana</button>'}
    </div>`;
  }

  function painelOficina() {
    const motorCansado = estado.motorHoras > C.HORAS_REVISAO;
    return `<div class="painel">
      <h3>Oficina</h3>
      <p>Motor: <b>${estado.motorHoras}</b> etapa(s) desde a revisão ${motorCansado ? '<span class="aviso">· cansado, perdendo força</span>' : estado.motorHoras === C.HORAS_REVISAO ? '<span class="aviso">· hora de revisar</span>' : ''}</p>
      <button data-acao="revisar">Revisar motor · ${reais(C.precoRevisao(estado))}</button>
      <h3 style="margin-top:14px">Pneus</h3>
      ${tabelaPneus(false)}
      <div class="linha" style="margin-top:8px">
        <button data-acao="comprar-pneu" data-tipo="slick">Comprar slick · ${reais(C.precoPneu(estado, 'slick'))}</button>
        <button data-acao="comprar-pneu" data-tipo="chuva">Comprar chuva · ${reais(C.precoPneu(estado, 'chuva'))}</button>
      </div>
      <p class="fraco" style="font-size:13px">Pneu de kart dura pouco: um jogo novo rende umas ${Math.round(26 / 0.9)} voltas antes de cair muito. Uma bateria tem ${C.campeonato(estado.campeonato).voltas}.</p>
    </div>`;
  }

  function estadoPneu(uso) {
    const pct = Math.round((uso / 26) * 100);
    const classe = pct >= 100 ? 'negativo' : pct >= 60 ? 'aviso' : 'dinheiro';
    return `<span class="${classe}">${pct === 0 ? 'novo' : pct >= 100 ? 'acabado' : `${pct}% gasto`}</span>`;
  }

  function tabelaPneus(selecionavel) {
    if (!estado.pneus.length) return '<p class="aviso">Nenhum jogo de pneus!</p>';
    return `<table><tr>${selecionavel ? '<th></th>' : ''}<th>Jogo</th><th>Tipo</th><th>Estado</th><th></th></tr>
      ${estado.pneus.map((p, i) => `<tr>
        ${selecionavel ? `<td><input type="radio" name="pneu" data-acao="pneu" data-id="${p.id}" ${estado.fds.pneuId === p.id ? 'checked' : ''} aria-label="Usar jogo ${i + 1}"></td>` : ''}
        <td>#${i + 1}</td><td>${Kart.PNEUS_KART[p.tipo].nome}</td><td>${estadoPneu(p.uso)}</td>
        <td>${selecionavel ? '' : `<button data-acao="descartar-pneu" data-id="${p.id}" data-confirmar="Descartar?">Descartar</button>`}</td></tr>`).join('')}</table>`;
  }

  function painelDinheiro() {
    const ofertas = estado.ofertasPatrocinio;
    return `<div class="painel">
      <h3>Patrocínio (${estado.patrocinios.length}/${C.MAX_PATROCINIOS})</h3>
      ${estado.patrocinios.length ? estado.patrocinios.map((p) => `<div><b>${esc(p.empresa)}</b>: ${reais(p.porEtapa)}/etapa · bônus de ${reais(p.bonus)} por ${C.textoMeta(p.meta)}</div>`).join('') : '<p class="fraco">Nenhum patrocinador ainda.</p>'}
      ${ofertas.length ? `<h3 style="margin-top:12px">Ofertas</h3>${ofertas.map((o) => `<div class="oferta">
        <div><b>${esc(o.empresa)}</b>: ${reais(o.porEtapa)} por etapa · bônus de ${reais(o.bonus)} por ${C.textoMeta(o.meta)}</div>
        <div class="linha"><button data-acao="aceitar-patrocinio" data-id="${o.id}">Aceitar</button><button data-acao="recusar-patrocinio" data-id="${o.id}">Recusar</button></div></div>`).join('')}` : ''}
      <p class="fraco" style="font-size:13px;margin-bottom:0">Popularidade: <b>${Math.round(estado.piloto.popularidade)}</b>. Vitórias e pódios atraem empresas maiores.</p>
    </div>`;
  }

  function painelPropostas() {
    const olheiros = estado.olheiros || [];
    const props = estado.propostas;
    return `<div class="painel">
      <h3>Olheiros no paddock</h3>
      ${olheiros.length ? olheiros.map((o) => `<div>👀 ${esc(o.nome)}</div>`).join('') : '<p class="fraco">Ninguém importante desta vez.</p>'}
      ${props.length ? `<h3 style="margin-top:12px">Propostas</h3>${props.map(cartaoProposta).join('')}` : ''}
    </div>`;
  }

  function cartaoProposta(pr) {
    const atual = C.equipeBase(estado.equipeId);
    const nova = C.equipeBase(pr.equipe);
    const tipo = { fabrica: 'Piloto de fábrica', desconto: 'Vaga com desconto', furada: 'Vaga com desconto' }[pr.tipo];
    return `<div class="oferta">
      <div><b>${esc(pr.nome)}</b> · ${tipo}</div>
      <div style="font-size:13px">Material prometido: <b>${pr.materialPrometido}</b> (o seu hoje: ${atual.material}) · mecânico ${nova.mecanico}<br>
      Custo por etapa: <b>${pr.custoEtapa ? reais(pr.custoEtapa) : 'a equipe paga tudo'}</b> · multa para sair da ${esc(atual.nome)}: <b>${reais(pr.multa)}</b>
      ${pr.segundoPiloto ? '<br><span class="aviso">Você será o segundo piloto: pode receber ordem para deixar o companheiro passar.</span>' : ''}</div>
      <div class="fraco" style="font-size:12px">Vale até a próxima etapa.</div>
      <div class="linha"><button data-acao="aceitar-proposta" data-id="${pr.id}" data-confirmar="Confirmar troca de equipe">Aceitar</button><button data-acao="recusar-proposta" data-id="${pr.id}">Recusar</button></div>
    </div>`;
  }

  function tabelaCampeonato() {
    const tabela = C.classificacaoCampeonato(estado);
    return `<div class="painel tabela-rolagem"><table>
      <tr><th>#</th><th>Piloto</th><th>Equipe</th><th class="num">V</th><th class="num">Pód.</th><th class="num">Pts</th></tr>
      ${tabela.map((x, i) => {
        const eq = C.equipeBase(x.equipe);
        return `<tr class="${x.id === 'jogador' ? 'jogador' : ''}"><td>${i + 1}</td>
          <td><span class="cor" style="background:${eq.cor}"></span>${esc(x.nome)}</td><td class="fraco">${esc(eq.nome)}</td>
          <td class="num">${x.vitorias}</td><td class="num">${x.podios}</td><td class="num"><b>${x.pontos}</b></td></tr>`;
      }).join('')}</table></div>`;
  }

  function painelPiloto() {
    const p = estado.piloto;
    const ultimos = estado.historico.slice(-8).reverse();
    return `<div class="grade">
      <div class="painel"><h3>${esc(p.nome)}</h3>
        ${C.ATRIBUTOS.map((a) => barra(C.NOMES_ATRIBUTOS[a], p[a])).join('')}
        <p class="fraco" style="font-size:13px">Popularidade ${Math.round(p.popularidade)}. Alguns talentos não aparecem aqui: só a pista revela.</p></div>
      <div class="painel"><h3>Últimas corridas</h3>
        ${ultimos.length ? ultimos.map((h) => `<div>${h.ano} · ${esc(h.pista)}: <b>${h.fora ? 'abandono' : 'P' + h.pos}</b></div>`).join('') : '<p class="fraco">Nenhuma corrida ainda.</p>'}</div>
    </div>`;
  }

  function painelCaderno() {
    const pistas = Object.keys(estado.caderno);
    if (!pistas.length) return '<div class="painel"><p class="fraco">O caderno se enche sozinho: cada saída no treino e cada classificação ficam anotadas com o acerto, as condições e o tempo.</p></div>';
    const todas = [...Dados.KARTODROMOS.br, ...Dados.KARTODROMOS.eu];
    return pistas.map((id) => {
      const pista = todas.find((x) => x.id === id);
      const linhas = estado.caderno[id].slice().sort((a, b) => a.posicao - b.posicao).slice(0, 8);
      return `<div class="painel tabela-rolagem" style="margin-bottom:12px"><h3>${esc(pista.nome)} · ${tipoPista[pista.tipo]}</h3>
        <table><tr><th>Ano</th><th>Sessão</th><th>Condição</th><th>Acerto</th><th class="num">Tempo</th><th class="num">Pos.</th></tr>
        ${linhas.map((l) => `<tr><td>${l.ano}</td><td>${l.sessao === 'treino' ? 'Treino' : 'Classif.'}</td>
          <td>${l.molhado ? 'Molhado' : 'Seco'} · ar ${l.tempAr}° · pista ${l.tempPista}°</td>
          <td style="white-space:normal">${Kart.PNEUS_KART[l.pneu].nome} · ${esc(Kart.descreverSetup(l.setup))}</td>
          <td class="num">${tempoVolta(l.tempo)}</td><td class="num">P${l.posicao}</td></tr>`).join('')}</table></div>`;
    }).join('');
  }

  function telaPaddock() {
    const aba = tela.aba || 'resumo';
    const conteudo = {
      resumo: () => `<div class="grade">${painelProximaEtapa()}${painelOficina()}${painelDinheiro()}${painelPropostas()}</div>`,
      campeonato: tabelaCampeonato,
      piloto: painelPiloto,
      caderno: painelCaderno,
      noticias: () => `<div class="painel noticias">${estado.noticias.map((n) => `<div><span class="fraco">${n.ano}</span> · ${esc(n.texto)}</div>`).join('')}</div>`,
    }[aba]();
    const pos = C.posicaoNoCampeonato(estado);
    app.innerHTML = `
      <div class="linha" style="margin-bottom:8px"><h1 style="margin:0">Paddock</h1><span class="espaco"></span>
        <span>Campeonato: <b>P${pos}</b> · ${estado.pontos.jogador} pts</span></div>
      ${abas([['resumo', 'Próxima etapa'], ['campeonato', 'Campeonato'], ['piloto', 'Piloto'], ['caderno', 'Caderno de acertos'], ['noticias', 'Notícias']], aba)}
      ${conteudo}
      <p style="margin-top:24px"><button data-acao="abandonar" data-confirmar="Clique de novo para apagar a carreira">Apagar carreira e recomeçar</button></p>`;
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
        const rotulo = a.rotulo ? a.rotulo(s[k]) : `${s[k]} ${a.unidade}`;
        controle = `<div class="passos"><button data-acao="ajuste" data-k="${k}" data-delta="-1" aria-label="Diminuir ${a.nome}" ${s[k] <= a.min ? 'disabled' : ''}>−</button>
          <b>${rotulo}</b><button data-acao="ajuste" data-k="${k}" data-delta="1" aria-label="Aumentar ${a.nome}" ${s[k] >= a.max ? 'disabled' : ''}>+</button></div>`;
      }
      return `<div class="ajuste"><span>${a.nome}</span>${controle}</div>`;
    }).join('')}</div>`;
  }

  function condicaoTexto(sessao) {
    const clima = C.climaAtual(estado);
    if (sessao === 'treino') {
      const c = Kart.condicao(clima, 'treino', clima.manha.chove);
      return `${c.molhado ? '🌧 Pista molhada' : '☀️ Pista seca'} · ar ${c.tempAr}°C · asfalto ${c.tempPista}°C`;
    }
    const molhado = clima.tarde.inicioChuva === 'quali';
    const c = Kart.condicao(clima, 'quali', molhado);
    return `${molhado ? '🌧 Chovendo' : '☀️ Seco'} · ar ${c.tempAr}°C · asfalto ${c.tempPista}°C${molhado ? '' : ` · previsão de chuva na corrida: <b>${clima.tarde.chance}%</b>`}`;
  }

  function passosFds(atual) {
    const passos = [['treino', 'Treino livre'], ['quali', 'Classificação'], ['grid', 'Corrida'], ['fim', 'Resultado']];
    const idx = passos.findIndex(([id]) => id === atual || (atual === 'corrida' && id === 'grid'));
    return `<div class="passos-fds">${passos.map(([, nome], i) => `<span class="${i === idx ? 'atual' : i < idx ? 'feito' : ''}">${nome}</span>`).join('')}</div>`;
  }

  function telaFimDeSemana() {
    const fds = estado.fds;
    const pista = C.pistaAtual(estado);
    const cabecalho = `<div class="linha"><h1 style="margin:0">${esc(pista.nome)}</h1><span class="fraco">${tipoPista[pista.tipo]} · ${pista.altitude} m</span></div>${passosFds(fds.sessao)}`;
    if (fds.sessao === 'treino' || fds.sessao === 'quali') app.innerHTML = cabecalho + telaAcerto();
    else if (fds.sessao === 'grid') app.innerHTML = cabecalho + telaGrid();
    else if (fds.sessao === 'corrida') { app.innerHTML = cabecalho + htmlCorrida(); atualizarCorrida(); if (!corrida.terminou && !tela.pausado) iniciarTimer(); }
    else app.innerHTML = cabecalho + telaResultadoCorrida();
  }

  function telaAcerto() {
    const fds = estado.fds;
    const treino = fds.sessao === 'treino';
    const restantes = C.SAIDAS_TREINO - fds.saidas.length;
    const saidas = fds.saidas.slice().reverse();
    return `<div class="corrida">
      <div>
        <div class="painel" style="margin-bottom:16px">
          <h3>${treino ? 'Treino livre · manhã' : 'Classificação · tarde'}</h3>
          <p style="margin-top:-4px">${condicaoTexto(treino ? 'treino' : 'quali')}</p>
          ${editorSetup()}
          <h3 style="margin-top:14px">Pneus</h3>
          ${tabelaPneus(true)}
          <div class="linha" style="margin-top:12px">
            ${treino
              ? `<button class="principal" data-acao="saida" ${restantes ? '' : 'disabled'}>Sair para a pista (${restantes} saída${restantes === 1 ? '' : 's'})</button>
                 <button data-acao="ir-quali">Encerrar treino</button>`
              : '<button class="principal" data-acao="classificar">Classificar com este acerto</button>'}
            <button data-acao="sugestao" ${fds.sugestaoUsada ? 'disabled' : ''}>Pedir acerto ao mecânico${fds.sugestaoUsada ? ' (já usado)' : ''}</button>
          </div>
          ${!treino && (estado.pneus.find((p) => p.id === fds.pneuId) || { uso: 0 }).uso > 15 ? '<p class="aviso">Esse jogo de pneus já está gasto para uma bateria inteira.</p>' : ''}
          ${!treino ? '<p class="fraco" style="font-size:13px">O acerto e o pneu da classificação são os mesmos da corrida. No kart não tem pit stop: se chover no meio da bateria, você fica com o que escolheu.</p>' : ''}
        </div>
      </div>
      <div class="painel">
        <h3>Rádio do treino</h3>
        ${saidas.length ? saidas.map((s, i) => `<div class="saida">
          <div class="linha"><b>Saída ${saidas.length - i}</b><span class="espaco"></span><b>${tempoVolta(s.tempo)}</b><span class="${s.posicao <= 3 ? 'dinheiro' : 'fraco'}">P${s.posicao}${s.diferenca > 0.001 ? ` · +${s.diferenca.toFixed(3)}` : ''}</span></div>
          <div class="fraco" style="font-size:12px">${Kart.PNEUS_KART[s.pneu].nome} · ${esc(Kart.descreverSetup(s.setup))}</div>
          ${s.frases.map((f) => `<div class="fala">“${esc(f)}”</div>`).join('')}
          <div class="mecanico">${esc(s.dica)}</div>
        </div>`).join('') : `<p class="fraco">Ajuste o kart e saia para a pista. Depois de cada saída o piloto conta o que sentiu e o mecânico dá um palpite.
          Mas cuidado: a tarde costuma ser mais quente que a manhã.</p>`}
      </div>
    </div>`;
  }

  function telaGrid() {
    const fds = estado.fds;
    const pole = fds.quali[0].tempo;
    const meu = fds.quali.findIndex((q) => q.id === 'jogador') + 1;
    const mudou = fds.pneuId !== fds.pneuCorrida || Kart.ORDEM_AJUSTES.some((k) => fds.setup[k] !== fds.setupCorrida[k]);
    const pneu = estado.pneus.find((p) => p.id === fds.pneuId);
    return `<div class="corrida">
      <div class="painel">
        <div class="linha"><h3 style="margin:0">Largando em P${meu}</h3><span class="espaco"></span><button class="principal" data-acao="largar">Largar!</button></div>
        <p>${condicaoTexto('quali')}</p>
        <p class="fraco" style="font-size:13px">Antes da largada dá para mexer no kart e trocar o pneu. Na corrida o asfalto tem mais borracha que na classificação.
          ${mudou ? '<b class="aviso">Acerto alterado desde a classificação.</b>' : 'Por enquanto, o mesmo acerto da classificação.'}</p>
        ${editorSetup()}
        <h3 style="margin-top:14px">Pneus</h3>
        ${tabelaPneus(true)}
        ${pneu && pneu.uso > 15 ? '<p class="aviso">Esse jogo de pneus já está gasto para uma bateria inteira.</p>' : ''}
        <div class="linha" style="margin-top:12px">
          ${mudou ? '<button data-acao="desfazer-grid">Voltar ao acerto da classificação</button>' : ''}
          <button data-acao="sugestao" ${fds.sugestaoUsada ? 'disabled' : ''}>Pedir acerto ao mecânico${fds.sugestaoUsada ? ' (já usado)' : ''}</button>
        </div>
      </div>
      <div class="painel tabela-rolagem"><h3>Grid de largada</h3>
        <table><tr><th>Pos</th><th>Piloto</th><th class="num">Tempo</th><th class="num">Dif.</th></tr>
        ${fds.quali.map((q, i) => {
          const eqId = q.id === 'jogador' ? estado.equipeId : estado.rivais.find((r) => r.id === q.id).equipe;
          const eq = C.equipeBase(eqId);
          return `<tr class="${q.id === 'jogador' ? 'jogador' : ''}"><td>${i + 1}</td><td><span class="cor" style="background:${eq.cor}"></span>${esc(C.nomeDe(estado, q.id))}</td>
            <td class="num">${tempoVolta(q.tempo)}</td><td class="num">${i ? '+' + (q.tempo - pole).toFixed(3) : ''}</td></tr>`;
        }).join('')}</table></div>
    </div>`;
  }

  function htmlCorrida() {
    return `<div class="corrida">
      <div class="painel">
        <div class="linha" style="margin-bottom:10px">
          <span id="volta" class="fraco"></span><span id="clima-corrida"></span><span class="espaco"></span>
          <button data-acao="play" id="btn-play"></button>
          ${VELOCIDADES.map((v, i) => `<button data-acao="velocidade" data-i="${i}" class="${tela.vel === i ? 'ativo' : ''}">${v.nome}</button>`).join('')}
          <button data-acao="pular">Pular para o fim</button>
        </div>
        <div class="tabela-rolagem" id="tabela"></div>
      </div>
      <div>
        <div class="painel" style="margin-bottom:16px">
          <h3>Pilotagem</h3>
          <div id="info-jogador" class="fraco" style="margin-bottom:8px"></div>
          <div class="linha">${Object.entries(Engine.MODOS).map(([k, m]) => `<button data-acao="modo" data-modo="${k}">${m.nome}</button>`).join('')}</div>
          <p class="fraco" style="font-size:13px">Atacar ganha tempo, mas gasta pneu e arrisca rodar. Poupar segura o pneu para o fim.</p>
        </div>
        <div class="painel"><h3>Corrida</h3><div class="eventos" id="eventos"></div></div>
      </div>
    </div>`;
  }

  function atualizarCorrida() {
    const ordem = corrida.carros.slice().sort((a, b) => a.pos - b.pos);
    const lider = ordem[0];
    document.getElementById('volta').textContent = corrida.volta === 0 ? 'Grid de largada' : `Volta ${corrida.volta}/${corrida.totalVoltas}`;
    document.getElementById('clima-corrida').innerHTML = corrida.molhado ? '<span class="sc">🌧 PISTA MOLHADA</span>' : '';
    document.getElementById('btn-play').textContent = corrida.terminou ? 'Ver resultado' : tela.pausado ? '▶ Continuar' : '❚❚ Pausar';
    document.getElementById('tabela').innerHTML = `<table>
      <tr><th>Pos</th><th>Piloto</th><th class="num">Dif.</th><th>Pneu</th><th class="num">Última</th></tr>
      ${ordem.map((c) => {
        const ganho = c.largada - c.pos;
        const dif = c.fora ? c.motivoFora : c === lider ? '' : `+${(c.tempo - lider.tempo).toFixed(1)}`;
        return `<tr class="${c.jogador ? 'jogador' : ''} ${c.fora ? 'fora' : ''}">
          <td>${c.pos} <span class="fraco" style="font-size:11px">${ganho > 0 ? '▲' + ganho : ganho < 0 ? '▼' + -ganho : ''}</span></td>
          <td><span class="cor" style="background:${c.equipe.cor}"></span>${esc(c.piloto.nome)}</td>
          <td class="num">${esc(dif)}</td><td>${Kart.PNEUS_KART[c.tipoPneu].nome}</td>
          <td class="num fraco">${tempoVolta(c.ultimaVolta)}</td></tr>`;
      }).join('')}</table>`;
    document.getElementById('eventos').innerHTML = corrida.eventos.slice().reverse().slice(0, 60)
      .map((e) => `<div class="ev-${e.tipo} ${e.carroId === 'jogador' ? 'ev-jogador' : ''}"><span class="v">V${e.volta}</span>${esc(e.texto)}</div>`).join('');
    const eu = corrida.carros.find((c) => c.jogador);
    document.getElementById('info-jogador').textContent = eu.fora
      ? `Fora da corrida: ${eu.motivoFora}`
      : `P${eu.pos} · pneu ${Math.round((eu.uso / 26) * 100)}% gasto`;
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

  function telaResultadoCorrida() {
    const fds = estado.fds;
    const r = fds.resultado;
    return `<div class="grade">
      <div class="painel tabela-rolagem"><h3>Resultado</h3>
        <table><tr><th>Pos</th><th>Piloto</th><th class="num">Dif.</th><th class="num">Pts</th></tr>
        ${fds.classificacao.map((x) => `<tr class="${x.id === 'jogador' ? 'jogador' : ''} ${x.fora ? 'fora' : ''}">
          <td>${x.fora ? 'NC' : x.pos}</td><td><span class="cor" style="background:${C.equipeBase(x.equipe).cor}"></span>${esc(C.nomeDe(estado, x.id))}</td>
          <td class="num">${x.fora ? esc(x.motivo) : x.pos === 1 ? 'Vencedor' : '+' + x.dif.toFixed(1) + 's'}</td><td class="num"><b>${x.pontos || ''}</b></td></tr>`).join('')}
        </table></div>
      <div class="painel">
        <h2>${r.fora ? `Abandono: ${esc(r.motivo)}` : `P${r.pos}${r.pos === 1 ? ' · VITÓRIA!' : r.pos <= 3 ? ' · pódio!' : ''}`}</h2>
        ${r.eventos.map((e) => `<p class="aviso">${esc(e)}</p>`).join('')}
        <p>${r.pontos} pontos · campeonato: <b>P${C.posicaoNoCampeonato(estado)}</b></p>
        <p>Entrou no caixa: <b class="dinheiro">${reais(r.ganho)}</b>${r.patrocinio ? ` (patrocínio ${reais(r.patrocinio)})` : ''}</p>
        ${r.olheiros.length ? `<p class="fraco">Olheiros assistindo: ${r.olheiros.map(esc).join(', ')}</p>` : ''}
        <button class="principal" data-acao="voltar-paddock">Voltar ao paddock</button>
      </div>
    </div>`;
  }

  // ---------- fim de temporada ----------
  function telaRelatorio() {
    const r = estado.relatorio;
    const camp = C.campeonato(r.campeonato);
    const escolha = tela.proximo || r.opcoes[r.opcoes.length - 1];
    app.innerHTML = `
      <h1>Fim de temporada ${r.ano}</h1>
      <div class="grade">
        <div class="painel"><h3>${esc(camp.nome)}</h3>
          <h2>P${r.pos} · ${r.pontos} pts</h2><p>Campeão: <b>${esc(r.campeao)}</b></p>
          ${r.evolucao.length ? `<h3 style="margin-top:12px">Evolução do piloto</h3>${r.evolucao.map((x) => `<div>${C.NOMES_ATRIBUTOS[x.a]}: ${x.antes} → <b>${x.depois}</b></div>`).join('')}` : ''}
        </div>
        <div class="painel"><h3>Dinheiro</h3>
          ${r.premios.map((p) => `<div>${esc(p.texto)}: <b class="dinheiro">+${reais(p.valor)}</b></div>`).join('')}
          ${r.bonus.map((b) => `<div>${esc(b.empresa)} (${esc(b.meta)}): ${b.cumpriu ? `<b class="dinheiro">+${reais(b.valor)}</b>` : '<span class="fraco">meta não cumprida</span>'}</div>`).join('')}
          <p>Caixa: <b>${reais(estado.dinheiro)}</b></p>
          <p class="fraco" style="font-size:13px">No começo de cada temporada a família ajuda com ${reais(C.APOIO_FAMILIA)} (mais nos campeonatos caros).</p>
        </div>
        ${estado.propostas.length ? `<div class="painel destaque"><h3>Propostas para sair do kart!</h3>
          ${estado.propostas.map((p) => `<div class="oferta"><b>${esc(p.nome)}</b><div>${esc(p.texto)}</div>
            <button class="principal" data-acao="aceitar-proposta" data-id="${p.id}">Aceitar e subir para a F4</button></div>`).join('')}</div>` : ''}
        <div class="painel"><h3>Próximo ano</h3>
          ${r.opcoes.map((id) => {
            const c = C.campeonato(id);
            return `<label class="opcao"><input type="radio" name="proximo" data-acao="proximo" data-id="${id}" ${escolha === id ? 'checked' : ''}>
              <span><b>${esc(c.nome)}</b>${id === r.campeonato ? ' (repetir)' : ' (subir!)'}<br><span class="fraco">custos ×${c.custo} · rivais mais fortes${c.regiao === 'eu' ? ' · na Europa' : ''}</span></span></label>`;
          }).join('')}
          ${r.opcoes.length === 1 ? '<p class="fraco" style="font-size:13px">Para subir de campeonato: terminar no top 3 ou ganhar popularidade.</p>' : ''}
          <button class="principal" data-acao="nova-temporada">Começar ${estado.ano}</button>
        </div>
      </div>`;
  }

  function telaF4() {
    const f = estado.final;
    const vitorias = estado.historico.filter((h) => !h.fora && h.pos === 1).length;
    app.innerHTML = `<div class="painel destaque" style="max-width:720px">
      <h1>🏁 Rumo à Fórmula 4!</h1>
      <p><b>${esc(estado.piloto.nome)}</b> assinou com <b>${esc(f.proposta.nome)}</b> aos ${f.idade} anos e deixa o kart.</p>
      <p>${estado.historico.length} corridas de kart · ${vitorias} vitória(s) · ${reais(estado.dinheiro)} em caixa.</p>
      <p class="fraco">A fase dos monopostos (F4, F3, F2 e a Superlicença) é o próximo capítulo do jogo.</p>
      <button data-acao="abandonar">Começar outra carreira</button>
    </div>`;
  }

  function telaFalencia() {
    app.innerHTML = `<div class="painel" style="max-width:640px">
      <h1>Fim da linha</h1>
      <p>Sem dinheiro para mais uma temporada, ${esc(estado.piloto.nome)} pendura o capacete aos ${estado.piloto.idade} anos.</p>
      <p>${estado.historico.length} corridas · ${estado.historico.filter((h) => !h.fora && h.pos === 1).length} vitória(s).</p>
      <button class="principal" data-acao="abandonar">Começar outra carreira</button>
    </div>`;
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
      case 'escolher-equipe':
        tela.nomePiloto = document.getElementById('nome-piloto').value;
        tela.equipe = id;
        render();
        break;
      case 'novo-jogo': {
        const nome = document.getElementById('nome-piloto').value.trim() || 'Piloto';
        estado = C.novoJogo({ nome, equipeId: tela.equipe });
        salvar();
        ir(telaDaFase());
        break;
      }
      case 'continuar':
        estado = carregar();
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
