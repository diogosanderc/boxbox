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

  // dica: { sintomas: [valor baixo demais, valor alto demais], direcao: [o que fazer, o que fazer] } do modelo atual (ou null).
  function html(chave, dica) {
    const d = DICAS[chave];
    if (!d) return '';
    const regua = `<div class="dica-sec">Onde fica o ponto</div>
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
