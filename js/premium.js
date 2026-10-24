// Superlicença Premium: compra única (não consumível) pela App Store.
// No app do iPhone, fala com o plugin nativo "Premium" (StoreKit 2, ios/App/App/PremiumPlugin.swift).
// No navegador não há compra: o Premium só liga pelo modo desenvolvedor, para testar.
(function (raiz) {
  const CHAVE = 'superlicenca-premium';
  // Só aparece se a App Store não responder (ou no navegador); no app vale o preço da loja, na moeda do jogador.
  const PRECO_PADRAO = 'R$ 9,90';

  const cap = raiz.Capacitor;
  const nativo = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plugin = nativo ? cap.registerPlugin('Premium') : null;

  const lerCache = () => { try { return localStorage.getItem(CHAVE) === '1'; } catch (e) { return false; } };
  // Atalho de desenvolvedor: só vale em build de depuração (rodando pelo Xcode); nunca na App Store.
  const CHAVE_DEV = 'superlicenca-premium-dev';
  const forcadoDev = () => { try { return localStorage.getItem(CHAVE_DEV) === '1'; } catch (e) { return false; } };
  let depuracao = false;
  let daLoja = lerCache(); // o que a App Store disse (ou o cache até ela responder)
  let ativo = daLoja;
  const ouvintes = [];

  function aplicar() {
    const novo = daLoja || (depuracao && forcadoDev());
    if (novo === ativo) return;
    ativo = novo;
    ouvintes.forEach((f) => f(ativo));
  }
  function definir(v) {
    daLoja = !!v;
    try { localStorage.setItem(CHAVE, daLoja ? '1' : '0'); } catch (e) { /* sem armazenamento */ }
    aplicar();
  }

  const BoxPremium = {
    nativo,
    get ativo() { return ativo; },
    // Confere com a App Store ao abrir (o cache vale até a resposta chegar) e escuta compras
    // que chegam fora do fluxo normal (compra aprovada depois, feita em outro aparelho...).
    async iniciar() {
      if (!plugin) return;
      try { depuracao = !!(await plugin.isDebugBuild()).debug; } catch (e) { depuracao = false; }
      aplicar();
      try { plugin.addListener('premiumChanged', (d) => definir(d && d.unlocked)); } catch (e) { /* sem eventos */ }
      try { definir((await plugin.isPremiumUnlocked()).unlocked); } catch (e) { /* offline: fica o cache */ }
    },
    // Preço na moeda do jogador, como a App Store mostra.
    async preco() {
      if (!plugin) return PRECO_PADRAO;
      try {
        const p = await plugin.getPremiumProduct();
        return p && p.available ? p.displayPrice : PRECO_PADRAO;
      } catch (e) { return PRECO_PADRAO; }
    },
    // status: 'purchased' | 'cancelled' | 'pending' | 'indisponivel' | 'erro'
    async comprar() {
      if (!plugin) return { status: 'indisponivel' };
      try {
        const r = await plugin.purchasePremium();
        if (r && r.purchased) definir(true);
        return { status: (r && r.status) || (r && r.purchased ? 'purchased' : 'cancelled') };
      } catch (e) {
        return { status: 'erro', erro: (e && e.message) || String(e) };
      }
    },
    async restaurar() {
      if (!plugin) return { status: 'indisponivel' };
      try {
        const r = await plugin.restorePurchases();
        if (r && r.restored) definir(true);
        return { status: r && r.restored ? 'restaurado' : 'nada' };
      } catch (e) {
        return { status: 'erro', erro: (e && e.message) || String(e) };
      }
    },
    // Só no navegador, pelo modo desenvolvedor.
    alternarDev() {
      if (!plugin) { definir(!ativo); return; }
      if (!depuracao) return;
      try { localStorage.setItem(CHAVE_DEV, forcadoDev() ? '0' : '1'); } catch (e) { /* sem armazenamento */ }
      aplicar();
    },
    // true só quando o app roda pelo Xcode (build de depuração).
    get depuracao() { return depuracao; },
    aoMudar(f) { ouvintes.push(f); },
  };

  raiz.BoxPremium = BoxPremium;
})(typeof window !== 'undefined' ? window : globalThis);
