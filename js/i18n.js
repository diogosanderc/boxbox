// Idiomas do jogo. O código-fonte e os textos gerados estão em português; no inglês, tudo o que aparece
// na tela passa por um tradutor de dicionário (js/i18n-en-*.js). Assim as telas, as notícias guardadas no
// save, o rádio e a ajuda mudam juntos, e o que falta traduzir continua em português (nada quebra).
//
// Dicionário: { 'texto em português': 'English text' }. Para texto com partes variáveis, use {1}, {2}...
// nos dois lados: 'Você tem {1} pontos' -> 'You have {1} points'. O que casa com {n} também é traduzido.
(function (root) {
  'use strict';

  const CHAVE = 'superlicenca-idioma';
  const NO_NAVEGADOR = typeof window !== 'undefined' && typeof document !== 'undefined';

  function detectar() {
    if (!NO_NAVEGADOR) return 'pt';
    try { const s = localStorage.getItem(CHAVE); if (s === 'pt' || s === 'en') return s; } catch (e) { /* sem armazenamento */ }
    const nav = navigator;
    const l = String((nav.languages && nav.languages[0]) || nav.language || 'pt').toLowerCase();
    return l.startsWith('pt') ? 'pt' : 'en';
  }

  let idioma = detectar();
  const exatos = new Map();
  const padroes = [];
  const cache = new Map();
  const suspeitos = new Set();

  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function registrar(dic) {
    for (const [k0, v] of Object.entries(dic)) {
      // "~texto": padrão genérico que só vale dentro de outro (pedaço de lista), nunca sozinho.
      const frag = k0.startsWith('~');
      const chave = norm(frag ? k0.slice(1) : k0);
      if (/\{[#w]?\d+\}/.test(chave)) {
        const partes = chave.split(/\{[#w]?\d+\}/);
        const info = [...chave.matchAll(/\{([#w]?)(\d+)\}/g)].map((m) => ({ n: +m[2], tipo: m[1] }));
        const re = new RegExp(`^${partes.map(escapar).reduce((acc, parte, i) => acc + (i ? (info[i - 1].tipo === '#' ? '([\\d.,]+)' : info[i - 1].tipo === 'w' ? '(\\S+)' : '(.+?)') : '') + parte, '')}$`);
        padroes.push({ chave, re, nums: info.map((x) => x.n), saida: v, peso: partes.join('').length, frag });
      } else {
        exatos.set(chave, v);
      }
    }
    padroes.sort((a, b) => b.peso - a.peso);
    cache.clear();
  }

  // Códigos de país em português -> códigos usados na F1.
  const PAISES = { ING: 'GBR', ALE: 'GER', HOL: 'NED', EUA: 'USA', JAP: 'JPN', SUE: 'SWE', EAU: 'UAE', BRN: 'BHR', SAU: 'KSA' };

  // Dinheiro e números no formato inglês: "US$ 74.800" -> "$74,800", "US$ 3 mil" -> "$3k", "0,035 s" -> "0.035 s".
  function formatarNumeros(texto) {
    return texto
      .replace(/US\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)(\s?(?:mil|mi)\b)?/g, (m, n, suf) => {
        const [inteiro, dec] = n.split(',');
        const num = inteiro.replace(/\./g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '\u0001');
        return `$${num}${dec ? `.${dec}` : ''}${suf ? (suf.trim() === 'mil' ? 'k' : 'm') : ''}`;
      })
      .replace(/\((ING|ALE|HOL|EUA|JAP|SUE|EAU|BRN|SAU)\)/g, (m, c) => `(${PAISES[c]})`)
      .replace(/(\d),(\d)/g, '$1.$2')
      .replace(/\u0001/g, ',');
  }

  function temLetra(s) { return /[A-Za-zÀ-ÿ]/.test(s); }

  // Tenta traduzir um trecho inteiro: exato, depois padrões. Devolve null se nada casar.
  // Valor em lista = [padrão, [seletor, alternativa], ...]: a alternativa vale se o texto está dentro do seletor.
  let ctx = null, usouCtx = false;
  function escolher(v) {
    if (!Array.isArray(v)) return v;
    usouCtx = true;
    if (ctx && ctx.closest) for (const [sel, alt] of v.slice(1)) { if (ctx.closest(sel)) return alt; }
    return v[0];
  }
  function casar(chave, aninhado) {
    if (exatos.has(chave)) return escolher(exatos.get(chave));
    for (const p of padroes) {
      if (p.frag && !aninhado) continue;
      const m = p.re.exec(chave);
      if (!m) continue;
      const por = {};
      p.nums.forEach((n, i) => { por[n] = traduzirParte(m[i + 1], true); });
      return p.saida.replace(/\{(\d+)\}/g, (x, n) => (por[n] != null ? por[n] : x));
    }
    return null;
  }

  // Trecho inteiro; se não casar, tenta por pedaços (" · ", frases) e mantém o que não souber.
  function traduzirParte(texto, aninhado) {
    const chave = norm(texto);
    if (!chave || !temLetra(chave)) return chave;
    const ck = aninhado ? `\u0002${chave}` : chave;
    if (cache.has(ck)) return cache.get(ck);
    const usouAntes = usouCtx; usouCtx = false;
    let r = casar(chave, aninhado);
    const aspas = /^([“"'‘])(.+)([”"'’])$/.exec(chave);
    if (r == null && aspas) { const i = traduzirParte(aspas[2], aninhado); if (i !== aspas[2]) r = aspas[1] + i + aspas[3]; }
    // Frases que o código passa para minúscula depois de um prefixo ("Acho que o kart...").
    if (r == null && /^[a-zà-ÿ]/.test(chave)) {
      const t = casar(chave[0].toUpperCase() + chave.slice(1), aninhado);
      if (t != null) r = t[0].toLowerCase() + t.slice(1);
    }
    if (r == null && chave.includes(' · ')) {
      const partes = chave.split(' · ');
      const out = partes.map((p) => casar(p, aninhado) ?? traduzirParte(p, aninhado));
      if (out.some((o, i) => o !== partes[i])) r = out.join(' · ');
    }
    if (r == null && chave.includes(', ')) { // listas "a, b, c": só vale se todos os itens forem conhecidos
      const itens = chave.split(', ');
      const out = itens.map((x) => casar(x, true));
      if (out.every((o) => o != null)) r = out.join(', ');
    }
    if (r == null) {
      const frases = chave.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý“"(])/);
      if (frases.length > 1) {
        const out = frases.map((f) => casar(f, aninhado) ?? f);
        if (out.some((o, i) => o !== frases[i])) r = out.join(' ');
      }
    }
    if (r == null) r = chave;
    if (!usouCtx) cache.set(ck, r);
    usouCtx = usouCtx || usouAntes;
    return r;
  }

  const PT = /[áàâãéêíóôõúç]|\b(?:de|que|para|com|não|você|seu|sua|suas|seus|dos|das|da|na|nas|nos|ao|está|estão|são|pelo|pela|mais|uma|etapa|etapas|pneu|pneus|volta|voltas|corrida|treino|pista|equipe|piloto|motor|acerto|caixa|ela|ainda|sem|quando|depois|antes|onde|como|tem)\b/i;

  function traduzir(texto) {
    if (idioma === 'pt' || texto == null) return texto;
    const s = String(texto);
    if (!temLetra(s) && !/R\$|\d,\d/.test(s)) return s;
    const ini = s.match(/^\s*/)[0], fim = s.match(/\s*$/)[0];
    const miolo = s.trim();
    let out = miolo ? traduzirParte(miolo) : '';
    out = formatarNumeros(out);
    if (out === norm(miolo) && PT.test(out)) suspeitos.add(out);
    return ini + out + fim;
  }

  // ---- DOM ----
  const feitos = new WeakMap(); // nó de texto -> texto que o tradutor escreveu
  const ATRIBUTOS = ['title', 'aria-label', 'placeholder', 'alt'];
  const PULAR = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE']);

  function traduzirTexto(no) {
    const atual = no.nodeValue;
    if (feitos.get(no) === atual) return;
    ctx = no.parentElement;
    const novo = traduzir(atual);
    ctx = null;
    if (novo !== atual) no.nodeValue = novo;
    feitos.set(no, novo);
  }

  function traduzirAtributos(el) {
    for (const a of ATRIBUTOS) {
      if (!el.hasAttribute(a)) continue;
      const v = el.getAttribute(a);
      ctx = el;
      const n = traduzir(v);
      ctx = null;
      if (n !== v) el.setAttribute(a, n);
    }
  }

  function traduzirArvore(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { if (!PULAR.has(raiz.parentNode && raiz.parentNode.nodeName)) traduzirTexto(raiz); return; }
    if (raiz.nodeType !== 1 || PULAR.has(raiz.nodeName)) return;
    traduzirAtributos(raiz);
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === 1 && PULAR.has(n.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n = w.nextNode();
    while (n) {
      if (n.nodeType === 3) traduzirTexto(n); else traduzirAtributos(n);
      n = w.nextNode();
    }
  }

  function iniciar() {
    if (!NO_NAVEGADOR) return;
    document.documentElement.lang = idioma === 'en' ? 'en-GB' : 'pt-BR';
    if (idioma === 'pt') return;
    const raiz = document.documentElement;
    traduzirArvore(raiz);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'childList') m.addedNodes.forEach((n) => traduzirArvore(n));
        else if (m.type === 'characterData') { if (m.target.parentNode && !PULAR.has(m.target.parentNode.nodeName)) traduzirTexto(m.target); }
        else if (m.type === 'attributes') traduzirAtributos(m.target);
      }
    }).observe(raiz, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
  }

  function definirIdioma(l) {
    try { localStorage.setItem(CHAVE, l); } catch (e) { /* sem armazenamento */ }
    if (NO_NAVEGADOR) location.reload();
  }

  const api = { get idioma() { return idioma; }, usar: (l) => { idioma = l; cache.clear(); }, registrar, traduzir, definirIdioma, iniciar, formatarNumeros, faltando: () => [...suspeitos].sort(), registradas: () => new Set([...exatos.keys(), ...padroes.map((p) => p.chave)]) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BoxI18n = api;
})(typeof window !== 'undefined' ? window : globalThis);
