# Xcode, StoreKit e App Store Connect: passo a passo

Tudo o que falta fazer no Mac e no site da Apple para o Superlicença chegar à App Store.
Os nomes dos menus podem variar um pouco conforme a versão do Xcode.

Dados fixos do app:

| Item | Valor |
|---|---|
| Bundle ID | `com.diogosander.superlicenca` |
| Produto Premium (não consumível) | `com.diogosander.superlicenca.premium` |
| Time de assinatura | `2H5Z26H77P` |
| Preço do Premium | US$ 2,99 (a Apple converte para cada país) |
| App ID do AdMob | `ca-app-pub-9207064721204036~9459665923` |
| Política de privacidade | https://diogosanderc.github.io/superlicenca/privacidade.html |

## 1. Preparar o Mac

```
cd ~/Documents/superlicenca
git checkout -- ios/App/App.xcodeproj/project.pbxproj ios/App/CapApp-SPM/Package.swift
git pull
npm install
npm run ios
```

O `Produtos.storekit` já faz parte do projeto (referência no `project.pbxproj`), então ele não se perde quando
você restaura o arquivo.

`npm run ios` copia o jogo para o app e abre o Xcode. O projeto já vem com a capacidade
**In-App Purchase** ligada; confira em *App > Signing & Capabilities*: deve aparecer "In-App Purchase".
Se não aparecer, clique em **+ Capability** e escolha **In-App Purchase**.

## 2. Testar a compra no Xcode (StoreKit local, sem App Store Connect)

O arquivo `ios/App/Produtos.storekit` já tem o produto Premium, com preço de teste US$ 2,99.

1. *Product > Scheme > Edit Scheme…*
2. Aba **Run** > **Options**.
3. Em **StoreKit Configuration**, escolha `Produtos.storekit`.
4. Rode no simulador ou no iPhone (⌘R).
5. No app, toque em qualquer item com cadeado (ou em "Superlicença Premium" no rodapé do paddock) e compre.
   A compra é de mentira e não cobra nada.
6. Para repetir o teste: *Debug > StoreKit > Manage Transactions…* e apague a transação.
   Ali também dá para simular reembolso, "Ask to Buy" e falha de compra.
7. Confira: depois de comprar, o botão do rodapé vira "Premium ativo", os cadeados somem e os anúncios param.
   Toque em **Restaurar compras** na tela do Premium depois de apagar a transação: o app deve avisar que não achou nada.

## 3. App Store Connect: criar o app

1. https://appstoreconnect.apple.com > **Apps** > **+** > **Novo app**.
2. Plataformas: **iOS** (o app também roda no iPad). Nome: **Superlicença** (pt-BR) e **Super Licence** (en).
   Idioma principal: português (Brasil). Bundle ID: `com.diogosander.superlicenca`. SKU: `superlicenca`.
3. Em *Acordos, impostos e bancos*, o acordo de **Apps pagos** precisa estar **Ativo** (dados fiscais e
   bancários preenchidos). Sem ele, a compra dentro do app não funciona nem no sandbox.

## 4. App Store Connect: criar a compra Premium

1. No app: **Monetização > Compras no app** > **+**.
2. Tipo: **Não consumível**.
3. Nome de referência: `Superlicença Premium`. ID do produto: `com.diogosander.superlicenca.premium`
   (tem que ser idêntico, letra por letra; depois de criado não dá para mudar).
4. **Preço**: escolha o nível de US$ 2,99. Confira o valor em reais antes de confirmar.
5. **Localização de exibição** (obrigatória, uma por idioma):
   - Português (Brasil): nome `Superlicença Premium`.
     Descrição: `Cores do carro e do capacete, até 5 patrocinadores, mais pneus no estoque, caderno, equipe de box 3/3, banco, desafio do dia e sem anúncios.`
   - Inglês (EUA ou Reino Unido): nome `Super Licence Premium`.
     Descrição: `Car and helmet colours, up to 5 sponsors, more tyre storage, notebook, pit crew 3/3, bank, daily challenge and no ads.`
6. **Captura de tela da análise**: um print da tela do Premium (a folha com a lista de benefícios e o botão
   de compra). Pode ser o print do iPhone.
7. **Notas de análise** (opcional): "Compra única que libera os recursos Premium. O botão Restaurar compras
   fica na mesma tela."
8. Estado deve ficar **Pronto para enviar**. Na primeira versão, a compra é enviada **junto com o app**:
   na página da versão, em **Compras no app**, marque o Premium.

## 5. Testar com a App Store de verdade (Sandbox)

1. App Store Connect > **Usuários e acesso > Sandbox > Testadores** > **+**: crie um testador com um e-mail
   que não seja um Apple ID real.
2. No iPhone: *Ajustes > App Store > Conta Sandbox* (no fim da tela) e entre com o testador.
3. Rode o app pelo Xcode **sem** a StoreKit Configuration (no scheme, volte para *None*), ou use um build do TestFlight.
4. Compre o Premium: a folha de compra mostra "[Ambiente: Sandbox]". Confirme que libera e que **Restaurar
   compras** funciona num aparelho novo (ou depois de apagar e reinstalar o app).
5. O produto só aparece no app depois de alguns minutos de criado no App Store Connect. Se a tela do Premium
   ficar sem preço, espere e tente de novo.

## 6. AdMob

- O app já usa o App ID e os dois blocos (tela cheia e premiado) do AdMob.
- **Anúncios de teste**: durante o desenvolvimento, não clique nos seus próprios anúncios (a conta pode ser
  suspensa). No AdMob, em *Configurações > Dispositivos de teste*, cadastre o seu iPhone, ou use os blocos de teste
  do Google, que estão nos comentários de `js/anuncios.js`.
- **Mensagem de consentimento (UMP)**: no AdMob, em *Privacidade e mensagens*, crie e publique a mensagem de
  consentimento para o EEE e o Reino Unido. O app já chama o formulário; sem a mensagem publicada, ele não aparece.
- **SKAdNetwork**: o `Info.plist` tem só uma parte da lista de identificadores. Para a receita completa, copie a
  lista atual do Google (developers.google.com/admob/ios/quick-start, seção SKAdNetwork) para `SKAdNetworkItems`.
- **app-ads.txt** (opcional, ajuda na receita): publique o arquivo no domínio informado no App Store Connect.

## 7. Informações do app para a análise da Apple

- **Privacidade do app** (App Store Connect > Privacidade do app): com o AdMob sem personalização, em geral se
  declara "Dados de uso (interação com anúncios)" e "Identificadores de dispositivo", usados para **publicidade
  de terceiros**, não vinculados à identidade e **sem rastreamento** (o app não pede ATT).
  Confira o texto exato no guia do Google "Declarar dados do app para a Apple".
- **Classificação etária**: responda o questionário (corrida, sem violência; compras no app; anúncios).
- **URL de privacidade**: a do quadro acima, nos dois idiomas.
- **Capturas**: as de `docs/capturas/iphone` (1206×2622) e `docs/capturas/ipad` (2048×2732), em pt e en.
- **Texto da ficha e créditos dos modelos 3D**: em `docs/loja.md`. Os modelos são CC BY 4.0 e a licença
  pede o crédito: ele precisa estar na descrição do app.
- **Conta de demonstração**: não precisa (o jogo não tem login).

## 8. Enviar

1. No Xcode: dispositivo **Any iOS Device (arm64)** > *Product > Archive*.
2. Na janela do Organizer: **Distribute App > App Store Connect > Upload**.
3. Em **TestFlight**, espere o processamento, instale pelo app TestFlight e teste a compra de novo (sandbox).
4. Na página da versão: escolha o build, marque a compra Premium, confira capturas, descrição, URLs e
   classificação. **Adicionar para análise**.
5. Antes de enviar, aumente o número do build (*App > General > Build*) se subir outro upload da mesma versão.

## Lista rápida

- [ ] Acordo de Apps pagos ativo
- [ ] Capacidade In-App Purchase no alvo App
- [ ] Teste local com `Produtos.storekit` (compra, restauração, reembolso)
- [ ] App criado no App Store Connect (nome pt-BR e en)
- [ ] Compra `com.diogosander.superlicenca.premium` criada, com preço US$ 2,99, textos e print
- [ ] Testador Sandbox e compra de verdade no aparelho
- [ ] Mensagem UMP publicada no AdMob e iPhone cadastrado como dispositivo de teste
- [ ] Lista de SKAdNetwork completa
- [ ] Privacidade do app, classificação etária, capturas e créditos preenchidos
- [ ] Archive, upload, TestFlight, enviar para análise
