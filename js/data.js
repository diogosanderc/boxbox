// Dados fixos do jogo: equipes de kart, kartódromos, campeonatos, nomes e patrocinadores.
// Equipes, pilotos e empresas são fictícios; os kartódromos são lugares reais.
(function (root) {
  'use strict';

  // material: qualidade do kart e do motor. mecanico: qualidade do acerto que a equipe faz nos karts dos rivais.
  // caixa: dinheiro inicial do seu projeto com a equipe. custoEtapa: quanto a equipe cobra por etapa (R$).
  // organizacao: oculto para o jogador; equipes desorganizadas prometem mais do que entregam.
  const EQUIPES = [
    { id: 'fulmine', nome: 'Fulmine Kart', cor: '#e10600', material: 90, mecanico: 92, caixa: 97000, custoEtapa: 9000, organizacao: 90,
      descricao: 'Equipe campeã, material de ponta e estrutura enorme. Cara.' },
    { id: 'orbital', nome: 'Orbital Karting', cor: '#1e5bc6', material: 88, mecanico: 80, caixa: 88000, custoEtapa: 8000, organizacao: 85,
      descricao: 'Estrutura grande e organizada. Kart rápido e bem cuidado.' },
    { id: 'velox', nome: 'Velox Junior', cor: '#00b3a4', material: 86, mecanico: 86, caixa: 82000, custoEtapa: 7200, organizacao: 80,
      descricao: 'Especialista em formar pilotos jovens. Paciente com quem está começando.' },
    { id: 'rapido', nome: 'Rapido Corse', cor: '#ff8700', material: 87, mecanico: 64, caixa: 79000, custoEtapa: 6800, organizacao: 55,
      descricao: 'Chassi italiano muito rápido, mas a equipe é bagunçada.' },
    { id: 'tempesta', nome: 'Tempesta KR', cor: '#7a5cff', material: 83, mecanico: 75, caixa: 72000, custoEtapa: 5800, organizacao: 75,
      descricao: 'Boa no molhado. Estrutura média e honesta.' },
    { id: 'faisca', nome: 'Faísca Kart', cor: '#f2c200', material: 81, mecanico: 70, caixa: 68000, custoEtapa: 5200, organizacao: 70,
      descricao: 'Equipe familiar, que conhece todo kartódromo do Brasil.' },
    { id: 'piccolo', nome: 'Piccolo Team', cor: '#2fbf71', material: 79, mecanico: 78, caixa: 63000, custoEtapa: 4600, organizacao: 82,
      descricao: 'Kart simples, mas a equipe ensina muito sobre acerto.' },
    { id: 'ninja', nome: 'Ninja Kart', cor: '#9aa0a6', material: 80, mecanico: 52, caixa: 58000, custoEtapa: 4000, organizacao: 50,
      descricao: 'Promete muito e cobra pouco. Ninguém sabe bem como funciona.' },
    { id: 'formiga', nome: 'Formiga Racing', cor: '#b5651d', material: 76, mecanico: 60, caixa: 54000, custoEtapa: 3400, organizacao: 72,
      descricao: 'Garagem pequena, motores usados. Para quem tem garra.' },
    { id: 'garagem', nome: 'Garagem do Zé', cor: '#5b8c5a', material: 73, mecanico: 66, caixa: 48000, custoEtapa: 2800, organizacao: 78,
      descricao: 'O dono monta tudo sozinho. Barato, honesto e lento.' },
  ];

  // tipo: travada (curvas lentas), mista ou veloz. altitude em metros. clima: temperatura média do ar.
  // tracado: vértices da linha central da pista (caixa de 300×180), ligados por retas com cantos arredondados.
  // Equipes da Fórmula 4 (fictícias). custoEtapa é multiplicado pelo custo do campeonato.
  const EQUIPES_F4 = [
    { id: 'f4-vortex', nome: 'Vortex Junior Team', cor: '#00a19c', material: 90, mecanico: 92, caixa: 0, custoEtapa: 9000, organizacao: 92,
      descricao: 'Equipe da academia Vortex, de F1. Estrutura de ponta.' },
    { id: 'f4-rossa', nome: 'Rossa Young Drivers', cor: '#d40000', material: 89, mecanico: 88, caixa: 0, custoEtapa: 8800, organizacao: 88,
      descricao: 'O programa de jovens da Rossa. Muita pressão por resultado.' },
    { id: 'f4-apex', nome: 'Apex Junior', cor: '#ff7a00', material: 87, mecanico: 86, caixa: 0, custoEtapa: 8000, organizacao: 85,
      descricao: 'Campeã de F4 várias vezes. Engenheiros experientes.' },
    { id: 'f4-lionheart', nome: 'Lionheart F4', cor: '#1b3fa0', material: 85, mecanico: 82, caixa: 0, custoEtapa: 7400, organizacao: 84,
      descricao: 'Equipe inglesa tradicional, organizada e rápida.' },
    { id: 'f4-scorpio', nome: 'Scorpio Racing', cor: '#3b3b3b', material: 84, mecanico: 76, caixa: 0, custoEtapa: 7000, organizacao: 72,
      descricao: 'Carro rápido, equipe nem sempre organizada.' },
    { id: 'f4-aquila', nome: 'Aquila Corse', cor: '#7a5cff', material: 82, mecanico: 78, caixa: 0, custoEtapa: 6400, organizacao: 78,
      descricao: 'Italiana de médio porte, boa em pista molhada.' },
    { id: 'f4-mistral', nome: 'Mistral Formula', cor: '#2fbf71', material: 80, mecanico: 80, caixa: 0, custoEtapa: 6000, organizacao: 80,
      descricao: 'Francesa, ensina muito sobre acerto.' },
    { id: 'f4-nordwind', nome: 'Nordwind Motorsport', cor: '#9aa0a6', material: 79, mecanico: 70, caixa: 0, custoEtapa: 5400, organizacao: 70,
      descricao: 'Alemã, simples e barata.' },
    { id: 'f4-pampa', nome: 'Pampa Racing', cor: '#f2c200', material: 77, mecanico: 72, caixa: 0, custoEtapa: 4800, organizacao: 74,
      descricao: 'Equipe sul-americana que leva pilotos para a Europa.' },
    { id: 'f4-box13', nome: 'Box 13 Formula', cor: '#b5651d', material: 75, mecanico: 66, caixa: 0, custoEtapa: 4200, organizacao: 70,
      descricao: 'Pequena e barata. Para quem tem garra.' },
  ];

  // Nomes de equipe sorteados a cada carreira (o perfil de cada equipe continua o mesmo). Todos fictícios.
  const NOMES_EQUIPES = [
    'Fulmine Kart', 'Orbital Karting', 'Velox Junior', 'Rapido Corse', 'Tempesta Racing', 'Faísca Kart',
    'Piccolo Team', 'Ninja Kart', 'Formiga Racing', 'Garagem do Zé', 'Squadra Leone', 'Scuderia Aquila',
    'Trovão Competições', 'Raio Motorsport', 'Redline Karting', 'Northstar Racing', 'Blackfox Kart',
    'Falco Corse', 'Turbo Kids', 'Oficina Paulista', 'Equipe Serra Azul', 'Vento Sul Racing', 'Pampa Kart',
    'Cerrado Motorsport', 'Litoral Racing', 'Mantiqueira Kart', 'Ipê Competições', 'Jaguar do Vale', 'Cometa Kart Team',
    'Astro Racing', 'Nebula Karting', 'Zenith Junior', 'Vortice Corse', 'Saetta Racing', 'Fiamma Kart',
    'Montagna Team', 'Lupo Motorsport', 'Orso Bianco Racing', 'Stella Polare Kart', 'Ironbridge Karting', 'Kestrel Racing',
    'Silverline Junior', 'Thunderbolt Kart', 'Harbor Motorsport', 'Riverside Racing', 'Hawkridge Kart', 'Bluefin Racing',
    'Crimson Arrow', 'Étoile Racing', 'Mistral Karting', 'Bleu Horizon', 'Le Faucon Kart',
    'Rhône Motorsport', 'Blitz Junior', 'Adler Kartsport', 'Nordwind Racing', 'Falke Motorsport', 'Schwarzwald Kart',
    'Oranje Kart Team', 'Tulp Racing', 'Molen Motorsport', 'Sol de Castilla', 'Relámpago Racing', 'Pampero Kart',
    'Cóndor Motorsport', 'Gaúcho Racing', 'Capivara Kart', 'Tucano Competições', 'Arara Racing', 'Onça Pintada Kart',
    'Boto Rosa Racing', 'Sabiá Junior', 'Carcará Motorsport', 'Família Andrade Kart', 'Garagem 77', 'Box 13 Racing',
    'Pit Lane Kids', 'Curva do S Kart', 'Zebra Alta Racing', 'Vácuo Competições', 'Pole Junior', 'Bandeira Quadriculada',
    'Escudería Austral', 'Atlântico Kart', 'Kartódromo Clube', 'Pé de Chumbo Racing', 'Escapamento Kart',
  ];

  const KARTODROMOS = {
    br: [
      { id: 'granja', tracado: [[40, 150], [250, 150], [275, 135], [265, 115], [150, 105], [130, 90], [150, 75], [255, 60], [270, 40], [250, 25], [90, 25], [55, 40], [70, 70], [45, 95], [30, 125]], nome: 'Granja Viana', local: 'Cotia (SP)', tipo: 'mista', altitude: 790, clima: 24, tempoBase: 46.5 },
      { id: 'aldeia', tracado: [[30, 150], [170, 150], [190, 130], [170, 110], [110, 105], [95, 85], [115, 70], [200, 75], [230, 100], [250, 150], [280, 140], [275, 90], [240, 55], [260, 30], [230, 20], [60, 25], [30, 45], [45, 75], [30, 105]], nome: 'Aldeia da Serra', local: 'Barueri (SP)', tipo: 'travada', altitude: 750, clima: 24, tempoBase: 44.0 },
      { id: 'interlagos', tracado: [[30, 40], [260, 30], [285, 55], [260, 75], [140, 85], [130, 105], [150, 120], [265, 125], [285, 150], [260, 165], [45, 160], [20, 135], [40, 100], [25, 70]], nome: 'Kartódromo de Interlagos', local: 'São Paulo (SP)', tipo: 'veloz', altitude: 760, clima: 23, tempoBase: 48.0 },
      { id: 'birigui', tracado: [[30, 130], [110, 50], [150, 30], [255, 30], [280, 55], [255, 80], [180, 90], [175, 110], [255, 125], [275, 150], [250, 165], [55, 165], [25, 150]], nome: 'Birigui', local: 'Birigui (SP)', tipo: 'veloz', altitude: 400, clima: 29, tempoBase: 50.5 },
      { id: 'londrina', tracado: [[30, 60], [60, 30], [150, 30], [170, 60], [150, 85], [175, 100], [240, 60], [275, 75], [275, 120], [250, 140], [260, 160], [130, 165], [100, 140], [50, 155], [25, 125]], nome: 'Londrina', local: 'Londrina (PR)', tipo: 'mista', altitude: 580, clima: 24, tempoBase: 47.0 },
      { id: 'taruma', tracado: [[40, 35], [250, 30], [280, 55], [240, 80], [215, 105], [270, 140], [240, 165], [55, 160], [25, 135], [80, 105], [85, 80], [30, 60]], nome: 'Tarumã', local: 'Viamão (RS)', tipo: 'veloz', altitude: 50, clima: 19, tempoBase: 49.0 },
      { id: 'brasilia', tracado: [[25, 110], [45, 45], [80, 25], [115, 45], [125, 85], [155, 95], [185, 50], [215, 30], [265, 35], [285, 65], [250, 95], [275, 130], [260, 160], [180, 160], [140, 140], [90, 160], [40, 150]], nome: 'Kartódromo de Brasília', local: 'Brasília (DF)', tipo: 'mista', altitude: 1100, clima: 25, tempoBase: 47.5 },
      { id: 'conde', tracado: [[30, 150], [25, 95], [70, 80], [35, 55], [55, 25], [150, 30], [170, 55], [210, 30], [270, 35], [280, 75], [230, 90], [275, 115], [270, 155], [200, 160], [175, 130], [140, 155]], nome: 'Conde', local: 'Conde (PB)', tipo: 'travada', altitude: 40, clima: 30, tempoBase: 43.5 },
    ],
    // Circuitos da F4 (autódromos de verdade; números aproximados).
    f4: [
      { id: 'imola', nome: 'Imola', local: 'Imola (ITA)', tipo: 'mista', altitude: 40, clima: 22, tempoBase: 104.0 },
      { id: 'misano', nome: 'Misano', local: 'Misano Adriatico (ITA)', tipo: 'travada', altitude: 10, clima: 25, tempoBase: 99.0 },
      { id: 'monza', nome: 'Monza', local: 'Monza (ITA)', tipo: 'veloz', altitude: 160, clima: 23, tempoBase: 112.0 },
      { id: 'mugello', nome: 'Mugello', local: 'Scarperia (ITA)', tipo: 'veloz', altitude: 290, clima: 23, tempoBase: 111.0 },
      { id: 'vallelunga', nome: 'Vallelunga', local: 'Campagnano (ITA)', tipo: 'travada', altitude: 220, clima: 22, tempoBase: 96.0 },
      { id: 'spa', nome: 'Spa-Francorchamps', local: 'Stavelot (BEL)', tipo: 'veloz', altitude: 450, clima: 16, tempoBase: 150.0 },
      { id: 'spielberg', nome: 'Spielberg', local: 'Spielberg (AUT)', tipo: 'mista', altitude: 680, clima: 18, tempoBase: 92.0 },
      { id: 'castellet', nome: 'Le Castellet', local: 'Le Castellet (FRA)', tipo: 'mista', altitude: 400, clima: 24, tempoBase: 117.0 },
    ],
    eu: [
      { id: 'lonato', tracado: [[158, 96], [276, 97], [280, 91], [277, 87], [250, 72], [246, 74], [244, 76], [188, 43], [134, 47], [128, 52], [133, 78], [129, 83], [77, 108], [69, 120], [63, 123], [27, 125], [20, 129], [25, 134], [58, 131], [96, 137], [102, 133], [97, 118], [102, 111], [151, 82], [156, 76], [150, 67], [153, 62], [158, 63], [173, 72], [174, 80], [168, 86], [158, 89], [155, 94]], nome: 'South Garda', local: 'Lonato (ITA)', tipo: 'mista', altitude: 100, clima: 22, tempoBase: 47.0 },
      { id: 'genk', tracado: [[25, 95], [55, 40], [140, 25], [265, 30], [285, 60], [250, 78], [145, 85], [125, 100], [145, 115], [265, 120], [285, 145], [255, 165], [65, 160], [30, 140]], nome: 'Horensbergdam', local: 'Genk (BEL)', tipo: 'veloz', altitude: 60, clima: 17, tempoBase: 52.0 },
      { id: 'zuera', tracado: [[30, 40], [150, 30], [170, 55], [150, 80], [185, 95], [235, 45], [275, 55], [270, 105], [235, 120], [250, 150], [215, 165], [110, 155], [85, 125], [45, 140], [25, 110]], nome: 'Zuera', local: 'Zaragoza (ESP)', tipo: 'mista', altitude: 300, clima: 25, tempoBase: 50.0 },
      { id: 'sarno', tracado: [[25, 140], [30, 45], [70, 25], [110, 60], [150, 30], [180, 50], [150, 85], [190, 105], [240, 45], [280, 55], [270, 100], [235, 120], [275, 145], [250, 165], [140, 160], [110, 130], [70, 160]], nome: 'Circuito Internazionale', local: 'Sarno (ITA)', tipo: 'travada', altitude: 30, clima: 24, tempoBase: 46.0 },
      { id: 'lemans', tracado: [[25, 125], [30, 55], [80, 25], [265, 35], [285, 70], [250, 90], [165, 95], [150, 118], [265, 132], [280, 158], [55, 165]], nome: 'Le Mans Karting', local: 'Le Mans (FRA)', tipo: 'veloz', altitude: 50, clima: 18, tempoBase: 51.0 },
      { id: 'kristianstad', tracado: [[20, 65], [60, 25], [195, 30], [225, 60], [200, 85], [245, 100], [280, 90], [285, 140], [250, 162], [155, 150], [130, 122], [90, 152], [35, 160], [15, 120], [55, 95]], nome: 'Kristianstad', local: 'Kristianstad (SUE)', tipo: 'mista', altitude: 20, clima: 15, tempoBase: 49.0 },
      { id: 'wackersdorf', tracado: [[35, 155], [20, 110], [65, 90], [40, 60], [65, 28], [245, 25], [285, 50], [255, 80], [180, 90], [170, 110], [265, 120], [285, 150], [245, 165]], nome: 'Prokart Raceland', local: 'Wackersdorf (ALE)', tipo: 'veloz', altitude: 400, clima: 16, tempoBase: 50.5 },
      { id: 'franciacorta', tracado: [[25, 45], [85, 25], [100, 60], [130, 85], [155, 55], [145, 30], [205, 25], [225, 60], [270, 30], [285, 70], [250, 95], [280, 130], [255, 160], [195, 150], [175, 120], [145, 150], [80, 165], [30, 155], [25, 115], [60, 90]], nome: 'Franciacorta', local: 'Castrezzato (ITA)', tipo: 'travada', altitude: 120, clima: 23, tempoBase: 45.5 },
    ],
  };

  // Ficha de cada kartódromo, para o piloto conhecer a pista. Os números são aproximados (pistas reais, dados de jogo).
  // retas: comprimento em metros das retas principais. curvas: lentas/médias/rápidas. zebras: altas, baixas ou sem.
  // asfalto: liso (gasta pouco pneu), medio ou abrasivo (gasta muito). ultrapassagem: 0 (difícil) a 1 (fácil).
  const FICHAS = {
    granja: { extensao: 1080, largura: 8, sentido: 'anti-horário', retas: [170, 120], curvas: { lentas: 4, medias: 5, rapidas: 3 }, grampos: 1, zebras: 'baixas', asfalto: 'medio', desnivel: 'Leve subida no miolo', ultrapassagem: 0.55, ondePassar: 'Freada do fim da reta principal',
      sobre: 'Pista tradicional, de miolo travado e duas retas que pedem saída limpa da curva anterior. As zebras baixas deixam cortar bastante.' },
    aldeia: { extensao: 980, largura: 7, sentido: 'horário', retas: [140], curvas: { lentas: 6, medias: 4, rapidas: 2 }, grampos: 2, zebras: 'altas', asfalto: 'abrasivo', desnivel: 'Plana', ultrapassagem: 0.35, ondePassar: 'Grampo depois da reta',
      sobre: 'Muito travada e estreita, cheia de curvas lentas em sequência. Zebras altas: quem cortar demais desequilibra o kart. O asfalto áspero come o pneu.' },
    interlagos: { extensao: 1180, largura: 9, sentido: 'anti-horário', retas: [240, 190], curvas: { lentas: 2, medias: 4, rapidas: 4 }, grampos: 1, zebras: 'baixas', asfalto: 'liso', desnivel: 'Descida forte no fim da reta', ultrapassagem: 0.75, ondePassar: 'Fim das duas retas longas',
      sobre: 'Rápida, com duas retas grandes e curvas de alta no meio. Velocidade final conta muito e o vácuo ajuda a passar. Asfalto liso, que poupa pneu.' },
    birigui: { extensao: 1240, largura: 9, sentido: 'horário', retas: [260, 160], curvas: { lentas: 2, medias: 3, rapidas: 5 }, grampos: 1, zebras: 'baixas', asfalto: 'medio', desnivel: 'Plana', ultrapassagem: 0.7, ondePassar: 'Grampo no fim da reta principal',
      sobre: 'Uma das pistas mais rápidas do Brasil: reta enorme e sequência de curvas de pé embaixo. Calor forte quase o ano todo.' },
    londrina: { extensao: 1090, largura: 8, sentido: 'anti-horário', retas: [180, 110], curvas: { lentas: 3, medias: 5, rapidas: 3 }, grampos: 1, zebras: 'altas', asfalto: 'medio', desnivel: 'Ondulações na curva 3', ultrapassagem: 0.55, ondePassar: 'Freada da curva 1',
      sobre: 'Equilibrada, com um pouco de tudo. As zebras altas e as ondulações no meio da volta castigam um kart duro demais.' },
    taruma: { extensao: 1200, largura: 9, sentido: 'horário', retas: [230, 200], curvas: { lentas: 2, medias: 3, rapidas: 4 }, grampos: 1, zebras: 'sem', asfalto: 'liso', desnivel: 'Subida longa na reta oposta', ultrapassagem: 0.7, ondePassar: 'Fim da reta principal',
      sobre: 'Veloz e fluida, com duas retas longas. Sem zebras: quem sai da pista perde muito. No inverno gaúcho o asfalto fica gelado.' },
    brasilia: { extensao: 1120, largura: 8, sentido: 'anti-horário', retas: [190, 130], curvas: { lentas: 3, medias: 5, rapidas: 3 }, grampos: 1, zebras: 'baixas', asfalto: 'abrasivo', desnivel: 'Plana', ultrapassagem: 0.55, ondePassar: 'Freada do fim da reta',
      sobre: 'Pista mista no planalto, a 1.100 m: o ar rarefeito tira força do motor. Asfalto áspero e sol forte gastam o pneu.' },
    conde: { extensao: 960, largura: 7, sentido: 'horário', retas: [130], curvas: { lentas: 6, medias: 3, rapidas: 2 }, grampos: 2, zebras: 'altas', asfalto: 'abrasivo', desnivel: 'Plana', ultrapassagem: 0.35, ondePassar: 'Grampo da curva 4',
      sobre: 'Curta e muito travada, à beira-mar. Muito calor e asfalto abrasivo: o pneu sofre. Zebras altas nos grampos.' },
    lonato: { extensao: 1010, largura: 8, sentido: 'horário', retas: [190, 100], curvas: { lentas: 3, medias: 5, rapidas: 3 }, grampos: 1, zebras: 'baixas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.55, ondePassar: 'Fim da reta principal',
      sobre: 'Palco dos grandes campeonatos europeus. Mista, técnica e com muita borracha: um erro de acerto aparece no cronômetro.' },
    genk: { extensao: 1360, largura: 9, sentido: 'anti-horário', retas: [250, 210, 140], curvas: { lentas: 2, medias: 4, rapidas: 5 }, grampos: 1, zebras: 'baixas', asfalto: 'medio', desnivel: 'Plana', ultrapassagem: 0.75, ondePassar: 'Fim das retas, principalmente a primeira',
      sobre: 'Longa e rápida, com três retas e curvas de alta. Clima belga: frio e chuva aparecem sem avisar.' },
    zuera: { extensao: 1700, largura: 10, sentido: 'horário', retas: [220, 180], curvas: { lentas: 4, medias: 6, rapidas: 5 }, grampos: 2, zebras: 'altas', asfalto: 'abrasivo', desnivel: 'Leve desnível no setor 2', ultrapassagem: 0.6, ondePassar: 'Grampos no fim das retas',
      sobre: 'Enorme e larga, com todo tipo de curva. Calor seco espanhol e asfalto áspero: cuidar do pneu decide a corrida.' },
    sarno: { extensao: 1700, largura: 10, sentido: 'anti-horário', retas: [170], curvas: { lentas: 7, medias: 6, rapidas: 3 }, grampos: 3, zebras: 'altas', asfalto: 'medio', desnivel: 'Plana', ultrapassagem: 0.4, ondePassar: 'Grampo no fim da reta',
      sobre: 'Muito técnica e travada, cheia de grampos e chicanes. Tração na saída das curvas lentas é tudo.' },
    lemans: { extensao: 1350, largura: 9, sentido: 'horário', retas: [260, 170], curvas: { lentas: 2, medias: 4, rapidas: 4 }, grampos: 1, zebras: 'baixas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.7, ondePassar: 'Freada da reta principal',
      sobre: 'Rápida, com reta longa e curvas abertas. Asfalto liso que poupa pneu; o ar fresco deixa o motor forte.' },
    kristianstad: { extensao: 1100, largura: 8, sentido: 'anti-horário', retas: [170, 120], curvas: { lentas: 3, medias: 5, rapidas: 3 }, grampos: 1, zebras: 'sem', asfalto: 'liso', desnivel: 'Subidas e descidas na floresta', ultrapassagem: 0.5, ondePassar: 'Fim da reta principal',
      sobre: 'Mista, no meio da floresta sueca, com sobe e desce. Quase sempre fria: o pneu demora a esquentar.' },
    wackersdorf: { extensao: 1190, largura: 9, sentido: 'horário', retas: [240, 150], curvas: { lentas: 2, medias: 4, rapidas: 4 }, grampos: 1, zebras: 'baixas', asfalto: 'medio', desnivel: 'Plana', ultrapassagem: 0.7, ondePassar: 'Grampo no fim da reta',
      sobre: 'Veloz e moderna, com reta longa e curvas de alta. Clima alemão frio, com chuva frequente.' },
    franciacorta: { extensao: 1050, largura: 8, sentido: 'anti-horário', retas: [150], curvas: { lentas: 6, medias: 4, rapidas: 2 }, grampos: 2, zebras: 'altas', asfalto: 'abrasivo', desnivel: 'Plana', ultrapassagem: 0.4, ondePassar: 'Grampo depois da reta',
      sobre: 'Travada e exigente, com grampos e uma reta curta. Asfalto áspero e zebras altas cobram precisão.' },
  };
  Object.assign(FICHAS, {
    imola: { extensao: 4909, largura: 12, sentido: 'anti-horário', retas: [800, 450], curvas: { lentas: 4, medias: 7, rapidas: 6 }, grampos: 0, zebras: 'altas', asfalto: 'medio', desnivel: 'Subidas e descidas fortes', ultrapassagem: 0.4, ondePassar: 'Freada da Tamburello e da Tosa',
      sobre: 'Clássica e exigente, com sobe e desce e zebras altas que castigam um carro duro. Ultrapassar é difícil.' },
    misano: { extensao: 4226, largura: 12, sentido: 'horário', retas: [550, 400], curvas: { lentas: 6, medias: 6, rapidas: 4 }, grampos: 2, zebras: 'baixas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.55, ondePassar: 'Grampos depois das retas',
      sobre: 'Plana e travada, à beira do Adriático. Muitas curvas lentas: tração na saída é tudo.' },
    monza: { extensao: 5793, largura: 13, sentido: 'horário', retas: [1100, 900, 600], curvas: { lentas: 3, medias: 3, rapidas: 5 }, grampos: 0, zebras: 'altas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.85, ondePassar: 'Primeira chicane e Ascari',
      sobre: 'O templo da velocidade: retas enormes e pouca asa. Vácuo decide corrida; as chicanes têm zebras altas.' },
    mugello: { extensao: 5245, largura: 13, sentido: 'horário', retas: [1140], curvas: { lentas: 2, medias: 6, rapidas: 7 }, grampos: 0, zebras: 'baixas', asfalto: 'abrasivo', desnivel: 'Subidas e descidas nas colinas', ultrapassagem: 0.6, ondePassar: 'Fim da reta principal',
      sobre: 'Rápida e fluida, no meio das colinas da Toscana. Curvas de alta em sequência e asfalto que gasta pneu.' },
    vallelunga: { extensao: 4085, largura: 11, sentido: 'horário', retas: [600], curvas: { lentas: 6, medias: 5, rapidas: 3 }, grampos: 2, zebras: 'altas', asfalto: 'medio', desnivel: 'Leve desnível', ultrapassagem: 0.4, ondePassar: 'Grampo no fim da reta',
      sobre: 'Travada e técnica, perto de Roma. Zebras altas e pouca reta: a classificação vale muito.' },
    spa: { extensao: 7004, largura: 13, sentido: 'horário', retas: [1200, 900, 700], curvas: { lentas: 3, medias: 6, rapidas: 10 }, grampos: 1, zebras: 'baixas', asfalto: 'medio', desnivel: 'Subidas e descidas fortes na floresta', ultrapassagem: 0.8, ondePassar: 'Fim da reta Kemmel',
      sobre: 'Enorme e veloz, com subida forte e curvas de pé embaixo. O tempo muda de um setor para o outro: chuva é comum.' },
    spielberg: { extensao: 4318, largura: 13, sentido: 'horário', retas: [800, 650, 500], curvas: { lentas: 4, medias: 3, rapidas: 3 }, grampos: 2, zebras: 'altas', asfalto: 'medio', desnivel: 'Subidas e descidas fortes', ultrapassagem: 0.7, ondePassar: 'Freadas no topo das subidas',
      sobre: 'Curta, nas montanhas da Áustria: três retas em subida e freadas fortes. A altitude tira um pouco do efeito das asas.' },
    castellet: { extensao: 5842, largura: 14, sentido: 'horário', retas: [1000, 600], curvas: { lentas: 4, medias: 6, rapidas: 5 }, grampos: 1, zebras: 'baixas', asfalto: 'abrasivo', desnivel: 'Plana', ultrapassagem: 0.6, ondePassar: 'Fim da reta Mistral',
      sobre: 'Larga e plana, com a longa reta Mistral. Muito calor no verão e asfalto que gasta pneu.' },
  });
  for (const regiao of Object.values(KARTODROMOS)) for (const p of regiao) Object.assign(p, FICHAS[p.id]);

  // nivel: força média dos rivais. custo: multiplicador dos custos. chuva: chance média de chuva por etapa.
  const CAMPEONATOS = [
    { id: 'regional', nome: 'Copa Paulista de Kart', curto: 'Regional', ordem: 0, nivel: 57, custo: 1, regiao: 'br', voltas: 16,
      chuva: 0.25, premioCampeao: 20000, popularidade: 1 },
    { id: 'nacional', nome: 'Campeonato Brasileiro de Kart', curto: 'Brasileiro', ordem: 1, nivel: 63, custo: 1.8, regiao: 'br', voltas: 18,
      chuva: 0.25, premioCampeao: 50000, popularidade: 1.8 },
    { id: 'internacional', nome: 'Euro Kart Series', curto: 'Europeu', ordem: 2, nivel: 69, custo: 3.2, regiao: 'eu', voltas: 20,
      chuva: 0.3, premioCampeao: 120000, popularidade: 3 },
    // Monopostos: só se entra por proposta de uma equipe de F4.
    { id: 'f4', nome: 'F4 Europa Series', curto: 'F4', ordem: 3, nivel: 75, custo: 4, premios: 1.5, regiao: 'f4', voltas: 14,
      chuva: 0.3, premioCampeao: 80000, popularidade: 4, categoria: 'f4' },
  ];

  // Quem pode aparecer no paddock observando. nivelMin: a partir de qual campeonato aparece.
  const OLHEIROS = [
    { id: 'apex-f4', nome: 'Apex Junior (F4)', tipo: 'f4', nivelMin: 1, equipe: 'f4-apex' },
    { id: 'lionheart-f4', nome: 'Lionheart F4', tipo: 'f4', nivelMin: 1, equipe: 'f4-lionheart' },
    { id: 'scorpio-f4', nome: 'Scorpio Racing (F4)', tipo: 'f4', nivelMin: 1, equipe: 'f4-scorpio' },
    { id: 'vortex-academia', nome: 'Academia Vortex (equipe de F1)', tipo: 'academia', nivelMin: 2, equipe: 'f4-vortex' },
    { id: 'rossa-academia', nome: 'Programa Jovens Rossa (equipe de F1)', tipo: 'academia', nivelMin: 2, equipe: 'f4-rossa' },
  ];

  // Nomes e sobrenomes comuns de cada país (sem sobrenomes de pilotos reais de F1).
  const NOMES = {
    BRA: {
      p: ['Pedro', 'Gabriel', 'Lucas', 'Enzo', 'Caio', 'Rafael', 'Felipe', 'Bruno', 'Thiago', 'Gustavo', 'Matheus', 'Rodrigo', 'Vitor', 'Davi', 'Arthur', 'Miguel', 'Heitor', 'Bernardo', 'Théo', 'Lorenzo', 'Benício', 'Joaquim', 'Samuel', 'Henrique', 'Murilo', 'Eduardo', 'Leonardo', 'Guilherme', 'Daniel', 'Vinícius', 'Igor', 'Otávio', 'Nicolas', 'Ryan', 'Yuri', 'Kauã', 'Luan', 'Cauã', 'Emanuel', 'Diogo', 'Renan', 'Fábio', 'Marcelo', 'André', 'Ricardo', 'Fernando', 'Paulo', 'Sérgio', 'Rogério', 'Alexandre', 'Leandro', 'Márcio', 'Wagner', 'Gilberto', 'Hugo', 'Raul', 'Álvaro', 'Antônio', 'Benjamin', 'Breno', 'Danilo', 'Elias', 'Erick', 'Fabrício', 'Francisco', 'Giovanni', 'Ian', 'Isaac', 'Ítalo', 'Jonas', 'Juliano', 'Kevin', 'Leon', 'Levi', 'Lucca', 'Mariano', 'Mateus', 'Natan', 'Noah', 'Pietro', 'Ravi', 'Ruan', 'Rian', 'Saulo', 'Tales', 'Tiago', 'Tomás', 'Valentim', 'Wesley', 'Yago', 'Zeca', 'Augusto', 'Bento', 'Cristiano', 'Douglas', 'Everton', 'Fausto', 'Gael', 'Hélio', 'Ivan', 'Josué', 'Kaique', 'Lauro', 'Moisés', 'Nelson', 'Orlando', 'Patrick', 'Renato', 'Silas', 'Túlio', 'Ulisses', 'Wallace'],
      s: ['Silva', 'Ferraz', 'Monteiro', 'Albuquerque', 'Saraiva', 'Barbosa', 'Moraes', 'Teixeira', 'Rocha', 'Prado', 'Castro', 'Rangel', 'Lacerda', 'Pacheco', 'Almeida', 'Andrade', 'Araújo', 'Azevedo', 'Bastos', 'Batista', 'Bezerra', 'Borges', 'Braga', 'Brandão', 'Brito', 'Cabral', 'Caldeira', 'Campos', 'Cardoso', 'Carneiro', 'Carvalho', 'Cavalcanti', 'Coelho', 'Correia', 'Costa', 'Cunha', 'Dantas', 'Duarte', 'Esteves', 'Falcão', 'Farias', 'Fernandes', 'Figueiredo', 'Fonseca', 'Freitas', 'Frota', 'Furtado', 'Galvão', 'Gomes', 'Gouveia', 'Guerra', 'Guimarães', 'Leal', 'Leite', 'Lima', 'Lopes', 'Macedo', 'Machado', 'Magalhães', 'Maia', 'Marinho', 'Martins', 'Matos', 'Medeiros', 'Meireles', 'Melo', 'Mendes', 'Menezes', 'Miranda', 'Moura', 'Nascimento', 'Neves', 'Nogueira', 'Nunes', 'Oliveira', 'Paiva', 'Peixoto', 'Pereira', 'Pimentel', 'Pinheiro', 'Pinto', 'Queiroz', 'Ramos', 'Reis', 'Resende', 'Ribeiro', 'Sampaio', 'Santana', 'Santos', 'Siqueira', 'Soares', 'Sousa', 'Tavares', 'Toledo', 'Torres', 'Valente', 'Vasconcelos', 'Veloso', 'Viana', 'Vieira', 'Xavier', 'Zanetti', 'Amaral', 'Bittencourt', 'Camargo', 'Diniz', 'Fontes', 'Godoy', 'Holanda', 'Junqueira', 'Kowalski', 'Lobato', 'Mascarenhas', 'Nóbrega', 'Ornelas', 'Penteado', 'Quintela', 'Rezende', 'Sardinha', 'Tavora', 'Uchoa', 'Vilela', 'Werneck', 'Moreno', 'Gurgel', 'Accioly', 'Bragança', 'Coutinho', 'Dornelles', 'Escobar', 'Fagundes', 'Garcia', 'Hoffmann', 'Ishikawa', 'Jardim', 'Klein', 'Lemos', 'Nakamura', 'Ortiz', 'Pires', 'Rossi', 'Scheffer', 'Tanaka', 'Ueda', 'Valadares', 'Weiss', 'Yamada', 'Zimmermann'],
    },
    ITA: {
      p: ['Enzo', 'Marco', 'Luca', 'Matteo', 'Andrea', 'Lorenzo', 'Alessio', 'Leonardo', 'Francesco', 'Alessandro', 'Riccardo', 'Tommaso', 'Gabriele', 'Edoardo', 'Federico', 'Giuseppe', 'Antonio', 'Pietro', 'Diego', 'Samuele', 'Nicolò', 'Emanuele', 'Davide', 'Simone', 'Filippo', 'Giacomo', 'Michele', 'Stefano', 'Mattia', 'Christian', 'Elia', 'Cristian', 'Daniele', 'Paolo', 'Raffaele', 'Fabio', 'Vincenzo', 'Giorgio', 'Massimo', 'Salvatore', 'Dario', 'Bruno', 'Carlo', 'Luigi', 'Valerio', 'Ivan', 'Ettore', 'Achille', 'Ruben'],
      s: ['Moretti', 'Bianchi', 'Conti', 'Ferri', 'Galli', 'Romano', 'Lombardi', 'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Costa', 'Fontana', 'Caruso', 'Mancini', 'Rizzo', 'Longo', 'Leone', 'Martinelli', 'Vitale', 'Serra', 'Santoro', 'Mariani', 'Rinaldi', 'Cattaneo', 'Morelli', 'Ferraro', 'Pellegrini', 'Palumbo', 'Sanna', 'Fabbri', 'Carbone', 'Gentile', 'Testa', 'Villa', 'Parisi', 'Monti', 'Barbieri', 'Grasso', 'De', 'Luca', 'Marchetti', 'Fiore', 'Bellini', 'Orlando', 'Silvestri', 'Donati', 'Benedetti', 'Vaccaro', 'Cirillo', 'Giordano', 'Sartori', 'Guerra', 'Neri', 'Riva'],
    },
    ING: {
      p: ['Oliver', 'Harry', 'Jack', 'George', 'Aiden', 'Thomas', 'Noah', 'Charlie', 'Jacob', 'Alfie', 'Freddie', 'Oscar', 'Leo', 'Archie', 'Henry', 'Joshua', 'James', 'William', 'Ethan', 'Isaac', 'Max', 'Lucas', 'Logan', 'Alexander', 'Daniel', 'Samuel', 'Joseph', 'Edward', 'Benjamin', 'Dylan', 'Arthur', 'Sebastian', 'Theo', 'Finley', 'Reuben', 'Toby', 'Harrison', 'Lewis', 'Callum', 'Connor', 'Rory', 'Ollie', 'Zak', 'Ewan', 'Kieran'],
      s: ['Clarke', 'Whitfield', 'Hughes', 'Bennett', 'Walsh', 'Harper', 'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Hill', 'Martin', 'Cooper', 'Ward', 'Morris', 'Moore', 'King', 'Watson', 'Baker', 'Turner', 'Collins', 'Parker', 'Edwards', 'Stewart', 'Morgan', 'Bell', 'Murphy', 'Webb', 'Fletcher', 'Barnes', 'Lawson', 'Palmer', 'Carter', 'Shaw'],
    },
    FRA: {
      p: ['Jules', 'Théo', 'Hugo', 'Louis', 'Victor', 'Gabriel', 'Raphaël', 'Arthur', 'Léo', 'Lucas', 'Adam', 'Nathan', 'Tom', 'Noah', 'Ethan', 'Maël', 'Sacha', 'Paul', 'Mathis', 'Timéo', 'Nolan', 'Axel', 'Baptiste', 'Clément', 'Antoine', 'Maxime', 'Romain', 'Esteban', 'Pierre', 'Alexandre', 'Charles', 'Valentin', 'Bastien', 'Florian', 'Kylian', 'Enzo', 'Mathéo', 'Côme', 'Eliott'],
      s: ['Fontaine', 'Marchand', 'Leroy', 'Girard', 'Dubois', 'Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guérin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Morin', 'Mathieu', 'Clément', 'Gauthier', 'Dumont', 'Lopez', 'Fournier', 'Bonnet', 'Lambert', 'Mercier'],
    },
    ALE: {
      p: ['Lukas', 'Felix', 'Jonas', 'Leon', 'Paul', 'Maximilian', 'Ben', 'Elias', 'Noah', 'Luis', 'Finn', 'Emil', 'Anton', 'Theo', 'Moritz', 'Jakob', 'Julian', 'Tim', 'Niklas', 'Jannik', 'Tobias', 'Fabian', 'Sebastian', 'Philipp', 'Florian', 'Mats', 'Ole', 'Henrik', 'Lennard', 'Nico', 'Timo', 'Ralf', 'Kai', 'Bernd'],
      s: ['Brandt', 'Weber', 'Krüger', 'Vogel', 'Schäfer', 'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Hofmann', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Lehmann', 'Köhler', 'Herrmann', 'König', 'Walter', 'Mayer', 'Huber', 'Kaiser', 'Fuchs', 'Peters', 'Lang', 'Scholz', 'Möller', 'Weiß', 'Jung', 'Hahn'],
    },
    HOL: {
      p: ['Daan', 'Sem', 'Lars', 'Thijs', 'Bram', 'Finn', 'Jesse', 'Milan', 'Ruben', 'Luuk', 'Thomas', 'Tim', 'Max', 'Jens', 'Stijn', 'Niels', 'Joost', 'Koen', 'Tijmen', 'Sven', 'Gijs', 'Wout', 'Rik', 'Robin', 'Mats'],
      s: ['Bakker', 'Visser', 'Smit', 'de Jong', 'Jansen', 'de Boer', 'Mulder', 'de Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer', 'de Wit', 'Dijkstra', 'Smits', 'de Graaf', 'van der Meer', 'Kok', 'Jacobs', 'de Haan', 'Vermeulen', 'van den Berg', 'van Dijk', 'Boers', 'Huisman', 'Kuipers', 'Veenstra'],
    },
    ESP: {
      p: ['Pablo', 'Álvaro', 'Diego', 'Iker', 'Hugo', 'Martín', 'Lucas', 'Mateo', 'Leo', 'Daniel', 'Alejandro', 'Manuel', 'Adrián', 'Marcos', 'Javier', 'David', 'Sergio', 'Carlos', 'Jorge', 'Raúl', 'Rubén', 'Gonzalo', 'Íñigo', 'Unai', 'Aitor', 'Asier', 'Marc', 'Pol', 'Arnau', 'Oriol', 'Fernando', 'Jaime', 'Nacho', 'Roberto', 'Andrés'],
      s: ['García', 'Navarro', 'Ruiz', 'Ortega', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Molina', 'Morales', 'Suárez', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Medina', 'Garrido', 'Cortés', 'Castillo'],
    },
    ARG: {
      p: ['Mateo', 'Franco', 'Santiago', 'Thiago', 'Benjamín', 'Joaquín', 'Valentino', 'Bautista', 'Lautaro', 'Felipe', 'Tomás', 'Agustín', 'Facundo', 'Nicolás', 'Ignacio', 'Lucas', 'Gonzalo', 'Juan', 'Emiliano', 'Maximiliano', 'Bruno', 'Ramiro', 'Juan Pablo', 'Esteban'],
      s: ['Ríos', 'Pereyra', 'Acosta', 'Fernández', 'Rodríguez', 'González', 'Gómez', 'Sosa', 'Díaz', 'Romero', 'Benítez', 'Medina', 'Herrera', 'Suárez', 'Aguirre', 'Giménez', 'Molina', 'Castro', 'Ortiz', 'Silva', 'Rojas', 'Luna', 'Ledesma', 'Cabrera', 'Ponce', 'Vera', 'Paz'],
    },
  };
  const PAISES = { br: ['BRA', 'BRA', 'BRA', 'BRA', 'BRA', 'BRA', 'ARG'], eu: ['ITA', 'ITA', 'ING', 'ING', 'FRA', 'ALE', 'HOL', 'ESP', 'BRA'], f4: ['ITA', 'ITA', 'ING', 'ING', 'FRA', 'ALE', 'HOL', 'ESP', 'BRA', 'ARG'] };

  // Patrocinadores por porte: locais no começo, maiores quando o piloto cresce.
  const PATROCINADORES = [
    ['Padaria Pão de Ouro', 'Auto Peças Veloz', 'Pizzaria Bella Napoli', 'Academia Fênix', 'Óticas Visão', 'Açougue do Tonho', 'Lava-Rápido Brilho'],
    ['Supermercado Bom Preço', 'Imobiliária Horizonte', 'Construtora Alicerce', 'Postos Rota', 'Café Serrano', 'Concessionária Vale'],
    ['Banco Atlântico', 'Petroluz', 'TecnoNet', 'Vela Energia', 'Aurora Seguros', 'Brisa Bebidas', 'Halcyon Air'],
  ];

  const Dados = { EQUIPES, EQUIPES_F4, NOMES_EQUIPES, KARTODROMOS, CAMPEONATOS, OLHEIROS, NOMES, PAISES, PATROCINADORES };
  if (typeof module === 'object' && module.exports) module.exports = Dados;
  else root.BoxDados = Dados;
})(this);
