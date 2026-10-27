// iPad: o jogo é desenhado para uma coluna de 480 px. No iPhone o viewport já é esse; no iPad o viewport é maior
// e a coluna ficaria pequena no meio da tela. Aqui a página é desenhada numa largura menor e ampliada até
// ocupar a tela, como um zoom do app inteiro: nada de layout novo, só a mesma coluna em tamanho maior.
(function (raiz) {
  'use strict';

  const COLUNA = 480; // largura da coluna do jogo, em px de CSS
  const ALTURA_MIN = 700; // altura mínima, em px de CSS, que a tela deve ter depois da ampliação
  const BASE = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

  // largura/altura da tela em pontos (já na orientação atual). Devolve o conteúdo do meta viewport.
  function viewportPara(largura, altura) {
    if (Math.min(largura, altura) < 600) return BASE; // iPhone
    const esc = Math.min(largura / COLUNA, altura / ALTURA_MIN);
    const p = Math.round(esc * 1000) / 1000;
    return `width=${Math.round(largura / esc)}, initial-scale=${p}, minimum-scale=${p}, maximum-scale=${p}, user-scalable=no, viewport-fit=cover`;
  }

  function aplicar() {
    const meta = raiz.document && raiz.document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const s = raiz.screen || {};
    const menor = Math.min(s.width || 0, s.height || 0), maior = Math.max(s.width || 0, s.height || 0);
    const emPe = !raiz.matchMedia || raiz.matchMedia('(orientation: portrait)').matches;
    meta.setAttribute('content', viewportPara(emPe ? menor : maior, emPe ? maior : menor));
  }

  if (raiz.document) {
    aplicar();
    raiz.addEventListener('orientationchange', () => setTimeout(aplicar, 150));
    raiz.addEventListener('resize', () => setTimeout(aplicar, 150));
  }
  const api = { viewportPara };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.BoxEscalaIpad = api;
})(typeof window !== 'undefined' ? window : globalThis);
