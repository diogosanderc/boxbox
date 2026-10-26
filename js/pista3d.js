// Pista em 3D: mostra o traçado da pista (asfalto, linhas, zebras, linha de largada e um carro de referência) no cartão
// "Ver pista". Jeddah usa o modelo CC BY 4.0 "Yeddah F1 Circuit" (luis.adrian.villagrana); as outras pistas são desenhadas
// aqui a partir da ficha de cada uma (extensão, retas, curvas lentas/médias/rápidas, grampos, sentido). O traçado das pistas
// de kart vem dos pontos de data.js; os dos monopostos são aproximados (não são o desenho real do circuito).
(function (root) {
  'use strict';

  // Jeddah: traçado extraído do modelo CC BY 4.0 "Yeddah F1 Circuit" (luis.adrian.villagrana): linha central do asfalto, 200 pontos [x, z].
  const JEDDAH = [[-787.5,-375.6],[-787.4,-359.8],[-783.6,-342.2],[-777.1,-324.3],[-769.0,-307.1],[-760.0,-290.3],[-750.3,-273.8],[-739.7,-257.7],[-728.2,-242.1],[-715.5,-227.4],[-701.7,-213.7],[-687.1,-201.0],[-671.7,-189.3],[-655.7,-178.8],[-639.1,-169.0],[-622.3,-160.0],[-605.3,-151.5],[-588.0,-143.5],[-570.6,-136.0],[-552.8,-129.3],[-534.7,-123.5],[-516.1,-118.7],[-497.1,-115.2],[-477.8,-113.1],[-458.2,-112.2],[-438.3,-112.2],[-418.4,-113.1],[-398.4,-114.1],[-378.5,-115.1],[-358.7,-115.3],[-339.3,-114.0],[-320.4,-110.9],[-302.6,-105.4],[-286.4,-97.2],[-271.5,-86.6],[-257.1,-74.8],[-242.8,-62.9],[-228.2,-51.8],[-213.0,-41.9],[-197.0,-34.0],[-179.4,-28.0],[-160.9,-23.5],[-142.1,-19.6],[-123.5,-15.4],[-105.1,-10.3],[-87.3,-4.2],[-69.8,3.4],[-53.0,12.3],[-36.6,22.5],[-20.7,33.6],[-5.0,45.4],[10.5,57.5],[26.1,69.5],[41.9,81.0],[58.1,91.5],[74.9,100.6],[92.1,108.6],[109.7,115.8],[127.5,122.6],[145.3,129.3],[162.9,136.2],[180.4,143.7],[197.6,151.9],[214.4,160.8],[231.0,170.4],[247.5,180.3],[263.9,190.2],[280.5,199.9],[297.0,209.5],[313.8,218.5],[331.1,226.5],[348.9,232.8],[366.8,236.8],[384.4,237.4],[401.8,235.3],[419.4,231.2],[437.2,226.6],[455.0,222.0],[472.8,217.7],[490.9,214.7],[509.8,213.4],[529.3,213.6],[549.2,214.6],[569.1,215.5],[589.0,216.4],[608.6,217.9],[627.9,220.4],[646.7,224.2],[665.0,229.7],[682.6,236.9],[699.6,245.5],[716.2,255.1],[732.7,264.8],[749.3,274.4],[766.2,283.0],[783.5,289.6],[800.2,292.3],[814.9,290.5],[826.4,284.6],[833.0,276.6],[834.5,266.6],[830.5,255.7],[821.3,244.5],[807.9,234.6],[791.6,226.7],[773.6,220.6],[755.4,214.8],[737.2,209.2],[719.0,203.5],[700.8,197.9],[682.6,192.2],[664.3,186.6],[646.0,181.2],[627.5,176.2],[608.9,171.6],[590.0,167.4],[570.9,164.0],[551.5,161.3],[531.9,158.9],[512.3,156.7],[492.6,155.2],[473.2,155.2],[454.5,157.2],[436.2,160.7],[418.0,164.6],[399.8,168.6],[381.7,172.2],[363.8,174.7],[345.8,175.3],[327.8,172.3],[310.7,165.6],[295.2,156.3],[280.0,145.9],[265.0,135.1],[250.0,124.3],[234.8,114.3],[218.7,106.0],[201.5,100.7],[182.6,97.6],[163.6,94.9],[144.8,91.6],[126.8,87.0],[110.5,80.0],[96.3,70.6],[82.4,59.4],[68.9,47.5],[55.4,35.5],[41.7,24.1],[27.4,13.8],[11.6,4.9],[-5.7,-2.6],[-23.2,-10.0],[-40.6,-17.5],[-58.1,-25.0],[-75.9,-31.7],[-94.0,-37.5],[-112.5,-42.4],[-131.5,-46.2],[-150.1,-50.8],[-165.5,-56.8],[-178.7,-64.5],[-191.3,-73.4],[-203.4,-83.6],[-215.0,-95.0],[-225.9,-108.0],[-237.0,-120.5],[-251.2,-132.1],[-267.4,-142.4],[-283.7,-152.6],[-300.0,-162.9],[-316.3,-173.1],[-332.7,-183.2],[-349.0,-193.4],[-365.4,-203.6],[-381.7,-213.8],[-398.1,-223.9],[-414.4,-234.2],[-430.7,-244.4],[-447.0,-254.7],[-463.4,-264.8],[-479.8,-274.7],[-496.3,-284.4],[-513.0,-293.8],[-529.7,-303.0],[-546.6,-312.0],[-563.6,-320.6],[-580.6,-329.1],[-597.7,-337.6],[-614.7,-346.0],[-631.8,-354.3],[-648.9,-362.7],[-666.0,-371.0],[-683.1,-379.3],[-700.2,-387.7],[-717.5,-395.6],[-735.0,-401.5],[-751.5,-404.1],[-765.5,-402.6],[-776.4,-397.3],[-783.7,-388.3]];

  // ---------- utilidades ----------
  const hashTxt = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function rng(semente) {
    let a = semente >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const entre = (r, a, b) => a + (b - a) * r();
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- traçado: pontos [x, z] de uma curva fechada (em metros) ----------
  // Pistas de kart: pontos do mapa (data.js), suavizados com Catmull-Rom e escalados para a extensão real.
  function deTracado(pts, extensao) {
    const n = pts.length, saida = [];
    const cr = (p0, p1, p2, p3, t) => {
      const t2 = t * t, t3 = t2 * t;
      return [0, 1].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
    };
    for (let i = 0; i < n; i++) for (let s = 0; s < 8; s++) saida.push(cr(pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n], s / 8));
    const comp = perimetro(saida), k = (extensao || comp) / comp;
    return saida.map((p) => [p[0] * k, p[1] * k]);
  }
  function perimetro(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; }

  // Monopostos: monta o circuito andando como uma tartaruga (reta, curva, reta...), fecha o laço e confere se não se cruza.
  const CURVAS = {
    grampo: { ang: [150, 175], raio: [24, 34] },
    lenta: { ang: [62, 105], raio: [40, 75] },
    media: { ang: [35, 75], raio: [95, 170] },
    rapida: { ang: [14, 40], raio: [230, 460] },
  };
  function montar(pista, tentativa) {
    const r = rng(hashTxt(pista.id) + tentativa * 7919);
    const sinal = pista.sentido === 'horário' ? -1 : 1;
    const L = pista.extensao || 4500, retas = (pista.retas || [800]).slice();
    const c = pista.curvas || { lentas: 5, medias: 5, rapidas: 4 };
    const hairpins = Math.min(pista.grampos || 0, c.lentas);
    const curvas = [];
    const nova = (tipo, grupo) => { const d = CURVAS[tipo]; curvas.push({ grupo, ang: entre(r, d.ang[0], d.ang[1]), raio: entre(r, d.raio[0], d.raio[1]), s: 1 }); };
    for (let i = 0; i < hairpins; i++) nova('grampo', 'a');
    for (let i = 0; i < c.lentas - hairpins; i++) nova('lenta', 'a');
    for (let i = 0; i < c.medias; i++) nova('media', 'b');
    for (let i = 0; i < c.rapidas; i++) nova('rapida', 'c');
    // ordem: grupos em blocos de 1 a 3 curvas seguidas (varrida de rápidas, sequência de lentas...)
    const grupos = { a: curvas.filter((q) => q.grupo === 'a'), b: curvas.filter((q) => q.grupo === 'b'), c: curvas.filter((q) => q.grupo === 'c') };
    const seq = [];
    while (grupos.a.length + grupos.b.length + grupos.c.length) {
      const vivos = ['a', 'b', 'c'].filter((g) => grupos[g].length);
      const g = vivos[Math.floor(r() * vivos.length)];
      const n = Math.min(grupos[g].length, 1 + Math.floor(r() * 3));
      for (let i = 0; i < n; i++) seq.push(grupos[g].splice(Math.floor(r() * grupos[g].length), 1)[0]);
    }
    const n = seq.length;
    // sentido: a maioria das curvas vira para o lado do circuito; algumas (chicanes) para o outro, e a soma fecha 360°
    for (const q of seq) q.s = q.raio < 40 || r() > 0.3 ? 1 : -1;
    const soma = () => seq.reduce((a, q) => a + q.s * q.ang, 0);
    while (soma() < 300) { const o = seq.filter((q) => q.s < 0).sort((a, b) => a.ang - b.ang)[0]; if (!o) break; o.s = 1; }
    const total = soma(), f = total > 0 ? 360 / total : 1;
    for (const q of seq) q.ang *= f;
    // retas: a primeira fica antes da primeira curva (reta dos boxes); as outras, espalhadas
    const lacuna = new Array(n + 1).fill(0);
    retas.forEach((m, k) => { lacuna[k === 0 ? 0 : 1 + Math.floor(((k + r() * 0.8) * n) / retas.length) % n] += m; });
    const somaRetas = retas.reduce((a, b) => a + b, 0);
    let arco = seq.reduce((a, q) => a + q.raio * (q.ang * Math.PI / 180), 0);
    const disponivel = Math.max(L * 0.1, L - somaRetas);
    if (arco > disponivel * 0.85) { const k = (disponivel * 0.85) / arco; seq.forEach((q) => { q.raio *= k; }); arco *= k; }
    const livre = Math.max(0, L - somaRetas - arco);
    const pesos = lacuna.map(() => 0.3 + r() * 1.2), ps = pesos.reduce((a, b) => a + b, 0);
    const g = pesos.map((p) => (livre * p) / ps);
    const MIN = 12;
    const percurso = () => {
      let x = 0, y = 0, th = r.th0 || 0; const pts = [[x, y]], dirs = [];
      const reta = (len, i) => { const passos = Math.max(1, Math.ceil(len / 25)); dirs.push({ i, u: [Math.cos(th), Math.sin(th)] }); for (let k = 0; k < passos; k++) { x += Math.cos(th) * len / passos; y += Math.sin(th) * len / passos; pts.push([x, y]); } };
      for (let i = 0; i <= n; i++) {
        reta(Math.max(MIN, g[i] + lacuna[i]), i);
        if (i < n) {
          const q = seq[i], ang = q.s * sinal * q.ang * Math.PI / 180, passos = Math.max(2, Math.ceil(q.ang / 6));
          for (let k = 0; k < passos; k++) {
            const d = ang / passos, m = th + d / 2, corda = 2 * q.raio * Math.sin(Math.abs(d) / 2);
            x += Math.cos(m) * corda; y += Math.sin(m) * corda; th += d; pts.push([x, y]);
          }
        }
      }
      return { pts, dirs, fim: [x, y] };
    };
    // fecha o laço mexendo no tamanho das retas (solução de menor norma, algumas iterações)
    let res;
    for (let it = 0; it < 40; it++) {
      res = percurso();
      const e = res.fim;
      if (Math.hypot(e[0], e[1]) < 3) break;
      const A = res.dirs.reduce((m, d) => [m[0] + d.u[0] * d.u[0], m[1] + d.u[0] * d.u[1], m[3] + d.u[1] * d.u[1]], [0, 0, 0, 0]);
      const det = A[0] * A[3] - A[1] * A[1];
      if (Math.abs(det) < 1e-6) break;
      const lx = (-e[0] * A[3] + e[1] * A[1]) / det, ly = (-e[1] * A[0] + e[0] * A[1]) / det;
      for (const d of res.dirs) g[d.i] = Math.max(0, g[d.i] + 0.8 * (lx * d.u[0] + ly * d.u[1]) - 0);
    }
    const pts = res.pts.slice(0, -1), e = res.fim, N = pts.length;
    // resto do erro de fechamento distribuído ao longo do percurso
    const comp = pts.map((_, i) => i / N);
    const fechado = pts.map((p, i) => [p[0] - e[0] * comp[i], p[1] - e[1] * comp[i]]);
    const fim = fechado.map((p) => [p[0], -p[1]]), razao = perimetro(fim) / L, k = 1 / Math.max(razao, 0.01);
    return { pts: fim.map((p) => [p[0] * k, p[1] * k]), razao };
  }

  // O traçado não pode se cruzar nem passar perto demais de si mesmo.
  function cruza(a, b, c, d) {
    const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  }
  function limpo(pts, folga) {
    const N = pts.length, sep = Math.max(6, Math.round(N / 18));
    for (let i = 0; i < N; i++) for (let j = i + 2; j < N; j++) {
      if (i === 0 && j === N - 1) continue;
      if (cruza(pts[i], pts[(i + 1) % N], pts[j], pts[(j + 1) % N])) return false;
    }
    for (let i = 0; i < N; i++) for (let j = i + sep; j < N; j++) {
      if (N - (j - i) < sep) continue;
      if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < folga) return false;
    }
    return true;
  }
  const cacheTracado = new Map();
  function tracado(pista) {
    if (cacheTracado.has(pista.id)) return cacheTracado.get(pista.id);
    let pts;
    if (pista.id === 'jeddah') pts = JEDDAH.map((q) => [q[0] * (pista.extensao || 6174) / perimetro(JEDDAH), q[1] * (pista.extensao || 6174) / perimetro(JEDDAH)]);
    else if (pista.tracado) pts = deTracado(pista.tracado, pista.extensao || 1000);
    else {
      // procura (por tentativas) um laço que feche sem esticar muito e sem se cruzar; senão, o menos ruim
      let melhor = null, folga = 55;
      for (let t = 0; t < 500 && !pts; t++) {
        const { pts: p, razao } = montar(pista, t);
        if (!p.every((q) => isFinite(q[0]) && isFinite(q[1]))) continue;
        const ok = limpo(p, folga), nota = (ok ? 0 : 1) + Math.abs(1 - Math.min(razao, 1.5));
        if (!melhor || nota < melhor.nota) melhor = { p, nota };
        if (ok && razao > 0.88 && razao < 1.12) pts = p;
        if (t === 150) folga = 38;
        if (t === 300) folga = 22;
      }
      pts = pts || melhor.p;
    }
    cacheTracado.set(pista.id, pts);
    return pts;
  }

  // ---------- malha ----------
  const COR = { asfalto: [0.20, 0.215, 0.25], linha: [0.93, 0.93, 0.93], zebraV: [0.82, 0.16, 0.16], zebraB: [0.95, 0.95, 0.95], chao: [0.16, 0.30, 0.20], grade: [0.10, 0.10, 0.12], preto: [0.05, 0.05, 0.06] };
  function nova() { return { p: [], n: [], c: [], i: [] }; }
  function quad(m, a, b, c, d, cor, nrm = [0, 1, 0]) {
    const o = m.p.length / 3;
    for (const v of [a, b, c, d]) { m.p.push(v[0], v[1], v[2]); m.n.push(nrm[0], nrm[1], nrm[2]); m.c.push(cor[0], cor[1], cor[2]); }
    m.i.push(o, o + 2, o + 1, o, o + 3, o + 2);
  }
  // Menor distância entre trechos que não são vizinhos: limita a largura desenhada onde o circuito passa perto de si mesmo.
  function folgaMinima(P) {
    const N = P.length, sep = Math.max(6, Math.round(N / 18)); let m = 1e9;
    for (let i = 0; i < N; i++) for (let j = i + sep; j < N; j++) { if (N - (j - i) < sep) continue; m = Math.min(m, Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1])); }
    return m;
  }
  function malhaPista(pista) {
    const P = tracado(pista), N = P.length, m = nova();
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const q of P) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, diag = Math.hypot(x1 - x0, z1 - z0);
    // eixo maior do circuito (PCA): a câmera começa de lado e balança em vez de girar quando o desenho é comprido
    let sxx = 0, szz = 0, sxz = 0;
    for (const q of P) { const a = q[0] - cx, b = q[1] - cz; sxx += a * a; szz += b * b; sxz += a * b; }
    const teta = 0.5 * Math.atan2(2 * sxz, sxx - szz), tr = sxx + szz, dt = Math.sqrt(Math.max(0, (sxx - szz) * (sxx - szz) / 4 + sxz * sxz));
    const maior = Math.sqrt(tr / 2 + dt), menor = Math.sqrt(Math.max(1e-6, tr / 2 - dt));
    const proj = (u) => { let mn = 1e9, mx = -1e9; for (const q of P) { const v = (q[0] - cx) * u[0] + (q[1] - cz) * u[1]; mn = Math.min(mn, v); mx = Math.max(mx, v); } return mx - mn; };
    const ext = { a: proj([Math.cos(teta), Math.sin(teta)]), b: proj([-Math.sin(teta), Math.cos(teta)]) };
    const larg = Math.min(Math.max(pista.largura || 10, diag * 0.018), folgaMinima(P) * 0.7), hw = larg / 2, e = diag * 0.0006;
    const pts = P.map((q) => [q[0] - cx, q[1] - cz]);
    // tangentes e normais à esquerda
    const tg = pts.map((_, i) => { const a = pts[(i + N - 1) % N], b = pts[(i + 1) % N], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; });
    const nm = tg.map((t) => [-t[1], t[0]]);
    const lado = (i, k, y) => [pts[i][0] + nm[i][0] * k, y, pts[i][1] + nm[i][1] * k];
    // curvatura com sinal (para zebras do lado de dentro)
    const curv = tg.map((t, i) => { const u = tg[(i + 1) % N], c = t[0] * u[1] - t[1] * u[0]; const ds = Math.hypot(pts[(i + 1) % N][0] - pts[i][0], pts[(i + 1) % N][1] - pts[i][1]) || 1; return c / ds; });
    const lis = curv.map((_, i) => { let s = 0; for (let k = -2; k <= 2; k++) s += curv[(i + k + N) % N]; return s / 5; });
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      quad(m, lado(i, hw, 0), lado(j, hw, 0), lado(j, -hw, 0), lado(i, -hw, 0), COR.asfalto);
      for (const s of [1, -1]) {
        const a = hw - larg * 0.07, b = hw;
        quad(m, lado(i, s * a, e), lado(j, s * a, e), lado(j, s * b, e), lado(i, s * b, e), COR.linha);
      }
      // zebras na curva fechada, do lado de dentro (e um pouco do de fora, ao longo da saída)
      if (Math.abs(lis[i]) > 1 / 320) {
        const s = lis[i] > 0 ? 1 : -1, cor = Math.floor(i / 2) % 2 ? COR.zebraV : COR.zebraB;
        quad(m, lado(i, s * hw, e * 2), lado(j, s * hw, e * 2), lado(j, s * (hw + larg * 0.26), e * 2), lado(i, s * (hw + larg * 0.26), e * 2), cor);
      }
    }
    // linha de largada: tabuleiro de 2 x 8 casas no ponto 3
    const k0 = 3 % N, k1 = (k0 + 1) % N;
    for (let r = 0; r < 2; r++) for (let q = 0; q < 8; q++) {
      const a = -hw + (q * 2 * hw) / 8, b = a + (2 * hw) / 8, t0 = r * 0.5, t1 = t0 + 0.5;
      const ponto = (k, off, t) => [pts[k][0] + nm[k][0] * off, 0, pts[k][1] + nm[k][1] * off].map((v, d) => (d === 1 ? e * 3 : v + tg[k][d === 0 ? 0 : 1] * 0 + (d === 0 ? tg[k][0] : tg[k][1]) * t * larg * 0.4));
      quad(m, ponto(k0, a, t0), ponto(k0, b, t0), ponto(k0, b, t1), ponto(k0, a, t1), (q + r) % 2 ? COR.preto : COR.linha);
    }
    // chão
    const R = diag * 2.4;
    quad(m, [-R, -e * 4, -R], [-R, -e * 4, R], [R, -e * 4, R], [R, -e * 4, -R], COR.chao);
    return { m, pts, tg, nm, diag, larg, N, teta, ext, alongado: maior / menor > 1.7 };
  }

  // ---------- WebGL ----------
  const VS = `#version 300 es
  in vec3 p; in vec3 n; in vec3 c; uniform mat4 mvp; uniform vec3 off; out vec3 vc; out vec3 vn;
  void main(){ vc = c; vn = n; gl_Position = mvp*vec4(p+off,1.); }`;
  const FS = `#version 300 es
  precision mediump float; in vec3 vc; in vec3 vn; out vec4 o;
  void main(){ vec3 N = normalize(vn); float d = .55 + .35*max(dot(N,normalize(vec3(.4,.9,.3))),0.) + .10*max(dot(N,normalize(vec3(-.6,.3,-.5))),0.); o = vec4(vc*d,1.); }`;
  const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  function mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; }
  function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = (2 * f * n) / (n - f); return m; }
  function olhar(eye, t) {
    let z = [eye[0] - t[0], eye[1] - t[1], eye[2] - t[2]]; const l = Math.hypot(...z); z = z.map((v) => v / l);
    let x = [z[2], 0, -z[0]]; const lx = Math.hypot(...x) || 1; x = x.map((v) => v / lx);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]), -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]), -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]), 1]);
  }

  const S = { canvas: null, gl: null, prog: null, loc: null, host: null, id: null, cena: null, cache: new Map(), raf: 0, ultimo: 0, tempo: 0, balanco: 0, yaw: 0.5, pitch: 0.95, zoom: 1, arrastando: false, ux: 0, uy: 0, erro: false };
  const reduzido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function suporta() {
    if (typeof document === 'undefined') return false;
    if (S.erro) return false;
    if (S.gl) return true;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl2', { antialias: true, alpha: true });
      if (!gl) return false;
      const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      S.loc = { p: gl.getAttribLocation(prog, 'p'), n: gl.getAttribLocation(prog, 'n'), c: gl.getAttribLocation(prog, 'c'), mvp: gl.getUniformLocation(prog, 'mvp'), off: gl.getUniformLocation(prog, 'off') };
      S.prog = prog; S.canvas = c; S.gl = gl; c.className = 'pista3d-tela'; c.setAttribute('aria-hidden', 'true');
      c.addEventListener('pointerdown', (e) => { S.arrastando = true; S.ux = e.clientX; S.uy = e.clientY; try { c.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } });
      c.addEventListener('pointermove', (e) => {
        if (!S.arrastando) return;
        S.yaw -= (e.clientX - S.ux) * 0.01; S.pitch = limitar(S.pitch + (e.clientY - S.uy) * 0.006, 0.35, 1.45); S.ux = e.clientX; S.uy = e.clientY;
      });
      const solta = () => { S.arrastando = false; };
      c.addEventListener('pointerup', solta); c.addEventListener('pointercancel', solta);
      return true;
    } catch (e) { S.erro = true; return false; }
  }

  function enviar(gl, m) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    for (const [arr, l] of [[m.p, S.loc.p], [m.n, S.loc.n], [m.c, S.loc.c]]) {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0);
    }
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(m.i), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, n: m.i.length };
  }

  function cubo(tam, cor) {
    const m = nova(), h = tam / 2, a = [-h, 0, -h], b = [h, 0, -h], c = [h, 0, h], d = [-h, 0, h], up = (v) => [v[0], tam, v[2]];
    quad(m, up(a), up(d), up(c), up(b), cor);
    for (const [p, q] of [[a, b], [b, c], [c, d], [d, a]]) { const nx = (p[2] + q[2]) / 2 === 0 ? 0 : 0; void nx; quad(m, p, q, up(q), up(p), cor, [(p[0] + q[0]) / 2 / h, 0, (p[2] + q[2]) / 2 / h]); }
    return m;
  }

  function preparar(pista) {
    const gl = S.gl;
    const mp = malhaPista(pista);
    const marca = enviar(gl, cubo(mp.larg * 0.9, [0.95, 0.75, 0.1]));
    const cena = { geo: enviar(gl, mp.m), diag: mp.diag, pts: mp.pts, marca, larg: mp.larg, N: mp.N, teta: mp.teta, ext: mp.ext, alongado: mp.alongado };
    S.cache.set(pista.id, cena);
    return Promise.resolve(cena);
  }

  function quadro(agora) {
    S.raf = 0;
    const host = S.host, cena = S.cena;
    if (!host || !host.isConnected || !cena) return;
    if (typeof document !== 'undefined' && document.hidden) { S.ultimo = 0; S.raf = requestAnimationFrame(quadro); return; }
    const dt = Math.min(0.05, S.ultimo ? (agora - S.ultimo) / 1000 : 0.016); S.ultimo = agora; S.tempo += dt;
    const c = S.canvas, r = host.getBoundingClientRect(), d = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    const W = Math.max(2, Math.round(r.width * d)), H = Math.max(2, Math.round(r.height * d));
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    if (!S.arrastando && !reduzido()) { if (cena.alongado) S.balanco += dt * 0.35; else S.yaw += dt * 0.12; }
    const yawCena = cena.alongado ? -cena.teta + Math.sin(S.balanco) * 0.3 + S.yaw : S.yaw;
    const dist = Math.max(cena.ext.a * 1.0, cena.ext.b * 1.25) * (cena.alongado ? 1.02 : 1.2) * S.zoom, pit = S.pitch;
    const eye = [Math.sin(yawCena) * Math.cos(pit) * dist, Math.sin(pit) * dist, Math.cos(yawCena) * Math.cos(pit) * dist];
    const gl = S.gl, mvp = mul(persp(0.62, W / H, cena.diag * 0.02, cena.diag * 6), olhar(eye, [0, 0, 0]));
    gl.viewport(0, 0, W, H); gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(S.prog); gl.uniformMatrix4fv(S.loc.mvp, false, mvp); gl.uniform3f(S.loc.off, 0, 0, 0);
    gl.bindVertexArray(cena.geo.vao); gl.drawElements(gl.TRIANGLES, cena.geo.n, gl.UNSIGNED_INT, 0);
    if (cena.pts) {
      // carro de referência dando voltas (uma volta em ~14 s)
      const f = (S.tempo / 14) % 1, k = Math.floor(f * cena.N) % cena.N, p = cena.pts[k];
      gl.uniform3f(S.loc.off, p[0], cena.larg * 0.02, p[1]);
      gl.bindVertexArray(cena.marca.vao); gl.drawElements(gl.TRIANGLES, cena.marca.n, gl.UNSIGNED_INT, 0);
    }
    S.raf = requestAnimationFrame(quadro);
  }

  // ---------- interface com o jogo ----------
  function html(pista) {
    if (!pista || !suporta()) return '';
    return `<div class="pista3d" data-pista3d="${pista.id}" role="img" aria-label="Pista em 3D: arraste para girar"><span class="pista3d-carregando">Carregando a pista…</span></div>`;
  }
  function mostrar(host) {
    host.querySelector('.pista3d-carregando')?.remove();
    host.prepend(S.canvas);
    if (!S.raf) { S.ultimo = 0; S.raf = requestAnimationFrame(quadro); }
  }
  // Depois de desenhar a tela: coloca o canvas no espaço da pista.
  function ligar(raiz, pista) {
    const host = raiz.querySelector('[data-pista3d]');
    if (!host) { S.host = null; return; }
    if (!pista || !suporta()) return;
    S.host = host;
    if (S.id !== pista.id) { S.id = pista.id; S.cena = null; S.yaw = 0; S.balanco = 0; S.pitch = 0.95; S.zoom = 1; }
    const pronta = S.cache.get(pista.id);
    if (pronta) { S.cena = pronta; mostrar(host); return; }
    if (S.carregando === pista.id) return;
    S.carregando = pista.id;
    preparar(pista).then((cena) => {
      S.carregando = null;
      if (S.id === pista.id) S.cena = cena;
      if (S.host && S.host.isConnected && S.id === pista.id) mostrar(S.host);
    }).catch(() => { S.carregando = null; if (S.host) S.host.remove(); });
  }

  const api = { html, ligar, tracado, perimetro, limpo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BoxPista3D = api;
})(typeof window !== 'undefined' ? window : globalThis);
