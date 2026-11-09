---
name: myfbox
description: Opera o cofre financeiro MyFBox pelo servidor MCP local (mcp__myfbox__*) — consultar saldos e gastos do mês, listar/criar contas e transferir entre elas (com conversão multimoeda), listar e criar categorias, definir metas, registrar/editar/dar baixa/excluir lançamentos (inclusive parcelados e nas 16 moedas globais/cripto suportadas), e gerenciar cotações de moedas offline. Use quando o usuário pedir algo como "registre um gasto", "quanto gastei em mercado", "crie uma conta em Euro", "transfira R$ 500 para a Reserva", "crie a categoria Pets", "marque o aluguel como pago", "defina a cotação do dólar para 5,85" ou "conecte ao MyFBox".
---

# MyFBox via MCP local

O MyFBox é um app de finanças **local-first**: o cofre fica cifrado (AES-256-GCM) no navegador
do usuário. O servidor MCP `myfbox` (`mcp/server.mjs`, registrado em `.mcp.json`) não lê o cofre
sozinho: ele encaminha cada ferramenta para o **app aberto e desbloqueado**, por uma ponte só em
`127.0.0.1`. A senha e a chave nunca saem do navegador.

Consequências práticas:
- O **Modo MCP local vem desligado**. Só funciona depois que o usuário autoriza pelo link de pareamento.
- Se o usuário **trancar** o app (ou o auto-bloqueio por inatividade disparar), todas as
  ferramentas passam a responder "app não está conectado". Ações do MCP **não** contam como
  atividade, então não mantêm o cofre aberto. Peça para o usuário desbloquear e tente de novo.
- Tudo o que você faz aparece no app como aviso ("MCP registrou ..."), e é gravado cifrado
  pelo mesmo caminho da interface.

## 1. Conectar (pareamento por link)

1. Chame `connect_app`.
2. Se responder **"Conectado"**, siga em frente.
3. Se não, a resposta traz um **link** (`http://localhost:41730/#mcp-pair=...`) e um **código
   curto** (ex.: `D46B-9708`). Mostre os dois ao usuário, assim:

   > Abra este link no navegador onde você usa o MyFBox: <link>
   > Desbloqueie o cofre, confira se o código é **D46B-9708** e clique em **Autorizar**.

4. Depois que o usuário confirmar, chame `connect_app` de novo (o app conecta em ~1–3 s).

O pareamento fica salvo: o segredo do servidor mora em `~/.config/myfbox/mcp.json` (permissão
600) e o app guarda o mesmo segredo dentro do cofre cifrado. Reinícios do servidor reconectam
sozinhos. Para desfazer, use **Backups › Modo MCP local › Esquecer pareamento** no app. Para
trocar o segredo, apague `~/.config/myfbox/mcp.json` e pareie de novo.

Nunca peça a senha mestra do cofre ao usuário: ela não é necessária para o MCP.

## 2. Ferramentas

Todas as ferramentas devolvem JSON. Valores monetários são números (`42.5`), datas são
`AAAA-MM-DD` e meses são `AAAA-MM`. `amount` é **sempre positivo**; o `type` (`income` = receita,
`expense` = despesa) define o sinal.

| Ferramenta | Para quê | Argumentos principais |
|---|---|---|
| `connect_app` | Status da conexão; link de pareamento se preciso | — |
| `get_overview` | Resumo do mês: saldo confirmado e previsto (BRL e USD), recebido/pago, pendentes, saldo por conta | `month?` |
| `list_accounts` | Contas com moeda, saldo confirmado e previsto até o fim do mês atual | — |
| `create_account` | Cria uma conta no cofre (não duplica nome) em qualquer das 16 moedas | `name`, `type?`, `currency?`, `initialBalance?`, `institution?`, `color?` |
| `transfer_between_accounts` | Transferência interna entre duas contas (converte moedas automaticamente via tabela offline) | `fromAccountName?`/`fromAccountId?`, `toAccountName?`/`toAccountId?`, `amount`, `date?`, `description?` |
| `list_categories` | Categorias com id, tipo e meta mensal | `type?` |
| `list_transactions` | Lançamentos do mais recente ao mais antigo | `month?`, `type?`, `status?`, `categoryId?`, `accountId?`, `search?`, `limit?` (50) |
| `create_category` | Cria categoria (não duplica nome+tipo) | `name`, `type`, `monthlyBudget?`, `color?` |
| `set_category_budget` | Define ou remove a meta (teto mensal em BRL) de uma despesa | `categoryId`, `monthlyBudget` (número ou `null`) |
| `create_transaction` | Registra lançamento (único ou parcelado) | `description`, `amount`, `type`, `date?`, `categoryName?`/`categoryId?`, `accountName?`/`accountId?`, `status?`, `currency?`, `exchangeRate?`, `notes?`, `repeatMonths?` |
| `update_transaction` | Altera campos de um lançamento (ou dá baixa congelando o câmbio) | `id` + campos a mudar (`status?`, `paidAt?`, `exchangeRate?`, ...) |
| `delete_transaction` | Exclui um lançamento (irreversível) | `id` |
| `get_month_comparison` | Comparativo mês a mês (entradas, saídas, resultado, variações, categorias que mais mudaram) | `month?`, `months?` (6) |
| `list_insights` / `save_insight` / `delete_insight` | Insights mensais da aba Comparativos | ver a skill `myfbox-insights` |
| `list_exchange_rates` | Lista as cotações de moedas cadastradas no cofre (100% offline) | — |
| `set_exchange_rate` | Adiciona ou atualiza a cotação de qualquer par entre as 16 moedas suportadas | `from`, `to`, `rate` |
| `delete_exchange_rate` | Remove a cotação de um par de moedas do cofre | `from`, `to` |
| `export_backup` | Salva um backup **cifrado** (.myfbox.json) em `vaults/` do projeto (fora do git) e marca "Último backup" no app | — |

### Regras do domínio que valem para as ferramentas
- **Offline soberano & Multimoeda (16 moedas + triangulação)**: O MyFBox não faz chamadas a APIs externas para cotações.
  As moedas aceitas vêm de uma lista fechada com as 16 mais populares no mundo e seus símbolos:
  BRL (R\$), USD (US\$), EUR (€), GBP (£), JPY (¥), CHF (CHF), CAD (CA\$), AUD (AU\$), CNY (CN¥),
  ARS (AR\$), CLP (CLP\$), UYU (\$U), MXN (MX\$), BTC (₿), ETH (Ξ), USDT (₮).
  O motor de câmbio resolve pares diretos, inversos (`1 / rate`) e triangulação automática via pivôs `BRL` e `USD`.
- **Saldo confirmado** conta só lançamentos `paid`. Pendentes (`pending`) entram apenas na
  **previsão**, que vai até o fim do mês consultado (inclui pendentes atrasados).
- **Data padrão** é hoje. **Data futura** vira `pending` automaticamente, a menos que você passe `status`.
- **Categoria**: com `categoryName`/`categoryId` usa a informada (precisa ser do mesmo tipo do
  lançamento); sem nenhuma, o app **sugere pela descrição** (histórico + palavras-chave) e, se não houver correspondência, usa a categoria de sistema `"Outros"`.
- **Conta padrão** é a primeira do cofre. **Moeda padrão** é a da conta.
- **Parcelado/recorrente** (`repeatMonths` 2–36): cria N lançamentos mensais com sufixo
  `(1/N)`; só o primeiro usa o `status` informado, os demais ficam `pending`.
- **Moedas estrangeiras e congelamento de câmbio**: quando o lançamento ou a conta usa moeda diferente de `BRL`, a cotação para `BRL` é fixada no lançamento se você passar `exchangeRate` ou quando o lançamento está `paid` (inclusive ao dar baixa via `update_transaction { status: "paid" }`, usando a cotação atual do cofre). Pendentes seguem a cotação atual do cofre até serem pagos.
- **Metas** existem só para categorias de **despesa**. Remover a meta (`monthlyBudget: null`)
  **não** apaga a categoria.

### Limites de Segurança (O que o MCP NUNCA pode fazer)
Por desenho de segurança, as seguintes operações são **bloqueadas no MCP** e **exclusivas do usuário pela interface (UI)**:
1. **Criar cofre ou definir/trocar a senha mestra**: o cofre só pode ser criado ou ter sua senha alterada manualmente pelo usuário no navegador.
2. **Apagar/destruir o cofre ou restaurar backup**: o MCP não tem permissão para apagar o cofre (`destroyVault`) nem sobrescrevê-lo com outro arquivo.
3. **Fazer backup sem criptografia (exportar CSV ou JSON em texto puro)**:
   - O único backup permitido via MCP é `export_backup`, que grava exclusivamente o envelope cifrado (`.myfbox.json`, `AES-256-GCM` + `PBKDF2-HMAC-SHA256`).
   - **Nunca** gere ou salve arquivos `.csv` ou `.json` abertos em disco como forma de backup/exportação. Se o usuário pedir para exportar planilha CSV, informe que a exportação CSV é feita exclusivamente por ele na interface do app (**Backups › Exportar CSV**).

## 3. Receitas de uso

**Registrar um gasto simples** — "gastei 42 reais no almoço hoje":
```json
create_transaction { "description": "Almoço", "amount": 42, "type": "expense" }
```
Confira a `category` devolvida; se a sugestão não fizer sentido, corrija com `update_transaction`.

**Criar categoria e já lançar nela** — "crie a categoria Pets com meta de 300 e lance 89,90 de ração":
```json
create_category    { "name": "Pets", "type": "expense", "monthlyBudget": 300 }
create_transaction { "description": "Ração do gato", "amount": 89.9, "type": "expense", "categoryName": "Pets" }
```

**Conta a pagar no futuro** — "aluguel de 2.200 vence dia 10 do mês que vem":
```json
create_transaction { "description": "Aluguel", "amount": 2200, "type": "expense", "date": "2026-12-10", "categoryName": "Moradia & Condomínio" }
```
(Fica `pending` sozinho por ser data futura.)

**Compra parcelada** — "notebook de 4.800 em 12x":
```json
create_transaction { "description": "Notebook", "amount": 400, "type": "expense", "repeatMonths": 12 }
```
`amount` é o valor **de cada parcela**. Se o usuário der o total, divida e confirme o valor da parcela.

**Receita em moeda estrangeira** — "recebi US$ 1.200 de um cliente":
```json
create_transaction { "description": "Cliente X", "amount": 1200, "type": "income", "currency": "USD", "categoryName": "Projetos & Consultoria" }
```

**Criar conta e transferir entre contas** — "crie uma conta em Euro chamada Wise e transfira R$ 1.000 da Conta Principal para ela":
```json
create_account            { "name": "Wise", "type": "checking", "currency": "EUR", "initialBalance": 0, "institution": "Wise" }
transfer_between_accounts { "fromAccountName": "Conta Principal", "toAccountName": "Wise", "amount": 1000, "description": "Remessa internacional" }
```
(Se as contas tiverem moedas diferentes, `transfer_between_accounts` converte automaticamente usando a cotação cadastrada no cofre.)

**Dar baixa num pendente** — "paguei a conta de luz" / "paguei o aluguel dia 05":
```json
list_transactions  { "search": "luz", "status": "pending" }
update_transaction { "id": "<id encontrado>", "status": "paid" }
update_transaction { "id": "<id do aluguel>", "status": "paid", "paidAt": "2026-11-05" }
```
`paidAt` é a data do pagamento (padrão: hoje). A `date` continua sendo o vencimento: não troque
a `date` para registrar o pagamento, senão o lançamento muda de mês nos comparativos e metas.

**Quanto gastei** — "quanto gastei em mercado este mês?":
```json
list_categories   { "type": "expense" }
list_transactions { "month": "2026-11", "type": "expense", "categoryId": "<id de Supermercado>" }
```
Some os `amount` (atenção à `currency`) ou use `get_overview` para os totais do mês.

**Definir/remover meta**:
```json
set_category_budget { "categoryId": "cat_groceries", "monthlyBudget": 1200 }
set_category_budget { "categoryId": "cat_groceries", "monthlyBudget": null }
```

**Gerenciar cotações de câmbio (100% offline)** — "defina o dólar a 5,85" / "quais cotações estão salvas?":
```json
set_exchange_rate   { "from": "USD", "to": "BRL", "rate": 5.85 }
set_exchange_rate   { "from": "EUR", "to": "BRL", "rate": 6.30 }
list_exchange_rates {}
delete_exchange_rate { "from": "EUR", "to": "BRL" }
```
(O app opera totalmente offline: não busca cotações em APIs externas. As moedas aceitas vêm da lista fechada das mais populares do mundo: BRL, USD, EUR, GBP, JPY, CHF, CAD, AUD, CNY, ARS, CLP, UYU, MXN, BTC, ETH, USDT.)

**Backup** — "faz um backup":
```json
export_backup {}
```
Responda com o caminho do arquivo devolvido e lembre que ele abre com a **senha mestra atual** em
Restaurar. A pasta `vaults/` fica só nesta máquina: sugira também copiar o arquivo para a nuvem ou
um pen-drive (é cifrado, pode ir para a nuvem).

## 4. Boas práticas
- **Confirme antes de excluir** (`delete_transaction`) e antes de alterações em lote. Mostre o
  que será afetado (descrição, data, valor).
- Ao registrar, **ecoe o resultado** para o usuário: descrição, valor, data, categoria, conta e
  situação. Se a categoria foi sugerida, diga isso.
- Valores ditos em português ("mil e duzentos e cinquenta e noventa") → `1250.9`. O app usa
  vírgula para centavos na interface, mas a API recebe número.
- Não invente categorias sem o usuário pedir ou concordar; prefira as existentes
  (`list_categories`). Se nenhuma servir, sugira criar.
- Para descobrir ids, use `list_*` em vez de adivinhar.

## 5. Problemas comuns
| Resposta | O que fazer |
|---|---|
| "O app MyFBox não está conectado" + link | Faça o pareamento (seção 1) ou peça para desbloquear o app. |
| Múltiplas sessões MCP na mesma porta `4777` | Sessões adicionais entram automaticamente em **modo peer autenticado** (via Bearer token local em `~/.config/myfbox/mcp.json`) e compartilham a mesma ponte. Se outro programa externo ocupar a porta `4777`, defina `MYFBOX_MCP_PORT`. |
| "O app não respondeu a tempo" | O cofre provavelmente trancou. Peça para desbloquear. |
| App em outro endereço (deploy, outra porta do Vite) | Defina `MYFBOX_APP_URL` para o link apontar para o app certo. |
