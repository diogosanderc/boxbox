// Anúncios de tela cheia (AdMob) para quem não tem o Premium, como no GOLAÇO:
// um a cada 3 corridas, sempre depois do resultado (ao voltar para o paddock), nunca no meio do fim de semana.
// No navegador não há anúncio. O plugin nativo é ios/App/App/AnunciosPlugin.swift.
(function (raiz) {
  // Bloco intersticial do Superlicença no AdMob (o App ID fica no Info.plist, GADApplicationIdentifier).
  // Para testar sem gerar impressão real, dá para usar o bloco de teste do Google: ca-app-pub-3940256099942544/4411468910
  const ID_INTERSTICIAL_IOS = 'ca-app-pub-9207064721204036/9790838410';
  // Bloco de anúncio PREMIADO (para pular a espera entre temporadas), superlicenca_premiada no AdMob.
  // Para testar sem gerar impressão real, dá para usar o bloco de teste do Google: ca-app-pub-3940256099942544/1712485313
  const ID_PREMIADO_IOS = 'ca-app-pub-9207064721204036/6479567763';
  const CORRIDAS_ENTRE_ANUNCIOS = 3;

  const cap = raiz.Capacitor;
  const nativo = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plugin = nativo ? cap.registerPlugin('Anuncios') : null;

  // A contagem fica no aparelho: fechar o app entre as corridas não pode zerar o anúncio.
  const CHAVE = 'boxbox-anuncio-contagem';
  let corridasDesdeOUltimo = 0;
  try { corridasDesdeOUltimo = Math.max(0, parseInt(raiz.localStorage.getItem(CHAVE), 10) || 0); } catch (e) { /* sem armazenamento */ }
  const guardarContagem = () => { try { raiz.localStorage.setItem(CHAVE, String(corridasDesdeOUltimo)); } catch (e) { /* sem armazenamento */ } };
  let mostrando = false;
  let iniciado = null;

  const BoxAnuncios = {
    nativo,
    // Consentimento (UMP) e SDK do Google: uma vez só, ao abrir o app.
    iniciar() {
      if (!plugin) return Promise.resolve();
      if (!iniciado) iniciado = plugin.initAds().catch(() => {});
      return iniciado;
    },
    // Chamado ao fim de cada corrida. Devolve true se um anúncio foi mostrado.
    async depoisDaCorrida(premium) {
      if (!plugin || premium || mostrando) return false;
      corridasDesdeOUltimo += 1;
      guardarContagem();
      if (corridasDesdeOUltimo < CORRIDAS_ENTRE_ANUNCIOS) return false;
      mostrando = true;
      try {
        await BoxAnuncios.iniciar();
        // npa: anúncios não personalizados (sem pedido de rastreamento).
        await plugin.showInterstitialAd({ adId: ID_INTERSTICIAL_IOS, npa: true });
        corridasDesdeOUltimo = 0; // só um anúncio que apareceu de verdade zera a contagem
        guardarContagem();
        return true;
      } catch (e) {
        console.log('Anuncio intersticial falhou:', e && (e.message || e)); // aparece no console do Xcode
        return false; // sem internet ou sem anúncio disponível: tenta na próxima corrida
      } finally {
        mostrando = false;
      }
    },
    // Anúncio premiado: devolve true só se o jogador assistiu até o fim (ganhou a recompensa).
    async premiado() {
      if (!plugin || mostrando) return false;
      mostrando = true;
      try {
        await BoxAnuncios.iniciar();
        const r = await plugin.showRewardedAd({ adId: ID_PREMIADO_IOS, npa: true });
        return !!(r && r.rewarded);
      } catch (e) {
        console.log('Anuncio premiado falhou:', e && (e.message || e)); // aparece no console do Xcode
        return false; // sem internet ou sem anúncio disponível
      } finally {
        mostrando = false;
      }
    },
  };

  raiz.BoxAnuncios = BoxAnuncios;
})(typeof window !== 'undefined' ? window : globalThis);
