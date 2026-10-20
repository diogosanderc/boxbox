# Box Box: do kart à Fórmula 1

Você é um piloto de 12 anos começando no kart e também o cabeça da própria carreira: escolhe a equipe,
cuida do dinheiro, busca patrocínio, acerta o kart para cada pista e clima, e decide quais propostas aceitar.
A meta desta primeira fase é sair do kart com uma vaga na Fórmula 4.

## Como jogar

Abra `index.html` no navegador (não precisa de servidor nem instalação). A carreira é salva sozinha no navegador.

1. **Escolha a equipe** entre 10 opções: material do kart, qualidade do mecânico, caixa inicial e custo por etapa.
2. **Paddock:** antes de cada etapa veja a pista e a previsão do tempo, compre pneus, revise o motor, aceite patrocínios
   e avalie propostas de outras equipes (algumas são furada).
3. **Fim de semana:**
   - **Treino livre (manhã):** 4 saídas para a pista. Mexa em pressão, eixo, bitola, relação e carburação.
     Depois de cada saída o piloto diz o que sentiu e o mecânico dá um palpite.
   - **Classificação (tarde):** escolha o acerto e o pneu; eles valem para a corrida. A tarde costuma ser mais quente.
   - **Corrida:** sem pit stop. Ataque, ritmo normal ou poupe pneu. Pode começar a chover no meio da bateria.
4. **Fim de temporada:** evolução do piloto, prêmios e metas de patrocínio. Top 3 ou popularidade alta liberam o campeonato
   seguinte: Copa Regional → Brasileiro → Europeu. Brilhar no Brasileiro ou no Europeu traz proposta de F4.

### O segredo do kart

Cada pista e condição tem um **acerto ideal escondido**. Ele muda com o tipo de pista (travada, mista ou veloz), a altitude,
a temperatura do ar e do asfalto, a borracha acumulada ao longo do dia e a chuva. O jogo nunca mostra esse número:
você descobre pelo cronômetro, pelo que o piloto sente e pelas dicas do mecânico. Um kart desequilibrado é mais lento,
mais irregular, gasta mais pneu e erra mais. Carburação pobre demais pode travar o motor.
O **caderno de acertos** guarda tudo o que você testou em cada pista.

## Código

- `js/kart.js`: física escondida do kart (acerto ideal, efeito no ritmo, clima, falas do piloto e do mecânico).
- `js/carreira.js`: carreira (equipe, dinheiro, patrocínio, olheiros, propostas, fim de semana, campeonato, evolução).
- `js/engine.js`: motor de corrida volta a volta (desgaste, ultrapassagem, quebras), com gancho por volta para acerto e clima.
- `js/data.js`: equipes, kartódromos, campeonatos, nomes e patrocinadores (equipes, pilotos e empresas são fictícios).
- `js/ui.js`: interface.

```bash
npm test   # testes com o runner nativo do Node (18+)
```

## Próximas ideias

- Monopostos: F4, F3, F2 e a Superlicença, com pit stop, asa e acerto aerodinâmico.
- Pistas de rua, ovais e circuitos com subida e descida; previsão do tempo que muda durante o dia.
- Moral e confiança do piloto, preparo físico, redes sociais.
- Empresário: negocia contratos e fareja propostas furadas.
