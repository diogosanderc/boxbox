// Física "escondida" do kart: acerto ideal por pista e condição, efeito do desequilíbrio no ritmo,
// clima e o que o piloto e o mecânico dizem. O jogador nunca vê o acerto ideal nem o número de desequilíbrio.
(function (root) {
  'use strict';

  // ---------- modelos de carro ----------
  // Cada categoria tem os seus ajustes, o seu acerto ideal escondido e o que o piloto sente.
  // usarCategoria() troca o modelo em uso; as funções abaixo sempre usam o modelo atual (M).
  const AJUSTES_KART = {
    pressao: { nome: 'Pressão dos pneus', tipo: 'numero', min: 9, max: 20, passo: 0.5, unidade: 'psi', padrao: 12 },
    eixo: { nome: 'Eixo traseiro', tipo: 'opcoes', opcoes: ['Mole', 'Médio', 'Duro'], padrao: 1 },
    bitolaTraseira: { nome: 'Bitola traseira', tipo: 'opcoes', opcoes: ['Estreita', 'Média', 'Larga'], padrao: 1 },
    bitola: { nome: 'Bitola dianteira', tipo: 'opcoes', opcoes: ['Estreita', 'Média', 'Larga'], padrao: 1 },
    alturaBanco: { nome: 'Altura do banco', tipo: 'opcoes', opcoes: ['Baixo', 'Médio', 'Alto'], padrao: 1 },
    coroa: { nome: 'Relação (coroa)', tipo: 'numero', min: 76, max: 90, passo: 1, unidade: 'dentes', padrao: 82 },
    carburacao: { nome: 'Carburação', tipo: 'numero', min: -3, max: 3, passo: 1, unidade: '', padrao: 0, rotulo: (v) => (v === 0 ? 'Padrão' : v < 0 ? `${-v} volta(s) mais pobre` : `${v} volta(s) mais rica`) },
    caster: { nome: 'Caster', tipo: 'numero', min: 8, max: 16, passo: 1, unidade: '°', padrao: 12 },
  };
  const AJUSTES_F4 = {
    asaDianteira: { nome: 'Asa dianteira', tipo: 'numero', min: 1, max: 9, passo: 1, unidade: '', padrao: 5 },
    asaTraseira: { nome: 'Asa traseira', tipo: 'numero', min: 1, max: 9, passo: 1, unidade: '', padrao: 5 },
    suspensao: { nome: 'Suspensão', tipo: 'opcoes', opcoes: ['Macia', 'Média', 'Dura'], padrao: 1 },
    altura: { nome: 'Altura do carro', tipo: 'opcoes', opcoes: ['Baixa', 'Média', 'Alta'], padrao: 1 },
    pressao: { nome: 'Pressão dos pneus', tipo: 'numero', min: 19, max: 27, passo: 0.5, unidade: 'psi', padrao: 23 },
    relacao: { nome: 'Relação do câmbio', tipo: 'opcoes', opcoes: ['Curta', 'Média', 'Longa'], padrao: 1 },
  };

  const limitarK = (x, min, max) => Math.max(min, Math.min(max, x));
  const tipoNum = (pista) => ({ travada: -1, mista: 0, veloz: 1 }[pista.tipo]);

  const MODELOS = {
    kart: {
      id: 'kart', veiculo: 'kart', quemAcerta: 'Mecânico',
      AJUSTES: AJUSTES_KART,
      ORDEM: ['pressao', 'eixo', 'bitolaTraseira', 'bitola', 'alturaBanco', 'coroa', 'carburacao', 'caster'],
      // Quanto cada unidade de erro pesa e a "escala" de tolerância de cada ajuste.
      TOLERANCIA: { pressao: 1.0, eixo: 0.7, bitolaTraseira: 0.7, bitola: 0.8, alturaBanco: 0.8, coroa: 3, carburacao: 1.2, caster: 1.5 },
      PESO: { pressao: 0.25, eixo: 0.3, bitolaTraseira: 0.2, bitola: 0.2, alturaBanco: 0.15, coroa: 0.2, carburacao: 0.2, caster: 0.15 },
      traseira: 'eixo',
      ideal(pista, cond, pneu) {
        const tipo = tipoNum(pista);
        return {
          pressao: limitarK(pneu === 'chuva' ? 18 : 12.5 - (cond.tempPista - 30) / 10, 9, 20),
          // Bitola traseira: larga solta a traseira (calor e borracha pedem mais larga); na chuva abre para transferir peso.
          bitolaTraseira: limitarK(cond.molhado ? 1.8 : 0.85 + (cond.tempPista - 30) / 20 + cond.borracha * 0.3, 0, 2),
          // Banco alto transfere mais peso e dá aderência: pista verde, fria ou molhada pede banco mais alto.
          alturaBanco: limitarK(cond.molhado ? 1.9 : 1.25 - cond.borracha * 0.5 - (cond.tempPista - 30) / 30, 0, 2),
          eixo: limitarK(cond.molhado ? 0.2 : 1 + tipo * 0.4 + (cond.tempPista - 30) / 15 + cond.borracha * 0.4 - 0.2, 0, 2),
          bitola: limitarK(1 - tipo * 0.6 + (cond.molhado ? 0.6 : 0), 0, 2),
          coroa: limitarK(82 - tipo * 3 + pista.altitude / 400 + (cond.molhado ? 2 : 0), 76, 90),
          carburacao: limitarK((20 - cond.tempAr) / 7 - pista.altitude / 500, -3, 3),
          // Caster: mais estabilidade e mordida na frente. Pista veloz, molhada, fria ou verde pede mais;
          // pista travada, quente e emborrachada pede menos (a direção fica leve para as curvas lentas).
          caster: limitarK(12 + tipo * 1.5 + (cond.molhado ? 2 : 0) - (cond.tempPista - 30) / 12 - (cond.borracha - 0.5) * 1.5, 8, 16),
        };
      },
      // Quanto o acerto força o motor (0 = nada): carburação pobre (engripa) e relação curta demais.
      forcaMotor: (e) => Math.max(0, -e.carburacao - 0.8) + Math.max(0, e.coroa - 0.8),
      SINTOMAS: {
        pressao: ['O kart está pesado, os pneus demoram a pegar temperatura.', 'Os pneus superaquecem e o kart escorrega depois de algumas voltas.'],
        eixo: ['O kart está amarrado, pulando no meio das curvas.', 'A traseira está solta, o kart escapa na saída das curvas.'],
        bitolaTraseira: ['O kart arrasta nas curvas, parece que está freando.', 'A traseira patina quando eu acelero na saída.'],
        alturaBanco: ['O kart não transfere peso, fica sem aderência nas curvas lentas.', 'O kart fica alto e instável, quer levantar a roda na entrada.'],
        bitola: ['O kart sai de frente, não quer virar na entrada.', 'A frente morde demais, o kart fica nervoso na entrada de curva.'],
        coroa: ['Falta força na saída das curvas, o kart demora a embalar.', 'O motor passa do giro antes do fim da reta.'],
        carburacao: ['O motor está quente e gritando demais... dá medo de engripar.', 'O motor está afogando, engasga nas retomadas.'],
        caster: ['A frente está sem firmeza: o kart fica nervoso na reta e não morde na entrada.', 'A direção está pesada e o kart demora a virar nas curvas lentas.'],
      },
      DIRECAO: {
        pressao: ['Pressão mais alta', 'Pressão mais baixa'],
        eixo: ['Eixo mais duro', 'Eixo mais mole'],
        bitolaTraseira: ['Bitola traseira mais larga', 'Bitola traseira mais estreita'],
        bitola: ['Bitola mais larga', 'Bitola mais estreita'],
        alturaBanco: ['Banco mais alto', 'Banco mais baixo'],
        coroa: ['Mais dentes na coroa', 'Menos dentes na coroa'],
        carburacao: ['Carburação mais rica', 'Carburação mais pobre'],
        caster: ['Mais caster', 'Menos caster'],
      },
      ONDE: { pressao: 'na pressão', eixo: 'no eixo', bitolaTraseira: 'na bitola traseira', bitola: 'na bitola dianteira', alturaBanco: 'na altura do banco', coroa: 'na relação', carburacao: 'na carburação', caster: 'no caster' },
      // verbo para baixar (erro > 0) e para subir (erro < 0)
      VERBO: {
        pressao: ['baixar', 'subir'], eixo: ['amolecer', 'endurecer'], bitolaTraseira: ['fechar a traseira', 'abrir a traseira'], bitola: ['fechar', 'abrir'],
        alturaBanco: ['baixar o banco', 'subir o banco'],
        coroa: ['tirar dentes da coroa', 'pôr mais dentes na coroa'], carburacao: ['empobrecer', 'enriquecer'],
        caster: ['tirar caster', 'pôr mais caster'],
      },
      descrever(s, AJ) {
        // Acertos antigos do caderno podem não ter os ajustes mais novos.
        return this.ORDEM.filter((k) => k in s).map((k) => {
          const a = AJ[k];
          if (a.tipo === 'opcoes') return a.opcoes[s[k]];
          if (a.rotulo) return `carb. ${s[k] > 0 ? '+' : ''}${s[k]}`;
          return `${s[k]}${a.unidade === 'psi' ? ' psi' : a.unidade === 'dentes' ? 'z' : a.unidade === '°' ? '°' : ''}`;
        }).join(' · ');
      },
    },
    f4: {
      id: 'f4', veiculo: 'carro', quemAcerta: 'Engenheiro',
      AJUSTES: AJUSTES_F4,
      ORDEM: ['asaDianteira', 'asaTraseira', 'suspensao', 'altura', 'pressao', 'relacao'],
      TOLERANCIA: { asaDianteira: 1.5, asaTraseira: 1.5, suspensao: 0.7, altura: 0.7, pressao: 1.0, relacao: 0.7 },
      PESO: { asaDianteira: 0.2, asaTraseira: 0.3, suspensao: 0.2, altura: 0.15, pressao: 0.25, relacao: 0.2 },
      traseira: 'suspensao',
      // Pista veloz pede pouca asa; chuva, ar quente e altitude pedem mais. Zebras altas pedem suspensão macia;
      // chuva e ondulações pedem o carro mais alto; retas longas pedem relação longa.
      ideal(pista, cond, pneu) {
        const tipo = tipoNum(pista);
        const asaT = 5 - 2 * tipo + (cond.molhado ? 2.5 : 0) + (cond.tempAr - 20) / 12 + pista.altitude / 600;
        const ondulada = /ondula|sobe e desce|subidas/i.test(pista.desnivel || '');
        return {
          asaTraseira: limitarK(asaT, 1, 9),
          asaDianteira: limitarK(asaT - 0.5 + (cond.tempPista - 30) / 15, 1, 9),
          suspensao: limitarK(1 + 0.7 * tipo - (pista.zebras === 'altas' ? 0.6 : 0) + (pista.zebras === 'sem' ? 0.3 : 0) - (cond.molhado ? 0.8 : 0) + cond.borracha * 0.3, 0, 2),
          altura: limitarK(1 - 0.6 * tipo + (cond.molhado ? 0.7 : 0) + (ondulada ? 0.4 : 0), 0, 2),
          pressao: limitarK(pneu === 'chuva' ? 25 : 23.5 - (cond.tempPista - 30) / 8, 19, 27),
          relacao: limitarK(1 + 0.7 * tipo - pista.altitude / 1500 - (cond.molhado ? 0.3 : 0), 0, 2),
        };
      },
      forcaMotor: () => 0, // motor lacrado na F4
      SINTOMAS: {
        asaDianteira: ['O carro sai de frente nas curvas rápidas.', 'A frente morde demais e a traseira fica leve na entrada.'],
        asaTraseira: ['A traseira escorrega nas curvas de alta.', 'O carro está pesado na reta, falta velocidade final.'],
        suspensao: ['O carro rola demais e demora a responder nas trocas de direção.', 'O carro pula nas zebras e nas ondulações.'],
        altura: ['O assoalho está batendo no chão.', 'O carro parece flutuar, falta aderência.'],
        pressao: ['Os pneus demoram a pegar temperatura.', 'Os pneus superaquecem e o carro escorrega depois de algumas voltas.'],
        relacao: ['A marcha acaba antes do fim da reta.', 'Falta força na saída das curvas lentas.'],
      },
      DIRECAO: {
        asaDianteira: ['Mais asa dianteira', 'Menos asa dianteira'],
        asaTraseira: ['Mais asa traseira', 'Menos asa traseira'],
        suspensao: ['Suspensão mais dura', 'Suspensão mais macia'],
        altura: ['Carro mais alto', 'Carro mais baixo'],
        pressao: ['Pressão mais alta', 'Pressão mais baixa'],
        relacao: ['Relação mais longa', 'Relação mais curta'],
      },
      ONDE: { asaDianteira: 'na asa dianteira', asaTraseira: 'na asa traseira', suspensao: 'na suspensão', altura: 'na altura', pressao: 'na pressão', relacao: 'na relação' },
      VERBO: {
        asaDianteira: ['tirar asa', 'pôr mais asa'], asaTraseira: ['tirar asa', 'pôr mais asa'], suspensao: ['amaciar', 'endurecer'],
        altura: ['baixar o carro', 'subir o carro'], pressao: ['baixar', 'subir'], relacao: ['encurtar', 'alongar'],
      },
      descrever(s, AJ) {
        return `Asas ${s.asaDianteira}/${s.asaTraseira} · susp. ${AJ.suspensao.opcoes[s.suspensao]} · alt. ${AJ.altura.opcoes[s.altura]} · ${s.pressao} psi · ${AJ.relacao.opcoes[s.relacao]}`;
      },
    },
  };
  // F2 e F1: o mesmo monoposto da F4 com mais coisas para equilibrar. Quanto mais alto, mais complexo o carro.
  const AJUSTES_F2 = {
    ...AJUSTES_F4,
    freio: { nome: 'Balanço de freio', tipo: 'numero', min: 50, max: 62, passo: 1, unidade: '%', padrao: 56 },
    diferencial: { nome: 'Diferencial', tipo: 'opcoes', opcoes: ['Aberto', 'Médio', 'Travado'], padrao: 1 },
    mapa: { nome: 'Mapa do motor', tipo: 'opcoes', opcoes: ['Econômico', 'Equilibrado', 'Potência'], padrao: 1 },
  };
  // F1: o câmbio é fixo na temporada (não muda por pista), então a relação sai e entra o arrefecimento. A pressão tem piso
  // (a Pirelli impõe pressões mínimas) e a cambagem fica na faixa que a Pirelli permite. A inclinação (rake) é nova.
  const { relacao: _semCambio, ...AJUSTES_F2_SEM_CAMBIO } = AJUSTES_F2;
  const AJUSTES_F1 = {
    ...AJUSTES_F2_SEM_CAMBIO,
    relacao: AJUSTES_F4.relacao, // só para ler saves e cadernos antigos; fora da ORDEM
    pressao: { nome: 'Pressão dos pneus', tipo: 'numero', min: 20, max: 29, passo: 0.5, unidade: 'psi', padrao: 25.5 },
    arrefecimento: { nome: 'Arrefecimento', tipo: 'opcoes', opcoes: ['Fechado', 'Médio', 'Aberto'], padrao: 1 },
    rake: { nome: 'Inclinação (rake)', tipo: 'opcoes', opcoes: ['Baixa', 'Média', 'Alta'], padrao: 1 },
    camber: { nome: 'Cambagem dianteira', tipo: 'numero', min: -3.5, max: -2.5, passo: 0.25, unidade: '°', padrao: -3 },
    ers: { nome: 'Uso do ERS', tipo: 'opcoes', opcoes: ['Curvas', 'Equilibrado', 'Retas'], padrao: 1 },
  };
  const maiorReta = (pista) => Math.max(0, ...(pista.retas || [0]));
  // Perfil de energia da pista. Demanda: quanto da volta é acelerador a fundo (retas somadas sobre a extensão). Colheita:
  // quantas freadas fortes por km há para recarregar a bateria (curvas lentas, grampos e, menos, médias). Escassez: quando a
  // demanda passa da colheita (Monza), a energia acaba antes do fim da reta; quando sobra (Mônaco), dá para gastar à vontade.
  function perfilEnergia(pista) {
    if (!pista.extensao || !pista.curvas) {
      const d = limitarK(0.5 + 0.4 * tipoNum(pista), 0, 1);
      return { demanda: d, colheita: 1 - d, escassez: d };
    }
    const reta = (pista.retas || []).reduce((a, b) => a + b, 0);
    const demanda = limitarK((reta / pista.extensao - 0.15) / 0.3, 0, 1);
    const c = pista.curvas;
    const colheita = limitarK(((c.lentas + 1.5 * (pista.grampos || 0) + 0.3 * c.medias) / (pista.extensao / 1000) - 0.7) / 2.5, 0, 1);
    return { demanda, colheita, escassez: limitarK(0.5 + 0.5 * (demanda - colheita), 0, 1) };
  }
  // Freio: mais freadas fortes (grampos) pedem o freio mais à frente; chuva pede mais atrás.
  // Diferencial: pista travada pede travado (tração na saída); veloz e chuva pedem mais aberto.
  const idealF2 = (pista, cond) => ({
    freio: limitarK(55.5 + Math.min(3, pista.grampos || 0) * 0.8 - (cond.molhado ? 2.5 : 0) + (cond.tempPista - 30) / 20, 50, 62),
    diferencial: limitarK(1 - 0.8 * tipoNum(pista) - (cond.molhado ? 0.7 : 0), 0, 2),
    // Mapa do motor: a potência extra só rende onde há muito acelerador a fundo (Monza); em pista cheia de curvas lentas
    // (Mônaco) o mapa forte gasta e esquenta o motor sem render tempo. Calor e chuva pedem entrega mais suave.
    mapa: limitarK(0.25 + 1.6 * perfilEnergia(pista).demanda - (cond.molhado ? 0.5 : 0) - (cond.tempAr > 32 ? 0.3 : 0), 0, 2),
  });
  // F1. Pressão: a Pirelli impõe um piso; pista quente pede pressão inicial menor (o pneu esquenta e sobe, cerca de 1,25 psi
  // por 10 °C), pista fria e chuva pedem mais. Cambagem: fica na faixa permitida (dianteira −3,25° a −2,75°, traseira −2,25° a
  // −1,5°; só a dianteira é ajustável), mais negativa em pista veloz e menos com calor, asfalto abrasivo e chuva. ERS: com energia escassa (Monza) vale
  // concentrar nas retas; com energia sobrando (Mônaco) dá para usar também na saída das curvas. Arrefecimento: altitude, calor
  // e muito acelerador a fundo pedem as aberturas abertas (custa arrasto); fechado demais superaquece o motor.
  // Inclinação (rake): pista veloz pede carro mais plano (menos arrasto).
  // Piso de pressão inicial imposto pela Pirelli: varia por circuito (maior onde a carga no pneu é alta). Estimado pela
  // fração de curvas rápidas, pelo tipo de pista e pelo asfalto: Mônaco ~22 psi, Monza ~25, Silverstone/Spa ~26. Só na F1.
  function pisoPressao(pista) {
    if (!pista || !pista.curvas) return null;
    const c = pista.curvas, total = (c.lentas + c.medias + c.rapidas) || 1;
    const carga = 0.6 * (c.rapidas / total) + 0.2 * ({ veloz: 1, mista: 0.5, travada: 0 }[pista.tipo] || 0) + 0.2 * (pista.asfalto === 'abrasivo' ? 1 : 0.3);
    return Math.round(limitarK(20 + 11 * carga, 20, 28) * 2) / 2;
  }
  const idealF1 = (pista, cond) => {
    const e = perfilEnergia(pista), t = tipoNum(pista);
    const abrasivo = pista.asfalto === 'abrasivo';
    return {
      pressao: limitarK(pisoPressao(pista) + 1.5 - (cond.tempPista - 30) / 8, pisoPressao(pista), 29),
      camber: limitarK(-3 - 0.2 * t + (abrasivo ? 0.2 : 0) + (cond.tempPista - 30) / 80 + (cond.molhado ? 0.2 : 0), -3.5, -2.5),
      ers: limitarK(1 + 1.6 * (e.escassez - 0.5) - (cond.molhado ? 0.4 : 0), 0, 2),
      arrefecimento: limitarK(0.7 + (pista.altitude || 0) / 1400 + (cond.tempAr - 24) / 18 + 0.5 * e.demanda - (cond.molhado ? 0.5 : 0), 0, 2),
      rake: limitarK(1.8 - 1.6 * e.demanda, 0, 2),
    };
  };
  const F4 = MODELOS.f4;
  MODELOS.f2 = {
    ...F4,
    id: 'f2',
    AJUSTES: AJUSTES_F2,
    ORDEM: [...F4.ORDEM, 'freio', 'diferencial', 'mapa'],
    TOLERANCIA: { ...F4.TOLERANCIA, freio: 1.5, diferencial: 0.7, mapa: 0.7 },
    PESO: { ...F4.PESO, freio: 0.2, diferencial: 0.2, mapa: 0.2 },
    ideal(pista, cond, pneu) { return { ...F4.ideal(pista, cond, pneu), ...idealF2(pista, cond) }; },
    SINTOMAS: {
      ...F4.SINTOMAS,
      freio: ['A traseira trava nas freadas fortes e o carro quer rodar.', 'A frente trava nas freadas e o carro passa reto na curva.'],
      diferencial: ['A roda de dentro patina na saída das curvas lentas.', 'O carro não quer virar no meio da curva, empurra de frente.'],
      mapa: ['Falta potência: não consigo atacar nem me defender nas retas.', 'O motor esquenta e gasta demais, vamos pagar por isso no fim da corrida.'],
    },
    DIRECAO: { ...F4.DIRECAO, freio: ['Freio mais para a frente', 'Freio mais para trás'], diferencial: ['Diferencial mais travado', 'Diferencial mais aberto'], mapa: ['Mapa mais potente', 'Mapa mais econômico'] },
    ONDE: { ...F4.ONDE, freio: 'no balanço de freio', diferencial: 'no diferencial', mapa: 'no mapa do motor' },
    VERBO: { ...F4.VERBO, freio: ['passar o freio para trás', 'passar o freio para a frente'], diferencial: ['abrir o diferencial', 'travar o diferencial'], mapa: ['economizar o motor', 'dar mais potência'] },
    descrever(s, AJ) { return `${F4.descrever(s, AJ)} · freio ${s.freio}% · dif. ${AJ.diferencial.opcoes[s.diferencial]} · mapa ${AJ.mapa.opcoes[s.mapa == null ? 1 : s.mapa]}`; },
  };
  const F2 = MODELOS.f2;
  const opt = (AJ, k, s) => AJ[k].opcoes[s[k] == null ? AJ[k].padrao : s[k]];
  const ORDEM_F1 = ['asaDianteira', 'asaTraseira', 'suspensao', 'altura', 'rake', 'pressao', 'arrefecimento', 'freio',
    'diferencial', 'mapa', 'ers', 'camber'];
  MODELOS.f1 = {
    ...F2,
    id: 'f1',
    AJUSTES: AJUSTES_F1,
    ORDEM: ORDEM_F1,
    TOLERANCIA: { ...F2.TOLERANCIA, camber: 0.3, ers: 0.7, arrefecimento: 0.7, rake: 0.7 },
    PESO: { ...F2.PESO, camber: 0.2, ers: 0.2, arrefecimento: 0.2, rake: 0.15 },
    ideal(pista, cond, pneu) { return { ...F2.ideal(pista, cond, pneu), ...idealF1(pista, cond) }; },
    // Fechar demais o arrefecimento superaquece o motor.
    forcaMotor: (e) => Math.max(0, -e.arrefecimento - 0.8),
    motivoForca: 'Superaquecimento',
    SINTOMAS: {
      ...F2.SINTOMAS,
      camber: ['Os pneus da frente gastam por dentro e o carro trava na freada em linha reta.', 'A frente perde aderência nas curvas rápidas, o pneu rola.'],
      ers: ['Falta bateria no fim das retas, os outros me passam no vácuo.', 'Sobra bateria na reta, mas falta tração na saída das curvas.'],
      arrefecimento: ['A temperatura do motor está subindo, preciso abrir mais as saídas de ar.', 'Estamos perdendo velocidade final: as aberturas de ar estão grandes demais.'],
      rake: ['Falta apoio no assoalho: o carro não gruda nas curvas rápidas.', 'Muito arrasto: o carro perde velocidade final nas retas.'],
    },
    DIRECAO: { ...F2.DIRECAO, camber: ['Menos cambagem', 'Mais cambagem'], ers: ['ERS mais para as retas', 'ERS mais para as curvas'],
      arrefecimento: ['Abrir o arrefecimento', 'Fechar o arrefecimento'], rake: ['Mais inclinação (rake)', 'Menos inclinação (rake)'] },
    ONDE: { ...F2.ONDE, camber: 'na cambagem', ers: 'no ERS', arrefecimento: 'no arrefecimento', rake: 'na inclinação (rake)' },
    VERBO: { ...F2.VERBO, camber: ['pôr mais cambagem', 'tirar cambagem'], ers: ['usar mais nas curvas', 'usar mais nas retas'],
      arrefecimento: ['fechar o arrefecimento', 'abrir o arrefecimento'], rake: ['baixar a inclinação', 'subir a inclinação'] },
    descrever(s, AJ) {
      return `Asas ${s.asaDianteira}/${s.asaTraseira} · susp. ${AJ.suspensao.opcoes[s.suspensao]} · alt. ${AJ.altura.opcoes[s.altura]} · rake ${opt(AJ, 'rake', s)} · ${String(s.pressao).replace('.', ',')} psi · arref. ${opt(AJ, 'arrefecimento', s)} · freio ${s.freio}% · dif. ${AJ.diferencial.opcoes[s.diferencial]} · mapa ${AJ.mapa.opcoes[s.mapa == null ? 1 : s.mapa]} · ERS ${AJ.ers.opcoes[s.ers]} · camb. ${String(s.camber).replace('.', ',')}°`;
    },
  };

  let M = MODELOS.kart;
  function usarCategoria(cat) { M = MODELOS[cat] || MODELOS.kart; }
  const categoria = () => M.id;

  const PNEUS_KART = {
    slick: { nome: 'Slick', preco: 1600 },
    medio: { nome: 'Médio', preco: 1500 },
    duro: { nome: 'Duro', preco: 1400 },
    chuva: { nome: 'Chuva', preco: 1400 },
  };

  const limitar = (x, min, max) => Math.max(min, Math.min(max, x));

  function setupPadrao() {
    return Object.fromEntries(M.ORDEM.map((k) => [k, M.AJUSTES[k].padrao]));
  }

  // ---------- clima ----------
  // Gera a previsão e o que realmente vai acontecer. A previsão erra um pouco.
  // Clima de cada etapa, sorteado: temperatura do dia (com dias atípicos de frio ou calorão), quanto a
  // tarde esquenta em relação à manhã, quantas nuvens tem (o sol esquenta o asfalto) e a chuva.
  function gerarClima(pista, campeonato, rnd) {
    const atipico = rnd();
    const onda = atipico < 0.08 ? 5 + rnd() * 5 : atipico < 0.16 ? -(5 + rnd() * 5) : 0; // calorão ou frente fria
    const base = pista.clima + rnd.gauss() * 4.5 + onda;
    const chance = limitar(campeonato.chuva + rnd.gauss() * 0.2, 0.02, 0.85);
    const prevista = (c) => Math.round(limitar(c + rnd.gauss() * 0.12, 0, 0.95) * 20) * 5; // em %, de 5 em 5
    const manhaChove = rnd() < chance * 0.7;
    const tardeChove = rnd() < chance;
    // Da manhã para a tarde o ar esquenta de 1 a 12 graus (chuva à tarde segura a temperatura).
    const amplitude = limitar(6 + rnd.gauss() * 2.5, 1, 12) - (tardeChove ? 2 + rnd() * 3 : 0);
    // Nuvens: 0 é céu limpo, 1 é encoberto. Com mais chance de chuva, mais nuvens.
    const nuvens = Math.round(limitar(rnd() * 0.75 + chance * 0.4 + rnd.gauss() * 0.1, 0, 1) * 100) / 100;
    // Dentro do que é possível no lugar: até 14 graus acima ou abaixo da média da pista.
    const sessao = (tempAr, chove, chancePrev) => ({ tempAr: Math.round(limitar(tempAr, pista.clima - 14, pista.clima + 14)), chance: chancePrev, chove });
    const clima = {
      manha: sessao(base - amplitude * 0.6, manhaChove, prevista(chance * 0.7)),
      tarde: sessao(base + amplitude * 0.4, tardeChove, prevista(chance)),
      nuvens,
    };
    // Se chover à tarde, pode já estar chovendo na classificação ou começar no meio da corrida.
    clima.tarde.inicioChuva = tardeChove ? (rnd() < 0.5 ? 'quali' : 'corrida') : null;
    clima.tarde.voltaChuva = tardeChove && clima.tarde.inicioChuva === 'corrida' ? 3 + Math.floor(rnd() * 10) : null;
    // Da classificação para a corrida o tempo às vezes muda (em cerca de metade das etapas): o ar
    // esquenta ou esfria uns graus e as nuvens podem abrir ou fechar. Nas outras, fica igual.
    if (rnd() < 0.5) {
      const variacao = Math.round(limitar(rnd.gauss() * 3, -6, 6)) || (rnd() < 0.5 ? -2 : 2);
      const ceu = rnd() < 0.5 ? Math.round(limitar(rnd(), 0, 1) * 100) / 100 : nuvens;
      clima.corrida = { tempAr: Math.round(limitar(clima.tarde.tempAr + variacao, pista.clima - 14, pista.clima + 14)), nuvens: ceu };
    }
    return clima;
  }

  // Condição da pista numa sessão. borracha: 0 (pista "verde") a 1 (bem emborrachada).
  // O asfalto passa do ar conforme o sol: de manhã de 2 a 9 graus, à tarde de 4 a 18 (céu limpo).
  function condicao(clima, sessao, molhado) {
    const periodo = sessao === 'treino' ? clima.manha : sessao === 'corrida' && clima.corrida ? clima.corrida : clima.tarde;
    const nuvens = sessao === 'corrida' && clima.corrida ? clima.corrida.nuvens : clima.nuvens;
    const sol = nuvens == null ? null : 1 - nuvens;
    const ganhoSol = sol == null ? (sessao === 'treino' ? 6 : 14) : Math.round(sessao === 'treino' ? 2 + 7 * sol : 4 + 14 * sol);
    return {
      tempAr: periodo.tempAr,
      tempPista: periodo.tempAr + (molhado ? 2 : ganhoSol),
      molhado,
      borracha: molhado ? 0 : { treino: 0.3, quali: 0.6, corrida: 0.8 }[sessao],
    };
  }

  // ---------- acerto ideal (segredo do jogo) ----------
  const acertoIdeal = (pista, cond, pneu) => M.ideal(pista, cond, pneu);

  // Erros normalizados, com sinal (positivo = valor acima do ideal).
  function erros(setup, ideal) {
    return Object.fromEntries(M.ORDEM.map((k) => [k, (setup[k] - ideal[k]) / M.TOLERANCIA[k]]));
  }

  const forcaMotor = (e) => M.forcaMotor(e);

  function desequilibrio(e) {
    return M.ORDEM.reduce((s, k) => s + M.PESO[k] * e[k] * e[k], 0);
  }

  // Telemetria: onde, na volta, o acerto está custando tempo. Divide os segundos perdidos pelo peso de cada
  // ajuste e agrupa por trecho (não diz para que lado mexer: isso continua com o piloto e o mecânico).
  const TRECHO_DO_AJUSTE = {
    pressao: 'Aderência do pneu', eixo: 'Saída de curva', bitolaTraseira: 'Saída de curva', bitola: 'Entrada de curva',
    alturaBanco: 'Meio de curva', coroa: 'Retas', carburacao: 'Retas', asaDianteira: 'Entrada de curva', asaTraseira: 'Curvas rápidas',
    suspensao: 'Zebras e ondulações', altura: 'Curvas rápidas', relacao: 'Retas', freio: 'Freada', diferencial: 'Saída de curva',
    camber: 'Entrada de curva', ers: 'Retas', caster: 'Entrada de curva', mapa: 'Retas',
    arrefecimento: 'Retas', rake: 'Curvas rápidas',
  };
  function telemetria(setup, pista, cond, pneu) {
    const e = erros(setup, acertoIdeal(pista, cond, pneu));
    const d = desequilibrio(e);
    const total = Math.min(3.5, 1.1 * Math.pow(d, 0.9));
    const trechos = {};
    for (const k of M.ORDEM) {
      const nome = TRECHO_DO_AJUSTE[k] || 'Outros';
      trechos[nome] = (trechos[nome] || 0) + (d > 0 ? total * (M.PESO[k] * e[k] * e[k]) / d : 0);
    }
    return { total, trechos: Object.entries(trechos).map(([trecho, perda]) => ({ trecho, perda })).sort((a, b) => b.perda - a.perda) };
  }

  // Efeito do acerto e do pneu numa volta: segundos a mais, irregularidade, risco de erro, desgaste e quebra.
  function efeito(setup, pista, cond, pneu) {
    const e = erros(setup, acertoIdeal(pista, cond, pneu));
    const d = desequilibrio(e);
    const r = {
      tempo: Math.min(3.5, 1.1 * Math.pow(d, 0.9)),
      sigma: 1 + 0.4 * Math.min(d, 3),
      erro: 1 + 0.6 * Math.min(d, 4),
      // Carro equilibrado gasta menos pneu: o desgaste cresce com o desequilíbrio do acerto inteiro (acerto afinado ~0,9;
      // acerto de fábrica ~1,2; carro muito fora ~2) e, em cima disso, com a pressão e a traseira, que castigam o pneu direto.
      desgaste: 0.8 + 0.3 * Math.min(d, 4) + 0.15 * Math.abs(e.pressao) + 0.1 * Math.abs(e[M.traseira]),
      quebra: 0,
      motivoQuebra: 'Quebra',
    };
    // Forçar o motor: mistura pobre demais ou dentes demais na coroa (passa do giro) podem engripá-lo.
    const forca = forcaMotor(e);
    if (forca > 0) {
      r.quebra = 0.0065 * Math.pow(forca, 1.5);
      r.motivoQuebra = M.motivoForca || 'Motor engripou';
    }
    if (cond.molhado && pneu !== 'chuva') {
      r.tempo += 5;
      r.erro *= 4;
    } else if (!cond.molhado && pneu === 'chuva') {
      r.tempo += 2;
      r.desgaste *= 2.5;
    }
    if (cond.molhado) r.tempo += 4; // pista molhada é mais lenta para todo mundo
    return r;
  }

  // ---------- o que o piloto e o mecânico dizem ----------
  const vagos = () => [`Não sei explicar, o ${M.veiculo} não está legal.`, 'Está faltando alguma coisa, mas não sei o quê.', `Hoje o ${M.veiculo} está estranho.`];

  // Frases do piloto depois de uma saída para a pista. Quanto maior a sensibilidade, mais certeiro.
  function feedbackPiloto(e, sensibilidade, rnd) {
    const ordenados = M.ORDEM
      .map((k) => ({ k, peso: M.PESO[k] * e[k] * e[k], sinal: e[k] > 0 ? 1 : 0 }))
      .sort((a, b) => b.peso - a.peso);
    const SINTOMAS = M.SINTOMAS;
    if (ordenados[0].peso < 0.06) return [`O ${M.veiculo} está muito bom! Equilibrado, dá pra acelerar tudo.`];
    const acerto = 0.35 + sensibilidade / 150;
    // Quase no ponto: o piloto elogia e, se perceber, aponta o detalhe que falta (sem reclamação vaga).
    if (ordenados[0].peso < 0.25) {
      const frases = [`O ${M.veiculo} está bom! Falta só um detalhe.`];
      if (rnd() < acerto) frases.push(SINTOMAS[ordenados[0].k][ordenados[0].sinal].replace(/^./, (c) => `Só um pouco: ${c.toLowerCase()}`));
      return frases;
    }
    const frases = [];
    // Frase insegura: a reclamação errada sempre sai assim; a certa, de vez em quando.
    // O jogador aprende que "acho que..." vale menos, sem virar uma regra garantida.
    const DUVIDAS = ['Não tenho certeza, mas ', 'Acho que ', 'Pode ser impressão minha, mas '];
    const emDuvida = (f) => DUVIDAS[Math.floor(rnd() * DUVIDAS.length)] + f.replace(/^./, (c) => c.toLowerCase());
    for (const item of ordenados.slice(0, 2)) {
      if (item.peso < 0.06) break;
      const r = rnd();
      if (r < acerto) frases.push(rnd() < 0.15 ? emDuvida(SINTOMAS[item.k][item.sinal]) : SINTOMAS[item.k][item.sinal]);
      else if (r < acerto + (1 - acerto) * 0.6) { const v = vagos(); frases.push(v[Math.floor(rnd() * v.length)]); }
      else {
        // Pilotos inexperientes às vezes reclamam da coisa errada (e aí falam sem convicção).
        const outro = M.ORDEM[Math.floor(rnd() * M.ORDEM.length)];
        frases.push(emDuvida(SINTOMAS[outro][rnd() < 0.5 ? 0 : 1]));
      }
    }
    return [...new Set(frases)];
  }

  // O piloto comenta a pista antes da sessão: pistas do que mudou (calor, borracha, ar, chuva, altitude),
  // sem dizer o acerto. antes: condição da sessão anterior (null no treino).
  function falaCondicoes(pista, cond, antes, chanceChuva) {
    const f = [];
    if (!antes) {
      if (cond.molhado) f.push(`Pista molhada logo cedo: o ${M.veiculo} vai precisar de toda a aderência que der.`);
      else if (cond.tempPista <= 24) f.push('Manhã fria, o asfalto está gelado. O pneu vai demorar pra pegar temperatura.');
      else if (cond.tempPista >= 34) f.push('Já está quente de manhã, o pneu vai esquentar rápido.');
      else f.push('Temperatura boa de manhã, nada de muito frio nem muito calor.');
      if (!cond.molhado) f.push('A pista ainda está verde, com pouca borracha. Vai escorregar mais que à tarde.');
      if (M.id !== 'kart') {
        if (cond.tempAr <= 15) f.push('O ar está frio e denso: as asas trabalham mais.');
        else if (cond.tempAr >= 26) f.push('O ar está quente: as asas seguram menos o carro.');
        if (pista.altitude >= 500) f.push('Aqui é alto, o ar é mais fino: as asas perdem efeito.');
      } else {
        if (cond.tempAr <= 15) f.push('O ar está frio: o motor fica forte e pede mais combustível.');
        else if (cond.tempAr >= 26) f.push('O ar está quente: o motor esquenta fácil, cuidado com a mistura.');
        if (pista.altitude >= 700) f.push('Aqui é alto, o ar é mais fraco: o motor rende menos.');
      }
      return f;
    }
    if (cond.molhado && !antes.molhado) f.push(`Choveu! Esquece o acerto do seco, agora é outro ${M.veiculo}.`);
    else if (!cond.molhado && antes.molhado) f.push('A pista secou. O acerto da chuva não serve mais.');
    else if (!cond.molhado) {
      const dAsf = cond.tempPista - antes.tempPista;
      if (dAsf >= 8) f.push('O asfalto está pelando, bem mais quente que de manhã. O pneu vai esquentar muito mais rápido.');
      else if (dAsf >= 3) f.push('O asfalto esquentou um pouco desde a manhã.');
      else if (dAsf <= -3) f.push('O asfalto esfriou, o pneu vai demorar mais pra esquentar.');
      if (cond.borracha - antes.borracha >= 0.25) f.push('A pista emborrachou desde a manhã: tem muito mais aderência, principalmente atrás.');
      else if (cond.borracha > antes.borracha) f.push('Tem ainda mais borracha que na classificação: a traseira vai grudar um pouco mais.');
    }
    const dAr = cond.tempAr - antes.tempAr;
    if (dAr >= 4) f.push(M.id !== 'kart' ? 'O ar esquentou também: as asas não vão segurar igual à manhã.' : 'O ar esquentou também: o motor não vai respirar igual à manhã.');
    else if (dAr <= -4) f.push(M.id !== 'kart' ? 'O ar esfriou: as asas vão segurar mais que de manhã.' : 'O ar esfriou: o motor não vai respirar igual à manhã.');
    if (!cond.molhado && chanceChuva >= 50) f.push('Olha esse céu... tem cara de chuva na corrida.');
    else if (!cond.molhado && chanceChuva >= 30) f.push('Pode ser que chova na corrida, não dá pra saber.');
    if (!f.length) f.push('A pista está parecida com antes.');
    return f;
  }

  function dicaMecanico(e, mecanico, rnd) {
    const pior = M.ORDEM.map((k) => ({ k, peso: M.PESO[k] * e[k] * e[k] })).sort((a, b) => b.peso - a.peso)[0];
    if (pior.peso < 0.06) return 'Mecânico: não mexe em nada, está no ponto.';
    if (rnd() > mecanico / 110) return 'Mecânico: difícil dizer... vamos testar e ver o cronômetro.';
    const verbo = M.VERBO[pior.k][e[pior.k] > 0 ? 0 : 1];
    const forte = Math.abs(e[pior.k]) > 1.5 ? ' bastante' : '';
    return `Mecânico: eu mexeria ${M.ONDE[pior.k]}. Tentaria ${verbo}${forte}.`;
  }

  // Conversa depois da corrida: o que o piloto sentiu de verdade (sem confusão de piloto inexperiente)
  // e para que lado cada ajuste deveria ter ido naquelas condições. Não revela o número exato.
  function diagnostico(setup, pista, cond, pneu) {
    const e = erros(setup, acertoIdeal(pista, cond, pneu));
    const ordenados = M.ORDEM
      .map((k) => ({ k, peso: M.PESO[k] * e[k] * e[k], sinal: e[k] > 0 ? 1 : 0, erro: e[k] }))
      .sort((a, b) => b.peso - a.peso);
    const sentiu = ordenados.filter((x) => x.peso >= 0.06).slice(0, 2).map((x) => M.SINTOMAS[x.k][x.sinal]);
    // Só sugere mudar o que dá para melhorar: se já está no valor mais perto do ideal, não fala nada.
    const melhor = arredondarSetup(acertoIdeal(pista, cond, pneu));
    // No máximo três: os que mais pesaram. Uma lista de sete assusta mesmo quando o acerto estava quase certo.
    const ajustes = ordenados.filter((x) => Math.abs(x.erro) >= 0.6 && setup[x.k] !== melhor[x.k]).slice(0, 3)
      .map((x) => ({ k: x.k, texto: `${M.DIRECAO[x.k][x.sinal]}${Math.abs(x.erro) > 1.6 ? ' (bem mais)' : ' (um pouco)'}` }));
    const motor = forcaMotor(e) > 0 ? (M.id === 'f1' ? 'O arrefecimento está fechado demais para esta pista: o motor pode superaquecer.' : 'Você forçou o motor: mistura pobre ou giro alto demais podem engripá-lo.') : null;
    let pneuDica = null;
    if (cond.molhado && pneu !== 'chuva') pneuDica = 'Com a pista molhada, o pneu de chuva teria sido muito mais rápido.';
    else if (!cond.molhado && pneu === 'chuva') pneuDica = 'Com a pista seca, o slick teria sido mais rápido e gastaria menos.';
    if (!sentiu.length && !pneuDica && !motor) sentiu.push(`O ${M.veiculo} estava muito bom! Equilibrado, dava pra acelerar tudo.`);
    // Quanto o acerto custou por volta (sem a penalidade de pneu errado), para dar a medida do que a lista pede.
    const perda = Math.round(Math.min(3.5, 1.1 * Math.pow(desequilibrio(e), 0.9)) * 100) / 100;
    return { sentiu, ajustes, pneu: pneuDica, motor, perda };
  }

  function arredondarSetup(s) {
    const r = {};
    for (const k of M.ORDEM) {
      const a = M.AJUSTES[k];
      if (a.tipo === 'opcoes') r[k] = limitar(Math.round(s[k]), 0, a.opcoes.length - 1);
      else r[k] = limitar(Math.round(s[k] / a.passo) * a.passo, a.min, a.max);
    }
    return r;
  }

  // Acerto sugerido pelo mecânico para uma condição: perto do ideal, com erro que depende da qualidade dele.
  function sugestaoMecanico(pista, cond, pneu, mecanico, rnd) {
    const ideal = acertoIdeal(pista, cond, pneu);
    const ruido = (100 - mecanico) / 40;
    const s = {};
    for (const k of M.ORDEM) s[k] = ideal[k] + rnd.gauss() * ruido * M.TOLERANCIA[k];
    return arredondarSetup(s);
  }

  // O que fazer num ajuste, em poucas palavras ("baixar 1 psi", "mudar para Duro", "pôr 2 dentes").
  function acaoAjuste(k, d, alvo) {
    const a = M.AJUSTES[k];
    const n = Math.abs(d);
    const plural = (um, varios) => `${String(n).replace('.', ',')} ${n === 1 ? um : varios}`;
    if (a.tipo === 'opcoes') return `mudar para ${a.opcoes[alvo[k]]}`;
    if (k === 'pressao') return `${d < 0 ? 'baixar' : 'subir'} ${plural('psi', 'psi')}`;
    if (k === 'coroa') return `${d > 0 ? 'pôr' : 'tirar'} ${plural('dente', 'dentes')}`;
    if (k === 'carburacao') return `${plural('volta', 'voltas')} mais ${d > 0 ? 'rica' : 'pobre'}`;
    if (k === 'caster') return `${d > 0 ? 'pôr' : 'tirar'} ${plural('grau', 'graus')} de caster`;
    if (k === 'freio') return `passar ${n}% para ${d > 0 ? 'a frente' : 'trás'}`;
    if (k === 'camber') return `${String(n).replace('.', ',')}° ${d < 0 ? 'a mais' : 'a menos'} de cambagem`;
    return `${d > 0 ? 'pôr' : 'tirar'} ${plural('ponto', 'pontos')}`; // asas
  }

  // Análise técnica do mecânico: o que mudar (com quantidade) para chegar perto do acerto que ele acha certo
  // para a condição. Até três mudanças, das que mais pesam. A precisão depende da qualidade dele.
  function analiseTecnica(setup, pista, cond, pneu, qualidade, rnd) {
    const alvo = sugestaoMecanico(pista, cond, pneu, qualidade, rnd);
    const itens = M.ORDEM
      .map((k) => ({ k, d: alvo[k] - setup[k], peso: M.PESO[k] * Math.pow((alvo[k] - setup[k]) / M.TOLERANCIA[k], 2) }))
      .filter((x) => x.d !== 0 && x.peso >= 0.02)
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 3)
      .map((x) => ({ nome: M.AJUSTES[x.k].nome, acao: acaoAjuste(x.k, x.d, alvo) }));
    // lista: "Nome do ajuste: o que fazer", sempre com o mesmo nome que aparece na tela.
    const lista = itens.map((x) => `${x.nome}: ${x.acao}`);
    return { itens, lista: lista.length ? lista : ['O acerto está no ponto. Não mexe em nada.'], alvo };
  }

  // Acerto que uma equipe da IA usa (mecânicos melhores chegam mais perto do ideal).
  function setupIA(pista, cond, pneu, mecanico, rnd) {
    // Na F4 as equipes têm engenheiros de verdade: acertam melhor que no kart.
    return sugestaoMecanico(pista, cond, pneu, Math.max(30, M.id !== 'kart' ? mecanico + 2 : mecanico - 10), rnd);
  }

  // Descreve um acerto de qualquer categoria (o caderno guarda acertos de kart e de monopostos).
  function descreverSetup(s) {
    const mod = 'ers' in s || 'arrefecimento' in s ? MODELOS.f1 : 'freio' in s ? MODELOS.f2 : 'asaTraseira' in s ? MODELOS.f4 : MODELOS.kart;
    return mod.descrever(s, mod.AJUSTES);
  }

  const Kart = {
    get AJUSTES() { return M.AJUSTES; },
    get ORDEM_AJUSTES() { return M.ORDEM; },
    get veiculo() { return M.veiculo; },
    PNEUS_KART, usarCategoria, categoria, monoposto: () => M.id !== 'kart',
    setupPadrao, gerarClima, condicao, acertoIdeal, erros, forcaMotor, desequilibrio, efeito, telemetria,
    feedbackPiloto, falaCondicoes, diagnostico, dicaMecanico, sugestaoMecanico, analiseTecnica, setupIA, arredondarSetup, pisoPressao, descreverSetup,
  };
  if (typeof module === 'object' && module.exports) module.exports = Kart;
  else root.BoxKart = Kart;
})(this);
