---
name: myfbox-insights
description: Gera, atualiza e revisa os insights mensais da aba Comparativos do MyFBox pelo MCP local (get_month_comparison, list_insights, save_insight, delete_insight). Use quando o usuário pedir "gere o insight de novembro", "atualize os insights", "o que mudou de outubro para novembro?", "analise meus gastos do mês" ou quando um insight aparecer como desatualizado.
---

# Insights mensais do MyFBox

A aba **Comparativos** do app mostra, mês a mês, entradas, saídas, resultado e variação contra o
mês anterior, e um **insight por mês** escrito por você. O insight fica salvo dentro do cofre
cifrado do usuário. Você lê os números com `get_month_comparison` e grava com `save_insight`
(que cria ou substitui o insight daquele mês).

Pré-requisito: o app precisa estar conectado ao MCP. Se qualquer ferramenta disser que não está,
siga a seção "Conectar" da skill `myfbox` (chame `connect_app` e mostre o link de pareamento).

O insight é **opcional**: o app funciona sem assistente e cada mês já mostra entradas, saídas e
resultado (com quanto falta pagar/receber e a % das entradas que sobra) e as **saídas por
categoria** com participação, valor e variação vs. o mês anterior. Escreva o que esses números
não dizem: tendência entre meses, causas das mudanças, riscos de vencimento e um próximo passo
concreto. Não repita os números que já aparecem no cartão.

## Ferramentas

| Ferramenta | Uso |
|---|---|
| `get_month_comparison { month?, months? }` | Números do mês e dos anteriores (padrão 6 meses). Cada mês traz `income`, `expense` (`paid`, `pending`, `total`), `net`, `transactionCount`, `categories`, `vsPrevious` (variação de entradas, saídas, resultado e `expensePct`), `topChanges` (3 categorias de despesa que mais mudaram) e `insight` (`title`, `updatedAt`, `outdated`). |
| `list_insights { month? }` | Lê os insights já salvos (texto completo). |
| `save_insight { month, title, body, highlights? }` | Cria ou atualiza o insight do mês. |
| `delete_insight { month }` | Remove um insight. Só com pedido do usuário. |
| `list_transactions { month, ... }` | Detalhe dos lançamentos, quando precisar explicar um número. |

Valores vêm em **BRL**. Totais do mês contam **pagos + pendentes** (visão de competência: o que
pertence ao mês). `paid` é o que já saiu ou entrou; `pending` ainda vai acontecer (ou está em atraso,
se o mês já passou).

## Como gerar o insight de um mês

1. **Leia os números**: `get_month_comparison { month: "AAAA-MM", months: 6 }`. Use o último item
   (o mês pedido) e os anteriores como contexto de tendência.
2. **Aprofunde só se precisar**: `list_transactions { month }` para explicar uma mudança grande
   (ex.: qual lançamento fez "Casa" subir).
3. **Escreva** seguindo o formato abaixo e grave com `save_insight`.
4. **Confirme ao usuário** em uma ou duas frases o que foi escrito (título + principal conclusão).
   Não cole o texto inteiro de volta, ele já aparece na aba.

### Formato
- `title`: uma frase curta (até ~80 caracteres) com **a conclusão principal**, não um rótulo.
  Bom: "Sobra prevista de R$ 3,2 mil, mas Casa e Família levam 89% das saídas".
  Ruim: "Resumo de novembro".
- `body`: 2 a 4 parágrafos curtos, separados por **linha em branco**, em português do Brasil, tom
  direto e prático, segunda pessoa ("você"). Cubra, nesta ordem:
  1. **Resultado do mês**: entradas, saídas e quanto sobra ou falta; quanto já está pago vs. pendente.
  2. **O que mudou** vs. o mês anterior (use `vsPrevious` e `topChanges`), com valores. Se não há mês
     anterior com dados, diga que este é o primeiro mês com histórico e descreva a composição.
  3. **Onde está o peso**: as categorias que concentram as saídas (com % do total).
  4. **Atenção / próximo passo**: pendências relevantes (vencidas ou grandes), compromissos que se
     repetem, e uma sugestão concreta (ex.: "reservar R$ 3,3 mil até o dia 09 para o aluguel").
- `highlights` (opcional, até 6): fatos curtos com número, ex.: `"Saídas +R$ 7,3 mil vs. outubro"`,
  `"R$ 180 em atraso (psicólogo de outubro)"`.

### Regras
- **Só use números que vieram das ferramentas.** Não invente, não estime renda futura que não
  esteja lançada. Arredonde para leitura ("R$ 3,2 mil"), mas mantenha valores exatos quando forem
  pequenos ou importantes (contas a pagar).
- Valores monetários no padrão brasileiro: `R$ 1.234,56`. Percentuais com vírgula: `47,2%`.
- Não julgue escolhas pessoais (pensão, ajuda a familiares etc.); descreva e ajude a planejar.
- Se o mês não tem lançamentos, não grave insight: diga ao usuário que não há dados.
- Meses futuros só têm pendentes (contas recorrentes). Pode gerar insight de planejamento, deixando
  claro no texto que são **compromissos previstos**, não gastos realizados.

## Atualizar e manter

- `get_month_comparison` traz `insight.outdated: true` quando os lançamentos do mês mudaram depois
  do insight (o app mostra um aviso âmbar). Para atualizar: releia os números e chame `save_insight`
  de novo para o mesmo mês (substitui o anterior e renova a assinatura).
- "Atualize os insights": rode `get_month_comparison { months: 6 }` e regere só os meses com
  `outdated: true` ou sem insight que tenham lançamentos. Informe quais meses foram atualizados.
- Antes de reescrever um insight que **não** está desatualizado, leia o atual com `list_insights`
  e só substitua se o usuário pediu ou se houver algo materialmente novo.
- `delete_insight` só quando o usuário pedir.

## Exemplo

```json
get_month_comparison { "month": "2026-11", "months": 6 }
save_insight {
  "month": "2026-11",
  "title": "Sobra prevista de R$ 3,4 mil; Casa e Família somam 89% das saídas",
  "body": "Em novembro entram R$ 11,3 mil e saem R$ 7,9 mil, o que deixa R$ 3,4 mil de resultado. Até agora só R$ 600 foram pagos; R$ 7,3 mil ainda vencem neste mês.\n\nComparado a outubro, as saídas subiram R$ 7,7 mil porque as contas fixas (aluguel, pensão, perua, diarista) começaram a ser lançadas em novembro.\n\nCasa (R$ 3,9 mil, 49%) e Família (R$ 3,7 mil, 47%) concentram quase tudo. Atenção ao aluguel de R$ 3.302,63 no dia 09 e à pensão de R$ 3.242 no dia 10: reserve R$ 6,5 mil para a primeira quinzena. Há R$ 180 do psicólogo de outubro em atraso.",
  "highlights": ["Resultado previsto: +R$ 3,4 mil", "R$ 7,3 mil a pagar em novembro", "R$ 180 em atraso de outubro"]
}
```
