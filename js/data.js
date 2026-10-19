// Dados fixos do jogo: categorias da escada, circuitos, nomes e patrocinadores (tudo fictício, exceto os circuitos).
(function (root) {
  'use strict';

  // custoVaga: preço médio de uma temporada (milhões de €). idadeMin/idadeMax: faixa para correr.
  // nivel: média de "nota" dos pilotos da categoria. superlicenca: pontos FIA do 1º ao 10º.
  // voltas: fração das voltas de um GP de F1. tempo: multiplicador do tempo de volta.
  // patrocinio: valor base que um patrocinador paga por ano nessa categoria. premio: prêmio do campeão (2º leva metade, 3º um quarto).
  const CATEGORIAS = [
    { id: 'kart', nome: 'Kart', ordem: 0, custoVaga: 0.15, idadeMin: 10, idadeMax: 16, nivel: 60,
      superlicenca: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], patrocinio: 0.08, premio: 0.05, regraCompostos: false, pneuPadrao: 'Md' },
    { id: 'f4', nome: 'Fórmula 4', ordem: 1, custoVaga: 0.4, idadeMin: 15, idadeMax: 19, nivel: 67,
      superlicenca: [12, 10, 7, 5, 3, 2, 1, 0, 0, 0], patrocinio: 0.3, premio: 0.3, voltas: 0.35, tempo: 1.25,
      regraCompostos: false, pneuPadrao: 'Md' },
    { id: 'f3', nome: 'Fórmula 3', ordem: 2, custoVaga: 1.0, idadeMin: 16, idadeMax: 22, nivel: 73,
      superlicenca: [30, 25, 20, 15, 12, 9, 7, 5, 3, 2], patrocinio: 0.7, premio: 0.6, voltas: 0.45, tempo: 1.15,
      regraCompostos: false, pneuPadrao: 'Md' },
    { id: 'f2', nome: 'Fórmula 2', ordem: 3, custoVaga: 2.0, idadeMin: 17, idadeMax: 25, nivel: 78,
      superlicenca: [40, 40, 40, 30, 20, 10, 8, 6, 4, 3], patrocinio: 1.3, premio: 1.2, voltas: 0.6, tempo: 1.08,
      regraCompostos: true },
  ];

  const PONTOS_SUPERLICENCA = 40; // somando os últimos 3 anos
  const IDADE_MIN_F1 = 18;

  const PISTAS = [
    { id: 'melbourne', nome: 'Austrália', circuito: 'Albert Park', voltas: 58, tempoBase: 80.5,
      perdaBox: 19, desgaste: 1.0, ultrapassagem: 0.45, peso: { motor: 1, aero: 1, chassi: 1 } },
    { id: 'sakhir', nome: 'Barém', circuito: 'Sakhir', voltas: 57, tempoBase: 93.5,
      perdaBox: 22, desgaste: 1.3, ultrapassagem: 0.7, peso: { motor: 1.2, aero: 0.9, chassi: 1 } },
    { id: 'monaco', nome: 'Mônaco', circuito: 'Monte Carlo', voltas: 78, tempoBase: 74.0,
      perdaBox: 19, desgaste: 0.7, ultrapassagem: 0.05, peso: { motor: 0.5, aero: 1.4, chassi: 1.3 } },
    { id: 'barcelona', nome: 'Espanha', circuito: 'Barcelona', voltas: 66, tempoBase: 77.5,
      perdaBox: 21, desgaste: 1.15, ultrapassagem: 0.35, peso: { motor: 0.9, aero: 1.3, chassi: 1 } },
    { id: 'silverstone', nome: 'Inglaterra', circuito: 'Silverstone', voltas: 52, tempoBase: 88.0,
      perdaBox: 20, desgaste: 1.2, ultrapassagem: 0.55, peso: { motor: 1, aero: 1.3, chassi: 0.9 } },
    { id: 'spa', nome: 'Bélgica', circuito: 'Spa-Francorchamps', voltas: 44, tempoBase: 106.0,
      perdaBox: 18, desgaste: 1.05, ultrapassagem: 0.75, peso: { motor: 1.3, aero: 1, chassi: 0.9 } },
    { id: 'monza', nome: 'Itália', circuito: 'Monza', voltas: 53, tempoBase: 82.0,
      perdaBox: 23, desgaste: 0.9, ultrapassagem: 0.7, peso: { motor: 1.5, aero: 0.7, chassi: 0.9 } },
    { id: 'interlagos', nome: 'Brasil', circuito: 'Interlagos', voltas: 71, tempoBase: 72.0,
      perdaBox: 21, desgaste: 1.0, ultrapassagem: 0.65, peso: { motor: 1.1, aero: 1, chassi: 1 } },
  ];

  const KARTODROMOS = [
    { id: 'granja', nome: 'Granja Viana', circuito: 'Cotia (BRA)' },
    { id: 'lonato', nome: 'Lonato', circuito: 'South Garda (ITA)' },
    { id: 'genk', nome: 'Genk', circuito: 'Horensbergdam (BEL)' },
    { id: 'zuera', nome: 'Zuera', circuito: 'Zaragoza (ESP)' },
    { id: 'pfi', nome: 'PFI', circuito: 'Brandon (ING)' },
    { id: 'sarno', nome: 'Sarno', circuito: 'Napoli (ITA)' },
    { id: 'suzukak', nome: 'Suzuka Kart', circuito: 'Suzuka (JAP)' },
    { id: 'aldeia', nome: 'Aldeia da Serra', circuito: 'Barueri (BRA)' },
  ].map((k) => ({ ...k, voltas: 18, tempoBase: 48, perdaBox: 25, desgaste: 0.9, ultrapassagem: 0.6,
    peso: { motor: 1, aero: 0.3, chassi: 1.4 } }));

  // Equipes por categoria: nome e cor. A ordem define a força inicial (as primeiras são as melhores).
  const EQUIPES = {
    kart: ['Fulmine Kart', 'Orbital Karting', 'Kartódromo Racing', 'Velox Junior', 'Rapido Corse',
      'Piccolo Team', 'Faísca Kart', 'Tempesta KR', 'Ninja Kart', 'Formiga Racing'],
    f4: ['Apex Junior', 'Lionheart F4', 'Nordic Speed', 'Scorpio Racing', 'Bravo Motorsport',
      'Kite Racing', 'Ironbark F4', 'Delta Corse', 'Cobra Junior', 'Vento Racing'],
    f3: ['Apex F3', 'Monolith Racing', 'Saetta Corse', 'Lionheart F3', 'Halcyon Motorsport',
      'Trinity GP', 'Condor Racing', 'Rocha Motorsport', 'Kraken F3', 'Vento F3'],
    f2: ['Apex F2', 'Monolith GP', 'Saetta Grand Prix', 'Halcyon F2', 'Trinity Racing',
      'Condor F2', 'Meridian Motorsport', 'Kraken F2', 'Rocha F2', 'Aurora F2'],
  };
  const CORES = ['#e10600', '#1e5bc6', '#00d2be', '#ff8700', '#229971', '#0090ff', '#9aa0a6', '#009c3b', '#6692ff', '#b44dff'];

  const EQUIPES_F1 = ['Vortex Racing', 'Scuderia Rossa', 'Silver Arrow GP', 'Papaya Motorsport', 'Verde Racing',
    'Azure Alpine', 'Kestrel F1', 'Bandeirante Racing', 'Bull Junior', 'Sauro Team'];

  const NOMES = {
    BRA: { p: ['Pedro', 'Gabriel', 'Lucas', 'Enzo', 'Caio', 'Rafael', 'Felipe', 'Bruno', 'Thiago', 'Gustavo', 'Matheus', 'Rodrigo', 'Vitor', 'Davi'],
      s: ['Silva', 'Ferraz', 'Monteiro', 'Albuquerque', 'Saraiva', 'Barbosa', 'Moraes', 'Teixeira', 'Rocha', 'Prado', 'Castro', 'Rangel'] },
    ITA: { p: ['Enzo', 'Marco', 'Luca', 'Matteo', 'Andrea', 'Giovanni', 'Lorenzo', 'Alessio'], s: ['Moretti', 'Rossi', 'Bianchi', 'Conti', 'Ferri', 'Galli', 'Romano', 'Lombardi'] },
    ING: { p: ['Oliver', 'Harry', 'Jack', 'George', 'Aiden', 'Thomas', 'James', 'Ollie'], s: ['Clarke', 'Whitfield', 'Hughes', 'Bennett', 'Walsh', 'Turner', 'Harper', 'Price'] },
    FRA: { p: ['Jules', 'Théo', 'Hugo', 'Louis', 'Victor', 'Arthur'], s: ['Fontaine', 'Marchand', 'Leroy', 'Girard', 'Dubois', 'Lambert'] },
    ALE: { p: ['Lukas', 'Felix', 'Jonas', 'Leon', 'Max', 'Paul'], s: ['Brandt', 'Weber', 'Krüger', 'Hoffmann', 'Vogel', 'Schäfer'] },
    HOL: { p: ['Daan', 'Sem', 'Lars', 'Thijs', 'Ruben'], s: ['de Vries', 'Bakker', 'Visser', 'Smit', 'van Dijk'] },
    ESP: { p: ['Pablo', 'Álvaro', 'Diego', 'Sergio', 'Iker'], s: ['García', 'Navarro', 'Ruiz', 'Ortega', 'Molina'] },
    ARG: { p: ['Mateo', 'Franco', 'Santiago', 'Nicolás'], s: ['Ríos', 'Pereyra', 'Acosta', 'Benítez'] },
    JAP: { p: ['Kai', 'Yuki', 'Ren', 'Haruto', 'Sota'], s: ['Nakamura', 'Tanabe', 'Sato', 'Kobayashi', 'Ito'] },
    AUS: { p: ['Jack', 'Cooper', 'Liam', 'Noah'], s: ['Kelly', 'Mitchell', 'Ryan', 'Murray'] },
    EUA: { p: ['Logan', 'Ethan', 'Mason', 'Tyler'], s: ['Carter', 'Reed', 'Brooks', 'Hayes'] },
    NOR: { p: ['Henrik', 'Magnus', 'Sindre'], s: ['Dahl', 'Berg', 'Haugen'] },
    MEX: { p: ['Sergio', 'Emiliano', 'Diego'], s: ['Paredes', 'Herrera', 'Vargas'] },
  };
  // Peso de cada nacionalidade no sorteio (mais europeus, como na vida real).
  const PAISES = ['BRA', 'BRA', 'ITA', 'ITA', 'ING', 'ING', 'ING', 'FRA', 'FRA', 'ALE', 'ALE', 'HOL', 'ESP', 'ARG', 'JAP', 'AUS', 'EUA', 'NOR', 'MEX'];

  const PATROCINADORES = ['Banco Atlântico', 'Petroluz', 'Café Serrano', 'TecnoNet', 'Vela Energia', 'Aurora Seguros',
    'Mercado Rápido', 'Gelato Nord', 'Orbit Telecom', 'Ferro & Aço', 'Kronos Relógios', 'Brisa Bebidas',
    'Nimbus Cloud', 'Atlas Logística', 'Solaris', 'Viva Saúde', 'Pampa Agro', 'Halcyon Air'];

  const Dados = {
    CATEGORIAS, PONTOS_SUPERLICENCA, IDADE_MIN_F1, PISTAS, KARTODROMOS, EQUIPES, CORES, EQUIPES_F1,
    NOMES, PAISES, PATROCINADORES,
  };
  if (typeof module === 'object' && module.exports) module.exports = Dados;
  else root.BoxDados = Dados;
})(this);
