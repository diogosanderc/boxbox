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
