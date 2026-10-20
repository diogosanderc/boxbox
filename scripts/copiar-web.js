// Monta a pasta www/ que vai dentro do app do iPhone (webDir do Capacitor).
// O jogo não tem etapa de build: só copia os arquivos que o index.html usa.
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const destino = path.join(raiz, 'www');
const ITENS = ['index.html', 'style.css', 'js', 'img', 'fontes'];
// Originais de alta resolução das logos não entram no app.
const FORA = new Set(['logo-original.png', 'logo-barra-original.png']);

fs.rmSync(destino, { recursive: true, force: true });
for (const item of ITENS) {
  fs.cpSync(path.join(raiz, item), path.join(destino, item), {
    recursive: true,
    filter: (origem) => !FORA.has(path.basename(origem)),
  });
}
console.log(`www/ pronta: ${ITENS.join(', ')}`);
