# Acerto ideal: fórmulas e valores por pista

> **Atualização:** o kart passou a ter 6 knobs (altura do banco e caster saíram) e a F1, 9 (cambagem, inclinação/rake e mapa do motor saíram). As fórmulas desses knobs continuam descritas abaixo, mas eles não são mais ajustáveis nem entram no desequilíbrio.

Gerado do código (`js/kart.js`). Cada pista tem um acerto ideal escondido, calculado a partir das características da pista (tipo, altitude, retas, curvas, grampos, zebras, asfalto, desnível) e das condições do dia. O quanto o acerto do jogador se afasta do ideal vira perda de tempo, erro, desgaste de pneu e risco de quebra.

## Como o desvio vira perda
- `e = (valor − ideal) / TOLERÂNCIA` por knob; desequilíbrio `d = Σ PESO · máx(0, |e| − 0,5)²` (zona morta: errar menos de meia tolerância não custa nada). Tempo perdido por volta: `mín(3,5; 1,1·d^0,9)`.
- Desgaste de pneu por volta: `0,8 + 0,3·min(d,4) + 0,15·|e pressão| + 0,1·|e eixo/susp. traseira|` (multiplica o desgaste base do asfalto e da categoria).
- Notação: `tipo` = −1 (travada), 0 (mista), +1 (veloz). `clamp(x, a, b)` limita ao intervalo. `T_ar`, `T_pista` em °C. `borracha` 0–1 (pista emborrachada). `alt` em metros.

## Kart (Brasil e Europa): 6 knobs
| Knob | Faixa | Fórmula |
|---|---|---|
| Pressão | 9–20 psi | chuva: 18; seco: `12,5 − (T_pista−30)/10` |
| Bitola traseira | 0–2 | chuva: 1,8; seco: `0,85 + (T_pista−30)/20 + 0,3·borracha` |
| Eixo traseiro | 0–2 | chuva: 0,2; seco: `0,8 + 0,4·tipo + (T_pista−30)/15 + 0,4·borracha` |
| Bitola dianteira | 0–2 | `1 − 0,6·tipo + (chuva ? 0,6 : 0)` |
| Coroa | 76–90 | `82 − 3·tipo + alt/400 + (chuva ? 2 : 0)` |
| Carburação | −3 a +3 | `(20 − T_ar)/7 − alt/500` |

## F4 e F3 (modelo F4): 6 knobs
| Knob | Faixa | Fórmula |
|---|---|---|
| Asa traseira | 1–9 | `5 − 2·tipo + (chuva ? 2,5 : 0) + (T_ar−20)/12 + alt/600` |
| Asa dianteira | 1–9 | `asaTraseira − 0,5 + (T_pista−30)/15` |
| Suspensão | 0–2 | `1 + 0,7·tipo − (zebras altas ? 0,6 : 0) + (sem zebras ? 0,3 : 0) − (chuva ? 0,8 : 0) + 0,3·borracha` |
| Altura | 0–2 | `1 − 0,6·tipo + (chuva ? 0,7 : 0) + (pista ondulada ? 0,4 : 0)` |
| Pressão | 19–27 psi | chuva: 25; seco: `23,5 − (T_pista−30)/8` |
| Relação | 0–2 | `1 + 0,7·tipo − alt/1500 − (chuva ? 0,3 : 0)` |

## F2: 9 knobs (os 6 da F4 + freio, diferencial e mapa)
| Knob | Faixa | Fórmula |
|---|---|---|
| Balanço de freio | 50–62% | `55,5 + 0,8·min(3, grampos) − (chuva ? 2,5 : 0) + (T_pista−30)/20` |
| Diferencial | 0–2 | `1 − 0,8·tipo − (chuva ? 0,7 : 0)` |
| Mapa do motor | 0–2 | `0,25 + 1,6·demanda − (chuva ? 0,5 : 0) − (T_ar>32 ? 0,3 : 0)` |

`demanda = clamp((soma das retas / extensão − 0,15) / 0,3, 0, 1)`.
`colheita = clamp(((lentas + 1,5·grampos + 0,3·médias) / km − 0,7) / 2,5, 0, 1)` (freadas fortes por km, recarrega a bateria).
`escassez = clamp(0,5 + 0,5·(demanda − colheita), 0, 1)`.

## F1: 9 knobs (asas, suspensão, altura, pressão, arrefecimento, freio, diferencial e ERS)
Mantém asas, suspensão, altura, freio e diferencial da F2/F4 (sem a relação de marchas e sem o mapa do motor). Muda ou acrescenta:
| Knob | Faixa | Fórmula |
|---|---|---|
| Piso de pressão (Pirelli) | 20–28 psi | `carga = 0,6·(rápidas/total de curvas) + 0,2·(veloz 1, mista 0,5, travada 0) + 0,2·(abrasivo 1, senão 0,3)`; `piso = 20 + 11·carga` (arredondado a 0,5) |
| Pressão | piso–29 psi | `piso + 1,5 − (T_pista−30)/8` |
| ERS | Curvas/Equilibrado/Retas (0–2) | `1 + 1,6·(escassez − 0,5) − (chuva ? 0,4 : 0)` |
| Arrefecimento | 0–2 | `0,7 + alt/1400 + (T_ar−24)/18 + 0,5·demanda − (chuva ? 0,5 : 0)`; fechado demais superaquece o motor |

## Condições usadas nas tabelas abaixo
- **Seco:** `T_ar = clima da pista`, `T_pista = clima + 11`, borracha 0,8, pneu slick.
- **Chuva:** `T_ar = clima − 3`, `T_pista = clima − 1`, borracha 0, pneu de chuva.
- Valores já arredondados ao passo de cada knob. Opções (Média, Dura etc.) aparecem pelo nome.

## Valores ideais por pista

### Kart – Brasil (Copa Paulista e Brasileiro)

| Pista | Tipo | Alt. | Clima | Cond. | Pressão dos pneus (psi) | Eixo traseiro | Bitola traseira | Bitola dianteira | Relação (coroa) (dentes) | Carburação |
|---|---|---|---|---|---|---|---|---|---|---|
| Kartódromo Internacional da Granja Viana | mista | 853 | 24°C | seco | 12 | Médio | Média | Média | 84 | -2 |
| Kartódromo Internacional da Granja Viana | mista | 853 | 24°C | chuva | 18 | Mole | Larga | Larga | 86 | -2 |
| Aldeia da Serra | travada | 750 | 24°C | seco | 12 | Médio | Média | Larga | 87 | -2 |
| Aldeia da Serra | travada | 750 | 24°C | chuva | 18 | Mole | Larga | Larga | 89 | -2 |
| Kartódromo Municipal Ayrton Senna | veloz | 780 | 23°C | seco | 12 | Duro | Média | Estreita | 81 | -2 |
| Kartódromo Municipal Ayrton Senna | veloz | 780 | 23°C | chuva | 18 | Mole | Larga | Média | 83 | -2 |
| Speed Park | veloz | 406 | 29°C | seco | 11,5 | Duro | Larga | Estreita | 80 | -2 |
| Speed Park | veloz | 406 | 29°C | chuva | 18 | Mole | Larga | Média | 82 | -2 |
| Londrina | mista | 580 | 24°C | seco | 12 | Médio | Média | Média | 83 | -2 |
| Londrina | mista | 580 | 24°C | chuva | 18 | Mole | Larga | Larga | 85 | -1 |
| Tarumã | veloz | 50 | 19°C | seco | 12,5 | Duro | Média | Estreita | 79 | 0 |
| Tarumã | veloz | 50 | 19°C | chuva | 18 | Mole | Larga | Média | 81 | 0 |
| Kartódromo de Brasília | mista | 1100 | 25°C | seco | 12 | Duro | Média | Média | 85 | -3 |
| Kartódromo de Brasília | mista | 1100 | 25°C | chuva | 18 | Mole | Larga | Larga | 87 | -2 |
| Circuito Internacional Paladino | travada | 112 | 30°C | seco | 11,5 | Médio | Larga | Larga | 85 | -2 |
| Circuito Internacional Paladino | travada | 112 | 30°C | chuva | 18 | Mole | Larga | Larga | 87 | -1 |
| Kartódromo Internacional de Betim | mista | 860 | 25°C | seco | 12 | Duro | Média | Média | 84 | -2 |
| Kartódromo Internacional de Betim | mista | 860 | 25°C | chuva | 18 | Mole | Larga | Larga | 86 | -2 |
| Arena Itu | veloz | 583 | 25°C | seco | 12 | Duro | Média | Estreita | 80 | -2 |
| Arena Itu | veloz | 583 | 25°C | chuva | 18 | Mole | Larga | Média | 82 | -1 |

### Kart – Europa (Euro Kart Series)

| Pista | Tipo | Alt. | Clima | Cond. | Pressão dos pneus (psi) | Eixo traseiro | Bitola traseira | Bitola dianteira | Relação (coroa) (dentes) | Carburação |
|---|---|---|---|---|---|---|---|---|---|---|
| South Garda | mista | 100 | 22°C | seco | 12 | Médio | Média | Média | 82 | 0 |
| South Garda | mista | 100 | 22°C | chuva | 18 | Mole | Larga | Larga | 84 | 0 |
| Horensbergdam | veloz | 60 | 17°C | seco | 12,5 | Médio | Média | Estreita | 79 | 0 |
| Horensbergdam | veloz | 60 | 17°C | chuva | 18 | Mole | Larga | Média | 81 | 1 |
| Zuera | mista | 300 | 25°C | seco | 12 | Duro | Média | Média | 83 | -1 |
| Zuera | mista | 300 | 25°C | chuva | 18 | Mole | Larga | Larga | 85 | -1 |
| Circuito Internazionale | travada | 30 | 24°C | seco | 12 | Médio | Média | Larga | 85 | -1 |
| Circuito Internazionale | travada | 30 | 24°C | chuva | 18 | Mole | Larga | Larga | 87 | 0 |
| Le Mans Karting | veloz | 50 | 18°C | seco | 12,5 | Médio | Média | Estreita | 79 | 0 |
| Le Mans Karting | veloz | 50 | 18°C | chuva | 18 | Mole | Larga | Média | 81 | 1 |
| Kristianstad | mista | 20 | 15°C | seco | 13 | Médio | Média | Média | 82 | 1 |
| Kristianstad | mista | 20 | 15°C | chuva | 18 | Mole | Larga | Larga | 84 | 1 |
| Prokart Raceland | veloz | 400 | 16°C | seco | 13 | Médio | Média | Estreita | 80 | 0 |
| Prokart Raceland | veloz | 400 | 16°C | chuva | 18 | Mole | Larga | Média | 82 | 0 |
| Franciacorta | travada | 120 | 23°C | seco | 12 | Médio | Média | Larga | 85 | -1 |
| Franciacorta | travada | 120 | 23°C | chuva | 18 | Mole | Larga | Larga | 87 | 0 |

### F4 Europa Series

| Pista | Tipo | Alt. | Clima | Cond. | Asa dianteira | Asa traseira | Suspensão | Altura do carro | Pressão dos pneus (psi) | Relação do câmbio |
|---|---|---|---|---|---|---|---|---|---|---|
| Imola | mista | 40 | 22°C | seco | 5 | 5 | Média | Média | 23 | Média |
| Imola | mista | 40 | 22°C | chuva | 6 | 7 | Macia | Alta | 25 | Média |
| Misano | travada | 10 | 25°C | seco | 7 | 7 | Média | Alta | 23 | Curta |
| Misano | travada | 10 | 25°C | chuva | 9 | 9 | Macia | Alta | 25 | Curta |
| Monza | veloz | 160 | 23°C | seco | 3 | 4 | Média | Baixa | 23 | Longa |
| Monza | veloz | 160 | 23°C | chuva | 5 | 6 | Macia | Média | 25 | Média |
| Mugello | veloz | 290 | 23°C | seco | 4 | 4 | Dura | Média | 23 | Longa |
| Mugello | veloz | 290 | 23°C | chuva | 5 | 6 | Média | Alta | 25 | Média |
| Vallelunga | travada | 220 | 22°C | seco | 7 | 8 | Macia | Alta | 23 | Curta |
| Vallelunga | travada | 220 | 22°C | chuva | 9 | 9 | Macia | Alta | 25 | Curta |
| Spa-Francorchamps | veloz | 450 | 16°C | seco | 3 | 3 | Dura | Média | 24 | Média |
| Spa-Francorchamps | veloz | 450 | 16°C | chuva | 4 | 6 | Média | Alta | 25 | Média |
| Spielberg | mista | 680 | 18°C | seco | 5 | 6 | Média | Média | 23,5 | Média |
| Spielberg | mista | 680 | 18°C | chuva | 7 | 8 | Macia | Alta | 25 | Curta |
| Le Castellet | mista | 400 | 24°C | seco | 6 | 6 | Média | Média | 23 | Média |
| Le Castellet | mista | 400 | 24°C | chuva | 7 | 8 | Macia | Alta | 25 | Curta |

### Fórmula 3 (usa o modelo da F4)

| Pista | Tipo | Alt. | Clima | Cond. | Asa dianteira | Asa traseira | Suspensão | Altura do carro | Pressão dos pneus (psi) | Relação do câmbio |
|---|---|---|---|---|---|---|---|---|---|---|
| Albert Park | mista | 10 | 21°C | seco | 5 | 5 | Média | Média | 23,5 | Média |
| Albert Park | mista | 10 | 21°C | chuva | 6 | 7 | Macia | Alta | 25 | Média |
| Sakhir | mista | 10 | 27°C | seco | 6 | 6 | Média | Média | 22,5 | Média |
| Sakhir | mista | 10 | 27°C | chuva | 7 | 8 | Macia | Alta | 25 | Média |
| Imola | mista | 40 | 22°C | seco | 5 | 5 | Média | Média | 23 | Média |
| Imola | mista | 40 | 22°C | chuva | 6 | 7 | Macia | Alta | 25 | Média |
| Mônaco | travada | 20 | 22°C | seco | 7 | 7 | Macia | Alta | 23 | Curta |
| Mônaco | travada | 20 | 22°C | chuva | 8 | 9 | Macia | Alta | 25 | Curta |
| Barcelona-Catalunha | mista | 115 | 25°C | seco | 6 | 6 | Média | Média | 23 | Média |
| Barcelona-Catalunha | mista | 115 | 25°C | chuva | 7 | 8 | Macia | Alta | 25 | Média |
| Spielberg | mista | 680 | 18°C | seco | 5 | 6 | Média | Média | 23,5 | Média |
| Spielberg | mista | 680 | 18°C | chuva | 7 | 8 | Macia | Alta | 25 | Curta |
| Silverstone | veloz | 150 | 17°C | seco | 2 | 3 | Dura | Baixa | 24 | Longa |
| Silverstone | veloz | 150 | 17°C | chuva | 4 | 5 | Média | Média | 25 | Média |
| Spa-Francorchamps | veloz | 450 | 16°C | seco | 3 | 3 | Dura | Média | 24 | Média |
| Spa-Francorchamps | veloz | 450 | 16°C | chuva | 4 | 6 | Média | Alta | 25 | Média |
| Hungaroring | travada | 260 | 27°C | seco | 8 | 8 | Média | Alta | 22,5 | Curta |
| Hungaroring | travada | 260 | 27°C | chuva | 9 | 9 | Macia | Alta | 25 | Curta |
| Monza | veloz | 160 | 23°C | seco | 3 | 4 | Média | Baixa | 23 | Longa |
| Monza | veloz | 160 | 23°C | chuva | 5 | 6 | Macia | Média | 25 | Média |

### Fórmula 2

| Pista | Tipo | Alt. | Clima | Cond. | Asa dianteira | Asa traseira | Suspensão | Altura do carro | Pressão dos pneus (psi) | Relação do câmbio | Balanço de freio (%) | Diferencial | Mapa do motor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Albert Park | mista | 10 | 21°C | seco | 5 | 5 | Média | Média | 23,5 | Média | 56 | Médio | Equilibrado |
| Albert Park | mista | 10 | 21°C | chuva | 6 | 7 | Macia | Alta | 25 | Média | 53 | Aberto | Equilibrado |
| Sakhir | mista | 10 | 27°C | seco | 6 | 6 | Média | Média | 22,5 | Média | 58 | Médio | Potência |
| Sakhir | mista | 10 | 27°C | chuva | 7 | 8 | Macia | Alta | 25 | Média | 55 | Aberto | Equilibrado |
| Jeddah Corniche | veloz | 5 | 28°C | seco | 4 | 4 | Dura | Baixa | 22,5 | Longa | 57 | Aberto | Equilibrado |
| Jeddah Corniche | veloz | 5 | 28°C | chuva | 5 | 6 | Média | Média | 25 | Média | 54 | Aberto | Equilibrado |
| Imola | mista | 40 | 22°C | seco | 5 | 5 | Média | Média | 23 | Média | 56 | Médio | Equilibrado |
| Imola | mista | 40 | 22°C | chuva | 6 | 7 | Macia | Alta | 25 | Média | 53 | Aberto | Econômico |
| Mônaco | travada | 20 | 22°C | seco | 7 | 7 | Macia | Alta | 23 | Curta | 56 | Travado | Econômico |
| Mônaco | travada | 20 | 22°C | chuva | 8 | 9 | Macia | Alta | 25 | Curta | 53 | Médio | Econômico |
| Barcelona-Catalunha | mista | 115 | 25°C | seco | 6 | 6 | Média | Média | 23 | Média | 56 | Médio | Equilibrado |
| Barcelona-Catalunha | mista | 115 | 25°C | chuva | 7 | 8 | Macia | Alta | 25 | Média | 53 | Aberto | Econômico |
| Spielberg | mista | 680 | 18°C | seco | 5 | 6 | Média | Média | 23,5 | Média | 57 | Médio | Potência |
| Spielberg | mista | 680 | 18°C | chuva | 7 | 8 | Macia | Alta | 25 | Curta | 54 | Aberto | Equilibrado |
| Silverstone | veloz | 150 | 17°C | seco | 2 | 3 | Dura | Baixa | 24 | Longa | 55 | Aberto | Equilibrado |
| Silverstone | veloz | 150 | 17°C | chuva | 4 | 5 | Média | Média | 25 | Média | 52 | Aberto | Equilibrado |
| Spa-Francorchamps | veloz | 450 | 16°C | seco | 3 | 3 | Dura | Média | 24 | Média | 56 | Aberto | Potência |
| Spa-Francorchamps | veloz | 450 | 16°C | chuva | 4 | 6 | Média | Alta | 25 | Média | 53 | Aberto | Equilibrado |
| Hungaroring | travada | 260 | 27°C | seco | 8 | 8 | Média | Alta | 22,5 | Curta | 58 | Travado | Econômico |
| Hungaroring | travada | 260 | 27°C | chuva | 9 | 9 | Macia | Alta | 25 | Curta | 54 | Médio | Econômico |
| Monza | veloz | 160 | 23°C | seco | 3 | 4 | Média | Baixa | 23 | Longa | 56 | Aberto | Potência |
| Monza | veloz | 160 | 23°C | chuva | 5 | 6 | Macia | Média | 25 | Média | 53 | Aberto | Equilibrado |
| Baku | veloz | -25 | 24°C | seco | 3 | 3 | Dura | Baixa | 23 | Longa | 57 | Aberto | Potência |
| Baku | veloz | -25 | 24°C | chuva | 5 | 6 | Média | Média | 25 | Média | 53 | Aberto | Equilibrado |
| Lusail | veloz | 15 | 27°C | seco | 4 | 4 | Média | Baixa | 22,5 | Longa | 56 | Aberto | Equilibrado |
| Lusail | veloz | 15 | 27°C | chuva | 5 | 6 | Macia | Média | 25 | Média | 53 | Aberto | Econômico |
| Yas Marina | mista | 5 | 28°C | seco | 6 | 6 | Média | Média | 22,5 | Média | 57 | Médio | Equilibrado |
| Yas Marina | mista | 5 | 28°C | chuva | 7 | 8 | Macia | Alta | 25 | Média | 54 | Aberto | Equilibrado |

### Fórmula 1

| Pista | Tipo | Alt. | Clima | Cond. | Asa dianteira | Asa traseira | Suspensão | Altura do carro | Pressão dos pneus (psi) | Arrefecimento | Balanço de freio (%) | Diferencial | Uso do ERS | Piso Pirelli (psi) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Albert Park | mista | 10 | 21°C | seco | 5 | 5 | Média | Média | 25 | Médio | 56 | Médio | Equilibrado | 23,5 |
| Albert Park | mista | 10 | 21°C | chuva | 6 | 7 | Macia | Alta | 26,5 | Fechado | 53 | Aberto | Equilibrado | 23,5 |
| Xangai | mista | 5 | 20°C | seco | 5 | 5 | Média | Média | 24,5 | Médio | 57 | Médio | Equilibrado | 23 |
| Xangai | mista | 5 | 20°C | chuva | 6 | 7 | Macia | Alta | 26 | Fechado | 54 | Aberto | Equilibrado | 23 |
| Suzuka | veloz | 45 | 18°C | seco | 2 | 3 | Dura | Média | 29 | Médio | 56 | Aberto | Equilibrado | 27,5 |
| Suzuka | veloz | 45 | 18°C | chuva | 4 | 5 | Média | Alta | 29 | Fechado | 53 | Aberto | Equilibrado | 27,5 |
| Sakhir | mista | 10 | 27°C | seco | 6 | 6 | Média | Média | 25,5 | Médio | 58 | Médio | Equilibrado | 25 |
| Sakhir | mista | 10 | 27°C | chuva | 7 | 8 | Macia | Alta | 27 | Médio | 55 | Aberto | Equilibrado | 25 |
| Jeddah Corniche | veloz | 5 | 28°C | seco | 4 | 4 | Dura | Baixa | 27,5 | Médio | 57 | Aberto | Equilibrado | 27 |
| Jeddah Corniche | veloz | 5 | 28°C | chuva | 5 | 6 | Média | Média | 29 | Fechado | 54 | Aberto | Equilibrado | 27 |
| Miami | mista | 5 | 29°C | seco | 6 | 6 | Média | Média | 24,5 | Médio | 57 | Médio | Equilibrado | 24 |
| Miami | mista | 5 | 29°C | chuva | 7 | 8 | Macia | Alta | 26 | Médio | 54 | Aberto | Equilibrado | 24 |
| Imola | mista | 40 | 22°C | seco | 5 | 5 | Média | Média | 25 | Médio | 56 | Médio | Equilibrado | 24 |
| Imola | mista | 40 | 22°C | chuva | 6 | 7 | Macia | Alta | 26,5 | Fechado | 53 | Aberto | Equilibrado | 24 |
| Mônaco | travada | 20 | 22°C | seco | 7 | 7 | Macia | Alta | 22,5 | Médio | 56 | Travado | Curvas | 21,5 |
| Mônaco | travada | 20 | 22°C | chuva | 8 | 9 | Macia | Alta | 24 | Fechado | 53 | Médio | Curvas | 21,5 |
| Barcelona-Catalunha | mista | 115 | 25°C | seco | 6 | 6 | Média | Média | 26 | Médio | 56 | Médio | Equilibrado | 25 |
| Barcelona-Catalunha | mista | 115 | 25°C | chuva | 7 | 8 | Macia | Alta | 27,5 | Fechado | 53 | Aberto | Equilibrado | 25 |
| Gilles Villeneuve | veloz | 15 | 22°C | seco | 3 | 3 | Média | Baixa | 25,5 | Médio | 56 | Aberto | Equilibrado | 24,5 |
| Gilles Villeneuve | veloz | 15 | 22°C | chuva | 4 | 5 | Macia | Média | 27 | Fechado | 53 | Aberto | Equilibrado | 24,5 |
| Spielberg | mista | 680 | 18°C | seco | 5 | 6 | Média | Média | 25 | Médio | 57 | Médio | Equilibrado | 23,5 |
| Spielberg | mista | 680 | 18°C | chuva | 7 | 8 | Macia | Alta | 26,5 | Médio | 54 | Aberto | Equilibrado | 23,5 |
| Silverstone | veloz | 150 | 17°C | seco | 2 | 3 | Dura | Baixa | 29 | Médio | 55 | Aberto | Retas | 27,5 |
| Silverstone | veloz | 150 | 17°C | chuva | 4 | 5 | Média | Média | 29 | Fechado | 52 | Aberto | Equilibrado | 27,5 |
| Spa-Francorchamps | veloz | 450 | 16°C | seco | 3 | 3 | Dura | Média | 28,5 | Médio | 56 | Aberto | Retas | 26,5 |
| Spa-Francorchamps | veloz | 450 | 16°C | chuva | 4 | 6 | Média | Alta | 29 | Fechado | 53 | Aberto | Equilibrado | 26,5 |
| Hungaroring | travada | 260 | 27°C | seco | 8 | 8 | Média | Alta | 22 | Médio | 58 | Travado | Equilibrado | 21,5 |
| Hungaroring | travada | 260 | 27°C | chuva | 9 | 9 | Macia | Alta | 23,5 | Fechado | 54 | Médio | Curvas | 21,5 |
| Zandvoort | mista | 5 | 18°C | seco | 4 | 5 | Média | Média | 26 | Fechado | 56 | Médio | Equilibrado | 24,5 |
| Zandvoort | mista | 5 | 18°C | chuva | 6 | 7 | Macia | Alta | 27,5 | Fechado | 53 | Aberto | Curvas | 24,5 |
| Monza | veloz | 160 | 23°C | seco | 3 | 4 | Média | Baixa | 27 | Médio | 56 | Aberto | Retas | 26 |
| Monza | veloz | 160 | 23°C | chuva | 5 | 6 | Macia | Média | 28,5 | Médio | 53 | Aberto | Equilibrado | 26 |
| Baku | veloz | -25 | 24°C | seco | 3 | 3 | Dura | Baixa | 26 | Médio | 57 | Aberto | Equilibrado | 25 |
| Baku | veloz | -25 | 24°C | chuva | 5 | 6 | Média | Média | 27,5 | Médio | 53 | Aberto | Equilibrado | 25 |
| Marina Bay | travada | 10 | 30°C | seco | 8 | 8 | Macia | Alta | 21,5 | Médio | 58 | Travado | Curvas | 21,5 |
| Marina Bay | travada | 10 | 30°C | chuva | 9 | 9 | Macia | Alta | 23 | Fechado | 55 | Médio | Curvas | 21,5 |
| Circuito das Américas | mista | 150 | 26°C | seco | 6 | 6 | Média | Média | 25 | Médio | 57 | Médio | Equilibrado | 24,5 |
| Circuito das Américas | mista | 150 | 26°C | chuva | 7 | 8 | Macia | Alta | 26,5 | Médio | 54 | Aberto | Equilibrado | 24,5 |
| Hermanos Rodríguez | veloz | 2240 | 20°C | seco | 6 | 7 | Média | Baixa | 26,5 | Aberto | 56 | Aberto | Equilibrado | 25 |
| Hermanos Rodríguez | veloz | 2240 | 20°C | chuva | 8 | 9 | Macia | Média | 28 | Aberto | 52 | Aberto | Equilibrado | 25 |
| Interlagos | mista | 780 | 23°C | seco | 6 | 7 | Média | Média | 25,5 | Aberto | 57 | Médio | Equilibrado | 24,5 |
| Interlagos | mista | 780 | 23°C | chuva | 8 | 9 | Macia | Alta | 27 | Médio | 53 | Aberto | Equilibrado | 24,5 |
| Las Vegas | veloz | 620 | 14°C | seco | 3 | 4 | Dura | Baixa | 27 | Médio | 56 | Aberto | Retas | 25 |
| Las Vegas | veloz | 620 | 14°C | chuva | 4 | 6 | Média | Média | 28,5 | Fechado | 53 | Aberto | Equilibrado | 25 |
| Lusail | veloz | 15 | 27°C | seco | 4 | 4 | Média | Baixa | 28 | Médio | 56 | Aberto | Equilibrado | 27,5 |
| Lusail | veloz | 15 | 27°C | chuva | 5 | 6 | Macia | Média | 29 | Fechado | 53 | Aberto | Equilibrado | 27,5 |
| Yas Marina | mista | 5 | 28°C | seco | 6 | 6 | Média | Média | 24,5 | Médio | 57 | Médio | Equilibrado | 24 |
| Yas Marina | mista | 5 | 28°C | chuva | 7 | 8 | Macia | Alta | 26 | Médio | 54 | Aberto | Equilibrado | 24 |
