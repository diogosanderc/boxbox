// Dicas visuais dos "?" do acerto: o que cada extremo do knob faz, em que condições ele tende a mexer e o que o piloto sente
// quando está errado (as frases e as ações vêm do próprio modelo de acerto, em kart.js). Só direções, nunca o valor ideal.
(function (root) {
  'use strict';

  // Condições da pista e do dia. Cada uma tem um ícone e uma forma de simular a condição (usada no teste que confere as setas).
  const CONDICAO = {
    veloz: { ic: '🏁', rotulo: 'Pista veloz' },
    travada: { ic: '🌀', rotulo: 'Pista travada' },
    chuva: { ic: '🌧️', rotulo: 'Chuva' },
    calor: { ic: '☀️', rotulo: 'Calor' },
    frio: { ic: '❄️', rotulo: 'Frio' },
    altitude: { ic: '⛰️', rotulo: 'Altitude' },
    borracha: { ic: '🛣️', rotulo: 'Pista emborrachada' },
    zebrasAltas: { ic: '🚧', rotulo: 'Zebras altas' },
    ondulada: { ic: '〰️', rotulo: 'Pista ondulada' },
    grampos: { ic: '↩️', rotulo: 'Muitos grampos' },
    retas: { ic: '💨', rotulo: 'Retas longas' },
  };

  // Para cada knob: os dois extremos da régua e as condições (seta: 1 = pede mais, -1 = pede menos, 2 = pede bem mais).
  const DICAS = {
    pressao: { extremos: ['Pressão baixa', 'Pressão alta'], quando: [['calor', -1], ['frio', 1], ['chuva', 2]] },
    eixo: { extremos: ['Eixo mole', 'Eixo duro'], quando: [['veloz', 1], ['travada', -1], ['calor', 1], ['borracha', 1], ['chuva', -2]] },
    bitolaTraseira: { extremos: ['Estreita', 'Larga'], quando: [['calor', 1], ['borracha', 1], ['chuva', 2]] },
    bitola: { extremos: ['Estreita', 'Larga'], quando: [['veloz', -1], ['travada', 1], ['chuva', 1]] },
    coroa: { extremos: ['Menos dentes', 'Mais dentes'], quando: [['veloz', -1], ['travada', 1], ['altitude', 1], ['chuva', 1]] },
    carburacao: { extremos: ['Pobre', 'Rica'], quando: [['frio', 1], ['calor', -1], ['altitude', -1]], aviso: 'Pobre demais pode engripar o motor.' },
    asaDianteira: { extremos: ['Pouca asa', 'Muita asa'], quando: [['veloz', -1], ['travada', 1], ['chuva', 2], ['calor', 1], ['altitude', 1]] },
    asaTraseira: { extremos: ['Pouca asa', 'Muita asa'], quando: [['veloz', -1], ['travada', 1], ['chuva', 2], ['calor', 1], ['altitude', 1]] },
    suspensao: { extremos: ['Macia', 'Dura'], quando: [['veloz', 1], ['travada', -1], ['zebrasAltas', -1], ['chuva', -1], ['borracha', 1]] },
    altura: { extremos: ['Baixa', 'Alta'], quando: [['veloz', -1], ['travada', 1], ['chuva', 1], ['ondulada', 1]] },
    relacao: { extremos: ['Curta', 'Longa'], quando: [['veloz', 1], ['travada', -1], ['altitude', -1], ['chuva', -1]] },
    freio: { extremos: ['Mais atrás', 'Mais à frente'], quando: [['grampos', 1], ['chuva', -1]] },
    diferencial: { extremos: ['Aberto', 'Travado'], quando: [['veloz', -1], ['travada', 1], ['chuva', -1]] },
    mapa: { extremos: ['Econômico', 'Potente'], quando: [['retas', 1], ['calor', -1], ['chuva', -1]] },
    arrefecimento: { extremos: ['Fechado', 'Aberto'], quando: [['altitude', 1], ['calor', 1], ['retas', 1], ['chuva', -1]], aviso: 'Fechado demais superaquece o motor.' },
    ers: { extremos: ['Curvas', 'Retas'], quando: [['retas', 1], ['grampos', -1], ['chuva', -1]] },
  };

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SETA = { 2: ['mais', '▲▲'], 1: ['mais', '▲'], '-1': ['menos', '▼'], '-2': ['menos', '▼▼'] };


  // ---------- visuais próprios (no lugar da régua) ----------
  // Termômetro do pneu: tubo de vidro com escala, janela de trabalho (sempre no mesmo lugar: não revela o ideal) e líquido
  // que sobe até o nível de cada extremo. As animações ficam desligadas para quem pede menos movimento (CSS).
  function termometro(id, nivel, cores, rotulo, estado) {
    const topo = 152 - nivel * 140;
    const marcas = Array.from({ length: 10 }, (_, i) => `<line x1="82" x2="${i % 3 === 0 ? 96 : 89}" y1="${22 + i * 14}" y2="${22 + i * 14}" stroke="rgba(255,255,255,.28)" stroke-width="1.5" stroke-linecap="round"/>`).join('');
    return `<div class="dica-termo"><svg viewBox="0 0 130 206" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-liq" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${cores[0]}"/><stop offset="1" stop-color="${cores[1]}"/></linearGradient>
        <radialGradient id="${id}-bulbo" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${cores[1]}"/><stop offset="1" stop-color="${cores[0]}"/></radialGradient>
        <clipPath id="${id}-tubo"><rect x="44" y="12" width="32" height="150" rx="16"/></clipPath>
      </defs>
      <rect x="40" y="8" width="40" height="150" rx="20" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
      <rect x="44" y="12" width="32" height="150" rx="16" fill="#0c111b"/>
      ${marcas}
      <rect x="44" y="62" width="32" height="38" fill="rgba(47,191,113,.2)" stroke="#2fbf71" stroke-width="1.5" stroke-dasharray="4 3"/>
      <g clip-path="url(#${id}-tubo)"><rect class="dica-liq" x="44" y="${topo.toFixed(1)}" width="32" height="${(170 - topo).toFixed(1)}" fill="url(#${id}-liq)"/></g>
      <circle cx="60" cy="176" r="24" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
      <circle cx="60" cy="176" r="20" fill="url(#${id}-bulbo)"/>
      <ellipse cx="52" cy="168" rx="6" ry="4" fill="rgba(255,255,255,.55)" transform="rotate(-30 52 168)"/>
      <rect x="49" y="20" width="4" height="118" rx="2" fill="rgba(255,255,255,.22)"/>
      <text x="6" y="30" font-size="17">🔥</text><text x="6" y="176" font-size="17">❄️</text>
      <text x="100" y="85" font-size="10" fill="#2fbf71" font-weight="700">Ideal</text>
    </svg><b>${esc(rotulo)}</b><span>${esc(estado)}</span></div>`;
  }
  function visualPressao() {
    return `<div class="dica-sec">Temperatura do pneu na corrida</div><div class="dica-termos">${termometro('tb', 0.28, ['#3f7fff', '#8fd3ff'], 'Pressão baixa', 'Pneu frio')}${termometro('ta', 0.9, ['#ff5a4f', '#ffb347'], 'Pressão alta', 'Pneu quente demais')}</div>`;
  }

  // Engrenagem metálica: dentes trapezoidais, anel, furos de alívio e brilho. Gira devagar (CSS), o pinhão ao contrário.
  function engrenagem(id, cx, cy, r, dentes, cor, sentido) {
    const p = (2 * Math.PI) / dentes, rb = r * 0.84, pts = [];
    for (let i = 0; i < dentes; i++) {
      const a = i * p;
      for (const [rr, f] of [[rb, 0], [r, 0.1], [r, 0.4], [rb, 0.5]]) pts.push(`${(cx + rr * Math.cos(a + f * p)).toFixed(1)} ${(cy + rr * Math.sin(a + f * p)).toFixed(1)}`);
    }
    const furos = r > 22 ? Array.from({ length: 5 }, (_, i) => { const a = (i * 2 * Math.PI) / 5; return `<circle cx="${(cx + r * 0.52 * Math.cos(a)).toFixed(1)}" cy="${(cy + r * 0.52 * Math.sin(a)).toFixed(1)}" r="${(r * 0.1).toFixed(1)}" fill="#0c111b"/>`; }).join('') : '';
    return `<g class="dica-gira ${sentido < 0 ? 'volta' : ''}">
      <path d="M${pts.join(' L')}Z" fill="url(#${id})" stroke="rgba(255,255,255,.35)" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.7).toFixed(1)}" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="${(r * 0.1).toFixed(1)}"/>
      ${furos}<circle cx="${cx}" cy="${cy}" r="${(r * 0.22).toFixed(1)}" fill="#0c111b" stroke="rgba(255,255,255,.4)" stroke-width="1.2"/></g>`;
  }
  // Conta-giros: arco com faixa verde, amarela e vermelha, marcas, ponteiro com sombra e cubo (o ponteiro varre até o valor).
  function contaGiros(angulo, cor) {
    const pol = (a, r) => [(80 + r * Math.sin((a * Math.PI) / 180)).toFixed(1), (76 - r * Math.cos((a * Math.PI) / 180)).toFixed(1)];
    const arco = (a0, a1, r, c) => { const [x0, y0] = pol(a0, r), [x1, y1] = pol(a1, r); return `<path d="M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="butt"/>`; };
    const marcas = Array.from({ length: 13 }, (_, i) => { const a = -90 + i * 15, [x0, y0] = pol(a, 49), [x1, y1] = pol(a, i % 3 === 0 ? 40 : 44); return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="rgba(255,255,255,.55)" stroke-width="${i % 3 === 0 ? 2 : 1.2}" stroke-linecap="round"/>`; }).join('');
    return `<svg viewBox="0 0 160 100" aria-hidden="true">
      <path d="M12 76 A68 68 0 0 1 148 76" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2"/>
      ${arco(-90, 10, 58, '#2fbf71')}${arco(10, 42, 58, '#ffc84a')}${arco(42, 90, 58, '#ff4d4d')}${marcas}
      <g class="dica-ponteiro" style="--ang:${angulo}deg"><line x1="80" y1="76" x2="80" y2="30" stroke="rgba(0,0,0,.45)" stroke-width="5" stroke-linecap="round" transform="translate(1.5 1.5)"/><line x1="80" y1="76" x2="80" y2="30" stroke="${cor}" stroke-width="3" stroke-linecap="round"/></g>
      <circle cx="80" cy="76" r="8" fill="#1b2230" stroke="rgba(255,255,255,.5)" stroke-width="2"/><circle cx="80" cy="76" r="3" fill="${cor}"/>
    </svg>`;
  }
  // Relação (coroa no kart, relação do câmbio nos carros): engrenagens + barras da troca entre força na saída e velocidade final,
  // e o conta-giros no fim da reta. Não mostra o ponto ideal: só a troca.
  function visualRelacao(chave) {
    const kart = chave === 'coroa';
    const casos = [
      { titulo: kart ? 'Menos dentes' : 'Relação longa', sub: kart ? 'coroa menor: relação longa' : 'marchas mais esticadas', dentes: 16, forca: 34, vel: 92, cor: '#8ab4ff', ids: ['gl', 'gp1'], giro: -30, giroRot: 'Sobra folga' },
      { titulo: kart ? 'Mais dentes' : 'Relação curta', sub: kart ? 'coroa maior: relação curta' : 'marchas mais curtas', dentes: 30, forca: 92, vel: 44, cor: '#ffb020', ids: ['gc', 'gp2'], giro: 64, giroRot: 'Zona vermelha' },
    ];
    const defs = (id, c1, c2) => `<radialGradient id="${id}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
    const cartao = (c, i) => {
      const rp = 13, rc = i ? 36 : 25, dist = rp + rc - 2;
      return `<div class="dica-eng"><b>${esc(c.titulo)}</b><small>${esc(c.sub)}</small>
        <svg viewBox="34 14 112 90" aria-hidden="true"><defs>${defs(c.ids[0], i ? '#ffd27a' : '#cfe0ff', c.cor)}${defs(c.ids[1], '#e6e9ee', '#7d8594')}</defs>
          ${engrenagem(c.ids[1], 52, 52, rp, 9, '', -1)}${engrenagem(c.ids[0], 52 + dist, 52, rc, c.dentes, '', 1)}
          ${kart ? `<text x="52" y="90" font-size="9" fill="#9aa0aa" text-anchor="middle">pinhão</text><text x="${52 + dist}" y="${52 + rc + 11}" font-size="9" fill="#9aa0aa" text-anchor="middle">coroa</text>` : ''}
        </svg>
        <div class="dica-barra"><span>Força na saída</span><i><u style="--w:${c.forca}%;background:linear-gradient(90deg,#ff9f1c,#ffd166)"></u></i></div>
        <div class="dica-barra"><span>Velocidade final</span><i><u style="--w:${c.vel}%;background:linear-gradient(90deg,#4f8cff,#9fd0ff)"></u></i></div></div>`;
    };
    return `<div class="dica-sec">O que a troca faz</div><div class="dica-pares">${casos.map(cartao).join('')}</div>
      <div class="dica-sec">Rotação no fim da reta</div>
      <div class="dica-pares">${casos.map((c) => `<div class="dica-giro">${contaGiros(c.giro, c.cor)}<span class="${c.giro > 40 ? 'vermelho' : ''}">${esc(c.giroRot)}</span></div>`).join('')}</div>`;
  }

  // ---------- pares "extremo A × extremo B" (asas, altura, suspensão, diferencial, freio, arrefecimento) ----------
  // Cada cartão tem um esquema do carro e duas barras com a troca que o ajuste faz. Sem valores: só a tendência.
  const seta = (x, y, dx, dy, cor, w = 2.6) => {
    const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, ex = x + dx, ey = y + dy;
    return `<g stroke="${cor}" fill="${cor}" stroke-linecap="round" stroke-linejoin="round"><line x1="${x}" y1="${y}" x2="${ex}" y2="${ey}" stroke-width="${w}"/><path d="M${ex} ${ey} l${(-ux * 6 - uy * 4).toFixed(1)} ${(-uy * 6 + ux * 4).toFixed(1)} l${(uy * 8).toFixed(1)} ${(-ux * 8).toFixed(1)}Z" stroke-width="1"/></g>`;
  };
  const BAR = { ouro: 'linear-gradient(90deg,#ff9f1c,#ffd166)', azul: 'linear-gradient(90deg,#4f8cff,#9fd0ff)', vermelho: 'linear-gradient(90deg,#ff4d4d,#ff9a8a)', verde: 'linear-gradient(90deg,#2fbf71,#8be0b0)' };

  // ---------- cenas com o carro desenhado (js/dicas-arte.js) ----------
  const A = () => root.BoxDicasArte || require('./dicas-arte.js');
  const chao = '<rect x="0" y="70" width="210" height="22" fill="#0e131d"/><line x1="0" y1="70" x2="210" y2="70" stroke="#3d4757" stroke-width="1.2"/>';
  // vento: linhas que correm para a esquerda (o carro vai para a direita); caminhos desenhados da esquerda para a direita.
  const ventoLinhas = (dy = 0) => ['M2 {a} C44 {b} 78 {c} 112 {d} S176 {e} 208 {f}', 'M2 {a2} C44 {b2} 90 {c2} 124 {d2} S178 {e2} 208 {f2}'].map((t, i) => {
    const v = i ? [44, 40, 24, 20, 38, 42] : [34, 30, 12, 6, 20, 30];
    const d = t.replace(/\{(\w+)\}/g, (_, k) => String(v['abcdef'.indexOf(k[0])] + dy));
    return `<path class="dica-vento" d="${d}" style="animation-delay:-${i * 0.3}s"/>`;
  }).join('');
  const casoEmpilhado = (c) => `<div class="dica-caso"><div class="dica-caso-topo"><b>${esc(c.titulo)}</b><small>${esc(c.sub)}</small></div>
    <svg class="dica-cena" viewBox="${c.vb || '0 -16 210 104'}" aria-hidden="true">${c.svg}</svg>
    <div class="dica-barras">${c.barras.map(([r, v, cor]) => `<div class="dica-barra"><span>${esc(r)}</span><i><u style="--w:${v}%;background:${cor}"></u></i></div>`).join('')}</div></div>`;
  const empilha = (casos) => `<div class="dica-sec">Onde o ajuste mexe</div><div class="dica-empilha">${casos.map(casoEmpilhado).join('')}</div>`;
  const rotulo = (x, y, t, cor, ancora = 'start') => `<text x="${x}" y="${y}" font-size="8.5" font-weight="700" fill="${cor}" text-anchor="${ancora}">${esc(t)}</text>`;

  function visualAsa(chave) {
    const traseira = chave === 'asaTraseira', arte = A();
    const cena = (ang, baixo, arrasto, id) => `${chao}${ventoLinhas()}${arte.carroLado({ id, gap: 8, [traseira ? 'flapT' : 'flapD']: ang, destaque: traseira ? 'traseira' : 'dianteira' })}
      ${seta(traseira ? 33 : 190, traseira ? -10 : 18, 0, baixo, '#ffb020', 3)}${rotulo(traseira ? 42 : 182, traseira ? -4 : 20, 'pressão', '#ffb020', traseira ? 'start' : 'end')}
      ${seta(204, -9, -arrasto, 0, '#ff6b6b', 3)}${rotulo(204, 2, 'arrasto', '#ff6b6b', 'end')}`;
    return empilha([
      { titulo: 'Pouca asa', sub: 'ângulo pequeno', svg: cena(traseira ? 5 : 4, 10, 16, 'a1'), barras: [['Aderência nas curvas', 34, BAR.ouro], ['Velocidade na reta', 92, BAR.azul]] },
      { titulo: 'Muita asa', sub: 'ângulo grande', svg: cena(traseira ? 28 : 22, 22, 42, 'a2'), barras: [['Aderência nas curvas', 92, BAR.ouro], ['Velocidade na reta', 44, BAR.azul]] },
    ]);
  }

  function visualAltura() {
    const arte = A();
    const cena = (gap, id) => `${chao}${arte.carroLado({ id, gap, destaque: 'assoalho' })}
      ${gap > 8 ? `<g opacity=".9">${seta(132, 63, -26, 0, '#8ab4ff', 1.8)}${seta(100, 63, -24, 0, '#8ab4ff', 1.8)}</g>` : '<g stroke="#ffd166" stroke-width="1.8" stroke-linecap="round"><path d="M30 67 l-9 -6 M34 69 l-12 -1 M28 68 l-4 -10 M40 68 l-6 -9"/></g>'}`;
    return empilha([
      { titulo: 'Carro baixo', sub: 'rente ao chão', vb: '0 12 210 76', svg: cena(2, 'h1'), barras: [['Aderência (efeito solo)', 92, BAR.ouro], ['Risco de bater no chão', 84, BAR.vermelho]] },
      { titulo: 'Carro alto', sub: 'longe do chão', vb: '0 12 210 76', svg: cena(15, 'h2'), barras: [['Aderência (efeito solo)', 38, BAR.ouro], ['Risco de bater no chão', 8, BAR.vermelho]] },
    ]);
  }

  function visualSuspensao() {
    const arte = A();
    const zebra = (x0, n) => Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * 6}" y="70" width="6" height="4" fill="${i % 2 ? '#f4f6fa' : '#e0343d'}"/>`).join('');
    const cena = (classe, id, mov) => `${chao}${zebra(34, 6)}${zebra(132, 6)}${arte.carroLado({ id, gap: 8, classeCorpo: classe })}
      ${seta(160, 22, 0, -mov, '#ffb020', 2.4)}${seta(160, 22, 0, mov, '#ffb020', 2.4)}${rotulo(172, 25, 'movimento', '#ffb020')}`;
    return empilha([
      { titulo: 'Suspensão macia', sub: 'balança, mas absorve', vb: '0 -8 210 96', svg: cena('dica-balanca', 's1', 22), barras: [['Absorve as zebras', 90, BAR.azul], ['Resposta nas curvas', 34, BAR.ouro]] },
      { titulo: 'Suspensão dura', sub: 'firme, mas quica', vb: '0 -8 210 96', svg: cena('dica-quica', 's2', 8), barras: [['Absorve as zebras', 30, BAR.azul], ['Resposta nas curvas', 92, BAR.ouro]] },
    ]);
  }

  function visualArrefecimento() {
    const arte = A();
    const calor = (n, forte) => Array.from({ length: n }, (_, i) => `<path class="dica-calor" d="M${68 + i * 10} 26 q4 -5 0 -10 t0 -10 t0 -10" style="animation-delay:-${i * 0.4}s;opacity:${forte}"/>`).join('');
    const cena = (ab, id, ondas, forte, ar, arrasto) => `${chao}${ventoLinhas(6)}${calor(ondas, forte)}${arte.carroLado({ id, gap: 8, destaque: 'sidepod', abertura: ab })}
      ${Array.from({ length: ar }, (_, i) => seta(136, 50 + (i - (ar - 1) / 2) * 5, -17, 0, '#8ab4ff', 1.8)).join('')}
      ${seta(204, -9, -arrasto, 0, '#ff6b6b', 3)}${rotulo(204, 2, 'arrasto', '#ff6b6b', 'end')}`;
    return empilha([
      { titulo: 'Fechado', sub: 'entradas de ar pequenas', svg: cena(0.08, 'r1', 3, 0.95, 1, 12), barras: [['Temperatura do motor', 90, BAR.vermelho], ['Velocidade na reta', 92, BAR.azul]] },
      { titulo: 'Aberto', sub: 'entradas de ar grandes', svg: cena(1, 'r2', 1, 0.35, 3, 32), barras: [['Temperatura do motor', 30, BAR.vermelho], ['Velocidade na reta', 56, BAR.azul]] },
    ]);
  }

  // Cenas vistas de cima (carro de frente para cima), lado a lado.
  const cartaoTopo = (c) => `<div class="dica-eng"><b>${esc(c.titulo)}</b><small>${esc(c.sub)}</small><svg class="dica-topo" viewBox="-16 0 132 140" aria-hidden="true">${c.svg}</svg>
    ${c.barras.map(([r, v, cor]) => `<div class="dica-barra"><span>${esc(r)}</span><i><u style="--w:${v}%;background:${cor}"></u></i></div>`).join('')}</div>`;
  const paresTopo = (casos) => `<div class="dica-sec">Onde o ajuste mexe</div><div class="dica-pares">${casos.map(cartaoTopo).join('')}</div>`;

  function visualDiferencial() {
    const arte = A();
    const cena = (esq, dir, cad, id) => `${arte.carroTopo({ id, destaqueEixo: true, cadeado: cad })}
      ${seta(-8, 112, 0, -esq, '#ffb020', 3)}${seta(108, 112, 0, -dir, '#ffb020', 3)}${rotulo(-8, 128, 'dentro', '#9aa0aa', 'middle')}${rotulo(108, 128, 'fora', '#9aa0aa', 'middle')}`;
    return paresTopo([
      { titulo: 'Aberto', sub: 'as rodas giram diferente', svg: cena(34, 14, '🔓', 'd1'), barras: [['Tração na saída', 34, BAR.ouro], ['Giro na entrada', 90, BAR.azul]] },
      { titulo: 'Travado', sub: 'as rodas giram juntas', svg: cena(22, 22, '🔒', 'd2'), barras: [['Tração na saída', 92, BAR.ouro], ['Giro na entrada', 40, BAR.azul]] },
    ]);
  }

  function visualFreio() {
    const arte = A();
    return paresTopo([
      { titulo: 'Mais atrás', sub: 'a traseira trava primeiro', svg: arte.carroTopo({ id: 'f1', brilho: [0.12, 0.12, 0.95, 0.95] }), barras: [['Risco de travar a traseira', 88, BAR.vermelho], ['Risco de travar a frente', 12, BAR.vermelho]] },
      { titulo: 'Mais à frente', sub: 'a frente trava primeiro', svg: arte.carroTopo({ id: 'f2', brilho: [0.95, 0.95, 0.12, 0.12] }), barras: [['Risco de travar a traseira', 12, BAR.vermelho], ['Risco de travar a frente', 88, BAR.vermelho]] },
    ]);
  }


  // Altura e asas com o carro 3D do jogo: o ajuste vai e volta sozinho entre os extremos (feito em ui.js), e a régua e as barras
  // acompanham pelo atributo data-alto. host3d é a marcação do carro 3D (BoxCarro3D.html).
  const REGUA3D = {
    altura: { extremos: ['Carro baixo · rente ao chão', 'Carro alto · longe do chão'], barras: [['Aderência (efeito solo)', 'b-ader', 'ouro'], ['Risco de bater no chão', 'b-bate', 'vermelho']] },
    asaTraseira: { extremos: ['Pouca asa', 'Muita asa'], barras: [['Aderência nas curvas', 'a-ader', 'ouro'], ['Velocidade na reta', 'a-vel', 'azul']] },
    asaDianteira: { extremos: ['Pouca asa', 'Muita asa'], barras: [['Aderência nas curvas', 'a-ader', 'ouro'], ['Velocidade na reta', 'a-vel', 'azul']] },
  };
  function visual3d(chave, host3d) {
    const c = REGUA3D[chave];
    return `<div class="dica-sec">Onde o ajuste mexe</div>
      <div class="dica-3d" data-alto="0">${host3d}
        <div class="dica-3d-regua"><i></i><u></u><span class="dica-3d-baixo">${esc(c.extremos[0])}</span><span class="dica-3d-alto">${esc(c.extremos[1])}</span></div>
        <div class="dica-barras">${c.barras.map(([r, cls, cor]) => `<div class="dica-barra ${cls}"><span>${esc(r)}</span><i><u style="background:${BAR[cor]}"></u></i></div>`).join('')}</div></div>`;
  }
  const tem3d = (chave) => !!REGUA3D[chave];

  const VISUAL = { pressao: visualPressao, coroa: visualRelacao, relacao: visualRelacao, asaDianteira: visualAsa, asaTraseira: visualAsa, altura: visualAltura, suspensao: visualSuspensao, diferencial: visualDiferencial, freio: visualFreio, arrefecimento: visualArrefecimento };

  // dica: { sintomas: [valor baixo demais, valor alto demais], direcao: [o que fazer, o que fazer] } do modelo atual (ou null).
  function html(chave, dica, host3d) {
    const d = DICAS[chave];
    if (!d) return '';
    const regua = host3d && tem3d(chave) ? visual3d(chave, host3d) : VISUAL[chave] ? VISUAL[chave](chave) : `<div class="dica-sec">Onde fica o ponto</div>
      <div class="dica-regua"><i></i></div>
      <div class="dica-extremos"><b>◄ ${esc(d.extremos[0])}</b><b>${esc(d.extremos[1])} ►</b></div>`;
    const quando = `<div class="dica-sec">Quando mexer</div><div class="dica-grade">${d.quando.map(([c, s]) => {
      const [cls, seta] = SETA[s];
      return `<div class="dica-cond"><span class="dica-ic" aria-hidden="true">${CONDICAO[c].ic}</span><span>${esc(CONDICAO[c].rotulo)}</span><span class="dica-seta ${cls}" aria-hidden="true">${seta}</span></div>`;
    }).join('')}</div>`;
    const sint = dica && dica.sintomas && dica.direcao
      ? `<div class="dica-sec">O piloto reclama de…</div><div class="dica-sint">${[0, 1].map((i) => `<div class="dica-s${i + 1}"><b>${esc(d.extremos[i])}</b><span>${esc(dica.sintomas[i])}</span><em>→ ${esc(dica.direcao[i])}</em></div>`).join('')}</div>`
      : '';
    const aviso = d.aviso ? `<p class="dica-aviso">⚠️ ${esc(d.aviso)}</p>` : '';
    return regua + quando + sint + aviso;
  }

  const api = { CONDICAO, DICAS, html, tem3d };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BoxDicas = api;
})(typeof window !== 'undefined' ? window : globalThis);
