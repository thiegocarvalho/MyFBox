# Segurança do MyFBox

## Modelo de ameaças

**O MyFBox protege contra:**

- Alguém que obtém o **arquivo de backup** (`.myfbox.json`) ou uma cópia do **IndexedDB** do
  navegador: sem a senha mestra, o conteúdo é ilegível (AES-256-GCM).
- Leitura dos seus dados por **terceiros na rede**: não há servidor do app e **nenhuma chamada a APIs externas** (100% offline soberano; cotações de moedas são cadastradas localmente). A única conexão de rede existente é opcional: a ponte local do Modo MCP em `127.0.0.1`.
- Execução de scripts de terceiros no build de produção: a **Content Security Policy** só permite
  código do próprio app e websockets locais em loopback (`127.0.0.1`).

**O MyFBox não protege contra:**

- **Malware ou extensões maliciosas** no computador/navegador enquanto o cofre está
  **desbloqueado** (os dados estão decifrados na memória da aba).
- Alguém com acesso físico ao computador com o cofre aberto. Use o auto-bloqueio
  (Backups › Segurança) e tranque o app ao sair.
- **Senhas fracas.** A derivação de chave encarece cada tentativa, mas não salva uma senha curta
  ou comum. Use uma senha longa e única.
- **Perda da senha**: não há recuperação, por desenho.

## Criptografia

| Item | Escolha |
|---|---|
| Cifra | AES-256-GCM (WebCrypto), IV aleatório de 96 bits a cada gravação |
| Derivação de chave | PBKDF2-HMAC-SHA256, **600.000 iterações**, sal aleatório de 128 bits |
| Chave em memória | `CryptoKey` não extraível; os bytes brutos derivados são zerados após o uso |
| Verificação de senha | Bloco "verifier" cifrado com a mesma chave (distingue senha errada de arquivo corrompido) |
| Impressão da chave | 32 bits de `SHA-256("MYFBOX_KEY_FINGERPRINT_V2" ‖ chave derivada)`, só para conferência visual |

O envelope guarda o algoritmo, o número de iterações e o sal, permitindo evoluir os parâmetros criptográficos em versões futuras.

## Modo MCP local

- **Desligado por padrão.** Só liga após o usuário autorizar um pareamento na interface.
- O servidor escuta **apenas em `127.0.0.1`**, verifica o cabeçalho `Origin` (só `localhost`,
  `127.0.0.1` ou `MYFBOX_APP_URL`) e exige um **segredo de pareamento** comparado em tempo
  constante.
- O segredo fica em `~/.config/myfbox/mcp.json` (permissão 600) e, no app, dentro do cofre
  cifrado. O link de pareamento leva o segredo no fragmento (`#`), que não é enviado a servidores,
  e o app o remove da barra de endereço ao ler. O diálogo mostra um código curto (SHA-256 do
  segredo) para conferir com o que o assistente exibiu.
- O servidor **nunca recebe a senha nem a chave**: as ações rodam no navegador e só os resultados
  voltam. O backup via MCP entrega apenas o envelope já cifrado (`AES-256-GCM`).
- **Operações bloqueadas no MCP (exclusivas do usuário na interface)**: o MCP não pode criar cofre,
  apagar/destruir o cofre, alterar a senha mestra, restaurar backups nem fazer backup sem criptografia
  (exportar planilha CSV é exclusivo do usuário diretamente pela UI).
- Trancar o app (manual ou auto-bloqueio) derruba a ponte; ações do MCP não contam como atividade
  para o auto-bloqueio.
- Qualquer processo local que tenha o segredo pode ler e alterar o cofre aberto. Trate o
  computador onde o Modo MCP está ligado como confiável, ou desligue o modo.

## Outras medidas

- Exportação CSV neutraliza fórmulas (`=`, `+`, `-`, `@`) em campos de texto ("CSV injection").
- Fontes servidas localmente (sem Google Fonts) e `referrer` desativado.
- Servidor de desenvolvimento ligado só em `127.0.0.1`.

## App Desktop (Electron) e IPC

- **Isolamento do renderer:** `BrowserWindow` configurado com `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` e `allowRunningInsecureContent: false`.
- **Bloqueio de navegação e permissões:** `setWindowOpenHandler` nega pop-ups/novas janelas; `will-navigate` restringe navegação à origem do app; `will-attach-webview` e `setPermissionRequestHandler` bloqueiam webviews e permissões de dispositivo.
- **IPC mínimo e validado:** `electron/preload.ts` expõe apenas `vault.{load, save, delete, info}` e `mcp.info` (nenhum acesso genérico a `fs` ou `ipcRenderer`). O processo principal valida integralmente a estrutura de `EncryptedVaultEnvelope` (PBKDF2-HMAC-SHA256 + AES-256-GCM, limite de 20 MB) antes de gravar.
- **Persistência atômica em disco:** o cofre cifrado é gravado via arquivo temporário + `rename` em `app.getPath('userData')/vault.myfbox.json` com permissão `0600` (POSIX) — nenhum dado descriptografado trafega por IPC ou toca o disco.
- **Instância única:** `app.requestSingleInstanceLock()` evita duas janelas concorrentes escrevendo no mesmo cofre.

## Reportar uma vulnerabilidade

Não abra uma issue pública. Use o recurso de **Security Advisory privado** do repositório (aba
*Security › Report a vulnerability*) com a descrição, passos para reproduzir e o impacto. Você
terá uma resposta assim que possível.
