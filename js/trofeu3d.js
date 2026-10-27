// Troféu e pódio 3D da tela de campeão: modelos próprios em WebGL2, sem biblioteca.
// Modelos (licença CC BY 4.0, textos em modelos/*/LICENSE.txt):
//   Troféu: "Gold Trophy" por urbanmasque (sketchfab.com/urbanmasque)
//   Pódio: "PODIUM WINNER INTERNATIONAL ZISE 122X366" por eventdesignws (sketchfab.com/eventdesignws)
(function (root) {
  'use strict';

  const ARQUIVO = 'modelos/trofeu/scene.json';
  const BINARIOS = ['modelos/trofeu/scene.bin', 'modelos/trofeu/scene.bin.txt']; // a versão .txt (base64) é a da prévia na web

  const VS = `#version 300 es
  in vec3 p; in vec3 n; in vec2 t; uniform mat4 mvp; uniform mat4 mdl; out vec3 vn; out vec3 vp; out vec2 vt;
  void main(){ vn = mat3(mdl)*n; vp = (mdl*vec4(p,1.)).xyz; vt = t; gl_Position = mvp*vec4(p,1.); }`;
  const FS = `#version 300 es
  precision mediump float; in vec3 vn; in vec3 vp; in vec2 vt; uniform sampler2D tx; uniform vec3 cam; uniform float brilho; uniform vec4 metal; out vec4 o;
  void main(){
    vec3 N = normalize(vn); if(!gl_FrontFacing) N = -N;
    vec3 tc = texture(tx, vt).rgb; vec3 al = mix(vec3(.66,.50,.20), tc, .5)*1.12;
    if(metal.a > .5){ float lm = dot(tc, vec3(.3,.59,.11)); al = metal.rgb*(.5 + lm*.95); }
    vec3 V = normalize(cam - vp), R = reflect(-V, N);
    vec3 L1 = normalize(vec3(.5,.9,.6)), L2 = normalize(vec3(-.7,.3,-.4));
    float d = max(dot(N,L1),0.)*.55 + max(dot(N,L2),0.)*.2 + .32;
    vec3 amb = mix(vec3(.30,.20,.08), vec3(1.,.92,.72), smoothstep(-.5,.9,R.y));
    if(metal.a > .5) amb = mix(metal.rgb*.35, vec3(.5)+metal.rgb*.6, smoothstep(-.5,.9,R.y));
    float luz = pow(max(dot(R, normalize(vec3(.4,.6,.7))),0.), 22.)*1.3 + pow(max(dot(R, normalize(vec3(-.8,.25,.35))),0.), 30.)*.8;
    float fr = pow(1.-max(dot(N,V),0.), 3.);
    vec3 c = al*d*.9 + al*amb*.55 + (metal.a > .5 ? mix(vec3(1.), metal.rgb, .35) : vec3(1.,.9,.6))*luz*brilho + fr*(metal.a > .5 ? metal.rgb : vec3(1.,.85,.5))*.22;
    o = vec4(c, 1.);
  }`;

  const matriz = {
    persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = (2 * f * n) / (n - f); return m; },
    mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
    trans(x, y, z) { const m = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); m[12] = x; m[13] = y; m[14] = z; return m; },
    rotY(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
    escala3(x, y, z) { return new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]); },
    escala(k) { return new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]); },
    rotX(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
  };

  let dadosModelo = null; // { meta, bin } (uma vez só; os buffers de GL são de cada canvas)
  async function lerBinario(urls = BINARIOS) {
    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        if (!/\.txt$/.test(url)) return await r.arrayBuffer();
        const b = atob(await r.text()), u = new Uint8Array(b.length);
        for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
        return u.buffer;
      } catch (e) { /* tenta o próximo */ }
    }
    throw new Error('troféu 3D sem arquivo de geometria');
  }
  const carregarDados = () => (dadosModelo = dadosModelo || Promise.all([fetch(ARQUIVO).then((r) => r.json()), lerBinario()]).then(([meta, bin]) => ({ meta, bin })));
  const carregarImagem = (url) => new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('textura do troféu')); i.src = url; });

  const parado = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = (classe = '') => `<canvas class="trofeu3d ${classe}" data-trofeu3d aria-hidden="true"></canvas>`;

  const ativos = new WeakMap(); // canvas -> { parar }
  const METAIS = { ouro: [1, 1, 1, 0], prata: [0.6, 0.65, 0.76, 1], bronze: [0.78, 0.43, 0.2, 1] }; // ouro mantém a textura; prata e bronze pintam o mesmo relevo (o último número liga o modo)
  const sh = (gl, tipo, src) => { const x = gl.createShader(tipo); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const programa = (gl, vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return p; };

  // Sobe o troféu para a GPU; devolve uma função que o desenha com uma matriz de modelo e um metal.
  function montarTrofeu(gl, meta, bin, img) {
    const prog = programa(gl, VS, FS), o = meta.offsets, nv = meta.vertices;
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const atributo = (nome, dados, n, tipo, passo) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW);
      const l = gl.getAttribLocation(prog, nome); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, tipo, true, passo, 0);
    };
    atributo('p', new Int16Array(bin, o.pos, nv * 3), 3, gl.SHORT, 0);
    atributo('n', new Int8Array(bin, o.nor, nv * 4), 3, gl.BYTE, 4); // 4 bytes por vértice (o último é só preenchimento)
    atributo('t', new Uint16Array(bin, o.uv, nv * 2), 2, gl.UNSIGNED_SHORT, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bin, o.indices, meta.indices), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const u = (n) => gl.getUniformLocation(prog, n);
    const L = { mvp: u('mvp'), mdl: u('mdl'), cam: u('cam'), tx: u('tx'), brilho: u('brilho'), metal: u('metal') };
    return (mdl, vp, eye, brilho, nome) => {
      const m = METAIS[nome] || METAIS.ouro;
      gl.useProgram(prog); gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(L.tx, 0);
      gl.uniformMatrix4fv(L.mvp, false, matriz.mul(vp, mdl)); gl.uniformMatrix4fv(L.mdl, false, mdl); gl.uniform3f(L.cam, eye[0], eye[1], eye[2]);
      gl.uniform1f(L.brilho, brilho); gl.uniform4f(L.metal, m[0], m[1], m[2], m[3]);
      gl.drawElements(gl.TRIANGLES, meta.indices, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(null);
    };
  }

  // Pódio: três malhas de baixo polígono (painel da frente, corpo e os números), coloridas aqui.
  const VS_P = `#version 300 es
  in vec3 p; in vec3 n; uniform mat4 mvp; uniform float esc; out vec3 vn; out vec3 vp;
  void main(){ vp = p*esc; vn = n; gl_Position = mvp*vec4(vp,1.); }`;
  const FS_P = `#version 300 es
  precision mediump float; in vec3 vn; in vec3 vp; uniform int tipo; uniform vec3 cor[3]; uniform vec3 cam; out vec4 o;
  void main(){
    vec3 N = normalize(vn); if(!gl_FrontFacing) N = -N;
    int t = vp.x < -0.6 ? 0 : (vp.x > 0.6 ? 2 : 1);
    vec3 c = cor[t];
    vec3 L1 = normalize(vec3(.4,.9,.7)), L2 = normalize(vec3(-.6,.3,.5));
    float d = max(dot(N,L1),0.)*.6 + max(dot(N,L2),0.)*.25 + .32;
    vec3 V = normalize(cam - vp), R = reflect(-V,N);
    vec3 base; float spec = 0.;
    if(tipo == 0){ base = vec3(.07,.09,.16) + c*.16*clamp(vp.y/.8,0.,1.) + vec3(.03)*(.5+.5*sin(vp.x*9.)); spec = pow(max(dot(R,L1),0.), 24.)*.5; }
    else if(tipo == 2){ o = vec4(c*1.15 + vec3(.05), 1.); return; }
    else if(N.y > .8){ base = mix(vec3(.16,.18,.25), c, .55); spec = pow(max(dot(R,L1),0.), 18.)*.45; }
    else { base = mix(vec3(.08,.10,.18), vec3(.17,.20,.31), clamp(vp.y/.9,0.,1.)); spec = pow(max(dot(R,L2),0.), 14.)*.2; }
    float fr = pow(1.-max(dot(N,V),0.), 3.);
    o = vec4(base*d + spec*vec3(1.,.95,.85) + fr*c*.12, 1.);
  }`;
  let dadosPodio = null;
  const carregarPodio = () => (dadosPodio = dadosPodio || Promise.all([fetch('modelos/podio/scene.json').then((r) => r.json()), lerBinario(['modelos/podio/scene.bin', 'modelos/podio/scene.bin.txt'])]).then(([meta, bin]) => ({ meta, bin })));
  function montarPodio(gl, meta, bin) {
    const prog = programa(gl, VS_P, FS_P), o = meta.offsets, nv = meta.vertices;
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const atributo = (nome, dados, n, tipo, passo) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW);
      const l = gl.getAttribLocation(prog, nome); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, tipo, true, passo, 0);
    };
    atributo('p', new Int16Array(bin, o.pos, nv * 3), 3, gl.SHORT, 0);
    atributo('n', new Int8Array(bin, o.nor, nv * 4), 3, gl.BYTE, 4);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bin, o.indices, meta.malhas.reduce((t, m) => t + m.n, 0)), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const u = (n) => gl.getUniformLocation(prog, n);
    const L = { mvp: u('mvp'), esc: u('esc'), tipo: u('tipo'), cor: u('cor'), cam: u('cam') };
    return (vp, eye, cores) => {
      gl.useProgram(prog); gl.bindVertexArray(vao);
      gl.uniformMatrix4fv(L.mvp, false, vp); gl.uniform1f(L.esc, meta.escala); gl.uniform3fv(L.cor, cores); gl.uniform3f(L.cam, eye[0], eye[1], eye[2]);
      meta.malhas.forEach((m, k) => { gl.uniform1i(L.tipo, ['painel', 'corpo', 'numeros'].indexOf(m.tipo)); gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, m.inicio * 2); });
      gl.bindVertexArray(null);
    };
  }
  const olhar = (eye, alvo) => {
    let z = [eye[0] - alvo[0], eye[1] - alvo[1], eye[2] - alvo[2]]; const l = Math.hypot(...z); z = z.map((v) => v / l);
    let x = [z[2], 0, -z[0]]; const lx = Math.hypot(...x) || 1; x = x.map((v) => v / lx);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]), -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]), -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]), 1]);
  };

  function abrirGL(canvas) {
    soltar(canvas);
    try { return canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true }); } catch (e) { return null; }
  }
  // Roda o quadro a quadro de um canvas; `quadro(agora, dt, w, h)` desenha. Devolve a função que para tudo.
  function animar(canvas, gl, quadro) {
    let vivo = true, raf = 0, anterior = 0;
    const passo = (agora) => {
      if (!vivo) return;
      if (!canvas.isConnected) { soltar(canvas); return; }
      const dt = anterior ? Math.min(0.05, (agora - anterior) / 1000) : 0; anterior = agora;
      const dpr = Math.min(2, root.devicePixelRatio || 1), w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
      quadro(agora, dt, w, h);
      raf = requestAnimationFrame(passo);
    };
    ativos.set(canvas, { parar: () => { vivo = false; cancelAnimationFrame(raf); const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); } });
    raf = requestAnimationFrame(passo);
    canvas.dataset.pronto = '1';
  }

  // Liga um troféu a um canvas. Devolve true se desenhou; false (sem lançar) se o aparelho não tem WebGL2 ou o modelo falhou.
  async function ligar(canvas, opcoes = {}) {
    const gl = abrirGL(canvas);
    if (!gl) return false;
    try {
      const [{ meta, bin }, img] = await Promise.all([carregarDados(), carregarImagem('modelos/trofeu/tex.jpg')]);
      if (!canvas.isConnected) return false;
      const desenha = montarTrofeu(gl, meta, bin, img), eye = [0, 0.15, 4.6];
      let ang = opcoes.angulo == null ? 0.5 : opcoes.angulo;
      animar(canvas, gl, (agora, dt, w, h) => {
        if (!parado()) ang += dt * (opcoes.velocidade == null ? 0.7 : opcoes.velocidade);
        const boba = parado() ? 0 : Math.sin(agora / 900) * 0.04;
        const vp = matriz.mul(matriz.persp(0.52, w / h, 0.5, 20), matriz.trans(-eye[0], -eye[1] - boba, -eye[2]));
        desenha(matriz.mul(matriz.rotX(0.08), matriz.rotY(ang)), vp, eye, 0.8 + 0.2 * Math.sin(agora / 600), opcoes.metal);
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  // Liga o pódio inteiro (corpo + três troféus) a um canvas. `lugares` diz o metal de cada degrau: { esq, centro, dir }.
  // A câmera balança devagar de um lado ao outro. Mesmos retornos de `ligar`.
  const ALTURAS = { esq: 0.4, centro: 0.8, dir: 0.6 }; // altura do topo de cada degrau do modelo (m)
  const POSICOES = { esq: [-1.22, 0.42], centro: [0, 0.45], dir: [1.22, 0.3] }; // x e z do centro do topo
  const ESCALAS = { esq: 0.42, centro: 0.55, dir: 0.46 };
  async function ligarPodio(canvas, opcoes = {}) {
    const gl = abrirGL(canvas);
    if (!gl) return false;
    try {
      const lugares = opcoes.lugares || { esq: 'bronze', centro: 'ouro', dir: 'prata' };
      const [t, p, img] = await Promise.all([carregarDados(), carregarPodio(), carregarImagem('modelos/trofeu/tex.jpg')]);
      if (!canvas.isConnected) return false;
      const desenhaTrofeu = montarTrofeu(gl, t.meta, t.bin, img), desenhaPodio = montarPodio(gl, p.meta, p.bin);
      const cor = (n) => { const m = METAIS[n] || METAIS.ouro; return n === 'ouro' ? [1, 0.78, 0.2] : [m[0], m[1], m[2]]; };
      const cores = new Float32Array([...cor(lugares.esq), ...cor(lugares.centro), ...cor(lugares.dir)]);
      let ang = 0.3, t0 = 0;
      animar(canvas, gl, (agora, dt, w, h) => {
        if (!t0) t0 = agora;
        const s = parado() ? 0 : (agora - t0) / 1000;
        if (!parado()) ang += dt * 0.6;
        const orb = Math.sin(s * 0.55) * 0.18, dist = opcoes.distancia || 7.2;
        const eye = [Math.sin(orb) * dist, 1.75, Math.cos(orb) * dist], alvo = [0, 0.9, 0];
        const vp = matriz.mul(matriz.persp(0.52, w / h, 0.5, 30), olhar(eye, alvo));
        // o corpo sobe do chão e depois cada troféu cai no seu degrau (3º, 2º e 1º); sem movimento, tudo já está no lugar
        const sobe = parado() ? 1 : Math.min(1, s / 0.9), kb = 1 - Math.pow(1 - sobe, 3) * (1 + 1.2 * (1 - sobe));
        desenhaPodio(matriz.mul(vp, matriz.escala3(1, Math.max(0.001, kb), 1)), eye, cores);
        for (const k of ['esq', 'centro', 'dir']) {
          const e = ESCALAS[k], [x, z] = POSICOES[k], atraso = { esq: 0.8, dir: 1.3, centro: 1.9 }[k];
          const u = parado() ? 1 : Math.max(0, Math.min(1, (s - atraso) / 0.7));
          if (u <= 0) continue;
          const queda = (1 - u) * (1 - u) * 2.6;
          const mdl = matriz.mul(matriz.trans(x, ALTURAS[k] + e * 0.99 + queda, z), matriz.mul(matriz.rotY(ang + (k === 'esq' ? 1.1 : k === 'dir' ? 2.1 : 0)), matriz.escala(e)));
          desenhaTrofeu(mdl, vp, eye, 0.8 + 0.2 * Math.sin(agora / 600 + x), lugares[k]);
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  function soltar(canvas) {
    const a = ativos.get(canvas);
    if (a) { ativos.delete(canvas); a.parar(); }
  }

  const api = { html, ligar, ligarPodio, soltar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BoxTrofeu3D = api;
})(typeof window !== 'undefined' ? window : globalThis);
