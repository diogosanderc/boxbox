# Box Box: do kart à Fórmula 1

Você é um piloto de 12 anos começando no kart e também o cabeça da própria carreira: escolhe a equipe,
cuida do dinheiro, busca patrocínio, acerta o kart para cada pista e clima, e decide quais propostas aceitar.
A meta desta primeira fase é sair do kart com uma vaga na Fórmula 4.

## Como jogar

Abra `index.html` no navegador do celular (não precisa de servidor nem instalação). O jogo é feito só para celular: no computador ele aparece numa coluna com largura de telefone. A carreira é salva sozinha no navegador.

1. **Abertura:** toque em **Iniciar jogo** (ou em Continuar, se já tem carreira salva), escreva o **nome do piloto** e,
   depois do carregamento, **escolha a equipe**: só três abrem as portas no começo (uma de ponta, uma intermediária e
   uma pequena, sorteadas a cada jogo). Cada uma mostra kart, mecânico, estrutura, pontos fortes e fracos e quanto
   dinheiro sobra no ano. As outras podem fazer propostas durante a temporada.
2. **Paddock:** antes de cada etapa veja a pista e a previsão do tempo, compre pneus, revise o motor, aceite patrocínios
   e avalie propostas de outras equipes (algumas são furada).
3. **Fim de semana:**
   - **Treino livre (manhã):** 4 saídas para a pista. Mexa em pressão, eixo, bitola, relação e carburação.
     Depois de cada saída o piloto diz o que sentiu. O kart não tem mecânico: o acerto é seu, anotado no caderno.
     Se quiser ajuda, contrate o mecânico da equipe durante o treino (vale só para a etapa e custa caro): ele dá um palpite
     depois de cada saída e pode acertar o kart por você uma vez.
   - **Classificação (tarde):** escolha o acerto e o pneu; eles valem para a corrida. A tarde costuma ser mais quente. Ninguém mexe no kart por você: o acerto é seu.
   - **Corrida:** sem pit stop. No grid ainda dá para mexer em todo o acerto (o motor, não). Pode começar a chover no meio da bateria.
   - **Diagnóstico:** depois da bandeirada o piloto conta o que sentiu e para que lado cada ajuste deveria ter ido
     naquelas condições. O botão **Anotar** guarda isso (e uma anotação sua) no caderno da pista.
4. **Fim de temporada:** evolução do piloto, prêmios e metas de patrocínio. Top 3 ou popularidade alta liberam o campeonato
   seguinte: Copa Regional → Brasileiro → Europeu. Brilhar no Brasileiro ou no Europeu traz proposta de F4.

### O segredo do kart

Cada pista e condição tem um **acerto ideal escondido**. Ele muda com o tipo de pista (travada, mista ou veloz), a altitude,
a temperatura do ar e do asfalto, a borracha acumulada ao longo do dia e a chuva. O jogo nunca mostra esse número:
você descobre pelo cronômetro, pelo que o piloto sente e pelas dicas do mecânico. Um kart desequilibrado é mais lento,
mais irregular, gasta mais pneu e erra mais. Carburação pobre demais ou dentes demais na coroa forçam o motor e podem estourá-lo na corrida.
A retífica é cara: a expressa deixa correr a etapa seguinte; a normal, mais barata, faz o piloto perder uma etapa.
O **caderno de acertos** guarda tudo o que você testou em cada pista. Cada pista tem um **recorde** (tempo, quem fez e quando), mostrado no treino, na
classificação e na corrida: quem fizer uma volta mais rápida, em qualquer sessão, fica com ele.

Cada kartódromo tem uma **ficha** (Ver pista): extensão, largura, sentido, retas, curvas lentas, médias e rápidas,
grampos, zebras, asfalto, desnível e onde dá para ultrapassar. Asfalto abrasivo gasta mais pneu; retas longas facilitam a ultrapassagem.

### Acompanhando a temporada

- **Corrida ao vivo:** volta em destaque, pilotos por sigla com a cor da equipe, status de quem saiu (rodou, quebrou, motor),
  o seu card (posição, largada, posições ganhas, pneu) e avisos quando você ganha ou perde posição.
- **Tabela:** classificação com pontos e sobrenome em destaque, calendário com o seu resultado em cada etapa e a opção de
  **seguir um rival** (★), que aparece no paddock e nos avisos da corrida.
- **Piloto:** gráfico da posição no campeonato etapa a etapa e, depois de duas temporadas, o gráfico da carreira.

### Moral e confiança

- **Confiança** (dentro da pista): sobe quando o piloto termina à frente de onde largou e com pódios; cai com acidentes
  e corridas ruins. Confiança alta dá ritmo e regularidade; baixa faz o piloto frear cedo e errar mais.
- **Moral** (fora da pista): sobe com pódios, patrocínio, troca de equipe e títulos; cai com ordem de equipe, abandonos,
  contas apertadas e etapas perdidas. Moral alta acelera a evolução e deixa o piloto mais claro ao descrever o kart.
- Uma sessão com o psicólogo esportivo por etapa ajuda a recuperar a cabeça.

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
- Preparo físico e redes sociais.
- Empresário: negocia contratos e fareja propostas furadas.
