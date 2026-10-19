// Interface do jogo no navegador.
(function () {
  'use strict';

  const Dados = window.BoxDados;
  const Engine = window.BoxEngine;
  const Jogo = window.BoxJogo;
  const CHAVE_SAVE = 'boxbox-carreira-v1';
  const VELOCIDADES = [{ nome: '1×', ms: 1000 }, { nome: '2×', ms: 400 }, { nome: '5×', ms: 150 }];

  const app = document.getElementById('app');
  const statusEl = document.getElementById('status');

  let estado = null;
  let tela = { nome: 'inicio' };
  let timer = null;

  // ---------- utilidades ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const din = (x) => (Math.abs(x) >= 1 ? `€${x.toFixed(2)}M` : `€${Math.round(x * 1000)}k`);
  const nomeCat = (id) => (id === 'f1' ? 'Fórmula 1' : Jogo.categoria(id).nome);

  function estrelas(est) {
    const n = Math.max(0.5, Math.min(5, Math.round(((est - 55) / 8) * 2) / 2));
    return `<span class="estrelas" title="Potencial estimado pelos olheiros">${'★'.repeat(Math.floor(n))}${n % 1 ? '½' : ''}</span>`;
  }

  function tempoVolta(s) {
    if (s == null) return '—';
    const m = Math.floor(s / 60);
    return `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}`;
  }

  function seloPneu(c) {
    const p = Engine.PNEUS[c];
    return `<span class="pneu" style="border-color:${p.cor}" title="${p.nome}">${c === 'Md' ? 'M' : c === 'M' ? 'S' : 'H'}</span>`;
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

  function ir(nova) {
    if (timer) { clearInterval(timer); timer = null; }
    tela = nova;
    render();
    window.scrollTo(0, 0);
  }

  // Tela padrão de acordo com a fase do jogo.
  function telaDaFase() {
    if (!estado) return { nome: 'inicio' };
    if (estado.fase === 'pretemporada') return { nome: 'escritorio', aba: 'pilotos' };
    if (estado.fase === 'temporada') return { nome: 'temporada', aba: 'etapa' };
    return { nome: estado.fase };
  }

  function atualizarStatus() {
    if (!estado) { statusEl.innerHTML = ''; return; }
    const ac = estado.academia;
    const quando = estado.fase === 'temporada' ? `Etapa ${Math.min(estado.etapa + 1, Jogo.ETAPAS)}/${Jogo.ETAPAS}` : 'Pré-temporada';
    statusEl.innerHTML = `<b>${esc(ac.nome)}</b> · ${estado.ano} · ${quando} · <span class="${ac.dinheiro < 0 ? 'negativo' : 'dinheiro'}">${din(ac.dinheiro)}</span> · Reputação <b>${Math.round(ac.reputacao)}</b> · Na F1: <b>${ac.pilotosF1}</b>`;
  }

  function render() {
    atualizarStatus();
    const telas = {
      inicio: telaInicio, escritorio: telaEscritorio, temporada: telaTemporada, classificacao: telaClassificacao,
      corrida: telaCorrida, relatorio: telaRelatorio, falencia: telaFalencia,
    };
    telas[tela.nome]();
  }

  function abas(lista) {
    return `<div class="abas">${lista.map(([id, nome]) => `<button data-acao="aba" data-aba="${id}" class="${tela.aba === id ? 'ativo' : ''}">${nome}</button>`).join('')}</div>`;
  }

  // ---------- início ----------
  function telaInicio() {
    const save = carregar();
    app.innerHTML = `
      <div class="painel" style="max-width:720px">
        <h1>Sua academia de pilotos</h1>
        <p>Você não pilota: você <b>descobre talentos no kart</b>, paga as vagas nas equipes, busca patrocinadores
        e decide quando cada piloto sobe de categoria. A meta é colocar pilotos na <b>Fórmula 1</b>.</p>
        <p class="fraco">Para chegar à F1, o piloto precisa da <b>Superlicença</b>: ${Dados.PONTOS_SUPERLICENCA} pontos somando os últimos 3 anos
        (ganhos com boas posições na F4, F3 e F2) e pelo menos ${Dados.IDADE_MIN_F1} anos. E uma equipe precisa querer ele.</p>
        ${save ? `<p><button class="principal" data-acao="continuar">Continuar: ${esc(save.academia.nome)} (${save.ano})</button></p><hr style="border-color:var(--borda)">` : ''}
        <div class="campo"><label>Nome da academia</label><input type="text" id="nome-academia" value="Academia Box Box" maxlength="40"></div>
        <div class="campo"><label>Dinheiro inicial</label>
          <div class="linha">${Object.entries(Jogo.DIFICULDADES).map(([id, d]) => `<button data-acao="dificuldade" data-id="${id}" class="${(tela.dificuldade || 'normal') === id ? 'ativo' : ''}">${d.nome} · ${din(d.dinheiro)}</button>`).join('')}</div>
        </div>
        <p style="margin-top:16px"><button class="principal" data-acao="novo-jogo">Começar</button></p>
      </div>`;
  }

  // ---------- cartões de piloto ----------
  function infoPiloto(p) {
    const sl = Jogo.superlicenca(p, estado.ano - 1); // anos já encerrados
    const pctSl = Math.min(100, (sl / Dados.PONTOS_SUPERLICENCA) * 100);
    const ultimo = p.historico[p.historico.length - 1];
    return `
      <div class="linha"><span class="etiqueta ${p.categoria === 'f1' ? 'f1' : ''}">${nomeCat(p.categoria)}</span>
        <span>${p.idade} anos · ${p.pais}</span><span class="espaco"></span>
        <span>Nota <b>${Jogo.nota(p)}</b></span>${p.estimativa != null ? estrelas(p.estimativa) : ''}</div>
      ${Jogo.ATRIBUTOS.map((a) => `<div class="barra"><span>${Jogo.NOMES_ATRIBUTOS[a]}</span><span class="trilho"><i style="width:${p[a]}%"></i></span><b>${p[a]}</b></div>`).join('')}
      <div class="linha" style="margin-top:6px;font-size:13px">
        <span>Popularidade <b>${Math.round(p.popularidade)}</b></span>
        <span>Família: <b>${p.dinheiroFamilia ? din(p.dinheiroFamilia) + '/ano' : 'sem recursos'}</b></span>
      </div>
      ${p.categoria !== 'f1' ? `<div style="font-size:13px;margin-top:6px">Superlicença: <b>${sl}</b>/${Dados.PONTOS_SUPERLICENCA}
        <div class="progresso"><i style="width:${pctSl}%"></i></div></div>` : ''}
      ${ultimo ? `<div class="fraco" style="font-size:13px">${ultimo.ano}: P${ultimo.pos} na ${nomeCat(ultimo.categoria)} (${esc(ultimo.equipe)}) · ${ultimo.vitorias} vitória(s)</div>` : ''}`;
  }

  function cartaoPlanejamento(p) {
    if (p.categoria === 'f1') {
      return `<div class="painel cartao-piloto"><h2>${esc(p.nome)}</h2>${infoPiloto(p)}
        <p>🏁 Piloto da <b>${esc(p.f1.equipe)}</b> desde ${p.f1.estreia} · salário ${din(p.f1.salario)}/ano · você recebe ${Math.round(Jogo.COMISSAO_F1 * 100)}% (${din(p.f1.salario * Jogo.COMISSAO_F1)}).</p></div>`;
    }
    const cats = Jogo.categoriasPossiveis(p);
    const plano = p.plano || {};
    const ofertas = estado.ofertas[p.id] || [];
    const opcoesEquipe = cats.map((c) => `<optgroup label="${c.nome}${c.id !== p.categoria ? ' (subir)' : ''}">
      ${estado.equipes[c.id].map((eq) => {
        const custo = Jogo.custoParaAcademia(estado, eq, p);
        const forca = Math.round((eq.carro.motor + eq.carro.aero + eq.carro.chassi) / 3);
        return `<option value="${eq.id}" ${plano.equipe === eq.id ? 'selected' : ''}>${esc(eq.nome)} · carro ${forca} · ${din(custo)}</option>`;
      }).join('')}</optgroup>`).join('');
    const catPlano = plano.equipe ? Jogo.categoria(Jogo.equipe(estado, plano.equipe).categoria) : null;
    const esperado = catPlano ? Jogo.posicaoEsperada(p, catPlano) : null;
    return `<div class="painel cartao-piloto">
      <div class="linha"><h2>${esc(p.nome)}</h2><span class="espaco"></span><button data-acao="dispensar" data-id="${p.id}">Dispensar</button></div>
      ${infoPiloto(p)}
      <div class="campo"><label>Vaga para ${estado.ano} (custo para você, já descontada a família)</label>
        <select data-acao="plano-equipe" data-id="${p.id}">
          <option value="">— Sem vaga (fica parado, evolui menos) —</option>${opcoesEquipe}
        </select>
        ${esperado ? `<div class="fraco" style="font-size:13px;margin-top:3px">Expectativa: brigar pelo ${esperado <= 3 ? 'título/pódio' : `top ${esperado}`} na ${catPlano.nome}.</div>` : ''}
        ${cats.length === 0 ? '<div class="aviso">Sem categoria disponível para a idade dele.</div>' : ''}
      </div>
      <div class="campo"><label>Patrocínio</label>
        ${ofertas.length ? ofertas.map((o, i) => `<label style="display:flex;gap:6px;text-transform:none;color:var(--texto);font-size:14px;margin:4px 0">
          <input type="checkbox" data-acao="oferta" data-id="${p.id}" data-i="${i}" ${plano.oferta === i ? 'checked' : ''}>
          <span><b>${esc(o.empresa)}</b>: ${din(o.valor)} · bônus ${din(o.bonus)} se ${Jogo.textoMeta(o.meta)}</span></label>`).join('')
          : '<div class="fraco" style="font-size:13px">Nenhuma empresa interessada ainda. Resultados e popularidade atraem patrocínio.</div>'}
      </div>
    </div>`;
  }

  // ---------- escritório (pré-temporada) ----------
  function telaEscritorio() {
    const conteudo = { pilotos: abaPilotos, observacao: abaObservacao, academia: abaAcademia, noticias: abaNoticias }[tela.aba]();
    const r = Jogo.resumoPretemporada(estado);
    app.innerHTML = `
      <h1>Pré-temporada ${estado.ano}</h1>
      ${abas([['pilotos', 'Meus pilotos'], ['observacao', `Observação (${estado.prospectos.length})`], ['academia', 'Academia'], ['noticias', 'Notícias']])}
      ${conteudo}
      <div class="barra-acao linha">
        <span>Vagas ${din(r.vagas)} · patrocínios +${din(r.receitas)} · estrutura ${din(r.estrutura)} →
          caixa no início: <b class="${r.saldo < 0 ? 'negativo' : 'dinheiro'}">${din(r.saldo)}</b></span>
        ${!r.cabe ? '<span class="aviso">Dinheiro não cobre as vagas escolhidas.</span>' : ''}
        <span class="espaco"></span>
        <button class="principal" data-acao="iniciar-temporada" ${r.cabe ? '' : 'disabled'}>Iniciar temporada ${estado.ano}</button>
      </div>`;
  }

  function abaPilotos() {
    const meus = Jogo.meusPilotos(estado).sort((a, b) => (a.categoria === 'f1') - (b.categoria === 'f1'));
    if (!meus.length) return '<div class="painel">Nenhum piloto na academia. Vá em <b>Observação</b> para contratar.</div>';
    return `<div class="pilotos">${meus.map(cartaoPlanejamento).join('')}</div>`;
  }

  function abaObservacao() {
    const linhas = estado.prospectos.map((pr) => {
      const p = Jogo.piloto(estado, pr.id);
      const bloqueado = estado.academia.reputacao < pr.reputacaoMin;
      return `<tr>
        <td><b>${esc(p.nome)}</b> <span class="fraco">${p.pais}</span></td>
        <td>${nomeCat(p.categoria)}</td><td class="num">${p.idade}</td><td class="num">${Jogo.nota(p)}</td>
        <td>${estrelas(p.estimativa)}</td>
        <td>${p.dinheiroFamilia ? din(p.dinheiroFamilia) + '/ano' : '—'}</td>
        <td class="num">${din(pr.custo)}</td>
        <td>${bloqueado ? `<span class="aviso">Exige reputação ${pr.reputacaoMin}</span>` : `<button data-acao="contratar" data-id="${p.id}">Contratar</button>`}</td></tr>`;
    }).join('');
    return `<div class="painel tabela-rolagem">
      <p class="fraco" style="margin-top:0">As estrelas são a estimativa dos seus olheiros para o <b>potencial</b> do piloto (nível ${estado.academia.olheiros}/3: ${['margem de erro grande', 'erro moderado', 'boa precisão', 'muito precisa'][estado.academia.olheiros]}).
      Família com dinheiro ajuda a pagar as vagas. Quem você não contratar vira rival nas pistas.</p>
      <table><tr><th>Piloto</th><th>Categoria</th><th class="num">Idade</th><th class="num">Nota</th><th>Potencial</th><th>Família</th><th class="num">Luvas</th><th></th></tr>${linhas}</table>
    </div>`;
  }

  function abaAcademia() {
    const ac = estado.academia;
    const niveis = Object.entries(Jogo.NIVEIS).map(([id, n]) => {
      const custo = n.custos[ac[id]];
      return `<div style="margin-bottom:12px"><b>${n.nome}</b>: nível ${ac[id]}/3<br><span class="fraco">${n.descricao}</span><br>
        ${custo != null ? `<button data-acao="melhorar" data-tipo="${id}" ${ac.dinheiro < custo ? 'disabled' : ''}>Melhorar · ${din(custo)}</button>` : '<span class="fraco">Nível máximo</span>'}</div>`;
    }).join('');
    const ex = estado.pilotos.filter((p) => p.academia && (p.aposentado || p.categoria === 'f1'));
    return `<div class="grade">
      <div class="painel"><h3>Estrutura</h3>${niveis}
        <p class="fraco">Manutenção: ${din(Jogo.MANUTENCAO_NIVEL)} por nível por ano. Custo fixo: ${din(Jogo.CUSTO_ESTRUTURA)}/ano.
        Escola de pilotagem rende ${din(Jogo.receitaEscola(ac.reputacao))}/ano (cresce com a reputação).</p></div>
      <div class="painel"><h3>Conquistas</h3>
        <p>Títulos: <b>${ac.titulos}</b> · Pilotos na F1: <b>${ac.pilotosF1}</b></p>
        ${ex.length ? ex.map((p) => `<div>${p.categoria === 'f1' && !p.aposentado ? '🏁' : '·'} ${esc(p.nome)}: ${p.f1 ? `F1 pela ${esc(p.f1.equipe)} (${p.f1.estreia})` : 'encerrou a carreira'}</div>`).join('') : '<p class="fraco">Nenhum ex-piloto ainda.</p>'}
      </div>
      <div class="painel"><p><button data-acao="abandonar">Apagar jogo e recomeçar</button></p></div>
    </div>`;
  }

  function abaNoticias() {
    return `<div class="painel noticias">${estado.noticias.map((n) => `<div><span class="fraco">${n.ano}</span> · ${esc(n.texto)}</div>`).join('') || 'Sem notícias.'}</div>`;
  }

  // ---------- temporada ----------
  function telaTemporada() {
    const conteudo = { etapa: abaEtapa, campeonatos: abaCampeonatos, meus: abaMeus, noticias: abaNoticias }[tela.aba]();
    app.innerHTML = `
      <h1>Temporada ${estado.ano}</h1>
      ${abas([['etapa', `Etapa ${estado.etapa + 1}/${Jogo.ETAPAS}`], ['campeonatos', 'Campeonatos'], ['meus', 'Meus pilotos'], ['noticias', 'Notícias']])}
      ${conteudo}`;
  }

  function abaEtapa() {
    tela.corridas = tela.corridas || {};
    const cats = Jogo.categoriasComPilotos(estado);
    const ultima = estado.resultados[estado.resultados.length - 1];
    const blocos = cats.map((c) => {
      const pista = Jogo.pistaDaEtapa(estado, c.id);
      const feita = tela.corridas[c.id] && tela.corridas[c.id].terminou;
      const meus = Jogo.meusPilotos(estado).filter((p) => p.categoria === c.id && p.equipe).map((p) => esc(p.nome)).join(', ');
      let resultado = '';
      if (feita) {
        resultado = tela.corridas[c.id].carros.filter((x) => x.jogador)
          .map((x) => `${esc(x.piloto.nome)}: ${x.fora ? 'abandonou' : 'P' + x.pos}`).join(' · ');
      }
      return `<div class="painel"><h3>${esc(pista.nome)}</h3><p class="fraco" style="margin-top:-6px">${esc(pista.circuito)} · ${pista.voltas} voltas · ${meus}</p>
        ${feita ? `<p>✔ ${resultado}</p>` : `<button data-acao="assistir" data-cat="${c.id}">Assistir e comandar</button>`}</div>`;
    }).join('');
    const ultimoTxt = ultima ? `<div class="painel"><h3>Etapa anterior</h3>${Object.entries(ultima.categorias).map(([cat, r]) => `<div><b>${nomeCat(cat)}</b>: vitória de ${esc(Jogo.piloto(estado, r.podio[0]).nome)}${r.meus.length ? ' · ' + r.meus.map((m) => `${esc(Jogo.piloto(estado, m.id).nome)} ${m.fora ? 'abandonou' : 'P' + m.pos}`).join(', ') : ''}</div>`).join('')}</div>` : '';
    return `<div class="grade">${blocos || '<div class="painel">Nenhum piloto seu correndo este ano.</div>'}${ultimoTxt}</div>
      <div class="barra-acao linha"><span class="fraco">Corridas que você não assistir são simuladas.</span><span class="espaco"></span>
        <button class="principal" data-acao="concluir-etapa">${estado.etapa + 1 === Jogo.ETAPAS ? 'Concluir etapa e encerrar temporada' : 'Concluir etapa'}</button></div>`;
  }

  function abaCampeonatos() {
    const catAtiva = tela.cat || (Jogo.categoriasComPilotos(estado)[0] || Dados.CATEGORIAS[0]).id;
    const tabela = Jogo.classificacaoCategoria(estado, catAtiva);
    return `<div class="abas">${Dados.CATEGORIAS.map((c) => `<button data-acao="cat" data-cat="${c.id}" class="${c.id === catAtiva ? 'ativo' : ''}">${c.nome}</button>`).join('')}</div>
      <div class="painel tabela-rolagem"><table>
        <tr><th>#</th><th>Piloto</th><th>Equipe</th><th class="num">Idade</th><th class="num">V</th><th class="num">Pód.</th><th class="num">Pts</th><th class="num">SL</th></tr>
        ${tabela.map((p, i) => {
          const eq = Jogo.equipe(estado, p.equipe);
          const sl = Jogo.categoria(catAtiva).superlicenca[i] || 0;
          return `<tr class="${p.academia ? 'jogador' : ''}"><td>${i + 1}</td>
            <td><span class="cor" style="background:${eq.cor}"></span>${esc(p.nome)} <span class="fraco">${p.pais}</span></td>
            <td class="fraco">${esc(eq.nome)}</td><td class="num">${p.idade}</td><td class="num">${p.vitorias}</td><td class="num">${p.podios}</td>
            <td class="num"><b>${p.pontos}</b></td><td class="num fraco">${sl || ''}</td></tr>`;
        }).join('')}
      </table><p class="fraco" style="font-size:13px">SL = pontos de Superlicença que a posição vale no fim do ano.</p></div>`;
  }

  function abaMeus() {
    const meus = Jogo.meusPilotos(estado);
    return `<div class="pilotos">${meus.map((p) => {
      let extra = '';
      if (p.categoria === 'f1') extra = `<p>🏁 F1 pela <b>${esc(p.f1.equipe)}</b></p>`;
      else if (p.equipe) {
        const pos = Jogo.classificacaoCategoria(estado, p.categoria).indexOf(p) + 1;
        extra = `<p>${esc(Jogo.equipe(estado, p.equipe).nome)} · <b>P${pos}</b> no campeonato · ${p.pontos} pts</p>
          ${p.patrocinio ? `<p class="fraco" style="font-size:13px">${esc(p.patrocinio.empresa)}: bônus de ${din(p.patrocinio.bonus)} se ${Jogo.textoMeta(p.patrocinio.meta)}</p>` : ''}`;
      } else extra = '<p class="fraco">Sem vaga nesta temporada.</p>';
      return `<div class="painel cartao-piloto"><h2>${esc(p.nome)}</h2>${extra}${infoPiloto(p)}</div>`;
    }).join('')}</div>`;
  }

  // ---------- classificação e corrida ----------
  function telaClassificacao() {
    const { quali, cat } = tela;
    const categoria = Jogo.categoria(cat);
    const pole = quali[0].tempo;
    const meus = quali.filter((x) => x.entrada.jogador);
    const pista = Jogo.pistaDaEtapa(estado, cat);
    app.innerHTML = `
      <div class="grade">
        <div class="painel tabela-rolagem">
          <h3>Classificação · ${esc(pista.nome)}</h3>
          <table><tr><th>Pos</th><th>Piloto</th><th>Equipe</th><th class="num">Tempo</th><th class="num">Dif.</th></tr>
          ${quali.map((x, i) => `<tr class="${x.entrada.jogador ? 'jogador' : ''}"><td>${i + 1}</td>
            <td><span class="cor" style="background:${x.entrada.equipe.cor}"></span>${esc(x.entrada.piloto.nome)}</td>
            <td class="fraco">${esc(x.entrada.equipe.nome)}</td>
            <td class="num">${tempoVolta(x.tempo)}</td><td class="num">${i ? '+' + (x.tempo - pole).toFixed(3) : ''}</td></tr>`).join('')}
          </table>
        </div>
        <div class="painel">
          ${categoria.regraCompostos ? `<h3>Pneu de largada</h3>
          <p class="fraco">Na ${categoria.nome} é obrigatório usar dois compostos: haverá pelo menos um pit stop.</p>
          ${meus.map((x) => `<div class="box-piloto"><b>P${quali.indexOf(x) + 1} · ${esc(x.entrada.piloto.nome)}</b>
            <div class="linha">${Engine.ORDEM_PNEUS.map((c) => `<button class="pneu-btn ${tela.pneus[x.entrada.id] === c ? 'ativo' : ''}" data-acao="pneu-largada" data-id="${x.entrada.id}" data-pneu="${c}">${seloPneu(c)} ${Engine.PNEUS[c].nome}</button>`).join('')}</div>
            <div class="fraco" style="margin-top:6px;font-size:13px">Vida estimada: ${Engine.ORDEM_PNEUS.map((c) => `${Engine.PNEUS[c].nome} ~${Math.round(Engine.vidaPneu(c, x.entrada.piloto, pista))}v`).join(' · ')}</div>
          </div>`).join('')}`
          : `<h3>Seus pilotos</h3>${meus.map((x) => `<p>${esc(x.entrada.piloto.nome)} larga em <b>P${quali.indexOf(x) + 1}</b></p>`).join('')}
             <p class="fraco">Na ${categoria.nome} a corrida é sem pit stop obrigatório: administre o ritmo e o pneu.</p>`}
          <button class="principal" data-acao="largar">Largar!</button>
        </div>
      </div>`;
  }

  function telaCorrida() {
    const corrida = tela.corrida;
    const meus = corrida.carros.filter((c) => c.jogador);
    app.innerHTML = `
      <div class="corrida">
        <div class="painel">
          <div class="linha" style="margin-bottom:10px">
            <h2 style="margin:0">${esc(corrida.pista.nome)}</h2>
            <span id="volta" class="fraco"></span>
            <span id="sc"></span>
            <span class="espaco"></span>
            <button data-acao="play" id="btn-play"></button>
            ${VELOCIDADES.map((v, i) => `<button data-acao="velocidade" data-i="${i}" class="${tela.vel === i ? 'ativo' : ''}">${v.nome}</button>`).join('')}
            <button data-acao="pular">Pular para o fim</button>
          </div>
          <div class="tabela-rolagem" id="tabela"></div>
        </div>
        <div>
          <div class="painel" style="margin-bottom:16px">
            <h3>Rádio com os pilotos</h3>
            ${meus.map((c) => `<div class="box-piloto" data-carro="${c.id}">
              <b>${esc(c.piloto.nome)}</b> <span class="fraco" data-info></span>
              <div class="linha">${Object.entries(Engine.MODOS).map(([k, m]) => `<button data-acao="modo" data-id="${c.id}" data-modo="${k}">${m.nome}</button>`).join('')}</div>
              <div class="linha"><label><input type="checkbox" data-acao="auto" data-id="${c.id}" ${c.auto ? 'checked' : ''}> Estratégia automática</label></div>
              <div class="linha">BOX: ${Engine.ORDEM_PNEUS.map((p) => `<button class="pneu-btn" data-acao="box" data-id="${c.id}" data-pneu="${p}">${seloPneu(p)}</button>`).join('')}</div>
            </div>`).join('')}
            <p class="fraco" style="font-size:13px;margin:0">Atacar ganha ~0,25s/volta, mas gasta pneu e arrisca erro. Poupar faz o pneu durar mais.</p>
          </div>
          <div class="painel"><h3>Eventos</h3><div class="eventos" id="eventos"></div></div>
        </div>
      </div>`;
    atualizarCorrida();
    if (!corrida.terminou && !tela.pausado) iniciarTimer();
  }

  function atualizarCorrida() {
    const corrida = tela.corrida;
    const ordem = corrida.carros.slice().sort((a, b) => a.pos - b.pos);
    const lider = ordem[0];
    document.getElementById('volta').textContent = corrida.volta === 0 ? 'Grid de largada' : `Volta ${corrida.volta}/${corrida.totalVoltas}`;
    document.getElementById('sc').innerHTML = corrida.safetyCar > 0 ? '<span class="sc">SAFETY CAR</span>' : '';
    document.getElementById('btn-play').textContent = corrida.terminou ? 'Voltar à etapa' : tela.pausado ? '▶ Continuar' : '❚❚ Pausar';

    document.getElementById('tabela').innerHTML = `<table>
      <tr><th>Pos</th><th>Piloto</th><th class="num">Dif.</th><th>Pneu</th><th class="num">Desg.</th><th class="num">Box</th><th class="num">Última</th></tr>
      ${ordem.map((c) => {
        const ganho = c.largada - c.pos;
        let dif = '';
        if (c.fora) dif = c.motivoFora;
        else if (c !== lider) {
          const d = c.tempo - lider.tempo;
          dif = d > corrida.pista.tempoBase ? `+${Math.floor(d / corrida.pista.tempoBase)} volta(s)` : `+${d.toFixed(1)}`;
        }
        const desgaste = Math.round(c.uso / Engine.PNEUS[c.pneu].vida * 100);
        return `<tr class="${c.jogador ? 'jogador' : ''} ${c.fora ? 'fora' : ''}">
          <td>${c.pos} <span class="fraco" style="font-size:11px">${ganho > 0 ? '▲' + ganho : ganho < 0 ? '▼' + -ganho : ''}</span></td>
          <td><span class="cor" style="background:${c.equipe.cor}"></span>${esc(c.piloto.nome)}${c.penalidade ? ' <span class="aviso">+10s</span>' : ''}</td>
          <td class="num">${dif}</td>
          <td>${seloPneu(c.pneu)} <span class="fraco">${c.idadePneu}v</span></td>
          <td class="num" style="color:${desgaste > 100 ? '#ff6b6b' : desgaste > 80 ? 'var(--alerta)' : 'inherit'}">${desgaste}%</td>
          <td class="num">${c.paradas}</td>
          <td class="num fraco">${tempoVolta(c.ultimaVolta)}</td></tr>`;
      }).join('')}</table>`;

    const meusIds = new Set(corrida.carros.filter((c) => c.jogador).map((c) => c.id));
    document.getElementById('eventos').innerHTML = corrida.eventos.slice().reverse().slice(0, 80)
      .map((e) => `<div class="ev-${e.tipo} ${meusIds.has(e.carroId) ? 'ev-jogador' : ''}"><span class="v">V${e.volta}</span>${esc(e.texto)}</div>`).join('');

    for (const c of corrida.carros.filter((x) => x.jogador)) {
      const el = app.querySelector(`[data-carro="${c.id}"]`);
      if (!el) continue;
      el.querySelector('[data-info]').textContent = c.fora
        ? `· fora (${c.motivoFora})`
        : `· P${c.pos} · ${Engine.PNEUS[c.pneu].nome} ${c.idadePneu}v${c.boxPedido ? ` · BOX → ${Engine.PNEUS[c.boxPedido].nome}` : ''}${corrida.regraCompostos && c.usados.length < 2 ? ' · falta 2º composto' : ''}`;
      el.querySelectorAll('[data-acao="modo"]').forEach((b) => b.classList.toggle('ativo', b.dataset.modo === c.modo));
      el.querySelectorAll('button, input').forEach((b) => { b.disabled = c.fora || corrida.terminou; });
    }
  }

  function iniciarTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      Engine.passo(tela.corrida);
      atualizarCorrida();
      if (tela.corrida.terminou) { clearInterval(timer); timer = null; }
    }, VELOCIDADES[tela.vel].ms);
  }

  function voltarParaEtapa() {
    const corridas = tela.corridas;
    corridas[tela.cat] = tela.corrida;
    ir({ nome: 'temporada', aba: 'etapa', corridas });
  }

  // ---------- fim de temporada ----------
  function telaRelatorio() {
    const r = estado.relatorio;
    const nome = (id) => esc(Jogo.piloto(estado, id).nome);
    const variacao = r.dinheiroDepois - r.dinheiroAntes;
    app.innerHTML = `
      <h1>Balanço de ${r.ano}</h1>
      <div class="grade">
        <div class="painel"><h3>Seus pilotos</h3>
          ${r.meus.length ? r.meus.map((m) => `<div><b>${nome(m.id)}</b>: P${m.pos} na ${nomeCat(m.categoria)}${m.superlicenca ? ` · +${m.superlicenca} pts de Superlicença` : ''}</div>`).join('') : '<p class="fraco">Nenhum piloto correu.</p>'}
          ${r.f1.filter((id) => Jogo.piloto(estado, id).academia).map((id) => `<h2 style="margin-top:12px">🏁 ${nome(id)} vai para a Fórmula 1!</h2>`).join('')}
        </div>
        <div class="painel"><h3>Dinheiro</h3>
          <div class="resumo-financeiro">
            ${r.premios.map((p) => `<span>Prêmio: ${nome(p.id)} P${p.pos} ${nomeCat(p.categoria)}</span><span class="dinheiro">+${din(p.valor)}</span>`).join('')}
            ${r.bonus.map((b) => `<span>${esc(b.empresa)} (${b.meta})</span><span class="${b.cumpriu ? 'dinheiro' : 'fraco'}">${b.cumpriu ? '+' + din(b.bonus) : 'meta não cumprida'}</span>`).join('')}
            <span>Escola de pilotagem</span><span class="dinheiro">+${din(r.escola)}</span>
            ${r.receitaF1 ? `<span>Comissões da F1</span><span class="dinheiro">+${din(r.receitaF1)}</span>` : ''}
            <span class="total">Variação no fim do ano</span><span class="total ${variacao < 0 ? 'negativo' : 'dinheiro'}">${variacao >= 0 ? '+' : ''}${din(variacao)}</span>
          </div>
          <p>Reputação: ${Math.round(r.reputacaoAntes)} → <b>${r.reputacaoDepois}</b></p>
        </div>
        <div class="painel"><h3>Campeões ${r.ano}</h3>
          ${Dados.CATEGORIAS.map((c) => r.campeoes[c.id] ? `<div><b>${c.nome}</b>: ${nome(r.campeoes[c.id])}</div>` : '').join('')}
          ${r.f1.length ? `<h3 style="margin-top:12px">Contratados pela F1</h3>${r.f1.map((id) => `<div>${nome(id)} → ${esc(Jogo.piloto(estado, id).f1.equipe)}</div>`).join('')}` : ''}
        </div>
      </div>
      <div class="barra-acao linha"><span class="espaco"></span><button class="principal" data-acao="ir-pretemporada">Pré-temporada ${estado.ano}</button></div>`;
  }

  function telaFalencia() {
    const ac = estado.academia;
    app.innerHTML = `<div class="painel" style="max-width:640px">
      <h1>Falência</h1>
      <p>A ${esc(ac.nome)} fechou ${estado.ano - 1} com ${din(ac.dinheiro)} em caixa e encerrou as atividades.</p>
      <p>Títulos: <b>${ac.titulos}</b> · Pilotos levados à F1: <b>${ac.pilotosF1}</b></p>
      <button class="principal" data-acao="abandonar-sem-confirmar">Começar de novo</button>
    </div>`;
  }

  // ---------- ações ----------
  function erro(r) {
    if (r && !r.ok) alert(r.erro);
  }

  app.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('button[data-acao]');
    if (!alvo || alvo.disabled) return;
    const { acao, id } = alvo.dataset;
    const carro = (tela.corrida && id) ? tela.corrida.carros.find((c) => c.id === id) : null;

    switch (acao) {
      case 'dificuldade':
        tela.dificuldade = id;
        render();
        break;
      case 'novo-jogo': {
        const nome = document.getElementById('nome-academia').value.trim() || 'Academia Box Box';
        estado = Jogo.novoJogo({ nomeAcademia: nome, dificuldade: tela.dificuldade || 'normal' });
        salvar();
        ir(telaDaFase());
        break;
      }
      case 'continuar':
        estado = carregar();
        ir(telaDaFase());
        break;
      case 'abandonar':
        if (!confirm('Apagar o jogo salvo e recomeçar?')) break;
      // falls through
      case 'abandonar-sem-confirmar':
        apagarSave();
        estado = null;
        ir({ nome: 'inicio' });
        break;
      case 'aba':
        tela.aba = alvo.dataset.aba;
        render();
        break;
      case 'cat':
        tela.cat = alvo.dataset.cat;
        render();
        break;
      case 'contratar':
        erro(Jogo.contratar(estado, id));
        salvar();
        render();
        break;
      case 'dispensar':
        if (confirm(`Dispensar ${Jogo.piloto(estado, id).nome}? Ele vai embora da academia.`)) {
          Jogo.dispensar(estado, id);
          salvar();
          render();
        }
        break;
      case 'melhorar':
        erro(Jogo.melhorarAcademia(estado, alvo.dataset.tipo));
        salvar();
        render();
        break;
      case 'iniciar-temporada': {
        const r = Jogo.iniciarTemporada(estado);
        erro(r);
        if (r.ok) { salvar(); ir(telaDaFase()); }
        break;
      }
      case 'assistir': {
        const cat = alvo.dataset.cat;
        const { quali } = Jogo.prepararCorrida(estado, cat);
        const pneus = {};
        quali.filter((x) => x.entrada.jogador).forEach((x) => { pneus[x.entrada.id] = 'Md'; });
        ir({ nome: 'classificacao', cat, quali, pneus, corridas: tela.corridas || {} });
        break;
      }
      case 'pneu-largada':
        tela.pneus[id] = alvo.dataset.pneu;
        render();
        break;
      case 'largar': {
        const cat = Jogo.categoria(tela.cat);
        const { corrida } = Jogo.prepararCorrida(estado, cat.id, cat.regraCompostos ? tela.pneus : null);
        ir({ nome: 'corrida', cat: cat.id, corrida, corridas: tela.corridas, vel: 1, pausado: false });
        break;
      }
      case 'play':
        if (tela.corrida.terminou) return voltarParaEtapa();
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
        Engine.simularCompleta(tela.corrida);
        voltarParaEtapa();
        break;
      case 'modo':
        carro.modo = alvo.dataset.modo;
        atualizarCorrida();
        break;
      case 'box':
        carro.boxPedido = alvo.dataset.pneu;
        atualizarCorrida();
        break;
      case 'concluir-etapa':
        Jogo.concluirEtapa(estado, tela.corridas || {});
        salvar();
        ir(estado.fase === 'temporada' ? { nome: 'temporada', aba: 'etapa' } : telaDaFase());
        break;
      case 'ir-pretemporada':
        estado.fase = 'pretemporada';
        salvar();
        ir(telaDaFase());
        break;
    }
  });

  app.addEventListener('change', (ev) => {
    const el = ev.target;
    const { acao, id } = el.dataset;
    if (acao === 'auto') {
      tela.corrida.carros.find((c) => c.id === id).auto = el.checked;
    } else if (acao === 'plano-equipe') {
      erro(Jogo.planejar(estado, id, el.value || null));
      salvar();
      render();
    } else if (acao === 'oferta') {
      Jogo.escolherOferta(estado, id, +el.dataset.i);
      salvar();
      render();
    }
  });

  render();
})();
