// Save no iPhone: o BoxSave com um Filesystem do Capacitor de mentira (em memória).
const test = require('node:test');
const assert = require('node:assert');

function abrirApp(disco, ls) {
  const fs = {
    async readFile({ path }) { if (!(path in disco)) throw new Error('não existe'); return { data: disco[path] }; },
    async writeFile({ path, data }) { await new Promise((r) => setTimeout(r, 2)); disco[path] = data; },
    async rename({ from, to }) { disco[to] = disco[from]; delete disco[from]; },
    async deleteFile({ path }) { if (!(path in disco)) throw new Error('não existe'); delete disco[path]; },
  };
  globalThis.localStorage = { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = v; }, removeItem: (k) => { delete ls[k]; } };
  globalThis.Capacitor = { isNativePlatform: () => true, registerPlugin: () => fs };
  const caminho = require.resolve('../js/armazenamento.js');
  delete require.cache[caminho];
  require(caminho);
  return globalThis.BoxSave;
}

test('save do localStorage antigo vai para o arquivo', async () => {
  const disco = {}; const ls = { k: '{"ano":2027}' };
  const S = abrirApp(disco, ls);
  await S.iniciar('k');
  assert.strictEqual(S.ler('k'), '{"ano":2027}');
  assert.strictEqual(disco['superlicenca-save.json'], '{"ano":2027}');
  assert.ok(!('k' in ls));
});

test('várias gravações seguidas: a última fica no arquivo e vale ao reabrir', async () => {
  const disco = {};
  let S = abrirApp(disco, {});
  await S.iniciar('k');
  for (let i = 0; i < 15; i++) S.gravar('k', JSON.stringify({ etapa: i }));
  await S.terminar();
  assert.strictEqual(disco['superlicenca-save.json'], '{"etapa":14}');
  assert.ok(!('superlicenca-save.tmp' in disco));
  S = abrirApp(disco, {});
  await S.iniciar('k');
  assert.strictEqual(S.ler('k'), '{"etapa":14}');
});

test('arquivo estragado: recupera do temporário; apagar limpa os dois', async () => {
  const disco = { 'superlicenca-save.json': '{quebr', 'superlicenca-save.tmp': '{"etapa":3}' };
  let S = abrirApp(disco, {});
  await S.iniciar('k');
  assert.strictEqual(S.ler('k'), '{"etapa":3}');
  S.apagar('k');
  await S.terminar();
  assert.deepStrictEqual(Object.keys(disco), []);
  S = abrirApp(disco, {});
  await S.iniciar('k');
  assert.strictEqual(S.ler('k'), null);
});
