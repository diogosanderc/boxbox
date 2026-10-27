// Carro 3D da tela de acerto (monopostos e kart): modelo glTF desenhado em WebGL2, sem biblioteca.
// Quando o jogador mexe num knob, a câmera vai até a peça e ela se move na hora.
// Modelos (licença CC BY 4.0, textos em modelos/*/LICENSE.txt):
//   F1: "F1 2022 {FREE!!}" por 3dblenderlol (sketchfab.com/3dblenderlol)
//   Kart: "Racing Kart 125cc (low poly)" por sceeth (sketchfab.com/sceeth)
(function (root) {
  'use strict';

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
  const rotY = (a) => { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; };
  const rotZ = (a) => { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; };
  // gira um ângulo em torno de um eixo qualquer (passando pela origem)
  function rotEixo(eixo, a) {
    const l = Math.hypot(...eixo), x = eixo[0] / l, y = eixo[1] / l, z = eixo[2] / l, c = Math.cos(a), s = Math.sin(a), t = 1 - c, m = ident();
    m[0] = t * x * x + c; m[1] = t * x * y + s * z; m[2] = t * x * z - s * y;
    m[4] = t * x * y - s * z; m[5] = t * y * y + c; m[6] = t * y * z + s * x;
    m[8] = t * x * z + s * y; m[9] = t * y * z - s * x; m[10] = t * z * z + c;
    return m;
  }
  // gira em torno de um ponto do mundo
  const emTorno = (p, r) => mul(trans(p[0], p[1], p[2]), mul(r, trans(-p[0], -p[1], -p[2])));
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

  async function lerBinario(urls) {
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
    throw new Error('modelo 3D sem arquivo de geometria');
  }

  async function carregarModelo(gl, def) {
    const [j, bin] = await Promise.all([fetch(def.arquivo).then((r) => r.json()), lerBinario(def.binarios)]);
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
    const criar = (pos, nor, ix, tipo, pr, dinamico) => {
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      let bufPos = null;
      for (const [arr, l] of [[pos, loc.p], [nor, loc.n]]) {
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, dinamico && arr === pos ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        if (arr === pos) bufPos = b;
        gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0);
      }
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ix, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      const pb = (j.materials[pr.material] || {}).pbrMetallicRoughness || {};
      return { vao, bufPos, n: ix.length, tipo, cor: pb.baseColorFactor || [1, 1, 1, 1], mr: [pb.metallicFactor == null ? 0 : pb.metallicFactor, pb.roughnessFactor == null ? 0.5 : pb.roughnessFactor] };
    };
    const malhas = j.meshes.map((m) => m.primitives.map((pr) => {
      const ix = dados(pr.indices);
      return criar(dados(pr.attributes.POSITION).arr, dados(pr.attributes.NORMAL).arr, ix.arr, ix.a.componentType, pr);
    }));
    const nos = j.nodes.map((n, i) => ({ i, filhos: n.children || [], malha: n.mesh, local: n.matrix ? new Float32Array(n.matrix) : trs(n.translation || [0, 0, 0], n.rotation || [0, 0, 0, 1], n.scale || [1, 1, 1]), mundo: null, cor: null, mr: null }));
    // Peças soltas num só objeto (as 4 rodas do kart): separa os triângulos em um nó novo por grupo.
    const divididos = {};
    if (def.dividir) {
      const { no, grupo, n } = def.dividir, nd = nos[no], pr = j.meshes[nd.malha].primitives[0];
      const pos = dados(pr.attributes.POSITION).arr, nor = dados(pr.attributes.NORMAL).arr, ix = dados(pr.indices).arr;
      const por = Array.from({ length: n }, () => []);
      for (let t = 0; t < ix.length; t += 3) { const v = ix[t] * 3; por[grupo(pos[v], pos[v + 1], pos[v + 2])].push(ix[t], ix[t + 1], ix[t + 2]); }
      const base = nd.malha; nd.malha = null;
      por.forEach((tri, g) => {
        malhas.push([criar(pos, nor, new Uint32Array(tri), 5125, pr)]);
        const novo = { i: nos.length, filhos: [], malha: malhas.length - 1, local: ident(), mundo: null, cor: null, mr: null };
        nos.push(novo); nd.filhos.push(novo.i); divididos[g] = novo.i;
      });
      void base;
    }
    // Partes móveis de uma peça só (os flaps das asas): separa os triângulos cujo centro passa no teste
    // (em coordenadas do modelo) numa malha à parte, filha do mesmo nó.
    const partes = {};
    if (def.partes) {
      const pais = {}; nos.forEach((n) => n.filhos.forEach((f) => { pais[f] = n.i; }));
      const mundoNo = (i) => { const c = []; for (let x = i; x != null; x = pais[x]) c.push(x); return c.reverse().reduce((m, x) => mul(m, nos[x].local), ident()); };
      for (const pt of def.partes) {
        const nd = nos[pt.no], pr = j.meshes[nd.malha].primitives[0], W = mundoNo(pt.no);
        const pos = dados(pr.attributes.POSITION).arr, nor = dados(pr.attributes.NORMAL).arr, ix = dados(pr.indices).arr;
        const mp = (v) => { const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2]; return [W[0] * x + W[4] * y + W[8] * z + W[12], W[1] * x + W[5] * y + W[9] * z + W[13], W[2] * x + W[6] * y + W[10] * z + W[14]]; };
        const resto = [], sel = [];
        for (let t = 0; t < ix.length; t += 3) {
          const a = mp(ix[t]), b = mp(ix[t + 1]), c = mp(ix[t + 2]);
          (pt.teste((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3) ? sel : resto).push(ix[t], ix[t + 1], ix[t + 2]);
        }
        malhas[nd.malha] = [criar(pos, nor, new Uint32Array(resto), 5125, pr)];
        malhas.push([criar(pos, nor, new Uint32Array(sel), 5125, pr)]);
        const novo = { i: nos.length, filhos: [], malha: malhas.length - 1, local: ident(), mundo: null, cor: null, mr: null };
        nos.push(novo); nd.filhos.push(novo.i); partes[pt.id] = novo.i;
      }
    }
    // Peça que dobra (o eixo traseiro do kart): tira da malha os triângulos que estão junto da barra e
    // guarda numa malha à parte, cujos vértices são recalculados a cada quadro.
    let flexivel = null;
    if (def.flexivel) {
      const f = def.flexivel, nd = nos[f.no], pr = j.meshes[nd.malha].primitives[0];
      const pos = dados(pr.attributes.POSITION).arr, nor = dados(pr.attributes.NORMAL).arr, ix = dados(pr.indices).arr;
      const perto = (v) => { const w = f.mundo(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); return Math.hypot(w[1] - f.centro[0], w[2] - f.centro[1]) < f.raio && Math.abs(w[0]) < f.xmax; };
      const resto = [], sel = [];
      for (let t = 0; t < ix.length; t += 3) (perto(ix[t]) && perto(ix[t + 1]) && perto(ix[t + 2]) ? sel : resto).push(ix[t], ix[t + 1], ix[t + 2]);
      const p2 = new Float32Array(sel.length * 3), n2 = new Float32Array(sel.length * 3), seq = new Uint32Array(sel.length);
      sel.forEach((v, k) => { p2.set(pos.subarray(v * 3, v * 3 + 3), k * 3); n2.set(nor.subarray(v * 3, v * 3 + 3), k * 3); seq[k] = k; });
      malhas[nd.malha] = [criar(pos, nor, new Uint32Array(resto), 5125, pr)];
      const prim = criar(p2, n2, seq, 5125, pr, true);
      malhas.push([prim]);
      const novo = { i: nos.length, filhos: [], malha: malhas.length - 1, local: ident(), mundo: null, cor: null, mr: null };
      nos.push(novo); nd.filhos.push(novo.i);
      flexivel = { no: novo.i, prim, pos: p2, base: p2.slice() };
    }
    // Hastes: cilindros de comprimento 1 ao longo de x, esticados por quem usa (o eixo que acompanha a roda).
    const raizes = j.scenes[j.scene || 0].nodes.slice(), hastes = [];
    for (let h = 0; h < (def.hastes || 0); h++) {
      const N = 16, pos = new Float32Array(N * 2 * 3), nor = new Float32Array(N * 2 * 3), tri = [];
      for (let q = 0; q < N; q++) {
        const a = (q / N) * 2 * Math.PI, cy = Math.cos(a), sz = Math.sin(a);
        for (let e = 0; e < 2; e++) { const v = (e * N + q) * 3; pos.set([e, cy, sz], v); nor.set([0, cy, sz], v); }
        const q2 = (q + 1) % N; tri.push(q, q2, N + q, q2, N + q2, N + q);
      }
      malhas.push([criar(pos, nor, new Uint32Array(tri), 5125, {})]);
      const novo = { i: nos.length, filhos: [], malha: malhas.length - 1, local: ident(), mundo: null, cor: null, mr: null };
      nos.push(novo); raizes.push(novo.i); hastes.push(novo.i);
    }
    return { nos, malhas, prog, loc, divididos, hastes, flexivel, partes, raizes };
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


  // ---------- brilhos (modo dica): discos de freio e motor ----------
  const VS_B = `#version 300 es
  in vec3 p; uniform mat4 mvp; uniform vec3 c; uniform float r; uniform vec2 esc; out vec2 q;
  void main(){ q = p.xy; vec4 g = mvp*vec4(c, 1.); g.xy += p.xy * r * esc; gl_Position = g; }`;
  const FS_B = `#version 300 es
  precision mediump float; in vec2 q; uniform vec4 cor; out vec4 o; void main(){ float d = max(0., 1.-length(q)); o = vec4(cor.rgb, cor.a*d*d); }`;
  // Brilho = quadro virado para a câmera com um degradê radial (raio r em unidades do mundo).
  function prepararBrilho(gl) {
    const sh = (t, src) => { const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS_B)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS_B)); gl.linkProgram(prog);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), gl.STATIC_DRAW);
    const lp = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 3, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { prog, vao, n: 6, mvp: gl.getUniformLocation(prog, 'mvp'), c: gl.getUniformLocation(prog, 'c'), r: gl.getUniformLocation(prog, 'r'), esc: gl.getUniformLocation(prog, 'esc'), cor: gl.getUniformLocation(prog, 'cor') };
  }
  function desenharBrilhos(gl, vp, br) {
    if (!br || !(br.f > 0.02 || br.t > 0.02 || br.m > 0.02 || br.b > 0.02 || br.e > 0.02)) return;
    if (!S.brilho) S.brilho = prepararBrilho(gl);
    const b = S.brilho, rodas = F1.RODAS;
    gl.useProgram(b.prog); gl.bindVertexArray(b.vao);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
    gl.uniformMatrix4fv(b.mvp, false, vp);
    gl.uniform2f(b.esc, (1 / Math.tan(0.31)) / (gl.drawingBufferWidth / gl.drawingBufferHeight), 1 / Math.tan(0.31));
    const bola = (c, r, cor, a) => { gl.uniform3f(b.c, c[0], c[1], c[2]); gl.uniform1f(b.r, r); gl.uniform4f(b.cor, cor[0], cor[1], cor[2], a); gl.drawElements(gl.TRIANGLES, b.n, gl.UNSIGNED_SHORT, 0); };
    // os centros das rodas já estão em coordenadas do mundo (é nelas que o carro anima as rodas)
    for (const c of Object.values(rodas)) {
      const g = c[2] > 1 ? br.f : br.t;
      if (g > 0.02) bola([c[0] + (c[0] > 0 ? 0.05 : -0.05), c[1], c[2]], 0.62 + 0.25 * g, [1, 0.3, 0.08], Math.min(1, g) * 1.4);
    }
    if (br.m > 0.02) bola([0, 0.55, -0.4], 0.9 + 0.5 * br.m, [1, 0.45, 0.1], Math.min(1, br.m) * 1.3);
    // ERS: bateria (azul-ciano) sempre acesa e energia indo para as rodas de trás (curvas) ou para o motor (retas)
    if (br.b > 0.02) bola([0, 0.4, 0.55], 0.7 + 0.2 * br.b, [0.2, 0.75, 1], Math.min(1, br.b) * 1.2);
    if (br.e > 0.02) for (const c of Object.values(rodas)) if (c[2] < 1) bola([c[0] + (c[0] > 0 ? 0.05 : -0.05), c[1], c[2]], 0.6 + 0.25 * br.e, [0.2, 0.8, 1], Math.min(1, br.e) * 1.4);
    gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.bindVertexArray(null);
  }

  // ---------- os carros ----------
  // Cada modelo diz onde estão as peças (números de nós do arquivo glTF), como pintar e como mexer em cada ajuste.
  // Frente do carro em +z, y para cima. Posições em unidades do próprio modelo.
  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, 1];
  const claro = (c) => Math.max(c[0], c[1], c[2]) < 0.05;

  const F1 = {
    id: 'f1', arquivo: 'modelos/f1/scene.json', binarios: ['modelos/f1/scene.bin', 'modelos/f1/scene.bin.txt'], // a versão .txt (base64) é a da prévia na web
    alvo: (s) => ({ asaDianteira: s.asaDianteira, asaTraseira: s.asaTraseira, altura: s.altura, suspensao: s.suspensao, pressao: s.arrefecimento != null ? s.pressao - 2.5 : s.pressao, camber: s.camber == null ? -3 : s.camber, relacao: s.relacao, freio: s.freio, diferencial: s.diferencial, mapa: s.mapa == null ? 1 : s.mapa, ers: s.ers == null ? 1 : s.ers, rake: s.rake == null ? 1 : s.rake, arrefecimento: s.arrefecimento }),
    // Para onde a câmera vai quando o jogador mexe em cada knob (os demais ficam na visão geral).
    focos: {
      geral: { yaw: 0.95, pitch: 0.28, dist: 6.2, t: [0, 0.35, 1.15] },
      asaDianteira: { yaw: 0.7, pitch: 0.2, dist: 4.2, t: [0, 0.2, 3.1] },
      asaTraseira: { yaw: 3.5, pitch: 0.22, dist: 4.4, t: [0, 0.65, -1.0] },
      // visões de lado, para o "?" das asas (o ângulo do flap aparece melhor de perfil)
      asaTraseiraLado: { yaw: 1.5708, pitch: 0.12, dist: 3.0, t: [0, 0.62, -1.2] },
      suspensaoLado: { yaw: 1.25, pitch: 0.12, dist: 6.3, t: [0, 0.35, 1.15] },
      asaDianteiraLado: { yaw: 1.5708, pitch: 0.12, dist: 3.2, t: [0, 0.28, 3.15] },
      altura: { yaw: 1.5708, pitch: 0.03, dist: 7.4, t: [0, 0.3, 1.15] },
      suspensao: { yaw: 0.95, pitch: 0.16, dist: 4, t: [0.7, 0.35, 2.4] },
      pressao: { yaw: 1.15, pitch: 0.1, dist: 3.3, t: [0.78, 0.32, 2.42] },
      relacao: { yaw: 1.5708, pitch: 0.05, dist: 6.6, t: [0, 0.35, 1.15] },
      freio: { yaw: 1.5708, pitch: 0.05, dist: 6.6, t: [0, 0.35, 1.15] },
      mapa: { yaw: 2.5, pitch: 0.3, dist: 4.8, t: [0, 0.6, 0.2] },
      arrefecimento: { yaw: 1.5708, pitch: 0.1, dist: 4.2, t: [0.4, 0.45, 0.4] },
      ers: { yaw: 1.5708, pitch: 0.1, dist: 5.4, t: [0, 0.4, 0.3] },
      rake: { yaw: 1.5708, pitch: 0.02, dist: 7, t: [0, 0.35, 1.15] },
      diferencial: { yaw: 2.7, pitch: 0.32, dist: 5.2, t: [0, 0.35, -0.5] },
      camber: { yaw: 0.12, pitch: 0.08, dist: 5.2, t: [0, 0.38, 2.43] },
    },
    RODAS: { 6: [0.74, 0.32, 2.43], 33: [0.72, 0.32, -0.72], 83: [-0.72, 0.32, -0.72], 89: [-0.74, 0.32, 2.43] },
    CARROCERIA: [4, 27, 30, 20],
    // flaps: os elementos de trás da asa dianteira e o elemento de cima da asa traseira (sem as placas laterais)
    partes: [{ id: 'asaF', no: 22, teste: (x, y, z) => z < 3.22 && Math.abs(x) < 0.8 }, { id: 'asaT', no: 63, teste: (x, y, z) => y > 0.66 && Math.abs(x) < 0.47 }],
    pintar(m, cor) {
      const PNEU = hex('#13161c'), CARB = hex('#232c3d');
      for (const n of m.nos) {
        if (n.malha == null) continue;
        const orig = m.malhas[n.malha][0].cor;
        if (this.CARROCERIA.includes(n.i)) { n.cor = hex(cor); n.mr = [0.3, 0.35]; }
        else if (n.i === 22 || n.i === 63 || n.i === m.partes.asaF || n.i === m.partes.asaT) n.cor = hex('#2b3550');
        else if (this.RODAS[n.i]) n.cor = PNEU;
        else if (claro(orig)) n.cor = CARB;
      }
      // nós-raiz que não são rodas: sobem e descem juntos com a altura e balançam com a suspensão
      const tem = (i) => !!this.RODAS[i] || m.nos[i].filhos.some(tem);
      let n = m.nos[m.raizes[0]];
      while (n.filhos.length === 1) n = m.nos[n.filhos[0]];
      this.corpo = n.filhos.filter((c) => !tem(c));
    },
    cores(m, cor) { for (const i of this.CARROCERIA) m.nos[i].cor = hex(cor); },
    iniciarAng(al) { return { asaF: (al.asaDianteira - 5) * 4 * deg, asaT: (al.asaTraseira - 5) * 4.5 * deg, fRel: 0, fMapa: 0, fArr: 0, rake: al.rake == null ? 1 : al.rake, g: { 6: 0, 33: 0, 83: 0, 89: 0 }, y: (al.altura - 1) * 0.075, psi: al.pressao, camb: al.camber == null ? -3 : al.camber }; },
    aplicar(m, t, dt, al, a, foco) {
      const k = 1 - Math.exp(-dt * 7);
      // Rodas girando, só enquanto o jogador mexe no knob certo:
      // relação: curta gira devagar (aceleração), longa gira rápido (velocidade final);
      // freio: gira e freia em ciclo; a roda com mais parcela do freio para antes e o nariz abaixa;
      // diferencial: aberto, uma roda de trás gira muito mais que a outra; travado, as duas giram iguais.
      const emMov = (foco === 'relacao' || foco === 'freio' || foco === 'diferencial') && !reduzido();
      a.fRel += ((emMov ? 1 : 0) - a.fRel) * (1 - Math.exp(-dt * 3));
      const vel = { 6: 0, 33: 0, 83: 0, 89: 0 };
      let mergulho = 0;
      if (foco === 'relacao') { const w = [5, 11, 19][al.relacao == null ? 1 : al.relacao]; for (const i in vel) vel[i] = w; }
      else if (foco === 'freio') {
        const fr = (al.freio == null ? 56 : al.freio) / 100, w = 12;
        const cic = (d) => { const u = t % 3.6; return u < 1.2 ? 1 : u < 1.2 + d ? 1 - (u - 1.2) / d : u < 2.6 ? 0 : u < 3.2 ? (u - 2.6) / 0.6 : 1; };
        const ff = cic(Math.min(1.3, 0.28 / fr)), rr = cic(Math.min(1.3, 0.28 / (1 - fr)));
        vel[6] = vel[89] = w * ff; vel[33] = vel[83] = w * rr;
        mergulho = (1 - ff) * (fr / 0.56) * 1.4 * deg;
      } else if (foco === 'diferencial') {
        const k = [0.75, 0.35, 0][al.diferencial == null ? 1 : al.diferencial], w = 11;
        vel[6] = vel[89] = w; vel[83] = w * (1 + k); vel[33] = w * (1 - k);
      }
      a.mergulho = (a.mergulho || 0) + (mergulho * a.fRel - (a.mergulho || 0)) * k;
      // brilho dos discos (freio) e do motor (mapa): só no modo dica do "?"; frente e traseira esquentam conforme a parcela do freio
      const alvoBr = { f: 0, t: 0, m: 0, b: 0, e: 0 };
      if (S.dica && foco === 'freio') {
        const fr = (al.freio == null ? 56 : al.freio) / 100, u = t % 3.6;
        const cic = (d) => (u < 1.2 ? 1 : u < 1.2 + d ? 1 - (u - 1.2) / d : u < 2.6 ? 0 : u < 3.2 ? (u - 2.6) / 0.6 : 1);
        alvoBr.f = (1 - cic(Math.min(1.3, 0.28 / fr))) * Math.min(1.3, (fr / 0.56) * 0.9);
        alvoBr.t = (1 - cic(Math.min(1.3, 0.28 / (1 - fr)))) * Math.min(1.3, ((1 - fr) / 0.44) * 0.9);
      }
      if (S.dica && foco === 'mapa') alvoBr.m = [0.18, 0.55, 1][al.mapa == null ? 1 : al.mapa] * (0.8 + 0.2 * Math.sin(t * 9));
      if (S.dica && foco === 'arrefecimento') alvoBr.m = [1, 0.5, 0.12][al.arrefecimento == null ? 1 : al.arrefecimento] * (0.85 + 0.15 * Math.sin(t * 5));
      if (S.dica && foco === 'ers') {
        const w = (al.ers == null ? 1 : al.ers) / 2, pulso = 0.85 + 0.15 * Math.sin(t * 7);
        alvoBr.b = (0.5 + 0.5 * (1 - Math.abs(w - 0.5) * 2)) * pulso;
        alvoBr.m = w * 1.1 * pulso;
        alvoBr.e = (1 - w) * 1.1 * pulso;
      }
      a.br = a.br || { f: 0, t: 0, m: 0, b: 0, e: 0 };
      for (const q of ['f', 't', 'm', 'b', 'e']) a.br[q] += (alvoBr[q] - a.br[q]) * (1 - Math.exp(-dt * 8));
      for (const i in vel) a.g[i] += dt * vel[i] * a.fRel;
      a.camb += ((al.camber == null ? -3 : al.camber) - a.camb) * k;
      a.asaF += ((al.asaDianteira - 5) * 4 * deg - a.asaF) * k;
      a.asaT += ((al.asaTraseira - 5) * 4.5 * deg - a.asaT) * k;
      a.y += ((al.altura - 1) * 0.075 - a.y) * k;
      a.psi += (al.pressao - a.psi) * k;
      const freq = [1.6, 2.4, 4.2][al.suspensao], amp = [0.032, 0.016, 0.006][al.suspensao] * (S.dica && foco === 'suspensao' ? 3 : 1);
      const bal = reduzido() ? 0 : Math.sin(t * freq) * amp * (0.6 + 0.4 * Math.sin(t * 0.7));
      const rol = reduzido() ? 0 : Math.sin(t * freq * 0.7 + 1) * amp * 0.5;
      m.nos[m.partes.asaF].mundo = pivoX([0, 0.14, 3.22], a.asaF);
      m.nos[m.partes.asaT].mundo = pivoX([0, 0.62, -0.92], a.asaT);
      // rake: mais inclinação = traseira mais alta que a frente (o nariz abaixa)
      a.rake += ((al.rake == null ? 1 : al.rake) - a.rake) * k;
      const corpo = mul(trans(0, a.y + bal, 0), pivoX([0, 0.3, 1.15], rol + a.mergulho + (a.rake - 1) * 1.6 * deg));
      for (const i of this.corpo) m.nos[i].mundo = corpo;
      // mapa do motor: o motor treme mais quanto mais potência (só enquanto o jogador mexe no knob)
      a.fMapa += ((foco === 'mapa' && !reduzido() ? 1 : 0) - a.fMapa) * (1 - Math.exp(-dt * 3));
      a.fArr += ((foco === 'arrefecimento' && !reduzido() ? 1 : 0) - a.fArr) * (1 - Math.exp(-dt * 3));
      const vib = Math.max(a.fMapa * [0.004, 0.009, 0.02][al.mapa == null ? 1 : al.mapa], a.fArr * [0.016, 0.006, 0][al.arrefecimento == null ? 1 : al.arrefecimento]);
      const tremor = trans(Math.sin(t * 47) * vib, Math.sin(t * 53) * vib * 0.8, 0);
      for (const i of [30, 20]) m.nos[i].mundo = mul(tremor, corpo);
      // pressão: o pneu infla e desinfla (a cor não muda)
      const f = 1 + (a.psi - 23.5) * 0.012;
      // cambagem: as rodas da frente inclinam para dentro (quanto mais negativa, mais inclinadas)
      for (const [i, c] of Object.entries(this.RODAS)) {
        const lean = c[2] > 1 ? (-a.camb - 3) * 6 * deg * (c[0] > 0 ? 1 : -1) : 0;
        m.nos[i].mundo = mul(trans(c[0], c[1], c[2]), mul(rotZ(lean), mul(rotX(a.g[i]), mul(escala(1, f, f), trans(-c[0], -c[1], -c[2])))));
      }
    },
  };

  // Kart: as quatro rodas vêm num objeto só e são separadas ao carregar (grupo 0..3 = esquerda/direita x trás/frente).
  const KART = {
    id: 'kart', arquivo: 'modelos/kart/scene.json', binarios: ['modelos/kart/scene.bin', 'modelos/kart/scene.bin.txt'],
    alvo: (s) => ({ pressao: s.pressao, eixo: s.eixo, bitolaTraseira: s.bitolaTraseira, bitola: s.bitola, alturaBanco: s.alturaBanco == null ? 1 : s.alturaBanco, caster: s.caster == null ? 12 : s.caster, coroa: s.coroa, carburacao: s.carburacao }),
    // no arquivo, o eixo y do objeto é o comprimento do kart (y menor = mais perto da frente)
    hastes: 4,
    // eixo traseiro: a barra (e o que está colada nela) sai do chassi e dobra. mundo(): da posição no arquivo para o mundo.
    flexivel: { no: 17, raio: 7.2, centro: [22.4, -224.2], xmax: 84, mundo: (x, y, z) => [100 * x, 100 * z, -100 * y] },
    EIXO_COMP: 67.5, EIXO_PINO: 68,
    dividir: { no: 21, n: 4, grupo: (x, y) => (x > 0 ? 1 : 0) + (y < 1.5 ? 2 : 0) },
    // centro de cada roda (esquerda/direita, trás/frente) e o lado do eixo x em que ela fica
    RODAS: [{ c: [-83.5, 22.4, -224.2], lado: -1, frente: false }, { c: [83.5, 22.4, -224.2], lado: 1, frente: false }, { c: [-74.2, 21.3, -71.6], lado: -1, frente: true }, { c: [74.2, 21.3, -71.6], lado: 1, frente: true }],
    CARROCERIA: [19, 25, 37, 23], BANCO: [39, 33], MOTOR: [3, 5], ESCAPE: 11, VOLANTE: 7,
    focos: {
      geral: { yaw: 0.95, pitch: 0.3, dist: 330, t: [0, 30, -130] },
      pressao: { yaw: 1.2, pitch: 0.12, dist: 120, t: [74, 22, -72] },
      bitola: { yaw: 0.3, pitch: 0.45, dist: 240, t: [0, 20, -72] },
      bitolaTraseira: { yaw: 3.4, pitch: 0.4, dist: 260, t: [0, 20, -224] },
      eixo: { yaw: 3.14, pitch: 0.62, dist: 200, t: [0, 22, -224] },
      alturaBanco: { yaw: 1.5708, pitch: 0.1, dist: 230, t: [0, 45, -170] },
      coroa: { yaw: -1.2, pitch: 0.35, dist: 170, t: [-30, 25, -195] },
      carburacao: { yaw: -1.2, pitch: 0.35, dist: 170, t: [-40, 25, -195] },
      caster: { yaw: 0.6, pitch: 0.3, dist: 150, t: [-74, 22, -72] },
    },
    pintar(m, cor) {
      const QUADRO = hex('#3b4357'), PNEU = hex('#14171d'), MOTOR = hex('#9aa3b5'), BANCO = hex('#1b2030');
      for (const n of m.nos) {
        if (n.malha == null) continue;
        if (this.CARROCERIA.includes(n.i)) { n.cor = hex(cor); n.mr = [0.2, 0.4]; }
        else if (this.MOTOR.includes(n.i) || n.i === this.ESCAPE) { n.cor = MOTOR; n.mr = [0.7, 0.35]; }
        else if (this.BANCO.includes(n.i)) n.cor = BANCO;
        else if (Object.values(m.divididos).includes(n.i)) n.cor = PNEU;
        else if (m.hastes.includes(n.i)) { n.cor = QUADRO; n.mr = [0.6, 0.4]; }
        else { n.cor = QUADRO; n.mr = [0.6, 0.4]; }
      }
    },
    cores(m, cor) { for (const i of this.CARROCERIA) m.nos[i].cor = hex(cor); },
    iniciarAng(al) { return { psi: al.pressao, bt: al.bitolaTraseira - 1, bf: al.bitola - 1, banco: al.alturaBanco - 1, caster: al.caster, coroa: al.coroa, carb: al.carburacao, fCaster: 0, fCoroa: 0, fCarb: 0, giro: 0 }; },
    aplicar(m, t, dt, al, a, foco) {
      const k = 1 - Math.exp(-dt * 7), ke = 1 - Math.exp(-dt * 3);
      a.psi += (al.pressao - a.psi) * k; a.bt += (al.bitolaTraseira - 1 - a.bt) * k; a.bf += (al.bitola - 1 - a.bf) * k;
      a.banco += (al.alturaBanco - 1 - a.banco) * k; a.caster += (al.caster - a.caster) * k;
      a.coroa += (al.coroa - a.coroa) * k; a.carb += (al.carburacao - a.carb) * k;
      // os movimentos de caster, coroa e carburação só rodam enquanto o jogador mexe no knob
      const mov = reduzido() ? 0 : 1;
      a.fCaster += ((foco === 'caster' ? mov : 0) - a.fCaster) * ke;
      a.fCoroa += ((foco === 'coroa' ? mov : 0) - a.fCoroa) * ke;
      a.fCarb += ((foco === 'carburacao' ? mov : 0) - a.fCarb) * ke;
      const f = 1 + (a.psi - 12) * 0.014;
      // eixo traseiro: a barra dobra (mole dobra muito, duro quase nada) e as rodas de trás inclinam junto com as pontas
      const flecha = reduzido() ? 0 : Math.sin(t * 2.2) * [10, 4.2, 0.8][al.eixo], L = this.EIXO_COMP, flex = Math.atan((2 * flecha) / L);
      const fx = m.flexivel;
      for (let v = 0; v < fx.base.length; v += 3) {
        const xw = Math.max(-L, Math.min(L, fx.base[v] * 100)), dy = -flecha * (1 - (xw / L) * (xw / L));
        fx.pos[v] = fx.base[v]; fx.pos[v + 1] = fx.base[v + 1]; fx.pos[v + 2] = fx.base[v + 2] + dy / 100;
      }
      S.gl.bindBuffer(S.gl.ARRAY_BUFFER, fx.prim.bufPos); S.gl.bufferSubData(S.gl.ARRAY_BUFFER, 0, fx.pos);
      // caster: o ângulo do pino de direção. Ao esterçar, a roda da frente se inclina (cambagem): mais caster, mais inclina.
      const esterco = Math.sin(t * 1.6) * 16 * deg * a.fCaster, incl = esterco * ((a.caster - 8) / 8) * 1.1;
      // coroa: com mais dentes a roda de trás gira mais devagar para a mesma rotação do motor
      a.giro += dt * (3 + (90 - a.coroa) * 0.7) * a.fCoroa;
      this.RODAS.forEach((r, g) => {
        const c = r.c, desloca = r.lado * (r.frente ? a.bf : a.bt) * 9;
        let giro = ident();
        if (r.frente) giro = mul(rotY(esterco), rotZ(incl * r.lado)); else giro = rotX(a.giro);
        const inclina = r.frente ? ident() : emTorno([r.lado * this.EIXO_PINO, c[1], c[2]], rotZ(flex * r.lado));
        m.nos[m.divididos[g]].mundo = mul(trans(desloca, 0, 0), mul(inclina, emTorno([c[0], c[1], c[2]], mul(giro, escala(1, f, f)))));
        // a haste do eixo cresce junto com a roda, para a barra nunca ficar cortada
        const fora = (r.frente ? a.bf : a.bt) * 9, h = m.nos[m.hastes[g]], R = r.frente ? 3.2 : 3.8, ini = r.frente ? 64.2 : 68;
        const comp = fora > 0.2 ? fora + 6 : 0.001, x0 = r.lado > 0 ? ini - 6 : -(ini - 6) - comp;
        h.mundo = mul(trans(x0, c[1], c[2]), escala(comp, R, R));
      });
      // volante acompanha a esterçada
      m.nos[this.VOLANTE].mundo = emTorno([0, 65, -112], rotEixo([0, 0.55, 0.83], -esterco * 2.2));
      const banco = trans(0, a.banco * 7, 0);
      for (const i of this.BANCO) m.nos[i].mundo = banco;
      // carburação: o motor vibra; o escapamento fica vermelho (mistura pobre, quente) ou azulado (mistura rica, fria)
      const vib = a.fCarb * (0.3 + Math.abs(a.carb) * 0.22);
      const tremor = mul(trans(Math.sin(t * 47) * vib, Math.sin(t * 53) * vib * 0.7, 0), ident());
      for (const i of [...this.MOTOR, this.ESCAPE]) m.nos[i].mundo = tremor;
      const q = Math.abs(a.carb) / 3, base = [0.6, 0.63, 0.71], alvoCor = a.carb < 0 ? [1, 0.12, 0.08] : [0.2, 0.5, 1];
      m.nos[this.ESCAPE].cor = [base[0] + (alvoCor[0] - base[0]) * q, base[1] + (alvoCor[1] - base[1]) * q, base[2] + (alvoCor[2] - base[2]) * q, 1];
    },
  };
  const MODELOS = { f1: F1, kart: KART };

  const S = { cor: '#e10600', tipo: 'f1', canvas: null, gl: null, erro: false, host: null, raf: 0,
    mods: {}, // por tipo: { modelo, carregando, ang }
    alvo: {}, foco: 'geral', cam: null, auto: 0, arrasto: 0, volta: 0, ultimo: 0, tempo: 0, arrastando: false, ux: 0 };
  const def = () => MODELOS[S.tipo];
  const modeloAtual = () => (S.mods[S.tipo] || {}).modelo;
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

  function quadro(agora) {
    S.raf = 0;
    const host = S.host, m = modeloAtual();
    if (!host || !host.isConnected || !m) return;
    if (typeof document !== 'undefined' && document.hidden) { S.ultimo = 0; S.raf = requestAnimationFrame(quadro); return; }
    const dt = Math.min(0.05, S.ultimo ? (agora - S.ultimo) / 1000 : 0.016); S.ultimo = agora; S.tempo += dt;
    const c = S.canvas, r = host.getBoundingClientRect(), d = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    const W = Math.max(2, Math.round(r.width * d)), H = Math.max(2, Math.round(r.height * d));
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    // câmera: vai até o foco; no foco geral o carro gira devagar
    const focos = def().focos, alvo = focos[S.foco] || focos.geral, kc = 1 - Math.exp(-dt * 4.2), cam = S.cam;
    let dy = alvo.yaw - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    cam.yaw += dy * kc; cam.pitch += (alvo.pitch - cam.pitch) * kc; cam.dist += (alvo.dist - cam.dist) * kc;
    for (let i = 0; i < 3; i++) cam.t[i] += (alvo.t[i] - cam.t[i]) * kc;
    if (S.foco === 'geral' && !reduzido() && !S.arrastando) S.auto += dt * 0.18;
    const yaw = cam.yaw + S.arrasto + (S.foco === 'geral' ? S.auto : 0), pit = cam.pitch;
    const eye = [cam.t[0] + Math.sin(yaw) * Math.cos(pit) * cam.dist, cam.t[1] + Math.sin(pit) * cam.dist, cam.t[2] + Math.cos(yaw) * Math.cos(pit) * cam.dist];
    def().aplicar(m, S.tempo, dt, S.alvo, S.mods[S.tipo].ang, S.foco);
    const gl = S.gl, esc = S.tipo === 'kart' ? 100 : 1;
    gl.viewport(0, 0, W, H); gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const vpMat = mul(persp(0.62, W / H, 0.1 * esc, 80 * esc), olhar(eye, cam.t));
    desenhar(gl, m, vpMat);
    if (S.dica && S.tipo === 'f1') desenharBrilhos(gl, vpMat, S.mods[S.tipo].ang && S.mods[S.tipo].ang.br);
    S.raf = requestAnimationFrame(quadro);
  }

  function iniciar() {
    if (S.raf || !modeloAtual()) return;
    S.ultimo = 0; S.raf = requestAnimationFrame(quadro);
  }

  // ---------- interface com o jogo ----------
  // Marcação do espaço do carro dentro do cartão de acerto (vazia se o aparelho não tem WebGL2).
  function html(tipo) {
    if (!suporta() || !MODELOS[tipo]) return '';
    return `<div class="carro3d" data-carro3d role="img" aria-label="Carro em 3D: a câmera segue o ajuste que você mexe"><span class="carro3d-carregando">Carregando o carro…</span></div>`;
  }
  function mostrar(host) {
    host.querySelector('.carro3d-carregando')?.remove();
    host.prepend(S.canvas);
    iniciar();
  }
  // Depois de desenhar a tela: coloca o canvas no espaço e liga o carro ao acerto atual.
  function ligar(raiz, setup, cor, tipo) {
    const host = raiz.querySelector('[data-carro3d]');
    if (!host) { S.host = null; return; }
    if (!suporta() || !MODELOS[tipo || 'f1']) return;
    tipo = tipo || 'f1';
    if (tipo !== S.tipo) { S.tipo = tipo; S.cam = null; S.foco = 'geral'; S.alvo = {}; S.arrasto = 0; }
    S.host = host;
    const corNova = cor && cor !== S.cor;
    if (cor) S.cor = cor;
    if (setup) S.alvo = { ...S.alvo, ...def().alvo(setup) };
    if (!S.cam) { const g = def().focos.geral; S.cam = { yaw: g.yaw, pitch: g.pitch, dist: g.dist, t: g.t.slice() }; }
    const ent = S.mods[tipo] || (S.mods[tipo] = { modelo: null, carregando: false, ang: null });
    if (ent.modelo) { if (corNova) def().cores(ent.modelo, S.cor); mostrar(host); return; }
    if (ent.carregando) return;
    ent.carregando = true;
    carregarModelo(S.gl, def()).then((m) => {
      ent.modelo = m; ent.carregando = false; def().pintar(m, S.cor); ent.ang = def().iniciarAng(S.alvo);
      if (S.host && S.host.isConnected && S.tipo === tipo) mostrar(S.host);
    }).catch(() => { S.erro = true; ent.carregando = false; if (S.host) S.host.remove(); });
  }
  // Foco da câmera: a peça do knob mexido; sem foco próprio, volta à visão geral.
  function foco(chave) {
    clearTimeout(S.volta);
    S.foco = def().focos[chave] ? chave : 'geral';
    S.arrasto = 0;
  }
  // Depois de soltar o knob, a câmera espera um pouco e volta a mostrar o carro inteiro.
  function soltar() {
    clearTimeout(S.volta);
    S.volta = setTimeout(() => { S.foco = 'geral'; S.arrasto = 0; }, 2600);
  }
  // Prévia ao vivo, enquanto o knob ainda está sendo arrastado.
  function previa(chave, valor) { if (chave in S.alvo && Number.isFinite(valor)) S.alvo[chave] = valor; }
  function definir(setup) { if (setup) S.alvo = { ...S.alvo, ...def().alvo(setup) }; }

  const api = { html, ligar, foco, soltar, previa, definir, modoDica: (v) => { S.dica = !!v; }, temFoco: (tipo, chave) => !!(MODELOS[tipo] && MODELOS[tipo].focos[chave]) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BoxCarro3D = api;
})(typeof window !== 'undefined' ? window : globalThis);
