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
    { id: 'tempesta', nome: 'Tempesta KR', cor: '#7a5cff', material: 83, mecanico: 75, caixa: 75000, custoEtapa: 8500, organizacao: 75,
      descricao: 'Boa no molhado. Estrutura média e honesta.' },
    { id: 'faisca', nome: 'Faísca Kart', cor: '#f2c200', material: 81, mecanico: 70, caixa: 65000, custoEtapa: 7500, organizacao: 70,
      descricao: 'Equipe familiar de Cotia, conhece todo kartódromo do Brasil.' },
    { id: 'piccolo', nome: 'Piccolo Team', cor: '#2fbf71', material: 79, mecanico: 78, caixa: 55000, custoEtapa: 6500, organizacao: 82,
      descricao: 'Kart simples, mas o mecânico ensina muito sobre acerto.' },
    { id: 'ninja', nome: 'Ninja Kart', cor: '#9aa0a6', material: 80, mecanico: 52, caixa: 50000, custoEtapa: 5500, organizacao: 50,
      descricao: 'Promete muito e cobra pouco. Ninguém sabe bem como funciona.' },
    { id: 'formiga', nome: 'Formiga Racing', cor: '#b5651d', material: 76, mecanico: 60, caixa: 40000, custoEtapa: 4500, organizacao: 72,
      descricao: 'Garagem pequena, motores usados. Para quem tem garra.' },
    { id: 'garagem', nome: 'Garagem do Zé', cor: '#5b8c5a', material: 73, mecanico: 66, caixa: 32000, custoEtapa: 3500, organizacao: 78,
      descricao: 'O Zé monta tudo sozinho. Barato, honesto e lento.' },
  ];

  // tipo: travada (curvas lentas), mista ou veloz. altitude em metros. clima: temperatura média do ar.
  const KARTODROMOS = {
    br: [
      { id: 'granja', nome: 'Granja Viana', local: 'Cotia (SP)', tipo: 'mista', altitude: 790, clima: 24, tempoBase: 46.5 },
      { id: 'aldeia', nome: 'Aldeia da Serra', local: 'Barueri (SP)', tipo: 'travada', altitude: 750, clima: 24, tempoBase: 44.0 },
      { id: 'interlagos', nome: 'Kartódromo de Interlagos', local: 'São Paulo (SP)', tipo: 'veloz', altitude: 760, clima: 23, tempoBase: 48.0 },
      { id: 'birigui', nome: 'Birigui', local: 'Birigui (SP)', tipo: 'veloz', altitude: 400, clima: 29, tempoBase: 50.5 },
      { id: 'londrina', nome: 'Londrina', local: 'Londrina (PR)', tipo: 'mista', altitude: 580, clima: 24, tempoBase: 47.0 },
      { id: 'taruma', nome: 'Tarumã', local: 'Viamão (RS)', tipo: 'veloz', altitude: 50, clima: 19, tempoBase: 49.0 },
      { id: 'brasilia', nome: 'Kartódromo de Brasília', local: 'Brasília (DF)', tipo: 'mista', altitude: 1100, clima: 25, tempoBase: 47.5 },
      { id: 'conde', nome: 'Conde', local: 'Conde (PB)', tipo: 'travada', altitude: 40, clima: 30, tempoBase: 43.5 },
    ],
    eu: [
      { id: 'lonato', nome: 'South Garda', local: 'Lonato (ITA)', tipo: 'mista', altitude: 100, clima: 22, tempoBase: 47.0 },
      { id: 'genk', nome: 'Horensbergdam', local: 'Genk (BEL)', tipo: 'veloz', altitude: 60, clima: 17, tempoBase: 52.0 },
      { id: 'zuera', nome: 'Zuera', local: 'Zaragoza (ESP)', tipo: 'mista', altitude: 300, clima: 25, tempoBase: 50.0 },
      { id: 'sarno', nome: 'Circuito Internazionale', local: 'Sarno (ITA)', tipo: 'travada', altitude: 30, clima: 24, tempoBase: 46.0 },
      { id: 'lemans', nome: 'Le Mans Karting', local: 'Le Mans (FRA)', tipo: 'veloz', altitude: 50, clima: 18, tempoBase: 51.0 },
      { id: 'kristianstad', nome: 'Kristianstad', local: 'Kristianstad (SUE)', tipo: 'mista', altitude: 20, clima: 15, tempoBase: 49.0 },
      { id: 'wackersdorf', nome: 'Prokart Raceland', local: 'Wackersdorf (ALE)', tipo: 'veloz', altitude: 400, clima: 16, tempoBase: 50.5 },
      { id: 'franciacorta', nome: 'Franciacorta', local: 'Castrezzato (ITA)', tipo: 'travada', altitude: 120, clima: 23, tempoBase: 45.5 },
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
