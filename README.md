# MyFBox

Controle financeiro pessoal **local-first** e **cifrado no seu dispositivo**. Sem conta, sem
servidor, sem rastreio: os dados ficam no seu navegador, cifrados com AES-256-GCM, e só a sua
senha mestra abre o cofre.

> Interface em português do Brasil · React 19 + TypeScript + Vite · estilo neo-brutalista

## Recursos

- **Cofre cifrado**: todo o estado (contas, lançamentos, categorias, metas, insights) é um único
  JSON cifrado com AES-256-GCM. A chave é derivada da senha por PBKDF2-HMAC-SHA256
  (600.000 iterações) e nunca sai da memória do navegador.
- **Lançamentos** com parcelamento/recorrência mensal, situação paga/pendente, categorização
  automática pela descrição e entrada rápida (atalho <kbd>N</kbd>).
- **BRL e USD**: lançamentos e contas em reais ou dólares, com cotação USD/BRL (AwesomeAPI) e
  cotação fixada no lançamento quando ele é pago.
- **Visão geral** com saldo de hoje (só o confirmado), entradas/saídas do mês, pendências em
  atraso e saldo previsto até o fim do mês.
- **Comparativos** mês a mês, com **insights** escritos por um assistente (via MCP) e aviso
  quando os números do mês mudam depois do insight.
- **Metas** (teto mensal) por categoria de despesa.
- **Backups** cifrados (`.myfbox.json`), restauração, importação de extratos OFX/CSV e exportação
  de planilha CSV.
- **Modo MCP local** (opcional, desligado por padrão): um assistente como o Claude Code consulta
  e registra lançamentos no cofre aberto, só pela sua máquina.

## Requisitos

- Node.js `^20.19` ou `>=22.12`
- Um navegador moderno (Chrome, Edge, Firefox ou Safari recentes)

## Começando

```bash
npm install
npm run dev
```

Abra **http://localhost:41730**, crie um cofre e uma senha mestra.

> **A porta é fixa de propósito.** O cofre fica no IndexedDB, que é separado por endereço
> (origem). Se o app abrir em outra porta, o cofre parece sumir (ele continua salvo no endereço
> antigo). Por isso o Vite usa `strictPort` e falha em vez de trocar de porta.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em `127.0.0.1:41730` |
| `npm run build` | Checagem de tipos + build de produção em `dist/` (com Content Security Policy) |
| `npm run preview` | Serve o build de produção na mesma porta |
| `npm run lint` | Lint com oxlint |
| `npm run mcp` | Inicia o servidor MCP local manualmente (normalmente o cliente MCP inicia sozinho) |

## Seus dados e backups

- Os dados existem **só neste navegador, neste endereço**. Limpar os dados do site, trocar de
  navegador/perfil/computador ou mudar a porta "esconde" o cofre.
- Faça backup em **Backups › Baixar backup cifrado**. O arquivo `.myfbox.json` é cifrado: pode
  ir para a nuvem ou um pen-drive. Ele abre com a **senha mestra que valia no momento do
  backup**, em **Restaurar** (tela de login ou aba Backups).
- **Não existe recuperação de senha.** Guarde a senha mestra num gerenciador de senhas.
- O app pede ao navegador **armazenamento persistente** para que o cofre não seja apagado quando
  faltar espaço. Favoritar o app ajuda o Chrome a conceder.
- As pastas `vaults/` e `backups/` e qualquer `*.myfbox.json` são ignoradas pelo git.

### Compatibilidade dos arquivos cifrados

O formato do envelope é `formatVersion: 1` e o número de iterações do PBKDF2 fica gravado nele.
Cofres e backups antigos (310.000 iterações) continuam abrindo e são recifrados com o padrão
atual (600.000) no próximo desbloqueio ou restauração. Arquivos novos também abrem em versões
anteriores do app.

## Modo MCP local

Permite que um assistente compatível com MCP (ex.: Claude Code) leia e altere o cofre **enquanto
ele está aberto e desbloqueado**, sem que a senha ou a chave saiam do navegador.

1. Rode o app (`npm run dev`) e desbloqueie o cofre.
2. Abra o Claude Code na pasta do projeto: o `.mcp.json` registra o servidor `myfbox`.
3. Peça "conecte ao MyFBox". O assistente mostra um **link de pareamento** e um **código curto**.
4. Abra o link, confira o código e clique em **Autorizar**.

Depois é só pedir: "registre um almoço de R$ 42 hoje", "quanto gastei em mercado este mês?",
"gere o insight de novembro", "faz um backup". Trancar o app (manual ou por inatividade) corta o
acesso na hora. Detalhes das ferramentas e receitas de uso:

- [`.claude/skills/myfbox/SKILL.md`](.claude/skills/myfbox/SKILL.md): ferramentas e lançamentos
- [`.claude/skills/myfbox-insights/SKILL.md`](.claude/skills/myfbox-insights/SKILL.md): insights mensais

Variáveis opcionais do servidor: `MYFBOX_APP_URL` (padrão `http://localhost:41730`),
`MYFBOX_MCP_PORT` (padrão `4777`), `MYFBOX_BACKUP_DIR` (padrão `vaults/`).

## Segurança

Veja [SECURITY.md](SECURITY.md) para o modelo de ameaças, os detalhes criptográficos e como
reportar vulnerabilidades.

## Estrutura

```
src/
  App.tsx                 dono do estado; toda gravação passa por persistVaultUpdate
  components/             telas (Visão Geral, Lançamentos, Comparativos, Metas, Contas, Backups)
  services/cryptoVault.ts cifra/decifra o cofre e grava no IndexedDB
  services/mcpBridge.ts   ponte do navegador com o servidor MCP local
  services/mcpActions.ts  ações do MCP (funções puras)
  utils/                  cálculos de saldo, conversão, comparativos, formatação
mcp/server.mjs            servidor MCP (stdio) + ponte WebSocket em 127.0.0.1
```

Mais detalhes de arquitetura para quem vai contribuir estão em [CLAUDE.md](CLAUDE.md).

## Licença

Copyright (C) 2026 Zeru.

Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo nos termos da
**GNU Affero General Public License**, versão 3 ou (a seu critério) qualquer versão posterior,
publicada pela Free Software Foundation. Veja o arquivo [LICENSE](LICENSE).

Em resumo: você pode usar, estudar, modificar e distribuir o MyFBox. Se distribuir uma versão
modificada **ou oferecê-la para outras pessoas usarem pela rede** (por exemplo, hospedando o app),
precisa disponibilizar o código-fonte dessa versão sob a mesma licença.
