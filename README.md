# Box Box: do kart à Fórmula 1

Jogo de gestão em que você comanda uma **academia de pilotos**. Você não pilota: descobre talentos no kart,
paga as vagas nas equipes, negocia patrocínios e decide quando cada piloto sobe de categoria. A meta é colocar
pilotos na **Fórmula 1**.

## Como jogar

Abra `index.html` no navegador (não precisa de servidor nem instalação). O jogo salva sozinho no navegador.

### A escada

| Categoria | Idade | Vaga (média/ano) | Superlicença (1º, 2º, 3º) |
|---|---|---|---|
| Kart | 10–16 | €150k | — |
| Fórmula 4 | 15–19 | €400k | 12, 10, 7 |
| Fórmula 3 | 16–22 | €1M | 30, 25, 20 |
| Fórmula 2 | 17–25 | €2M | 40, 40, 40 |

Para ir à F1 o piloto precisa de **40 pontos de Superlicença somando os últimos 3 anos**, ter pelo menos 18 anos
e ser um dos melhores candidatos do ano: as equipes de F1 abrem de 2 a 4 vagas por temporada e escolhem pelo talento.

### O ano da academia

1. **Pré-temporada**
   - **Observação:** garotos do kart e pilotos sem academia. As estrelas são a *estimativa* dos olheiros; o potencial real fica escondido.
   - **Vagas:** escolha categoria e equipe para cada piloto. Equipe melhor tem carro melhor e custa mais. Piloto talentoso paga menos, e a família ajuda a pagar.
   - **Patrocínio:** empresas oferecem dinheiro com uma meta; se ela for cumprida, há bônus no fim do ano.
   - **Academia:** melhore olheiros (estimativas mais precisas) e o centro de treinamento (evolução mais rápida).
2. **Temporada (8 etapas):** assista às corridas dos seus pilotos e comande pelo rádio (atacar, normal ou poupar, além do pit stop) ou deixe simular.
3. **Balanço:** prêmios, metas de patrocínio, pontos de Superlicença, evolução dos pilotos e contratações da F1.

### Dinheiro

- **Entra:** patrocínios, prêmio do top 3 de cada campeonato, escola de pilotagem (cresce com a reputação), taxa de liberação e 15% do salário dos pilotos que chegam à F1.
- **Sai:** vagas, luvas para contratar e a estrutura da academia.
- Terminar o ano no vermelho é falência.

## Código

- `js/engine.js`: motor de corrida volta a volta (pneus, desgaste, pit stop, ultrapassagem, safety car, quebras). Não depende do navegador.
- `js/game.js`: carreira (academia, categorias, economia, evolução dos pilotos, Superlicença, mercado da F1).
- `js/data.js`: categorias, circuitos, equipes, nomes e patrocinadores (pilotos e equipes são fictícios).
- `js/ui.js`: interface.

```bash
npm test   # testes com o runner nativo do Node (18+)
```

## Próximos passos

- Comprar a própria equipe numa categoria de base.
- Chuva, sprint race e testes de pré-temporada.
- Rivais: outras academias disputando os mesmos talentos.
- Personalidade e moral dos pilotos, e empresários tentando roubar seu piloto.
