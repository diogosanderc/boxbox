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

  // Velocidade ao longo de uma volta (curva lenta seguida de reta longa): relação curta sai forte e passa do giro cedo;
  // relação longa sai mais devagar e chega mais rápido ao fim da reta. É um esquema, não uma simulação.
  function visualRelacao(chave) {
    const kart = chave === 'coroa';
    const longa = kart ? 'Menos dentes (relação longa)' : 'Relação longa', curta = kart ? 'Mais dentes (relação curta)' : 'Relação curta';
    return `<div class="dica-sec">Velocidade ao longo de uma volta</div>
      <svg class="dica-grafico" viewBox="0 0 340 176" aria-hidden="true">
        <rect width="340" height="176" rx="14" fill="#0c111b"/>
        <line x1="120" y1="18" x2="120" y2="130" stroke="rgba(255,255,255,.18)" stroke-dasharray="3 3"/>
        <path class="dica-linha" d="M12 100 L62 112 L112 104 C138 98 172 80 216 58 C256 40 296 34 328 32" fill="none" stroke="#8ab4ff" stroke-width="3.5" stroke-linecap="round"/>
        <path class="dica-linha dica-linha2" d="M12 100 L62 112 L112 104 C130 86 150 64 172 52 C192 42 212 40 238 42 L328 48" fill="none" stroke="#ffb020" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="238" cy="42" r="5" fill="#ff6b6b"/><text x="242" y="66" fill="#ff6b6b" font-size="10.5" text-anchor="middle">passa do giro</text>
        <text x="324" y="20" fill="#8ab4ff" font-size="10.5" text-anchor="end">mais velocidade final</text>
        <text x="132" y="116" fill="#ffb020" font-size="10.5">sai forte da curva</text>
        <rect x="12" y="140" width="100" height="24" rx="7" fill="#1b2230"/><text x="62" y="156" fill="#9aa0aa" font-size="10.5" text-anchor="middle">curva lenta</text>
        <rect x="122" y="140" width="206" height="24" rx="7" fill="#161c28"/><text x="225" y="156" fill="#9aa0aa" font-size="10.5" text-anchor="middle">reta longa ►</text>
      </svg>
      <div class="dica-legenda"><span><i style="background:#8ab4ff"></i>${esc(longa)}</span><span><i style="background:#ffb020"></i>${esc(curta)}</span></div>`;
  }
  const VISUAL = { pressao: visualPressao, coroa: visualRelacao, relacao: visualRelacao };

  // dica: { sintomas: [valor baixo demais, valor alto demais], direcao: [o que fazer, o que fazer] } do modelo atual (ou null).
  function html(chave, dica) {
    const d = DICAS[chave];
    if (!d) return '';
    const regua = VISUAL[chave] ? VISUAL[chave](chave) : `<div class="dica-sec">Onde fica o ponto</div>
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

  const api = { CONDICAO, DICAS, html };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BoxDicas = api;
})(typeof window !== 'undefined' ? window : globalThis);
