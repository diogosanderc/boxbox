# Textos da App Store (rascunho)

Cada idioma tem a sua ficha no App Store Connect (Versão do app → localização). A loja mostra a ficha do **idioma do iPhone** da pessoa;
quem usa outro idioma vê a ficha do idioma principal (inglês).

Limites da Apple: nome 30 caracteres, subtítulo 30, texto promocional 170, palavras-chave 100 (separadas por vírgula, sem espaço).

Cuidado com marcas: "F1" e "Formula 1" são marcas registradas. Os textos abaixo evitam o nome na vitrine; confira com a diretriz 5.2 (propriedade
intelectual) da Apple antes de publicar.

## Inglês (idioma principal)

- **Nome:** Super Licence
- **Subtítulo:** From karting to the top
- **Texto promocional:** Start in a kart at 12, tune every setup, manage your career and chase the Super Licence that opens the door to the top of motorsport.
- **Palavras-chave:** racing,career,kart,motorsport,driver,tuning,setup,pit stop,tyres,manager,simulator,single seater

**Descrição**

You are 12, in a kart, with a dream: earn the Super Licence and reach the top of motorsport.

Build a career that lasts a lifetime. Pick your team, look after your money, win sponsors and choose which offers to accept as you climb from karting through the junior single-seater ladder to the world championship.

SETUP IS THE GAME
Every track and every condition asks for a different car. Nobody tells you the ideal setup: you find it from what your driver says on the radio. Turn the knobs, watch the car move in 3D and learn what each change does.

REAL RACING DECISIONS
Soft, medium and hard tyres, mandatory pit stops, safety cars, wet races, sprint races and qualifying. When the tyres give up, the team calls "Box, box!" and you choose what goes on the car.

A CAREER, NOT A SINGLE RACE
Grow your driver with development points, race against a team-mate, earn records and achievements, and see how far your story goes.

Free to play: you can play one full season, then the next one opens 24 hours later (or right away if you watch an ad). A one-time Premium purchase removes the wait between seasons and gives you more tyre sets, a better pit crew and telemetry, with no subscription.

Model credits: "F1 2022 {FREE!!}" by 3dblenderlol, "Racing Kart 125cc (low poly)" by sceeth, "Gold Trophy" by urbanmasque and "PODIUM WINNER INTERNATIONAL ZISE 122X366" by eventdesignws, all CC BY 4.0.

## Português do Brasil

- **Nome:** Superlicença
- **Subtítulo:** Do kart ao topo
- **Texto promocional:** Comece num kart aos 12 anos, acerte cada carro, cuide da carreira e persiga a Superlicença que abre a porta do topo do automobilismo.
- **Palavras-chave:** corrida,carreira,kart,automobilismo,piloto,acerto,pit stop,pneus,simulador,monoposto,gerenciar

**Descrição**

Você tem 12 anos, está num kart e tem um sonho: conquistar a Superlicença e chegar ao topo do automobilismo.

Monte uma carreira para a vida toda. Escolha a equipe, cuide do dinheiro, ganhe patrocínios e decida que propostas aceitar enquanto sobe do kart, pelos monopostos de base, até o campeonato mundial.

O ACERTO É O JOGO
Cada pista e cada condição pedem um carro diferente. Ninguém conta qual é o acerto ideal: você descobre pelo que o piloto fala no rádio. Gire os knobs, veja o carro se mexer em 3D e aprenda o que cada mudança faz.

DECISÕES DE CORRIDA DE VERDADE
Pneus macio, médio e duro, parada obrigatória, safety car, corrida na chuva, sprint e classificação. Quando o pneu acaba, a equipe chama "Box, box!" e você escolhe o que vai no carro.

UMA CARREIRA, NÃO UMA CORRIDA
Evolua o piloto com pontos de desenvolvimento, dispute com o companheiro de equipe, conquiste recordes e conquistas e veja até onde vai a sua história.

Grátis para jogar: você joga uma temporada inteira e a próxima abre 24 horas depois (ou na hora, se assistir a um anúncio). Uma compra única do Premium tira a espera entre as temporadas e dá mais jogos de pneus, equipe de box melhor e telemetria, sem assinatura.

Créditos dos modelos 3D: "F1 2022 {FREE!!}" de 3dblenderlol, "Racing Kart 125cc (low poly)" de sceeth, "Gold Trophy" de urbanmasque e "PODIUM WINNER INTERNATIONAL ZISE 122X366" de eventdesignws, todos CC BY 4.0.

## Nome embaixo do ícone

Configurado no projeto (ios/App/App/en.lproj e pt-BR.lproj/InfoPlist.strings): "Super Licence" em inglês e "Superlicença" em português.

## App Store Connect: o que preencher

**URL da política de privacidade:** publique `docs/privacidade.html` (por exemplo com o GitHub Pages do repositório: Settings → Pages →
branch `main`, pasta `/docs`; a URL fica `https://<usuario>.github.io/<repositorio>/privacidade.html`). O e-mail de contato já está na página.
A mesma URL serve de "URL de suporte" se você não tiver outra página.

**App Privacy (rótulo de privacidade).** O app não tem servidor, conta nem análise própria. Quem coleta dados é o SDK do Google Mobile Ads
(anúncios só para quem não tem o Premium). Segundo o Google ([App Store data disclosure](https://developers.google.com/admob/ios/privacy/data-disclosure)),
ele pode tratar: endereço IP (localização aproximada), identificador do aparelho (Device ID), interações com anúncios e dados de publicidade,
dados de desempenho e registros de falhas. Rascunho das respostas (confira com as definições atuais da Apple antes de enviar):

- Coleta dados? **Sim**, só os do SDK de anúncios.
- Tipos: **Identificadores → Device ID**; **Dados de uso → Interação com o produto** e **Dados de publicidade**; **Diagnóstico → Dados de falhas** e **Dados de desempenho**; **Localização → Localização aproximada** (pelo IP).
- Finalidade: **Publicidade de terceiros** (e análises do SDK).
- Vinculado à identidade do usuário? **Não** (não há conta).
- Usado para rastrear? **Não**: o app pede anúncios não personalizados (`npa`) e não usa o pedido de rastreamento (ATT).

**Classificação etária:** responder "sim" para anúncios; sem apostas, sem violência, sem conteúdo sexual. Confirmar a faixa que a Apple sugerir.

**Compra no app:** "Superlicença Premium", compra única (não consumível), ID `com.diogosander.superlicenca.premium`.

**Notas para a revisão:** "O app não exige login. A carreira fica no aparelho. Os anúncios aparecem só na versão gratuita; o Premium (compra única) os remove."

**Atenção, marcas:** "F1", "Formula 1" e "Superlicença" (termo da FIA) são marcas de terceiros. A vitrine evita o nome, mas o jogo usa "Fórmula 1" e "F1" nas telas e
um modelo de carro de F1; decidir se fica assim (risco de questionamento na diretriz 5.2) ou se troca por nomes genéricos antes de enviar.
