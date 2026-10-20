// Dados fixos do jogo: equipes de kart, kartódromos, campeonatos, nomes e patrocinadores.
// Equipes, pilotos e empresas são fictícios; os kartódromos são lugares reais.
(function (root) {
  'use strict';

  // material: qualidade do kart e do motor. mecanico: precisão das dicas de acerto.
  // caixa: dinheiro inicial do seu projeto com a equipe. custoEtapa: quanto a equipe cobra por etapa (R$).
  // organizacao: oculto para o jogador; equipes desorganizadas prometem mais do que entregam.
  const EQUIPES = [
    { id: 'fulmine', nome: 'Fulmine Kart', cor: '#e10600', material: 90, mecanico: 92, caixa: 120000, custoEtapa: 14000, organizacao: 90,
      descricao: 'Equipe campeã, material de ponta e o melhor mecânico do paddock. Cara.' },
    { id: 'orbital', nome: 'Orbital Karting', cor: '#1e5bc6', material: 88, mecanico: 80, caixa: 105000, custoEtapa: 12500, organizacao: 85,
      descricao: 'Estrutura grande e organizada. Kart rápido, mecânico bom.' },
    { id: 'velox', nome: 'Velox Junior', cor: '#00b3a4', material: 86, mecanico: 86, caixa: 95000, custoEtapa: 11000, organizacao: 80,
      descricao: 'Especialista em formar pilotos jovens. Mecânico paciente.' },
    { id: 'rapido', nome: 'Rapido Corse', cor: '#ff8700', material: 87, mecanico: 64, caixa: 90000, custoEtapa: 10500, organizacao: 55,
      descricao: 'Chassi italiano muito rápido, mas a equipe é bagunçada.' },
    { id: 'tempesta', nome: 'Tempesta KR', cor: '#7a5cff', material: 83, mecanico: 75, caixa: 80000, custoEtapa: 8500, organizacao: 75,
      descricao: 'Boa no molhado. Estrutura média e honesta.' },
    { id: 'faisca', nome: 'Faísca Kart', cor: '#f2c200', material: 81, mecanico: 70, caixa: 72000, custoEtapa: 7500, organizacao: 70,
      descricao: 'Equipe familiar de Cotia, conhece todo kartódromo do Brasil.' },
    { id: 'piccolo', nome: 'Piccolo Team', cor: '#2fbf71', material: 79, mecanico: 78, caixa: 64000, custoEtapa: 6500, organizacao: 82,
      descricao: 'Kart simples, mas o mecânico ensina muito sobre acerto.' },
    { id: 'ninja', nome: 'Ninja Kart', cor: '#9aa0a6', material: 80, mecanico: 52, caixa: 56000, custoEtapa: 5500, organizacao: 50,
      descricao: 'Promete muito e cobra pouco. Ninguém sabe bem como funciona.' },
    { id: 'formiga', nome: 'Formiga Racing', cor: '#b5651d', material: 76, mecanico: 60, caixa: 55000, custoEtapa: 4500, organizacao: 72,
      descricao: 'Garagem pequena, motores usados. Para quem tem garra.' },
    { id: 'garagem', nome: 'Garagem do Zé', cor: '#5b8c5a', material: 73, mecanico: 66, caixa: 45000, custoEtapa: 3500, organizacao: 78,
      descricao: 'O Zé monta tudo sozinho. Barato, honesto e lento.' },
  ];

  // tipo: travada (curvas lentas), mista ou veloz. altitude em metros. clima: temperatura média do ar.
  // tracado: vértices da linha central da pista (caixa de 300×180), ligados por retas com cantos arredondados.
  const KARTODROMOS = {
    br: [
      { id: 'granja', tracado: [[30, 140], [200, 140], [260, 150], [280, 130], [270, 110], [220, 100], [200, 80], [240, 60], [270, 40], [250, 20], [150, 25], [120, 50], [140, 75], [110, 95], [60, 80], [30, 100], [20, 125]], nome: 'Granja Viana', local: 'Cotia (SP)', tipo: 'mista', altitude: 790, clima: 24, tempoBase: 46.5 },
      { id: 'aldeia', tracado: [[20, 150], [120, 155], [140, 135], [110, 115], [130, 95], [180, 110], [200, 150], [270, 150], [285, 125], [240, 100], [270, 70], [280, 35], [250, 20], [200, 40], [170, 25], [110, 30], [60, 25], [30, 50], [70, 70], [40, 95], [20, 120]], nome: 'Aldeia da Serra', local: 'Barueri (SP)', tipo: 'travada', altitude: 750, clima: 24, tempoBase: 44.0 },
      { id: 'interlagos', tracado: [[20, 60], [30, 30], [260, 25], [285, 45], [270, 70], [150, 80], [130, 100], [160, 120], [270, 125], [285, 150], [260, 165], [40, 160], [15, 140], [25, 110], [60, 95], [40, 80]], nome: 'Kartódromo de Interlagos', local: 'São Paulo (SP)', tipo: 'veloz', altitude: 760, clima: 23, tempoBase: 48.0 },
      { id: 'birigui', tracado: [[30, 120], [120, 40], [150, 25], [260, 30], [285, 55], [270, 80], [200, 90], [190, 110], [250, 130], [270, 155], [240, 165], [60, 160], [25, 145]], nome: 'Birigui', local: 'Birigui (SP)', tipo: 'veloz', altitude: 400, clima: 29, tempoBase: 50.5 },
      { id: 'londrina', tracado: [[25, 50], [60, 25], [140, 30], [160, 55], [140, 80], [170, 95], [230, 60], [275, 70], [280, 110], [240, 125], [260, 150], [230, 165], [120, 160], [90, 135], [50, 150], [20, 130], [40, 100], [20, 80]], nome: 'Londrina', local: 'Londrina (PR)', tipo: 'mista', altitude: 580, clima: 24, tempoBase: 47.0 },
      { id: 'taruma', tracado: [[40, 40], [250, 30], [280, 50], [275, 75], [230, 85], [210, 105], [240, 130], [260, 150], [230, 165], [50, 155], [20, 130], [30, 100], [70, 90], [90, 70], [50, 65], [25, 55]], nome: 'Tarumã', local: 'Viamão (RS)', tipo: 'veloz', altitude: 50, clima: 19, tempoBase: 49.0 },
      { id: 'brasilia', tracado: [[20, 100], [40, 40], [70, 25], [110, 40], [120, 80], [150, 90], [170, 60], [200, 30], [260, 30], [285, 60], [250, 90], [275, 120], [270, 155], [200, 165], [170, 140], [130, 150], [80, 160], [40, 150]], nome: 'Kartódromo de Brasília', local: 'Brasília (DF)', tipo: 'mista', altitude: 1100, clima: 25, tempoBase: 47.5 },
      { id: 'conde', tracado: [[25, 150], [25, 110], [60, 95], [30, 70], [40, 30], [90, 25], [110, 55], [140, 40], [170, 20], [230, 25], [250, 55], [210, 75], [250, 95], [285, 110], [280, 150], [230, 160], [200, 130], [170, 160], [110, 165], [80, 140], [55, 160]], nome: 'Conde', local: 'Conde (PB)', tipo: 'travada', altitude: 40, clima: 30, tempoBase: 43.5 },
    ],
    eu: [
      { id: 'lonato', tracado: [[158, 96], [276, 97], [280, 91], [277, 87], [250, 72], [246, 74], [244, 76], [188, 43], [134, 47], [128, 52], [133, 78], [129, 83], [77, 108], [69, 120], [63, 123], [27, 125], [20, 129], [25, 134], [58, 131], [96, 137], [102, 133], [97, 118], [102, 111], [151, 82], [156, 76], [150, 67], [153, 62], [158, 63], [173, 72], [174, 80], [168, 86], [158, 89], [155, 94]], nome: 'South Garda', local: 'Lonato (ITA)', tipo: 'mista', altitude: 100, clima: 22, tempoBase: 47.0 },
      { id: 'genk', tracado: [[20, 90], [50, 40], [130, 25], [270, 30], [285, 60], [250, 75], [140, 80], [120, 100], [150, 115], [270, 120], [285, 145], [255, 165], [60, 160], [30, 140]], nome: 'Horensbergdam', local: 'Genk (BEL)', tipo: 'veloz', altitude: 60, clima: 17, tempoBase: 52.0 },
      { id: 'zuera', tracado: [[30, 30], [150, 25], [170, 50], [150, 75], [180, 90], [230, 40], [280, 45], [275, 100], [230, 110], [250, 140], [220, 165], [120, 155], [100, 125], [60, 140], [25, 120], [40, 80]], nome: 'Zuera', local: 'Zaragoza (ESP)', tipo: 'mista', altitude: 300, clima: 25, tempoBase: 50.0 },
      { id: 'sarno', tracado: [[20, 130], [30, 40], [70, 25], [90, 60], [120, 30], [160, 25], [175, 60], [140, 80], [170, 100], [220, 70], [250, 30], [285, 50], [270, 90], [240, 110], [280, 130], [260, 165], [180, 160], [150, 130], [110, 160], [50, 165]], nome: 'Circuito Internazionale', local: 'Sarno (ITA)', tipo: 'travada', altitude: 30, clima: 24, tempoBase: 46.0 },
      { id: 'lemans', tracado: [[25, 120], [30, 50], [80, 25], [270, 35], [285, 70], [255, 90], [160, 95], [150, 120], [270, 135], [280, 160], [50, 165]], nome: 'Le Mans Karting', local: 'Le Mans (FRA)', tipo: 'veloz', altitude: 50, clima: 18, tempoBase: 51.0 },
      { id: 'kristianstad', tracado: [[20, 60], [60, 25], [200, 30], [230, 60], [200, 85], [240, 100], [280, 90], [285, 140], [250, 160], [150, 150], [130, 120], [90, 150], [30, 160], [15, 120], [50, 95]], nome: 'Kristianstad', local: 'Kristianstad (SUE)', tipo: 'mista', altitude: 20, clima: 15, tempoBase: 49.0 },
      { id: 'wackersdorf', tracado: [[30, 150], [20, 110], [60, 90], [40, 60], [60, 30], [250, 25], [285, 50], [260, 80], [180, 90], [170, 110], [270, 120], [285, 150], [250, 165]], nome: 'Prokart Raceland', local: 'Wackersdorf (ALE)', tipo: 'veloz', altitude: 400, clima: 16, tempoBase: 50.5 },
      { id: 'franciacorta', tracado: [[25, 40], [80, 25], [100, 55], [80, 80], [120, 95], [150, 60], [140, 30], [200, 25], [220, 55], [260, 30], [285, 60], [250, 90], [280, 120], [260, 160], [200, 150], [180, 120], [150, 150], [100, 165], [40, 160], [20, 120], [55, 95], [30, 70]], nome: 'Franciacorta', local: 'Castrezzato (ITA)', tipo: 'travada', altitude: 120, clima: 23, tempoBase: 45.5 },
    ],
  };

  // nivel: força média dos rivais. custo: multiplicador dos custos. chuva: chance média de chuva por etapa.
  const CAMPEONATOS = [
    { id: 'regional', nome: 'Copa Paulista de Kart', curto: 'Regional', ordem: 0, nivel: 57, custo: 1, regiao: 'br', voltas: 16,
      chuva: 0.25, premioCampeao: 20000, popularidade: 1 },
    { id: 'nacional', nome: 'Campeonato Brasileiro de Kart', curto: 'Brasileiro', ordem: 1, nivel: 63, custo: 1.8, regiao: 'br', voltas: 18,
      chuva: 0.25, premioCampeao: 50000, popularidade: 1.8 },
    { id: 'internacional', nome: 'Euro Kart Series', curto: 'Europeu', ordem: 2, nivel: 69, custo: 3.2, regiao: 'eu', voltas: 20,
      chuva: 0.3, premioCampeao: 120000, popularidade: 3 },
  ];

  // Quem pode aparecer no paddock observando. nivelMin: a partir de qual campeonato aparece.
  const OLHEIROS = [
    { id: 'apex-f4', nome: 'Apex Junior (F4)', tipo: 'f4', nivelMin: 1 },
    { id: 'lionheart-f4', nome: 'Lionheart F4', tipo: 'f4', nivelMin: 1 },
    { id: 'scorpio-f4', nome: 'Scorpio Racing (F4)', tipo: 'f4', nivelMin: 1 },
    { id: 'vortex-academia', nome: 'Academia Vortex (equipe de F1)', tipo: 'academia', nivelMin: 2 },
    { id: 'rossa-academia', nome: 'Programa Jovens Rossa (equipe de F1)', tipo: 'academia', nivelMin: 2 },
  ];

  const NOMES = {
    BRA: { p: ['Pedro', 'Gabriel', 'Lucas', 'Enzo', 'Caio', 'Rafael', 'Felipe', 'Bruno', 'Thiago', 'Gustavo', 'Matheus', 'Rodrigo', 'Vitor', 'Davi', 'Arthur', 'Miguel'],
      s: ['Silva', 'Ferraz', 'Monteiro', 'Albuquerque', 'Saraiva', 'Barbosa', 'Moraes', 'Teixeira', 'Rocha', 'Prado', 'Castro', 'Rangel', 'Lacerda', 'Pacheco'] },
    ITA: { p: ['Enzo', 'Marco', 'Luca', 'Matteo', 'Andrea', 'Lorenzo', 'Alessio'], s: ['Moretti', 'Bianchi', 'Conti', 'Ferri', 'Galli', 'Romano', 'Lombardi'] },
    ING: { p: ['Oliver', 'Harry', 'Jack', 'George', 'Aiden', 'Thomas'], s: ['Clarke', 'Whitfield', 'Hughes', 'Bennett', 'Walsh', 'Harper'] },
    FRA: { p: ['Jules', 'Théo', 'Hugo', 'Louis', 'Victor'], s: ['Fontaine', 'Marchand', 'Leroy', 'Girard', 'Dubois'] },
    ALE: { p: ['Lukas', 'Felix', 'Jonas', 'Leon', 'Paul'], s: ['Brandt', 'Weber', 'Krüger', 'Vogel', 'Schäfer'] },
    HOL: { p: ['Daan', 'Sem', 'Lars', 'Thijs'], s: ['de Vries', 'Bakker', 'Visser', 'Smit'] },
    ESP: { p: ['Pablo', 'Álvaro', 'Diego', 'Iker'], s: ['García', 'Navarro', 'Ruiz', 'Ortega'] },
    ARG: { p: ['Mateo', 'Franco', 'Santiago'], s: ['Ríos', 'Pereyra', 'Acosta'] },
  };
  const PAISES = { br: ['BRA', 'BRA', 'BRA', 'BRA', 'BRA', 'BRA', 'ARG'], eu: ['ITA', 'ITA', 'ING', 'ING', 'FRA', 'ALE', 'HOL', 'ESP', 'BRA'] };

  // Patrocinadores por porte: locais no começo, maiores quando o piloto cresce.
  const PATROCINADORES = [
    ['Padaria Pão de Ouro', 'Auto Peças Veloz', 'Pizzaria Bella Napoli', 'Academia Fênix', 'Óticas Visão', 'Açougue do Tonho', 'Lava-Rápido Brilho'],
    ['Supermercado Bom Preço', 'Imobiliária Horizonte', 'Construtora Alicerce', 'Postos Rota', 'Café Serrano', 'Concessionária Vale'],
    ['Banco Atlântico', 'Petroluz', 'TecnoNet', 'Vela Energia', 'Aurora Seguros', 'Brisa Bebidas', 'Halcyon Air'],
  ];

  const Dados = { EQUIPES, KARTODROMOS, CAMPEONATOS, OLHEIROS, NOMES, PAISES, PATROCINADORES };
  if (typeof module === 'object' && module.exports) module.exports = Dados;
  else root.BoxDados = Dados;
})(this);
