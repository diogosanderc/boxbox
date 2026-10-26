# Backlog

## Pit stop interativo (adiado)

Decisão: por enquanto as paradas são automáticas e o jogador não mexe no box. A equipe chama o carro sozinha para a parada
obrigatória da F2 e da F1 e para o pneu de chuva nos monopostos; a parada usa um jogo novo do estoque (mais vagas no Premium ajudam).

O que existiu e foi retirado (dá para recuperar no histórico do git):
- Janela "BOX, BOX!" com rádio da equipe, escolha do composto (com a quantidade de jogos novos e as voltas que cada um aguenta) e a corrida pausada.
  Commits `601b2cc` (janela com knobs) e `82405c7` (versão só com pneu).
- Botão "Chamar para o box" no cartão do carro e botões "Box: pneu de chuva" na F4.
- Aviso automático da janela quando o pneu chegava no limite, quando faltavam poucas voltas para a parada obrigatória e quando começava a chover.

Ideias para quando voltar a pensar nisso:
- Parar quantas vezes quiser, enquanto houver jogo novo no estoque (o estoque do Premium vira vantagem de estratégia).
- Escolher o composto e, talvez, mexer no acerto durante a parada (a versão com knobs ficou longa demais para o celular).
- Estratégia mais clara: undercut/overcut, safety car como janela de parada barata.
- Durações atuais de pneu (acerto equilibrado, asfalto médio): macio ~15 voltas, médio ~22, duro ~30.

## Outros

- Rake, arrefecimento, mapa/ERS e demais ajustes novos da F1 sem fonte quantitativa: revisar com alguém do meio (ver a planilha de revisão do acerto ideal).
- Kart: altura do banco, eixo e bitola variam pouco entre pistas.
- F2: em carreiras com pouco dinheiro, a etapa pode ficar bloqueada por falta de pneu (falta um composto de seco ou o de chuva).
