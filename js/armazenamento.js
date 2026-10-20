// Onde a carreira fica guardada.
// No app do iPhone (Capacitor), num arquivo na pasta de documentos do app: só some se o jogo
// for apagado, entra no backup do iPhone e não sofre a limpeza que o iOS faz nos dados de sites.
// No navegador (desenvolvimento e testes), no localStorage, como antes.
// O jogo lê e grava de forma síncrona: o arquivo é lido uma vez ao abrir (iniciar) e fica em
// memória; cada gravação vai para o arquivo em seguida, sempre a mais recente por último.
(function (raiz) {
  const ARQUIVO = 'superlicenca-save.json';
  const TEMPORARIO = 'superlicenca-save.tmp';
  const PASTA = 'DATA'; // Directory.Data do @capacitor/filesystem: Documents no iOS
  const UTF8 = 'utf8';

  const cap = raiz.Capacitor;
  const nativo = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const fs = nativo ? cap.registerPlugin('Filesystem') : null;

  const memoria = {}; // chave -> texto (só no app)
  let gravando = null; // promessa da gravação em andamento
  let pendente = null; // último texto que ainda falta gravar

  const lerArquivo = async (path) => {
    try {
      const r = await fs.readFile({ path, directory: PASTA, encoding: UTF8 });
      return typeof r.data === 'string' ? r.data : null;
    } catch (e) {
      return null; // ainda não existe
    }
  };
  const valido = (texto) => {
    try { return texto !== null && JSON.parse(texto) !== null; } catch (e) { return false; }
  };

  // Grava num arquivo temporário e troca pelo definitivo: se o app fechar no meio,
  // o save anterior continua inteiro.
  async function gravarArquivo(texto) {
    await fs.writeFile({ path: TEMPORARIO, directory: PASTA, data: texto, encoding: UTF8 });
    await fs.rename({ from: TEMPORARIO, to: ARQUIVO, directory: PASTA, toDirectory: PASTA });
  }
  function filaDeGravacao(texto) {
    pendente = texto;
    if (gravando) return gravando;
    gravando = (async () => {
      while (pendente !== null) {
        const t = pendente;
        pendente = null;
        if (t === '') {
          // Carreira apagada: some o arquivo e qualquer temporário que tenha sobrado.
          for (const path of [ARQUIVO, TEMPORARIO]) {
            try { await fs.deleteFile({ path, directory: PASTA }); } catch (e) { /* já não existia */ }
          }
          continue;
        }
        try {
          await gravarArquivo(t);
        } catch (e) {
          console.warn('Superlicença: não consegui gravar o save', e);
        }
      }
      gravando = null;
    })();
    return gravando;
  }

  const BoxSave = {
    nativo,
    // Lê o save do arquivo antes do primeiro desenho da tela. Um save antigo que esteja no
    // localStorage do app é trazido para o arquivo (e só então apagado de lá).
    async iniciar(chave) {
      if (!nativo) return;
      let texto = await lerArquivo(ARQUIVO);
      if (!valido(texto)) {
        const temp = await lerArquivo(TEMPORARIO);
        texto = valido(temp) ? temp : null;
      }
      if (texto === null) {
        let antigo = null;
        try { antigo = localStorage.getItem(chave); } catch (e) { /* sem localStorage */ }
        if (valido(antigo)) {
          texto = antigo;
          await filaDeGravacao(antigo);
          try { localStorage.removeItem(chave); } catch (e) { /* ignora */ }
        }
      }
      if (texto !== null) memoria[chave] = texto;
    },
    ler(chave) {
      if (nativo) return chave in memoria ? memoria[chave] : null;
      try { return localStorage.getItem(chave); } catch (e) { return null; }
    },
    gravar(chave, texto) {
      if (nativo) { memoria[chave] = texto; filaDeGravacao(texto); return; }
      try { localStorage.setItem(chave, texto); } catch (e) { /* sem armazenamento: segue sem salvar */ }
    },
    apagar(chave) {
      if (nativo) { delete memoria[chave]; filaDeGravacao(''); return; }
      try { localStorage.removeItem(chave); } catch (e) { /* ignora */ }
    },
    // Espera a última gravação chegar ao arquivo.
    terminar() { return gravando || Promise.resolve(); },
  };

  raiz.BoxSave = BoxSave;
})(typeof window !== 'undefined' ? window : globalThis);
