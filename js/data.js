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

  // Equipes de F3, F2 e F1: fictícias, com nomes e cores que lembram as reais.
  // porte: ponta, media ou pequena. salario (só F1): o que a equipe paga ao piloto por etapa.
  const EQUIPES_F3 = [
      { id: 'f3-prima', nome: 'Prima Racing', cor: '#e10600', material: 90, mecanico: 90, caixa: 0, custoEtapa: 9000, organizacao: 86, porte: 'ponta',
        descricao: 'Fábrica de campeões italiana. Carro sempre na frente.' },
      { id: 'f3-arte', nome: 'Arte Grand Prix', cor: '#1a1a1a', material: 89, mecanico: 88, caixa: 0, custoEtapa: 8800, organizacao: 85, porte: 'ponta',
        descricao: 'Francesa, rigorosa e de engenharia fina.' },
      { id: 'f3-trident', nome: 'Tridente Motorsport', cor: '#2b5cff', material: 88, mecanico: 86, caixa: 0, custoEtapa: 8400, organizacao: 84, porte: 'ponta',
        descricao: 'Italiana, rápida em ritmo de corrida.' },
      { id: 'f3-hitec', nome: 'HiTec Pulse', cor: '#ffffff', material: 87, mecanico: 85, caixa: 0, custoEtapa: 8000, organizacao: 84, porte: 'ponta',
        descricao: 'Inglesa, aposta em dados e simulador.' },
      { id: 'f3-campo', nome: 'Campo Racing', cor: '#ff7a00', material: 85, mecanico: 82, caixa: 0, custoEtapa: 7400, organizacao: 80, porte: 'media',
        descricao: 'Espanhola de tradição, boa em pista quente.' },
      { id: 'f3-vanamstel', nome: 'Van Amstel Racing', cor: '#ff9f1c', material: 84, mecanico: 80, caixa: 0, custoEtapa: 7000, organizacao: 78, porte: 'media',
        descricao: 'Holandesa, ótima em formar jovens.' },
      { id: 'f3-polder', nome: 'Polder Motorsport', cor: '#00a19c', material: 83, mecanico: 80, caixa: 0, custoEtapa: 6600, organizacao: 78, porte: 'media',
        descricao: 'Holandesa, cresce a cada temporada.' },
      { id: 'f3-dama', nome: 'Dama Racing', cor: '#7a5cff', material: 82, mecanico: 78, caixa: 0, custoEtapa: 6200, organizacao: 76, porte: 'media',
        descricao: 'Francesa, sempre perto dos pontos.' },
      { id: 'f3-jenner', nome: 'Jenner Motorsport', cor: '#2fbf71', material: 79, mecanico: 72, caixa: 0, custoEtapa: 5400, organizacao: 72, porte: 'pequena',
        descricao: 'Suíça e pequena. Carro honesto, pouco dinheiro.' },
      { id: 'f3-kiwi', nome: 'Kiwi Motorsport', cor: '#9aa0a6', material: 77, mecanico: 70, caixa: 0, custoEtapa: 4800, organizacao: 70, porte: 'pequena',
        descricao: 'Novata, ainda aprendendo a categoria.' },
  ];
  const EQUIPES_F2 = [
      { id: 'f2-prima', nome: 'Prima Racing', cor: '#e10600', material: 91, mecanico: 90, caixa: 0, custoEtapa: 9000, organizacao: 86, porte: 'ponta',
        descricao: 'A mais vitoriosa das categorias de base.' },
      { id: 'f2-arte', nome: 'Arte Grand Prix', cor: '#1a1a1a', material: 90, mecanico: 90, caixa: 0, custoEtapa: 8800, organizacao: 86, porte: 'ponta',
        descricao: 'Leva muitos pilotos direto para a F1.' },
      { id: 'f2-dama', nome: 'Dama Racing', cor: '#7a5cff', material: 88, mecanico: 86, caixa: 0, custoEtapa: 8200, organizacao: 84, porte: 'ponta',
        descricao: 'Francesa, rápida nas pistas de rua.' },
      { id: 'f2-campo', nome: 'Campo Racing', cor: '#ff7a00', material: 88, mecanico: 85, caixa: 0, custoEtapa: 8000, organizacao: 83, porte: 'ponta',
        descricao: 'Espanhola, forte em ritmo de corrida.' },
      { id: 'f2-hitec', nome: 'HiTec Pulse', cor: '#ffffff', material: 86, mecanico: 84, caixa: 0, custoEtapa: 7400, organizacao: 82, porte: 'media',
        descricao: 'Inglesa, muito boa em classificação.' },
      { id: 'f2-invictus', nome: 'Invictus Racing', cor: '#ff3e9a', material: 85, mecanico: 82, caixa: 0, custoEtapa: 7000, organizacao: 80, porte: 'media',
        descricao: 'Ambiciosa, com dinheiro novo e carro bom.' },
      { id: 'f2-polder', nome: 'Polder Motorsport', cor: '#00a19c', material: 84, mecanico: 80, caixa: 0, custoEtapa: 6600, organizacao: 78, porte: 'media',
        descricao: 'Holandesa, regular e organizada.' },
      { id: 'f2-trident', nome: 'Tridente Motorsport', cor: '#2b5cff', material: 83, mecanico: 80, caixa: 0, custoEtapa: 6200, organizacao: 78, porte: 'media',
        descricao: 'Italiana, oscila entre pódio e meio do grid.' },
      { id: 'f2-vanamstel', nome: 'Van Amstel Racing', cor: '#ff9f1c', material: 80, mecanico: 74, caixa: 0, custoEtapa: 5400, organizacao: 72, porte: 'pequena',
        descricao: 'Holandesa, aposta em pilotos estreantes.' },
      { id: 'f2-falcao', nome: 'Desert Falcon Racing', cor: '#c9a227', material: 77, mecanico: 70, caixa: 0, custoEtapa: 4800, organizacao: 70, porte: 'pequena',
        descricao: 'A caçula do grid, com orçamento curto.' },
  ];
  const EQUIPES_F1 = [
      { id: 'f1-rossa', nome: 'Scuderia Rossa', cor: '#dc0000', material: 96, mecanico: 94, caixa: 0, custoEtapa: 9500, organizacao: 88, porte: 'ponta', salario: 220000,
        descricao: 'A equipe mais tradicional do mundo. Pressão enorme e torcida apaixonada.' },
      { id: 'f1-argento', nome: 'Argento Grand Prix', cor: '#00d2be', material: 96, mecanico: 95, caixa: 0, custoEtapa: 9500, organizacao: 92, porte: 'ponta', salario: 200000,
        descricao: 'Flechas de prata: estrutura gigante e engenharia impecável.' },
      { id: 'f1-toro', nome: 'Taurus Energy Racing', cor: '#1e41ff', material: 97, mecanico: 95, caixa: 0, custoEtapa: 9500, organizacao: 90, porte: 'ponta', salario: 200000,
        descricao: 'Bebida energética, carro agressivo e um time obcecado por vencer.' },
      { id: 'f1-papaya', nome: 'Papaya Racing', cor: '#ff8000', material: 97, mecanico: 93, caixa: 0, custoEtapa: 9300, organizacao: 90, porte: 'ponta', salario: 180000,
        descricao: 'Laranja de Woking, de volta ao topo com um carro rapidíssimo.' },
      { id: 'f1-verde', nome: 'Verde Britannia', cor: '#006f62', material: 90, mecanico: 88, caixa: 0, custoEtapa: 8600, organizacao: 84, porte: 'media', salario: 140000,
        descricao: 'Verde inglês, muito dinheiro e vontade de virar equipe grande.' },
      { id: 'f1-grove', nome: 'Grove Racing', cor: '#005aff', material: 89, mecanico: 86, caixa: 0, custoEtapa: 8200, organizacao: 82, porte: 'media', salario: 120000,
        descricao: 'Equipe histórica de Grove, reconstruindo para voltar a vencer.' },
      { id: 'f1-alpes', nome: 'Alpes Bleu', cor: '#0090ff', material: 88, mecanico: 85, caixa: 0, custoEtapa: 8000, organizacao: 80, porte: 'media', salario: 110000,
        descricao: 'Azul francês com motor próprio, ora brilha, ora some.' },
      { id: 'f1-faenza', nome: 'Faenza Junior Team', cor: '#6692ff', material: 88, mecanico: 86, caixa: 0, custoEtapa: 7800, organizacao: 82, porte: 'media', salario: 100000,
        descricao: 'Equipe irmã de uma grande: trampolim para pilotos jovens.' },
      { id: 'f1-stripes', nome: 'Stars & Stripes F1', cor: '#b6babd', material: 86, mecanico: 82, caixa: 0, custoEtapa: 7200, organizacao: 78, porte: 'pequena', salario: 90000,
        descricao: 'Americana e enxuta. Compra peças de quem pode.' },
      { id: 'f1-hinwil', nome: 'Hinwil Motorsport', cor: '#52e252', material: 85, mecanico: 80, caixa: 0, custoEtapa: 7000, organizacao: 78, porte: 'pequena', salario: 80000,
        descricao: 'Suíça, em transição para virar equipe de fábrica.' },
  ];
  const EQUIPES_MONO = { f4: EQUIPES_F4, f3: EQUIPES_F3, f2: EQUIPES_F2, f1: EQUIPES_F1 };

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
      { id: 'granja', tracado: [[40, 150], [250, 150], [275, 135], [265, 115], [150, 105], [130, 90], [150, 75], [255, 60], [270, 40], [250, 25], [90, 25], [55, 40], [70, 70], [45, 95], [30, 125]], nome: 'Kartódromo Internacional da Granja Viana', local: 'Cotia (SP)', tipo: 'mista', altitude: 853, clima: 24, tempoBase: 46.5 },
      { id: 'aldeia', tracado: [[30, 150], [170, 150], [190, 130], [170, 110], [110, 105], [95, 85], [115, 70], [200, 75], [230, 100], [250, 150], [280, 140], [275, 90], [240, 55], [260, 30], [230, 20], [60, 25], [30, 45], [45, 75], [30, 105]], nome: 'Aldeia da Serra', local: 'Barueri (SP)', tipo: 'travada', altitude: 750, clima: 24, tempoBase: 44.0 },
      { id: 'interlagos', tracado: [[30, 40], [260, 30], [285, 55], [260, 75], [140, 85], [130, 105], [150, 120], [265, 125], [285, 150], [260, 165], [45, 160], [20, 135], [40, 100], [25, 70]], nome: 'Kartódromo Municipal Ayrton Senna', local: 'Interlagos, São Paulo (SP)', tipo: 'veloz', altitude: 780, clima: 23, tempoBase: 48.0 },
      { id: 'birigui', tracado: [[30, 130], [110, 50], [150, 30], [255, 30], [280, 55], [255, 80], [180, 90], [175, 110], [255, 125], [275, 150], [250, 165], [55, 165], [25, 150]], nome: 'Speed Park', local: 'Birigui (SP)', tipo: 'veloz', altitude: 406, clima: 29, tempoBase: 50.5 },
      { id: 'londrina', tracado: [[30, 60], [60, 30], [150, 30], [170, 60], [150, 85], [175, 100], [240, 60], [275, 75], [275, 120], [250, 140], [260, 160], [130, 165], [100, 140], [50, 155], [25, 125]], nome: 'Londrina', local: 'Londrina (PR)', tipo: 'mista', altitude: 580, clima: 24, tempoBase: 47.0 },
      { id: 'taruma', tracado: [[40, 35], [250, 30], [280, 55], [240, 80], [215, 105], [270, 140], [240, 165], [55, 160], [25, 135], [80, 105], [85, 80], [30, 60]], nome: 'Tarumã', local: 'Viamão (RS)', tipo: 'veloz', altitude: 50, clima: 19, tempoBase: 49.0 },
      { id: 'brasilia', tracado: [[25, 110], [45, 45], [80, 25], [115, 45], [125, 85], [155, 95], [185, 50], [215, 30], [265, 35], [285, 65], [250, 95], [275, 130], [260, 160], [180, 160], [140, 140], [90, 160], [40, 150]], nome: 'Kartódromo de Brasília', local: 'Brasília (DF)', tipo: 'mista', altitude: 1100, clima: 25, tempoBase: 47.5 },
      { id: 'conde', tracado: [[30, 150], [25, 95], [70, 80], [35, 55], [55, 25], [150, 30], [170, 55], [210, 30], [270, 35], [280, 75], [230, 90], [275, 115], [270, 155], [200, 160], [175, 130], [140, 155]], nome: 'Circuito Internacional Paladino', local: 'Conde (PB)', tipo: 'travada', altitude: 112, clima: 30, tempoBase: 43.5 },
      { id: 'betim', nome: 'Kartódromo Internacional de Betim', local: 'Betim (MG)', tipo: 'mista', altitude: 860, clima: 25, tempoBase: 47.0 },
      { id: 'itu', nome: 'Arena Itu', local: 'Itu (SP)', tipo: 'veloz', altitude: 583, clima: 25, tempoBase: 48.5 },
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
    // Monopostos acima da F4: circuitos reais, na ordem do calendário real (F3 10 etapas, F2 14, F1 24).
    f3: [
      { id: 'melbourne', nome: 'Albert Park', local: 'Melbourne (AUS)', tipo: 'mista', altitude: 10, clima: 21, tempoBase: 94.4 },
      { id: 'bahrein', nome: 'Sakhir', local: 'Sakhir (BRN)', tipo: 'mista', altitude: 10, clima: 27, tempoBase: 108.6 },
      { id: 'imola', nome: 'Imola', local: 'Imola (ITA)', tipo: 'mista', altitude: 40, clima: 22, tempoBase: 90.9 },
      { id: 'monaco', nome: 'Mônaco', local: 'Monte Carlo (MON)', tipo: 'travada', altitude: 20, clima: 22, tempoBase: 85.0 },
      { id: 'barcelona', nome: 'Barcelona-Catalunha', local: 'Montmeló (ESP)', tipo: 'mista', altitude: 115, clima: 25, tempoBase: 88.5 },
      { id: 'spielberg', nome: 'Spielberg', local: 'Spielberg (AUT)', tipo: 'mista', altitude: 680, clima: 18, tempoBase: 77.9 },
      { id: 'silverstone', nome: 'Silverstone', local: 'Silverstone (ING)', tipo: 'veloz', altitude: 150, clima: 17, tempoBase: 103.8 },
      { id: 'spa', nome: 'Spa-Francorchamps', local: 'Stavelot (BEL)', tipo: 'veloz', altitude: 450, clima: 16, tempoBase: 125.1 },
      { id: 'hungaroring', nome: 'Hungaroring', local: 'Mogyoród (HUN)', tipo: 'travada', altitude: 260, clima: 27, tempoBase: 92.0 },
      { id: 'monza', nome: 'Monza', local: 'Monza (ITA)', tipo: 'veloz', altitude: 160, clima: 23, tempoBase: 96.8 },
    ],
    f2: [
      { id: 'melbourne', nome: 'Albert Park', local: 'Melbourne (AUS)', tipo: 'mista', altitude: 10, clima: 21, tempoBase: 88.0 },
      { id: 'bahrein', nome: 'Sakhir', local: 'Sakhir (BRN)', tipo: 'mista', altitude: 10, clima: 27, tempoBase: 101.2 },
      { id: 'jeddah', nome: 'Jeddah Corniche', local: 'Jeddah (SAU)', tipo: 'veloz', altitude: 5, clima: 28, tempoBase: 97.9 },
      { id: 'imola', nome: 'Imola', local: 'Imola (ITA)', tipo: 'mista', altitude: 40, clima: 22, tempoBase: 84.7 },
      { id: 'monaco', nome: 'Mônaco', local: 'Monte Carlo (MON)', tipo: 'travada', altitude: 20, clima: 22, tempoBase: 79.2 },
      { id: 'barcelona', nome: 'Barcelona-Catalunha', local: 'Montmeló (ESP)', tipo: 'mista', altitude: 115, clima: 25, tempoBase: 82.5 },
      { id: 'spielberg', nome: 'Spielberg', local: 'Spielberg (AUT)', tipo: 'mista', altitude: 680, clima: 18, tempoBase: 72.6 },
      { id: 'silverstone', nome: 'Silverstone', local: 'Silverstone (ING)', tipo: 'veloz', altitude: 150, clima: 17, tempoBase: 96.8 },
      { id: 'spa', nome: 'Spa-Francorchamps', local: 'Stavelot (BEL)', tipo: 'veloz', altitude: 450, clima: 16, tempoBase: 116.6 },
      { id: 'hungaroring', nome: 'Hungaroring', local: 'Mogyoród (HUN)', tipo: 'travada', altitude: 260, clima: 27, tempoBase: 85.8 },
      { id: 'monza', nome: 'Monza', local: 'Monza (ITA)', tipo: 'veloz', altitude: 160, clima: 23, tempoBase: 90.2 },
      { id: 'baku', nome: 'Baku', local: 'Baku (AZE)', tipo: 'veloz', altitude: -25, clima: 24, tempoBase: 114.4 },
      { id: 'lusail', nome: 'Lusail', local: 'Lusail (CAT)', tipo: 'veloz', altitude: 15, clima: 27, tempoBase: 92.4 },
      { id: 'abudhabi', nome: 'Yas Marina', local: 'Abu Dhabi (EAU)', tipo: 'mista', altitude: 5, clima: 28, tempoBase: 94.6 },
    ],
    f1: [
      { id: 'melbourne', nome: 'Albert Park', local: 'Melbourne (AUS)', tipo: 'mista', altitude: 10, clima: 21, tempoBase: 80.0 },
      { id: 'xangai', nome: 'Xangai', local: 'Xangai (CHN)', tipo: 'mista', altitude: 5, clima: 20, tempoBase: 94.0 },
      { id: 'suzuka', nome: 'Suzuka', local: 'Suzuka (JAP)', tipo: 'veloz', altitude: 45, clima: 18, tempoBase: 91.0 },
      { id: 'bahrein', nome: 'Sakhir', local: 'Sakhir (BRN)', tipo: 'mista', altitude: 10, clima: 27, tempoBase: 92.0 },
      { id: 'jeddah', nome: 'Jeddah Corniche', local: 'Jeddah (SAU)', tipo: 'veloz', altitude: 5, clima: 28, tempoBase: 89.0 },
      { id: 'miami', nome: 'Miami', local: 'Miami (EUA)', tipo: 'mista', altitude: 5, clima: 29, tempoBase: 89.0 },
      { id: 'imola', nome: 'Imola', local: 'Imola (ITA)', tipo: 'mista', altitude: 40, clima: 22, tempoBase: 77.0 },
      { id: 'monaco', nome: 'Mônaco', local: 'Monte Carlo (MON)', tipo: 'travada', altitude: 20, clima: 22, tempoBase: 72.0 },
      { id: 'barcelona', nome: 'Barcelona-Catalunha', local: 'Montmeló (ESP)', tipo: 'mista', altitude: 115, clima: 25, tempoBase: 75.0 },
      { id: 'montreal', nome: 'Gilles Villeneuve', local: 'Montreal (CAN)', tipo: 'veloz', altitude: 15, clima: 22, tempoBase: 74.0 },
      { id: 'spielberg', nome: 'Spielberg', local: 'Spielberg (AUT)', tipo: 'mista', altitude: 680, clima: 18, tempoBase: 66.0 },
      { id: 'silverstone', nome: 'Silverstone', local: 'Silverstone (ING)', tipo: 'veloz', altitude: 150, clima: 17, tempoBase: 88.0 },
      { id: 'spa', nome: 'Spa-Francorchamps', local: 'Stavelot (BEL)', tipo: 'veloz', altitude: 450, clima: 16, tempoBase: 106.0 },
      { id: 'hungaroring', nome: 'Hungaroring', local: 'Mogyoród (HUN)', tipo: 'travada', altitude: 260, clima: 27, tempoBase: 78.0 },
      { id: 'zandvoort', nome: 'Zandvoort', local: 'Zandvoort (HOL)', tipo: 'mista', altitude: 5, clima: 18, tempoBase: 72.0 },
      { id: 'monza', nome: 'Monza', local: 'Monza (ITA)', tipo: 'veloz', altitude: 160, clima: 23, tempoBase: 82.0 },
      { id: 'baku', nome: 'Baku', local: 'Baku (AZE)', tipo: 'veloz', altitude: -25, clima: 24, tempoBase: 104.0 },
      { id: 'singapura', nome: 'Marina Bay', local: 'Singapura (SGP)', tipo: 'travada', altitude: 10, clima: 30, tempoBase: 93.0 },
      { id: 'austin', nome: 'Circuito das Américas', local: 'Austin (EUA)', tipo: 'mista', altitude: 150, clima: 26, tempoBase: 96.0 },
      { id: 'mexico', nome: 'Hermanos Rodríguez', local: 'Cidade do México (MEX)', tipo: 'veloz', altitude: 2240, clima: 20, tempoBase: 79.0 },
      { id: 'pace', nome: 'Interlagos', local: 'São Paulo (BRA)', tipo: 'mista', altitude: 780, clima: 23, tempoBase: 72.0 },
      { id: 'lasvegas', nome: 'Las Vegas', local: 'Las Vegas (EUA)', tipo: 'veloz', altitude: 620, clima: 14, tempoBase: 95.0 },
      { id: 'lusail', nome: 'Lusail', local: 'Lusail (CAT)', tipo: 'veloz', altitude: 15, clima: 27, tempoBase: 84.0 },
      { id: 'abudhabi', nome: 'Yas Marina', local: 'Abu Dhabi (EAU)', tipo: 'mista', altitude: 5, clima: 28, tempoBase: 86.0 },
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
    betim: { extensao: 1120, largura: 8, sentido: 'anti-horário', retas: [190, 130], curvas: { lentas: 3, medias: 5, rapidas: 3 }, grampos: 1, zebras: 'altas', asfalto: 'abrasivo', desnivel: 'Leve desnível', ultrapassagem: 0.55, ondePassar: 'Freada do fim da reta principal',
      sobre: 'Tradicional de Minas, recebe grandes campeonatos. Mista, no alto (860 m): o motor perde força e a carburação muda. Asfalto áspero, que gasta pneu.' },
    itu: { extensao: 1170, largura: 9, sentido: 'horário', retas: [230, 160], curvas: { lentas: 2, medias: 4, rapidas: 4 }, grampos: 1, zebras: 'baixas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.7, ondePassar: 'Fim da reta principal',
      sobre: 'Rápida e moderna, com retas longas e curvas de alta. Asfalto liso, que poupa pneu; o vácuo ajuda a passar.' },
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
  // Circuitos de F3, F2 e F1 (dados aproximados dos traçados reais).
  Object.assign(FICHAS, {
    melbourne: { extensao: 5278, largura: 14, sentido: 'horário', retas: [800, 650, 500], curvas: { lentas: 4, medias: 6, rapidas: 4 }, grampos: 1, zebras: 'baixas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.6, ondePassar: 'Freada da curva 1 e da curva 11',
      sobre: 'Circuito de rua em volta do lago do Albert Park. Asfalto liso, que fica escorregadio no começo do fim de semana.' },
    xangai: { extensao: 5451, largura: 15, sentido: 'horário', retas: [1170, 600], curvas: { lentas: 5, medias: 6, rapidas: 3 }, grampos: 2, zebras: 'baixas', asfalto: 'medio', desnivel: 'Plana', ultrapassagem: 0.75, ondePassar: 'Grampo no fim da reta de 1,2 km',
      sobre: 'Começa com um caracol que fecha sem parar e termina numa das maiores retas do campeonato. Castiga o pneu dianteiro esquerdo.' },
    suzuka: { extensao: 5807, largura: 12, sentido: 'em oito', retas: [900, 600], curvas: { lentas: 4, medias: 6, rapidas: 8 }, grampos: 1, zebras: 'baixas', asfalto: 'abrasivo', desnivel: 'Subidas e descidas', ultrapassagem: 0.4, ondePassar: 'Freada da chicane antes da reta',
      sobre: 'Traçado em forma de oito, com os esses no primeiro setor e a 130R de pé embaixo. Favorita dos pilotos e muito exigente.' },
    bahrein: { extensao: 5412, largura: 15, sentido: 'horário', retas: [1090, 600, 500], curvas: { lentas: 6, medias: 5, rapidas: 4 }, grampos: 3, zebras: 'baixas', asfalto: 'abrasivo', desnivel: 'Leve desnível', ultrapassagem: 0.8, ondePassar: 'Curva 1, curva 4 e curva 11',
      sobre: 'No meio do deserto, corrida ao entardecer. Freadas fortes e asfalto áspero com areia: o pneu traseiro sofre muito.' },
    jeddah: { extensao: 6174, largura: 13, sentido: 'anti-horário', retas: [1000, 800], curvas: { lentas: 3, medias: 8, rapidas: 16 }, grampos: 1, zebras: 'baixas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.6, ondePassar: 'Grampo da curva 27 e curva 1',
      sobre: 'Circuito de rua mais rápido do mundo, à beira do Mar Vermelho. Muros colados e curvas cegas de alta: erro custa caro.' },
    miami: { extensao: 5412, largura: 13, sentido: 'anti-horário', retas: [1280, 700], curvas: { lentas: 5, medias: 7, rapidas: 7 }, grampos: 1, zebras: 'baixas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.65, ondePassar: 'Freada da curva 11 e da curva 17',
      sobre: 'Em volta do estádio, com calor e umidade fortes. Trecho travado e lento no meio e duas retas longas.' },
    monaco: { extensao: 3337, largura: 9, sentido: 'horário', retas: [500], curvas: { lentas: 11, medias: 5, rapidas: 3 }, grampos: 1, zebras: 'altas', asfalto: 'liso', desnivel: 'Subida forte até o Cassino', ultrapassagem: 0.1, ondePassar: 'Saída do túnel, na freada da chicane',
      sobre: 'As ruas de Monte Carlo: estreitas, sem área de escape e quase sem ultrapassagem. A classificação decide a corrida.' },
    barcelona: { extensao: 4657, largura: 12, sentido: 'horário', retas: [1050], curvas: { lentas: 5, medias: 5, rapidas: 4 }, grampos: 0, zebras: 'baixas', asfalto: 'abrasivo', desnivel: 'Leve desnível', ultrapassagem: 0.45, ondePassar: 'Freada da curva 1',
      sobre: 'Todo mundo testa aqui, então todo mundo conhece. Mistura de curvas de alta e baixa: se o carro anda bem aqui, anda em qualquer lugar.' },
    montreal: { extensao: 4361, largura: 12, sentido: 'anti-horário', retas: [1100, 600], curvas: { lentas: 6, medias: 4, rapidas: 4 }, grampos: 1, zebras: 'altas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.75, ondePassar: 'Grampo e última chicane',
      sobre: 'Numa ilha, com retas e chicanes de zebras altas. O Muro dos Campeões espera quem erra a última chicane.' },
    silverstone: { extensao: 5891, largura: 15, sentido: 'horário', retas: [800, 750, 600], curvas: { lentas: 3, medias: 6, rapidas: 9 }, grampos: 0, zebras: 'baixas', asfalto: 'abrasivo', desnivel: 'Plana', ultrapassagem: 0.7, ondePassar: 'Stowe e Brooklands',
      sobre: 'Antigo aeródromo, casa do automobilismo inglês. Maggotts e Becketts em sequência pedem um carro com muita asa e coragem.' },
    hungaroring: { extensao: 4381, largura: 12, sentido: 'horário', retas: [800], curvas: { lentas: 6, medias: 6, rapidas: 2 }, grampos: 2, zebras: 'baixas', asfalto: 'medio', desnivel: 'Fundo de vale', ultrapassagem: 0.3, ondePassar: 'Freada da curva 1',
      sobre: 'Travada e quente, parece um kartódromo grande. Pouca reta e muita curva: ultrapassar é difícil e a classificação pesa.' },
    zandvoort: { extensao: 4259, largura: 11, sentido: 'horário', retas: [700], curvas: { lentas: 4, medias: 4, rapidas: 6 }, grampos: 1, zebras: 'baixas', asfalto: 'medio', desnivel: 'Dunas, com curvas inclinadas', ultrapassagem: 0.3, ondePassar: 'Freada da Tarzan',
      sobre: 'Entre as dunas do Mar do Norte, com curvas inclinadas e areia que voa para a pista. Estreita e de pouca ultrapassagem.' },
    baku: { extensao: 6003, largura: 10, sentido: 'anti-horário', retas: [2200, 500], curvas: { lentas: 8, medias: 6, rapidas: 6 }, grampos: 1, zebras: 'baixas', asfalto: 'liso', desnivel: 'Subida no trecho do castelo', ultrapassagem: 0.8, ondePassar: 'Fim da reta de 2,2 km',
      sobre: 'Circuito de rua com a maior reta do calendário e um trecho de 7 metros de largura no castelo antigo. Vácuo e caos.' },
    singapura: { extensao: 4940, largura: 11, sentido: 'anti-horário', retas: [800], curvas: { lentas: 11, medias: 6, rapidas: 2 }, grampos: 2, zebras: 'altas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.3, ondePassar: 'Freada da curva 14',
      sobre: 'Corrida noturna nas ruas, com calor e umidade enormes. Muitas curvas lentas e muros: o piloto chega no limite físico.' },
    austin: { extensao: 5513, largura: 15, sentido: 'anti-horário', retas: [1200, 600], curvas: { lentas: 5, medias: 7, rapidas: 8 }, grampos: 1, zebras: 'baixas', asfalto: 'medio', desnivel: 'Subida forte até a curva 1', ultrapassagem: 0.7, ondePassar: 'Curva 1 no alto do morro e curva 12',
      sobre: 'Começa com uma subida íngreme até a curva 1 e copia trechos famosos de outras pistas. Asfalto com ondulações.' },
    mexico: { extensao: 4304, largura: 13, sentido: 'horário', retas: [1300], curvas: { lentas: 5, medias: 6, rapidas: 6 }, grampos: 0, zebras: 'altas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.65, ondePassar: 'Freada da curva 1',
      sobre: 'A 2.240 metros de altitude, o ar rarefeito tira asa e potência. O carro anda com asa máxima e mesmo assim desliza.' },
    pace: { extensao: 4309, largura: 13, sentido: 'anti-horário', retas: [1000, 600], curvas: { lentas: 4, medias: 5, rapidas: 6 }, grampos: 1, zebras: 'altas', asfalto: 'medio', desnivel: 'Subidas e descidas fortes', ultrapassagem: 0.8, ondePassar: 'S do Senna e fim da Reta Oposta',
      sobre: 'O Autódromo José Carlos Pace: sobe e desce, anti-horário e com chuva que chega de repente. Ultrapassagem no S do Senna.' },
    lasvegas: { extensao: 6201, largura: 14, sentido: 'anti-horário', retas: [1900, 800], curvas: { lentas: 6, medias: 6, rapidas: 5 }, grampos: 1, zebras: 'baixas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.8, ondePassar: 'Fim da Strip',
      sobre: 'Corrida de madrugada na Strip, com frio no deserto: o pneu não pega temperatura. Retas enormes e pouca asa.' },
    lusail: { extensao: 5419, largura: 12, sentido: 'horário', retas: [1070], curvas: { lentas: 3, medias: 5, rapidas: 8 }, grampos: 0, zebras: 'altas', asfalto: 'abrasivo', desnivel: 'Plana', ultrapassagem: 0.5, ondePassar: 'Freada da curva 1',
      sobre: 'Feita para motos, cheia de curvas de média e alta em sequência. Muito calor e zebras que machucam o pneu.' },
    abudhabi: { extensao: 5281, largura: 14, sentido: 'anti-horário', retas: [1200, 600], curvas: { lentas: 5, medias: 5, rapidas: 6 }, grampos: 1, zebras: 'baixas', asfalto: 'liso', desnivel: 'Plana', ultrapassagem: 0.65, ondePassar: 'Grampo da curva 5 e curva 9',
      sobre: 'Última etapa do ano, do dia para a noite. A pista esfria durante a corrida e o carro muda de comportamento.' },
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
    // compostos: pneus macio, médio e duro, com parada obrigatória na corrida principal (F2 e F1).
    // sprint: corrida curta no sábado (F2 em toda etapa; F1 em seis GPs, como no calendário real).
    // categoria: modelo do carro ('f4' vale também para a F3; a F2 e a F1 têm carros mais complexos).
    // Depois da F4, sobe-se por proposta: os 4 primeiros de cada categoria são chamados pela seguinte.
    { id: 'f3', nome: 'Fórmula 3 Internacional', curto: 'F3', ordem: 4, etapas: 10, nivel: 79, custo: 6, premios: 2, regiao: 'f3', voltas: 16,
      chuva: 0.25, premioCampeao: 150000, popularidade: 6, categoria: 'f4' },
    { id: 'f2', nome: 'Fórmula 2 Internacional', curto: 'F2', ordem: 5, etapas: 14, nivel: 83, custo: 9, premios: 3, regiao: 'f2', voltas: 18, sprint: true, compostos: true,
      chuva: 0.25, premioCampeao: 300000, popularidade: 8, categoria: 'f2' },
    { id: 'f1', nome: 'Mundial de Fórmula 1', curto: 'F1', ordem: 6, etapas: 24, nivel: 87, custo: 12, premios: 6, regiao: 'f1', voltas: 20, compostos: true, sprint: ['xangai', 'miami', 'spa', 'austin', 'pace', 'lusail'],
      chuva: 0.2, premioCampeao: 1000000, popularidade: 12, categoria: 'f1' },
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
    AUS: {
      p: ['Jack', 'Liam', 'Cooper', 'Harrison', 'Riley', 'Lachlan', 'Mitchell', 'Brodie', 'Callum', 'Darcy', 'Flynn', 'Hayden', 'Jett', 'Kai', 'Lincoln', 'Mason', 'Nate', 'Oscar', 'Ryder', 'Tyson'],
      s: ['Hargreaves', 'Mcintyre', 'Thornton', 'Fairweather', 'Kingsley', 'Pemberton', 'Whitlock', 'Ashby', 'Bramwell', 'Calloway', 'Dunmore', 'Everingham', 'Fitzroy', 'Gillespie', 'Holloway', 'Kilbride', 'Lockwood', 'Merriman', 'Northcott', 'Prendergast'],
    },
    JAP: {
      p: ['Haruto', 'Sota', 'Yuto', 'Ren', 'Kaito', 'Riku', 'Hinata', 'Takumi', 'Daiki', 'Kenta', 'Shota', 'Ryota', 'Hayato', 'Kosei', 'Itsuki', 'Yamato', 'Sora', 'Taiga', 'Asahi', 'Minato'],
      s: ['Fujimoto', 'Hasegawa', 'Ikeda', 'Kawaguchi', 'Matsuda', 'Mori', 'Nishimura', 'Ogawa', 'Sakamoto', 'Shimizu', 'Takeda', 'Uchida', 'Watanabe', 'Yoshida', 'Hirano', 'Kondo', 'Murata', 'Okabe', 'Sugimoto', 'Tamura'],
    },
    MEX: {
      p: ['Emiliano', 'Diego', 'Leonardo', 'Santino', 'Iker', 'Rodrigo', 'Alonso', 'Patricio', 'Gael', 'Ximeno', 'Uriel', 'Sebastián', 'Axel', 'Marcos', 'Andrés', 'Rogelio', 'Ernesto', 'Julián', 'Esteban', 'Octavio'],
      s: ['Villaseñor', 'Arreola', 'Cisneros', 'Echeverría', 'Garza', 'Ibarra', 'Larios', 'Montemayor', 'Najera', 'Ochoa', 'Quezada', 'Robles', 'Salinas', 'Treviño', 'Urquiza', 'Valdivia', 'Zamora', 'Cárdenas', 'Elizondo', 'Fuentes'],
    },
    CAN: {
      p: ['Logan', 'Owen', 'Nolan', 'Félix', 'Xavier', 'Mathis', 'Zachary', 'Carter', 'Hunter', 'Wyatt', 'Jacob', 'Gabriel', 'Olivier', 'Raphaël', 'Tristan', 'Connor', 'Eli', 'Brayden', 'Jayden', 'Rowan'],
      s: ['Tremblay', 'Gagnon', 'Bouchard', 'Gauthier', 'Lapointe', 'Desjardins', 'Leclair', 'Morissette', 'Pelletier', 'Thibodeau', 'Beaulieu', 'Champagne', 'Fortier', 'Lachance', 'Ouellette', 'MacKinnon', 'Fraser', 'Sinclair', 'Whitfield', 'Callahan'],
    },
    BEL: {
      p: ['Arthur', 'Louis', 'Jules', 'Victor', 'Lucas', 'Noah', 'Mathis', 'Wout', 'Lander', 'Senne', 'Rune', 'Bram', 'Jasper', 'Milan', 'Lowie', 'Thibault', 'Émile', 'Cédric', 'Gilles', 'Remco'],
      s: ['Peeters', 'Claes', 'Goossens', 'Wouters', 'Maes', 'Mertens', 'Willems', 'Dubois', 'Lambert', 'Dupont', 'Verstraete', 'De Smet', 'Van Damme', 'Hermans', 'Janssens', 'Lemaire', 'Michiels', 'Segers', 'Thys', 'Vermeulen'],
    },
    ARG: {
      p: ['Mateo', 'Franco', 'Santiago', 'Thiago', 'Benjamín', 'Joaquín', 'Valentino', 'Bautista', 'Lautaro', 'Felipe', 'Tomás', 'Agustín', 'Facundo', 'Nicolás', 'Ignacio', 'Lucas', 'Gonzalo', 'Juan', 'Emiliano', 'Maximiliano', 'Bruno', 'Ramiro', 'Juan Pablo', 'Esteban'],
      s: ['Ríos', 'Pereyra', 'Acosta', 'Fernández', 'Rodríguez', 'González', 'Gómez', 'Sosa', 'Díaz', 'Romero', 'Benítez', 'Medina', 'Herrera', 'Suárez', 'Aguirre', 'Giménez', 'Molina', 'Castro', 'Ortiz', 'Silva', 'Rojas', 'Luna', 'Ledesma', 'Cabrera', 'Ponce', 'Vera', 'Paz'],
    },
  };
  const PAISES = { br: ['BRA', 'BRA', 'BRA', 'BRA', 'BRA', 'BRA', 'ARG'], eu: ['ITA', 'ITA', 'ING', 'ING', 'FRA', 'ALE', 'HOL', 'ESP', 'BRA'], f4: ['ITA', 'ITA', 'ING', 'ING', 'FRA', 'ALE', 'HOL', 'ESP', 'BRA', 'ARG'],
    f3: ['ITA', 'ING', 'ING', 'FRA', 'ALE', 'HOL', 'ESP', 'BRA', 'ARG', 'AUS', 'JAP', 'BEL', 'MEX', 'CAN'],
    f2: ['ITA', 'ING', 'ING', 'FRA', 'ALE', 'HOL', 'ESP', 'BRA', 'ARG', 'AUS', 'JAP', 'BEL', 'MEX', 'CAN'],
    f1: ['ITA', 'ING', 'ING', 'FRA', 'ALE', 'HOL', 'HOL', 'ESP', 'BRA', 'ARG', 'AUS', 'JAP', 'BEL', 'MEX', 'CAN'] };

  // Patrocinadores por porte: locais no começo, maiores quando o piloto cresce.
  const PATROCINADORES = [
    ['Padaria Pão de Ouro', 'Auto Peças Veloz', 'Pizzaria Bella Napoli', 'Academia Fênix', 'Óticas Visão', 'Açougue do Tonho', 'Lava-Rápido Brilho'],
    ['Supermercado Bom Preço', 'Imobiliária Horizonte', 'Construtora Alicerce', 'Postos Rota', 'Café Serrano', 'Concessionária Vale'],
    ['Banco Atlântico', 'Petroluz', 'TecnoNet', 'Vela Energia', 'Aurora Seguros', 'Brisa Bebidas', 'Halcyon Air'],
  ];

  const Dados = { EQUIPES, EQUIPES_F4, EQUIPES_MONO, NOMES_EQUIPES, KARTODROMOS, CAMPEONATOS, OLHEIROS, NOMES, PAISES, PATROCINADORES };
  if (typeof module === 'object' && module.exports) module.exports = Dados;
  else root.BoxDados = Dados;
})(this);
