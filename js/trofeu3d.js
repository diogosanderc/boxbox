// Troféu 3D da tela de campeão: modelo próprio em WebGL2, sem biblioteca, girando devagar.
// Modelo (licença CC BY 4.0, texto em modelos/trofeu/LICENSE.txt):
//   "Gold Trophy" por urbanmasque (sketchfab.com/urbanmasque)
(function (root) {
  'use strict';

  const ARQUIVO = 'modelos/trofeu/scene.json';
  const BINARIOS = ['modelos/trofeu/scene.bin', 'modelos/trofeu/scene.bin.txt']; // a versão .txt (base64) é a da prévia na web

  const VS = `#version 300 es
  in vec3 p; in vec3 n; in vec2 t; uniform mat4 mvp; uniform mat4 mdl; out vec3 vn; out vec3 vp; out vec2 vt;
  void main(){ vn = mat3(mdl)*n; vp = (mdl*vec4(p,1.)).xyz; vt = t; gl_Position = mvp*vec4(p,1.); }`;
  const FS = `#version 300 es
  precision mediump float; in vec3 vn; in vec3 vp; in vec2 vt; uniform sampler2D tx; uniform vec3 cam; uniform float brilho; out vec4 o;
  void main(){
    vec3 N = normalize(vn); if(!gl_FrontFacing) N = -N;
    vec3 al = texture(tx, vt).rgb; al = mix(vec3(.66,.50,.20), al, .5)*1.12;
    vec3 V = normalize(cam - vp), R = reflect(-V, N);
    vec3 L1 = normalize(vec3(.5,.9,.6)), L2 = normalize(vec3(-.7,.3,-.4));
    float d = max(dot(N,L1),0.)*.55 + max(dot(N,L2),0.)*.2 + .32;
    vec3 amb = mix(vec3(.30,.20,.08), vec3(1.,.92,.72), smoothstep(-.5,.9,R.y));
    float luz = pow(max(dot(R, normalize(vec3(.4,.6,.7))),0.), 22.)*1.3 + pow(max(dot(R, normalize(vec3(-.8,.25,.35))),0.), 30.)*.8;
    float fr = pow(1.-max(dot(N,V),0.), 3.);
    vec3 c = al*d*.9 + al*amb*.55 + vec3(1.,.9,.6)*luz*brilho + fr*vec3(1.,.85,.5)*.22;
    o = vec4(c, 1.);
  }`;

  const matriz = {
    persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = (2 * f * n) / (n - f); return m; },
    mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
    trans(x, y, z) { const m = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); m[12] = x; m[13] = y; m[14] = z; return m; },
    rotY(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
    rotX(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
  };

  let dadosModelo = null; // { meta, bin } (uma vez só; os buffers de GL são de cada canvas)
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
    throw new Error('troféu 3D sem arquivo de geometria');
  }
  const carregarDados = () => (dadosModelo = dadosModelo || Promise.all([fetch(ARQUIVO).then((r) => r.json()), lerBinario()]).then(([meta, bin]) => ({ meta, bin })));
  const carregarImagem = (url) => new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('textura do troféu')); i.src = url; });

  const parado = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = (classe = '') => `<canvas class="trofeu3d ${classe}" data-trofeu3d aria-hidden="true"></canvas>`;

  const ativos = new WeakMap(); // canvas -> { parar }
  // Liga o troféu a um canvas. Devolve true se desenhou; false (sem lançar) se o aparelho não tem WebGL2 ou o modelo falhou.
  async function ligar(canvas, opcoes = {}) {
    soltar(canvas);
    let gl;
    try { gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true }); } catch (e) { gl = null; }
    if (!gl) return false;
    try {
      const [{ meta, bin }, img] = await Promise.all([carregarDados(), carregarImagem(opcoes.textura || `modelos/trofeu/${'tex.jpg'}`)]);
      if (!canvas.isConnected) return false;
      const sh = (tipo, src) => { const x = gl.createShader(tipo); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      const o = meta.offsets, nv = meta.vertices;
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const atributo = (nome, dados, n, tipo, norm) => {
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW);
        const l = gl.getAttribLocation(prog, nome); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, tipo, norm, 0, 0);
      };
      atributo('p', new Int16Array(bin, o.pos, nv * 3), 3, gl.SHORT, true);
      atributo('n', new Int8Array(bin, o.nor, nv * 4), 3, gl.BYTE, true);
      atributo('t', new Uint16Array(bin, o.uv, nv * 2), 2, gl.UNSIGNED_SHORT, true);
      // o normal vem com 4 bytes por vértice (o último é só preenchimento)
      const ln = gl.getAttribLocation(prog, 'n'); gl.vertexAttribPointer(ln, 3, gl.BYTE, true, 4, 0);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bin, o.indices, meta.indices), gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const u = (n) => gl.getUniformLocation(prog, n);
      const L = { mvp: u('mvp'), mdl: u('mdl'), cam: u('cam'), tx: u('tx'), brilho: u('brilho') };
      let vivo = true, quadro = 0, anterior = 0, ang = opcoes.angulo == null ? 0.5 : opcoes.angulo;
      const eye = [0, 0.15, 4.6];
      const desenhar = (agora) => {
        if (!vivo) return;
        if (!canvas.isConnected) { soltar(canvas); return; }
        const dt = anterior ? Math.min(0.05, (agora - anterior) / 1000) : 0; anterior = agora;
        if (!parado()) ang += dt * (opcoes.velocidade == null ? 0.7 : opcoes.velocidade);
        const dpr = Math.min(2, root.devicePixelRatio || 1), w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
        const boba = parado() ? 0 : Math.sin(agora / 900) * 0.04;
        const mdl = matriz.mul(matriz.rotX(0.08), matriz.rotY(ang));
        const vista = matriz.trans(-eye[0], -eye[1] - boba, -eye[2]);
        const mvp = matriz.mul(matriz.persp(0.52, w / h, 0.5, 20), matriz.mul(vista, mdl));
        gl.useProgram(prog); gl.bindVertexArray(vao);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(L.tx, 0);
        gl.uniformMatrix4fv(L.mvp, false, mvp); gl.uniformMatrix4fv(L.mdl, false, mdl); gl.uniform3f(L.cam, eye[0], eye[1], eye[2]); gl.uniform1f(L.brilho, 0.8 + 0.2 * Math.sin(agora / 600));
        gl.drawElements(gl.TRIANGLES, meta.indices, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
        quadro = requestAnimationFrame(desenhar);
      };
      ativos.set(canvas, { parar: () => { vivo = false; cancelAnimationFrame(quadro); const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); } });
      quadro = requestAnimationFrame(desenhar);
      canvas.dataset.pronto = '1';
      return true;
    } catch (e) {
      return false;
    }
  }
  function soltar(canvas) {
    const a = ativos.get(canvas);
    if (a) { ativos.delete(canvas); a.parar(); }
  }

  const api = { html, ligar, soltar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BoxTrofeu3D = api;
})(typeof window !== 'undefined' ? window : globalThis);
