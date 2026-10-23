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
  // Cabeçalho compacto: quando o cabeçalho grande sai da tela, esta barra fina fica fixa no topo,
  // rolando para cima ou para baixo, até o cabeçalho grande voltar a aparecer.
  const barraMini = document.createElement('div');
  barraMini.className = 'topo-mini';
  barraMini.setAttribute('aria-hidden', 'true');
  document.body.appendChild(barraMini);
  window.addEventListener('scroll', () => {
    if (document.body.classList.contains('fundo-travado')) return;
    const altura = document.querySelector('.topo').offsetHeight;
    const mostrar = window.scrollY > altura && estado && !document.body.classList.contains('sem-topo');
    barraMini.classList.toggle('visivel', !!mostrar);
  }, { passive: true });

  let estado = null;
  let tela = { nome: 'abertura' };
  let timer = null;
  let corrida = null; // a bateria em andamento não é salva

  // ---------- utilidades ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reais = (x) => `R$ ${Math.round(x).toLocaleString('pt-BR')}`;
  const tipoPista = { travada: ['grampo', 'Travada'], mista: ['onda', 'Mista'], veloz: ['vento', 'Veloz'] };
  const chipTipo = (tipo) => chip(`${ic(tipoPista[tipo][0])}${tipoPista[tipo][1]}`);

  function tempoVolta(s) {
    if (s == null || !isFinite(s)) return '—';
    const m = Math.floor(s / 60);
    return m ? `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}` : s.toFixed(3);
  }

  // O save mora no BoxSave (js/armazenamento.js): arquivo no iPhone, localStorage no navegador.
  function salvar() {
    encherCaixa();
    if (estado) avisarConquistas(C.conferirConquistas(estado));
    BoxSave.gravar(CHAVE_SAVE, JSON.stringify(estado));
  }
  function carregar() {
    try { return JSON.parse(BoxSave.ler(CHAVE_SAVE)); } catch (e) { return null; }
  }
  function apagarSave() {
    BoxSave.apagar(CHAVE_SAVE);
  }

  let timerAviso = null;
  function aviso(texto, nomeIcone) {
    const el = document.getElementById('aviso');
    el.innerHTML = `${nomeIcone ? ic(nomeIcone) : ''}${esc(texto)}`;
    el.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { el.hidden = true; }, 3500);
  }
  // Ação recusada: se for coisa do Premium, abre a tela do Premium em vez do aviso.
  const erro = (r) => {
    if (r && !r.ok) { if (r.premium) abrirPremium(r.erro); else aviso(r.erro); }
    return r && r.ok;
  };

  // Rola a tela até o que importa depois de uma ação (o resultado dela ou o próximo passo).
  // bloco: 'start' encosta no topo (abaixo da barra fixa), 'center' deixa no meio da tela.
  function rolarPara(alvo, bloco = 'start') {
    requestAnimationFrame(() => {
      const el = typeof alvo === 'string' ? app.querySelector(alvo) : alvo;
      if (el) el.scrollIntoView({ behavior: menosMovimento() ? 'auto' : 'smooth', block: bloco });
    });
  }
  const rolarAoTopo = () => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: menosMovimento() ? 'auto' : 'smooth' }));

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
    // Fim de temporada: primeiro o suspense e o resumo; o relatório (propostas, próximo ano) vem depois.
    if (estado.fase === 'relatorio' && estado.relatorio && !estado.relatorio.resumoVisto) return { nome: 'fimTemporada' };
    return { nome: estado.fase, aba: 'resumo' };
  }

  // ---------- ajuda: as explicações ficam atrás de um "?" ----------
  const AJUDAS = {
    jogo: ['Como jogar', 'Você é um piloto de kart de 12 anos e também o cabeça da carreira. Escolha a equipe, cuide do dinheiro, acerte o kart em cada pista e decida quais propostas aceitar. Meta: subir do kart à Fórmula 4, F3, F2 e chegar à Fórmula 1.'],
    equipe: ['Escolhendo a equipe', 'Kart diz quão rápido é o material; estrutura, quão confiável. O kart não vem com mecânico: você acerta sozinho e pode contratar um mecânico no fim de semana. A sobra é o que fica do caixa depois de pagar as 8 etapas: é com ela que você compra pneus e revisa o motor. As outras equipes podem te chamar depois, se você andar bem.'],
    etapa: ['Fim de semana', 'De manhã tem treino livre; à tarde, classificação e corrida. A tarde costuma ser mais quente, e o acerto que funcionou de manhã pode não servir.'],
    clima: ['Previsão do tempo', 'A chance de chuva é só previsão e pode errar. No kart não tem pit stop: o pneu que você escolher vai até a bandeirada.'],
    cabeca: ['Moral e confiança', 'Confiança é a cabeça na pista: alta dá ritmo e regularidade, baixa faz errar. Moral é a motivação: alta faz o piloto evoluir mais rápido e explicar melhor o que sente no kart. O psicólogo ajuda uma vez por etapa.'],
    oficina: ['Oficina', `Toque num jogo de pneus para vender, doar ou jogar fora: vender e doar só no fim da vida, com 80% gasto ou mais (o estoque começa com ${C.MAX_PNEUS} vagas; com o Premium dá para comprar mais, até 8 no kart e mais a cada categoria, até 16 na F1). Pneu zerado rende um pouco menos nas primeiras voltas: dá para amaciar no treino. Da F3 em diante é obrigatório ter o pneu de chuva e um composto de seco para correr (dois na F2 e na F1); o ideal são os quatro tipos, e na pista não se compra pneu. O motor conta horas de uso: cada saída, a classificação e a corrida somam. Passou de ${String(C.HORAS_REVISAO).replace('.', ',')} h sem revisão, ele perde força e fica frágil. Forçar o motor (carburação pobre demais ou dentes demais na coroa) pode engripá-lo, e a retífica é cara: a expressa deixa correr a etapa seguinte; a normal faz o piloto perder uma etapa.`],
    desafio: ['Desafio do dia', 'Todo dia, uma pista da sua categoria com uma condição fixa. São 3 voltas lançadas para achar o acerto, com o seu carro e o seu piloto; à meia-noite sai um desafio novo. O tempo-alvo é o da volta com o acerto perfeito: ouro fica a pouco mais de um décimo dele, prata a 0,4 s e bronze a 0,9 s. Cada medalha paga um prêmio: ouro vale uma etapa da sua equipe, prata metade e bronze um quarto (na F1, R$ 500 mil, 250 mil e 125 mil). Vale a melhor medalha do dia: quem sobe de bronze para ouro recebe a diferença. O ouro ainda rende popularidade. Sem o Premium, o primeiro desafio é grátis; depois, é do Premium.'],
    telemetria: ['Telemetria', 'Mostra em que trecho da volta o acerto está custando tempo: retas, freada, entrada, meio e saída de curva, curvas rápidas, zebras e aderência do pneu. Ela não diz para que lado mexer: isso continua com a sensibilidade do piloto e o mecânico.'],
    preparacao: ['Teto e preparação', 'Todo piloto tem um teto: perto dele, os atributos param de crescer. Os olheiros estimam esse teto, e a faixa fica mais precisa a cada temporada. Para brigar pelo título, a F2 pede atributos perto de 83 e a F1 perto de 87. O preparador físico e o simulador sobem o teto em 1 ponto por nível (até 2 níveis cada) e já melhoram dois atributos.'],
    desenvolvimento: ['Desenvolvimento do carro', 'Na F1, o dinheiro compra peças novas: aerodinâmica, motor e chassi, até 3 níveis cada. Cada nível soma 2 pontos na área do seu carro até o fim da temporada. No ano seguinte o carro é novo e o desenvolvimento recomeça.'],
    evolucao: ['Pontos de evolução', `O piloto melhora sozinho com a idade e as corridas, mas devagar. O resto vem dos pontos de evolução, ganhos no fim de cada temporada: ${C.pontosEvolucaoDa(99)} por disputar o ano, mais um bônus pela posição no campeonato (campeão +12, P2 +9, P3 +7, P4 +5, P5 a P10 +3) e +1 por vitória. Você escolhe onde investir: cada ponto vale +1 no atributo, até o limite do piloto. Especializar (chuva, largada, pneus...) ou equilibrar é com você.`],
    banco: ['Banco', `Empréstimo para investir no carro e na carreira (só com o Premium). O limite cresce com a categoria e com a popularidade. Você escolhe o prazo: ${Object.entries(C.PRAZOS_EMPRESTIMO).map(([p, j]) => `${p} etapas com ${Math.round(j * 100)}% de juros`).join(', ')}. A parcela sai do caixa ao fim de cada etapa; se não houver dinheiro, ela atrasa com multa de ${Math.round(C.MULTA_ATRASO * 100)}%, e a moral e a popularidade caem. Um empréstimo por vez; quitar antes do prazo dá desconto de metade dos juros que ainda não venceram.`],
    patrocinio: ['Patrocínio', 'Cada empresa paga por etapa. Você fecha por 3 meses, 6 meses ou a temporada toda: o contrato curto paga um pouco mais por etapa e, quando acaba, libera a vaga para outra empresa; só o da temporada tem meta, com bônus no fim do ano se ela for cumprida. Vitórias e pódios aumentam a popularidade e atraem empresas maiores. Cabem 2 patrocinadores no macacão; com o Premium, até 5.'],
    olheiros: ['Olheiros e propostas', 'Andar bem com olheiros assistindo traz propostas. Piloto de fábrica não paga nada, mas pode receber ordem para deixar o companheiro passar. Desconfie de equipe que promete demais.'],
    setup: ['Acerto do kart', 'Pressão: como o pneu esquenta. Eixo e bitola traseira: aderência da traseira. Bitola dianteira: como o kart entra na curva. Altura do banco: quanto peso o kart transfere nas curvas. Relação: força na saída × velocidade na reta. Carburação: mistura do motor (pobre demais pode engripar). O acerto ideal muda com a pista, o calor e a chuva, e ninguém te conta qual é.'],
    radio: ['Rádio', 'Depois de cada saída, o piloto conta o que sentiu. Pilotos experientes e motivados descrevem melhor o problema. Quando ele fala em dúvida (\"acho que…\", \"não tenho certeza…\"), desconfie: muitas vezes está sentindo a coisa errada. Com um mecânico contratado, ele também comenta: o iniciante dá palpites; o experiente e o profissional dizem o que mudar e quanto.'],
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
    box: ['Equipe de box', 'Nos monopostos a parada no box conta: troca de pneu na chuva e, na F2 e na F1, a parada obrigatória. Cada nível da equipe tira alguns centésimos da parada, deixa o tempo mais regular e diminui a chance de um pit stop dar errado. O nível 1 é o de todo mundo; o 2 e o 3 são do Premium.'],
    compostos: ['Pneus macio, médio e duro', 'Da F3 em diante o estoque tem quatro tipos de pneu: macio (o slick), médio, duro e chuva. Para correr é obrigatório ter o de chuva e um composto de seco na F3 (dois na F2 e na F1, que têm parada obrigatória). Com menos que os quatro dá para ir, mas o fim de semana é só com o que estiver no estoque (na pista não se compra pneu), e os rivais têm todos. Cada jogo volta gasto depois da corrida. No seco, cada piloto escolhe o composto de largada. Macio: mais aderência e tempo melhor, mas gasta rápido. Duro: mais lento e dura muito. Médio: o meio-termo. Na F2 e na F1, na corrida principal é obrigatório usar dois compostos, então todo mundo para uma vez e recebe outro jogo do estoque. Na F3 não tem parada. Largar de macio dá posições no começo; de duro, permite parar mais tarde e terminar com pneu novo. Na sprint não tem parada.'],
    setupF4: ['Acerto do monoposto', 'Na F2 entram também balanço de freio e diferencial; na F1, cambagem e ERS. Asas: seguram o carro nas curvas, mas freiam na reta. Suspensão: como o carro passa nas zebras e responde nas curvas. Altura: perto do chão tem mais aderência, mas pode bater. Pressão: como o pneu esquenta. Relação: força na saída × velocidade na reta. O acerto ideal muda com a pista, o calor, o ar e a chuva.'],
    asaDianteira: ['Asa dianteira', 'É a asa na frente do carro. Mais asa: a frente gruda mais nas curvas, mas o carro fica nervoso atrás e perde um pouco na reta. Menos asa: a frente escapa nas curvas rápidas.'],
    asaTraseira: ['Asa traseira', 'É a asa de trás, a que mais segura o carro no chão. Mais asa: traseira firme nas curvas de alta, mas o carro fica lento na reta. Menos asa: mais velocidade final, traseira mais solta.'],
    suspensao: ['Suspensão', 'É a firmeza das molas e amortecedores. Macia: o carro absorve zebras e ondulações, mas rola nas curvas. Dura: responde rápido, mas pula nas zebras.'],
    altura: ['Altura do carro', 'É a distância do assoalho até o chão. Baixa: o carro gruda mais (efeito solo), mas pode bater no chão. Alta: mais seguro em ondulações e na chuva, com menos aderência.'],
    relacao: ['Relação do câmbio', 'É o escalonamento das marchas. Curta: mais força na saída das curvas, mas a última marcha acaba antes do fim da reta. Longa: mais velocidade final, menos força nas retomadas.'],
    freio: ['Balanço de freio', 'É quanto da força de freio vai para as rodas da frente (em %). Mais à frente: freada estável, mas a frente pode travar e passar reto. Mais atrás: o carro vira melhor na freada, mas a traseira pode travar e rodar.'],
    diferencial: ['Diferencial', 'Controla quanto as rodas de trás podem girar diferente uma da outra. Travado: mais tração na saída das curvas lentas, mas o carro empurra de frente no meio da curva. Aberto: vira melhor, mas a roda de dentro patina.'],
    camber: ['Cambagem dianteira', 'É a inclinação das rodas da frente (em graus negativos). Mais cambagem: mais aderência nas curvas rápidas, mas gasta o pneu por dentro e piora a freada. Menos: freia melhor e poupa pneu.'],
    ers: ['Uso do ERS', 'É onde a bateria híbrida entrega a potência extra. Retas: mais velocidade final para atacar e defender. Curvas: mais tração na saída das curvas lentas. Equilibrado: um pouco de cada.'],
    temporada: ['Próximo ano', 'Os 4 primeiros do campeonato sobem: Regional → Brasileiro → Europeu → F4 → F3 → F2 → F1 (o campeão brasileiro também recebe proposta de F4). Muita popularidade também abre o campeonato seguinte. Cada degrau custa mais e tem rivais mais fortes. No começo do ano a família ajuda com um dinheiro.'],
  };

  // Nos monopostos (F4 à F1) os textos falam do carro, não do kart; e lá tem box para trocar pneu na chuva.
  // Nas notícias o nome do piloto aparece com as iniciais maiúsculas ("Péricles Chamuska"), como num
  // texto de jornal; no resto do jogo ele fica em caixa alta. Vale também para notícias antigas.
  const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  const nomeComIniciais = (nome) => nome.toLocaleLowerCase('pt-BR').split(' ')
    .map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1))).join(' ');
  function textoNoticia(texto) {
    const nome = estado && estado.piloto && estado.piloto.nome;
    if (!nome) return texto;
    const busca = new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'giu');
    return texto.replace(busca, nomeComIniciais(nome));
  }

  function textoDoVeiculo(t) {
    if (!Kart.monoposto()) return t;
    return t
      .replace('No kart não tem pit stop: o pneu que você escolher vai até a bandeirada.', 'Se chover na corrida, dá para chamar o carro para o box e pôr pneu de chuva (a parada custa uns 24 segundos).')
      .replace('O kart não vem com mecânico: o acerto é seu.', 'O acerto é seu.')
      .replace(/\b(o|no|do|um) kart\b/g, (_, art) => `${art} carro`)
      .replace(/\bO kart\b/g, 'O carro')
      .replace('Acerto do kart', 'Acerto do carro');
  }
  const botaoAjuda = (chave) => `<button class="ajuda" data-acao="ajuda" data-chave="${chave}" aria-label="Ajuda: ${esc(AJUDAS[chave][0])}">?</button>`;

  const balao = document.createElement('div');
  balao.className = 'balao-fundo';
  balao.hidden = true;
  balao.innerHTML = '<div class="balao" role="dialog" aria-modal="true" aria-labelledby="balao-titulo"><h3 id="balao-titulo"></h3><p></p><button class="principal" data-fechar>Entendi</button></div>';
  document.body.appendChild(balao);
  // Com qualquer folha ou balão aberto, a tela de trás fica travada (não rola junto com o dedo).
  // No iPhone, só overflow: hidden não basta: o corpo fica fixo na posição atual e volta ao fechar.
  let rolagemTravada = null;
  function travarFundo() {
    const aberto = !!document.querySelector('.folha-fundo:not([hidden]), .balao-fundo:not([hidden])');
    const body = document.body;
    if (aberto && rolagemTravada === null) {
      rolagemTravada = window.scrollY;
      body.style.top = `-${rolagemTravada}px`;
      body.classList.add('fundo-travado');
    } else if (!aberto && rolagemTravada !== null) {
      const y = rolagemTravada;
      rolagemTravada = null;
      body.classList.remove('fundo-travado');
      body.style.top = '';
      window.scrollTo(0, y);
    }
  }
  new MutationObserver(travarFundo).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });

  function abrirAjuda(chave) {
    const [titulo, texto] = AJUDAS[chave].map(textoDoVeiculo);
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

  // ---------- tutorial da primeira vez ----------
  // Na primeira vez em cada tela, um passo a passo destaca as partes da tela com um balão.
  // Fica guardado no aparelho (vale para todas as carreiras); "Rever tutorial" no paddock recomeça.
  const veic = () => (Kart.monoposto() ? 'carro' : 'kart');
  const PASSOS_TUTORIAL = {
    equipe: () => [
      { titulo: 'Bem-vindo ao Superlicença!', texto: 'Você é o piloto e também o chefe da própria carreira. Começa no kart aos 12 anos e a meta é chegar à Fórmula 1 e ser campeão.' },
      { sel: '.equipe-card', titulo: 'Escolha a equipe', texto: 'Cada equipe cobra por etapa: equipe cara anda mais, mas sobra menos dinheiro para pneus e motor.' },
      { sel: '[data-acao="ajuda"]', titulo: 'Dúvida? Toque no ícone de "?".', texto: `Quase todo cartão tem um "?" com a explicação do que ele faz. É a chave para você acertar o seu ${veic()}.` },
    ],
    paddock: () => [
      { titulo: 'O paddock', texto: 'É a sua base entre as corridas. Daqui você cuida do dinheiro, do equipamento e da carreira.' },
      { sel: '#status', titulo: 'Caixa, moral e confiança', texto: 'O caixa paga a equipe, os pneus e o motor. Moral alta faz o piloto evoluir mais e a confiança alta deixa mais rápido e regular.' },
      { sel: '.abas', titulo: 'As abas', texto: 'Etapa: a próxima corrida.\nTabela: sua posição no campeonato.\nPiloto: atributos e conquistas.\nOficina: pneus, motor e patrocínio.\nCaderno: o que você anotou de cada pista.\nNotícias: propostas e novidades.' },
      { sel: '.hero', titulo: 'A próxima etapa', texto: 'Veja as informações da pista, previsão de manhã e de tarde e o custo da etapa. Toque em "Ver pista" para conhecer retas, curvas e o asfalto. É importantíssimo para o acerto do carro.' },
      { sel: '[data-aba="oficina"]', titulo: 'Oficina', texto: 'Antes de correr, confira os pneus e o motor. Um ponto laranja aqui avisa quando falta alguma coisa.' },
      { sel: '[data-aba="noticias"]', titulo: 'Notícias', texto: 'Propostas de equipes, olheiros e o que acontece no campeonato. Um ponto vermelho mostra quando tem novidade.' },
      { sel: '[data-acao="ir-fds"]', titulo: 'Fim de semana', texto: 'Quando estiver pronto, vá para a pista. Cada etapa tem treino livre de manhã, classificação e corrida à tarde.' },
    ],
    treino: () => [
      { sel: '.passos-fds', titulo: 'O fim de semana', texto: 'Treino, classificação, corrida e resultado. Você está no treino livre.' },
      { sel: '.cartao-acerto', titulo: `Acerto do ${veic()}`, texto: `Mexa nos ajustes do ${veic()}. O acerto ideal muda com a pista, o calor e a chuva, e ninguém te conta qual é: você descobre pelo que o piloto sente.` },
      { sel: '.cartao-mecanico', titulo: 'Mecânico', texto: 'Dá para contratar um mecânico para o fim de semana: o iniciante dá palpites, o experiente analisa o acerto e o profissional monta tudo para você.' },
      { sel: '.pneus', titulo: 'Pneus', texto: 'Toque num jogo para usar. Treine com um pneu mais velho e guarde o novo para a classificação e a corrida.' },
      { sel: '[data-acao="saida"]', titulo: 'Sair para a pista', texto: 'O piloto dá algumas voltas e conta o que sentiu. Cada bolinha é uma saída do treino.' },
      { sel: '.cartao-radio', titulo: 'Rádio', texto: 'Aqui chegam o tempo, a posição no treino e o que o piloto sentiu. Use isso para corrigir o acerto antes da próxima saída.' },
      { sel: '[data-acao="ir-quali"]', titulo: 'Classificação', texto: 'Quando o acerto estiver bom, siga para a classificação. A tarde costuma ser mais quente: o acerto pode precisar de um ajuste.' },
    ],
    quali: () => [
      { sel: '[data-acao="classificar"]', titulo: 'Classificação', texto: `Uma volta lançada com o acerto e o pneu escolhidos define o grid. Confira os dois antes de tocar em Classificar.` },
    ],
    grid: () => [
      { sel: '.largada-card, .painel', titulo: 'Grid de largada', texto: 'A sua posição de largada e as condições da corrida. Ainda dá para mexer no acerto e trocar o pneu antes da largada.' },
      { sel: '.compostos', titulo: 'Estratégia de pneus', texto: 'Escolha com que composto largar: macio é mais rápido e dura menos; duro, o contrário.' },
      { sel: '[data-acao="largar"]', titulo: 'Largar!', texto: 'Quando estiver pronto, é só largar.' },
    ],
    corrida: () => [
      { sel: '#tabela', titulo: 'Corrida ao vivo', texto: 'Posição, tempo da última volta (roxo é a melhor da corrida), posições ganhas ou perdidas e a distância para o líder. Você aparece destacado.' },
      { sel: '#btn-play', titulo: 'Pausar', texto: 'A corrida anda sozinha. Toque aqui para pausar e continuar quando quiser.' },
      { sel: '#info-jogador', titulo: `Seu ${veic()}`, texto: 'Posição, de onde largou, quantas posições ganhou e o estado do pneu. Nos monopostos, aqui também ficam os botões de box.' },
      { sel: '#eventos', titulo: 'Narração', texto: 'Ultrapassagens, paradas, safety car e chuva aparecem aqui, volta a volta.' },
    ],
    resultado: () => [
      { sel: '.resultado-hero', titulo: 'Resultado', texto: 'Posição, pontos, a posição no campeonato e quanto entrou no caixa.' },
      { sel: '[data-acao="voltar-paddock"]', titulo: 'Depois da bandeirada', texto: `Leia o que o piloto achou do ${veic()} e o que deveria ter mudado: vale para a próxima vez nessa pista. Depois, volte ao paddock.` },
    ],
    relatorio: () => [
      { titulo: 'Fim de temporada', texto: 'Hora de olhar o ano: posição, dinheiro e evolução do piloto. Propostas de equipes e categorias aparecem no topo.' },
      { sel: '#equipe-ano, .escolhas', titulo: 'Próximo ano', texto: 'Escolha o campeonato e a equipe do ano que vem. Cada equipe mostra quanto custa a temporada inteira.' },
    ],
  };
  const Tutorial = (() => {
    const CHAVE = 'superlicenca-tutorial';
    let visto = {};
    try { visto = JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch (e) { visto = {}; }
    const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(visto)); } catch (e) { /* sem armazenamento */ } };
    let ativo = null; // { chave, passos, i }
    const camada = document.createElement('div');
    camada.className = 'tut';
    camada.hidden = true;
    camada.innerHTML = `<div class="tut-furo" data-furo></div><div class="tut-balao" role="dialog" aria-modal="true" aria-labelledby="tut-titulo-balao">
      <i class="tut-seta" data-seta aria-hidden="true"></i>
      <div class="tut-quem"><span class="tut-avatar" data-avatar></span><span>Engenheiro de pista</span><span class="espaco"></span><span class="tut-pontos" data-pontos aria-hidden="true"></span></div>
      <h3 id="tut-titulo-balao" data-titulo></h3><p data-texto></p>
      <div class="tut-botoes"><button class="tut-pular" data-tut="pular">Pular tutorial</button><span class="espaco"></span><button class="tut-voltar" data-tut="voltar" aria-label="Passo anterior"></button><button class="tut-proximo" data-tut="proximo"></button></div></div>`;
    document.body.appendChild(camada);
    const q = (s) => camada.querySelector(s);
    function posicionar() {
      if (!ativo) return;
      const passo = ativo.passos[ativo.i];
      const alvo = passo.alvo;
      const furo = q('[data-furo]');
      const balao = q('.tut-balao');
      const larg = window.innerWidth;
      const alt = window.innerHeight;
      const seta = q('[data-seta]');
      if (!alvo || !alvo.isConnected) {
        seta.hidden = true;
        furo.hidden = true;
        camada.classList.add('sem-alvo');
        balao.style.left = `${Math.max(16, (larg - balao.offsetWidth) / 2)}px`;
        balao.style.top = `${Math.max(16, (alt - balao.offsetHeight) / 2)}px`;
        return;
      }
      camada.classList.remove('sem-alvo');
      furo.hidden = false;
      const r = alvo.getBoundingClientRect();
      const m = 6;
      const topo = Math.max(4, r.top - m);
      const base = Math.min(alt - 4, r.bottom + m);
      Object.assign(furo.style, { left: `${Math.max(4, r.left - m)}px`, top: `${topo}px`, width: `${Math.min(larg - 8, r.width + 2 * m)}px`, height: `${Math.max(24, base - topo)}px` });
      const bh = balao.offsetHeight;
      const embaixo = base + 12 + bh <= alt - 12;
      const top = embaixo ? base + 12 : topo - 12 - bh >= 12 ? topo - 12 - bh : Math.max(12, alt - bh - 12);
      balao.style.top = `${top}px`;
      const esquerda = Math.max(12, Math.min(larg - balao.offsetWidth - 12, r.left + r.width / 2 - balao.offsetWidth / 2));
      balao.style.left = `${esquerda}px`;
      // Setinha apontando para o elemento (some quando o balão precisou ficar por cima dele).
      const sobre = !embaixo && !(topo - 12 - bh >= 12);
      seta.hidden = sobre;
      seta.className = `tut-seta ${embaixo ? 'em-cima' : 'em-baixo'}`;
      seta.style.left = `${Math.max(18, Math.min(balao.offsetWidth - 18, r.left + r.width / 2 - esquerda))}px`;
    }
    function mostrar() {
      const passo = ativo.passos[ativo.i];
      passo.alvo = passo.sel ? [...document.querySelectorAll(passo.sel)].find((el) => el.offsetParent !== null) : null;
      if (!q('[data-avatar]').innerHTML) { q('[data-avatar]').innerHTML = icone('radio'); q('[data-tut="voltar"]').innerHTML = icone('voltar'); }
      q('[data-pontos]').innerHTML = ativo.passos.map((_, i) => `<i class="${i === ativo.i ? 'atual' : i < ativo.i ? 'feito' : ''}"></i>`).join('');
      q('[data-tut="voltar"]').hidden = ativo.i === 0;
      q('[data-titulo]').textContent = passo.titulo;
      q('[data-texto]').textContent = passo.texto;
      q('[data-tut="proximo"]').textContent = ativo.i === ativo.passos.length - 1 ? 'Entendi' : 'Próximo';
      if (passo.alvo) passo.alvo.scrollIntoView({ block: 'center', behavior: 'auto' });
      requestAnimationFrame(posicionar);
    }
    function fechar() {
      const aoFechar = ativo && ativo.aoFechar;
      if (ativo) { visto[ativo.chave] = true; gravar(); }
      ativo = null;
      camada.hidden = true;
      document.body.classList.remove('tut-aberto');
      if (aoFechar) aoFechar();
    }
    function comecar(chave, passos, aoFechar) {
      // Passos sem alvo na tela (ex.: estratégia de pneus no kart) ficam de fora.
      const validos = passos.filter((p) => !p.sel || [...document.querySelectorAll(p.sel)].some((el) => el.offsetParent !== null));
      if (!validos.length) { visto[chave] = true; gravar(); return; }
      ativo = { chave, passos: validos, i: 0, aoFechar };
      camada.hidden = false;
      document.body.classList.add('tut-aberto');
      mostrar();
    }
    camada.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-tut]');
      if (!b || !ativo) return;
      if (b.dataset.tut === 'pular') {
        for (const k of Object.keys(PASSOS_TUTORIAL)) visto[k] = true;
        gravar();
        fechar();
        return;
      }
      if (b.dataset.tut === 'voltar') { if (ativo.i > 0) { ativo.i -= 1; mostrar(); } return; }
      if (ativo.i < ativo.passos.length - 1) { ativo.i += 1; mostrar(); } else fechar();
    });
    window.addEventListener('resize', () => requestAnimationFrame(posicionar));
    window.addEventListener('scroll', () => { if (ativo) requestAnimationFrame(posicionar); }, { passive: true });
    return {
      visto: (k) => !!visto[k],
      ativo: () => !!ativo,
      comecar,
      reiniciar() { visto = {}; gravar(); },
    };
  })();
  // Qual passo a passo vale para a tela atual.
  function chaveTutorial() {
    if (tela.nome === 'equipe') return 'equipe';
    if (tela.nome === 'paddock' && (tela.aba || 'resumo') === 'resumo') return 'paddock';
    if (tela.nome === 'relatorio') return 'relatorio';
    if (tela.nome === 'fds' && estado && estado.fds) return { treino: 'treino', quali: 'quali', grid: 'grid', corrida: 'corrida', fim: 'resultado' }[estado.fds.sessao] || null;
    return null;
  }
  function talvezTutorial() {
    const chave = chaveTutorial();
    if (!chave || Tutorial.ativo() || Tutorial.visto(chave)) return;
    const minha = tela;
    // Espera a tela assentar (animações, folhas de aviso) antes de começar.
    setTimeout(() => {
      if (tela !== minha || Tutorial.ativo() || Tutorial.visto(chave) || chaveTutorial() !== chave) return;
      if (app.querySelector('.folha-fundo') || !naPista.hidden) { talvezTutorial(); return; }
      if (chave === 'corrida' && !tela.pausado && corrida && !corrida.terminou) { tela.pausado = true; clearInterval(timer); timer = null; atualizarCorrida(); }
      // Fim do tutorial da corrida: volta para a torre e a corrida começa sozinha.
      const aoFechar = chave === 'corrida' ? () => {
        window.scrollTo({ top: 0, behavior: menosMovimento() ? 'auto' : 'smooth' });
        if (corrida && !corrida.terminou && tela.pausado) { tela.pausado = false; iniciarTimer(); atualizarCorrida(); }
      } : null;
      Tutorial.comecar(chave, PASSOS_TUTORIAL[chave](), aoFechar);
    }, 450);
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

  const iconeClima = (chance) => icone(chance < 20 ? 'sol' : chance < 50 ? 'parcial' : 'chuva');

  // Ícone pela chance de chuva e, sem chuva prevista, pelas nuvens do dia (sol, parcial ou nublado).
  function climaBloco(rotulo, periodo, nuvens) {
    const icone0 = periodo.chance >= 50 || nuvens == null ? iconeClima(periodo.chance) : icone(nuvens < 0.35 ? 'sol' : 'parcial');
    return `<div class="clima"><span class="clima-icone" aria-hidden="true">${icone0}</span>
      <div><span class="fraco">${rotulo}</span><b>${periodo.tempAr}°C</b><span class="chuva">${ic('gota')}${periodo.chance}%</span></div></div>`;
  }

  // Recorde da pista: tempo, quem fez e quando.
  function linhaRecorde() {
    const r = C.recordePista(estado);
    return `<div class="recorde ${r.jogador ? 'meu' : ''}">${icone('trofeu')}<span>Recorde da pista</span><b>${tempoVolta(r.tempo)}</b><small>${esc(r.jogador ? 'Você' : r.nome)} · ${r.ano}</small></div>`;
  }

  // Condições da sessão. À tarde mostra quanto o ar e o asfalto mudaram desde o treino,
  // e em todas mostra a borracha na pista (que o jogador não teria como saber).
  // Condições em quatro números lado a lado (céu, ar, asfalto, chuva ou borracha), com a mudança desde a manhã.
  function painelCondicoes(sessao) {
    const clima = C.climaAtual(estado);
    const molhado = sessao === 'treino' ? clima.manha.chove : clima.tarde.inicioChuva === 'quali';
    // No grid valem as condições da corrida, comparadas com as da classificação.
    const c = Kart.condicao(clima, sessao === 'treino' ? 'treino' : sessao === 'grid' ? 'corrida' : 'quali', molhado);
    const t = sessao === 'treino' ? null : sessao === 'grid' ? Kart.condicao(clima, 'quali', molhado) : Kart.condicao(clima, 'treino', clima.manha.chove);
    const delta = (agora, antes) => (t && agora !== antes ? `<small class="${agora > antes ? 'sobe' : 'desce'}">${agora > antes ? '+' : '−'}${Math.abs(agora - antes)}°</small>` : '<small>&nbsp;</small>');
    const item = (icone0, rotulo, valor, extra = '<small>&nbsp;</small>', classe = '') => `<div class="cond ${classe}">${icone(icone0)}<span>${rotulo}</span><b>${valor}</b>${extra}</div>`;
    return `<div class="condicoes">
      ${item(molhado ? 'chuva' : 'sol', 'Pista', molhado ? 'Molhada' : 'Seca', molhado ? '<small>&nbsp;</small>' : `<small>borracha ${sessao === 'treino' ? 'baixa' : sessao === 'grid' ? 'alta' : 'média'}</small>`, molhado ? 'cond-chuva' : 'cond-sol')}
      ${item('termometro', 'Ar', `${c.tempAr}°`, delta(c.tempAr, t && t.tempAr))}
      ${item('asfalto', 'Asfalto', `${c.tempPista}°`, delta(c.tempPista, t && t.tempPista))}
      ${item('gota', 'Chuva', molhado ? 'Agora' : `${clima.tarde.chance}%`, `<small>${molhado ? 'chovendo' : 'na corrida'}</small>`, molhado || clima.tarde.chance >= 30 ? 'cond-chuva' : '')}
    </div>`;
  }

  function condicaoChips(sessao) {
    const clima = C.climaAtual(estado);
    const molhado = sessao === 'treino' ? clima.manha.chove : clima.tarde.inicioChuva === 'quali';
    // No grid valem as condições da corrida, comparadas com as da classificação.
    const c = Kart.condicao(clima, sessao === 'treino' ? 'treino' : sessao === 'grid' ? 'corrida' : 'quali', molhado);
    const t = sessao === 'treino' ? null : sessao === 'grid' ? Kart.condicao(clima, 'quali', molhado) : Kart.condicao(clima, 'treino', clima.manha.chove);
    const delta = (agora, antes) => (t && agora !== antes ? ` <small>${agora > antes ? '+' : '−'}${Math.abs(agora - antes)}</small>` : '');
    const borracha = molhado ? '' : chip(sessao === 'treino' ? 'Pouca borracha' : sessao === 'grid' ? 'Muita borracha' : 'Mais borracha');
    return `${linhaRecorde()}<div class="chips">${chip(molhado ? `${ic('chuva')}Molhado` : `${ic('sol')}Seco`, molhado ? 'chip-azul' : '')}${chip(`${ic('termometro')}Ar ${c.tempAr}°${delta(c.tempAr, t && t.tempAr)}`)}${chip(`Asfalto ${c.tempPista}°${delta(c.tempPista, t && t.tempPista)}`)}${borracha}
      ${sessao !== 'treino' && !molhado ? chip(`${ic('gota')}Corrida ${clima.tarde.chance}%`) : ''}</div>`;
  }

  // Desgaste em % da vida do jogo (da F3 em diante, cada composto tem a sua).
  const desgastePct = (uso, tipo = 'slick') => Math.min(100, Math.round((uso / C.vidaDoPneu(estado, tipo)) * 100));
  const nomePneu = (tipo) => C.nomePneu(estado, tipo);
  // Botões de compra: slick e chuva no kart e na F4; macio, médio, duro e chuva da F3 em diante.
  // Da F3 em diante, na pista não se compra: o fim de semana é com o estoque que foi.
  const botaoRepor = () => (estado.fase === 'fds' ? '' : `<button class="compra repor" data-acao="repor-estoque"><b>${ic('repetir')}Repor estoque</b><span>Compra o que falta para a próxima etapa</span></button>`);
  const botoesComprarPneu = () => (C.quatroPneus(estado) && estado.fase === 'fds'
    ? '<p class="fraco mini">Na pista não dá para comprar pneu: o fim de semana é com o estoque que você trouxe.</p>'
    : `<div class="botoes-2 ${C.quatroPneus(estado) ? 'botoes-pneus-4' : ''}">${C.tiposPneu(estado).map((t) => `<button class="compra" data-acao="comprar-pneu" data-tipo="${t}"><b>+ ${nomePneu(t)}</b><span>${reais(C.precoPneu(estado, t))}</span></button>`).join('')}</div>`);

  // Jogos de pneus como cartões; no fim de semana dá para escolher tocando no cartão.
  function pneusVisuais(selecionavel) {
    if (!estado.pneus.length) return '<p class="aviso">Nenhum jogo de pneus!</p>';
    const ordem = ['slick', 'medio', 'duro', 'chuva'];
    const lista = estado.pneus.slice().sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo));
    const numero = (p) => estado.pneus.filter((x) => x.tipo === p.tipo).indexOf(p) + 1;
    return `<div class="pneus">${lista.map((p) => {
      const i = numero(p) - 1;
      const pct = desgastePct(p.uso, p.tipo);
      const classe = pct >= 100 ? 'negativo' : pct >= 60 ? 'aviso' : 'dinheiro';
      const ativo = selecionavel && estado.fds.pneuId === p.id;
      const conteudo = `<span class="pneu-roda ${p.tipo} ${C.quatroPneus(estado) && p.tipo === 'slick' ? 'macio' : ''}" aria-hidden="true"></span>
        <span class="pneu-nome">${nomePneu(p.tipo)} <span class="fraco">#${i + 1}</span></span>
        <span class="pneu-trilho"><i class="${classe}-fundo" style="width:${Math.max(4, 100 - pct)}%"></i></span>
        <span class="pneu-estado ${classe}">${C.pneuNovo(p) ? 'novo' : C.pneuAmaciado(p) ? 'amaciado' : pct >= 100 ? 'acabado' : `${100 - pct}%`}</span>`;
      return selecionavel
        ? `<button class="pneu-card ${ativo ? 'ativo' : ''}" data-acao="escolher-pneu" data-id="${p.id}" aria-pressed="${ativo}">${conteudo}</button>`
        : `<button class="pneu-card" data-acao="pneu-opcoes" data-id="${p.id}" aria-label="Opções do ${nomePneu(p.tipo)} ${i + 1}">${conteudo}<span class="pneu-mais" aria-hidden="true">⋯</span></button>`;
    }).join('')}</div>`;
  }

  // ---------- topo ----------
  // No cabeçalho compacto, milhões viram "R$ 13,9 mi" para caber ao lado da moral e da confiança.
  const caixaCurto = (x) => (Math.abs(x) >= 1e6 ? `${x < 0 ? '−' : ''}R$ ${(Math.abs(x) / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : reais(x));
  function atualizarStatus() {
    if (!estado) { statusEl.innerHTML = ''; barraMini.innerHTML = ''; return; }
    const eq = C.equipeBase(estado.equipeId);
    const camp = C.campeonato(estado.campeonato);
    const p = estado.piloto;
    const iniciais = p.nome.split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
    const custo = C.custoEtapa(estado);
    const apertado = estado.dinheiro < custo;
    const kpi = (nomeIcone, rotulo, valor, classe, extra) => `<div class="kpi ${classe}"><span class="kpi-rotulo">${ic(nomeIcone)}${rotulo}</span><b class="kpi-valor">${valor}</b>${extra}</div>`;
    const medidor = (v) => `<span class="kpi-barra" aria-hidden="true"><i style="width:${v}%"></i></span>`;
    barraMini.innerHTML = `<b class="mini-nome">${esc(p.nome)}</b>
      <span class="${estado.dinheiro < 0 ? 'negativo' : 'dinheiro'}">${ic('carteira')}${estado.dinheiroInfinito ? 'R$ ∞' : reais(estado.dinheiro)}</span>
      <span class="${nivelClasse(p.moral)}">${ic('sorriso')}${p.moral}</span><span class="${nivelClasse(p.confianca)}">${ic('chama')}${p.confianca}</span>`;
    statusEl.innerHTML = `<div class="perfil">
        <span class="avatar ${corClara(eq.cor) ? 'avatar-claro' : ''}" style="background:${eq.cor}" aria-hidden="true">${esc(iniciais)}</span>
        <span class="perfil-texto"><b>${esc(p.nome)}</b><small>${p.idade} anos · ${esc(eq.nome)}</small></span>
        <span class="perfil-camp"><small>${estado.ano}</small><b>${esc(camp.curto)}</b></span>
        <button class="perfil-tutorial" data-acao="rever-tutorial" aria-label="Rever tutorial">${icone('sentido')}<small>Tutorial</small></button>
      </div>
      <div class="kpis">
        ${kpi('carteira', 'Caixa', estado.dinheiroInfinito ? 'R$ ∞' : caixaCurto(estado.dinheiro), `kpi-caixa ${estado.dinheiro < 0 ? 'negativo' : 'dinheiro'} ${apertado ? 'apertado' : ''}`, apertado ? '<small class="kpi-sub">Não paga a etapa</small>' : '')}
        ${kpi('sorriso', 'Moral', p.moral, nivelClasse(p.moral), medidor(p.moral))}
        ${kpi('chama', 'Confiança', p.confianca, nivelClasse(p.confianca), medidor(p.confianca))}
      </div>`;
  }

  statusEl.addEventListener('click', (ev) => {
    if (!ev.target.closest('[data-acao="rever-tutorial"]') || !estado) return;
    Tutorial.reiniciar();
    tela.aba = 'resumo';
    if (tela.nome !== 'paddock' && estado.fase === 'paddock') tela = { nome: 'paddock', aba: 'resumo' };
    render();
    window.scrollTo(0, 0);
  });

  function render() {
    encherCaixa();
    atualizarStatus();
    // Abertura, nome, carregamento e equipe ocupam a tela toda, sem o cabeçalho do piloto.
    // Na corrida também: a tela fica só com a corrida.
    const naCorrida = tela.nome === 'fds' && estado && estado.fds && estado.fds.sessao === 'corrida';
    document.body.classList.toggle('sem-topo', naCorrida || ['abertura', 'inicio', 'carregando', 'equipe', 'fimTemporada'].includes(tela.nome));
    document.body.classList.toggle('na-corrida', naCorrida);
    const telas = { abertura: telaAbertura, inicio: telaInicio, carregando: telaCarregando, equipe: telaEquipe, paddock: telaPaddock, pista: telaPista, fds: telaFimDeSemana, relatorio: telaRelatorio, fimTemporada: telaFimTemporada, superlicenca: telaSuperlicenca, falencia: telaFalencia, aposentado: telaAposentado, desafio: telaDesafio };
    telas[tela.nome]();
    deslizarSegmentos();
    talvezTutorial();
  }

  // "Jogo pensando": um carregando rápido por cima só ao ir para a pista e ao voltar ao paddock,
  // enquanto a tela nova já se monta embaixo.
  let pensando = null;
  function pensar() {
    let el = document.getElementById('pensando');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pensando';
      el.className = 'pensando';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<span class="pensando-roda"></span>';
      document.body.append(el);
    }
    el.classList.remove('saindo');
    el.hidden = false;
    clearTimeout(pensando);
    pensando = setTimeout(() => {
      el.classList.add('saindo');
      pensando = setTimeout(() => { el.hidden = true; el.classList.remove('saindo'); }, 160);
    }, 420);
  }

  // A tela é redesenhada a cada toque; a pílula vermelha parte da posição anterior e desliza até a opção nova.
  const posSegmento = {};
  function deslizarSegmentos() {
    document.querySelectorAll('.segmentos[data-seg], .segmentos-abas[data-seg]').forEach((seg) => {
      const ativo = seg.querySelector('button.ativo');
      if (!ativo) return;
      const pilula = document.createElement('i');
      pilula.className = 'seg-pilula';
      seg.prepend(pilula);
      const alvo = { x: ativo.offsetLeft, w: ativo.offsetWidth };
      const antes = posSegmento[seg.dataset.seg];
      const aplicar = (p) => { pilula.style.transform = `translateX(${p.x}px)`; pilula.style.width = `${p.w}px`; };
      aplicar(antes || alvo);
      posSegmento[seg.dataset.seg] = alvo;
      if (antes && (antes.x !== alvo.x || antes.w !== alvo.w)) {
        pilula.getBoundingClientRect();
        pilula.classList.add('anima');
        aplicar(alvo);
      }
    });
  }

  // Notícia nova: mais recente que a última vista pelo jogador (notícias antigas, sem número, contam como lidas).
  const noticiaNova = (n) => n.n != null && n.n > (estado.noticiaLida || 0);
  const noticiasNovas = () => estado.noticias.some(noticiaNova);

  function abas(lista, atual, alertas = {}) {
    return `<nav class="abas segmentos-abas" data-seg="abas">${lista.map(([id, ico, nome]) => `<button data-acao="aba" data-aba="${id}" class="${atual === id ? 'ativo' : ''}">${icone(ico)}<span>${nome}</span>${alertas[id] ? `<i class="aba-alerta ${alertas[id]}" aria-label="${alertas[id] === 'nova' ? 'novidade' : 'pendência'}"></i>` : ''}</button>`).join('')}</nav>`;
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
    seta: '<polyline points="9 18 15 12 9 6"/>',
    regua: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    voltas: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    montanha: '<path d="M3 20l6-10 4 6 3-4 5 8z"/>',
    largura: '<path d="M3 12h18"/><polyline points="7 8 3 12 7 16"/><polyline points="17 8 21 12 17 16"/>',
    sentido: '<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>',
    bandeira: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
    cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    reta: '<path d="M8 3L5 21"/><path d="M16 3l3 18"/><path d="M12 4v3M12 11v3M12 18v2"/>',
    curva: '<polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>',
    grampo: '<path d="M7 21V10a5 5 0 0 1 10 0v8"/><polyline points="13 15 17 19 21 15"/>',
    zebra: '<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M7 8l-3 8M12 8l-3 8M17 8l-3 8M22 8l-3 8"/>',
    asfalto: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    ultrapassar: '<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>',
    onda: '<path d="M2 12c3-6 7-6 10 0s7 6 10 0"/>',
    vento: '<path d="M9.6 4.6A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2m15.7-8.3A2.5 2.5 0 1 1 19.5 12H2"/>',
    trofeu: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    sol: '<g class="ico-sol"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g>',
    parcial: '<g class="ico-sol"><path d="M12 2v2M4.9 4.9l1.4 1.4M2 12h2M19.1 4.9l-1.4 1.4"/><path d="M15.9 10.1A5 5 0 0 0 7 12"/></g><path d="M17 13h-.8A5 5 0 1 0 11 21h6a4 4 0 0 0 0-8z"/>',
    chuva: '<path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/><path d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2M12 15v2"/>',
    gota: '<path d="M12 2.7l5.7 5.6a8 8 0 1 1-11.3 0z"/>',
    termometro: '<path d="M14 14.8V4.5a2.5 2.5 0 0 0-5 0v10.3a4.5 4.5 0 1 0 5 0z"/>',
    carteira: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/>',
    sorriso: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    chama: '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7z"/>',
    raio: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    queda: '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
    escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    alerta: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    pare: '<polygon points="7.9 2 16.1 2 22 7.9 22 16.1 16.1 22 7.9 22 2 16.1 2 7.9 7.9 2"/><path d="M12 8v4M12 16h.01"/>',
    balanca: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    certo: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><polyline points="22 4 12 14 9 11"/>',
    errado: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    estrela: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>',
    conversa: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    coracao: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    lixo: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    alvo: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    presente: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    lapis: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    chave: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    ajustes: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.5M7.8 16.2a6 6 0 0 1 0-8.5M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',
    relogio: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    pneu: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>',
    olho: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    repetir: '<polyline points="1 4 1 10 7 10"/><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10"/>',
    subir: '<path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/>',
    globo: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>',
    bateria: '<rect x="1" y="6" width="18" height="12" rx="2"/><path d="M23 11v2M5 10v4"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pausa: '<path d="M8 4v16M16 4v16"/>',
  };
  // Título em caixa alta: primeira palavra forte, o resto fino ("KARTÓDROMO internacional...").
  const tituloForte = (texto) => {
    const [primeira, ...resto] = String(texto).split(' ');
    return `<span class="t-forte">${esc(primeira)}</span>${resto.length ? ` <span class="t-fino">${esc(resto.join(' '))}</span>` : ''}`;
  };
  const icone = (nome, classe = '') => `<svg class="ico ${classe}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;
  // Ícone pequeno no meio do texto (chips, botões, listas).
  const ic = (nome, classe = '') => icone(nome, `ico-i ${classe}`);

  // Conquista nova: aviso na hora (várias de uma vez viram um aviso só).
  function avisarConquistas(novas) {
    if (!novas.length) return;
    // Espera a tela nova aparecer (ir() limpa os avisos) para o aviso não sumir.
    setTimeout(() => aviso(novas.length === 1 ? `Conquista: ${novas[0].nome}!` : `${novas.length} conquistas novas!`, 'estrela'), 60);
  }

  // ---------- Premium ----------
  const BENEFICIOS_PREMIUM = [
    ['carteira', `Até ${5} patrocinadores no macacão`, `Sem o Premium: ${2}.`],
    ['pneu', 'Mais pneus no estoque', 'Até 8 no kart e até 16 na F1.'],
    ['lapis', 'Anotações no caderno', 'O que o carro pedia em cada pista.'],
    ['chave', 'Equipe de box 3/3', 'Pit stops mais rápidos e com menos erro.'],
    ['relogio', `${4} saídas no treino livre`, `Sem o Premium: ${2}.`],
    ['relogio', 'Desafio do dia', 'Pista nova a cada 24 h, com prêmio.'],
    ['carteira', 'Banco', 'Empréstimo para investir na carreira.'],
    ['regua', 'Telemetria da volta', 'Onde você perde tempo em cada volta.'],
    ['x', 'Sem anúncios', 'Sem o Premium: um a cada 3 corridas.'],
  ];

  const folhaPremium = document.createElement('div');
  folhaPremium.className = 'folha-fundo';
  folhaPremium.hidden = true;
  document.body.appendChild(folhaPremium);
  let comprando = false;
  async function abrirPremium(motivo) {
    const ativo = BoxPremium.ativo;
    folhaPremium.innerHTML = `<div class="folha folha-premium" role="dialog" aria-modal="true" aria-labelledby="premium-titulo">
      <span class="premium-selo">${icone('estrela', 'ico-cheio')}</span>
      <h3 id="premium-titulo">Superlicença Premium</h3>
      ${motivo && !ativo ? `<p class="premium-motivo">${esc(motivo)}</p>` : ''}
      <p class="fraco">${ativo ? 'Obrigado! O Premium está ativo neste aparelho.' : 'A carreira inteira, do kart à F1, é grátis. O Premium é uma compra única, sem assinatura, e libera:'}</p>
      <ul class="premium-lista">${BENEFICIOS_PREMIUM.map(([i, t, d]) => `<li>${icone(i)}<span><b>${t}</b><small>${d}</small></span></li>`).join('')}</ul>
      ${ativo ? '<button class="principal grande" data-premium="fechar">Fechar</button>' : `
        <button class="principal grande" data-premium="comprar" ${comprando ? 'disabled' : ''}>${comprando ? 'Processando…' : 'Desbloquear Premium <span data-preco></span>'}</button>
        <div class="botoes-2"><button data-premium="restaurar">Restaurar compras</button><button data-premium="fechar">Agora não</button></div>`}
    </div>`;
    folhaPremium.hidden = false;
    const el = folhaPremium.querySelector('[data-preco]');
    if (el) el.textContent = `· ${await BoxPremium.preco()}`;
  }
  folhaPremium.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-premium]');
    if (!b && ev.target !== folhaPremium) return;
    const acao = b ? b.dataset.premium : 'fechar';
    if (acao === 'fechar') { folhaPremium.hidden = true; return; }
    if (!BoxPremium.nativo) { aviso('A compra funciona no app do iPhone.'); return; }
    comprando = true;
    abrirPremium();
    const r = acao === 'comprar' ? await BoxPremium.comprar() : await BoxPremium.restaurar();
    comprando = false;
    if (r.status === 'purchased' || r.status === 'restaurado') { folhaPremium.hidden = true; return; } // o aviso vem do aoMudar
    abrirPremium();
    if (r.status === 'pending') aviso('Compra pendente: o Premium libera assim que for aprovada.');
    else if (r.status === 'nada') aviso('Nenhuma compra do Premium encontrada nesta conta.');
    else if (r.status === 'erro') aviso('Não deu para falar com a App Store agora. Tente de novo.');
  });

  // Ferramentas de teste (modo desenvolvedor e código de dinheiro): só no navegador. No app da App Store
  // ficam desligadas. Para uma build de teste no iPhone (TestFlight), troque para true.
  const FERRAMENTAS_TESTE = !BoxSave.nativo;

  // ---------- código secreto ----------
  // "moneyisgood": dinheiro infinito na carreira (liga e desliga). No iPhone, 5 toques no logotipo do
  // cabeçalho abrem o campo do código; no computador, basta digitar o código em qualquer tela.
  const CODIGO_DINHEIRO = 'moneyisgood';
  const CAIXA_INFINITO = 999999999;
  function encherCaixa() {
    // Save de teste levado para o app: o código não vale lá.
    if (estado && estado.dinheiroInfinito && !FERRAMENTAS_TESTE) { estado.dinheiroInfinito = false; estado.dinheiro = estado.dinheiroAntesCodigo || 0; }
    if (estado && estado.dinheiroInfinito) estado.dinheiro = CAIXA_INFINITO;
  }
  function usarCodigo(texto) {
    if (!FERRAMENTAS_TESTE || !estado || String(texto).trim().toLowerCase() !== CODIGO_DINHEIRO) return false;
    estado.dinheiroInfinito = !estado.dinheiroInfinito;
    // Ao desligar, o caixa volta ao que era antes do código.
    if (estado.dinheiroInfinito) estado.dinheiroAntesCodigo = estado.dinheiro;
    else estado.dinheiro = estado.dinheiroAntesCodigo || 0;
    salvar();
    render();
    aviso(estado.dinheiroInfinito ? 'Dinheiro infinito ligado' : 'Dinheiro infinito desligado', 'carteira');
    return true;
  }
  const folhaCodigo = document.createElement('div');
  folhaCodigo.className = 'folha-fundo';
  folhaCodigo.hidden = true;
  folhaCodigo.innerHTML = `<form class="folha folha-codigo" role="dialog" aria-modal="true" aria-label="Código">
      <h3>Código</h3>
      <input type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="Código">
      <div class="botoes-2"><button type="button" data-fechar>Fechar</button><button class="principal" type="submit">OK</button></div>
    </form>`;
  document.body.appendChild(folhaCodigo);
  const fecharCodigo = () => { folhaCodigo.hidden = true; folhaCodigo.querySelector('input').value = ''; };
  folhaCodigo.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const ok = usarCodigo(folhaCodigo.querySelector('input').value);
    fecharCodigo();
    if (!ok) aviso('Código inválido');
  });
  folhaCodigo.addEventListener('click', (ev) => { if (ev.target === folhaCodigo || ev.target.closest('[data-fechar]')) fecharCodigo(); });
  let toquesMarca = [];
  document.querySelector('.topo .marca').addEventListener('click', () => {
    if (!FERRAMENTAS_TESTE || !estado) return;
    const agora = Date.now();
    toquesMarca = toquesMarca.filter((t) => agora - t < 3000).concat(agora);
    if (toquesMarca.length < 5) return;
    toquesMarca = [];
    folhaCodigo.hidden = false;
    folhaCodigo.querySelector('input').focus();
  });
  let digitado = '';
  document.addEventListener('keydown', (ev) => {
    if (!FERRAMENTAS_TESTE || ev.key.length !== 1 || ev.target.closest('input, textarea')) return;
    digitado = (digitado + ev.key.toLowerCase()).slice(-CODIGO_DINHEIRO.length);
    if (digitado === CODIGO_DINHEIRO) { digitado = ''; usarCodigo(CODIGO_DINHEIRO); }
  });

  // ---------- início ----------
  // Modo desenvolvedor (só para testar o jogo): liga e desliga com 5 toques no logotipo da abertura.
  const CHAVE_DEV = 'superlicenca-dev';
  const modoDev = () => { if (!FERRAMENTAS_TESTE) return false; try { return localStorage.getItem(CHAVE_DEV) === '1'; } catch (e) { return false; } };
  let toquesLogo = [];
  function tocarLogo() {
    if (!FERRAMENTAS_TESTE) return;
    const agora = Date.now();
    toquesLogo = toquesLogo.filter((t) => agora - t < 3000).concat(agora);
    if (toquesLogo.length < 5) return;
    toquesLogo = [];
    const ligar = !modoDev();
    try { if (ligar) localStorage.setItem(CHAVE_DEV, '1'); else localStorage.removeItem(CHAVE_DEV); } catch (e) { /* sem armazenamento */ }
    render();
    aviso(ligar ? 'Modo desenvolvedor ligado' : 'Modo desenvolvedor desligado');
  }
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
          ${modoDev() ? `<div class="dev-inicio"><span>Dev: começar direto na</span>${[['f4', 'F4', 15], ['f3', 'F3', 16], ['f2', 'F2', 17], ['f1', 'F1', 18]].map(([id, nome, idade]) => `<button class="link-f4" data-acao="iniciar-dev" data-id="${id}">${nome} · ${idade} anos</button>`).join('')}</div>
            ${BoxPremium.nativo ? '' : `<button class="link-f4" data-acao="premium-dev">Dev: Premium ${BoxPremium.ativo ? 'ligado' : 'desligado'}</button>`}` : ''}
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
          <b data-licenca-nome>${vazio ? 'Seu nome aqui' : esc(nome.trim().toLocaleUpperCase('pt-BR'))}</b>
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
      else setTimeout(() => {
        if (tela !== minha) return;
        if (!minha.dev) { ir({ ...minha, nome: 'equipe', escolhida: null }); return; }
        estado = C.novoJogo({ nome: minha.nomePiloto, equipeId: minha.opcoes[0], seed: minha.seed });
        C.comecarEm(estado, minha.dev);
        salvar();
        ir(telaDaFase());
      }, 250);
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
    if (e.material >= 86) t.push([`${ic('raio')}Kart muito rápido`, 'bom']); else if (e.material <= 76) t.push([`${ic('queda')}Kart mais lento`, 'ruim']);
    if (e.organizacao >= 85) t.push([`${ic('escudo')}Kart confiável`, 'bom']); else if (e.organizacao <= 55) t.push([`${ic('alerta')}Quebra mais`, 'ruim']);
    if (sobra >= 25000) t.push([`${ic('carteira')}Sobra dinheiro`, 'bom']); else if (sobra < 12000) t.push([`${ic('carteira')}Orçamento apertado`, 'ruim']);
    if (!t.length) t.push([`${ic('balanca')}Equilibrada`, 'neutro']);
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
              <span class="equipe-topo"><span class="etiqueta">${C.PORTES[porte].nome}</span><span class="equipe-check" aria-hidden="true">${sel ? ic('check') : ''}</span><b class="equipe-nome">${esc(e.nome)}</b></span>
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
    return `<button class="principal" data-acao="comprar-pneu" data-tipo="${id}">+ ${nomePneu(id)} · ${reais(C.precoPneu(estado, id))}</button>`;
  }

  function checklist() {
    // O motor engripado tem o seu próprio bloco logo abaixo.
    const pend = C.pendenciasEtapa(estado).filter((x) => x.id !== 'retifica');
    if (!pend.length) return `<div class="checklist ok">${ic('certo')}Tudo pronto: pneus e motor em dia.</div>`;
    return `<div class="checklist"><b>${ic('alerta')}Antes de ir para a pista</b>${pend.map((x) => `<div class="pendencia"><span>${esc(x.texto)}</span>${botaoResolver(x.id)}</div>`).join('')}
      <button class="link-oficina" data-acao="aba" data-aba="oficina">${ic('chave')}Abrir a oficina</button></div>`;
  }

  // Folha que sobe ao tocar em "Ir para a pista" quando ainda falta algo.
  function folhaChecagem() {
    if (!tela.checagem) return '';
    const pend = C.pendenciasEtapa(estado);
    const impede = C.estoqueImpede(estado);
    return `<div class="folha-fundo" data-acao-fundo="fechar-checagem"><div class="folha" role="dialog" aria-modal="true" aria-labelledby="folha-titulo">
      <h3 id="folha-titulo">${impede ? 'Não dá para correr' : pend.length ? 'Antes de ir…' : 'Tudo pronto!'}</h3>
      ${impede ? `<p class="aviso">${esc(impede)}</p>` : ''}
      ${pend.length ? pend.map((x) => `<div class="pendencia"><span>${esc(x.texto)}</span>${botaoResolver(x.id)}</div>`).join('') : '<p class="fraco">Pneus e motor em dia.</p>'}
      <div class="botoes-2"><button data-acao="fechar-checagem">Voltar</button>
        <button class="${pend.length ? '' : 'principal'}" data-acao="ir-fds-confirmado" ${impede ? 'disabled' : ''}>${pend.length && !impede ? 'Ir mesmo assim' : 'Ir para a pista'}</button></div>
    </div></div>`;
  }

  function chipRival() {
    if (!estado.seguindo) return '';
    const tabela = C.classificacaoCampeonato(estado);
    const i = tabela.findIndex((x) => x.id === estado.seguindo);
    if (i < 0) return '';
    const eu = tabela.findIndex((x) => x.id === 'jogador');
    const dif = tabela[i].pontos - tabela[eu].pontos;
    return chip(`${ic('estrela')}${esc(tabela[i].nome.split(' ')[0])} ${sigla(tabela[i].nome)} · P${i + 1} · ${dif === 0 ? 'empatado' : dif > 0 ? `${dif} pts à frente` : `${-dif} pts atrás`}`, 'chip-amarelo');
  }

  // Duelo da temporada com o companheiro de equipe.
  function cartaoCompanheiro() {
    const comp = C.companheiro(estado);
    if (!comp) return '';
    // Trocou de equipe e ainda não correu com o novo companheiro: placar zerado.
    const d = estado.duelo && estado.duelo.id === comp.id ? estado.duelo : { quali: [0, 0], corrida: [0, 0] };
    const linha = (rotulo, [eu, ele]) => `<div class="duelo-linha"><b class="${eu > ele ? 'dinheiro' : ''}">${eu}</b><span>${rotulo}</span><b class="${ele > eu ? 'negativo' : ''}">${ele}</b></div>`;
    return cartao('Companheiro de equipe', `<div class="duelo-topo"><span>Você</span><span class="fraco">×</span><span>${esc(comp.nome)}</span></div>
      ${linha('Largou na frente', d.quali)}${linha('Chegou na frente', d.corrida)}${linha('Pontos no campeonato', [estado.pontos.jogador || 0, estado.pontos[comp.id] || 0])}
      ${d.ultima ? `<p class="duelo-ultima">Última corrida: você ${d.ultima.eu ? `P${d.ultima.eu}` : 'abandonou'} · ${esc(comp.nome.split(' ')[0])} ${d.ultima.ele ? `P${d.ultima.ele}` : 'abandonou'}</p>` : ''}
      <p class="fraco mini">Os placares contam quantas vezes cada um largou e chegou na frente do outro. Terminar na frente dele anima o piloto; ficar atrás pesa um pouco na moral.</p>`, { classe: 'cartao-duelo' });
  }

  // ---------- desafio do dia ----------
  // Contagem regressiva até o desafio reabrir (hh:mm:ss), atualizada a cada segundo.
  const contagem = (ate) => {
    const s0 = Math.max(0, Math.ceil(((ate || 0) - Date.now()) / 1000));
    const h = Math.floor(s0 / 3600);
    const m = Math.floor((s0 % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s0 % 60).padStart(2, '0')}`;
  };
  setInterval(() => {
    const els = app.querySelectorAll('[data-reabre]');
    if (!els.length) return;
    let acabou = false;
    els.forEach((el) => { el.textContent = contagem(+el.dataset.reabre); if (+el.dataset.reabre <= Date.now()) acabou = true; });
    if (acabou && !Tutorial.ativo()) render(); // reabriu: volta a mostrar o botão de correr
  }, 1000);
  const NOME_MEDALHA = { ouro: 'Ouro', prata: 'Prata', bronze: 'Bronze' };
  function cartaoDesafio() {
    const d = C.desafioDaSemana(estado);
    const st = C.estadoDesafio(estado, d);
    const { restantes, reabreEm } = C.voltasDesafio(estado);
    return cartao('Desafio do dia', `<div class="item-topo"><b>${esc(d.pista.nome)}</b>${chip(d.molhado ? `${ic('chuva')}Molhado` : `${ic('sol')}Seco`, d.molhado ? 'chip-azul' : '')}</div>
      <p class="fraco mini">Três voltas lançadas para achar o acerto. Ouro fica a ${(d.medalhas[0].tempo - d.alvo).toFixed(2).replace('.', ',')} s do tempo perfeito e vale ${reais(C.premioMedalha(estado, 'ouro'))}. ${d.fim ? `Termina em <span data-reabre="${d.fim}">${contagem(d.fim)}</span>.` : 'Depois da primeira volta, você tem 24 h.'}</p>
      <div class="linha">${st.melhor ? chip(`${ic('relogio')}${tempoVolta(st.melhor)}`) : ''}${st.medalha ? chip(`${ic('trofeu')}${NOME_MEDALHA[st.medalha]}`, st.medalha === 'ouro' ? 'chip-ouro' : '') : ''}<span class="espaco"></span>
      ${C.desafioLiberado(estado) ? `<button class="${restantes ? 'principal' : ''}" data-acao="abrir-desafio">${restantes ? `Correr · ${restantes} de ${C.TENTATIVAS_DESAFIO}` : `${ic('relogio')}Novo desafio em <span data-reabre="${reabreEm}">${contagem(reabreEm)}</span>`}</button>`
        : `<button class="premium-trancado" data-acao="premium" data-motivo="O desafio do dia grátis já foi. Com o Premium, tem desafio novo todo dia.">${ic('cadeado')}Premium</button>`}</div>
      ${!BoxPremium.ativo && C.desafioLiberado(estado) ? '<p class="fraco mini">Grátis hoje. Nos próximos dias, o desafio é do Premium.</p>' : ''}`, { classe: 'cartao-desafio', ajuda: 'desafio' });
  }
  function telaDesafio() {
    const d = C.desafioDaSemana(estado);
    const st = C.estadoDesafio(estado, d);
    const { restantes, reabreEm } = C.voltasDesafio(estado);
    // Cada medalha: nome e tempo-alvo à esquerda, prêmio numa etiqueta à direita.
    const medalhas = d.medalhas.map((m) => {
      const ganha = st.medalha === m.medalha;
      return `<div class="medalha-alvo ${ganha ? 'ganha' : ''}"><span class="medalha-cor m-${m.medalha}" aria-hidden="true"></span>
        <span class="medalha-info"><b>${NOME_MEDALHA[m.medalha]}${ganha ? ` ${ic('check')}` : ''}</b><small>Volta até <b>${tempoVolta(m.tempo)}</b></small></span>
        <span class="medalha-premio">+${reais(C.premioMedalha(estado, m.medalha))}</span></div>`;
    }).join('');
    const voltas = st.tentativas.slice().reverse().map((t, i) => `<div class="saida"><div class="item-topo"><span class="chip">Volta ${st.tentativas.length - i}</span><b class="tempo">${tempoVolta(t.tempo)}</b></div>
        ${(t.frases || []).map((f) => `<div class="bolha piloto">${icone('piloto')}<p>${esc(f)}</p></div>`).join('')}
        ${i === 0 && restantes ? `<button class="radio-ajustar" data-acao="ir-acerto">${ic('chave')}Ajustar o ${Kart.veiculo}</button>` : ''}</div>`).join('');
    app.innerHTML = `<div class="detalhe">
        <div class="linha"><button class="voltar" data-acao="voltar-paddock-pista">${icone('voltar')}<span>Paddock</span></button></div>
        <div class="detalhe-titulo"><h1>${tituloForte(d.pista.nome)}</h1><p>Desafio do dia · ${esc(C.campeonato(d.campeonato).curto)}${d.fim ? ` · termina em <span data-reabre="${d.fim}">${contagem(d.fim)}</span>` : ' · 24 h a partir da primeira volta'}</p></div>
        <div class="grade">
          ${cartao('Tempos-alvo', `<div class="chips">${chip(d.molhado ? `${ic('chuva')}Molhado · pneu de chuva` : `${ic('sol')}Seco · slick`, d.molhado ? 'chip-azul' : '')}${chip(`Asfalto ${d.cond.tempPista}°`)}</div><div class="medalhas-alvo">${medalhas}</div>
            ${st.melhor ? `<p>Sua melhor: <b>${tempoVolta(st.melhor)}</b>${st.medalha ? ` · ${NOME_MEDALHA[st.medalha]}` : ''}</p>` : ''}`)}
          ${cartao('Acerto', editorSetup(st.setup, 'ajuste-desafio'), { classe: 'cartao-acerto' })}
          <button class="principal grande" data-acao="volta-desafio" ${restantes ? '' : 'disabled'}>${restantes ? `Volta lançada · ${restantes} de ${C.TENTATIVAS_DESAFIO}` : `${ic('relogio')}Novo desafio em <span data-reabre="${reabreEm}">${contagem(reabreEm)}</span>`}</button>
          ${cartao('Rádio', voltas || `<p class="vazio">${ic('radio')}Ajuste o ${Kart.veiculo} e faça a volta.</p>`, { classe: 'cartao-radio', extra: painelRadio() })}
        </div>
      </div>`;
  }

  // Rival de carreira: o mesmo adversário do kart à F1, com o placar de todas as corridas juntos.
  function cartaoRivalCarreira() {
    const r = estado.rivalCarreira;
    const noGrid = C.rivalCarreira(estado);
    if (!r || !noGrid) return '';
    const tabela = C.classificacaoCampeonato(estado);
    const posEle = tabela.findIndex((x) => x.id === 'rc') + 1;
    const eq = C.equipeBase(noGrid.equipe);
    const [eu, ele] = [r.duelo.eu, r.duelo.ele];
    const anos = r.temporadas.slice(-4).map((t) => `${t.ano} ${C.campeonato(t.campeonato).curto} P${t.pos}`).join(' · ');
    return cartao('Rival de carreira', `<div class="duelo-topo"><span>Você</span><span class="fraco">×</span><span>${esc(r.nome)}</span></div>
      <div class="duelo-linha"><b class="${eu > ele ? 'dinheiro' : ''}">${eu}</b><span>Corridas à frente</span><b class="${ele > eu ? 'negativo' : ''}">${ele}</b></div>
      ${estado.etapa > 0 ? `<div class="duelo-linha"><b>P${C.posicaoNoCampeonato(estado)}</b><span>Campeonato</span><b>P${posEle}</b></div>` : ''}
      <p class="fraco mini">${esc(r.nome)} corre pela ${esc(eq.nome)}. Vocês começaram juntos no kart${anos ? `: ${esc(anos)}` : ''}.</p>`, { classe: 'cartao-duelo' });
  }

  function cartaoProximaEtapa() {
    const pista = C.pistaAtual(estado);
    const clima = C.climaAtual(estado);
    const custo = C.custoEtapa(estado);
    const semDinheiro = estado.dinheiro < custo;
    const total = C.etapasDe(estado);
    // Até 10 etapas, uma bolinha por etapa; calendários longos (F2, F1) viram uma barra de progresso.
    const pontos = total <= 10
      ? Array.from({ length: total }, (_, i) => `<i class="${i < estado.etapa ? 'feita' : i === estado.etapa ? 'atual' : ''}"></i>`).join('')
      : `<span class="etapas-barra"><i style="width:${(estado.etapa / total) * 100}%"></i></span>`;
    return `<section class="painel hero">
      <header class="cartao-topo"><h3>Etapa ${estado.etapa + 1}/${total}</h3><span class="etapas" aria-hidden="true">${pontos}</span><span class="espaco"></span>${botaoAjuda('etapa')}</header>
      <div class="hero-corpo">
        <div class="hero-pista">
          <h2>${tituloForte(pista.nome)}</h2>
          <div class="chips">${chipTipo(pista.tipo)}${chip(`${ic('montanha')}${pista.altitude} m`)}${chip(esc(pista.local))}</div>
          <button class="ver-pista" data-acao="ver-pista"><span class="ver-pista-texto"><b>Ver pista</b><small>Retas, curvas, zebras e asfalto</small></span><span aria-hidden="true">›</span></button>
          ${chipRival()}
        </div>
        <div class="climas">${climaBloco('Manhã', clima.manha, clima.nuvens)}${climaBloco('Tarde', clima.tarde, clima.nuvens)}${botaoAjuda('clima')}</div>
        <div class="hero-acao">
          ${checklist()}
          ${estado.campeonato === 'f1' ? tile('Salário da etapa', `+${reais(C.salarioEtapa(estado))}`, 'dinheiro')
            : tile('Custo da etapa', estado.contrato && estado.contrato.custoEtapa === 0 ? 'Grátis' : `−${reais(custo)}`, estado.contrato && estado.contrato.custoEtapa === 0 ? '' : 'negativo')}
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
      <b>${ic('pare')}Motor engripado</b>
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
      <button data-acao="psicologo">${ic('conversa')}Psicólogo · ${reais(C.precoPsicologo(estado))}</button>`, { ajuda: 'cabeca', classe: 'cartao-cabeca' });
  }

  // Folha com o que fazer com um jogo de pneus: vender, doar ou descartar.
  function folhaPneu() {
    const p = tela.pneuOpcoes && estado.pneus.find((x) => x.id === tela.pneuOpcoes);
    if (!p) return '';
    const n = estado.pneus.filter((x) => x.tipo === p.tipo).indexOf(p) + 1;
    const pct = desgastePct(p.uso, p.tipo);
    const jaDoou = estado.doacaoEtapa === `${estado.ano}-${estado.etapa}`;
    const noFim = C.pneuNoFim(estado, p);
    return `<div class="folha-fundo" data-acao-fundo="fechar-pneu"><div class="folha folha-neutra" role="dialog" aria-modal="true" aria-labelledby="folha-pneu-titulo">
      <h3 id="folha-pneu-titulo">${nomePneu(p.tipo)} #${n} · ${C.pneuNovo(p) ? 'novo' : `${100 - pct}% de vida`}</h3>
      ${noFim ? '' : `<p class="fraco mini">Vender ou doar só no fim da vida (${Math.round(C.GASTO_PARA_SAIR * 100)}% gasto ou mais). Este ainda tem ${100 - pct}%.</p>`}
      <button class="compra" data-acao="vender-pneu" data-id="${p.id}" ${noFim ? '' : 'disabled'}><b>${ic('carteira')}Vender para outra equipe</b><span class="${noFim ? 'dinheiro' : ''}">${noFim ? `+${reais(C.valorVendaPneu(estado, p))}` : 'Ainda tem muita vida'}</span></button>
      <button class="compra" data-acao="doar-pneu" data-id="${p.id}" ${jaDoou || !noFim ? 'disabled' : ''}><b>${ic('coracao')}Doar para a escolinha</b><span>${!noFim ? 'Ainda tem muita vida' : jaDoou ? 'Você já doou nesta etapa' : 'Moral e popularidade sobem'}</span></button>
      <button class="compra" data-acao="descartar-pneu" data-id="${p.id}" data-confirmar="Confirmar: jogar fora"><b>${ic('lixo')}Jogar fora</b><span>Sem retorno</span></button>
      <button data-acao="fechar-pneu">Cancelar</button>
    </div></div>`;
  }

  // Equipe de box (monopostos): nível 1/3 a 3/3.
  function cartaoBox() {
    const nivel = C.nivelBox(estado);
    const info = C.EQUIPE_BOX[nivel];
    const prox = C.EQUIPE_BOX[nivel + 1];
    const barras = Array.from({ length: C.NIVEL_BOX_MAX }, (_, i) => `<i class="${i < nivel ? 'cheia' : ''}"></i>`).join('');
    let botao;
    if (!prox) botao = `<p class="fraco mini">${ic('check')}Equipe de box no nível máximo.</p>`;
    else if (!BoxPremium.ativo) botao = `<button class="compra premium-trancado" data-acao="premium" data-motivo="Melhorar a equipe de box é do Premium."><b>${ic('cadeado')}Melhorar para ${nivel + 1}/${C.NIVEL_BOX_MAX}</b><span>Premium · ${prox.nome.toLowerCase()}</span></button>`;
    else botao = `<button class="compra" data-acao="melhorar-box" data-confirmar="Confirmar: −${reais(C.precoBox(estado))}" ${estado.dinheiro < C.precoBox(estado) ? 'disabled' : ''}><b>${ic('subir')}Melhorar para ${nivel + 1}/${C.NIVEL_BOX_MAX} · ${prox.nome.toLowerCase()}</b><span>${reais(C.precoBox(estado))}</span></button>`;
    return cartao('Equipe de box', `<div class="linha"><b>${info.nome}</b><span class="espaco"></span><span class="nivel-box" aria-label="Nível ${nivel} de ${C.NIVEL_BOX_MAX}">${barras}<b>${nivel}/${C.NIVEL_BOX_MAX}</b></span></div>
      <p class="fraco mini">Uma equipe mais treinada faz a parada mais rápida (alguns centésimos), mais regular e com menos chance de dar problema.</p>
      ${botao}`, { ajuda: 'box', classe: 'cartao-box' });
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
        ${estado.motorQuebrado ? '<span class="negativo"><b>Engripado</b></span>'
          : horas > 0 ? `<button data-acao="revisar">Revisar · ${reais(C.precoRevisao(estado))}</button>`
            : `<button disabled>${ic('check')}Motor 100%</button>`}</div>
      <div class="linha"><span class="fraco mini">Pneus no estoque</span><span class="espaco"></span><b class="${estado.pneus.length >= C.espacoPneus(estado) ? 'aviso' : ''}">${estado.pneus.length}/${C.espacoPneus(estado)}</b></div>
      ${pneusVisuais(false)}
      ${botoesComprarPneu()}
      ${botaoRepor()}
      ${!BoxPremium.ativo ? `<button class="compra premium-trancado" data-acao="premium" data-motivo="Mais espaço no estoque de pneus é do Premium."><b>${ic('cadeado')}Mais espaço no estoque</b><span>Premium · até ${C.limiteEspaco(estado)} vagas nesta categoria</span></button>`
        : C.espacoPneus(estado) < C.limiteEspaco(estado)
        ? `<button class="compra" data-acao="comprar-espaco" data-confirmar="Confirmar: −${reais(C.precoEspaco(estado))}" ${estado.dinheiro < C.precoEspaco(estado) ? 'disabled' : ''}><b>${ic('subir')}Mais espaço no estoque</b><span>+1 vaga (${C.espacoPneus(estado) + 1}/${C.limiteEspaco(estado)}) · ${reais(C.precoEspaco(estado))}</span></button>`
        : `<p class="fraco mini">Estoque no máximo desta categoria (${C.limiteEspaco(estado)} vagas). Na próxima categoria cabe mais.</p>`}`, { ajuda: 'oficina', classe: 'cartao-oficina' });
  }

  function linhaPatrocinio(o, oferta) {
    const meta = `${chip(`${ic('alvo')}${C.textoMeta(o.meta)}`)}${chip(`${ic('presente')}+${reais(o.bonus)}`)}`;
    if (!oferta) {
      const curto = o.ate != null;
      const faltam = curto ? o.ate - estado.etapa : 0;
      return `<div class="item">
        <div class="item-topo"><b>${esc(o.empresa)}</b><b class="dinheiro">${reais(o.porEtapa)}<span class="fraco">/etapa</span></b></div>
        <div class="chips">${curto ? chip(`${ic('relogio')}${C.DURACOES_PATROCINIO[o.duracao].nome} · ${faltam === 1 ? 'última etapa' : `faltam ${faltam} etapas`}`, faltam === 1 ? 'chip-amarelo' : '') : `${chip(`${ic('relogio')}Temporada`)}${meta}`}</div>
      </div>`;
    }
    // Oferta: o jogador escolhe o prazo. Curto paga mais por etapa; só a temporada tem meta e bônus.
    const prazos = C.duracoesPatrocinio(estado, o).map((d) => `<button class="${d.id === 'temporada' ? 'principal ' : ''}prazo" data-acao="aceitar-patrocinio" data-id="${o.id}" data-duracao="${d.id}">
        <b>${d.nome}</b><span>${d.etapas} etapa${d.etapas > 1 ? 's' : ''}</span><span class="prazo-valor">${reais(d.porEtapa)}</span><span>${d.bonus ? '+ bônus' : 'sem meta'}</span></button>`).join('');
    return `<div class="item">
      <div class="item-topo"><b>${esc(o.empresa)}</b><b class="dinheiro">${reais(o.porEtapa)}<span class="fraco">/etapa</span></b></div>
      <div class="chips">${meta}</div>
      <span class="fraco mini">Fechar por quanto tempo? A meta e o bônus valem só no contrato da temporada.</span>
      <div class="prazos">${prazos}</div>
      <button class="link-recusar" data-acao="recusar-patrocinio" data-id="${o.id}">Recusar</button>
    </div>`;
  }

  function cartaoPatrocinio() {
    // Vagas do macacão: as do Premium aparecem com cadeado para quem não tem.
    const vagas = Array.from({ length: C.MAX_PATROCINIOS }, (_, i) => `<i class="${i < estado.patrocinios.length ? 'cheia' : i >= C.maxPatrocinios() ? 'trancada' : ''}"></i>`).join('');
    const ofertas = estado.ofertasPatrocinio;
    return cartao('Patrocínio', `
      ${estado.patrocinios.map((o) => linhaPatrocinio(o, false)).join('')}
      ${ofertas.length ? `<span class="subtitulo">Ofertas</span>${ofertas.map((o) => linhaPatrocinio(o, true)).join('')}` : ''}
      ${!estado.patrocinios.length && !ofertas.length ? '<p class="vazio">Nenhuma empresa por enquanto.</p>' : ''}
      <div class="chips">${chip(`${ic('estrela')}Popularidade ${Math.round(estado.piloto.popularidade)}`)}</div>
      ${!BoxPremium.ativo ? `<button class="link-premium" data-acao="premium">${ic('cadeado')}Até ${C.MAX_PATROCINIOS} patrocinadores com o Premium</button>` : ''}`,
    { ajuda: 'patrocinio', classe: 'cartao-patrocinio', extra: `<span class="vagas" aria-label="${estado.patrocinios.length} de ${C.maxPatrocinios()}">${vagas}</span>` });
  }

  // Banco: empréstimo do Premium. Sem o Premium, o cartão mostra o limite e o cadeado.
  const FRACOES_EMPRESTIMO = [0.25, 0.5, 1];
  function cartaoBanco() {
    const limite = C.limiteEmprestimo(estado);
    const e = estado.emprestimo;
    const opc = { ajuda: 'banco', classe: 'cartao-banco' };
    if (e) {
      const pagas = e.prazo - e.restantes;
      const quitar = C.valorQuitacao(estado);
      return cartao('Banco', `
        <div class="tiles">${tile('Parcela', reais(e.parcela), 'negativo')}${tile('Faltam', `${e.restantes} ${e.restantes === 1 ? 'etapa' : 'etapas'}`)}${tile('Saldo', reais(e.saldo))}</div>
        <div class="banco-barra" aria-label="${pagas} de ${e.prazo} parcelas pagas"><i style="width:${Math.round((pagas / e.prazo) * 100)}%"></i></div>
        <p class="fraco mini">Empréstimo de ${reais(e.valor)}. A parcela sai do caixa ao fim de cada etapa${e.atrasos ? `; ${e.atrasos} ${e.atrasos === 1 ? 'parcela atrasou' : 'parcelas atrasaram'} (multa no saldo)` : ''}.</p>
        <button class="grande" data-acao="quitar-emprestimo" data-confirmar="Toque de novo para quitar" ${estado.dinheiro >= quitar ? '' : 'disabled'}>${ic('check')}Quitar agora · ${reais(quitar)}</button>`, opc);
    }
    if (!BoxPremium.ativo) {
      return cartao('Banco', `<p class="fraco">Empréstimo de até <b>${reais(limite)}</b> para investir no carro e na carreira, pago em parcelas a cada etapa.</p>
        <button class="grande premium-trancado" data-acao="premium" data-motivo="O banco é do Premium: empréstimo para investir no carro e na carreira.">${ic('cadeado')}Banco · Premium</button>`, opc);
    }
    const b = tela.banco || (tela.banco = { fracao: 1, prazo: 8 });
    const valor = Math.round((limite * FRACOES_EMPRESTIMO[b.fracao]) / 1000) * 1000;
    const sim = C.simularEmprestimo(valor, b.prazo);
    return cartao('Banco', `
      <p class="fraco mini">Limite de crédito: <b>${reais(limite)}</b> (cresce com a categoria e a popularidade).</p>
      <span class="subtitulo">Valor</span>
      <div class="segmentos" data-seg="banco-valor">${FRACOES_EMPRESTIMO.map((f, i) => `<button data-acao="banco-valor" data-valor="${i}" class="${b.fracao === i ? 'ativo' : ''}">${caixaCurto(Math.round((limite * f) / 1000) * 1000)}</button>`).join('')}</div>
      <span class="subtitulo">Prazo</span>
      <div class="segmentos" data-seg="banco-prazo">${Object.keys(C.PRAZOS_EMPRESTIMO).map((p) => `<button data-acao="banco-prazo" data-valor="${p}" class="${b.prazo === +p ? 'ativo' : ''}">${p} etapas</button>`).join('')}</div>
      <div class="tiles">${tile('Parcela', reais(sim.parcela), 'negativo')}${tile(`Juros ${Math.round(C.PRAZOS_EMPRESTIMO[b.prazo] * 100)}%`, reais(sim.juros), 'aviso')}${tile('Total', reais(sim.total))}</div>
      <button class="principal grande" data-acao="pegar-emprestimo" data-confirmar="Toque de novo para confirmar">${ic('carteira')}Pegar ${reais(valor)}</button>`, opc);
  }

  function cartaoProposta(pr) {
    const atual = C.equipeBase(estado.equipeId);
    const nova = C.equipeBase(pr.equipe);
    const tipo = { fabrica: 'Piloto de fábrica', desconto: 'Vaga com desconto', furada: 'Vaga com desconto' }[pr.tipo];
    return `<div class="item" style="border-left:4px solid ${nova.cor}">
      <div class="item-topo"><b>${esc(pr.nome)}</b>${chip(tipo)}</div>
      <div class="tiles">${tile('Kart', `${pr.materialPrometido} <span class="fraco">vs ${atual.material}</span>`)}${tile('Por etapa', pr.custoEtapa ? reais(pr.custoEtapa) : 'Grátis', 'dinheiro')}${tile('Multa', reais(pr.multa), 'aviso')}</div>
      ${pr.segundoPiloto ? chip(`${ic('alerta')}Segundo piloto`, 'chip-amarelo') : ''}
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
  // Sigla de três letras pelo sobrenome (ROBERTS → ROB). Se dois pilotos do grid caírem na mesma sigla,
  // o segundo vira primeira letra + consoantes seguintes (ROBLES → RBL), como na TV.
  const siglaBase = (nome) => semAcento(nome.trim().split(/\s+/).pop()).replace(/[^A-Za-z]/g, '').toUpperCase();
  let siglasCache = { chave: '', mapa: {} };
  function siglasDoGrid() {
    const nomes = estado ? [estado.piloto.nome, ...estado.rivais.map((r) => r.nome)] : [];
    const chave = nomes.join('|');
    if (siglasCache.chave === chave) return siglasCache.mapa;
    const usadas = new Set();
    const mapa = {};
    for (const nome of nomes) {
      const b = siglaBase(nome);
      const consoantes = b.slice(1).replace(/[AEIOUY]/g, '');
      const opcoes = [b.slice(0, 3), b[0] + consoantes.slice(0, 2), b[0] + b.slice(1, 2) + b.slice(-1), b[0] + consoantes.slice(-2), b.slice(0, 2) + b.slice(-1)]
        .filter((x) => x.length === 3);
      let s = opcoes.find((x) => !usadas.has(x));
      for (let i = 2; !s; i++) s = b.slice(0, 2) + i;
      usadas.add(s);
      mapa[nome] = s;
    }
    siglasCache = { chave, mapa };
    return mapa;
  }
  const sigla = (nome) => siglasDoGrid()[nome] || siglaBase(nome).slice(0, 3);
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
    const destino = proximo ? proximo.curto : null;
    return `<div class="classificacao">${tabela.map((x, i) => {
      const eq = C.equipeBase(x.equipe);
      const eu = x.id === 'jogador';
      const seguido = estado.seguindo === x.id;
      const corte = destino && i === C.VAGAS_SUBIDA ? `<div class="camp-corte"><span>▲ Os ${C.VAGAS_SUBIDA} primeiros sobem para ${camp.ordem >= 2 ? 'a' : 'o'} ${destino}</span></div>` : '';
      return `${corte}<div class="camp-linha ${eu ? 'jogador' : ''} ${seguido ? 'seguido' : ''} ${i < C.VAGAS_SUBIDA ? 'sobe' : ''}">
        <span class="camp-pos"><b>${i + 1}</b><small>${x.pontos} pts</small></span>
        <i class="camp-cor" style="background:${eq.cor}"></i>
        <span class="camp-nome"><span>${nomeDestaque(x.nome)}</span><small>${esc(eq.nome)}${x.vitorias ? ` · ${x.vitorias} vitória${x.vitorias > 1 ? 's' : ''}` : ''}</small></span>
        ${eu ? '<span class="chip">Você</span>' : `<button class="seguir ${seguido ? 'ativo' : ''}" data-acao="seguir" data-id="${x.id}" aria-pressed="${seguido}" aria-label="${seguido ? 'Deixar de seguir' : 'Seguir'} ${esc(x.nome)}">${icone('estrela', seguido ? 'ico-cheio' : '')}</button>`}
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
        <span class="cal-nome"><b>${esc(pista.nome)}</b><small>${esc(pista.local)} · ${tipoPista[pista.tipo][1]}</small></span>
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
    const atual = estado.fase === 'relatorio' ? C.etapasDe(estado) : estado.etapa + 1;
    const d = atual - (n.etapa || atual);
    return d <= 0 ? 'nesta etapa' : d === 1 ? 'na etapa passada' : `há ${d} etapas`;
  }

  // Ondinha de áudio (decorativa) para as falas do rádio; o formato vem do próprio texto.
  // Rádio "de verdade": luz de canal aberto e equalizador no título; a última saída chega como
  // transmissão: cada mensagem entra com chiado, "..." enquanto o piloto aperta o botão e o texto
  // sendo falado. Tocar no cartão pula a transmissão.
  const painelRadio = () => `<span class="radio-canal" aria-hidden="true"><i class="radio-luz"></i>Canal 1<span class="radio-eq">${'<i></i>'.repeat(5)}</span></span>`;
  let transmissao = 0;
  function transmitirRadio() {
    const cartaoEl = app.querySelector('.cartao-radio');
    const saida = cartaoEl && cartaoEl.querySelector('.saida');
    if (!saida || menosMovimento()) return;
    const id = ++transmissao;
    const vivo = () => id === transmissao && saida.isConnected;
    const bolhas = [...saida.querySelectorAll('.bolha')];
    const textos = bolhas.map((b) => { const t = [...b.querySelector('p').childNodes].filter((n) => n.nodeType === 3); const txt = t.map((n) => n.textContent).join(''); t.forEach((n) => n.remove()); return txt; });
    const fala = bolhas.map((b) => { const span = document.createElement('span'); span.className = 'radio-fala'; b.querySelector('p').append(span); b.hidden = true; return span; });
    cartaoEl.classList.add('transmitindo');
    saida.classList.add('chegando');
    const terminar = () => {
      if (id !== transmissao) return;
      transmissao++;
      bolhas.forEach((b, i) => { b.hidden = false; b.classList.remove('digitando'); fala[i].textContent = textos[i]; });
      cartaoEl.classList.remove('transmitindo');
      cartaoEl.removeEventListener('click', terminar);
    };
    cartaoEl.addEventListener('click', terminar);
    let i = 0;
    const proxima = () => {
      if (!vivo()) return;
      if (i >= bolhas.length) { setTimeout(terminar, 350); return; }
      const b = bolhas[i], alvo = fala[i], txt = textos[i];
      b.hidden = false;
      b.classList.add('digitando', 'chiado');
      setTimeout(() => {
        if (!vivo()) return;
        b.classList.remove('digitando');
        let n = 0;
        const passo = () => {
          if (!vivo()) return;
          n = Math.min(txt.length, n + 2);
          alvo.textContent = txt.slice(0, n);
          if (n < txt.length) setTimeout(passo, 22);
          else { b.classList.remove('chiado'); i++; setTimeout(proxima, 380); }
        };
        passo();
      }, 650);
    };
    setTimeout(proxima, 250);
  }

  function onda(texto) {
    let h = 7;
    for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const barras = Array.from({ length: 14 }, (_, i) => { h = (h * 1103515245 + 12345) >>> 0; return 30 + (h % 70) * (i % 3 === 0 ? 1 : 0.7); });
    return `<span class="onda" aria-hidden="true">${barras.map((v) => `<i style="height:${Math.round(v)}%"></i>`).join('')}</span>`;
  }

  // Recordes do jogador na carreira inteira.
  function cartaoRecordes() {
    const r = C.recordesCarreira(estado);
    const n = (rotulo, valor) => `<span><b>${valor}</b>${rotulo}</span>`;
    const cats = Object.entries(r.porCategoria).sort((a, b) => C.campeonato(a[0]).ordem - C.campeonato(b[0]).ordem);
    return cartao('Recordes da carreira', `<div class="fim-numeros recordes-numeros">
        ${n('corridas', r.corridas)}${n(r.vitorias === 1 ? 'vitória' : 'vitórias', r.vitorias)}${n('pódios', r.podios)}${n(r.titulos === 1 ? 'título' : 'títulos', r.titulos)}
        ${n('poles', r.poles)}${n('voltas rápidas', r.voltasRapidas)}${n('sprints', r.sprintsVencidas)}${n('pontos', r.pontos)}
      </div>
      ${r.primeiraVitoria ? `<p class="fraco mini">Primeira vitória: ${esc(r.primeiraVitoria.pista)} (${C.campeonato(r.primeiraVitoria.campeonato).curto}, ${r.primeiraVitoria.ano}).</p>` : ''}
      ${cats.length ? `<span class="subtitulo">Por categoria</span><div class="recordes-cat">${cats.map(([id, c]) => `<div class="degrau"><b>${esc(C.campeonato(id).curto)}</b><span>${c.vitorias} vit. · ${c.podios} pód. · melhor P${c.melhor || '—'}</span><span class="${c.titulos ? 'dinheiro' : 'fraco'}">${c.titulos ? `${c.titulos}× campeão` : c.melhorCampeonato && c.melhorCampeonato < 99 ? `P${c.melhorCampeonato} no ano` : ''}</span></div>`).join('')}</div>` : ''}
      <span class="subtitulo">Recordes de pista que são seus</span>
      ${r.pistas.length ? `<div class="recordes-cat">${r.pistas.map((x) => `<div class="degrau"><b>${tempoVolta(x.tempo)}</b><span>${esc(x.pista || nomePistaPorChave(x.chave))}</span><span class="fraco">${x.campeonato ? esc(C.campeonato(x.campeonato).curto) : ''} ${x.ano}</span></div>`).join('')}</div>` : '<p class="vazio">Nenhum ainda. Bata o recorde de uma pista no treino, na classificação ou na corrida.</p>'}`);
  }
  const nomePistaPorChave = (chave) => {
    const id = chave.split(':').pop();
    const p = Object.values(Dados.KARTODROMOS).flat().find((x) => x.id === id);
    return p ? p.nome : id;
  };

  function cartaoConquistas() {
    const feitas = estado.conquistas || {};
    const total = C.CONQUISTAS.length;
    const qtd = C.CONQUISTAS.filter((c) => feitas[c.id]).length;
    const item = (c) => `<div class="conquista ${feitas[c.id] ? 'feita' : ''}">
        ${icone(feitas[c.id] ? 'trofeu' : 'estrela')}<span><b>${esc(c.nome)}</b><small>${esc(c.texto)}${feitas[c.id] ? ` · ${feitas[c.id].ano}` : ''}</small></span></div>`;
    // Feitas primeiro, depois as três próximas; o resto fica em "ver todas".
    const feitasL = C.CONQUISTAS.filter((c) => feitas[c.id]);
    const faltam = C.CONQUISTAS.filter((c) => !feitas[c.id]);
    return cartao(`Conquistas · ${qtd}/${total}`, `<div class="barra-conquistas"><i style="width:${(qtd / total) * 100}%"></i></div>
      <div class="conquistas">${feitasL.map(item).join('')}${faltam.slice(0, 3).map(item).join('')}</div>
      ${faltam.length > 3 ? `<details class="mais-conquistas"><summary>Ver todas (${faltam.length - 3} a mais)</summary><div class="conquistas">${faltam.slice(3).map(item).join('')}</div></details>` : ''}`);
  }

  // Na primeira vez da F3 em diante: como funciona o estoque de quatro tipos de pneu.
  function folhaTutorialPneus() {
    if (!C.quatroPneus(estado) || estado.tutorialPneus || tela.checagem) return '';
    const camp = C.campeonato(estado.campeonato);
    const tipo = (cls, nome, texto) => `<div class="tut-pneu"><span class="pneu-roda ${cls}" aria-hidden="true"></span><span><b>${nome}</b><small>${texto}</small></span></div>`;
    return `<div class="folha-fundo"><div class="folha" role="dialog" aria-modal="true" aria-labelledby="tut-titulo">
      <h3 id="tut-titulo">Pneus da ${esc(camp.curto)} em diante</h3>
      <p class="fraco">Agora o estoque tem quatro tipos de pneu, e você só corre com o que estiver nele.</p>
      ${tipo('slick macio', 'Macio', 'O mais rápido. Gasta rápido: bom para classificar.')}
      ${tipo('medio', 'Médio', 'O meio-termo entre ritmo e duração.')}
      ${tipo('duro', 'Duro', 'Mais lento, mas aguenta muitas voltas.')}
      ${tipo('chuva', 'Chuva', 'Obrigatório no estoque. Sem ele, chuva é com pneu de seco.')}
      <ul class="tut-regras">
        <li>Para correr: o pneu de chuva e ${camp.compostos ? 'dois compostos de seco diferentes (a corrida tem parada obrigatória)' : 'pelo menos um composto de seco (na F3 não tem parada)'}.</li>
        <li>Na pista não se compra pneu: o fim de semana é com o estoque que você levou.</li>
        <li>Cada jogo volta gasto depois da corrida. Use "Repor estoque" na oficina antes de cada etapa.</li>
      </ul>
      <button class="principal grande" data-acao="tutorial-pneus">Entendi</button>
    </div></div>`;
  }

  // Teto do piloto (estimado pelos olheiros) e preparação que sobe esse teto.
  function cartaoPreparacao() {
    const p = estado.piloto;
    const teto = C.tetoEstimado(estado);
    const proxima = C.campeonato(C.PROXIMA_CATEGORIA[estado.campeonato] || 'f1');
    const niveis = ['f2', 'f1'].map((id) => `${C.campeonato(id).curto} pede ~${C.campeonato(id).nivel}`).join(' · ');
    const linhas = Object.entries(C.PREPARACAO).map(([tipo, info]) => {
      const nivel = C.nivelPrep(estado, tipo);
      const barras = Array.from({ length: C.NIVEL_PREP_MAX }, (_, i) => `<i class="${i < nivel ? 'cheia' : ''}"></i>`).join('');
      const preco = C.precoPrep(estado, tipo);
      const botao = nivel >= C.NIVEL_PREP_MAX ? `<p class="fraco mini">${ic('check')}Nível máximo.</p>`
        : `<button class="compra" data-acao="preparar" data-id="${tipo}" data-confirmar="Confirmar: −${reais(preco)}" ${estado.dinheiro < preco || estado.fase === 'fds' ? 'disabled' : ''}><b>${ic('subir')}Nível ${nivel + 1}: teto +1</b><span>${reais(preco)}</span></button>`;
      return `<div class="item"><div class="linha"><b>${info.nome}</b><span class="espaco"></span><span class="nivel-box">${barras}<b>${nivel}/${C.NIVEL_PREP_MAX}</b></span></div><p class="fraco mini">${info.texto}</p>${botao}</div>`;
    }).join('');
    return cartao('Teto e preparação', `<div class="item-topo"><span>Teto estimado pelos olheiros</span><b>${teto.min}–${teto.max}</b></div>
      <p class="fraco mini">Os atributos param de crescer perto do teto. Para brigar na frente: ${niveis}. Preparação física e simulador sobem o teto.</p>
      ${linhas}`, { classe: 'cartao-preparacao', ajuda: 'preparacao' });
  }

  // F1: peças novas para o carro, que valem até o fim da temporada.
  function cartaoDesenvolvimento() {
    const linhas = Object.entries(C.AREAS_DEV).map(([area, nome]) => {
      const nivel = C.nivelDev(estado, area);
      const barras = Array.from({ length: C.NIVEL_DEV_MAX }, (_, i) => `<i class="${i < nivel ? 'cheia' : ''}"></i>`).join('');
      const preco = C.precoDev(estado, area);
      const botao = nivel >= C.NIVEL_DEV_MAX ? `<span class="fraco mini">${ic('check')}Máximo</span>`
        : `<button class="compra" data-acao="desenvolver" data-id="${area}" data-confirmar="Confirmar: −${reais(preco)}" ${estado.dinheiro < preco ? 'disabled' : ''}><b>${ic('subir')}+${C.GANHO_DEV}</b><span>${reais(preco)}</span></button>`;
      return `<div class="dev-linha"><span><b>${nome}</b><span class="nivel-box">${barras}</span></span>${botao}</div>`;
    }).join('');
    return cartao('Desenvolvimento do carro', `<p class="fraco mini">Peças novas para o seu carro. Cada nível soma ${C.GANHO_DEV} pontos na área até o fim da temporada; no ano seguinte o carro é novo.</p>${linhas}`, { classe: 'cartao-dev', ajuda: 'desenvolvimento' });
  }

  // Pontos de evolução: o jogador escolhe onde o piloto melhora. + investe, − devolve o que foi
  // investido desde o último fim de temporada (quando a temporada nova começa, fica valendo).
  function cartaoPontosEvolucao(r) {
    const p = estado.piloto;
    const sobra = estado.pontosEvolucao || 0;
    const dist = estado.distribuidos || {};
    if (!sobra && !Object.values(dist).some((n) => n > 0)) return '';
    const linhas = C.ATRIBUTOS.map((a) => {
      const n = dist[a] || 0;
      const teto = p[a] >= p.potencial;
      return `<div class="evo-linha"><span>${C.NOMES_ATRIBUTOS[a]}</span>
        <button class="evo-btn" data-acao="devolver-ponto" data-a="${a}" ${n ? '' : 'disabled'} aria-label="Tirar ponto de ${C.NOMES_ATRIBUTOS[a]}">−</button>
        <b>${p[a]}${n ? `<small class="dinheiro"> +${n}</small>` : ''}</b>
        <button class="evo-btn mais" data-acao="investir-ponto" data-a="${a}" ${sobra && !teto ? '' : 'disabled'} aria-label="Pôr ponto em ${C.NOMES_ATRIBUTOS[a]}">+</button>
        ${teto ? '<small class="fraco evo-teto">no limite</small>' : ''}</div>`;
    }).join('');
    const ganho = r && r.pontosEvolucao ? `<p class="fraco mini">Este ano: ${C.pontosEvolucaoDa(99)} pela temporada${r.pontosEvolucao - C.pontosEvolucaoDa(99) - r.vitorias > 0 ? ` + ${r.pontosEvolucao - C.pontosEvolucaoDa(99) - r.vitorias} pelo P${r.pos}` : ''}${r.vitorias ? ` + ${r.vitorias} ${r.vitorias === 1 ? 'pela vitória' : 'pelas vitórias'}` : ''} = <b>${r.pontosEvolucao}</b>.</p>` : '';
    return cartao('Pontos de evolução', `
      <div class="evo-sobra"><b>${sobra}</b><span>${sobra === 1 ? 'ponto para distribuir' : 'pontos para distribuir'}</span></div>
      ${ganho}${linhas}
      <p class="fraco mini">Cada ponto vale +1, até o limite do piloto. Dá para mudar até a temporada começar; o que sobrar fica guardado.</p>`, { classe: 'cartao-evolucao destaque', ajuda: 'evolucao' });
  }

  function painelPiloto() {
    const p = estado.piloto;
    const ultimos = estado.historico.slice(-10).reverse();
    return `<div class="grade">
      ${cartaoPontosEvolucao()}
      ${cartao(esc(p.nome), C.ATRIBUTOS.map((a) => barra(C.NOMES_ATRIBUTOS[a], p[a])).join(''))}
      ${cartaoCabeca()}
      ${cartaoPreparacao()}
      ${cartaoRecordes()}
      ${cartaoOlheiros()}
      ${cartaoConquistas()}
      ${cartao(`Campeonato ${estado.ano}`, graficoPosicao(estado.evolucao.filter((e) => e.ano === estado.ano && e.campeonato === estado.campeonato).map((e) => ({ rotulo: `Etapa ${e.etapa}`, curto: `E${e.etapa}`, pos: e.pos }))))}
      ${estado.temporadas.length >= 2 ? cartao('Carreira', graficoPosicao(estado.temporadas.map((t) => ({ rotulo: `${t.ano} ${C.campeonato(t.campeonato).curto}`, curto: String(t.ano), pos: t.pos })))) : ''}
      ${cartao('Últimas corridas', ultimos.length
        ? `<div class="resultados">${ultimos.map((h) => `<div class="resultado-bolinha ${h.fora ? 'fora' : h.pos === 1 ? 'ouro' : h.pos <= 3 ? 'podio' : h.pos <= 10 ? 'pontos' : ''}" title="${esc(h.pista)} ${h.ano}">${h.fora ? icone('x') : h.pos}</div>`).join('')}</div>`
        : '<p class="vazio">Nenhuma corrida ainda.</p>')}
    </div>`;
  }

  // Anotações agrupadas por fim de semana (mais recente primeiro), em ordem: treinos, classificação, corrida.
  function notaCaderno(n) {
    const pedia = [n.motor, n.pneu, ...n.ajustes].filter(Boolean);
    return `<div class="nota">
      ${n.sentiu.map((f) => `<p>${ic('piloto')}${esc(f)}</p>`).join('')}
      ${pedia.length ? `<span class="subtitulo">O ${Kart.monoposto() ? 'carro' : 'kart'} pedia</span><ul class="diagnostico">${pedia.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${n.texto ? `<p class="nota-texto">${ic('lapis')}${esc(n.texto)}</p>` : ''}
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
          <div class="item-topo"><span class="chips">${chip(nome, l.sessao === 'corrida' ? 'chip-grande' : '')}${chip(ic(l.molhado ? 'chuva' : 'sol'))}${chip(`${l.tempPista}°`)}</span>
            <b>${l.tempo ? tempoVolta(l.tempo) : '—'} <span class="pos-mini ${!l.fora && l.posicao <= 3 ? 'top' : ''}">${pos}</span></b></div>
          <div class="fraco">${(Kart.PNEUS_KART[l.pneu] || { nome: l.pneu || "—" }).nome} · ${esc(Kart.descreverSetup(l.setup))}</div>
          ${l.nota ? notaCaderno(l.nota) : ''}
        </div>`;
      }).join('');
      return `<div class="anotacoes"><span class="subtitulo">${l0.ano}${l0.etapa ? ` · etapa ${l0.etapa}` : ''}${l0.campeonato ? ` · ${esc(C.campeonato(l0.campeonato).curto)}` : ''}</span>${linhas}</div>`;
    }).join('');
  }

  // Caderno por ano, do mais recente para o mais antigo; dentro do ano, cada etapa (a mais recente primeiro).
  function painelCaderno() {
    const pistas = Object.keys(estado.caderno);
    if (!pistas.length) return cartao('Caderno', '<p class="vazio">Cada saída de treino, a classificação e a corrida aparecem aqui.</p>');
    const todas = Object.values(Dados.KARTODROMOS).flat();
    const nome = (id) => (todas.find((x) => x.id === id) || { nome: id }).nome;
    const visitas = new Map();
    for (const id of pistas) {
      for (const l of estado.caderno[id]) {
        const chave = `${l.ano}|${l.campeonato || ''}|${l.etapa || 0}|${id}`;
        if (!visitas.has(chave)) visitas.set(chave, { id, ano: l.ano, etapa: l.etapa || 0, ordem: (C.campeonato(l.campeonato) || { ordem: 0 }).ordem, itens: [] });
        visitas.get(chave).itens.push(l);
      }
    }
    const lista = [...visitas.values()].sort((a, b) => b.ano - a.ano || b.ordem - a.ordem || b.etapa - a.etapa);
    const anos = [...new Set(lista.map((v) => v.ano))];
    return anos.map((ano) => `<div class="caderno-ano"><h2>${ano}</h2><div class="grade">${lista.filter((v) => v.ano === ano)
      .map((v) => cartao(esc(nome(v.id)), blocosCaderno(v.itens))).join('')}</div></div>`).join('');
  }

  // Para onde cada notícia leva ao ser tocada: aba do paddock e o cartão do assunto.
  // Pelo texto, para valer também nas notícias de saves antigos.
  const DESTINOS_NOTICIA = [
    [/banco|empréstimo/i, 'oficina', '.cartao-banco'],
    [/engripou|retífica/i, 'resumo', '.retifica'],
    [/pneu/i, 'oficina', '.cartao-oficina'],
    [/patroc|contrato com|macacão/i, 'oficina', '.cartao-patrocinio'],
    [/equipe de box/i, 'oficina', '.cartao-box'],
    [/peças novas/i, 'oficina', '.cartao-dev'],
    [/preparador físico|simulador/i, 'piloto', '.cartao-preparacao'],
    [/contas apertadas|desmotivado/i, 'piloto', '.cartao-cabeca'],
    [/desafio do dia/i, 'resumo', '.cartao-desafio'],
    [/rival desde o kart/i, 'resumo', '.cartao-duelo'],
    [/termina \d{4} em P|estreia na|disputa a /i, 'campeonato', '.grade'],
  ];
  function destinoNoticia(texto) {
    const d = DESTINOS_NOTICIA.find(([re]) => re.test(texto));
    return d ? { aba: d[1], sel: d[2] } : null;
  }

  // Troca de aba do paddock (toque no menu ou deslizar o dedo). direcao: 1 = veio da direita, -1 = da esquerda.
  const ORDEM_ABAS = ['resumo', 'campeonato', 'piloto', 'oficina', 'caderno', 'noticias'];
  function trocarAba(aba, direcao = 0) {
    tela.aba = aba;
    render();
    if (direcao) app.querySelectorAll('.abas ~ :not(.rodape):not(.folha-fundo)').forEach((el) => el.classList.add(direcao > 0 ? 'desliza-da-direita' : 'desliza-da-esquerda'));
    // Abriu as notícias: as novas aparecem destacadas agora e contam como lidas daqui em diante.
    if (tela.aba === 'noticias' && noticiasNovas()) { estado.noticiaLida = estado.seqNoticia; salvar(); }
    // Se a pessoa já tinha descido, volta para o começo da aba (logo abaixo das abas).
    if (app.querySelector('.abas').getBoundingClientRect().top < 0) rolarPara('.abas');
  }
  // Deslizar o dedo para os lados no paddock passa para a aba vizinha.
  let toque = null;
  app.addEventListener('touchstart', (ev) => {
    const t = ev.touches[0];
    toque = ev.touches.length === 1 && tela.nome === 'paddock' && !ev.target.closest('input, textarea, .segmentos, .folha-fundo, .tiles-rolam')
      ? { x: t.clientX, y: t.clientY, quando: Date.now() } : null;
  }, { passive: true });
  app.addEventListener('touchend', (ev) => {
    if (!toque) return;
    const t = ev.changedTouches[0];
    const dx = t.clientX - toque.x, dy = t.clientY - toque.y;
    const rapido = Date.now() - toque.quando < 700;
    toque = null;
    if (!rapido || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    if (document.body.classList.contains('fundo-travado') || Tutorial.ativo()) return;
    const i = ORDEM_ABAS.indexOf(tela.aba || 'resumo');
    const j = i + (dx < 0 ? 1 : -1);
    if (j < 0 || j >= ORDEM_ABAS.length) return;
    trocarAba(ORDEM_ABAS[j], dx < 0 ? 1 : -1);
  }, { passive: true });

  function telaPaddock() {
    const aba = tela.aba || 'resumo';
    const conteudo = {
      resumo: () => `${cartaoProximaEtapa()}<div class="grade">${cartaoDesafio()}${cartaoCompanheiro()}${cartaoRivalCarreira()}</div>`,
      campeonato: () => `<div class="grade">${cartao('Classificação', listaCampeonato())}${cartao(`Calendário ${estado.ano}`, calendario())}</div>`,
      piloto: painelPiloto,
      oficina: () => `<div class="grade">${cartaoOficina()}${estado.campeonato === 'f1' ? cartaoDesenvolvimento() : ''}${Kart.monoposto() ? cartaoBox() : ''}${cartaoPatrocinio()}${cartaoBanco()}</div>`,
      caderno: painelCaderno,
      noticias: () => cartao('Notícias', `<div class="noticias">${estado.noticias.map((n) => {
        const ponto = noticiaNova(n) ? '<i class="noticia-ponto" aria-label="nova"></i>' : '';
        const corpo = `<b>${esc(textoNoticia(n.texto))}</b><small>${quando(n)}</small>`;
        const d = destinoNoticia(n.texto);
        return d ? `<button class="noticia noticia-link ${noticiaNova(n) ? 'nova' : 'lida'}" data-acao="abrir-noticia" data-aba="${d.aba}" data-sel="${d.sel}">${ponto}${corpo}${icone('seta')}</button>`
          : `<article class="noticia ${noticiaNova(n) ? 'nova' : 'lida'}">${ponto}${corpo}</article>`;
      }).join('')}</div>`),
    }[aba]();
    const pos = C.posicaoNoCampeonato(estado);
    app.innerHTML = `
      <div class="linha cabecalho-tela"><h1>Paddock</h1><span class="espaco"></span>${chip(`${ic('trofeu')}P${pos} · ${estado.pontos.jogador} pts`, 'chip-grande')}</div>
      ${abas([['resumo', 'etapa', 'Etapa'], ['campeonato', 'campeonato', 'Tabela'], ['piloto', 'piloto', 'Piloto'], ['oficina', 'chave', 'Oficina'], ['caderno', 'caderno', 'Caderno'], ['noticias', 'noticias', 'Notícias']], aba, { oficina: C.pendenciasEtapa(estado).length > 0 ? 'aviso' : '', piloto: estado.pontosEvolucao > 0 ? 'nova' : '', noticias: noticiasNovas() ? 'nova' : '' })}
      ${conteudo}
      <div class="rodape">
        <button class="botao-premium ${BoxPremium.ativo ? 'ativo' : ''}" data-acao="premium">${icone('estrela', 'ico-cheio')}${BoxPremium.ativo ? 'Premium ativo' : 'Superlicença Premium'}</button>
        <div class="rodape-botoes">
          <button class="discreto" data-acao="sair-jogo">Sair do jogo</button>
          <button class="discreto" data-acao="abandonar" data-confirmar="Toque de novo para apagar tudo">Apagar carreira</button>
        </div>
        <p class="fraco mini rodape-nota">Sua carreira fica salva no aparelho: ao sair, é só tocar em Continuar. Apagar a carreira começa tudo de novo, do kart.</p>
      </div>
      ${folhaChecagem()}${folhaPneu()}${folhaTutorialPneus()}`;
  }

  const SOBRE_TIPO = {
    travada: 'Traçado travado, cheio de curvas lentas e grampos. Premia tração na saída e um carro que vira fácil.',
    mista: 'Traçado misto, com retas médias e curvas de todos os tipos. O equilíbrio do acerto faz a diferença.',
    veloz: 'Traçado veloz, de retas longas e curvas rápidas. Pede velocidade final e coragem nas tangências.',
  };

  // Ficha detalhada do traçado: retas, curvas, zebras, asfalto, desnível e onde ultrapassar.
  const ZEBRAS = {
    altas: ['Altas', 'Cortar demais desequilibra o carro.'],
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
    const linha = (nomeIcone, rotulo, valor, detalhe = '') => `<div class="ficha-linha"><span class="ficha-icone">${icone(nomeIcone)}</span>
      <span class="ficha-rotulo">${rotulo}</span><span class="ficha-valor"><b>${valor}</b>${detalhe ? `<small>${detalhe}</small>` : ''}</span></div>`;
    return [
      linha('reta', 'Retas', `${p.retas.length} ${p.retas.length === 1 ? 'reta' : 'retas'}${longas ? ` · ${longas} ${longas === 1 ? 'longa' : 'longas'}` : ''}`, p.retas.map((m) => `${m} m`).join(' · ')),
      linha('curva', 'Curvas', `${nCurvas} curvas`, `${p.curvas.lentas} lentas · ${p.curvas.medias} médias · ${p.curvas.rapidas} rápidas`),
      linha('grampo', 'Grampos', p.grampos, p.grampos >= 2 ? 'Freadas fortes e tração na saída.' : ''),
      linha('zebra', 'Zebras', ZEBRAS[p.zebras][0], ZEBRAS[p.zebras][1]),
      linha('asfalto', 'Asfalto', ASFALTO[p.asfalto][0], ASFALTO[p.asfalto][1]),
      linha('montanha', 'Desnível', esc(p.desnivel)),
      linha('ultrapassar', 'Ultrapassagem', facil, esc(p.ondePassar)),
      // Da F3 em diante: zonas de DRS (retas longas). Vácuo e DRS tornam as retas longas o lugar de passar.
      ...(C.campeonato(estado.campeonato).ordem >= 4 ? [linha('reta', 'Zonas de DRS', Engine.zonasDrs(p), Engine.maiorReta(p) >= 1000 ? 'Reta de mais de 1 km: o DRS faz muita diferença.' : 'Abre na volta 3, a até 1 s do carro da frente; fecha com chuva e safety car.')] : []),
    ].join('');
  }

  // Sobre, números e traçado da pista: usado na tela "Ver pista" e na folha aberta durante o fim de semana.
  function conteudoPista(pista, camp) {
    const extensao = ((pista.extensao || pista.tempoBase * 21) / 1000).toFixed(2).replace('.', ',');
    return `${linhaRecorde()}<section class="secao"><h2>Sobre</h2><p class="fraco sobre">${esc(pista.sobre || SOBRE_TIPO[pista.tipo])} ${pista.altitude >= 700 ? 'Na altitude o motor perde força e a carburação muda.' : ''}</p></section>
      <div class="dados">
        ${dado('regua', 'Extensão', `${extensao} km`)}${dado('voltas', 'Voltas', camp.voltas)}${dado('montanha', 'Altitude', `${pista.altitude} m`)}
        ${dado('bandeira', 'Tipo', tipoPista[pista.tipo][1])}${pista.largura ? dado('largura', 'Largura', `${pista.largura} m`) : ''}${pista.sentido ? dado('sentido', 'Sentido', pista.sentido.replace(/^./, (c) => c.toUpperCase())) : ''}
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
      <div class="folha-pista-topo"><h3 id="folha-pista-titulo">${esc(pista.nome)}</h3><button class="redondo" data-fechar aria-label="Fechar">${icone('x')}</button></div>
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
  function editorSetup(s = estado.fds.setup, acao = 'ajuste') {
    return `<div class="setup">${Kart.ORDEM_AJUSTES.map((k) => {
      const a = Kart.AJUSTES[k];
      let controle;
      if (a.tipo === 'opcoes') {
        controle = `<div class="segmentos" data-seg="${k}">${a.opcoes.map((o, i) => `<button data-acao="${acao}" data-k="${k}" data-valor="${i}" class="${s[k] === i ? 'ativo' : ''}">${o}</button>`).join('')}</div>`;
      } else {
        const rotulo = k === 'carburacao' ? (s[k] === 0 ? 'Padrão' : s[k] < 0 ? `Pobre ${-s[k]}` : `Rica ${s[k]}`)
          : k === 'camber' ? `${String(s[k].toFixed(2)).replace('.', ',')}°`
            : k === 'freio' ? `${s[k]}% na frente`
              : `${s[k]} ${a.unidade === 'dentes' ? 'z' : a.unidade}`;
        controle = `<div class="passos"><button data-acao="${acao}" data-k="${k}" data-delta="-1" aria-label="Diminuir ${a.nome}" ${s[k] <= a.min ? 'disabled' : ''}>−</button>
          <b>${rotulo}</b><button data-acao="${acao}" data-k="${k}" data-delta="1" aria-label="Aumentar ${a.nome}" ${s[k] >= a.max ? 'disabled' : ''}>+</button></div>`;
      }
      return `<div class="ajuste"><span class="ajuste-nome">${a.nome}${botaoAjuda(k)}</span>${controle}</div>`;
    }).join('')}</div>`;
  }

  function passosFds(atual) {
    const sprint = estado.fds && estado.fds.sprint;
    // Com sprint são 5 passos: "Quali" no lugar de "Classificação" para caber numa linha.
    const passos = [['treino', 'Treino'], ['quali', sprint ? 'Quali' : 'Classificação'], ...(sprint ? [['sprint', 'Sprint']] : []), ['grid', 'Corrida'], ['fim', 'Resultado']];
    const naSprint = sprint && !sprint.feito && (atual === 'grid' || atual === 'corrida');
    const idx = passos.findIndex(([id]) => (naSprint ? id === 'sprint' : id === atual || (atual === 'corrida' && id === 'grid')));
    return `<div class="passos-fds">${passos.map(([, nome], i) => `<span class="${i === idx ? 'atual' : i < idx ? 'feito' : ''}">${i < idx ? ic('check') : ''}${nome}</span>`).join('')}</div>`;
  }

  function telaFimDeSemana() {
    const fds = estado.fds;
    const pista = C.pistaAtual(estado);
    const cabecalho = `<div class="linha cabecalho-tela"><h1>${tituloForte(pista.nome)}</h1>${chipTipo(pista.tipo)}<span class="espaco"></span><button class="ver-pista-mini" data-acao="ficha-pista">Ver pista ›</button></div>${passosFds(fds.sessao)}`;
    if (fds.sessao === 'treino' || fds.sessao === 'quali') app.innerHTML = cabecalho + telaAcerto();
    else if (fds.sessao === 'grid') app.innerHTML = cabecalho + telaGrid();
    else if (fds.sessao === 'corrida') { app.innerHTML = htmlCorrida(pista); atualizarCorrida(); if (!corrida.terminou && !tela.pausado) iniciarTimer(); }
    else app.innerHTML = cabecalho + telaResultadoCorrida();
    if (tela.largada && fds.sessao === 'grid') app.insertAdjacentHTML('beforeend', folhaLargada());
    else if (tela.mudancas === fds.sessao) app.insertAdjacentHTML('beforeend', folhaMudancas(fds.sessao));
  }

  // Resultado da classificação: a posição de largada vem antes de qualquer outra informação.
  // F3, F2 e F1: composto de largada, com o jogo do estoque. Macio é mais rápido e dura menos; duro, o contrário.
  function cartaoEstrategia(sprint) {
    const camp = C.campeonato(estado.campeonato);
    const voltas = sprint ? C.voltasSprint(camp) : camp.voltas;
    const semParada = sprint || !camp.compostos;
    const atual = C.compostoMontado(estado);
    const opcoes = Engine.ORDEM_PNEUS.map((k) => {
      const p = Engine.PNEUS[k];
      const tipo = C.TIPO_DO_COMPOSTO[k];
      // O jogo que vai para o carro: o montado, se for deste composto; senão o menos gasto do estoque.
      const montado = atual === k ? estado.pneus.find((x) => x.id === estado.fds.pneuId) : null;
      const jogo = montado || estado.pneus.filter((x) => x.tipo === tipo).sort((a, b) => a.uso - b.uso)[0];
      if (!jogo) {
        return `<button class="composto" disabled><span class="composto-bola" style="--cor:${p.cor}"></span><b>${p.nome}</b><small class="negativo">sem no estoque</small></button>`;
      }
      const vida = C.vidaComposto(estado, k, jogo.uso);
      const aguenta = vida >= voltas;
      return `<button class="composto ${atual === k ? 'ativo' : ''}" data-acao="composto" data-id="${k}" aria-pressed="${atual === k}">
        <span class="composto-bola" style="--cor:${p.cor}"></span><b>${p.nome}</b>
        <small>${p.ritmo ? `+${p.ritmo.toFixed(2).replace('.', ',')} s/volta` : 'O mais rápido'}</small>
        <small class="${!semParada || aguenta ? '' : 'negativo'}">${C.pneuNovo(jogo) ? 'novo · ' : ''}dura ~${vida} voltas</small></button>`;
    }).join('');
    const montado = estado.pneus.find((x) => x.id === estado.fds.pneuId);
    const vidaMontado = montado ? 100 - desgastePct(montado.uso, montado.tipo) : 100;
    const gasto = montado && vidaMontado < 60 ? `<p class="aviso-caixa">${ic('alerta')}O jogo montado (${nomePneu(montado.tipo).toLowerCase()}) tem ${Math.max(0, vidaMontado)}% de vida.${estado.pneus.some((x) => x.tipo === montado.tipo && x.uso < montado.uso) ? ' Há um jogo mais novo do mesmo tipo no estoque.' : ''}</p>` : '';
    const regra = semParada
      ? `${sprint ? 'Sprint' : 'Corrida'} de ${voltas} voltas, sem parada: escolha um pneu do estoque que aguente até o fim.`
      : `Corrida de ${voltas} voltas. É obrigatório usar dois compostos: o carro para uma vez no box (cerca de 20 s) e recebe outro jogo do seu estoque. A equipe chama na hora certa; dá para pedir o box antes durante a corrida.`;
    return cartao('Estratégia de pneus', `<p class="fraco mini">${regra}</p><div class="compostos">${opcoes}</div>${gasto}`, { ajuda: 'compostos' });
  }

  // Resultado da sprint, mostrado no grid da corrida principal.
  function cartaoSprint(sp) {
    return cartao('Sprint', `<div class="item-topo"><b class="sprint-pos">${sp.fora ? 'Abandono' : `P${sp.pos}`}</b>${sp.pontos ? chip(`+${sp.pontos} ${sp.pontos === 1 ? 'ponto' : 'pontos'}`, 'chip-dinheiro') : chip('Sem pontos')}</div>
      <div class="sprint-top">${sp.classificacao.map((x) => `<span class="${x.id === 'jogador' ? 'eu' : ''}"><b>${x.pos}</b>${esc(sigla(C.nomeDe(estado, x.id)))}<small>${x.pontos ? `+${x.pontos}` : ''}</small></span>`).join('')}</div>`);
  }
  function folhaLargada() {
    const q = estado.fds.quali;
    const i = q.findIndex((x) => x.id === 'jogador');
    const ordemSprint = C.sprintPendente(estado) ? C.ordemLargada(estado) : null;
    const pos = ordemSprint ? ordemSprint.findIndex((x) => x.id === 'jogador') + 1 : i + 1;
    const dif = q[i].tempo - q[0].tempo;
    const titulo = i === 0 ? 'Pole position!' : pos === 1 ? 'Primeiro no grid!' : pos === 2 ? 'Primeira fila!' : pos <= 5 ? 'Ótima posição.' : pos <= 10 ? 'Bom lugar no grid.' : 'Vai ter que escalar o pelotão.';
    return `<div class="folha-fundo" data-acao-fundo="fechar-largada"><div class="folha folha-largada" role="dialog" aria-modal="true" aria-labelledby="folha-largada-titulo">
      <span class="passo-inicio">Classificação</span>
      <h3 id="folha-largada-titulo">${ordemSprint ? 'Na sprint você larga em' : 'Você vai largar em'}</h3>
      <div class="largada-grande ${pos <= 3 ? 'top' : ''}">P${pos}</div>
      <p class="fraco">${ordemSprint && estado.campeonato === 'f2' ? `Você classificou em P${i + 1}: na F2 o top 10 larga invertido na sprint. ` : ''}${titulo} ${i === 0 ? `Sua volta: ${tempoVolta(q[0].tempo)}.` : `Sua volta: ${tempoVolta(q[i].tempo)} (${dif.toFixed(3).replace('.', ',')} s atrás da pole).`}${ordemSprint ? ' Na corrida principal você larga da posição da classificação.' : ''}</p>
      ${estado.fds.recordeQuali ? chip(`${ic('trofeu')}Novo recorde da pista!`, 'chip-recorde') : ''}
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
    const ceu = (c) => (c.molhado ? `${ic('chuva')}Chuva` : `${ic('sol')}Seco`);
    const linha = (rotulo, a, b, delta = '') => `<div class="mudanca ${a === b ? '' : 'mudou'}">
      <span class="mudanca-rotulo">${rotulo}</span><span>${a}</span><span aria-hidden="true">${a === '' ? '' : '→'}</span><b>${b}${delta}</b></div>`;
    const dif = (a, b) => (a === b ? '' : ` <small>${b > a ? '+' : '−'}${Math.abs(b - a)}°</small>`);
    return `<div class="folha-fundo" data-acao-fundo="fechar-mudancas"><div class="folha folha-mudancas" role="dialog" aria-modal="true" aria-labelledby="folha-mudancas-titulo">
      <span class="passo-inicio">${nomeAntes} → ${nomeAgora}</span>
      <h3 id="folha-mudancas-titulo">As condições mudaram</h3>
      <div class="mudancas">
        ${linha('Céu', ceu(antes), ceu(agora))}
        ${linha(`${ic('termometro')}Ar`, `${antes.tempAr}°`, `${agora.tempAr}°`, dif(antes.tempAr, agora.tempAr))}
        ${linha('Asfalto', `${antes.tempPista}°`, `${agora.tempPista}°`, dif(antes.tempPista, agora.tempPista))}
        ${linha('Borracha', borracha(antes), borracha(agora))}
        ${!agora.molhado ? `<div class="mudanca ${clima.tarde.chance >= 30 ? 'mudou' : ''}"><span class="mudanca-rotulo">${ic('gota')}Chance de chuva na corrida</span><span></span><span></span><b>${clima.tarde.chance}%</b></div>` : ''}
      </div>
      ${C.leituraPista(estado, sessao).map((f) => `<div class="bolha piloto">${icone('piloto')}<p>${esc(f)}</p></div>`).join('')}
      <p class="fraco">A pista não é a mesma de ${sessao === 'grid' ? 'agora há pouco' : 'manhã'}. Fique atento a como o ${Kart.veiculo} vai se comportar.</p>
      <button class="principal grande" data-acao="fechar-mudancas">Entendi</button>
    </div></div>`;
  }

  // Pneu zerado rende menos nas primeiras voltas: no treino dá para amaciar sem gastar uma saída.
  function dicaAmaciar() {
    const p = estado.pneus.find((x) => x.id === estado.fds.pneuId);
    if (!p || !C.pneuNovo(p)) return '';
    if (estado.fds.sessao === 'treino') return `<button class="compra amaciar" data-acao="amaciar-pneu"><b>${ic('chama')}Amaciar este pneu</b><span>2 voltas rápidas, sem gastar uma saída</span></button>`;
    return chip(`${ic('alerta')}Pneu zerado: rende menos nas primeiras voltas`, 'chip-amarelo');
  }

  function aviseGasto() {
    const p = estado.pneus.find((x) => x.id === estado.fds.pneuId);
    if (!p) return '';
    const vida = 100 - desgastePct(p.uso, p.tipo);
    return vida < 45 ? chip(`${ic('alerta')}Este jogo tem ${Math.max(0, vida)}% de vida`, 'chip-amarelo') : '';
  }

  // Sem mecânico por padrão: contrata-se por etapa, e ele só ajuda durante o treino livre.
  // Card do mecânico: escolher um dos três tipos, pagar hora extra ou pedir ajuda nesta sessão.
  function cartaoMecanico() {
    const fds = estado.fds;
    const m = C.mecanicoDoFds(fds);
    if (!m) {
      return cartao('Mecânico', `<p class="fraco mini">Você está acertando o ${Kart.veiculo} sozinho. Se quiser ajuda, contrate alguém para o fim de semana.</p>
        <div class="mecanicos">${Object.entries(C.MECANICOS).map(([tipo, x]) => {
          const preco = C.precoMecanico(estado, tipo);
          const extra = C.precoHoraExtra(estado, tipo);
          return `<button class="compra mecanico-opcao mec-${tipo}" data-acao="contratar-mecanico" data-tipo="${tipo}" data-confirmar="Confirmar: −${reais(preco)}" ${estado.dinheiro < preco ? 'disabled' : ''}>
            <b>${ic(x.icone)}${x.nome}</b><span class="mecanico-desc">${x.descricao}</span>
            <span class="mecanico-preco"><b>${reais(preco)}</b>${extra ? ` · hora extra ${reais(extra)}` : ' · fim de semana todo'}</span></button>`;
        }).join('')}</div>`, { ajuda: 'mecanico', classe: 'cartao-mecanico' });
    }
    const info = C.MECANICOS[m.tipo];
    const ativo = C.mecanicoAtivo(estado);
    const conselho = m.usos[fds.sessao];
    const rotulo = { palpite: 'Pedir um palpite', tecnica: 'Pedir a análise técnica', monta: `Montar o ${Kart.veiculo}` }[info.faz];
    let corpo;
    if (!ativo) {
      const extra = C.precoHoraExtra(estado, m.tipo);
      corpo = `<p class="fraco mini">Ele trabalhou na sessão anterior. Para ficar nesta, cobra hora extra.</p>
        <button class="compra" data-acao="hora-extra" data-confirmar="Confirmar: −${reais(extra)}" ${estado.dinheiro < extra ? 'disabled' : ''}><b>${ic('relogio')}Pagar hora extra</b><span>−${reais(extra)} · esta sessão</span></button>`;
    } else if (conselho) {
      // Palpite (iniciante) é uma frase; análise técnica e kart montado viram uma lista "ajuste → o que fazer".
      const itens = conselho.map((c) => c.split(': '));
      corpo = info.faz === 'tecnica' && itens.every((x) => x.length === 2)
        ? `<ul class="conselho">${itens.map(([nome, acao]) => `<li><span>${esc(nome)}</span><b>${esc(acao)}</b></li>`).join('')}</ul>`
        : `<p class="conselho-texto">${conselho.map((c) => esc(c)).join('<br>')}</p>`;
    } else {
      corpo = `<button class="principal" data-acao="sugestao">${ic(info.icone)}${rotulo}</button>`;
    }
    return cartao('Mecânico', `<div class="linha"><b>${ic(info.icone)}${info.nome}</b><span class="espaco"></span>${chip(ativo ? 'Trabalhando' : 'Fora desta sessão', ativo ? 'chip-dinheiro' : '')}</div>${corpo}`, { ajuda: 'mecanico', classe: 'cartao-mecanico' });
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
    const restantes = C.saidasTreino() - fds.saidas.length;
    const botaoAjustar = `<button class="radio-ajustar" data-acao="ir-acerto">${ic('chave')}Ajustar o ${Kart.veiculo}</button>`;
    const saidas = fds.saidas.slice().reverse();
    // As saídas do Premium aparecem trancadas para quem não tem.
    const contador = Array.from({ length: C.SAIDAS_TREINO }, (_, i) => `<i class="${i < fds.saidas.length ? 'feita' : i >= C.saidasTreino() ? 'trancada' : ''}"></i>`).join('');
    const maisSaidas = !restantes && !BoxPremium.ativo
      ? `<button class="grande premium-trancado" data-acao="premium" data-motivo="Sem o Premium são ${C.SAIDAS_GRATIS} saídas no treino livre. Com ele, ${C.SAIDAS_TREINO}.">${ic('cadeado')}Mais ${C.SAIDAS_TREINO - C.SAIDAS_GRATIS} saídas · Premium</button>` : '';
    return `<div class="corrida">
      <div class="coluna">
        ${cartao(treino ? 'Treino livre' : 'Classificação', `${condicaoChips(treino ? 'treino' : 'quali')}${leitura(fds.sessao)}${editorSetup()}`, { ajuda: treino ? (Kart.monoposto() ? 'setupF4' : 'setup') : 'quali', classe: 'cartao-acerto' })}
        ${cartaoMecanico()}
        ${cartao('Pneu', `${pneusVisuais(true)}${aviseGasto()}${dicaAmaciar()}${botoesComprarPneu()}`)}
        <div class="acoes">
          ${treino
            ? `<button class="principal grande" data-acao="saida" ${restantes ? '' : 'disabled'}>Sair para a pista <span class="etapas" aria-label="${restantes} saídas restantes">${contador}</span></button>
               ${maisSaidas}
               <button class="grande" data-acao="ir-quali">Ir para a classificação →</button>`
            : '<button class="principal grande" data-acao="classificar">Classificar</button>'}
        </div>
      </div>
      ${cartao('Rádio', saidas.length ? saidas.map((s, i) => `<div class="saida">
          <div class="item-topo"><span class="chip">Saída ${saidas.length - i}</span>${s.recorde ? `<span class="chip chip-recorde">${ic('trofeu')}Recorde</span>` : ''}
            <span class="tempo-bloco">${deltaSaida(s, saidas[i + 1])}<b class="tempo">${tempoVolta(s.tempo)}</b></span>
            <span class="pos-mini ${s.posicao <= 3 ? 'top' : ''}">P${s.posicao}</span></div>
          <div class="fraco mini">${esc(Kart.descreverSetup(s.setup))}</div>
          ${s.frases.map((f) => `<div class="bolha piloto">${icone('piloto')}<p>${onda(f)}${esc(f)}</p></div>`).join('')}
          ${s.dica ? `<div class="bolha mecanico">${icone('chave')}<p>${onda(s.dica)}${esc(s.dica.replace(/^Mecânico: /, ''))}</p></div>` : ''}
          ${i === 0 && treino && restantes ? botaoAjustar : ''}
        </div>`).join('') : `<p class="vazio">${ic('radio')}Ajuste o ${Kart.veiculo} e saia para a pista.</p>`, { ajuda: 'radio', classe: 'cartao-radio', extra: painelRadio() })}
      ${treino ? cartaoTelemetria(saidas[0]) : ''}
    </div>`;
  }

  // Telemetria (Premium): onde a última saída perdeu tempo por causa do acerto.
  function cartaoTelemetria(saida) {
    if (!BoxPremium.ativo) {
      const exemplo = [['Retas', 70], ['Entrada de curva', 45], ['Saída de curva', 25], ['Freada', 10]];
      return cartao('Telemetria', `<div class="telemetria trancada" aria-hidden="true">${exemplo.map(([t, w]) => `<div class="tele-linha"><span>${t}</span><span class="tele-trilho"><i style="width:${w}%"></i></span><b>0,0 s</b></div>`).join('')}</div>
        <button class="compra premium-trancado" data-acao="premium" data-motivo="A telemetria da volta é do Premium."><b>${ic('cadeado')}Ver onde a volta perde tempo</b><span>Premium · telemetria de cada saída</span></button>`, { classe: 'cartao-telemetria' });
    }
    if (!saida) return cartao('Telemetria', `<p class="vazio">${ic('regua')}Faça uma saída para ver onde a volta perde tempo.</p>`, { classe: 'cartao-telemetria', ajuda: 'telemetria' });
    const t = Kart.telemetria(saida.setup, C.pistaAtual(estado), C.condicaoSessao(estado, 'treino'), saida.pneu);
    const maior = Math.max(0.05, ...t.trechos.map((x) => x.perda));
    const linhas = t.trechos.map((x) => `<div class="tele-linha"><span>${esc(x.trecho)}</span><span class="tele-trilho"><i style="width:${Math.max(2, (x.perda / maior) * 100)}%"></i></span><b>${x.perda < 0.005 ? '0' : x.perda.toFixed(2).replace('.', ',')} s</b></div>`).join('');
    return cartao('Telemetria', `<p class="fraco mini">Saída ${estado.fds.saidas.length}: o acerto custa ${t.total.toFixed(2).replace('.', ',')} s por volta. Onde:</p><div class="telemetria">${linhas}</div>`, { classe: 'cartao-telemetria', ajuda: 'telemetria' });
  }

  // Falas do piloto sobre a pista antes da sessão: as pistas do que mudou.
  function leitura(sessao) {
    return `<div class="leitura">${C.leituraPista(estado, sessao).map((f) => `<div class="bolha piloto">${icone('piloto')}<p>${esc(f)}</p></div>`).join('')}</div>`;
  }

  function telaGrid() {
    const fds = estado.fds;
    const pole = fds.quali[0].tempo;
    const ordem = C.ordemLargada(estado);
    const meu = ordem.findIndex((q) => q.id === 'jogador') + 1;
    const sprint = C.sprintPendente(estado);
    const camp = C.campeonato(estado.campeonato);
    const mudou = fds.pneuId !== fds.pneuCorrida || Kart.ORDEM_AJUSTES.some((k) => fds.setup[k] !== fds.setupCorrida[k]);
    return `<div class="corrida">
      <div class="coluna">
        <section class="painel largada-card">
          <div class="largada-topo">
            <div class="largada-pos"><span>${sprint ? 'Largada da sprint' : fds.sprint ? 'Largada da corrida principal' : 'Largada'}</span><b class="${meu <= 3 ? 'top' : ''}">P${meu}</b></div>
            <div class="largada-meta">
              ${chip(`${ic('voltas')}${sprint ? C.voltasSprint(camp) : camp.voltas} voltas`)}
              ${sprint ? chip(`${ic('raio')}Sprint`, 'chip-amarelo') : ''}
              ${sprint && estado.campeonato === 'f2' ? chip(`${ic('repetir')}Top 10 invertido`) : ''}
              ${mudou ? chip(`${ic('lapis')}Acerto alterado`, 'chip-amarelo') : ''}
            </div>
          </div>
          ${painelCondicoes('grid')}
          ${linhaRecorde()}
          ${leitura('grid')}
          <button class="principal grande" data-acao="largar">${sprint ? 'Largar a sprint!' : 'Largar!'}</button>
        </section>
        ${fds.sprint && fds.sprint.feito ? cartaoSprint(fds.sprint) : ''}
        ${C.usaCompostos(estado) ? cartaoEstrategia(sprint) : ''}
        ${cartao('Acerto', editorSetup(), { ajuda: 'grid' })}
        ${cartaoMecanico()}
        ${cartao('Pneu', `${pneusVisuais(true)}${aviseGasto()}${dicaAmaciar()}${botoesComprarPneu()}`)}
        ${mudou ? `<div class="botoes-2"><button data-acao="desfazer-grid">${ic('repetir')}Acerto da classificação</button></div>` : ''}
      </div>
      ${cartao('Grid', `<div class="tabela-ajustada"><table><tr><th>Pos</th><th>Piloto</th><th class="num opc">Tempo</th><th class="num">Dif.</th></tr>
        ${ordem.map((q, i) => {
          const eqId = q.id === 'jogador' ? estado.equipeId : estado.rivais.find((r) => r.id === q.id).equipe;
          const eq = C.equipeBase(eqId);
          return `<tr class="${q.id === 'jogador' ? 'jogador' : ''}"><td>${i + 1}</td><td class="nome"><span class="cor" style="background:${eq.cor}"></span>${esc(C.nomeDe(estado, q.id))}</td>
            <td class="num opc">${tempoVolta(q.tempo)}</td><td class="num">${q.tempo > pole ? '+' + (q.tempo - pole).toFixed(3) : ''}</td></tr>`;
        }).join('')}</table></div>`)}
    </div>`;
  }

  function htmlCorrida(pista) {
    return `<div class="corrida">
      <section class="painel">
        ${pista ? `<div class="corrida-titulo"><b>${esc(pista.nome)}</b><span class="fraco">${corrida && corrida.sprint ? 'Sprint' : 'Corrida'}</span></div>` : ''}
        <div class="controles-corrida">
          <span id="volta" class="volta-grande"></span><span id="clima-corrida"></span><span class="espaco"></span>
          <button data-acao="play" id="btn-play"></button>
        </div>
        ${linhaRecorde()}
        <div class="tabela-ajustada" id="tabela"></div>
      </section>
      <div class="coluna">
        ${cartao(Kart.monoposto() ? 'Seu carro' : 'Seu kart', `<div id="info-jogador" class="tiles tiles-4"></div>${Kart.monoposto() ? '<div id="box-f4"></div>' : ''}${corrida && corrida.regraCompostos ? '<div id="box-composto" class="box-composto"></div>' : ''}`)}
        ${cartao('Corrida', '<div class="eventos" id="eventos"></div>')}
      </div>
    </div>`;
  }

  const STATUS_FORA = { Acidente: 'Rodou', Quebra: 'Quebrou' };
  const statusFora = (motivo) => STATUS_FORA[motivo] || (motivo && motivo.startsWith('Motor') ? 'Motor' : 'Fora');

  function atualizarCorrida() {
    const ordem = corrida.carros.slice().sort((a, b) => a.pos - b.pos);
    const lider = ordem[0];
    const melhorDaCorrida = Math.min(...corrida.carros.map((c) => c.melhorVolta || Infinity));
    document.getElementById('volta').innerHTML = corrida.volta === 0 ? 'GRID' : `VOLTA <b>${corrida.volta}<span>/${corrida.totalVoltas}</span></b>`;
    document.getElementById('clima-corrida').innerHTML = (corrida.safetyCar > 0 ? chip(`${ic('alerta')}Safety car`, 'chip-sc') : '') + (corrida.molhado ? chip(`${ic('chuva')}Molhado`, 'chip-azul') : '')
      + (corrida.drs ? chip(corrida.drsAtivo ? 'DRS liberado' : 'DRS fechado', corrida.drsAtivo ? 'chip-dinheiro' : '') : '');
    document.getElementById('btn-play').innerHTML = corrida.terminou ? 'Ver resultado' : icone(tela.pausado ? 'play' : 'pausa', 'ico-cheio');
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
        <span class="vivo-tempo ${c.ultimaVolta && c.ultimaVolta === melhorDaCorrida ? 'roxo' : ''}">${c.fora || !c.ultimaVolta ? '' : tempoVolta(c.ultimaVolta)}</span>
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
        : eu.tipoPneu === 'chuva' ? (corrida.boxJogador ? `<button class="grande" disabled>${ic('radio')}Box pedido: chuva novo na próxima volta</button>`
          : corrida.temJogo && corrida.temJogo('chuva') ? `<div class="linha">${chip(`${ic('pneu')}Pneu de chuva · ${Math.max(0, 100 - desgastePct(eu.uso, 'chuva'))}%`, 'chip-azul')}<button data-acao="box-chuva">${ic('pneu')}Box: chuva novo</button></div>`
          : chip(`${ic('pneu')}Pneu de chuva`, 'chip-azul'))
          : corrida.boxJogador ? `<button class="grande" disabled>${ic('radio')}Box pedido: entra na próxima volta</button>`
            : corrida.temJogo && !corrida.temJogo('chuva') ? `<button class="grande" disabled>${ic('pneu')}Sem pneu de chuva no estoque</button>`
              : `<button class="grande ${corrida.molhado ? 'principal' : ''}" data-acao="box-chuva" ${corrida.molhado ? '' : 'disabled'}>${ic('pneu')}Box: pneu de chuva${corrida.molhado ? '' : ' (só com chuva)'}</button>`;
    }
    // F2 e F1: pedir o box com o composto escolhido.
    const boxComp = document.getElementById('box-composto');
    if (boxComp) {
      boxComp.innerHTML = eu.fora || corrida.terminou || corrida.molhado ? ''
        : eu.boxPedido ? `<button class="grande" disabled>${ic('radio')}Box pedido: ${Engine.PNEUS[eu.boxPedido].nome.toLowerCase()} na próxima volta</button>`
          : `<span class="subtitulo">Chamar para o box</span><div class="botoes-3">${Engine.ORDEM_PNEUS.map((k) => {
            // Só os compostos com jogo livre no estoque.
            const tem = !corrida.temJogo || corrida.temJogo(C.TIPO_DO_COMPOSTO[k]);
            return `<button data-acao="box-composto" data-id="${k}" ${tem ? '' : 'disabled'}><span class="composto-bola mini" style="--cor:${Engine.PNEUS[k].cor}"></span>${Engine.PNEUS[k].nome}${tem ? '' : ' <small>sem</small>'}</button>`;
          }).join('')}</div>
            ${eu.usados.length < 2 ? '<small class="fraco">Ainda falta a parada obrigatória.</small>' : ''}`;
    }
    const comp = corrida.compostos;
    const pneuTile = comp ? tile(Engine.PNEUS[eu.pneu].nome, `${Math.max(0, 100 - Math.round((eu.uso / Engine.PNEUS[eu.pneu].vida) * 100))}%`) : tile('Pneu', `${100 - desgastePct(eu.uso, eu.tipoPneu)}%`);
    document.getElementById('info-jogador').innerHTML = eu.fora
      ? tile('Fora', statusFora(eu.motivoFora), 'negativo')
      : `${tile('Posição', `P${eu.pos}`)}${tile('Largou', `P${eu.largada}`)}${tile('Ganhou', ganhou > 0 ? `▲${ganhou}` : ganhou < 0 ? `▼${-ganhou}` : '—', ganhou > 0 ? 'dinheiro' : ganhou < 0 ? 'negativo' : '')}${pneuTile}`;
    avisosDaCorrida(eu);
  }

  // Avisos rápidos durante a bateria: mudança de posição, chuva e o rival seguido.
  function avisosDaCorrida(eu) {
    const memo = tela.memoCorrida || (tela.memoCorrida = { pos: eu.largada, molhado: false, rivalFora: false, sc: false });
    if (corrida.volta === 0) return;
    const sc = corrida.safetyCar > 0;
    if (sc && !memo.sc) aviso('Safety car na pista!', 'alerta');
    else if (!sc && memo.sc) aviso('Relargada!', 'bandeira');
    else if (corrida.molhado && !memo.molhado) aviso('Começou a chover!', 'chuva');
    else if (!eu.fora && eu.pos !== memo.pos) aviso(eu.pos < memo.pos ? `▲ Você subiu para P${eu.pos}` : `▼ Você caiu para P${eu.pos}`);
    const rival = estado.seguindo && corrida.carros.find((c) => c.id === estado.seguindo);
    if (rival && rival.fora && !memo.rivalFora) aviso(`${sigla(rival.piloto.nome)} está fora: ${statusFora(rival.motivoFora).toLowerCase()}`, 'estrela');
    memo.pos = eu.pos;
    memo.molhado = !!corrida.molhado;
    memo.sc = sc;
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
    if (corrida.sprint) {
      const sp = C.concluirSprint(estado, corrida);
      corrida = null;
      salvar();
      ir({ nome: 'fds' });
      aviso(sp.fora ? 'Abandono na sprint.' : `Sprint: P${sp.pos}${sp.pontos ? ` · +${sp.pontos} pontos` : ''}. Agora a corrida principal!`, 'bandeira');
      return;
    }
    C.concluirCorrida(estado, corrida);
    corrida = null;
    salvar();
    ir({ nome: 'fds' });
  }

  const sinal = (n) => (n > 0 ? `+${n}` : `${n}`);

  function telaResultadoCorrida() {
    const fds = estado.fds;
    const r = fds.resultado;
    const medalha = r.fora ? icone('x') : r.pos <= 3 ? icone('trofeu', `medalha-${r.pos}`) : '';
    return `<div class="corrida">
      <div class="coluna">
        <section class="painel resultado-hero ${r.fora ? 'ruim' : r.pos <= 3 ? 'bom' : ''}">
          <div class="pos-grande"><span>${r.fora ? esc(r.motivo) : 'Chegada'}</span><b>${medalha} ${r.fora ? 'Abandono' : 'P' + r.pos}</b></div>
          <div class="tiles">${tile('Pontos', r.pontos)}${tile('Campeonato', 'P' + C.posicaoNoCampeonato(estado))}${tile('Caixa', '+' + reais(r.ganho), 'dinheiro')}</div>
          ${r.companheiro && r.companheiro.venci != null ? chip(`${ic('piloto')}${r.companheiro.venci ? 'Na frente' : 'Atrás'} do companheiro (${r.companheiro.fora ? 'abandonou' : `P${r.companheiro.pos}`})`, r.companheiro.venci ? 'chip-dinheiro' : 'chip-amarelo') : ''}
          ${r.pole ? chip(`${ic('bandeira')}Pole position · +1 ponto`, 'chip-dinheiro') : ''}
          ${r.voltaRapida ? chip(`${ic('relogio')}Volta mais rápida · +1 ponto`, 'chip-recorde') : ''}
          ${r.recorde ? chip(`${ic('trofeu')}Novo recorde da pista na corrida!`, 'chip-recorde') : ''}
          ${r.eventos.map((e) => chip(`${ic('alerta')}${esc(e)}`, 'chip-amarelo')).join('')}
          ${(r.cabeca || []).length ? `<div class="chips">${r.cabeca.map((x) => [
            x.confianca ? chip(`${ic('chama')}${sinal(x.confianca)}`, x.confianca > 0 ? 'chip-dinheiro' : 'chip-negativo') : '',
            x.moral ? chip(`${ic('sorriso')}${sinal(x.moral)}`, x.moral > 0 ? 'chip-dinheiro' : 'chip-negativo') : '',
          ].join('')).join('')}</div>` : ''}
          ${r.olheiros.length ? `<div class="chips">${r.olheiros.map((o) => chip(`${ic('olho')}${esc(o)}`)).join('')}</div>` : ''}
          <button class="principal grande" data-acao="voltar-paddock">Voltar ao paddock</button>
        </section>
        ${r.diagnostico ? cartaoDiagnostico(r) : ''}
      </div>
      ${cartao('Resultado', `<div class="tabela-ajustada"><table><tr><th>Pos</th><th>Piloto</th><th class="num">Dif.</th><th class="num">Pts</th></tr>
        ${fds.classificacao.map((x) => `<tr class="${x.id === 'jogador' ? 'jogador' : ''} ${x.fora ? 'fora' : ''}">
          <td>${x.fora ? 'NC' : x.pos}</td><td class="nome"><span class="cor" style="background:${C.equipeBase(x.equipe).cor}"></span>${esc(C.nomeDe(estado, x.id))}${x.pole ? ` <span class="marca-pv" title="Pole">P</span>` : ''}${x.voltaRapida ? ` <span class="marca-pv vr" title="Volta mais rápida">VR</span>` : ''}</td>
          <td class="num">${x.fora ? 'Fora' : x.pos === 1 ? ic('bandeira') : '+' + x.dif.toFixed(1)}</td><td class="num"><b>${x.pontos || ''}</b></td></tr>`).join('')}
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
      ? `<button class="grande" disabled>${ic('check')}Anotado no caderno</button>`
      : !BoxPremium.ativo ? `<button class="grande premium-trancado" data-acao="premium" data-motivo="Anotar no caderno é do Premium.">${ic('cadeado')}Anotar no caderno · Premium</button>`
      : `<textarea id="nota-corrida" rows="2" maxlength="300" placeholder="Sua anotação (opcional)"></textarea>
         <button class="principal grande" data-acao="anotar">${ic('lapis')}Anotar no caderno</button>`;
    return cartao('Diagnóstico', `<div class="chips">${chip(d.molhado ? `${ic('chuva')}Molhado` : `${ic('sol')}Seco`, d.molhado ? 'chip-azul' : '')}${chip(`${ic('termometro')}Ar ${d.tempAr}°`)}${chip(`Asfalto ${d.tempPista}°`)}${d.choveuNaCorrida ? chip('Choveu na corrida', 'chip-amarelo') : ''}</div>
      ${d.sentiu.map((f) => `<div class="bolha piloto">${icone('piloto')}<p>${esc(f)}</p></div>`).join('')}
      <span class="subtitulo">Nessas condições, o ${Kart.monoposto() ? 'carro' : 'kart'} pedia</span>
      ${ajustes}
      ${anotar}`, { ajuda: 'diagnostico', classe: 'cartao-diagnostico' });
  }

  // ---------- fim de temporada ----------
  // Mercado de fim de ano: escolher a equipe do próximo ano entre as que aceitam o piloto.
  function escolhaEquipeAno(campId) {
    const r = estado.relatorio;
    const lista = r.equipes || [estado.equipeId];
    const escolhida = tela.proximaEquipe || estado.equipeId;
    const total = (Dados.EQUIPES_MONO[campId] || Dados.EQUIPES).length;
    const recusadas = Math.max(0, total - lista.length);
    // Custo da temporada inteira ao lado de cada equipe, com aviso quando o caixa não cobre.
    const ct = C.custoTemporada(estado, campId, escolhida);
    const falta = ct.temporada > 0 && estado.dinheiro < ct.temporada;
    return `<span class="subtitulo" id="equipe-ano">Equipe para ${estado.ano}</span>
      <div class="equipes-ano">${lista.map((id) => {
        const e = C.equipeBase(id);
        const c = C.custoTemporada(estado, campId, id);
        const valor = c.etapa < 0 ? `<b class="dinheiro">+${reais(-c.etapa)}<small>/etapa</small></b>`
          : c.etapa === 0 ? '<b class="dinheiro">Grátis<small>contrato</small></b>'
            : `<b class="negativo">−${reais(c.etapa)}<small>/etapa</small></b>`;
        const temporada = c.etapa < 0 ? `salário de ${reais(-c.temporada)} no ano` : c.etapa ? `${reais(c.temporada)} no ano${c.contrato ? ' (contrato)' : ''}` : '';
        return `<button class="equipe-ano ${escolhida === id ? 'ativo' : ''}" data-acao="escolher-equipe-ano" data-id="${id}" aria-pressed="${escolhida === id}" style="--cor-equipe:${e.cor}">
          <i class="camp-cor" style="background:${e.cor}"></i>
          <span class="equipe-ano-nome"><b>${esc(e.nome)}</b><small>${C.PORTES[C.porteDe(id)].nome} · ${Kart.veiculo === 'kart' ? 'Kart' : 'Carro'} ${e.material}${id === estado.equipeId ? ' · atual' : ''}${temporada ? ` · ${temporada}` : ''}</small></span>
          ${valor}
        </button>`;
      }).join('')}</div>
      ${falta ? `<p class="aviso-caixa">${ic('alerta')}A temporada com a ${esc(C.equipeBase(escolhida).nome)} custa ${reais(ct.temporada)} (${ct.etapas} etapas) e o caixa tem ${reais(estado.dinheiro)}. Sem patrocínio e prêmios, o dinheiro acaba no meio do ano.</p>` : ''}
      ${recusadas ? `<p class="fraco mini">${recusadas} ${recusadas === 1 ? 'equipe não quis' : 'equipes não quiseram'} você este ano. Resultado e popularidade abrem mais portas.</p>` : ''}`;
  }

  // Quando não veio proposta para subir: o que faltou, em uma linha.
  function semProposta(r) {
    if (estado.propostas.length || r.f4Espera || r.aposentadoria) return '';
    const camp = C.campeonato(r.campeonato);
    const prox = C.PROXIMA_CATEGORIA[camp.id];
    let texto = '';
    if (prox) texto = `Para receber proposta da ${C.campeonato(prox).curto}, é preciso terminar no top ${C.VAGAS_SUBIDA} da ${camp.curto}. Você terminou em P${r.pos}.`;
    else if (camp.id === 'f1') {
      const ponta = (r.equipes || []).some((id) => C.porteDe(id) === 'ponta');
      if (!ponta) texto = 'As equipes de ponta da F1 só chamam quem termina no top 6 ou vence o duelo com o companheiro.';
    } else if (camp.id === 'internacional') texto = `As equipes de F4 olham o top ${C.VAGAS_SUBIDA} do Europeu; as academias de F1, os dois primeiros. Você terminou em P${r.pos}.`;
    else if (camp.id === 'nacional') texto = 'O campeão brasileiro chama a atenção de uma equipe de F4. O caminho mais comum é subir para o Europeu.';
    return texto ? `<p class="aviso-caixa sem-proposta">${ic('alerta')}${esc(texto)}</p>` : '';
  }

  function telaRelatorio() {
    const r = estado.relatorio;
    const camp = C.campeonato(r.campeonato);
    const escolha = tela.proximo || r.opcoes[r.opcoes.length - 1];
    const ganhos = r.premios.reduce((t, p) => t + p.valor, 0) + r.bonus.filter((b) => b.cumpriu).reduce((t, b) => t + b.valor, 0);
    app.innerHTML = `
      <div class="linha cabecalho-tela"><h1>Temporada ${r.ano}</h1>${chip(esc(camp.curto))}</div>
      ${r.f4Espera ? cartao('F4 garantida', `<p><b>${esc(r.f4Espera.nome)}</b> quer você na Fórmula 4, mas a FIA só permite a partir dos ${r.f4Espera.idade} anos. A vaga fica guardada: continue no kart e a proposta chega no fim da temporada em que você tiver ${r.f4Espera.idade}.</p>`, { classe: 'destaque' }) : ''}
      ${estado.propostas.length ? cartao(`${estado.propostas.length > 1 ? 'Propostas' : 'Proposta'} para a ${destinoProposta(estado.propostas[0])}`, (r.motivoF4 ? `<p class="motivo-f4">${ic('subir')}${esc(r.motivoF4)}</p>` : '') + estado.propostas.map((p) => `<div class="item">
          <div class="item-topo"><b>${esc(p.nome)}</b></div><p class="fraco">${esc(p.texto)}</p>
          <button class="principal grande" data-acao="aceitar-proposta" data-id="${p.id}">Assinar e subir para a ${destinoProposta(p)}</button></div>`).join(''), { classe: 'destaque' }) : ''}
      ${semProposta(r)}
      <div class="grade">
        <section class="painel resultado-hero ${r.pos <= 3 ? 'bom' : ''}">
          <div class="pos-grande"><span>Campeonato</span><b>${r.pos <= 3 ? icone('trofeu', `medalha-${r.pos}`) : ''}P${r.pos}</b></div>
          <div class="tiles">${tile('Pontos', r.pontos)}${tile('Campeão', r.pos === 1 ? 'Você' : esc(r.campeao.split(' ')[0]))}</div><div class="tiles">${tile('Ganhos no ano', '+' + reais(ganhos), 'dinheiro')}</div>
        </section>
        ${cartaoPontosEvolucao(r)}
        ${cartao('Evolução natural', r.evolucao.length
          ? r.evolucao.map((x) => `<div class="barra"><span>${C.NOMES_ATRIBUTOS[x.a]}</span><span class="trilho"><i style="width:${x.depois}%"></i></span><b>${x.depois} <span class="dinheiro mini">${sinal(x.depois - x.antes)}</span></b></div>`).join('')
          : '<p class="vazio">Sem evolução este ano.</p>')}
        ${cartao('Dinheiro', `
          ${r.premios.map((p) => `<div class="item-topo"><span>${ic('trofeu')}${esc(p.texto)}</span><b class="dinheiro">+${reais(p.valor)}</b></div>`).join('')}
          ${r.bonus.map((b) => `<div class="item-topo"><span>${ic(b.cumpriu ? 'certo' : 'errado', b.cumpriu ? 'dinheiro' : 'negativo')}${esc(b.empresa)}</span><b class="${b.cumpriu ? 'dinheiro' : 'fraco'}">${b.cumpriu ? '+' + reais(b.valor) : '—'}</b></div>`).join('')}
          ${tile('Caixa', reais(estado.dinheiro))}`)}
        ${cartao(r.aposentadoria ? 'Fim da carreira' : 'Próximo ano', `${r.aposentadoria ? '' : `<div class="escolhas">${r.opcoes.map((id) => {
            const c = C.campeonato(id);
            return `<button class="escolha ${escolha === id ? 'ativo' : ''}" data-acao="escolher-proximo" data-id="${id}" aria-pressed="${escolha === id}">
              <b>${esc(c.curto)}</b><span class="chips">${chip(id === r.campeonato ? `${ic('repetir')}Repetir` : `${ic('subir')}Subir`, id === r.campeonato ? '' : 'chip-dinheiro')}${chip(`${ic('carteira')}×${c.custo}`)}${c.regiao === 'eu' ? chip(`${ic('globo')}Europa`) : ''}</span></button>`;
          }).join('')}</div>`}
          ${r.aposentadoria ? `<p class="fraco">Aos ${C.IDADE_APOSENTADORIA} anos é hora de pendurar o capacete.</p>` : `${escolhaEquipeAno(escolha)}
          <button class="principal grande" data-acao="nova-temporada">Começar ${estado.ano}</button>`}
          ${C.podeEncerrar(estado) ? `<button class="${r.aposentadoria ? 'principal ' : ''}grande" data-acao="aposentar" data-confirmar="Confirmar: encerrar a carreira">${ic('trofeu')}Encerrar carreira</button>` : ''}`, { ajuda: 'temporada' })}
      </div>`;
  }

  // ---------- fim de temporada: suspense e resumo visual ----------
  const PASSOS_FIM = ['Bandeirada final da temporada…', 'Somando os pontos…', 'Conferindo os prêmios…', 'Ouvindo os olheiros…'];
  // Nome curto da pista pela cidade: "Kartódromo Internacional da Granja Viana" -> "Cotia".
  const nomeCurtoPista = (nome) => {
    const p = Object.values(Dados.KARTODROMOS).flat().find((x) => x.nome === nome);
    return p ? p.local.split(' (')[0].split(',')[0] : nome;
  };
  const confete = (n) => Array.from({ length: n }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${((i * 7) % 10) / 10}s;--r:${(i * 53) % 360}deg;--c:${['#e10600', '#ffd24a', '#ffffff', '#3d9bff'][i % 4]}"></i>`).join('');

  function telaFimTemporada() {
    const r = estado.relatorio;
    const camp = C.campeonato(r.campeonato);
    if (tela.passo !== 'resumo') {
      app.innerHTML = `
        <div class="abertura carregando fim-carregando">
          <div class="fim-titulo">
            <span class="campeao-ano">${esc(camp.nome)}</span>
            <h1>Temporada ${r.ano}</h1>
            <div class="bandeira-quadriculada" aria-hidden="true"></div>
          </div>
          <div class="carregando-bloco" role="status" aria-live="polite">
            <div class="carregando-trilho"><i data-barra></i></div>
            <span class="fraco" data-passo>${PASSOS_FIM[0]}</span>
          </div>
        </div>`;
      const duracao = menosMovimento() ? 500 : 3400;
      const inicio = performance.now();
      const minha = tela;
      const quadro = (agora) => {
        if (tela !== minha) return;
        const t = Math.min(1, (agora - inicio) / duracao);
        app.querySelector('[data-barra]').style.width = `${t * 100}%`;
        app.querySelector('[data-passo]').textContent = PASSOS_FIM[Math.min(PASSOS_FIM.length - 1, Math.floor(t * PASSOS_FIM.length))];
        if (t < 1) requestAnimationFrame(quadro);
        else setTimeout(() => { if (tela === minha) { tela.passo = 'resumo'; render(); } }, 300);
      };
      requestAnimationFrame(quadro);
      return;
    }

    const corridas = estado.historico.filter((h) => h.ano === r.ano && h.campeonato === r.campeonato);
    const validas = corridas.filter((h) => !h.fora);
    const vitorias = validas.filter((h) => h.pos === 1).length;
    const podios = validas.filter((h) => h.pos <= 3).length;
    const abandonos = corridas.length - validas.length;
    const melhor = validas.reduce((m, h) => (!m || h.pos < m.pos ? h : m), null);
    const ganhos = r.premios.reduce((t, p) => t + p.valor, 0) + r.bonus.filter((b) => b.cumpriu).reduce((t, b) => t + b.valor, 0);
    const maiorEvolucao = (r.evolucao || []).reduce((m, x) => (!m || x.depois - x.antes > m.depois - m.antes ? x : m), null);
    const frase = r.pos === 1 ? 'Campeão!' : r.pos === 2 ? 'Vice-campeão' : r.pos === 3 ? 'Pódio no campeonato' : r.pos <= C.VAGAS_SUBIDA ? `Entre os ${C.VAGAS_SUBIDA} primeiros` : 'Fora do top 4';
    const posicoes = estado.evolucao.filter((e) => e.ano === r.ano && e.campeonato === r.campeonato).map((e) => ({ rotulo: `Etapa ${e.etapa}`, curto: `E${e.etapa}`, pos: e.pos }));
    const destaque = (ic0, rotulo, valor, detalhe) => `<div class="fim-destaque">${icone(ic0)}<span>${rotulo}</span><b>${valor}</b>${detalhe ? `<small>${detalhe}</small>` : ''}</div>`;
    let i = 0;
    const bloco = (html) => `<div class="fim-entra" style="--i:${i++}">${html}</div>`;

    app.innerHTML = `
      <div class="fim-resumo">
        <section class="fim-hero ${r.pos === 1 ? 'campeao' : r.pos <= 3 ? 'podio' : ''}">
          ${r.pos === 1 ? `<div class="confete" aria-hidden="true">${confete(32)}</div>` : ''}
          <span class="campeao-ano">${esc(camp.nome)} · ${r.ano}</span>
          <span class="fim-voce">Você terminou em</span>
          <b class="fim-pos">${r.pos <= 3 ? icone('trofeu', `medalha-${r.pos}`) : ''}P<span data-contagem>${menosMovimento() ? r.pos : 20}</span></b>
          <span class="fim-frase">${frase}</span>
          ${r.pos > 1 ? `<span class="fim-campeao">Campeão: ${esc(r.campeao)}</span>` : ''}
        </section>
        ${bloco(`<div class="fim-numeros">
          <span><b>${vitorias}</b>${vitorias === 1 ? 'vitória' : 'vitórias'}</span>
          <span><b>${podios}</b>pódios</span>
          <span><b>${r.pontos}</b>pontos</span>
          <span><b>${abandonos}</b>${abandonos === 1 ? 'abandono' : 'abandonos'}</span>
        </div>`)}
        ${bloco(cartao('Etapa por etapa', `<div class="fim-etapas">${corridas.map((h) => `<div class="fim-etapa">
            <span class="resultado-bolinha ${h.fora ? 'fora' : h.pos === 1 ? 'ouro' : h.pos <= 3 ? 'podio' : h.pos <= 10 ? 'pontos' : ''}">${h.fora ? icone('x') : h.pos}</span>
            <small>${esc(nomeCurtoPista(h.pista))}</small></div>`).join('')}</div>`))}
        ${posicoes.length >= 2 ? bloco(cartao('No campeonato', graficoPosicao(posicoes))) : ''}
        ${bloco(`<div class="fim-destaques">
          ${melhor ? destaque('bandeira', 'Melhor corrida', `P${melhor.pos}`, esc(nomeCurtoPista(melhor.pista))) : ''}
          ${maiorEvolucao ? destaque('subir', 'Mais evoluiu', `+${maiorEvolucao.depois - maiorEvolucao.antes}`, C.NOMES_ATRIBUTOS[maiorEvolucao.a]) : ''}
          ${r.duelo ? destaque('piloto', 'Contra o companheiro', `${r.duelo.corrida[0]} × ${r.duelo.corrida[1]}`, r.duelo.corrida[0] > r.duelo.corrida[1] ? `Venceu ${esc(r.duelo.nome.split(' ').pop())}` : r.duelo.corrida[0] < r.duelo.corrida[1] ? `Perdeu para ${esc(r.duelo.nome.split(' ').pop())}` : 'Empate') : ''}
          ${destaque('carteira', 'Ganhos no ano', ganhos ? `+R$ ${kmil(ganhos)}` : '—', ganhos ? '' : 'Sem prêmios este ano')}
          ${destaque('estrela', 'Propostas', estado.propostas.length || r.f4Espera ? 'Chegaram!' : '—', estado.propostas.length ? `${estado.propostas.length} na mesa` : r.f4Espera ? 'F4 guardada' : 'Nenhuma este ano')}
        </div>`)}
        ${bloco('<button class="principal grande" data-acao="ver-relatorio">Continuar</button>')}
      </div>`;

    // Contagem regressiva da posição: de P20 até a posição final.
    if (!menosMovimento()) {
      const el = app.querySelector('[data-contagem]');
      const inicio = performance.now();
      const minha = tela;
      const de = 20;
      const passo = (agora) => {
        if (tela !== minha || !el.isConnected) return;
        const t = Math.min(1, (agora - inicio) / 1300);
        const suave = 1 - (1 - t) ** 3;
        el.textContent = Math.round(de - (de - r.pos) * suave);
        if (t < 1) requestAnimationFrame(passo);
        else el.closest('.fim-hero').classList.add('revelado');
      };
      requestAnimationFrame(passo);
    } else {
      app.querySelector('.fim-hero').classList.add('revelado');
    }
  }

  // Para qual categoria a proposta leva (F4, F3, F2 ou F1).
  const destinoProposta = (p) => C.campeonato(p.campeonato || (p.tipo === 'f3' ? 'f3' : 'f4')).curto;

  // Chegada à F1: a Superlicença, o fim da escada que começou no kart aos 12 anos.
  function telaSuperlicenca() {
    const f = estado.final;
    const corridas = estado.historico.filter((h) => !h.fora);
    const vitorias = corridas.filter((h) => h.pos === 1).length;
    const titulos = estado.temporadas.filter((t) => t.pos === 1).length;
    app.innerHTML = `<section class="fim-hero campeao revelado superlicenca">
        <div class="confete" aria-hidden="true">${confete(32)}</div>
        <span class="campeao-ano">Superlicença conquistada</span>
        <span class="fim-voce">${esc(estado.piloto.nome)}, ${f.idade} anos</span>
        <b class="fim-pos">F1</b>
        <span class="fim-frase">Você chegou à Fórmula 1</span>
        <span class="fim-campeao">Piloto titular da ${esc(f.equipe)} em ${f.ano}</span>
      </section>
      <div class="fim-numeros">
        <span><b>${estado.temporadas.length}</b>temporadas</span>
        <span><b>${estado.historico.length}</b>corridas</span>
        <span><b>${vitorias}</b>vitórias</span>
        <span><b>${titulos}</b>títulos</span>
      </div>
      ${cartao('Do kart à F1', `<div class="escada">${estado.temporadas.map((t) => `<div class="degrau"><span>${t.ano}</span><b>${esc(C.campeonato(t.campeonato).curto)}</b><span class="${t.pos === 1 ? 'dinheiro' : ''}">P${t.pos}</span></div>`).join('')}</div>`)}
      <button class="principal grande" data-acao="comecar-f1">Correr na F1</button>`;
  }

  // Galeria da fama: o resumo da carreira inteira, depois da aposentadoria.
  function telaAposentado() {
    const g = estado.galeria || C.galeriaDaFama(estado);
    const titulosF1 = g.f1.titulos;
    const frase = titulosF1 > 1 ? `${titulosF1} vezes campeão mundial` : titulosF1 === 1 ? 'Campeão mundial de Fórmula 1'
      : g.f1.corridas ? `Piloto de Fórmula 1${g.f1.vitorias ? `, ${g.f1.vitorias} ${g.f1.vitorias > 1 ? 'vitórias' : 'vitória'}` : ''}` : 'Uma carreira nas pistas';
    const nomesTitulos = g.titulos.map((t) => `<span class="chip ${t.campeonato === 'f1' ? 'chip-ouro' : ''}">${ic('trofeu')}${esc(C.campeonato(t.campeonato).curto)} ${t.ano}</span>`).join('');
    app.innerHTML = `<section class="fim-hero ${titulosF1 ? 'campeao' : 'podio'} revelado galeria">
        ${titulosF1 ? `<div class="confete" aria-hidden="true">${confete(24)}</div>` : ''}
        <span class="campeao-ano">Galeria da fama</span>
        <span class="fim-voce">${esc(g.nome)} · ${g.temporadas} temporadas · aposentado aos ${g.idade}</span>
        <b class="fim-pos">${titulosF1 ? `${titulosF1}×` : g.titulos.length}</b>
        <span class="fim-frase">${frase}</span>
      </section>
      <div class="fim-numeros">
        <span><b>${g.corridas}</b>corridas</span>
        <span><b>${g.vitorias}</b>vitórias</span>
        <span><b>${g.podios}</b>pódios</span>
        <span><b>${g.poles}</b>poles</span>
      </div>
      <div class="grade">
        ${g.f1.corridas ? cartao('Na Fórmula 1', `<div class="tiles">${tile('GPs', g.f1.corridas)}${tile('Vitórias', g.f1.vitorias, g.f1.vitorias ? 'dinheiro' : '')}${tile('Pódios', g.f1.podios)}${tile('Poles', g.f1.poles)}</div><p class="fraco mini">Melhor campeonato: P${g.f1.melhor}.</p>`) : ''}
        ${cartao('Títulos', g.titulos.length ? `<div class="chips">${nomesTitulos}</div>` : '<p class="vazio">Nenhum título, mas muita história.</p>')}
        ${cartao('Do kart ao fim', `<div class="escada">${g.escada.map((t) => `<div class="degrau"><span>${t.ano}</span><b>${esc(C.campeonato(t.campeonato).curto)}</b><span class="${t.pos === 1 ? 'dinheiro' : ''}">P${t.pos}</span></div>`).join('')}</div>`)}
        ${cartao('Conquistas', `<p><b>${g.conquistas}</b> de ${g.totalConquistas} conquistas.</p>`)}
      </div>
      <button class="principal grande" data-acao="abandonar" data-confirmar="Confirmar: começar do zero">Nova carreira</button>`;
  }

  function telaFalencia() {
    app.innerHTML = `<section class="painel tela-nome">
      <span class="capacete">${icone('bateria', 'sem-carga')}</span>
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
      // Só um botão armado por vez: armar outro devolve o anterior ao normal.
      app.querySelectorAll('button[data-armado="1"]').forEach((b) => {
        b.dataset.armado = '';
        b.innerHTML = b.htmlOriginal;
        if (!b.eraPrincipal) b.classList.remove('principal');
      });
      alvo.htmlOriginal = alvo.innerHTML;
      alvo.eraPrincipal = alvo.classList.contains('principal');
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
        rolarPara('#equipe-ano');
        break;
      case 'entrar': {
        const nome = document.getElementById('nome-piloto').value.trim();
        if (!nome) { aviso('Escreva o nome do piloto.'); break; }
        const seed = Date.now() % 1e9;
        C.usarNomesEquipes(C.sortearNomesEquipes(seed));
        ir({ nome: 'carregando', nomePiloto: nome, seed, opcoes: C.equipesIniciais(seed), dev: tela.dev });
        break;
      }
      case 'iniciar':
        ir({ nome: 'inicio' });
        break;
      case 'iniciar-dev':
        if (!modoDev()) break;
        ir({ nome: 'inicio', dev: id });
        break;
      case 'sair-jogo':
        // Volta para a abertura; a carreira já está salva e reaparece em "Continuar".
        salvar();
        pensar();
        ir({ nome: 'abertura' });
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
      case 'repor-estoque': {
        const r = C.reporEstoque(estado);
        if (erro(r)) { salvar(); render(); rolarPara('.repor', 'center'); aviso(`Comprado: ${r.texto} (−${reais(r.gasto)}).`, 'pneu'); }
        break;
      }
      case 'tutorial-pneus':
        estado.tutorialPneus = true;
        salvar();
        render();
        break;
      case 'rever-tutorial':
        Tutorial.reiniciar();
        tela.aba = 'resumo';
        render();
        break;
      case 'aposentar':
        if (erro(C.encerrarCarreira(estado))) { salvar(); ir({ nome: 'aposentado' }); }
        break;
      case 'abandonar':
        apagarSave();
        estado = null;
        corrida = null;
        ir({ nome: 'abertura' });
        break;
      case 'abrir-noticia': {
        tela.aba = alvo.dataset.aba;
        render();
        const el = app.querySelector(alvo.dataset.sel);
        if (el) {
          rolarPara(el, 'center');
          el.classList.add('pisca-destaque');
          setTimeout(() => el.classList.remove('pisca-destaque'), 1800);
        } else rolarPara('.abas');
        break;
      }
      case 'aba':
        trocarAba(alvo.dataset.aba);
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
      case 'premium':
        abrirPremium(alvo.dataset.motivo);
        break;
      case 'premium-dev':
        BoxPremium.alternarDev();
        render();
        break;
      case 'melhorar-box': {
        const r = C.melhorarBox(estado);
        if (erro(r)) { salvar(); render(); aviso(`Equipe de box: ${C.nivelBox(estado)}/${C.NIVEL_BOX_MAX}!`, 'chave'); }
        break;
      }
      case 'comprar-espaco': {
        const r = C.comprarEspaco(estado);
        if (erro(r)) { salvar(); render(); aviso(`Estoque ampliado: ${C.espacoPneus(estado)} vagas.`); }
        break;
      }
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
        if (erro(C.amaciarPneu(estado))) { salvar(); render(); rolarPara('.acoes', 'center'); aviso('Pneu amaciado: pronto para render o máximo.'); }
        break;
      case 'investir-ponto':
        if (erro(C.investirPonto(estado, alvo.dataset.a))) { salvar(); render(); }
        break;
      case 'devolver-ponto':
        if (erro(C.devolverPonto(estado, alvo.dataset.a))) { salvar(); render(); }
        break;
      case 'banco-valor':
        tela.banco = { ...(tela.banco || { prazo: 8 }), fracao: +alvo.dataset.valor };
        render();
        break;
      case 'banco-prazo':
        tela.banco = { ...(tela.banco || { fracao: 1 }), prazo: +alvo.dataset.valor };
        render();
        break;
      case 'pegar-emprestimo': {
        const b = tela.banco || { fracao: 1, prazo: 8 };
        const valor = Math.round((C.limiteEmprestimo(estado) * FRACOES_EMPRESTIMO[b.fracao]) / 1000) * 1000;
        if (erro(C.pegarEmprestimo(estado, valor, b.prazo))) { salvar(); render(); rolarPara('.cartao-banco', 'center'); aviso(`${reais(valor)} no caixa.`, 'carteira'); }
        break;
      }
      case 'quitar-emprestimo':
        if (erro(C.quitarEmprestimo(estado))) { salvar(); render(); rolarPara('.cartao-banco', 'center'); aviso('Empréstimo quitado.'); }
        break;
      case 'aceitar-patrocinio':
        if (erro(C.aceitarPatrocinio(estado, id, alvo.dataset.duracao))) { salvar(); render(); rolarPara('.cartao-patrocinio', 'center'); }
        break;
      case 'recusar-patrocinio':
        C.recusarPatrocinio(estado, id);
        salvar();
        render();
        break;
      case 'aceitar-proposta': {
        const r = C.aceitarProposta(estado, id);
        if (erro(r)) { salvar(); ir(telaDaFase()); if (r.f4) aviso('Bem-vindo à Fórmula 4! O carro é outro: asas, suspensão e box.'); else if (estado.fase === 'paddock') aviso(`Bem-vindo à ${C.campeonato(estado.campeonato).curto}!`); }
        break;
      }
      case 'box-chuva':
        if (corrida && !corrida.terminou) { corrida.boxJogador = true; atualizarCorrida(); }
        break;
      case 'preparar':
        if (erro(C.prepararPiloto(estado, id))) { salvar(); render(); rolarPara('.cartao-preparacao', 'center'); aviso(`${C.PREPARACAO[id].nome}: teto +1.`, 'subir'); }
        break;
      case 'desenvolver':
        if (erro(C.desenvolverCarro(estado, id))) { salvar(); render(); rolarPara('.cartao-dev', 'center'); aviso(`${C.AREAS_DEV[id]}: peças novas no carro.`, 'subir'); }
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
        if (erro(C.iniciarFimDeSemana(estado))) {
          salvar();
          pensar();
          ir({ nome: 'fds' });
          rolarPara('.corrida .coluna > .painel'); // direto para o card do treino livre
        }
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
      case 'abrir-desafio':
        ir({ nome: 'desafio' });
        break;
      case 'ajuste-desafio': {
        const k = alvo.dataset.k;
        const a = Kart.AJUSTES[k];
        const atual = C.estadoDesafio(estado).setup[k];
        const novo = alvo.dataset.valor != null ? +alvo.dataset.valor : atual + (+alvo.dataset.delta) * a.passo;
        C.ajustarDesafio(estado, { [k]: novo });
        salvar();
        render();
        break;
      }
      case 'volta-desafio': {
        const r = C.tentarDesafio(estado);
        if (!erro(r)) break;
        salvar();
        const n = C.TENTATIVAS_DESAFIO - r.restantes;
        animarPista(`Desafio do dia · volta ${n} de ${C.TENTATIVAS_DESAFIO}`, ['Volta de saída', 'Esquentando os pneus', 'Volta lançada', 'Cruzando a linha'], 'O piloto está buscando o tempo…', () => {
          render();
          aviso(r.nova ? `Medalha de ${NOME_MEDALHA[r.nova].toLowerCase()}! ${tempoVolta(r.tempo)}${r.premio ? ` · +${reais(r.premio)}` : ''}` : `Volta: ${tempoVolta(r.tempo)}`, r.nova ? 'trofeu' : 'relogio');
          rolarPara('.saida', 'center');
          transmitirRadio();
        });
        break;
      }
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
        if (erro(C.contratarMecanico(estado, alvo.dataset.tipo))) { salvar(); render(); rolarPara('.cartao-mecanico', 'center'); aviso(`${C.MECANICOS[alvo.dataset.tipo].nome} contratado para o fim de semana.`); }
        break;
      case 'hora-extra':
        if (erro(C.pagarHoraExtra(estado))) { salvar(); render(); rolarPara('.cartao-mecanico', 'center'); aviso('O mecânico fica nesta sessão.'); }
        break;
      case 'sugestao': {
        const r = C.pedirSugestao(estado);
        if (erro(r)) {
          salvar(); render();
          // Kart montado pelo técnico: vai direto para o próximo passo (sair para a pista, volta lançada ou largar).
          // Palpite ou análise: mostra o que ele disse.
          if (r.faz === 'monta') rolarPara('[data-acao="largar"], [data-acao="classificar"], [data-acao="saida"]', 'center');
          else rolarPara('.cartao-mecanico', 'center');
          aviso(r.faz === 'monta' ? `O técnico montou o ${Kart.veiculo}.` : 'O mecânico deu a opinião dele.');
        }
        break;
      }
      case 'ir-acerto':
        // Do rádio de volta ao acerto (treino livre ou desafio), para mudar antes da próxima volta.
        rolarPara('.cartao-acerto');
        break;
      case 'saida': {
        const r = C.saidaTreino(estado);
        if (!erro(r)) break;
        salvar();
        const voltas = Array.from({ length: C.VOLTAS_POR_SAIDA }, (_, i) => `Volta ${i + 1}/${C.VOLTAS_POR_SAIDA}`);
        animarPista(`Treino livre · saída ${estado.fds.saidas.length}`, voltas, `O piloto está sentindo o ${Kart.veiculo}…`, () => {
          render();
          if (r.saida.recorde) aviso('Novo recorde da pista!', 'trofeu');
          // Leva o jogador até o rádio, onde aparecem o tempo e o que o piloto sentiu.
          rolarPara('.saida', 'center');
          transmitirRadio();
        });
        break;
      }
      case 'ir-quali':
        C.irParaClassificacao(estado);
        salvar();
        tela.mudancas = houveMudanca('quali') ? 'quali' : null;
        render();
        rolarAoTopo();
        break;
      case 'fechar-mudancas':
        tela.mudancas = null;
        render();
        break;
      case 'fechar-largada':
        tela.largada = false;
        tela.mudancas = houveMudanca('grid') ? 'grid' : null;
        render();
        rolarAoTopo();
        break;
      case 'classificar':
        if (!erro(C.classificar(estado))) break;
        salvar();
        animarPista('Classificação', ['Volta de saída', 'Volta lançada', 'Volta lançada', 'Volta de desaceleração'], 'Cronômetro ligado…', () => {
          tela.largada = true;
          render();
          rolarAoTopo();
          if (estado.fds.recordeQuali) aviso('Novo recorde da pista!', 'trofeu');
        });
        break;
      case 'composto':
        if (erro(C.escolherComposto(estado, id))) { salvar(); render(); }
        break;
      case 'box-composto': {
        const eu = corrida && corrida.carros.find((c) => c.jogador);
        if (eu && !eu.fora && !corrida.terminou) { eu.boxPedido = id; atualizarCorrida(); }
        break;
      }
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
        if (corrida.terminou) { pensar(); return finalizarCorrida(); }
        tela.pausado = !tela.pausado;
        if (tela.pausado) { clearInterval(timer); timer = null; } else iniciarTimer();
        atualizarCorrida();
        break;
      case 'anotar': {
        const campo = document.getElementById('nota-corrida');
        if (erro(C.anotarCorrida(estado, campo ? campo.value : ''))) { salvar(); render(); rolarPara('[data-acao="voltar-paddock"]', 'center'); aviso('Anotado no caderno.'); }
        break;
      }
      case 'comecar-f1':
        estado.fase = 'paddock';
        salvar();
        ir(telaDaFase());
        window.scrollTo(0, 0);
        break;
      case 'ver-relatorio':
        estado.relatorio.resumoVisto = true;
        salvar();
        ir(telaDaFase());
        window.scrollTo(0, 0);
        break;
      case 'voltar-paddock':
        // Sem o Premium, um anúncio a cada 3 corridas, já fora da tela de resultado.
        BoxAnuncios.depoisDaCorrida(BoxPremium.ativo);
        C.concluirEtapa(estado);
        salvar();
        pensar();
        ir(telaDaFase());
        break;
      case 'escolher-equipe-ano':
        tela.proximaEquipe = id;
        render();
        rolarPara('[data-acao="nova-temporada"]', 'center');
        break;
      case 'nova-temporada':
        if (erro(C.proximaTemporada(estado, tela.proximo || estado.relatorio.opcoes[estado.relatorio.opcoes.length - 1], tela.proximaEquipe || estado.equipeId))) { salvar(); ir(telaDaFase()); }
        break;
    }
  });

  app.addEventListener('click', (ev) => {
    if (tela.nome === 'abertura' && ev.target.closest('.abertura-marca')) tocarLogo();
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
    app.querySelector('[data-licenca-nome]').textContent = vazio ? 'Seu nome aqui' : nome.trim().toLocaleUpperCase('pt-BR');
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

  // Só desenha depois de ler o save do arquivo (no iPhone a leitura é assíncrona).
  C.definirPremium(BoxPremium.ativo);
  BoxPremium.aoMudar((v) => {
    C.definirPremium(v);
    render();
    if (v) aviso('Premium ativado! Obrigado.', 'estrela');
  });
  BoxPremium.iniciar();
  BoxAnuncios.iniciar();
  BoxSave.iniciar(CHAVE_SAVE).catch(() => {}).then(render);
})();
