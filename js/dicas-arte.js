// Desenhos dos "?" do acerto: carro de F1 de lado e de cima, em SVG (gradientes, sombras, rodas com aro). Só desenho:
// quem usa (js/dicas.js) escolhe a altura, o ângulo das asas e o que fica em destaque.
(function (root) {
  'use strict';

  const COR = { corpo: ['#ff5a52', '#b3202c'], faixa: '#f4f6fa', pneu: '#101319', aro: ['#f3f5f8', '#8a93a3'], vidro: '#0b0f17', destaque: '#ffd166' };

  // Roda de lado: pneu, flanco, aro com raios e cubo.
  function roda(id, cx, cy, r, girando) {
    const raios = Array.from({ length: 5 }, (_, i) => { const a = (i * 2 * Math.PI) / 5 - Math.PI / 2; return `<line x1="${cx}" y1="${cy}" x2="${(cx + r * 0.55 * Math.cos(a)).toFixed(1)}" y2="${(cy + r * 0.55 * Math.sin(a)).toFixed(1)}" stroke="#5a6272" stroke-width="${(r * 0.12).toFixed(1)}" stroke-linecap="round"/>`; }).join('');
    return `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${COR.pneu}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="url(#${id}-aro)" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
      <g class="${girando ? 'dica-roda' : ''}" style="transform-origin:${cx}px ${cy}px">${raios}</g>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.14}" fill="#2a303c" stroke="rgba(255,255,255,.4)" stroke-width=".8"/></g>`;
  }

  // Carro de F1 de lado, de frente para a DIREITA. Chão em y = 70.
  //  gap: distância do assoalho ao chão; flapT / flapD: ângulo da asa traseira / dianteira (graus);
  //  destaque: 'traseira' | 'dianteira' | 'assoalho' | 'sidepod' | null; abertura: tamanho da entrada de ar do motor (0..1).
  function carroLado({ id = 'cl', gap = 8, flapT = 12, flapD = 8, destaque = null, abertura = 0.5, girando = true, classeCorpo = '' } = {}) {
    const f = 70 - gap; // assoalho
    const hl = (nome) => (destaque === nome ? ` filter="url(#${id}-brilho)"` : '');
    const corpo = `M28 ${f - 2} L176 ${f} Q194 ${f - 1} 198 ${f - 6} L198 ${f - 10} Q190 ${f - 12} 170 ${f - 15} L132 ${f - 21} Q118 ${f - 22} 110 ${f - 23} L98 ${f - 24} Q88 ${f - 32} 78 ${f - 34} Q68 ${f - 34} 60 ${f - 28} L40 ${f - 19} Q30 ${f - 15} 26 ${f - 9} Z`;
    const entradaH = 2 + abertura * 8;
    return `<defs>
      <linearGradient id="${id}-corpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COR.corpo[0]}"/><stop offset="1" stop-color="${COR.corpo[1]}"/></linearGradient>
      <linearGradient id="${id}-aro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COR.aro[0]}"/><stop offset="1" stop-color="${COR.aro[1]}"/></linearGradient>
      <linearGradient id="${id}-asa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4252"/><stop offset="1" stop-color="#12161e"/></linearGradient>
      <filter id="${id}-brilho" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b"/><feFlood flood-color="${COR.destaque}" flood-opacity=".95"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="108" cy="72" rx="96" ry="3.5" fill="rgba(0,0,0,.45)"/>
    <g class="${classeCorpo}" style="transform-origin:108px ${f - 10}px"><g${hl('assoalho')}><path d="M24 ${f - 1} L180 ${f + 0.5}" stroke="#1a1f29" stroke-width="3" stroke-linecap="round"/><path d="M24 ${f - 1} L30 ${f - 6}" stroke="#1a1f29" stroke-width="3" stroke-linecap="round"/></g>
    <g${hl('dianteira')}><g transform="translate(184 ${f + 1}) rotate(${-flapD})"><path d="M-14 0 H17 Q20 -1.4 17 -3 H-12Z" fill="url(#${id}-asa)" stroke="rgba(255,255,255,.4)" stroke-width=".8"/></g><rect x="196" y="${f - 9}" width="3.4" height="13" rx="1.2" fill="#2b3240" stroke="rgba(255,255,255,.4)" stroke-width=".7"/></g>
    <path d="${corpo}" fill="url(#${id}-corpo)" stroke="rgba(255,255,255,.28)" stroke-width="1"/>
    <path d="M60 ${f - 28} Q78 ${f - 30} 98 ${f - 22} L132 ${f - 19} L170 ${f - 13}" fill="none" stroke="${COR.faixa}" stroke-width="2.2" stroke-linecap="round" opacity=".92"/>
    <path d="M52 ${f - 9} Q86 ${f - 15} 118 ${f - 8} L112 ${f - 2} L50 ${f - 2}Z" fill="rgba(0,0,0,.22)"/>
    <g${hl('sidepod')}><rect x="104" y="${f - 12 - entradaH / 2}" width="13" height="${entradaH}" rx="2.5" fill="${COR.vidro}" stroke="${COR.destaque}" stroke-width="1.2"/></g>
    <path d="M120 ${f - 21} Q124 ${f - 31} 110 ${f - 31} L100 ${f - 24}" fill="none" stroke="#2a303c" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="109" cy="${f - 25.5}" r="4.4" fill="#ffd54a" stroke="rgba(0,0,0,.4)" stroke-width=".8"/><path d="M107 ${f - 27} a4 3 0 0 1 6 1" fill="rgba(255,255,255,.55)"/>
    <g${hl('traseira')}><path d="M40 ${f - 19} V${f - 33}" stroke="#2a303c" stroke-width="3" stroke-linecap="round"/>
      <g transform="translate(34 ${f - 37}) rotate(${flapT})"><path d="M-16 -1.8 H12 Q16 0 12 1.8 H-16Z" fill="url(#${id}-asa)" stroke="rgba(255,255,255,.4)" stroke-width=".8"/></g>
      <rect x="17" y="${f - 45}" width="2.8" height="17" rx="1" fill="#2b3240" stroke="rgba(255,255,255,.35)" stroke-width=".6"/></g></g>
    ${roda(id + 't', 52, 57, 13, girando)}${roda(id + 'f', 150, 57, 13, girando)}`;
  }


  // Carro de F1 visto de cima, de frente para CIMA (viewBox 0 0 100 140). brilho: intensidade (0..1) de cada roda
  // [dianteira esq., dianteira dir., traseira esq., traseira dir.] para mostrar freio ou tração.
  function carroTopo({ id = 'ct', brilho = [0, 0, 0, 0], destaqueEixo = false, cadeado = '' } = {}) {
    const rodaT = (x, y, w, h, g) => `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${(Math.max(w, h) * 0.62 + g * 6).toFixed(1)}" fill="#ff4d4d" opacity="${(g * 0.75).toFixed(2)}" filter="url(#${id}-bl)"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4.5" fill="url(#${id}-pneu)" stroke="rgba(255,255,255,.28)" stroke-width="1"/>
      ${Array.from({ length: Math.floor(h / 5) }, (_, i) => `<line x1="${x + 1.5}" x2="${x + w - 1.5}" y1="${y + 4 + i * 5}" y2="${y + 4 + i * 5}" stroke="rgba(255,255,255,.1)" stroke-width="1"/>`).join('')}`;
    return `<defs>
      <linearGradient id="${id}-corpo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COR.corpo[1]}"/><stop offset=".5" stop-color="${COR.corpo[0]}"/><stop offset="1" stop-color="${COR.corpo[1]}"/></linearGradient>
      <linearGradient id="${id}-pneu" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#262c38"/><stop offset=".5" stop-color="#0d1016"/><stop offset="1" stop-color="#262c38"/></linearGradient>
      <linearGradient id="${id}-asa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#434b5c"/><stop offset="1" stop-color="#171b24"/></linearGradient>
      <filter id="${id}-bl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.2"/></filter>
    </defs>
    <path d="M30 40 L16 40 M70 40 L84 40 M34 94 L16 98 M66 94 L84 98" stroke="#5d6676" stroke-width="2.2" stroke-linecap="round"/>
    <rect x="16" y="39" width="68" height="2.4" fill="#5d6676"/>
    <g${destaqueEixo ? ` filter="url(#${id}-bl)" opacity=".9"` : ''}><rect x="14" y="95" width="72" height="4" rx="2" fill="${destaqueEixo ? COR.destaque : '#5d6676'}"/></g>
    <rect x="14" y="95" width="72" height="4" rx="2" fill="#6d778a"/>
    <path d="M50 8 Q55 12 56.5 30 L59 44 Q70 52 71 68 L68 104 Q66 118 60 126 H40 Q34 118 32 104 L29 68 Q30 52 41 44 L43.5 30 Q45 12 50 8Z" fill="url(#${id}-corpo)" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
    <path d="M32 62 Q20 66 22 84 L30 96 M68 62 Q80 66 78 84 L70 96" fill="rgba(0,0,0,.18)" stroke="rgba(255,255,255,.2)" stroke-width="1"/>
    <path d="M50 14 V122" stroke="${COR.faixa}" stroke-width="3" opacity=".9"/>
    <ellipse cx="50" cy="58" rx="6.5" ry="10" fill="${COR.vidro}" stroke="rgba(255,255,255,.3)"/><circle cx="50" cy="60" r="4.2" fill="#ffd54a" stroke="rgba(0,0,0,.4)" stroke-width=".7"/>
    <path d="M43 56 Q50 44 57 56" fill="none" stroke="#2a303c" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="12" y="4" width="76" height="8" rx="2.5" fill="url(#${id}-asa)" stroke="rgba(255,255,255,.4)" stroke-width=".8"/><rect x="10" y="2" width="3" height="12" rx="1" fill="#2b3240"/><rect x="87" y="2" width="3" height="12" rx="1" fill="#2b3240"/>
    <rect x="26" y="126" width="48" height="8" rx="2.5" fill="url(#${id}-asa)" stroke="rgba(255,255,255,.4)" stroke-width=".8"/><rect x="24" y="124" width="3" height="12" rx="1" fill="#2b3240"/><rect x="73" y="124" width="3" height="12" rx="1" fill="#2b3240"/>
    ${rodaT(12, 28, 14, 26, brilho[0])}${rodaT(74, 28, 14, 26, brilho[1])}${rodaT(5, 78, 18, 34, brilho[2])}${rodaT(77, 78, 18, 34, brilho[3])}
    ${cadeado ? `<g><rect x="39" y="90" width="22" height="14" rx="5" fill="#1b2230" stroke="rgba(255,255,255,.45)"/><text x="50" y="101.5" font-size="11" text-anchor="middle">${cadeado}</text></g>` : ''}`;
  }

  const api = { carroLado, carroTopo, COR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BoxDicasArte = api;
})(typeof window !== 'undefined' ? window : globalThis);
