// Carro 3D da tela de acerto dos monopostos: modelo glTF desenhado em WebGL2, sem biblioteca.
// Quando o jogador mexe num knob, a câmera vai até a peça e ela se move na hora.
// Modelo: "F1 2022 {FREE!!}" por 3dblenderlol (sketchfab.com/3dblenderlol), licença CC BY 4.0 (modelos/f1/LICENSE.txt).
(function (root) {
  'use strict';

  const ARQUIVO = 'modelos/f1/scene.json';
  const BINARIOS = ['modelos/f1/scene.bin', 'modelos/f1/scene.bin.txt']; // a versão .txt (base64) é a da prévia na web
  const deg = Math.PI / 180;

  // ---------- matrizes (4x4, colunas) ----------
  const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
    return o;
  }
  function trs(t, q, s) {
    const [x, y, z, w] = q, m = ident();
    m[0] = (1 - 2 * (y * y + z * z)) * s[0]; m[1] = 2 * (x * y + z * w) * s[0]; m[2] = 2 * (x * z - y * w) * s[0];
    m[4] = 2 * (x * y - z * w) * s[1]; m[5] = (1 - 2 * (x * x + z * z)) * s[1]; m[6] = 2 * (y * z + x * w) * s[1];
    m[8] = 2 * (x * z + y * w) * s[2]; m[9] = 2 * (y * z - x * w) * s[2]; m[10] = (1 - 2 * (x * x + y * y)) * s[2];
    m[12] = t[0]; m[13] = t[1]; m[14] = t[2];
    return m;
  }
  const trans = (x, y, z) => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
  const rotX = (a) => { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; };
  const escala = (x, y, z) => { const m = ident(); m[0] = x; m[5] = y; m[10] = z; return m; };
  const pivoX = (p, a) => mul(trans(p[0], p[1], p[2]), mul(rotX(a), trans(-p[0], -p[1], -p[2])));
  function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = (2 * f * n) / (n - f); return m; }
  function olhar(eye, t) {
    let z = [eye[0] - t[0], eye[1] - t[1], eye[2] - t[2]]; const l = Math.hypot(...z); z = z.map((v) => v / l);
    let x = [z[2], 0, -z[0]]; const lx = Math.hypot(...x) || 1; x = x.map((v) => v / lx);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]), -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]), -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]), 1]);
  }

  // ---------- WebGL ----------
  const VS = `#version 300 es
  in vec3 p; in vec3 n; uniform mat4 mvp; uniform mat4 mdl; out vec3 vn; out vec3 vp;
  void main(){ vn = mat3(mdl)*n; vp = (mdl*vec4(p,1.)).xyz; gl_Position = mvp*vec4(p,1.); }`;
  const FS = `#version 300 es
  precision mediump float; in vec3 vn; in vec3 vp; uniform vec4 cor; uniform vec2 mr; out vec4 o;
  void main(){
    vec3 N = normalize(vn); if(!gl_FrontFacing) N = -N;
    vec3 L1 = normalize(vec3(.5,.9,.6)), L2 = normalize(vec3(-.7,.3,-.4));
    float d = max(dot(N,L1),0.)*.62 + max(dot(N,L2),0.)*.22 + .30;
    vec3 V = normalize(vec3(0.,3.,8.)-vp); vec3 H = normalize(L1+V);
    float sp = pow(max(dot(N,H),0.), 16.+(1.-mr.y)*90.)*(.15+mr.x*.5);
    float rim = pow(1.-max(dot(N,V),0.), 3.)*.15;
    o = vec4(cor.rgb*d + sp + rim*vec3(.6,.7,1.), 1.);
  }`;

  async function lerBinario() {
    for (const url of BINARIOS) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        if (!/\.txt$/.test(url)) return await r.arrayBuffer();
        const b = atob(await r.text()), u = new Uint8Array(b.length);
        for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
        return u.buffer;
      } catch (e) { /* tenta o próximo */ }
    }
    throw new Error('modelo 3D sem arquivo de geometria');
  }

  async function carregarModelo(gl) {
    const [j, bin] = await Promise.all([fetch(ARQUIVO).then((r) => r.json()), lerBinario()]);
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    const loc = { p: gl.getAttribLocation(prog, 'p'), n: gl.getAttribLocation(prog, 'n'), mvp: gl.getUniformLocation(prog, 'mvp'), mdl: gl.getUniformLocation(prog, 'mdl'), cor: gl.getUniformLocation(prog, 'cor'), mr: gl.getUniformLocation(prog, 'mr') };
    const ncomp = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
    const dados = (i) => {
      const a = j.accessors[i], v = j.bufferViews[a.bufferView], off = (v.byteOffset || 0) + (a.byteOffset || 0), nc = ncomp[a.type];
      const T = a.componentType === 5126 ? Float32Array : a.componentType === 5125 ? Uint32Array : a.componentType === 5123 ? Uint16Array : Uint8Array;
      return { arr: new T(bin, off, a.count * nc), a };
    };
    const malhas = j.meshes.map((m) => m.primitives.map((pr) => {
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      for (const [nome, l] of [['POSITION', loc.p], ['NORMAL', loc.n]]) {
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, dados(pr.attributes[nome]).arr, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0);
      }
      const ix = dados(pr.indices), ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ix.arr, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      const pb = (j.materials[pr.material] || {}).pbrMetallicRoughness || {};
      return { vao, n: ix.arr.length, tipo: ix.a.componentType, cor: pb.baseColorFactor || [1, 1, 1, 1], mr: [pb.metallicFactor == null ? 0 : pb.metallicFactor, pb.roughnessFactor == null ? 0.5 : pb.roughnessFactor] };
    }));
    const nos = j.nodes.map((n, i) => ({ i, filhos: n.children || [], malha: n.mesh, local: n.matrix ? new Float32Array(n.matrix) : trs(n.translation || [0, 0, 0], n.rotation || [0, 0, 0, 1], n.scale || [1, 1, 1]), mundo: null, cor: null, mr: null }));
    return { nos, malhas, prog, loc, raizes: j.scenes[j.scene || 0].nodes };
  }

  function desenhar(gl, mod, vp) {
    const { nos, malhas, loc } = mod;
    gl.useProgram(mod.prog);
    const visita = (i, pai) => {
      const n = nos[i]; let w = mul(pai, n.local);
      if (n.mundo) w = mul(n.mundo, w);
      if (n.malha != null) for (const pr of malhas[n.malha]) {
        gl.uniformMatrix4fv(loc.mvp, false, mul(vp, w)); gl.uniformMatrix4fv(loc.mdl, false, w);
        gl.uniform4fv(loc.cor, n.cor || pr.cor); gl.uniform2fv(loc.mr, n.mr || pr.mr);
        gl.bindVertexArray(pr.vao); gl.drawElements(gl.TRIANGLES, pr.n, pr.tipo, 0);
      }
      for (const f of n.filhos) visita(f, w);
    };
    for (const r of mod.raizes) visita(r, ident());
  }

  // ---------- o carro ----------
  // Coordenadas do modelo: frente do carro em +z, y para cima. Os números abaixo são os nós do arquivo glTF.
  const RODAS = { 6: [0.74, 0.32, 2.43], 33: [0.72, 0.32, -0.72], 83: [-0.72, 0.32, -0.72], 89: [-0.74, 0.32, 2.43] };
  const ASA_DIANT = [22], ASA_TRAS = [63, 65];
  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, 1];

  // Para onde a câmera vai quando o jogador mexe em cada knob (os demais ficam na visão geral).
  const FOCOS = {
    geral: { yaw: 0.95, pitch: 0.28, dist: 6.2, t: [0, 0.35, 1.15] },
    asaDianteira: { yaw: 0.7, pitch: 0.2, dist: 4.2, t: [0, 0.2, 3.1] },
    asaTraseira: { yaw: 3.5, pitch: 0.22, dist: 4.4, t: [0, 0.65, -1.0] },
    altura: { yaw: 1.5708, pitch: 0.03, dist: 7.4, t: [0, 0.3, 1.15] },
    suspensao: { yaw: 0.95, pitch: 0.16, dist: 4, t: [0.7, 0.35, 2.4] },
    pressao: { yaw: 1.15, pitch: 0.1, dist: 3.3, t: [0.78, 0.32, 2.42] },
  };

  const S = { canvas: null, gl: null, modelo: null, erro: false, carregando: false, host: null, raf: 0, corpo: [],
    alvo: { asaDianteira: 5, asaTraseira: 5, altura: 1, suspensao: 1, pressao: 23.5 },
    ang: { asaF: 0, asaT: 0, y: 0, psi: 23.5 }, foco: 'geral', cam: null, giro: 0, auto: 0, arrasto: 0, volta: 0, ultimo: 0, tempo: 0, arrastando: false, ux: 0 };
  const reduzido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function suporta() {
    if (typeof document === 'undefined') return false;
    if (S.erro) return false;
    if (S.gl) return true;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl2', { antialias: true, alpha: true });
      if (!gl) return false;
      S.canvas = c; S.gl = gl; c.className = 'carro3d-tela'; c.setAttribute('aria-hidden', 'true');
      c.addEventListener('pointerdown', (e) => { S.arrastando = true; S.ux = e.clientX; try { c.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } });
      c.addEventListener('pointermove', (e) => { if (S.arrastando) { S.arrasto -= (e.clientX - S.ux) * 0.01; S.ux = e.clientX; } });
      const solta = () => { S.arrastando = false; };
      c.addEventListener('pointerup', solta); c.addEventListener('pointercancel', solta);
      return true;
    } catch (e) { S.erro = true; return false; }
  }

  function pintar(m) {
    const VERM = hex('#e10600'), CARB = hex('#232c3d'), PNEU = hex('#13161c');
    for (const n of m.nos) {
      if (n.malha == null) continue;
      const orig = m.malhas[n.malha][0].cor;
      if ([4, 27, 30, 20].includes(n.i)) { n.cor = VERM; n.mr = [0.3, 0.35]; }
      else if (n.i === 22 || n.i === 63) n.cor = hex('#2b3550');
      else if (RODAS[n.i]) n.cor = PNEU;
      else if (Math.max(orig[0], orig[1], orig[2]) < 0.05) n.cor = CARB;
    }
    // nós-raiz que não são rodas: sobem e descem juntos com a altura e balançam com a suspensão
    const tem = (i) => !!RODAS[i] || m.nos[i].filhos.some(tem);
    let n = m.nos[m.raizes[0]];
    while (n.filhos.length === 1) n = m.nos[n.filhos[0]];
    S.corpo = n.filhos.filter((c) => !tem(c));
  }

  function aplicar(t, dt) {
    const m = S.modelo, a = S.ang, al = S.alvo, k = 1 - Math.exp(-dt * 7);
    a.asaF += ((al.asaDianteira - 5) * 3.2 * deg - a.asaF) * k;
    a.asaT += ((al.asaTraseira - 5) * 3.6 * deg - a.asaT) * k;
    a.y += ((al.altura - 1) * 0.075 - a.y) * k;
    a.psi += (al.pressao - a.psi) * k;
    const freq = [1.6, 2.4, 4.2][al.suspensao], amp = [0.032, 0.016, 0.006][al.suspensao];
    const bal = reduzido() ? 0 : Math.sin(t * freq) * amp * (0.6 + 0.4 * Math.sin(t * 0.7));
    const rol = reduzido() ? 0 : Math.sin(t * freq * 0.7 + 1) * amp * 0.5;
    for (const i of ASA_DIANT) m.nos[i].mundo = pivoX([0, 0.2, 3.15], -a.asaF);
    for (const i of ASA_TRAS) m.nos[i].mundo = pivoX([0, 0.62, -0.95], -a.asaT);
    const corpo = mul(trans(0, a.y + bal, 0), pivoX([0, 0.3, 1.15], rol));
    for (const i of S.corpo) m.nos[i].mundo = corpo;
    // pressão: o pneu dilata e muda de tom (frio azulado, quente avermelhado)
    const f = 1 + (a.psi - 23.5) * 0.006, tom = Math.max(0, Math.min(1, (a.psi - 19) / 8));
    const cor = tom < 0.4 ? [0.10, 0.16, 0.26, 1] : tom > 0.78 ? [0.30, 0.10, 0.08, 1] : [0.075, 0.085, 0.11, 1];
    for (const [i, c] of Object.entries(RODAS)) { m.nos[i].mundo = mul(trans(c[0], c[1], c[2]), mul(escala(f, f, 1), trans(-c[0], -c[1], -c[2]))); m.nos[i].cor = cor; }
  }

  function quadro(agora) {
    S.raf = 0;
    const host = S.host;
    if (!host || !host.isConnected || !S.modelo) return;
    if (typeof document !== 'undefined' && document.hidden) { S.ultimo = 0; S.raf = requestAnimationFrame(quadro); return; }
    const dt = Math.min(0.05, S.ultimo ? (agora - S.ultimo) / 1000 : 0.016); S.ultimo = agora; S.tempo += dt;
    const c = S.canvas, r = host.getBoundingClientRect(), d = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    const W = Math.max(2, Math.round(r.width * d)), H = Math.max(2, Math.round(r.height * d));
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    // câmera: vai até o foco; no foco geral o carro gira devagar
    const alvo = FOCOS[S.foco] || FOCOS.geral, kc = 1 - Math.exp(-dt * 4.2), cam = S.cam;
    let dy = alvo.yaw - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    cam.yaw += dy * kc; cam.pitch += (alvo.pitch - cam.pitch) * kc; cam.dist += (alvo.dist - cam.dist) * kc;
    for (let i = 0; i < 3; i++) cam.t[i] += (alvo.t[i] - cam.t[i]) * kc;
    if (S.foco === 'geral' && !reduzido() && !S.arrastando) S.auto += dt * 0.18;
    const yaw = cam.yaw + S.arrasto + (S.foco === 'geral' ? S.auto : 0), pit = cam.pitch;
    const eye = [cam.t[0] + Math.sin(yaw) * Math.cos(pit) * cam.dist, cam.t[1] + Math.sin(pit) * cam.dist, cam.t[2] + Math.cos(yaw) * Math.cos(pit) * cam.dist];
    aplicar(S.tempo, dt);
    const gl = S.gl;
    gl.viewport(0, 0, W, H); gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    desenhar(gl, S.modelo, mul(persp(0.62, W / H, 0.1, 80), olhar(eye, cam.t)));
    S.raf = requestAnimationFrame(quadro);
  }

  function iniciar() {
    if (S.raf || !S.modelo) return;
    S.ultimo = 0; S.raf = requestAnimationFrame(quadro);
  }

  // ---------- interface com o jogo ----------
  const alvoDoSetup = (s) => ({ asaDianteira: s.asaDianteira, asaTraseira: s.asaTraseira, altura: s.altura, suspensao: s.suspensao, pressao: s.pressao });

  // Marcação do espaço do carro dentro do cartão de acerto (vazia se o aparelho não tem WebGL2).
  function html() {
    return suporta() ? '<div class="carro3d" data-carro3d role="img" aria-label="Carro em 3D: a câmera segue o ajuste que você mexe"><span class="carro3d-carregando">Carregando o carro…</span><small class="carro3d-credito">3D: 3dblenderlol · CC BY 4.0</small></div>' : '';
  }
  // Depois de desenhar a tela: coloca o canvas no espaço e liga o carro ao acerto atual.
  function ligar(raiz, setup) {
    const host = raiz.querySelector('[data-carro3d]');
    if (!host) { S.host = null; return; }
    if (!suporta()) return;
    S.host = host;
    if (setup) S.alvo = { ...S.alvo, ...alvoDoSetup(setup) };
    if (!S.cam) { const g = FOCOS.geral; S.cam = { yaw: g.yaw, pitch: g.pitch, dist: g.dist, t: g.t.slice() }; Object.assign(S.ang, { asaF: (S.alvo.asaDianteira - 5) * 3.2 * deg, asaT: (S.alvo.asaTraseira - 5) * 3.6 * deg, y: (S.alvo.altura - 1) * 0.075, psi: S.alvo.pressao }); }
    if (S.modelo) { host.querySelector('.carro3d-carregando')?.remove(); host.prepend(S.canvas); iniciar(); return; }
    if (S.carregando) return;
    S.carregando = true;
    carregarModelo(S.gl).then((m) => {
      S.modelo = m; pintar(m); S.carregando = false;
      if (S.host && S.host.isConnected) { S.host.querySelector('.carro3d-carregando')?.remove(); S.host.prepend(S.canvas); iniciar(); }
    }).catch(() => { S.erro = true; S.carregando = false; if (S.host) S.host.remove(); });
  }
  // Foco da câmera: a peça do knob mexido; sem foco próprio, volta à visão geral.
  function foco(chave) {
    clearTimeout(S.volta);
    S.foco = FOCOS[chave] ? chave : 'geral';
    S.arrasto = 0;
  }
  // Depois de soltar o knob, a câmera espera um pouco e volta a mostrar o carro inteiro.
  function soltar() {
    clearTimeout(S.volta);
    S.volta = setTimeout(() => { S.foco = 'geral'; S.arrasto = 0; }, 2600);
  }
  // Prévia ao vivo, enquanto o knob ainda está sendo arrastado.
  function previa(chave, valor) { if (chave in S.alvo) S.alvo[chave] = valor; }
  function definir(setup) { if (setup) S.alvo = { ...S.alvo, ...alvoDoSetup(setup) }; }

  const api = { html, ligar, foco, soltar, previa, definir, FOCOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BoxCarro3D = api;
})(typeof window !== 'undefined' ? window : globalThis);
