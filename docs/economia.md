# Economia do jogo (tudo em dólares)

Todo o dinheiro do jogo é em **US$** (em português "US$ 1.250", em inglês "$1,250"), porque no automobilismo
internacional nada é cobrado em real. Os valores partem de custos reais de temporada, **mas boa parte não é pública**:
equipes não divulgam contratos. Onde não há dado oficial, o número é uma estimativa apoiada em relatos de pilotos,
pais e imprensa especializada (kartpulse, FerrariChat, Drexler Formula Cup, ESPN, planetf1, NBC, autosport,
motorsportmagazine). Tratamos tudo como **ordem de grandeza realista**, não como tabela oficial.

## Cobrança da equipe por etapa (média entre as equipes)

| Categoria | Por etapa | Temporada | Referência real |
|---|---|---|---|
| Regional (kart) | US$ 2 mil | ~US$ 16 mil | temporada de kart regional/nacional: US$ 15–40 mil |
| Brasileiro (kart) | US$ 3,7 mil | ~US$ 30 mil | |
| Europeu (kart) | US$ 6,5 mil | ~US$ 52 mil | campeonatos internacionais de kart: US$ 50–100 mil |
| F4 | US$ 18 mil | ~US$ 145 mil | F4 europeia: €100–180 mil |
| F3 | US$ 97 mil | ~US$ 970 mil | F3: US$ 0,6–1,3 mi |
| F2 | US$ 178 mil | ~US$ 2,5 mi | F2: €2–2,5 mi (ESPN, caso Colapinto) |
| F1 | a equipe paga o piloto | | salários de US$ 1,4 mi a US$ 43 mi por ano |

`custo` em `js/data.js` é o multiplicador sobre a base de cada equipe (`custoEtapa`); o resto da economia
(revisão, retífica, psicólogo, preparação, box, vaga de pneu, apoio da família, medalhas) é "constante × custo".

## Itens

- **Caixa inicial no kart:** US$ 10–19 mil (média ~US$ 15 mil), conforme a equipe.
- **jogo de pneus (4):** US$ 300 no regional, US$ 1.650 na F4, US$ 4.800 na F3, US$ 10.800 na F2 (≈US$ 2.700 cada pneu), US$ 12.000 na F1.
- **Mecânico (fim de semana, kart regional):** iniciante US$ 400, experiente US$ 800, profissional US$ 2.000
  (sobe com a categoria até 6×; hora extra de US$ 300 / 800).
- **Revisão do motor:** US$ 900 no regional, US$ 6,8 mil na F4, US$ 34 mil na F3. Retífica: US$ 2,2 mil
  (normal) / US$ 5,4 mil (expressa) no regional.
- **Prêmio de etapa (P1):** US$ 1,1 mil no regional, US$ 3 mil na F4, US$ 13,5 mil na F3, US$ 25 mil na F2, US$ 120 mil na F1.
- **Prêmio de campeão:** US$ 7 mil (regional), 18 mil, 43 mil, 54 mil (F4), 340 mil (F3), 830 mil (F2), 5 mi (F1).
  O 2º recebe metade, o 3º um quarto, o 4º um oitavo.
- **Salário de F1 (por etapa, 24 etapas):** de US$ 60 mil (≈US$ 1,4 mi/ano, equipe pequena) a US$ 1,8 mi
  (≈US$ 43 mi/ano, equipe de ponta); luvas = 5 etapas de salário ao assinar.
- **Banco (Premium):** limite de US$ 7 mil no regional até US$ 10 mi na F1.

Para recalibrar, mude `custo`, `patroc` e `premios` em `CAMPEONATOS` e rode `node carreira-sim.js <seed> ideal|padrao 0`
(o fluxo de caixa de cada categoria mantém a mesma proporção entre receita e custo).

## Peças de F1 e F2 (referência de custo de peça nova)

F1 (estimativas): unidade de potência híbrida US$ 8–11 mi; monocoque 0,63–1,2 mi; câmbio 0,31–0,6 mi; asa dianteira
0,13–0,3 mi; asa traseira com DRS 75–150 mil; assoalho 78–250 mil; hidráulica 155–170 mil; volante 44–100 mil;
halo 15–20 mil; tanque 28–31 mil; eletrônica 50–80 mil; freios 2–69 mil. F2 (estimativas): monocoque 250–500 mil;
motor V6 70–120 mil; câmbio 80–180 mil; asa dianteira 25–60 mil; asa traseira 20–50 mil; assoalho 25–70 mil;
volante 15–35 mil; rodas 4–8 mil; freios 5–15 mil.

No jogo, o desenvolvimento do carro de F1 (1º nível, cada nível seguinte soma mais um pacote): **Aerodinâmica US$ 500 mil**
(asas + assoalho), **Chassi US$ 1,4 mi** (monocoque + câmbio), **Motor US$ 9,5 mi** (unidade de potência).

## Peças da F4 (especificação FIA 2026) e da F3

A F3 não divulga preços: no jogo vale **10% a mais que a F4**.

| Peça | F4 (US$) | F3 (US$, +10%) |
|---|---|---|
| Chassi completo sem motor | 92.220 | 101.442 |
| Célula de sobrevivência de carbono | 43.674 | 48.041 |
| Halo com fixação | 5.672 | 6.239 |
| Arco principal | 1.456 | 1.602 |
| Apoio de cabeça | 2.529 | 2.782 |
| Banco | 1.989 | 2.188 |
| Estrutura frontal de impacto (com bico) | 4.443 | 4.887 |
| Ponta do bico | 458 | 504 |
| Estrutura traseira de impacto | 3.062 | 3.368 |
| Painel frontal antintrusão | 615 | 676 |
| Carroceria superior | 7.354 | 8.089 |
| Carroceria inferior | 6.438 | 7.082 |
| Piso de madeira | 534 | 587 |
| Skid block | 307 | 338 |
| Suspensão dianteira (por lado) | 3.526 | 3.879 |
| Suspensão traseira (por lado) | 3.062 | 3.368 |
| Barra antirrolagem | 383 | 421 |
| Rocker | 887 | 976 |
| Amortecedor | 1.125 | 1.238 |
| Disco de freio | 354 | 389 |
| Pinça de freio | 615 | 676 |
| Pastilhas (4. um eixo) | 307 | 338 |
| Aro de roda (cada) | 412 | 453 |
| Coluna de direção | 1.073 | 1.180 |
| Caixa de direção | 2.604 | 2.864 |
| Volante com display | 4.599 | 5.059 |
| Porca de roda | 122 | 134 |
| Troca de marchas por borboletas | 6.131 | 6.744 |
| Vídeo com dados | 2.297 | 2.527 |
| Kit de instalação da unidade de potência | 9.193 | 10.112 |
