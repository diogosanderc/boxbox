// Anúncios: um a cada 2 corridas, nunca para quem tem o Premium (plugin nativo de mentira).
const test = require('node:test');
const assert = require('node:assert');

function abrirApp(falhar = false) {
  const chamadas = [];
  globalThis.Capacitor = {
    isNativePlatform: () => true,
    registerPlugin: () => ({
      initAds: async () => { chamadas.push('init'); },
      showInterstitialAd: async (o) => { if (falhar) throw new Error('sem anúncio'); chamadas.push(o); },
    }),
  };
  const caminho = require.resolve('../js/anuncios.js');
  delete require.cache[caminho];
  require(caminho);
  return { A: globalThis.BoxAnuncios, chamadas };
}

test('um anúncio a cada 2 corridas, não personalizado', async () => {
  const { A, chamadas } = abrirApp();
  const mostrados = [];
  for (let i = 0; i < 6; i++) mostrados.push(await A.depoisDaCorrida(false));
  assert.deepStrictEqual(mostrados, [false, true, false, true, false, true]);
  assert.ok(chamadas.filter((c) => c.adId).every((c) => c.npa === true));
});

test('Premium não vê anúncio', async () => {
  const { A, chamadas } = abrirApp();
  for (let i = 0; i < 9; i++) assert.strictEqual(await A.depoisDaCorrida(true), false);
  assert.ok(!chamadas.some((c) => c.adId));
});

test('anúncio que não carregou tenta de novo na corrida seguinte', async () => {
  const { A } = abrirApp(true);
  for (let i = 0; i < 4; i++) assert.strictEqual(await A.depoisDaCorrida(false), false);
});
