import type { AppLanguage } from '../types';

export const domainMcpMessages = {
  'pt-BR': {
    // defaultData
    'domainMcp.defaultData.vaultName': 'Cofre Pessoal',
    'domainMcp.defaultData.mainAccount': 'Conta Principal',
    'domainMcp.defaultData.mainBank': 'Banco Principal',
    'domainMcp.defaultData.cat.salary': 'Salário & Pró-Labore',
    'domainMcp.defaultData.cat.freelance': 'Projetos & Consultoria',
    'domainMcp.defaultData.cat.dividends': 'Rendimentos & Dividendos',
    'domainMcp.defaultData.cat.otherInc': 'Reembolsos & Outros',
    'domainMcp.defaultData.cat.housing': 'Moradia & Condomínio',
    'domainMcp.defaultData.cat.groceries': 'Supermercado & Feira',
    'domainMcp.defaultData.cat.dining': 'Restaurantes & Delivery',
    'domainMcp.defaultData.cat.transport': 'Transporte & Combustível',
    'domainMcp.defaultData.cat.health': 'Saúde & Farmácia',
    'domainMcp.defaultData.cat.subs': 'Assinaturas, Nuvem & Internet',
    'domainMcp.defaultData.cat.leisure': 'Lazer, Livros & Viagens',

    // categories
    'domainMcp.categories.other': 'Outros',

    // validation
    'domainMcp.validation.invalidEnvelope': 'Formato de cofre inválido ou corrompido.',
    'domainMcp.validation.invalidKdfHeader': 'Cabeçalho KDF do cofre inválido.',
    'domainMcp.validation.invalidPbkdf2Iterations':
      'Parâmetro de iterações PBKDF2 fora dos limites de segurança.',
    'domainMcp.validation.invalidCipherBlock': 'Bloco criptográfico do cofre inválido.',
    'domainMcp.validation.invalidVerifierBlock': 'Bloco verificador do cofre inválido.',
    'domainMcp.validation.invalidPayloadStructure': 'Estrutura interna do cofre inválida.',
    'domainMcp.validation.missingPayloadCollections':
      'Coleções de dados do cofre ausentes ou corrompidas.',
    'domainMcp.validation.accountFallback': 'Conta',
    'domainMcp.validation.mainAccount': 'Conta Principal',
    'domainMcp.validation.categoryFallback': 'Categoria',
    'domainMcp.validation.transactionFallback': 'Lançamento',
    'domainMcp.validation.vaultFallback': 'Cofre Pessoal',

    // vaultUseCases
    'domainMcp.vaultUseCases.copySuffix': '(Cópia)',
    'domainMcp.vaultUseCases.transferInvalidAccounts':
      'Selecione contas de origem e destino válidas e distintas.',
    'domainMcp.vaultUseCases.transferNoRate':
      'Sem cotação {{from}}/{{to}} cadastrada para converter entre moedas diferentes.',
    'domainMcp.vaultUseCases.transferTo': 'Para {{account}}',
    'domainMcp.vaultUseCases.transferFrom': 'De {{account}}',
    'domainMcp.vaultUseCases.transferInternalNote': 'Transferência interna entre contas',
    'domainMcp.vaultUseCases.rateSourceManual': 'manual',

    // cryptoVault
    'domainMcp.cryptoVault.invalidSalt': 'Sal criptográfico inválido no envelope.',
    'domainMcp.cryptoVault.invalidVerifierIv': 'IV do verificador inválido.',
    'domainMcp.cryptoVault.invalidVerifier': 'Verificador de chave inválido.',
    'domainMcp.cryptoVault.invalidMasterPassword':
      'Senha mestra incorreta ou dados de autenticação inválidos.',
    'domainMcp.cryptoVault.invalidCipherIv': 'IV do bloco de dados inválido.',
    'domainMcp.cryptoVault.decryptFailed':
      'Falha ao descriptografar o cofre financeiro (AES-256-GCM tag mismatch).',

    // importExport
    'domainMcp.importExport.defaultVaultSlug': 'cofre',
    'domainMcp.importExport.csvHeader.date': 'Data',
    'domainMcp.importExport.csvHeader.description': 'Descricao',
    'domainMcp.importExport.csvHeader.type': 'Tipo',
    'domainMcp.importExport.csvHeader.status': 'Status',
    'domainMcp.importExport.csvHeader.paidAt': 'Pago_em',
    'domainMcp.importExport.csvHeader.amount': 'Valor',
    'domainMcp.importExport.csvHeader.currency': 'Moeda',
    'domainMcp.importExport.csvHeader.fixedRate': 'Cotacao_Fixada_BRL',
    'domainMcp.importExport.csvHeader.category': 'Categoria',
    'domainMcp.importExport.csvHeader.account': 'Conta',
    'domainMcp.importExport.csvHeader.notes': 'Notas',
    'domainMcp.importExport.csvTypeIncome': 'Receita',
    'domainMcp.importExport.csvTypeExpense': 'Despesa',
    'domainMcp.importExport.csvStatusPaid': 'Pago',
    'domainMcp.importExport.csvStatusPending': 'Pendente',
    'domainMcp.importExport.csvNoCategory': 'Sem Categoria',
    'domainMcp.importExport.csvDefaultAccount': 'Conta Padrão',
    'domainMcp.importExport.csvFilenamePrefix': 'myfbox-lancamentos',

    // mcpConfig
    'domainMcp.mcpConfig.defaultServerPath': '/CAMINHO/ABSOLUTO/MyFBox/mcp/server.mjs',
    'domainMcp.mcpConfig.agentPromptWeb':
      'Configure o servidor MCP "myfbox" na sua configuração de MCP usando command="npx", args=["-y", "{{pkg}}"]. Depois, conecte ao meu cofre chamando connect_app.',
    'domainMcp.mcpConfig.agentPromptWebWithUrl':
      'Configure o servidor MCP "myfbox" na sua configuração de MCP usando command="npx", args=["-y", "{{pkg}}"] e env MYFBOX_APP_URL="{{appUrl}}". Depois, conecte ao meu cofre chamando connect_app.',
    'domainMcp.mcpConfig.agentPromptLocal':
      'Configure o servidor MCP "myfbox" na sua configuração de MCP usando command="node" e args=["{{serverPath}}"]. Depois, conecte ao meu cofre chamando connect_app.',

    // mcpBridge
    'domainMcp.mcpBridge.openError': 'Falha ao abrir conexão',
    'domainMcp.mcpBridge.pairRejected': 'Código de pareamento recusado pelo servidor MCP.',
    'domainMcp.mcpBridge.serverNotFound':
      'Servidor MCP local não encontrado. Ele está rodando?',
    'domainMcp.mcpBridge.closeReason': 'MCP desativado',

    // mcpActions
    'domainMcp.mcpActions.missingRequiredField': 'Campo obrigatório ausente: {{key}}',
    'domainMcp.mcpActions.fieldMustBeText': 'Campo {{key}} deve ser texto',
    'domainMcp.mcpActions.fieldMustBeNumber': 'Campo {{key}} deve ser número',
    'domainMcp.mcpActions.fieldMustBeOneOf': 'Campo {{key}} deve ser um de: {{options}}',
    'domainMcp.mcpActions.invalidIsoDate': '{{key}} deve estar no formato AAAA-MM-DD',
    'domainMcp.mcpActions.invalidYearMonth': '{{key}} deve estar no formato AAAA-MM',
    'domainMcp.mcpActions.accountNotFound': 'Conta não encontrada: {{id}}',
    'domainMcp.mcpActions.accountNameNotFound':
      'Conta "{{name}}" não encontrada. Contas: {{accounts}}',
    'domainMcp.mcpActions.noAccountsInVault': 'O cofre não tem nenhuma conta.',
    'domainMcp.mcpActions.categoryNotFound': 'Categoria de {{type}} não encontrada: {{id}}',
    'domainMcp.mcpActions.categoryNameNotFound':
      'Categoria "{{name}}" ({{type}}) não existe. Crie com create_category ou use uma destas: {{categories}}',
    'domainMcp.mcpActions.none': '(nenhuma)',
    'domainMcp.mcpActions.noticeCreatedAccount': 'MCP criou a conta "{{name}}" ({{currency}})',
    'domainMcp.mcpActions.missingFromAccount':
      'Informe fromAccountId ou fromAccountName para a conta de origem.',
    'domainMcp.mcpActions.missingToAccount':
      'Informe toAccountId ou toAccountName para a conta de destino.',
    'domainMcp.mcpActions.amountPositive': 'amount deve ser maior que zero',
    'domainMcp.mcpActions.noticeTransferred': 'MCP transferiu de "{{from}}" para "{{to}}"',
    'domainMcp.mcpActions.missingType': 'Campo obrigatório ausente: type (income ou expense)',
    'domainMcp.mcpActions.budgetNonNegative': 'monthlyBudget não pode ser negativo',
    'domainMcp.mcpActions.noticeCreatedCategory': 'MCP criou a categoria "{{name}}"',
    'domainMcp.mcpActions.budgetInvalidValue':
      'monthlyBudget deve ser um número >= 0, ou null para remover a meta',
    'domainMcp.mcpActions.categoryNotFoundById': 'Categoria não encontrada: {{id}}',
    'domainMcp.mcpActions.budgetExpenseOnly': 'Metas só existem para categorias de despesa',
    'domainMcp.mcpActions.noticeSetBudget': 'MCP definiu a meta de "{{name}}"',
    'domainMcp.mcpActions.noticeRemovedBudget': 'MCP removeu a meta de "{{name}}"',
    'domainMcp.mcpActions.amountPositiveWithType':
      'amount deve ser maior que zero (o tipo define o sinal)',
    'domainMcp.mcpActions.ratePositive': 'exchangeRate deve ser maior que zero',
    'domainMcp.mcpActions.noticeCreatedTxMany': 'MCP registrou {{count}} lançamentos de "{{desc}}"',
    'domainMcp.mcpActions.noticeCreatedTxOne': 'MCP registrou "{{desc}}"',
    'domainMcp.mcpActions.txNotFound': 'Lançamento não encontrado: {{id}}',
    'domainMcp.mcpActions.paidAtFuture': 'paidAt não pode ser no futuro',
    'domainMcp.mcpActions.noticeUpdatedTx': 'MCP atualizou "{{desc}}"',
    'domainMcp.mcpActions.noticeDeletedTx': 'MCP excluiu "{{desc}}"',
    'domainMcp.mcpActions.missingMonth': 'Campo obrigatório ausente: month (AAAA-MM)',
    'domainMcp.mcpActions.titleMaxLength': 'title deve ter até 120 caracteres',
    'domainMcp.mcpActions.bodyMaxLength': 'body deve ter até 4000 caracteres',
    'domainMcp.mcpActions.highlightsMustBeTextList': 'highlights deve ser uma lista de textos',
    'domainMcp.mcpActions.noticeUpdatedInsight': 'MCP atualizou o insight de {{month}}',
    'domainMcp.mcpActions.noticeCreatedInsight': 'MCP escreveu o insight de {{month}}',
    'domainMcp.mcpActions.insightNotFound': 'Não há insight para {{month}}',
    'domainMcp.mcpActions.noticeDeletedInsight': 'MCP removeu o insight de {{month}}',
    'domainMcp.mcpActions.offlineRatesNote':
      'O MyFBox opera de forma 100% offline. Cotações são cadastradas manualmente ou pelo agente via MCP.',
    'domainMcp.mcpActions.alreadyExists': 'já existe',
    'domainMcp.mcpActions.defaultTransferDescription': 'Transferência entre contas',
    'domainMcp.mcpActions.comparisonNote':
      'Valores em BRL. Totais do mês contam pagos + pendentes (competência). Moedas estrangeiras convertidas pela cotação fixada no lançamento ou pela atual.',
    'domainMcp.mcpActions.fromToRequired': 'from e to são obrigatórios',
    'domainMcp.mcpActions.ratePositiveNumber': 'rate deve ser um número positivo maior que zero',
    'domainMcp.mcpActions.unsupportedFromCurrency':
      'Moeda de origem "{{currency}}" não é suportada. Escolha uma das moedas: {{supported}}',
    'domainMcp.mcpActions.unsupportedToCurrency':
      'Moeda de destino "{{currency}}" não é suportada. Escolha uma das moedas: {{supported}}',
    'domainMcp.mcpActions.sameCurrencyError': 'Moeda de origem e destino devem ser diferentes',
    'domainMcp.mcpActions.noticeSetRate': 'MCP definiu cotação {{from}}/{{to}}: {{rate}}',
    'domainMcp.mcpActions.noticeDeletedRate': 'MCP removeu cotação {{from}}/{{to}}',
    'domainMcp.mcpActions.forbiddenCreateVault':
      'Criar cofre é uma operação exclusiva do usuário na interface do navegador.',
    'domainMcp.mcpActions.forbiddenDeleteVault':
      'Apagar o cofre é uma operação exclusiva do usuário na interface do navegador.',
    'domainMcp.mcpActions.forbiddenExportCsv':
      'O MCP não faz backup sem criptografia. Exportar CSV é exclusivo do usuário pela interface do app (Backups › Exportar CSV).',
    'domainMcp.mcpActions.forbiddenExportUnencrypted':
      'O MCP não faz backup sem criptografia. Use export_backup para gerar um backup cifrado (.myfbox.json com AES-256-GCM).',
    'domainMcp.mcpActions.forbiddenChangePassword':
      'Alterar a senha mestra é exclusivo do usuário na interface do navegador.',
    'domainMcp.mcpActions.forbiddenRestoreBackup':
      'Restaurar backup é exclusivo do usuário na interface do navegador.',
    'domainMcp.mcpActions.unknownAction': 'Ação desconhecida: {{name}}',

    // McpPairDialog
    'domainMcp.pair.title': 'Conectar assistente',
    'domainMcp.pair.reject': 'Recusar',
    'domainMcp.pair.description':
      'Um assistente (servidor MCP local) quer acessar este cofre para consultar e registrar lançamentos. Ele só funciona nesta máquina e enquanto o cofre estiver desbloqueado.',
    'domainMcp.pair.codeLabel': 'Confira se o código é o mesmo mostrado pelo assistente',
    'domainMcp.pair.factLoopback': 'Conexão só com 127.0.0.1, porta {{port}}',
    'domainMcp.pair.factSecrets': 'A senha e a chave do cofre não saem do navegador',
    'domainMcp.pair.factDisable':
      'Dá para desligar quando quiser em Configurações › Modo MCP local',
    'domainMcp.pair.authorise': 'Autorizar',

    // McpInstructionsModal
    'domainMcp.modal.badge': 'MCP & SKILLS OFICIAIS',
    'domainMcp.modal.title': 'Guia de Instruções & Prompts MCP',
    'domainMcp.modal.subtitle':
      'Opere seu cofre financeiro com qualquer assistente ou agente de IA compatível com MCP através de uma ponte local 100% segura e soberana.',
    'domainMcp.modal.closeAria': 'Fechar modal de instruções',
    'domainMcp.modal.tabPrompts': 'Prompts ({{count}})',
    'domainMcp.modal.tabCapabilities': 'Capacidades ({{count}})',
    'domainMcp.modal.tabInstall': 'Instalação',
    'domainMcp.modal.tabSecurity': 'Segurança',
    'domainMcp.modal.searchPlaceholder':
      'Buscar por prompt, ação, ferramenta ou categoria...',
    'domainMcp.modal.clearSearchAria': 'Limpar busca',
    'domainMcp.modal.filterAll': 'Todos',
    'domainMcp.modal.emptyPrompts': 'Nenhum prompt encontrado para os filtros selecionados.',
    'domainMcp.modal.copyPromptTitle': 'Copiar prompt para o chat do assistente',
    'domainMcp.modal.copied': 'Copiado!',
    'domainMcp.modal.copyPrompt': 'Copiar Prompt',
    'domainMcp.modal.capCalloutTitle': 'O que o assistente pode fazer no MyFBox:',
    'domainMcp.modal.capCalloutBody':
      'O servidor MCP expõe 20 ferramentas organizadas que cobrem todas as operações essenciais do cofre. Todas as ações gravam no cofre criptografado e emitem avisos visíveis no aplicativo.',
    'domainMcp.modal.tableTool': 'Ferramenta',
    'domainMcp.modal.tableCategory': 'Categoria',
    'domainMcp.modal.tableWhat': 'O que faz',
    'domainMcp.modal.tableParams': 'Parâmetros',
    'domainMcp.modal.skillsSubtitle': 'Skills Especializadas Incluídas',
    'domainMcp.modal.skillMyfboxTitle': 'Skill: myfbox (.claude/skills/myfbox/SKILL.md)',
    'domainMcp.modal.skillMyfboxDesc':
      'Controla lançamentos, criação de contas e transferências multimoeda, parcelamentos em N vezes, sugestão de categorias por IA, metas mensais e gestão de cotações offline (16 moedas).',
    'domainMcp.modal.skillInsightsTitle':
      'Skill: myfbox-insights (.claude/skills/myfbox-insights/SKILL.md)',
    'domainMcp.modal.skillInsightsDesc':
      'Compara meses, detecta oscilações e redige insights analíticos e práticos gravados diretamente no cofre cifrado para a aba Comparativos (com suporte a leitura por voz local).',
    'domainMcp.modal.installStep1Title': 'Instalação Prática neste Ambiente',
    'domainMcp.modal.installStep1Desktop':
      'No app Desktop (Linux, Windows e macOS), o servidor MCP já vem embutido no aplicativo. Basta ter Node.js instalado e colar a configuração abaixo:',
    'domainMcp.modal.installStep1Web':
      'Na versão Web, o npx baixa e executa o servidor MCP automaticamente sem precisar clonar o repositório (exige Node.js e Git):',
    'domainMcp.modal.installStep1Local':
      'Adicione à configuração de MCP do seu cliente apontando para o script mcp/server.mjs:',
    'domainMcp.modal.installJsonHeader':
      'Configuração MCP (JSON — Claude Desktop, Cursor, Windsurf, Antigravity)',
    'domainMcp.modal.copyJson': 'Copiar JSON',
    'domainMcp.modal.installCliHeader': 'Atalho via terminal (Claude Code CLI)',
    'domainMcp.modal.copyCli': 'Copiar CLI',
    'domainMcp.modal.installStep2Title': 'Uso Direto na Pasta do Repositório (.mcp.json)',
    'domainMcp.modal.installStep2DescBefore':
      'Se você abriu seu assistente de IA diretamente dentro da pasta clonada do MyFBox, o arquivo',
    'domainMcp.modal.installStep2DescAfter': 'na raiz já registra o servidor automaticamente:',
    'domainMcp.modal.installStep2Header': '.mcp.json (na raiz do projeto)',
    'domainMcp.modal.copy': 'Copiar',
    'domainMcp.modal.installStep3Title': 'Como Parear com 1 Comando',
    'domainMcp.modal.installStep3Desc': 'No chat do assistente de IA, envie o prompt de pareamento:',
    'domainMcp.modal.pairPrompt':
      'Conecte ao MyFBox pelo servidor MCP local e me mostre o status da conexão.',
    'domainMcp.modal.installStep3Li1Before': 'O assistente chamará',
    'domainMcp.modal.installStep3Li1After': 'e retornará um link com código curto.',
    'domainMcp.modal.installStep3Li2':
      'Abra o link neste navegador com o cofre desbloqueado.',
    'domainMcp.modal.installStep3Li3Before':
      'Confira o código de conferência visual e clique em',
    'domainMcp.modal.installStep3Li3Strong': 'Autorizar',
    'domainMcp.modal.securityBannerTitle': 'Arquitetura Local-First Soberana',
    'domainMcp.modal.securityBannerDesc':
      'O MyFBox foi desenhado para que a inteligência artificial sirva você sem que você precise abrir mão da sua privacidade financeira.',
    'domainMcp.modal.secCard1Title': 'Sua senha mestra nunca sai do navegador',
    'domainMcp.modal.secCard1BodyBefore':
      'O processo MCP não conhece a sua senha nem a sua chave derivada AES-256-GCM. Ele apenas envia mensagens em formato JSON para o app aberto via WebSocket em loopback local (',
    'domainMcp.modal.secCard1BodyAfter': ').',
    'domainMcp.modal.secCard2Title': '100% Offline Soberano',
    'domainMcp.modal.secCard2Body':
      'O aplicativo não realiza chamadas para APIs de terceiros. As cotações de moedas e todas as regras de categorização e comparativos são processadas estritamente de forma local.',
    'domainMcp.modal.secCard3Title': 'Cofre Trancado = Acesso Bloqueado',
    'domainMcp.modal.secCard3Body':
      'Se você trancar o cofre ou se o tempo de auto-bloqueio por inatividade expirar, o servidor MCP imediatamente responde que o cofre está inacessível. Nenhuma ação de IA pode destravar o cofre sem a sua senha mestra digitada manualmente.',
    'domainMcp.modal.secCard4Title': 'Transparência Total & Notificações',
    'domainMcp.modal.secCard4Body':
      'Sempre que o MCP registra, edita ou exclui um lançamento, um aviso em tempo real aparece na interface informando exatamente o que foi executado.',
    'domainMcp.modal.secCard5Title': 'Operações Exclusivas do Usuário (Bloqueadas no MCP)',
    'domainMcp.modal.secCard5Body1': 'O MCP',
    'domainMcp.modal.secCard5BodyStrong': 'não pode',
    'domainMcp.modal.secCard5Body2':
      'criar cofre, apagar/resetar o cofre, alterar a senha mestra nem fazer backup sem criptografia. A exportação de planilha CSV é exclusiva do usuário pela interface do aplicativo; via MCP, o único backup permitido é o envelope cifrado (',
    'domainMcp.modal.secCard5Body3': ').',
    'domainMcp.modal.footerTipLabel': 'Dica: Experimente combinar prompts, como:',
    'domainMcp.modal.footerTipExample':
      '"Crie a categoria Pets com meta de 300 e registre 89,90 de ração nela"',
    'domainMcp.modal.footerClose': 'Entendi, fechar',

    // Prompt categories
    'domainMcp.promptCat.transactions': 'Lançamentos',
    'domainMcp.promptCat.settlements': 'Baixas',
    'domainMcp.promptCat.rates': 'Cotações',
    'domainMcp.promptCat.budgets': 'Metas',
    'domainMcp.promptCat.queries': 'Consultas',
    'domainMcp.promptCat.comparisons': 'Comparativos',
    'domainMcp.promptCat.backups': 'Backups',

    // 20 Prompt items
    'domainMcp.prompt.txSimple.title': 'Registrar despesa do dia a dia',
    'domainMcp.prompt.txSimple.prompt':
      'Registre uma despesa de R$ 42,00 no almoço de hoje na categoria Alimentação.',
    'domainMcp.prompt.txSimple.desc':
      'Lança um gasto pago na data atual. Se omitir a categoria, o app sugere automaticamente pelo histórico e descrição.',
    'domainMcp.prompt.txFuture.title': 'Agendar conta a pagar no futuro',
    'domainMcp.prompt.txFuture.prompt':
      'Agende uma despesa de R$ 2.200 do aluguel para o dia 10 do mês que vem na categoria Moradia.',
    'domainMcp.prompt.txFuture.desc':
      'Datas futuras ficam como pendentes automaticamente e entram na previsão financeira do mês correspondente.',
    'domainMcp.prompt.txInstallments.title': 'Lançar compra parcelada em N vezes',
    'domainMcp.prompt.txInstallments.prompt':
      'Lance a compra parcelada de um notebook no valor de R$ 3.600 em 10 parcelas mensais começando hoje.',
    'domainMcp.prompt.txInstallments.desc':
      'Cria as parcelas mensais calculando o valor unitário e marcando as futuras como pendentes de forma vinculada.',
    'domainMcp.prompt.txForeignCurrency.title':
      'Receita ou despesa em moeda estrangeira (USD / EUR)',
    'domainMcp.prompt.txForeignCurrency.prompt':
      'Recebi US$ 1.500 de uma consultoria internacional hoje. Registre como receita na minha conta em Dólar.',
    'domainMcp.prompt.txForeignCurrency.desc':
      'Registra o lançamento na moeda especificada com conversão pela taxa de câmbio offline fixada no cofre.',
    'domainMcp.prompt.accCreateMulti.title': 'Criar conta em moeda estrangeira',
    'domainMcp.prompt.accCreateMulti.prompt':
      'Crie uma conta corrente em Euro chamada "Wise Europa" com saldo inicial de 500 EUR.',
    'domainMcp.prompt.accCreateMulti.desc':
      'Adiciona uma nova conta em qualquer uma das 13 moedas globais suportadas no cofre.',
    'domainMcp.prompt.accTransfer.title':
      'Transferir valores entre contas (mesma ou outra moeda)',
    'domainMcp.prompt.accTransfer.prompt':
      'Transfira R$ 1.200 da Conta Principal para a Reserva de Emergência hoje.',
    'domainMcp.prompt.accTransfer.desc':
      'Lança automaticamente o par de saída e entrada. Entre moedas diferentes, converte usando a cotação offline do cofre.',
    'domainMcp.prompt.txSettle.title': 'Dar baixa (quitar) lançamento pendente',
    'domainMcp.prompt.txSettle.prompt':
      'Localize a conta de luz pendente deste mês e dê baixa marcando como paga com data de hoje.',
    'domainMcp.prompt.txSettle.desc':
      'Pesquisa o lançamento pendente, marca como pago e registra a data do pagamento sem alterar a competência original.',
    'domainMcp.prompt.txEditVal.title': 'Corrigir valor ou descrição de lançamento',
    'domainMcp.prompt.txEditVal.prompt':
      'Altere o valor do lançamento de ontem no Supermercado para R$ 185,50 e adicione a nota "Compras da semana".',
    'domainMcp.prompt.txEditVal.desc':
      'Atualiza valores, datas, notas ou descrições de qualquer lançamento já existente.',
    'domainMcp.prompt.txChangeCat.title': 'Mudar a categoria de um lançamento',
    'domainMcp.prompt.txChangeCat.prompt':
      'Mude a categoria do lançamento "Farmácia São Paulo" para a categoria Saúde & Farmácia.',
    'domainMcp.prompt.txChangeCat.desc':
      'Reclassifica o gasto para a categoria desejada mantendo as regras e metas orçamentárias íntegras.',
    'domainMcp.prompt.rateSetUsd.title': 'Definir cotação offline do Dólar (USD → BRL)',
    'domainMcp.prompt.rateSetUsd.prompt':
      'Defina a cotação do Dólar (USD para BRL) em 5,85 no meu cofre.',
    'domainMcp.prompt.rateSetUsd.desc':
      '100% offline soberano: atualiza a taxa sem acessar APIs externas e sincroniza as conversões em todo o app.',
    'domainMcp.prompt.rateSetAny.title':
      'Cadastrar cotação entre moedas populares (ex: EUR / BRL)',
    'domainMcp.prompt.rateSetAny.prompt':
      'Cadastre a cotação do Euro: 1 EUR = 6,32 BRL, e me mostre a lista de cotações salvas.',
    'domainMcp.prompt.rateSetAny.desc':
      'Aceita qualquer par entre as 13 moedas globais suportadas (USD, EUR, GBP, etc.).',
    'domainMcp.prompt.rateList.title': 'Listar cotações e moedas suportadas',
    'domainMcp.prompt.rateList.prompt':
      'Quais cotações de moedas estão cadastradas no meu cofre atualmente?',
    'domainMcp.prompt.rateList.desc':
      'Retorna todos os pares salvos no cofre, data de atualização, fonte e a lista fechada de moedas válidas.',
    'domainMcp.prompt.catCreateBudget.title': 'Criar nova categoria com teto mensal',
    'domainMcp.prompt.catCreateBudget.prompt':
      'Crie uma nova categoria de despesa chamada "Pets" com teto mensal de R$ 350.',
    'domainMcp.prompt.catCreateBudget.desc':
      'Cria a categoria no cofre e define o limite orçamentário mensal para acompanhamento nas metas.',
    'domainMcp.prompt.catAdjustBudget.title': 'Ajustar ou remover meta de gastos',
    'domainMcp.prompt.catAdjustBudget.prompt':
      'Aumente o teto mensal da categoria "Supermercado" para R$ 1.600.',
    'domainMcp.prompt.catAdjustBudget.desc':
      'Ajusta o limite de gastos mensal de despesas existentes. Use "null" ou "remover meta" para retirar o teto.',
    'domainMcp.prompt.queryOverview.title': 'Resumo do mês e previsão de saldo',
    'domainMcp.prompt.queryOverview.prompt':
      'Como estão minhas finanças este mês? Me mostre o saldo confirmado, previsto e quanto ainda tenho a pagar.',
    'domainMcp.prompt.queryOverview.desc':
      'Devolve a visão geral executiva do mês em BRL e USD, entradas, saídas e pendências a vencer.',
    'domainMcp.prompt.queryCatSpending.title': 'Consultar gastos por categoria',
    'domainMcp.prompt.queryCatSpending.prompt':
      'Quanto eu já gastei com Supermercado e Transporte neste mês?',
    'domainMcp.prompt.queryCatSpending.desc':
      'Filtra os lançamentos do mês pela categoria solicitada e soma os valores realizados.',
    'domainMcp.prompt.queryAccounts.title': 'Saldos de todas as contas',
    'domainMcp.prompt.queryAccounts.prompt':
      'Liste todas as minhas contas cadastradas com os saldos atuais e moedas.',
    'domainMcp.prompt.queryAccounts.desc':
      'Exibe cada conta bancária, carteira física ou conta internacional com saldos confirmados e projetados.',
    'domainMcp.prompt.compareMonths.title': 'Comparativo de gastos dos últimos meses',
    'domainMcp.prompt.compareMonths.prompt':
      'Compare meus gastos deste mês com os últimos 3 meses e me aponte as maiores variações.',
    'domainMcp.prompt.compareMonths.desc':
      'Analisa as variações mês a mês por competência e indica as categorias que mais subiram ou desceram.',
    'domainMcp.prompt.insightGenerate.title':
      'Gerar insight financeiro na aba Comparativos',
    'domainMcp.prompt.insightGenerate.prompt':
      'Gere o insight financeiro para a aba Comparativos do mês atual com destaques e análise das maiores saídas.',
    'domainMcp.prompt.insightGenerate.desc':
      'A IA redige um insight objetivo com causas, riscos e próximos passos, gravando cifrado diretamente no cofre.',
    'domainMcp.prompt.backupExport.title': 'Gerar backup cifrado do cofre (.myfbox.json)',
    'domainMcp.prompt.backupExport.prompt':
      'Gere um backup cifrado do meu cofre agora usando a ferramenta export_backup.',
    'domainMcp.prompt.backupExport.desc':
      'Exporta o envelope seguro (AES-256-GCM) para a pasta vaults/ do projeto e atualiza o carimbo de último backup.',

    // Tool docs categories & descriptions
    'domainMcp.toolCat.connection': 'Conexão',
    'domainMcp.toolCat.overview': 'Visão Geral',
    'domainMcp.toolCat.accounts': 'Contas',
    'domainMcp.toolCat.categories': 'Categorias',
    'domainMcp.toolCat.budgets': 'Metas',
    'domainMcp.toolCat.transactions': 'Lançamentos',
    'domainMcp.toolCat.offlineFx': 'Câmbio Offline',
    'domainMcp.toolCat.comparisons': 'Comparativos',
    'domainMcp.toolCat.aiInsights': 'Insights IA',
    'domainMcp.toolCat.backups': 'Backups',

    'domainMcp.tool.connectApp.desc':
      'Verifica o status da conexão com o app aberto ou gera o link de pareamento seguro.',
    'domainMcp.tool.getOverview.desc':
      'Resumo do mês: saldo confirmado e previsto (BRL/USD), total recebido e pago, pendências e cotações ativas.',
    'domainMcp.tool.getOverview.args': 'month? (AAAA-MM)',
    'domainMcp.tool.listAccounts.desc':
      'Lista contas com moeda, saldo confirmado e previsto até o fim do mês.',
    'domainMcp.tool.createAccount.desc':
      'Cria uma conta bancária, reserva, investimento ou carteira em qualquer das 16 moedas suportadas.',
    'domainMcp.tool.transferBetweenAccounts.desc':
      'Transfere valores entre duas contas com conversão multimoeda automática.',
    'domainMcp.tool.listCategories.desc':
      'Lista todas as categorias com tipo (income/expense), cor e meta mensal.',
    'domainMcp.tool.createCategory.desc':
      'Cria nova categoria no cofre (não duplica nome e tipo).',
    'domainMcp.tool.setCategoryBudget.desc':
      'Define, ajusta ou remove o teto de gastos mensal em reais de uma despesa.',
    'domainMcp.tool.setCategoryBudget.args': 'categoryId, monthlyBudget (número ou null)',
    'domainMcp.tool.listTransactions.desc':
      'Consulta lançamentos com filtros ricos por mês, tipo, status, categoria ou busca textual.',
    'domainMcp.tool.createTransaction.desc':
      'Registra lançamento único ou parcelado (2 a 36x) com sugestão automática inteligente de categoria.',
    'domainMcp.tool.updateTransaction.desc':
      'Atualiza campos de um lançamento, altera valores, notas ou dá baixa (status="paid", paidAt).',
    'domainMcp.tool.updateTransaction.args': 'id, ...campos a alterar',
    'domainMcp.tool.deleteTransaction.desc': 'Exclui definitivamente um lançamento do cofre.',
    'domainMcp.tool.setExchangeRate.desc':
      'Cadastra ou atualiza cotação de qualquer par entre moedas populares (100% offline).',
    'domainMcp.tool.setExchangeRate.args': 'from (código), to (código), rate (número > 0)',
    'domainMcp.tool.listExchangeRates.desc':
      'Lista todas as cotações salvas no cofre e a relação de moedas populares suportadas.',
    'domainMcp.tool.deleteExchangeRate.desc':
      'Remove a taxa de câmbio de um par específico do cofre.',
    'domainMcp.tool.deleteExchangeRate.args': 'from (código), to (código)',
    'domainMcp.tool.getMonthComparison.desc':
      'Comparativo mês a mês (até 24 meses) com receitas, despesas, variações e categorias com maior oscilação.',
    'domainMcp.tool.getMonthComparison.args': 'month?, months? (padrão 6)',
    'domainMcp.tool.saveInsight.desc':
      'Salva o insight analítico do mês cifrado no cofre (com título, narrativa, destaques e assinatura).',
    'domainMcp.tool.listInsights.desc': 'Lê os insights salvos pelo assistente no cofre.',
    'domainMcp.tool.deleteInsight.desc': 'Remove um insight salvo no cofre.',
    'domainMcp.tool.exportBackup.desc':
      'Salva um backup cifrado (AES-256-GCM) em vaults/ do projeto e atualiza "Último backup".',
  },

  'en-GB': {
    // defaultData
    'domainMcp.defaultData.vaultName': 'Personal Vault',
    'domainMcp.defaultData.mainAccount': 'Main Account',
    'domainMcp.defaultData.mainBank': 'Main Bank',
    'domainMcp.defaultData.cat.salary': 'Salary & Director Pay',
    'domainMcp.defaultData.cat.freelance': 'Projects & Consulting',
    'domainMcp.defaultData.cat.dividends': 'Returns & Dividends',
    'domainMcp.defaultData.cat.otherInc': 'Reimbursements & Other',
    'domainMcp.defaultData.cat.housing': 'Housing & Service Charge',
    'domainMcp.defaultData.cat.groceries': 'Supermarket & Groceries',
    'domainMcp.defaultData.cat.dining': 'Restaurants & Takeaway',
    'domainMcp.defaultData.cat.transport': 'Transport & Fuel',
    'domainMcp.defaultData.cat.health': 'Health & Pharmacy',
    'domainMcp.defaultData.cat.subs': 'Subscriptions, Cloud & Internet',
    'domainMcp.defaultData.cat.leisure': 'Leisure, Books & Travel',

    // categories
    'domainMcp.categories.other': 'Other',

    // validation
    'domainMcp.validation.invalidEnvelope': 'Invalid or corrupted vault format.',
    'domainMcp.validation.invalidKdfHeader': 'Invalid vault KDF header.',
    'domainMcp.validation.invalidPbkdf2Iterations':
      'PBKDF2 iteration parameter is outside security limits.',
    'domainMcp.validation.invalidCipherBlock': 'Invalid vault cryptographic block.',
    'domainMcp.validation.invalidVerifierBlock': 'Invalid vault verifier block.',
    'domainMcp.validation.invalidPayloadStructure': 'Invalid internal vault structure.',
    'domainMcp.validation.missingPayloadCollections':
      'Vault data collections are missing or corrupted.',
    'domainMcp.validation.accountFallback': 'Account',
    'domainMcp.validation.mainAccount': 'Main Account',
    'domainMcp.validation.categoryFallback': 'Category',
    'domainMcp.validation.transactionFallback': 'Transaction',
    'domainMcp.validation.vaultFallback': 'Personal Vault',

    // vaultUseCases
    'domainMcp.vaultUseCases.copySuffix': '(Copy)',
    'domainMcp.vaultUseCases.transferInvalidAccounts':
      'Select valid and distinct source and destination accounts.',
    'domainMcp.vaultUseCases.transferNoRate':
      'No {{from}}/{{to}} exchange rate registered to convert between different currencies.',
    'domainMcp.vaultUseCases.transferTo': 'To {{account}}',
    'domainMcp.vaultUseCases.transferFrom': 'From {{account}}',
    'domainMcp.vaultUseCases.transferInternalNote': 'Internal transfer between accounts',
    'domainMcp.vaultUseCases.rateSourceManual': 'manual',

    // cryptoVault
    'domainMcp.cryptoVault.invalidSalt': 'Invalid cryptographic salt in envelope.',
    'domainMcp.cryptoVault.invalidVerifierIv': 'Invalid verifier IV.',
    'domainMcp.cryptoVault.invalidVerifier': 'Invalid key verifier.',
    'domainMcp.cryptoVault.invalidMasterPassword':
      'Incorrect master password or invalid authentication data.',
    'domainMcp.cryptoVault.invalidCipherIv': 'Invalid data block IV.',
    'domainMcp.cryptoVault.decryptFailed':
      'Failed to decrypt the financial vault (AES-256-GCM tag mismatch).',

    // importExport
    'domainMcp.importExport.defaultVaultSlug': 'vault',
    'domainMcp.importExport.csvHeader.date': 'Date',
    'domainMcp.importExport.csvHeader.description': 'Description',
    'domainMcp.importExport.csvHeader.type': 'Type',
    'domainMcp.importExport.csvHeader.status': 'Status',
    'domainMcp.importExport.csvHeader.paidAt': 'Paid_at',
    'domainMcp.importExport.csvHeader.amount': 'Amount',
    'domainMcp.importExport.csvHeader.currency': 'Currency',
    'domainMcp.importExport.csvHeader.fixedRate': 'Fixed_Rate_BRL',
    'domainMcp.importExport.csvHeader.category': 'Category',
    'domainMcp.importExport.csvHeader.account': 'Account',
    'domainMcp.importExport.csvHeader.notes': 'Notes',
    'domainMcp.importExport.csvTypeIncome': 'Income',
    'domainMcp.importExport.csvTypeExpense': 'Expense',
    'domainMcp.importExport.csvStatusPaid': 'Paid',
    'domainMcp.importExport.csvStatusPending': 'Pending',
    'domainMcp.importExport.csvNoCategory': 'Uncategorised',
    'domainMcp.importExport.csvDefaultAccount': 'Default Account',
    'domainMcp.importExport.csvFilenamePrefix': 'myfbox-transactions',

    // mcpConfig
    'domainMcp.mcpConfig.defaultServerPath': '/ABSOLUTE/PATH/MyFBox/mcp/server.mjs',
    'domainMcp.mcpConfig.agentPromptWeb':
      'Configure the "myfbox" MCP server in your MCP settings using command="npx", args=["-y", "{{pkg}}"]. Then connect to my vault by calling connect_app.',
    'domainMcp.mcpConfig.agentPromptWebWithUrl':
      'Configure the "myfbox" MCP server in your MCP settings using command="npx", args=["-y", "{{pkg}}"] and env MYFBOX_APP_URL="{{appUrl}}". Then connect to my vault by calling connect_app.',
    'domainMcp.mcpConfig.agentPromptLocal':
      'Configure the "myfbox" MCP server in your MCP settings using command="node" and args=["{{serverPath}}"]. Then connect to my vault by calling connect_app.',

    // mcpBridge
    'domainMcp.mcpBridge.openError': 'Failed to open connection',
    'domainMcp.mcpBridge.pairRejected': 'Pairing code rejected by the MCP server.',
    'domainMcp.mcpBridge.serverNotFound':
      'Local MCP server not found. Is it running?',
    'domainMcp.mcpBridge.closeReason': 'MCP disabled',

    // mcpActions
    'domainMcp.mcpActions.missingRequiredField': 'Missing required field: {{key}}',
    'domainMcp.mcpActions.fieldMustBeText': 'Field {{key}} must be text',
    'domainMcp.mcpActions.fieldMustBeNumber': 'Field {{key}} must be a number',
    'domainMcp.mcpActions.fieldMustBeOneOf': 'Field {{key}} must be one of: {{options}}',
    'domainMcp.mcpActions.invalidIsoDate': '{{key}} must be in YYYY-MM-DD format',
    'domainMcp.mcpActions.invalidYearMonth': '{{key}} must be in YYYY-MM format',
    'domainMcp.mcpActions.accountNotFound': 'Account not found: {{id}}',
    'domainMcp.mcpActions.accountNameNotFound':
      'Account "{{name}}" not found. Accounts: {{accounts}}',
    'domainMcp.mcpActions.noAccountsInVault': 'The vault has no accounts.',
    'domainMcp.mcpActions.categoryNotFound': '{{type}} category not found: {{id}}',
    'domainMcp.mcpActions.categoryNameNotFound':
      'Category "{{name}}" ({{type}}) does not exist. Create it with create_category or use one of: {{categories}}',
    'domainMcp.mcpActions.none': '(none)',
    'domainMcp.mcpActions.noticeCreatedAccount': 'MCP created account "{{name}}" ({{currency}})',
    'domainMcp.mcpActions.missingFromAccount':
      'Provide fromAccountId or fromAccountName for the source account.',
    'domainMcp.mcpActions.missingToAccount':
      'Provide toAccountId or toAccountName for the destination account.',
    'domainMcp.mcpActions.amountPositive': 'amount must be greater than zero',
    'domainMcp.mcpActions.noticeTransferred': 'MCP transferred from "{{from}}" to "{{to}}"',
    'domainMcp.mcpActions.missingType': 'Missing required field: type (income or expense)',
    'domainMcp.mcpActions.budgetNonNegative': 'monthlyBudget cannot be negative',
    'domainMcp.mcpActions.noticeCreatedCategory': 'MCP created category "{{name}}"',
    'domainMcp.mcpActions.budgetInvalidValue':
      'monthlyBudget must be a number >= 0, or null to remove the budget',
    'domainMcp.mcpActions.categoryNotFoundById': 'Category not found: {{id}}',
    'domainMcp.mcpActions.budgetExpenseOnly': 'Budgets only exist for expense categories',
    'domainMcp.mcpActions.noticeSetBudget': 'MCP set the budget for "{{name}}"',
    'domainMcp.mcpActions.noticeRemovedBudget': 'MCP removed the budget for "{{name}}"',
    'domainMcp.mcpActions.amountPositiveWithType':
      'amount must be greater than zero (the type defines the sign)',
    'domainMcp.mcpActions.ratePositive': 'exchangeRate must be greater than zero',
    'domainMcp.mcpActions.noticeCreatedTxMany': 'MCP recorded {{count}} transactions for "{{desc}}"',
    'domainMcp.mcpActions.noticeCreatedTxOne': 'MCP recorded "{{desc}}"',
    'domainMcp.mcpActions.txNotFound': 'Transaction not found: {{id}}',
    'domainMcp.mcpActions.paidAtFuture': 'paidAt cannot be in the future',
    'domainMcp.mcpActions.noticeUpdatedTx': 'MCP updated "{{desc}}"',
    'domainMcp.mcpActions.noticeDeletedTx': 'MCP deleted "{{desc}}"',
    'domainMcp.mcpActions.missingMonth': 'Missing required field: month (YYYY-MM)',
    'domainMcp.mcpActions.titleMaxLength': 'title must be up to 120 characters',
    'domainMcp.mcpActions.bodyMaxLength': 'body must be up to 4000 characters',
    'domainMcp.mcpActions.highlightsMustBeTextList': 'highlights must be a list of strings',
    'domainMcp.mcpActions.noticeUpdatedInsight': 'MCP updated the insight for {{month}}',
    'domainMcp.mcpActions.noticeCreatedInsight': 'MCP wrote the insight for {{month}}',
    'domainMcp.mcpActions.insightNotFound': 'There is no insight for {{month}}',
    'domainMcp.mcpActions.noticeDeletedInsight': 'MCP removed the insight for {{month}}',
    'domainMcp.mcpActions.offlineRatesNote':
      'MyFBox operates 100% offline. Exchange rates are entered manually or by the agent via MCP.',
    'domainMcp.mcpActions.alreadyExists': 'already exists',
    'domainMcp.mcpActions.defaultTransferDescription': 'Transfer between accounts',
    'domainMcp.mcpActions.comparisonNote':
      'Amounts in BRL. Monthly totals include paid + pending (accrual basis). Foreign currencies converted using the fixed transaction rate or current rate.',
    'domainMcp.mcpActions.fromToRequired': 'from and to are required',
    'domainMcp.mcpActions.ratePositiveNumber': 'rate must be a positive number greater than zero',
    'domainMcp.mcpActions.unsupportedFromCurrency':
      'Source currency "{{currency}}" is not supported. Choose one of: {{supported}}',
    'domainMcp.mcpActions.unsupportedToCurrency':
      'Destination currency "{{currency}}" is not supported. Choose one of: {{supported}}',
    'domainMcp.mcpActions.sameCurrencyError': 'Source and destination currencies must be different',
    'domainMcp.mcpActions.noticeSetRate': 'MCP set rate {{from}}/{{to}}: {{rate}}',
    'domainMcp.mcpActions.noticeDeletedRate': 'MCP removed rate {{from}}/{{to}}',
    'domainMcp.mcpActions.forbiddenCreateVault':
      'Creating a vault is a user-only operation in the browser interface.',
    'domainMcp.mcpActions.forbiddenDeleteVault':
      'Deleting the vault is a user-only operation in the browser interface.',
    'domainMcp.mcpActions.forbiddenExportCsv':
      'MCP does not create unencrypted backups. Exporting CSV is user-only via the app interface (Backups › Export CSV).',
    'domainMcp.mcpActions.forbiddenExportUnencrypted':
      'MCP does not create unencrypted backups. Use export_backup to generate an encrypted backup (.myfbox.json with AES-256-GCM).',
    'domainMcp.mcpActions.forbiddenChangePassword':
      'Changing the master password is user-only in the browser interface.',
    'domainMcp.mcpActions.forbiddenRestoreBackup':
      'Restoring a backup is user-only in the browser interface.',
    'domainMcp.mcpActions.unknownAction': 'Unknown action: {{name}}',

    // McpPairDialog
    'domainMcp.pair.title': 'Connect assistant',
    'domainMcp.pair.reject': 'Decline',
    'domainMcp.pair.description':
      'An assistant (local MCP server) wants to access this vault to view and record transactions. It only works on this machine and while the vault is unlocked.',
    'domainMcp.pair.codeLabel': 'Check that the code matches the one shown by the assistant',
    'domainMcp.pair.factLoopback': 'Connection limited to 127.0.0.1, port {{port}}',
    'domainMcp.pair.factSecrets': 'Your password and vault key never leave the browser',
    'domainMcp.pair.factDisable':
      'You can turn it off any time in Settings › Local MCP Mode',
    'domainMcp.pair.authorise': 'Authorise',

    // McpInstructionsModal
    'domainMcp.modal.badge': 'OFFICIAL MCP & SKILLS',
    'domainMcp.modal.title': 'MCP Instructions & Prompts Guide',
    'domainMcp.modal.subtitle':
      'Operate your financial vault with any MCP-compatible AI assistant or agent via a 100% secure and sovereign local bridge.',
    'domainMcp.modal.closeAria': 'Close instructions modal',
    'domainMcp.modal.tabPrompts': 'Prompts ({{count}})',
    'domainMcp.modal.tabCapabilities': 'Capabilities ({{count}})',
    'domainMcp.modal.tabInstall': 'Installation',
    'domainMcp.modal.tabSecurity': 'Security',
    'domainMcp.modal.searchPlaceholder':
      'Search by prompt, action, tool or category...',
    'domainMcp.modal.clearSearchAria': 'Clear search',
    'domainMcp.modal.filterAll': 'All',
    'domainMcp.modal.emptyPrompts': 'No prompts found for the selected filters.',
    'domainMcp.modal.copyPromptTitle': 'Copy prompt to the assistant chat',
    'domainMcp.modal.copied': 'Copied!',
    'domainMcp.modal.copyPrompt': 'Copy Prompt',
    'domainMcp.modal.capCalloutTitle': 'What the assistant can do in MyFBox:',
    'domainMcp.modal.capCalloutBody':
      'The MCP server exposes 20 organised tools covering all essential vault operations. Every action writes to the encrypted vault and displays visible notices in the app.',
    'domainMcp.modal.tableTool': 'Tool',
    'domainMcp.modal.tableCategory': 'Category',
    'domainMcp.modal.tableWhat': 'What it does',
    'domainMcp.modal.tableParams': 'Parameters',
    'domainMcp.modal.skillsSubtitle': 'Included Specialised Skills',
    'domainMcp.modal.skillMyfboxTitle': 'Skill: myfbox (.claude/skills/myfbox/SKILL.md)',
    'domainMcp.modal.skillMyfboxDesc':
      'Manages transactions, account creation and multi-currency transfers, N-month instalments, AI category suggestions, monthly budgets and offline exchange rates (16 currencies).',
    'domainMcp.modal.skillInsightsTitle':
      'Skill: myfbox-insights (.claude/skills/myfbox-insights/SKILL.md)',
    'domainMcp.modal.skillInsightsDesc':
      'Compares months, detects fluctuations and writes practical analytical insights stored directly in the encrypted vault for the Comparisons tab (with local voice playback support).',
    'domainMcp.modal.installStep1Title': 'Practical Setup in this Environment',
    'domainMcp.modal.installStep1Desktop':
      'In the Desktop app (Linux, Windows and macOS), the MCP server is already built into the application. Just have Node.js installed and paste the configuration below:',
    'domainMcp.modal.installStep1Web':
      'In the Web version, npx downloads and runs the MCP server automatically without cloning the repository (requires Node.js and Git):',
    'domainMcp.modal.installStep1Local':
      'Add to your client MCP configuration pointing to the mcp/server.mjs script:',
    'domainMcp.modal.installJsonHeader':
      'MCP Configuration (JSON — Claude Desktop, Cursor, Windsurf, Antigravity)',
    'domainMcp.modal.copyJson': 'Copy JSON',
    'domainMcp.modal.installCliHeader': 'Terminal shortcut (Claude Code CLI)',
    'domainMcp.modal.copyCli': 'Copy CLI',
    'domainMcp.modal.installStep2Title': 'Direct Use in the Repository Folder (.mcp.json)',
    'domainMcp.modal.installStep2DescBefore':
      'If you opened your AI assistant directly inside the cloned MyFBox folder, the',
    'domainMcp.modal.installStep2DescAfter':
      'file at the root already registers the server automatically:',
    'domainMcp.modal.installStep2Header': '.mcp.json (at project root)',
    'domainMcp.modal.copy': 'Copy',
    'domainMcp.modal.installStep3Title': 'How to Pair with 1 Command',
    'domainMcp.modal.installStep3Desc': 'In the AI assistant chat, send the pairing prompt:',
    'domainMcp.modal.pairPrompt':
      'Connect to MyFBox via the local MCP server and show me the connection status.',
    'domainMcp.modal.installStep3Li1Before': 'The assistant will call',
    'domainMcp.modal.installStep3Li1After': 'and return a link with a short code.',
    'domainMcp.modal.installStep3Li2':
      'Open the link in this browser with the vault unlocked.',
    'domainMcp.modal.installStep3Li3Before':
      'Verify the visual confirmation code and click',
    'domainMcp.modal.installStep3Li3Strong': 'Authorise',
    'domainMcp.modal.securityBannerTitle': 'Sovereign Local-First Architecture',
    'domainMcp.modal.securityBannerDesc':
      'MyFBox was designed so artificial intelligence serves you without requiring you to give up your financial privacy.',
    'domainMcp.modal.secCard1Title': 'Your master password never leaves the browser',
    'domainMcp.modal.secCard1BodyBefore':
      'The MCP process never sees your password or your derived AES-256-GCM key. It only sends JSON messages to the open app via WebSocket on local loopback (',
    'domainMcp.modal.secCard1BodyAfter': ').',
    'domainMcp.modal.secCard2Title': '100% Sovereign Offline',
    'domainMcp.modal.secCard2Body':
      'The application makes no calls to third-party APIs. Currency rates and all categorisation and comparison rules are processed strictly locally.',
    'domainMcp.modal.secCard3Title': 'Locked Vault = Blocked Access',
    'domainMcp.modal.secCard3Body':
      'If you lock the vault or the inactivity auto-lock timer expires, the MCP server immediately replies that the vault is inaccessible. No AI action can unlock the vault without your manually typed master password.',
    'domainMcp.modal.secCard4Title': 'Full Transparency & Notices',
    'domainMcp.modal.secCard4Body':
      'Whenever MCP records, edits or deletes a transaction, a real-time notice appears in the interface stating exactly what was executed.',
    'domainMcp.modal.secCard5Title': 'User-Only Operations (Blocked in MCP)',
    'domainMcp.modal.secCard5Body1': 'MCP',
    'domainMcp.modal.secCard5BodyStrong': 'cannot',
    'domainMcp.modal.secCard5Body2':
      'create a vault, delete/reset the vault, change the master password, or create unencrypted backups. CSV spreadsheet export is user-only via the app interface; via MCP, the only permitted backup is the encrypted envelope (',
    'domainMcp.modal.secCard5Body3': ').',
    'domainMcp.modal.footerTipLabel': 'Tip: Try combining prompts, such as:',
    'domainMcp.modal.footerTipExample':
      '"Create the Pets category with a £300 budget and record £89.90 for pet food in it"',
    'domainMcp.modal.footerClose': 'Got it, close',

    // Prompt categories
    'domainMcp.promptCat.transactions': 'Transactions',
    'domainMcp.promptCat.settlements': 'Settlements',
    'domainMcp.promptCat.rates': 'Rates',
    'domainMcp.promptCat.budgets': 'Budgets',
    'domainMcp.promptCat.queries': 'Queries',
    'domainMcp.promptCat.comparisons': 'Comparisons',
    'domainMcp.promptCat.backups': 'Backups',

    // 20 Prompt items
    'domainMcp.prompt.txSimple.title': 'Record an everyday expense',
    'domainMcp.prompt.txSimple.prompt':
      'Record an expense of £18.50 for today’s lunch under the Dining category.',
    'domainMcp.prompt.txSimple.desc':
      'Logs a paid expense on today’s date. If you omit the category, the app suggests one automatically from history and description.',
    'domainMcp.prompt.txFuture.title': 'Schedule a future bill to pay',
    'domainMcp.prompt.txFuture.prompt':
      'Schedule a rent expense of £1,400 for the 10th of next month under the Housing category.',
    'domainMcp.prompt.txFuture.desc':
      'Future dates are automatically marked as pending and included in that month’s financial forecast.',
    'domainMcp.prompt.txInstallments.title': 'Record a purchase in N instalments',
    'domainMcp.prompt.txInstallments.prompt':
      'Record a laptop purchase of £1,800 split into 10 monthly instalments starting today.',
    'domainMcp.prompt.txInstallments.desc':
      'Creates the monthly instalments by calculating the unit amount and marking future ones as linked pending items.',
    'domainMcp.prompt.txForeignCurrency.title':
      'Income or expense in foreign currency (USD / EUR)',
    'domainMcp.prompt.txForeignCurrency.prompt':
      'I received US$ 1,500 from an international consultancy today. Record it as income in my USD account.',
    'domainMcp.prompt.txForeignCurrency.desc':
      'Records the transaction in the specified currency with conversion using the offline exchange rate stored in the vault.',
    'domainMcp.prompt.accCreateMulti.title': 'Create a foreign-currency account',
    'domainMcp.prompt.accCreateMulti.prompt':
      'Create a current account in Euro called "Wise Europe" with an opening balance of 500 EUR.',
    'domainMcp.prompt.accCreateMulti.desc':
      'Adds a new account in any of the 13 global currencies supported in the vault.',
    'domainMcp.prompt.accTransfer.title':
      'Transfer funds between accounts (same or different currency)',
    'domainMcp.prompt.accTransfer.prompt':
      'Transfer £500 from Main Account to Emergency Reserve today.',
    'domainMcp.prompt.accTransfer.desc':
      'Automatically records the outgoing and incoming pair. Across different currencies, converts using the vault’s offline rate.',
    'domainMcp.prompt.txSettle.title': 'Settle (mark as paid) a pending transaction',
    'domainMcp.prompt.txSettle.prompt':
      'Find this month’s pending electricity bill and settle it by marking it as paid with today’s date.',
    'domainMcp.prompt.txSettle.desc':
      'Finds the pending transaction, marks it as paid and records the payment date without altering the original due month.',
    'domainMcp.prompt.txEditVal.title': 'Edit a transaction amount or description',
    'domainMcp.prompt.txEditVal.prompt':
      'Update yesterday’s Supermarket transaction amount to £85.50 and add the note "Weekly shop".',
    'domainMcp.prompt.txEditVal.desc':
      'Updates amounts, dates, notes or descriptions of any existing transaction.',
    'domainMcp.prompt.txChangeCat.title': 'Change a transaction’s category',
    'domainMcp.prompt.txChangeCat.prompt':
      'Change the category of the "Boots Pharmacy" transaction to Health & Pharmacy.',
    'domainMcp.prompt.txChangeCat.desc':
      'Reclassifies the expense to the chosen category while keeping rules and monthly budgets intact.',
    'domainMcp.prompt.rateSetUsd.title': 'Set offline USD exchange rate (USD → BRL)',
    'domainMcp.prompt.rateSetUsd.prompt':
      'Set the US Dollar exchange rate (USD to BRL) to 5.85 in my vault.',
    'domainMcp.prompt.rateSetUsd.desc':
      '100% sovereign offline: updates the rate without calling external APIs and synchronises conversions across the app.',
    'domainMcp.prompt.rateSetAny.title':
      'Add exchange rate between popular currencies (e.g. EUR / GBP)',
    'domainMcp.prompt.rateSetAny.prompt':
      'Add the Euro rate: 1 EUR = 0.85 GBP, and show me the list of saved rates.',
    'domainMcp.prompt.rateSetAny.desc':
      'Accepts any pair among the 13 supported global currencies (USD, EUR, GBP, etc.).',
    'domainMcp.prompt.rateList.title': 'List saved rates and supported currencies',
    'domainMcp.prompt.rateList.prompt':
      'Which currency exchange rates are currently saved in my vault?',
    'domainMcp.prompt.rateList.desc':
      'Returns all pairs saved in the vault, update date, source and the closed list of valid currencies.',
    'domainMcp.prompt.catCreateBudget.title': 'Create a new category with a monthly budget',
    'domainMcp.prompt.catCreateBudget.prompt':
      'Create a new expense category called "Pets" with a monthly budget of £150.',
    'domainMcp.prompt.catCreateBudget.desc':
      'Creates the category in the vault and sets the monthly spending limit for budget tracking.',
    'domainMcp.prompt.catAdjustBudget.title': 'Adjust or remove a spending budget',
    'domainMcp.prompt.catAdjustBudget.prompt':
      'Increase the monthly budget for the "Supermarket" category to £600.',
    'domainMcp.prompt.catAdjustBudget.desc':
      'Adjusts the monthly spending limit for existing expense categories. Use "null" or "remove budget" to clear the limit.',
    'domainMcp.prompt.queryOverview.title': 'Monthly summary and balance forecast',
    'domainMcp.prompt.queryOverview.prompt':
      'How are my finances this month? Show me the confirmed balance, projected balance and what is still due.',
    'domainMcp.prompt.queryOverview.desc':
      'Returns the executive monthly overview in BRL and USD, inflows, outflows and upcoming pending items.',
    'domainMcp.prompt.queryCatSpending.title': 'Check spending by category',
    'domainMcp.prompt.queryCatSpending.prompt':
      'How much have I already spent on Supermarket and Transport this month?',
    'domainMcp.prompt.queryCatSpending.desc':
      'Filters this month’s transactions by the requested category and sums the actual amounts.',
    'domainMcp.prompt.queryAccounts.title': 'Balances of all accounts',
    'domainMcp.prompt.queryAccounts.prompt':
      'List all my registered accounts with their current balances and currencies.',
    'domainMcp.prompt.queryAccounts.desc':
      'Displays each bank account, cash wallet or international account with confirmed and projected balances.',
    'domainMcp.prompt.compareMonths.title': 'Spending comparison for recent months',
    'domainMcp.prompt.compareMonths.prompt':
      'Compare my spending this month with the last 3 months and highlight the biggest changes.',
    'domainMcp.prompt.compareMonths.desc':
      'Analyses month-by-month changes and highlights the categories that rose or fell the most.',
    'domainMcp.prompt.insightGenerate.title':
      'Generate financial insight in the Comparisons tab',
    'domainMcp.prompt.insightGenerate.prompt':
      'Generate the financial insight for this month’s Comparisons tab with highlights and analysis of top expenses.',
    'domainMcp.prompt.insightGenerate.desc':
      'The AI writes a concise insight with causes, risks and next steps, saved encrypted directly in the vault.',
    'domainMcp.prompt.backupExport.title': 'Create encrypted vault backup (.myfbox.json)',
    'domainMcp.prompt.backupExport.prompt':
      'Create an encrypted backup of my vault now using the export_backup tool.',
    'domainMcp.prompt.backupExport.desc':
      'Exports the secure envelope (AES-256-GCM) to the project’s vaults/ folder and updates the last backup timestamp.',

    // Tool docs categories & descriptions
    'domainMcp.toolCat.connection': 'Connection',
    'domainMcp.toolCat.overview': 'Overview',
    'domainMcp.toolCat.accounts': 'Accounts',
    'domainMcp.toolCat.categories': 'Categories',
    'domainMcp.toolCat.budgets': 'Budgets',
    'domainMcp.toolCat.transactions': 'Transactions',
    'domainMcp.toolCat.offlineFx': 'Offline FX',
    'domainMcp.toolCat.comparisons': 'Comparisons',
    'domainMcp.toolCat.aiInsights': 'AI Insights',
    'domainMcp.toolCat.backups': 'Backups',

    'domainMcp.tool.connectApp.desc':
      'Checks the connection status with the open app or generates the secure pairing link.',
    'domainMcp.tool.getOverview.desc':
      'Monthly summary: confirmed and projected balance (BRL/USD), total received and paid, pending items and active rates.',
    'domainMcp.tool.getOverview.args': 'month? (YYYY-MM)',
    'domainMcp.tool.listAccounts.desc':
      'Lists accounts with currency, confirmed balance and projected end-of-month balance.',
    'domainMcp.tool.createAccount.desc':
      'Creates a bank, reserve, investment or cash account in any of the 16 supported currencies.',
    'domainMcp.tool.transferBetweenAccounts.desc':
      'Transfers funds between two accounts with automatic multi-currency conversion.',
    'domainMcp.tool.listCategories.desc':
      'Lists all categories with type (income/expense), colour and monthly budget.',
    'domainMcp.tool.createCategory.desc':
      'Creates a new category in the vault (does not duplicate name and type).',
    'domainMcp.tool.setCategoryBudget.desc':
      'Sets, adjusts or removes the monthly spending limit in BRL for an expense category.',
    'domainMcp.tool.setCategoryBudget.args': 'categoryId, monthlyBudget (number or null)',
    'domainMcp.tool.listTransactions.desc':
      'Queries transactions with rich filters by month, type, status, category or text search.',
    'domainMcp.tool.createTransaction.desc':
      'Records a single or instalment transaction (2 to 36x) with smart automatic category suggestion.',
    'domainMcp.tool.updateTransaction.desc':
      'Updates transaction fields, changes amounts/notes or settles it (status="paid", paidAt).',
    'domainMcp.tool.updateTransaction.args': 'id, ...fields to update',
    'domainMcp.tool.deleteTransaction.desc': 'Permanently deletes a transaction from the vault.',
    'domainMcp.tool.setExchangeRate.desc':
      'Adds or updates the exchange rate for any pair among popular currencies (100% offline).',
    'domainMcp.tool.setExchangeRate.args': 'from (code), to (code), rate (number > 0)',
    'domainMcp.tool.listExchangeRates.desc':
      'Lists all exchange rates saved in the vault and the supported popular currencies.',
    'domainMcp.tool.deleteExchangeRate.desc':
      'Removes the exchange rate for a specific pair from the vault.',
    'domainMcp.tool.deleteExchangeRate.args': 'from (code), to (code)',
    'domainMcp.tool.getMonthComparison.desc':
      'Month-by-month comparison (up to 24 months) with income, expenses, changes and top-moving categories.',
    'domainMcp.tool.getMonthComparison.args': 'month?, months? (default 6)',
    'domainMcp.tool.saveInsight.desc':
      'Saves the monthly analytical insight encrypted in the vault (with title, narrative, highlights and signature).',
    'domainMcp.tool.listInsights.desc': 'Reads insights saved by the assistant in the vault.',
    'domainMcp.tool.deleteInsight.desc': 'Removes a saved insight from the vault.',
    'domainMcp.tool.exportBackup.desc':
      'Saves an encrypted backup (AES-256-GCM) in the project’s vaults/ folder and updates "Last backup".',
  },

  es: {
    // defaultData
    'domainMcp.defaultData.vaultName': 'Bóveda Personal',
    'domainMcp.defaultData.mainAccount': 'Cuenta Principal',
    'domainMcp.defaultData.mainBank': 'Banco Principal',
    'domainMcp.defaultData.cat.salary': 'Salario y Honorarios',
    'domainMcp.defaultData.cat.freelance': 'Proyectos y Consultoría',
    'domainMcp.defaultData.cat.dividends': 'Rendimientos y Dividendos',
    'domainMcp.defaultData.cat.otherInc': 'Reembolsos y Otros',
    'domainMcp.defaultData.cat.housing': 'Vivienda y Gastos Comunes',
    'domainMcp.defaultData.cat.groceries': 'Supermercado y Mercado',
    'domainMcp.defaultData.cat.dining': 'Restaurantes y Delivery',
    'domainMcp.defaultData.cat.transport': 'Transporte y Combustible',
    'domainMcp.defaultData.cat.health': 'Salud y Farmacia',
    'domainMcp.defaultData.cat.subs': 'Suscripciones, Nube e Internet',
    'domainMcp.defaultData.cat.leisure': 'Ocio, Libros y Viajes',

    // categories
    'domainMcp.categories.other': 'Otros',

    // validation
    'domainMcp.validation.invalidEnvelope': 'Formato de bóveda inválido o corrupto.',
    'domainMcp.validation.invalidKdfHeader': 'Encabezado KDF de la bóveda inválido.',
    'domainMcp.validation.invalidPbkdf2Iterations':
      'Parámetro de iteraciones PBKDF2 fuera de los límites de seguridad.',
    'domainMcp.validation.invalidCipherBlock': 'Bloque criptográfico de la bóveda inválido.',
    'domainMcp.validation.invalidVerifierBlock': 'Bloque verificador de la bóveda inválido.',
    'domainMcp.validation.invalidPayloadStructure': 'Estructura interna de la bóveda inválida.',
    'domainMcp.validation.missingPayloadCollections':
      'Colecciones de datos de la bóveda ausentes o corruptas.',
    'domainMcp.validation.accountFallback': 'Cuenta',
    'domainMcp.validation.mainAccount': 'Cuenta Principal',
    'domainMcp.validation.categoryFallback': 'Categoría',
    'domainMcp.validation.transactionFallback': 'Movimiento',
    'domainMcp.validation.vaultFallback': 'Bóveda Personal',

    // vaultUseCases
    'domainMcp.vaultUseCases.copySuffix': '(Copia)',
    'domainMcp.vaultUseCases.transferInvalidAccounts':
      'Selecciona cuentas de origen y destino válidas y distintas.',
    'domainMcp.vaultUseCases.transferNoRate':
      'Sin cotización {{from}}/{{to}} registrada para convertir entre monedas diferentes.',
    'domainMcp.vaultUseCases.transferTo': 'Para {{account}}',
    'domainMcp.vaultUseCases.transferFrom': 'De {{account}}',
    'domainMcp.vaultUseCases.transferInternalNote': 'Transferencia interna entre cuentas',
    'domainMcp.vaultUseCases.rateSourceManual': 'manual',

    // cryptoVault
    'domainMcp.cryptoVault.invalidSalt': 'Sal criptográfica inválida en el sobre.',
    'domainMcp.cryptoVault.invalidVerifierIv': 'IV del verificador inválido.',
    'domainMcp.cryptoVault.invalidVerifier': 'Verificador de clave inválido.',
    'domainMcp.cryptoVault.invalidMasterPassword':
      'Contraseña maestra incorrecta o datos de autenticación inválidos.',
    'domainMcp.cryptoVault.invalidCipherIv': 'IV del bloque de datos inválido.',
    'domainMcp.cryptoVault.decryptFailed':
      'Error al descifrar la bóveda financiera (AES-256-GCM tag mismatch).',

    // importExport
    'domainMcp.importExport.defaultVaultSlug': 'boveda',
    'domainMcp.importExport.csvHeader.date': 'Fecha',
    'domainMcp.importExport.csvHeader.description': 'Descripcion',
    'domainMcp.importExport.csvHeader.type': 'Tipo',
    'domainMcp.importExport.csvHeader.status': 'Estado',
    'domainMcp.importExport.csvHeader.paidAt': 'Pagado_el',
    'domainMcp.importExport.csvHeader.amount': 'Importe',
    'domainMcp.importExport.csvHeader.currency': 'Moneda',
    'domainMcp.importExport.csvHeader.fixedRate': 'Cotizacion_Fijada_BRL',
    'domainMcp.importExport.csvHeader.category': 'Categoría',
    'domainMcp.importExport.csvHeader.account': 'Cuenta',
    'domainMcp.importExport.csvHeader.notes': 'Notas',
    'domainMcp.importExport.csvTypeIncome': 'Ingreso',
    'domainMcp.importExport.csvTypeExpense': 'Gasto',
    'domainMcp.importExport.csvStatusPaid': 'Pagado',
    'domainMcp.importExport.csvStatusPending': 'Pendiente',
    'domainMcp.importExport.csvNoCategory': 'Sin Categoría',
    'domainMcp.importExport.csvDefaultAccount': 'Cuenta Predeterminada',
    'domainMcp.importExport.csvFilenamePrefix': 'myfbox-movimientos',

    // mcpConfig
    'domainMcp.mcpConfig.defaultServerPath': '/RUTA/ABSOLUTA/MyFBox/mcp/server.mjs',
    'domainMcp.mcpConfig.agentPromptWeb':
      'Configura el servidor MCP "myfbox" en tu configuración MCP usando command="npx", args=["-y", "{{pkg}}"]. Luego conéctate a mi bóveda llamando a connect_app.',
    'domainMcp.mcpConfig.agentPromptWebWithUrl':
      'Configura el servidor MCP "myfbox" en tu configuración MCP usando command="npx", args=["-y", "{{pkg}}"] y env MYFBOX_APP_URL="{{appUrl}}". Luego conéctate a mi bóveda llamando a connect_app.',
    'domainMcp.mcpConfig.agentPromptLocal':
      'Configura el servidor MCP "myfbox" en tu configuración MCP usando command="node" y args=["{{serverPath}}"]. Luego conéctate a mi bóveda llamando a connect_app.',

    // mcpBridge
    'domainMcp.mcpBridge.openError': 'Error al abrir la conexión',
    'domainMcp.mcpBridge.pairRejected': 'Código de emparejamiento rechazado por el servidor MCP.',
    'domainMcp.mcpBridge.serverNotFound':
      'Servidor MCP local no encontrado. ¿Está en ejecución?',
    'domainMcp.mcpBridge.closeReason': 'MCP desactivado',

    // mcpActions
    'domainMcp.mcpActions.missingRequiredField': 'Falta el campo obligatorio: {{key}}',
    'domainMcp.mcpActions.fieldMustBeText': 'El campo {{key}} debe ser texto',
    'domainMcp.mcpActions.fieldMustBeNumber': 'El campo {{key}} debe ser un número',
    'domainMcp.mcpActions.fieldMustBeOneOf': 'El campo {{key}} debe ser uno de: {{options}}',
    'domainMcp.mcpActions.invalidIsoDate': '{{key}} debe tener el formato AAAA-MM-DD',
    'domainMcp.mcpActions.invalidYearMonth': '{{key}} debe tener el formato AAAA-MM',
    'domainMcp.mcpActions.accountNotFound': 'Cuenta no encontrada: {{id}}',
    'domainMcp.mcpActions.accountNameNotFound':
      'Cuenta "{{name}}" no encontrada. Cuentas: {{accounts}}',
    'domainMcp.mcpActions.noAccountsInVault': 'La bóveda no tiene ninguna cuenta.',
    'domainMcp.mcpActions.categoryNotFound': 'Categoría de {{type}} no encontrada: {{id}}',
    'domainMcp.mcpActions.categoryNameNotFound':
      'La categoría "{{name}}" ({{type}}) no existe. Créala con create_category o usa una de estas: {{categories}}',
    'domainMcp.mcpActions.none': '(ninguna)',
    'domainMcp.mcpActions.noticeCreatedAccount': 'MCP creó la cuenta "{{name}}" ({{currency}})',
    'domainMcp.mcpActions.missingFromAccount':
      'Indica fromAccountId o fromAccountName para la cuenta de origen.',
    'domainMcp.mcpActions.missingToAccount':
      'Indica toAccountId o toAccountName para la cuenta de destino.',
    'domainMcp.mcpActions.amountPositive': 'amount debe ser mayor que cero',
    'domainMcp.mcpActions.noticeTransferred': 'MCP transfirió de "{{from}}" a "{{to}}"',
    'domainMcp.mcpActions.missingType': 'Falta el campo obligatorio: type (income o expense)',
    'domainMcp.mcpActions.budgetNonNegative': 'monthlyBudget no puede ser negativo',
    'domainMcp.mcpActions.noticeCreatedCategory': 'MCP creó la categoría "{{name}}"',
    'domainMcp.mcpActions.budgetInvalidValue':
      'monthlyBudget debe ser un número >= 0, o null para quitar la meta',
    'domainMcp.mcpActions.categoryNotFoundById': 'Categoría no encontrada: {{id}}',
    'domainMcp.mcpActions.budgetExpenseOnly': 'Las metas solo existen para categorías de gasto',
    'domainMcp.mcpActions.noticeSetBudget': 'MCP definió la meta de "{{name}}"',
    'domainMcp.mcpActions.noticeRemovedBudget': 'MCP quitó la meta de "{{name}}"',
    'domainMcp.mcpActions.amountPositiveWithType':
      'amount debe ser mayor que cero (el tipo define el signo)',
    'domainMcp.mcpActions.ratePositive': 'exchangeRate debe ser mayor que cero',
    'domainMcp.mcpActions.noticeCreatedTxMany': 'MCP registró {{count}} movimientos de "{{desc}}"',
    'domainMcp.mcpActions.noticeCreatedTxOne': 'MCP registró "{{desc}}"',
    'domainMcp.mcpActions.txNotFound': 'Movimiento no encontrado: {{id}}',
    'domainMcp.mcpActions.paidAtFuture': 'paidAt no puede estar en el futuro',
    'domainMcp.mcpActions.noticeUpdatedTx': 'MCP actualizó "{{desc}}"',
    'domainMcp.mcpActions.noticeDeletedTx': 'MCP eliminó "{{desc}}"',
    'domainMcp.mcpActions.missingMonth': 'Falta el campo obligatorio: month (AAAA-MM)',
    'domainMcp.mcpActions.titleMaxLength': 'title debe tener como máximo 120 caracteres',
    'domainMcp.mcpActions.bodyMaxLength': 'body debe tener como máximo 4000 caracteres',
    'domainMcp.mcpActions.highlightsMustBeTextList': 'highlights debe ser una lista de textos',
    'domainMcp.mcpActions.noticeUpdatedInsight': 'MCP actualizó el insight de {{month}}',
    'domainMcp.mcpActions.noticeCreatedInsight': 'MCP escribió el insight de {{month}}',
    'domainMcp.mcpActions.insightNotFound': 'No hay insight para {{month}}',
    'domainMcp.mcpActions.noticeDeletedInsight': 'MCP eliminó el insight de {{month}}',
    'domainMcp.mcpActions.offlineRatesNote':
      'MyFBox funciona 100% sin conexión. Las cotizaciones se ingresan manualmente o mediante el agente vía MCP.',
    'domainMcp.mcpActions.alreadyExists': 'ya existe',
    'domainMcp.mcpActions.defaultTransferDescription': 'Transferencia entre cuentas',
    'domainMcp.mcpActions.comparisonNote':
      'Importes en BRL. Los totales mensuales incluyen pagados + pendientes (devengo). Monedas extranjeras convertidas por la cotización fijada o la actual.',
    'domainMcp.mcpActions.fromToRequired': 'from y to son obligatorios',
    'domainMcp.mcpActions.ratePositiveNumber': 'rate debe ser un número positivo mayor que cero',
    'domainMcp.mcpActions.unsupportedFromCurrency':
      'La moneda de origen "{{currency}}" no es compatible. Elige una de: {{supported}}',
    'domainMcp.mcpActions.unsupportedToCurrency':
      'La moneda de destino "{{currency}}" no es compatible. Elige una de: {{supported}}',
    'domainMcp.mcpActions.sameCurrencyError':
      'La moneda de origen y de destino deben ser diferentes',
    'domainMcp.mcpActions.noticeSetRate': 'MCP definió cotización {{from}}/{{to}}: {{rate}}',
    'domainMcp.mcpActions.noticeDeletedRate': 'MCP eliminó cotización {{from}}/{{to}}',
    'domainMcp.mcpActions.forbiddenCreateVault':
      'Crear una bóveda es una operación exclusiva del usuario en la interfaz del navegador.',
    'domainMcp.mcpActions.forbiddenDeleteVault':
      'Eliminar la bóveda es una operación exclusiva del usuario en la interfaz del navegador.',
    'domainMcp.mcpActions.forbiddenExportCsv':
      'MCP no crea respaldos sin cifrado. Exportar CSV es exclusivo del usuario desde la interfaz (Respaldos › Exportar CSV).',
    'domainMcp.mcpActions.forbiddenExportUnencrypted':
      'MCP no crea respaldos sin cifrado. Usa export_backup para generar un respaldo cifrado (.myfbox.json con AES-256-GCM).',
    'domainMcp.mcpActions.forbiddenChangePassword':
      'Cambiar la contraseña maestra es exclusivo del usuario en la interfaz del navegador.',
    'domainMcp.mcpActions.forbiddenRestoreBackup':
      'Restaurar respaldo es exclusivo del usuario en la interfaz del navegador.',
    'domainMcp.mcpActions.unknownAction': 'Acción desconocida: {{name}}',

    // McpPairDialog
    'domainMcp.pair.title': 'Conectar asistente',
    'domainMcp.pair.reject': 'Rechazar',
    'domainMcp.pair.description':
      'Un asistente (servidor MCP local) quiere acceder a esta bóveda para consultar y registrar movimientos. Solo funciona en este equipo y mientras la bóveda esté desbloqueada.',
    'domainMcp.pair.codeLabel': 'Comprueba que el código coincida con el mostrado por el asistente',
    'domainMcp.pair.factLoopback': 'Conexión solo con 127.0.0.1, puerto {{port}}',
    'domainMcp.pair.factSecrets': 'Tu contraseña y la clave de la bóveda no salen del navegador',
    'domainMcp.pair.factDisable':
      'Puedes desactivarlo cuando quieras en Ajustes › Modo MCP local',
    'domainMcp.pair.authorise': 'Autorizar',

    // McpInstructionsModal
    'domainMcp.modal.badge': 'MCP Y SKILLS OFICIALES',
    'domainMcp.modal.title': 'Guía de Instrucciones y Prompts MCP',
    'domainMcp.modal.subtitle':
      'Opera tu bóveda financiera con cualquier asistente o agente de IA compatible con MCP mediante un puente local 100% seguro y soberano.',
    'domainMcp.modal.closeAria': 'Cerrar modal de instrucciones',
    'domainMcp.modal.tabPrompts': 'Prompts ({{count}})',
    'domainMcp.modal.tabCapabilities': 'Capacidades ({{count}})',
    'domainMcp.modal.tabInstall': 'Instalación',
    'domainMcp.modal.tabSecurity': 'Seguridad',
    'domainMcp.modal.searchPlaceholder':
      'Buscar por prompt, acción, herramienta o categoría...',
    'domainMcp.modal.clearSearchAria': 'Limpiar búsqueda',
    'domainMcp.modal.filterAll': 'Todos',
    'domainMcp.modal.emptyPrompts': 'No se encontraron prompts para los filtros seleccionados.',
    'domainMcp.modal.copyPromptTitle': 'Copiar prompt para el chat del asistente',
    'domainMcp.modal.copied': '¡Copiado!',
    'domainMcp.modal.copyPrompt': 'Copiar Prompt',
    'domainMcp.modal.capCalloutTitle': 'Qué puede hacer el asistente en MyFBox:',
    'domainMcp.modal.capCalloutBody':
      'El servidor MCP expone 20 herramientas organizadas que cubren todas las operaciones esenciales de la bóveda. Todas las acciones escriben en la bóveda cifrada y muestran avisos visibles en la aplicación.',
    'domainMcp.modal.tableTool': 'Herramienta',
    'domainMcp.modal.tableCategory': 'Categoría',
    'domainMcp.modal.tableWhat': 'Qué hace',
    'domainMcp.modal.tableParams': 'Parámetros',
    'domainMcp.modal.skillsSubtitle': 'Skills Especializadas Incluidas',
    'domainMcp.modal.skillMyfboxTitle': 'Skill: myfbox (.claude/skills/myfbox/SKILL.md)',
    'domainMcp.modal.skillMyfboxDesc':
      'Controla movimientos, creación de cuentas y transferencias multimoneda, cuotas en N meses, sugerencia de categorías por IA, metas mensuales y gestión de cotizaciones sin conexión (16 monedas).',
    'domainMcp.modal.skillInsightsTitle':
      'Skill: myfbox-insights (.claude/skills/myfbox-insights/SKILL.md)',
    'domainMcp.modal.skillInsightsDesc':
      'Compara meses, detecta variaciones y redacta insights analíticos y prácticos guardados directamente en la bóveda cifrada para la pestaña Comparativas (con lectura por voz local).',
    'domainMcp.modal.installStep1Title': 'Instalación Práctica en este Entorno',
    'domainMcp.modal.installStep1Desktop':
      'En la app de Escritorio (Linux, Windows y macOS), el servidor MCP ya viene integrado en la aplicación. Solo ten Node.js instalado y pega la configuración de abajo:',
    'domainMcp.modal.installStep1Web':
      'En la versión Web, npx descarga y ejecuta el servidor MCP automáticamente sin necesidad de clonar el repositorio (requiere Node.js y Git):',
    'domainMcp.modal.installStep1Local':
      'Agrega a la configuración MCP de tu cliente apuntando al script mcp/server.mjs:',
    'domainMcp.modal.installJsonHeader':
      'Configuración MCP (JSON — Claude Desktop, Cursor, Windsurf, Antigravity)',
    'domainMcp.modal.copyJson': 'Copiar JSON',
    'domainMcp.modal.installCliHeader': 'Atajo por terminal (Claude Code CLI)',
    'domainMcp.modal.copyCli': 'Copiar CLI',
    'domainMcp.modal.installStep2Title': 'Uso Directo en la Carpeta del Repositorio (.mcp.json)',
    'domainMcp.modal.installStep2DescBefore':
      'Si abriste tu asistente de IA directamente dentro de la carpeta clonada de MyFBox, el archivo',
    'domainMcp.modal.installStep2DescAfter': 'en la raíz ya registra el servidor automáticamente:',
    'domainMcp.modal.installStep2Header': '.mcp.json (en la raíz del proyecto)',
    'domainMcp.modal.copy': 'Copiar',
    'domainMcp.modal.installStep3Title': 'Cómo Emparejar con 1 Comando',
    'domainMcp.modal.installStep3Desc': 'En el chat del asistente de IA, envía el prompt de emparejamiento:',
    'domainMcp.modal.pairPrompt':
      'Conéctate a MyFBox mediante el servidor MCP local y muéstrame el estado de la conexión.',
    'domainMcp.modal.installStep3Li1Before': 'El asistente llamará a',
    'domainMcp.modal.installStep3Li1After': 'y devolverá un enlace con un código corto.',
    'domainMcp.modal.installStep3Li2':
      'Abre el enlace en este navegador con la bóveda desbloqueada.',
    'domainMcp.modal.installStep3Li3Before':
      'Verifica el código de confirmación visual y haz clic en',
    'domainMcp.modal.installStep3Li3Strong': 'Autorizar',
    'domainMcp.modal.securityBannerTitle': 'Arquitectura Local-First Soberana',
    'domainMcp.modal.securityBannerDesc':
      'MyFBox fue diseñado para que la inteligencia artificial te sirva sin tener que renunciar a tu privacidad financiera.',
    'domainMcp.modal.secCard1Title': 'Tu contraseña maestra nunca sale del navegador',
    'domainMcp.modal.secCard1BodyBefore':
      'El proceso MCP no conoce tu contraseña ni tu clave derivada AES-256-GCM. Solo envía mensajes JSON a la app abierta vía WebSocket en loopback local (',
    'domainMcp.modal.secCard1BodyAfter': ').',
    'domainMcp.modal.secCard2Title': '100% Sin Conexión Soberano',
    'domainMcp.modal.secCard2Body':
      'La aplicación no realiza llamadas a APIs de terceros. Las cotizaciones de monedas y todas las reglas de categorización y comparativas se procesan estrictamente de forma local.',
    'domainMcp.modal.secCard3Title': 'Bóveda Bloqueada = Acceso Bloqueado',
    'domainMcp.modal.secCard3Body':
      'Si bloqueas la bóveda o expira el tiempo de autobloqueo por inactividad, el servidor MCP responde inmediatamente que la bóveda es inaccesible. Ninguna acción de IA puede desbloquearla sin tu contraseña maestra escrita manualmente.',
    'domainMcp.modal.secCard4Title': 'Transparencia Total y Avisos',
    'domainMcp.modal.secCard4Body':
      'Cada vez que MCP registra, edita o elimina un movimiento, aparece un aviso en tiempo real en la interfaz indicando exactamente lo que se ejecutó.',
    'domainMcp.modal.secCard5Title': 'Operaciones Exclusivas del Usuario (Bloqueadas en MCP)',
    'domainMcp.modal.secCard5Body1': 'MCP',
    'domainMcp.modal.secCard5BodyStrong': 'no puede',
    'domainMcp.modal.secCard5Body2':
      'crear bóveda, eliminar/restablecer la bóveda, cambiar la contraseña maestra ni hacer respaldos sin cifrado. La exportación de hoja CSV es exclusiva del usuario desde la interfaz; vía MCP, el único respaldo permitido es el sobre cifrado (',
    'domainMcp.modal.secCard5Body3': ').',
    'domainMcp.modal.footerTipLabel': 'Consejo: Prueba combinar prompts, como:',
    'domainMcp.modal.footerTipExample':
      '"Crea la categoría Mascotas con meta de 300 y registra 89,90 de alimento en ella"',
    'domainMcp.modal.footerClose': 'Entendido, cerrar',

    // Prompt categories
    'domainMcp.promptCat.transactions': 'Movimientos',
    'domainMcp.promptCat.settlements': 'Liquidaciones',
    'domainMcp.promptCat.rates': 'Cotizaciones',
    'domainMcp.promptCat.budgets': 'Metas',
    'domainMcp.promptCat.queries': 'Consultas',
    'domainMcp.promptCat.comparisons': 'Comparativas',
    'domainMcp.promptCat.backups': 'Respaldos',

    // 20 Prompt items
    'domainMcp.prompt.txSimple.title': 'Registrar gasto diario',
    'domainMcp.prompt.txSimple.prompt':
      'Registra un gasto de $ 18,50 en el almuerzo de hoy en la categoría Restaurantes.',
    'domainMcp.prompt.txSimple.desc':
      'Registra un gasto pagado en la fecha actual. Si omites la categoría, la app sugiere una automáticamente según el historial y la descripción.',
    'domainMcp.prompt.txFuture.title': 'Programar cuenta por pagar en el futuro',
    'domainMcp.prompt.txFuture.prompt':
      'Programa un gasto de alquiler de $ 900 para el día 10 del próximo mes en la categoría Vivienda.',
    'domainMcp.prompt.txFuture.desc':
      'Las fechas futuras quedan como pendientes automáticamente y entran en la previsión financiera del mes correspondiente.',
    'domainMcp.prompt.txInstallments.title': 'Registrar compra en N cuotas',
    'domainMcp.prompt.txInstallments.prompt':
      'Registra la compra de una laptop por $ 1.200 en 10 cuotas mensuales empezando hoy.',
    'domainMcp.prompt.txInstallments.desc':
      'Crea las cuotas mensuales calculando el importe unitario y marcando las futuras como pendientes vinculadas.',
    'domainMcp.prompt.txForeignCurrency.title':
      'Ingreso o gasto en moneda extranjera (USD / EUR)',
    'domainMcp.prompt.txForeignCurrency.prompt':
      'Recibí US$ 1.500 de una consultoría internacional hoy. Regístralo como ingreso en mi cuenta en Dólares.',
    'domainMcp.prompt.txForeignCurrency.desc':
      'Registra el movimiento en la moneda especificada con conversión por la tasa de cambio sin conexión fijada en la bóveda.',
    'domainMcp.prompt.accCreateMulti.title': 'Crear cuenta en moneda extranjera',
    'domainMcp.prompt.accCreateMulti.prompt':
      'Crea una cuenta corriente en Euro llamada "Wise Europa" con saldo inicial de 500 EUR.',
    'domainMcp.prompt.accCreateMulti.desc':
      'Agrega una nueva cuenta en cualquiera de las 13 monedas globales compatibles en la bóveda.',
    'domainMcp.prompt.accTransfer.title':
      'Transferir fondos entre cuentas (misma u otra moneda)',
    'domainMcp.prompt.accTransfer.prompt':
      'Transfiere $ 500 de Cuenta Principal a Reserva de Emergencia hoy.',
    'domainMcp.prompt.accTransfer.desc':
      'Registra automáticamente el par de salida y entrada. Entre monedas distintas, convierte usando la cotización sin conexión de la bóveda.',
    'domainMcp.prompt.txSettle.title': 'Liquidar (marcar como pagado) movimiento pendiente',
    'domainMcp.prompt.txSettle.prompt':
      'Localiza la factura de luz pendiente de este mes y márcala como pagada con fecha de hoy.',
    'domainMcp.prompt.txSettle.desc':
      'Busca el movimiento pendiente, lo marca como pagado y registra la fecha de pago sin alterar el mes original.',
    'domainMcp.prompt.txEditVal.title': 'Corregir importe o descripción de movimiento',
    'domainMcp.prompt.txEditVal.prompt':
      'Cambia el importe del movimiento de ayer en Supermercado a $ 85,50 y agrega la nota "Compra semanal".',
    'domainMcp.prompt.txEditVal.desc':
      'Actualiza importes, fechas, notas o descripciones de cualquier movimiento existente.',
    'domainMcp.prompt.txChangeCat.title': 'Cambiar la categoría de un movimiento',
    'domainMcp.prompt.txChangeCat.prompt':
      'Cambia la categoría del movimiento "Farmacia Central" a Salud y Farmacia.',
    'domainMcp.prompt.txChangeCat.desc':
      'Reclasifica el gasto a la categoría deseada manteniendo intactas las reglas y metas presupuestarias.',
    'domainMcp.prompt.rateSetUsd.title': 'Definir cotización sin conexión del Dólar (USD → BRL)',
    'domainMcp.prompt.rateSetUsd.prompt':
      'Define la cotización del Dólar (USD a BRL) en 5,85 en mi bóveda.',
    'domainMcp.prompt.rateSetUsd.desc':
      '100% sin conexión soberano: actualiza la tasa sin acceder a APIs externas y sincroniza las conversiones en toda la app.',
    'domainMcp.prompt.rateSetAny.title':
      'Registrar cotización entre monedas populares (ej.: EUR / BRL)',
    'domainMcp.prompt.rateSetAny.prompt':
      'Registra la cotización del Euro: 1 EUR = 6,32 BRL, y muéstrame la lista de cotizaciones guardadas.',
    'domainMcp.prompt.rateSetAny.desc':
      'Acepta cualquier par entre las 13 monedas globales compatibles (USD, EUR, GBP, etc.).',
    'domainMcp.prompt.rateList.title': 'Listar cotizaciones y monedas compatibles',
    'domainMcp.prompt.rateList.prompt':
      '¿Qué cotizaciones de monedas están registradas actualmente en mi bóveda?',
    'domainMcp.prompt.rateList.desc':
      'Devuelve todos los pares guardados en la bóveda, fecha de actualización, fuente y la lista cerrada de monedas válidas.',
    'domainMcp.prompt.catCreateBudget.title': 'Crear nueva categoría con tope mensual',
    'domainMcp.prompt.catCreateBudget.prompt':
      'Crea una nueva categoría de gasto llamada "Mascotas" con tope mensual de $ 150.',
    'domainMcp.prompt.catCreateBudget.desc':
      'Crea la categoría en la bóveda y define el límite presupuestario mensual para seguimiento de metas.',
    'domainMcp.prompt.catAdjustBudget.title': 'Ajustar o quitar meta de gastos',
    'domainMcp.prompt.catAdjustBudget.prompt':
      'Aumenta el tope mensual de la categoría "Supermercado" a $ 600.',
    'domainMcp.prompt.catAdjustBudget.desc':
      'Ajusta el límite mensual de gastos existentes. Usa "null" o "quitar meta" para retirar el tope.',
    'domainMcp.prompt.queryOverview.title': 'Resumen del mes y previsión de saldo',
    'domainMcp.prompt.queryOverview.prompt':
      '¿Cómo están mis finanzas este mes? Muéstrame el saldo confirmado, previsto y cuánto me falta por pagar.',
    'domainMcp.prompt.queryOverview.desc':
      'Devuelve la visión general ejecutiva del mes en BRL y USD, ingresos, egresos y pendientes por vencer.',
    'domainMcp.prompt.queryCatSpending.title': 'Consultar gastos por categoría',
    'domainMcp.prompt.queryCatSpending.prompt':
      '¿Cuánto he gastado ya en Supermercado y Transporte este mes?',
    'domainMcp.prompt.queryCatSpending.desc':
      'Filtra los movimientos del mes por la categoría solicitada y suma los importes realizados.',
    'domainMcp.prompt.queryAccounts.title': 'Saldos de todas las cuentas',
    'domainMcp.prompt.queryAccounts.prompt':
      'Lista todas mis cuentas registradas con sus saldos actuales y monedas.',
    'domainMcp.prompt.queryAccounts.desc':
      'Muestra cada cuenta bancaria, billetera física o cuenta internacional con saldos confirmados y proyectados.',
    'domainMcp.prompt.compareMonths.title': 'Comparativa de gastos de los últimos meses',
    'domainMcp.prompt.compareMonths.prompt':
      'Compara mis gastos de este mes con los últimos 3 meses e indícame las mayores variaciones.',
    'domainMcp.prompt.compareMonths.desc':
      'Analiza las variaciones mes a mes e indica las categorías que más subieron o bajaron.',
    'domainMcp.prompt.insightGenerate.title':
      'Generar insight financiero en la pestaña Comparativas',
    'domainMcp.prompt.insightGenerate.prompt':
      'Genera el insight financiero para la pestaña Comparativas del mes actual con destacados y análisis de los mayores gastos.',
    'domainMcp.prompt.insightGenerate.desc':
      'La IA redacta un insight objetivo con causas, riesgos y próximos pasos, guardado cifrado directamente en la bóveda.',
    'domainMcp.prompt.backupExport.title': 'Generar respaldo cifrado de la bóveda (.myfbox.json)',
    'domainMcp.prompt.backupExport.prompt':
      'Genera un respaldo cifrado de mi bóveda ahora usando la herramienta export_backup.',
    'domainMcp.prompt.backupExport.desc':
      'Exporta el sobre seguro (AES-256-GCM) a la carpeta vaults/ del proyecto y actualiza la marca de último respaldo.',

    // Tool docs categories & descriptions
    'domainMcp.toolCat.connection': 'Conexión',
    'domainMcp.toolCat.overview': 'Resumen',
    'domainMcp.toolCat.accounts': 'Cuentas',
    'domainMcp.toolCat.categories': 'Categorías',
    'domainMcp.toolCat.budgets': 'Metas',
    'domainMcp.toolCat.transactions': 'Movimientos',
    'domainMcp.toolCat.offlineFx': 'Cambio Offline',
    'domainMcp.toolCat.comparisons': 'Comparativas',
    'domainMcp.toolCat.aiInsights': 'Insights IA',
    'domainMcp.toolCat.backups': 'Respaldos',

    'domainMcp.tool.connectApp.desc':
      'Verifica el estado de la conexión con la app abierta o genera el enlace de emparejamiento seguro.',
    'domainMcp.tool.getOverview.desc':
      'Resumen del mes: saldo confirmado y previsto (BRL/USD), total recibido y pagado, pendientes y cotizaciones activas.',
    'domainMcp.tool.getOverview.args': 'month? (AAAA-MM)',
    'domainMcp.tool.listAccounts.desc':
      'Lista cuentas con moneda, saldo confirmado y previsto hasta fin de mes.',
    'domainMcp.tool.createAccount.desc':
      'Crea una cuenta bancaria, reserva, inversión o billetera en cualquiera de las 16 monedas compatibles.',
    'domainMcp.tool.transferBetweenAccounts.desc':
      'Transfiere fondos entre dos cuentas con conversión multimoneda automática.',
    'domainMcp.tool.listCategories.desc':
      'Lista todas las categorías con tipo (income/expense), color y meta mensual.',
    'domainMcp.tool.createCategory.desc':
      'Crea una nueva categoría en la bóveda (no duplica nombre y tipo).',
    'domainMcp.tool.setCategoryBudget.desc':
      'Define, ajusta o quita el tope mensual de gastos en BRL de una categoría de gasto.',
    'domainMcp.tool.setCategoryBudget.args': 'categoryId, monthlyBudget (número o null)',
    'domainMcp.tool.listTransactions.desc':
      'Consulta movimientos con filtros por mes, tipo, estado, categoría o búsqueda de texto.',
    'domainMcp.tool.createTransaction.desc':
      'Registra movimiento único o en cuotas (2 a 36x) con sugerencia automática inteligente de categoría.',
    'domainMcp.tool.updateTransaction.desc':
      'Actualiza campos de un movimiento, cambia importes/notas o lo liquida (status="paid", paidAt).',
    'domainMcp.tool.updateTransaction.args': 'id, ...campos a modificar',
    'domainMcp.tool.deleteTransaction.desc': 'Elimina definitivamente un movimiento de la bóveda.',
    'domainMcp.tool.setExchangeRate.desc':
      'Agrega o actualiza la cotización de cualquier par entre monedas populares (100% sin conexión).',
    'domainMcp.tool.setExchangeRate.args': 'from (código), to (código), rate (número > 0)',
    'domainMcp.tool.listExchangeRates.desc':
      'Lista todas las cotizaciones guardadas en la bóveda y las monedas populares compatibles.',
    'domainMcp.tool.deleteExchangeRate.desc':
      'Elimina la tasa de cambio de un par específico de la bóveda.',
    'domainMcp.tool.deleteExchangeRate.args': 'from (código), to (código)',
    'domainMcp.tool.getMonthComparison.desc':
      'Comparativa mes a mes (hasta 24 meses) con ingresos, gastos, variaciones y categorías con mayor oscilación.',
    'domainMcp.tool.getMonthComparison.args': 'month?, months? (predeterminado 6)',
    'domainMcp.tool.saveInsight.desc':
      'Guarda el insight analítico mensual cifrado en la bóveda (con título, narrativa, destacados y firma).',
    'domainMcp.tool.listInsights.desc': 'Lee los insights guardados por el asistente en la bóveda.',
    'domainMcp.tool.deleteInsight.desc': 'Elimina un insight guardado de la bóveda.',
    'domainMcp.tool.exportBackup.desc':
      'Guarda un respaldo cifrado (AES-256-GCM) en vaults/ del proyecto y actualiza "Último respaldo".',
  },

  'zh-CN': {
    // defaultData
    'domainMcp.defaultData.vaultName': '个人保险库',
    'domainMcp.defaultData.mainAccount': '主账户',
    'domainMcp.defaultData.mainBank': '主银行',
    'domainMcp.defaultData.cat.salary': '工资与薪酬',
    'domainMcp.defaultData.cat.freelance': '项目与咨询',
    'domainMcp.defaultData.cat.dividends': '收益与分红',
    'domainMcp.defaultData.cat.otherInc': '报销及其他',
    'domainMcp.defaultData.cat.housing': '住房与物业',
    'domainMcp.defaultData.cat.groceries': '超市与生鲜',
    'domainMcp.defaultData.cat.dining': '餐饮与外卖',
    'domainMcp.defaultData.cat.transport': '交通与加油',
    'domainMcp.defaultData.cat.health': '医疗与药房',
    'domainMcp.defaultData.cat.subs': '订阅、云服务与网络',
    'domainMcp.defaultData.cat.leisure': '休闲、书籍与旅行',

    // categories
    'domainMcp.categories.other': '其他',

    // validation
    'domainMcp.validation.invalidEnvelope': '保险库格式无效或已损坏。',
    'domainMcp.validation.invalidKdfHeader': '保险库 KDF 头信息无效。',
    'domainMcp.validation.invalidPbkdf2Iterations': 'PBKDF2 迭代次数超出安全限制范围。',
    'domainMcp.validation.invalidCipherBlock': '保险库加密数据块无效。',
    'domainMcp.validation.invalidVerifierBlock': '保险库校验块无效。',
    'domainMcp.validation.invalidPayloadStructure': '保险库内部结构无效。',
    'domainMcp.validation.missingPayloadCollections': '保险库数据集合缺失或已损坏。',
    'domainMcp.validation.accountFallback': '账户',
    'domainMcp.validation.mainAccount': '主账户',
    'domainMcp.validation.categoryFallback': '分类',
    'domainMcp.validation.transactionFallback': '交易',
    'domainMcp.validation.vaultFallback': '个人保险库',

    // vaultUseCases
    'domainMcp.vaultUseCases.copySuffix': '(副本)',
    'domainMcp.vaultUseCases.transferInvalidAccounts': '请选择有效且不同的转出和转入账户。',
    'domainMcp.vaultUseCases.transferNoRate':
      '未登记 {{from}}/{{to}} 汇率，无法在不同货币之间转换。',
    'domainMcp.vaultUseCases.transferTo': '转至 {{account}}',
    'domainMcp.vaultUseCases.transferFrom': '来自 {{account}}',
    'domainMcp.vaultUseCases.transferInternalNote': '账户间内部转账',
    'domainMcp.vaultUseCases.rateSourceManual': '手动',

    // cryptoVault
    'domainMcp.cryptoVault.invalidSalt': '加密信封中的盐值无效。',
    'domainMcp.cryptoVault.invalidVerifierIv': '校验器 IV 无效。',
    'domainMcp.cryptoVault.invalidVerifier': '密钥校验失败。',
    'domainMcp.cryptoVault.invalidMasterPassword': '主密码错误或身份验证数据无效。',
    'domainMcp.cryptoVault.invalidCipherIv': '数据块 IV 无效。',
    'domainMcp.cryptoVault.decryptFailed':
      '解密财务保险库失败（AES-256-GCM 标签不匹配）。',

    // importExport
    'domainMcp.importExport.defaultVaultSlug': 'vault',
    'domainMcp.importExport.csvHeader.date': '日期',
    'domainMcp.importExport.csvHeader.description': '描述',
    'domainMcp.importExport.csvHeader.type': '类型',
    'domainMcp.importExport.csvHeader.status': '状态',
    'domainMcp.importExport.csvHeader.paidAt': '支付日期',
    'domainMcp.importExport.csvHeader.amount': '金额',
    'domainMcp.importExport.csvHeader.currency': '货币',
    'domainMcp.importExport.csvHeader.fixedRate': '固定汇率_BRL',
    'domainMcp.importExport.csvHeader.category': '分类',
    'domainMcp.importExport.csvHeader.account': '账户',
    'domainMcp.importExport.csvHeader.notes': '备注',
    'domainMcp.importExport.csvTypeIncome': '收入',
    'domainMcp.importExport.csvTypeExpense': '支出',
    'domainMcp.importExport.csvStatusPaid': '已支付',
    'domainMcp.importExport.csvStatusPending': '待处理',
    'domainMcp.importExport.csvNoCategory': '未分类',
    'domainMcp.importExport.csvDefaultAccount': '默认账户',
    'domainMcp.importExport.csvFilenamePrefix': 'myfbox-transactions',

    // mcpConfig
    'domainMcp.mcpConfig.defaultServerPath': '/ABSOLUTE/PATH/MyFBox/mcp/server.mjs',
    'domainMcp.mcpConfig.agentPromptWeb':
      '在你的 MCP 配置中添加 "myfbox" 服务器，使用 command="npx"、args=["-y", "{{pkg}}"]。然后调用 connect_app 连接到我的保险库。',
    'domainMcp.mcpConfig.agentPromptWebWithUrl':
      '在你的 MCP 配置中添加 "myfbox" 服务器，使用 command="npx"、args=["-y", "{{pkg}}"] 以及 env MYFBOX_APP_URL="{{appUrl}}"。然后调用 connect_app 连接到我的保险库。',
    'domainMcp.mcpConfig.agentPromptLocal':
      '在你的 MCP 配置中添加 "myfbox" 服务器，使用 command="node" 和 args=["{{serverPath}}"]。然后调用 connect_app 连接到我的保险库。',

    // mcpBridge
    'domainMcp.mcpBridge.openError': '打开连接失败',
    'domainMcp.mcpBridge.pairRejected': '配对码被 MCP 服务器拒绝。',
    'domainMcp.mcpBridge.serverNotFound': '未找到本地 MCP 服务器。它正在运行吗？',
    'domainMcp.mcpBridge.closeReason': 'MCP 已停用',

    // mcpActions
    'domainMcp.mcpActions.missingRequiredField': '缺少必填字段：{{key}}',
    'domainMcp.mcpActions.fieldMustBeText': '字段 {{key}} 必须是文本',
    'domainMcp.mcpActions.fieldMustBeNumber': '字段 {{key}} 必须是数字',
    'domainMcp.mcpActions.fieldMustBeOneOf': '字段 {{key}} 必须是以下之一：{{options}}',
    'domainMcp.mcpActions.invalidIsoDate': '{{key}} 必须使用 YYYY-MM-DD 格式',
    'domainMcp.mcpActions.invalidYearMonth': '{{key}} 必须使用 YYYY-MM 格式',
    'domainMcp.mcpActions.accountNotFound': '未找到账户：{{id}}',
    'domainMcp.mcpActions.accountNameNotFound': '未找到账户“{{name}}”。可用账户：{{accounts}}',
    'domainMcp.mcpActions.noAccountsInVault': '保险库中没有任何账户。',
    'domainMcp.mcpActions.categoryNotFound': '未找到 {{type}} 分类：{{id}}',
    'domainMcp.mcpActions.categoryNameNotFound':
      '分类“{{name}}”({{type}}) 不存在。请使用 create_category 创建或选择以下分类：{{categories}}',
    'domainMcp.mcpActions.none': '（无）',
    'domainMcp.mcpActions.noticeCreatedAccount': 'MCP 创建了账户“{{name}}”({{currency}})',
    'domainMcp.mcpActions.missingFromAccount':
      '请为转出账户提供 fromAccountId 或 fromAccountName。',
    'domainMcp.mcpActions.missingToAccount':
      '请为转入账户提供 toAccountId 或 toAccountName。',
    'domainMcp.mcpActions.amountPositive': 'amount 必须大于零',
    'domainMcp.mcpActions.noticeTransferred': 'MCP 已从“{{from}}”转账至“{{to}}”',
    'domainMcp.mcpActions.missingType': '缺少必填字段：type（income 或 expense）',
    'domainMcp.mcpActions.budgetNonNegative': 'monthlyBudget 不能为负数',
    'domainMcp.mcpActions.noticeCreatedCategory': 'MCP 创建了分类“{{name}}”',
    'domainMcp.mcpActions.budgetInvalidValue':
      'monthlyBudget 必须是 >= 0 的数字，或传 null 以移除预算',
    'domainMcp.mcpActions.categoryNotFoundById': '未找到分类：{{id}}',
    'domainMcp.mcpActions.budgetExpenseOnly': '预算仅适用于支出分类',
    'domainMcp.mcpActions.noticeSetBudget': 'MCP 设置了“{{name}}”的预算',
    'domainMcp.mcpActions.noticeRemovedBudget': 'MCP 移除了“{{name}}”的预算',
    'domainMcp.mcpActions.amountPositiveWithType': 'amount 必须大于零（收支方向由 type 决定）',
    'domainMcp.mcpActions.ratePositive': 'exchangeRate 必须大于零',
    'domainMcp.mcpActions.noticeCreatedTxMany': 'MCP 记录了 {{count}} 笔“{{desc}}”交易',
    'domainMcp.mcpActions.noticeCreatedTxOne': 'MCP 记录了“{{desc}}”',
    'domainMcp.mcpActions.txNotFound': '未找到交易：{{id}}',
    'domainMcp.mcpActions.paidAtFuture': 'paidAt 不能是未来日期',
    'domainMcp.mcpActions.noticeUpdatedTx': 'MCP 更新了“{{desc}}”',
    'domainMcp.mcpActions.noticeDeletedTx': 'MCP 删除了“{{desc}}”',
    'domainMcp.mcpActions.missingMonth': '缺少必填字段：month（YYYY-MM）',
    'domainMcp.mcpActions.titleMaxLength': 'title 最多 120 个字符',
    'domainMcp.mcpActions.bodyMaxLength': 'body 最多 4000 个字符',
    'domainMcp.mcpActions.highlightsMustBeTextList': 'highlights 必须是字符串列表',
    'domainMcp.mcpActions.noticeUpdatedInsight': 'MCP 更新了 {{month}} 的洞察',
    'domainMcp.mcpActions.noticeCreatedInsight': 'MCP 生成了 {{month}} 的洞察',
    'domainMcp.mcpActions.insightNotFound': '{{month}} 没有洞察',
    'domainMcp.mcpActions.noticeDeletedInsight': 'MCP 删除了 {{month}} 的洞察',
    'domainMcp.mcpActions.offlineRatesNote':
      'MyFBox 100% 离线运行。汇率由用户手动输入或由助手通过 MCP 设置。',
    'domainMcp.mcpActions.alreadyExists': '已存在',
    'domainMcp.mcpActions.defaultTransferDescription': '账户间转账',
    'domainMcp.mcpActions.comparisonNote':
      '金额以 BRL 计价。月度总计包含已付和待处理项目（权责发生制）。外币按交易锁定汇率或当前汇率换算。',
    'domainMcp.mcpActions.fromToRequired': 'from 和 to 为必填项',
    'domainMcp.mcpActions.ratePositiveNumber': 'rate 必须是大于零的正数',
    'domainMcp.mcpActions.unsupportedFromCurrency':
      '不支持源货币“{{currency}}”。请选择以下货币之一：{{supported}}',
    'domainMcp.mcpActions.unsupportedToCurrency':
      '不支持目标货币“{{currency}}”。请选择以下货币之一：{{supported}}',
    'domainMcp.mcpActions.sameCurrencyError': '源货币和目标货币必须不同',
    'domainMcp.mcpActions.noticeSetRate': 'MCP 设置了汇率 {{from}}/{{to}}：{{rate}}',
    'domainMcp.mcpActions.noticeDeletedRate': 'MCP 移除了汇率 {{from}}/{{to}}',
    'domainMcp.mcpActions.forbiddenCreateVault': '创建保险库是仅限用户在浏览器界面执行的操作。',
    'domainMcp.mcpActions.forbiddenDeleteVault': '删除保险库是仅限用户在浏览器界面执行的操作。',
    'domainMcp.mcpActions.forbiddenExportCsv':
      'MCP 不创建未加密的备份。导出 CSV 仅限用户通过应用界面操作（备份 › 导出 CSV）。',
    'domainMcp.mcpActions.forbiddenExportUnencrypted':
      'MCP 不创建未加密的备份。请使用 export_backup 生成加密备份（AES-256-GCM 的 .myfbox.json）。',
    'domainMcp.mcpActions.forbiddenChangePassword': '修改主密码是仅限用户在浏览器界面执行的操作。',
    'domainMcp.mcpActions.forbiddenRestoreBackup': '恢复备份是仅限用户在浏览器界面执行的操作。',
    'domainMcp.mcpActions.unknownAction': '未知操作：{{name}}',

    // McpPairDialog
    'domainMcp.pair.title': '连接助手',
    'domainMcp.pair.reject': '拒绝',
    'domainMcp.pair.description':
      '一个助手（本地 MCP 服务器）请求访问此保险库以查询和记录交易。它仅在本机运行，且仅在保险库解锁时有效。',
    'domainMcp.pair.codeLabel': '请核对验证码是否与助手端显示一致',
    'domainMcp.pair.factLoopback': '仅限本地 127.0.0.1 连接，端口 {{port}}',
    'domainMcp.pair.factSecrets': '您的密码和保险库密钥绝不会离开浏览器',
    'domainMcp.pair.factDisable': '您可以随时在 设置 › 本地 MCP 模式 中关闭',
    'domainMcp.pair.authorise': '授权',

    // McpInstructionsModal
    'domainMcp.modal.badge': '官方 MCP 与 SKILLS',
    'domainMcp.modal.title': 'MCP 使用指南与提示词',
    'domainMcp.modal.subtitle':
      '通过 100% 安全自主的本地桥接，使用任何兼容 MCP 的 AI 助手或智能体管理您的财务保险库。',
    'domainMcp.modal.closeAria': '关闭指南弹窗',
    'domainMcp.modal.tabPrompts': '提示词 ({{count}})',
    'domainMcp.modal.tabCapabilities': '功能列表 ({{count}})',
    'domainMcp.modal.tabInstall': '安装',
    'domainMcp.modal.tabSecurity': '安全',
    'domainMcp.modal.searchPlaceholder': '按提示词、操作、工具或分类搜索...',
    'domainMcp.modal.clearSearchAria': '清除搜索',
    'domainMcp.modal.filterAll': '全部',
    'domainMcp.modal.emptyPrompts': '未找到符合所选条件的提示词。',
    'domainMcp.modal.copyPromptTitle': '复制提示词到助手聊天框',
    'domainMcp.modal.copied': '已复制！',
    'domainMcp.modal.copyPrompt': '复制提示词',
    'domainMcp.modal.capCalloutTitle': '助手可在 MyFBox 中执行的操作：',
    'domainMcp.modal.capCalloutBody':
      'MCP 服务器提供 20 个结构化工具，涵盖所有核心保险库操作。所有操作均写入加密保险库并在界面显示实时通知。',
    'domainMcp.modal.tableTool': '工具',
    'domainMcp.modal.tableCategory': '分类',
    'domainMcp.modal.tableWhat': '功能说明',
    'domainMcp.modal.tableParams': '参数',
    'domainMcp.modal.skillsSubtitle': '内置专属 Skills',
    'domainMcp.modal.skillMyfboxTitle': 'Skill: myfbox (.claude/skills/myfbox/SKILL.md)',
    'domainMcp.modal.skillMyfboxDesc':
      '管理交易、账户创建与多币种转账、分期付款、AI 智能分类推荐、月度预算及离线汇率（支持 16 种货币）。',
    'domainMcp.modal.skillInsightsTitle':
      'Skill: myfbox-insights (.claude/skills/myfbox-insights/SKILL.md)',
    'domainMcp.modal.skillInsightsDesc':
      '对比月份、识别波动并撰写实用分析洞察，加密保存至保险库以供对比标签页使用（支持本地语音朗读）。',
    'domainMcp.modal.installStep1Title': '当前环境安装步骤',
    'domainMcp.modal.installStep1Desktop':
      '在桌面版（Linux、Windows 和 macOS）中，MCP 服务器已内置于应用内。只需安装 Node.js 并粘贴以下配置：',
    'domainMcp.modal.installStep1Web':
      '在网页版中，npx 会自动下载并运行 MCP 服务器，无需克隆仓库（需要 Node.js 和 Git）：',
    'domainMcp.modal.installStep1Local':
      '在客户端的 MCP 配置中添加指向 mcp/server.mjs 脚本的配置：',
    'domainMcp.modal.installJsonHeader':
      'MCP 配置（JSON — Claude Desktop、Cursor、Windsurf、Antigravity）',
    'domainMcp.modal.copyJson': '复制 JSON',
    'domainMcp.modal.installCliHeader': '终端快捷命令（Claude Code CLI）',
    'domainMcp.modal.copyCli': '复制 CLI',
    'domainMcp.modal.installStep2Title': '在仓库目录中直接使用（.mcp.json）',
    'domainMcp.modal.installStep2DescBefore':
      '如果您直接在克隆的 MyFBox 文件夹中打开 AI 助手，根目录下的',
    'domainMcp.modal.installStep2DescAfter': '文件已自动注册服务器：',
    'domainMcp.modal.installStep2Header': '.mcp.json（位于项目根目录）',
    'domainMcp.modal.copy': '复制',
    'domainMcp.modal.installStep3Title': '一条命令完成配对',
    'domainMcp.modal.installStep3Desc': '在 AI 助手聊天框中发送配对提示词：',
    'domainMcp.modal.pairPrompt': '通过本地 MCP 服务器连接到 MyFBox，并向我展示连接状态。',
    'domainMcp.modal.installStep3Li1Before': '助手将调用',
    'domainMcp.modal.installStep3Li1After': '并返回一个带短验证码的链接。',
    'domainMcp.modal.installStep3Li2': '在保险库已解锁的浏览器中打开该链接。',
    'domainMcp.modal.installStep3Li3Before': '核对屏幕上的验证码并点击',
    'domainMcp.modal.installStep3Li3Strong': '授权',
    'domainMcp.modal.securityBannerTitle': '本地优先自主安全架构',
    'domainMcp.modal.securityBannerDesc':
      'MyFBox 旨在让您在不牺牲财务隐私的前提下享受人工智能带来的便利。',
    'domainMcp.modal.secCard1Title': '主密码绝不离开浏览器',
    'domainMcp.modal.secCard1BodyBefore':
      'MCP 进程无法获取您的密码或派生的 AES-256-GCM 密钥，它仅通过本地回环 WebSocket（',
    'domainMcp.modal.secCard1BodyAfter': '）向已打开的应用发送 JSON 消息。',
    'domainMcp.modal.secCard2Title': '100% 离线自主',
    'domainMcp.modal.secCard2Body':
      '应用不会向第三方 API 发起请求。货币汇率及所有分类和对比规则均严格在本地处理。',
    'domainMcp.modal.secCard3Title': '保险库锁定 = 访问阻断',
    'domainMcp.modal.secCard3Body':
      '一旦您锁定保险库或闲置自动锁定计时器到期，MCP 服务器会立即返回保险库不可访问。未经您手动输入主密码，任何 AI 操作都无法解锁。',
    'domainMcp.modal.secCard4Title': '完全透明与实时通知',
    'domainMcp.modal.secCard4Body':
      '每当 MCP 新增、编辑或删除交易时，界面都会弹出实时通知，明确告知已执行的操作。',
    'domainMcp.modal.secCard5Title': '用户专属操作（MCP 中已禁止）',
    'domainMcp.modal.secCard5Body1': 'MCP',
    'domainMcp.modal.secCard5BodyStrong': '无法',
    'domainMcp.modal.secCard5Body2':
      '创建保险库、删除/重置保险库、修改主密码或创建未加密备份。CSV 表格导出仅限用户通过应用界面操作；通过 MCP 仅允许导出加密信封（',
    'domainMcp.modal.secCard5Body3': '）。',
    'domainMcp.modal.footerTipLabel': '提示：尝试组合提示词，例如：',
    'domainMcp.modal.footerTipExample':
      '“创建宠物分类并设置 300 预算，再记录一笔 89.90 的猫粮支出”',
    'domainMcp.modal.footerClose': '知道了，关闭',

    // Prompt categories
    'domainMcp.promptCat.transactions': '交易',
    'domainMcp.promptCat.settlements': '核销',
    'domainMcp.promptCat.rates': '汇率',
    'domainMcp.promptCat.budgets': '预算',
    'domainMcp.promptCat.queries': '查询',
    'domainMcp.promptCat.comparisons': '对比',
    'domainMcp.promptCat.backups': '备份',

    // 20 Prompt items
    'domainMcp.prompt.txSimple.title': '记录日常支出',
    'domainMcp.prompt.txSimple.prompt': '记录今天午餐支出 42.00 元，分类为餐饮。',
    'domainMcp.prompt.txSimple.desc':
      '记录一笔当天已支付的支出。如省略分类，应用会根据历史记录和描述自动推荐。',
    'domainMcp.prompt.txFuture.title': '预约未来待付账单',
    'domainMcp.prompt.txFuture.prompt': '预约下个月 10 号的房租支出 2200 元，分类为住房。',
    'domainMcp.prompt.txFuture.desc':
      '未来日期的交易会自动标记为待处理，并计入对应月份的财务预测。',
    'domainMcp.prompt.txInstallments.title': '记录 N 期分期消费',
    'domainMcp.prompt.txInstallments.prompt':
      '记录购买笔记本电脑 3600 元，从今天起分 10 个月分期。',
    'domainMcp.prompt.txInstallments.desc':
      '自动计算每期金额并生成关联的月度分期记录，未来期数标记为待处理。',
    'domainMcp.prompt.txForeignCurrency.title': '记录外币收支（USD / EUR）',
    'domainMcp.prompt.txForeignCurrency.prompt':
      '今天收到一笔国际咨询费 1500 美元，请在我的美元账户中记为收入。',
    'domainMcp.prompt.txForeignCurrency.desc':
      '按指定货币记录交易，并使用保险库中保存的离线汇率进行折算。',
    'domainMcp.prompt.accCreateMulti.title': '创建外币账户',
    'domainMcp.prompt.accCreateMulti.prompt':
      '创建一个欧元活期账户，名称为“Wise 欧洲”，初始余额 500 EUR。',
    'domainMcp.prompt.accCreateMulti.desc': '在保险库支持的 13 种全球货币中添加新账户。',
    'domainMcp.prompt.accTransfer.title': '账户间转账（同币种或跨币种）',
    'domainMcp.prompt.accTransfer.prompt': '今天从主账户转账 1200 元到应急储备账户。',
    'domainMcp.prompt.accTransfer.desc':
      '自动创建一出一入两笔关联记录。不同货币间将使用保险库离线汇率换算。',
    'domainMcp.prompt.txSettle.title': '核销（标记已付）待处理交易',
    'domainMcp.prompt.txSettle.prompt':
      '找到本月待支付的电费账单，将其标记为今天已支付。',
    'domainMcp.prompt.txSettle.desc':
      '查找待处理交易，标记为已支付并记录付款日期，同时保留原账期。',
    'domainMcp.prompt.txEditVal.title': '修改交易金额或描述',
    'domainMcp.prompt.txEditVal.prompt':
      '将昨天在超市的交易金额改为 185.50，并添加备注“每周采购”。',
    'domainMcp.prompt.txEditVal.desc': '更新任何现有交易的金额、日期、备注或描述。',
    'domainMcp.prompt.txChangeCat.title': '更改交易分类',
    'domainMcp.prompt.txChangeCat.prompt':
      '将“中心药房”这笔交易的分类改为医疗与药房。',
    'domainMcp.prompt.txChangeCat.desc': '将支出重新归类到指定分类，同时保持规则和月度预算完整。',
    'domainMcp.prompt.rateSetUsd.title': '设置美元离线汇率（USD → BRL）',
    'domainMcp.prompt.rateSetUsd.prompt': '在我的保险库中将美元（USD 对 BRL）汇率设为 5.85。',
    'domainMcp.prompt.rateSetUsd.desc':
      '100% 离线自主：无需访问外部 API 即可更新汇率并同步全应用折算。',
    'domainMcp.prompt.rateSetAny.title': '添加常用货币汇率（例如 EUR / BRL）',
    'domainMcp.prompt.rateSetAny.prompt':
      '添加欧元汇率：1 EUR = 6.32 BRL，并向我展示已保存的汇率列表。',
    'domainMcp.prompt.rateSetAny.desc':
      '支持 13 种常见全球货币（USD、EUR、GBP 等）之间的任意货币对。',
    'domainMcp.prompt.rateList.title': '列出已保存汇率和支持的货币',
    'domainMcp.prompt.rateList.prompt': '我当前的保险库中保存了哪些货币汇率？',
    'domainMcp.prompt.rateList.desc':
      '返回保险库中保存的所有货币对、更新日期、来源以及支持的有效货币列表。',
    'domainMcp.prompt.catCreateBudget.title': '创建带月度预算的新分类',
    'domainMcp.prompt.catCreateBudget.prompt': '创建一个名为“宠物”的支出分类，月度预算为 350。',
    'domainMcp.prompt.catCreateBudget.desc': '在保险库中创建分类并设置月度支出上限以便追踪预算。',
    'domainMcp.prompt.catAdjustBudget.title': '调整或移除支出预算',
    'domainMcp.prompt.catAdjustBudget.prompt': '将“超市”分类的月度预算提高到 1600。',
    'domainMcp.prompt.catAdjustBudget.desc':
      '调整现有支出分类的月度上限。使用 null 或“移除预算”可取消上限。',
    'domainMcp.prompt.queryOverview.title': '月度概览与余额预测',
    'domainMcp.prompt.queryOverview.prompt':
      '我本月的财务状况如何？请显示已确认余额、预测余额以及还有多少待付款。',
    'domainMcp.prompt.queryOverview.desc':
      '返回本月 BRL 和 USD 的执行概览、收入、支出及即将到期的待处理项目。',
    'domainMcp.prompt.queryCatSpending.title': '按分类查询支出',
    'domainMcp.prompt.queryCatSpending.prompt': '本月我在超市和交通上已经花了多少钱？',
    'domainMcp.prompt.queryCatSpending.desc': '按指定分类筛选本月交易并汇总实际支出金额。',
    'domainMcp.prompt.queryAccounts.title': '所有账户余额',
    'domainMcp.prompt.queryAccounts.prompt': '列出我所有已登记账户的当前余额和货币。',
    'domainMcp.prompt.queryAccounts.desc':
      '展示每个银行账户、现金钱包或外币账户的已确认与预测余额。',
    'domainMcp.prompt.compareMonths.title': '最近几个月支出对比',
    'domainMcp.prompt.compareMonths.prompt':
      '将我本月的支出与过去 3 个月进行对比，并指出变化最大的项目。',
    'domainMcp.prompt.compareMonths.desc': '按月分析变化趋势并指出涨幅或跌幅最大的分类。',
    'domainMcp.prompt.insightGenerate.title': '在对比标签页生成财务洞察',
    'domainMcp.prompt.insightGenerate.prompt':
      '为本月对比标签页生成财务洞察，包含亮点和主要支出分析。',
    'domainMcp.prompt.insightGenerate.desc':
      'AI 撰写包含原因、风险与下一步建议的简明洞察，加密直接保存至保险库。',
    'domainMcp.prompt.backupExport.title': '生成保险库加密备份 (.myfbox.json)',
    'domainMcp.prompt.backupExport.prompt': '现在使用 export_backup 工具生成我保险库的加密备份。',
    'domainMcp.prompt.backupExport.desc':
      '将安全加密信封（AES-256-GCM）导出至项目的 vaults/ 文件夹并更新最近备份时间。',

    // Tool docs categories & descriptions
    'domainMcp.toolCat.connection': '连接',
    'domainMcp.toolCat.overview': '概览',
    'domainMcp.toolCat.accounts': '账户',
    'domainMcp.toolCat.categories': '分类',
    'domainMcp.toolCat.budgets': '预算',
    'domainMcp.toolCat.transactions': '交易',
    'domainMcp.toolCat.offlineFx': '离线汇率',
    'domainMcp.toolCat.comparisons': '对比',
    'domainMcp.toolCat.aiInsights': 'AI 洞察',
    'domainMcp.toolCat.backups': '备份',

    'domainMcp.tool.connectApp.desc': '检查与已打开应用的连接状态或生成安全配对链接。',
    'domainMcp.tool.getOverview.desc':
      '月度摘要：已确认与预测余额（BRL/USD）、总收支、待处理项及当前汇率。',
    'domainMcp.tool.getOverview.args': 'month? (YYYY-MM)',
    'domainMcp.tool.listAccounts.desc': '列出账户及其货币、已确认余额与月末预测余额。',
    'domainMcp.tool.createAccount.desc':
      '在支持的 16 种货币中创建银行、储备、投资或现金账户。',
    'domainMcp.tool.transferBetweenAccounts.desc': '在两个账户之间转账并自动进行多币种换算。',
    'domainMcp.tool.listCategories.desc': '列出所有分类及其类型（income/expense）、颜色和月度预算。',
    'domainMcp.tool.createCategory.desc': '在保险库中创建新分类（不会重复同名同类型）。',
    'domainMcp.tool.setCategoryBudget.desc': '设置、调整或移除支出分类的 BRL 月度支出上限。',
    'domainMcp.tool.setCategoryBudget.args': 'categoryId, monthlyBudget（数字或 null）',
    'domainMcp.tool.listTransactions.desc':
      '按月份、类型、状态、分类或关键词搜索查询交易。',
    'domainMcp.tool.createTransaction.desc':
      '记录单笔或分期交易（2 至 36 期），并提供智能自动分类推荐。',
    'domainMcp.tool.updateTransaction.desc':
      '更新交易字段、修改金额/备注或核销付款（status="paid", paidAt）。',
    'domainMcp.tool.updateTransaction.args': 'id, ...要修改的字段',
    'domainMcp.tool.deleteTransaction.desc': '从保险库中永久删除一笔交易。',
    'domainMcp.tool.setExchangeRate.desc': '添加或更新常用货币对的汇率（100% 离线）。',
    'domainMcp.tool.setExchangeRate.args': 'from（代码）, to（代码）, rate（数字 > 0）',
    'domainMcp.tool.listExchangeRates.desc': '列出保险库中保存的所有汇率及支持的常用货币。',
    'domainMcp.tool.deleteExchangeRate.desc': '从保险库中移除指定货币对的汇率。',
    'domainMcp.tool.deleteExchangeRate.args': 'from（代码）, to（代码）',
    'domainMcp.tool.getMonthComparison.desc':
      '按月对比（最多 24 个月），包含收入、支出、变化及波动最大的分类。',
    'domainMcp.tool.getMonthComparison.args': 'month?, months?（默认 6）',
    'domainMcp.tool.saveInsight.desc':
      '将月度分析洞察加密保存至保险库（含标题、正文、亮点及数据签名）。',
    'domainMcp.tool.listInsights.desc': '读取助手保存在保险库中的洞察。',
    'domainMcp.tool.deleteInsight.desc': '从保险库中移除已保存的洞察。',
    'domainMcp.tool.exportBackup.desc':
      '将加密备份（AES-256-GCM）保存至项目的 vaults/ 文件夹并更新“最近备份”。',
  },
} as const;

export type DomainMcpKey = keyof (typeof domainMcpMessages)['pt-BR'];

function getRuntimeLanguage(): AppLanguage {
  try {
    if (typeof document !== 'undefined' && document.documentElement?.lang) {
      const l = document.documentElement.lang;
      if (l === 'en-GB' || l === 'es' || l === 'zh-CN' || l === 'pt-BR') return l;
    }
    if (typeof globalThis.localStorage !== 'undefined') {
      const stored = globalThis.localStorage.getItem('myfbox_language');
      if (stored === 'en-GB' || stored === 'es' || stored === 'zh-CN' || stored === 'pt-BR') return stored;
    }
  } catch {
    /* fallback to default */
  }
  return 'pt-BR';
}

export function tDomainMcp(
  key: DomainMcpKey,
  params?: Record<string, string | number>,
  langOverride?: AppLanguage
): string {
  const lang = langOverride ?? getRuntimeLanguage();
  const dict = (domainMcpMessages as Record<string, Record<string, string>>)[lang] ?? domainMcpMessages['pt-BR'];
  let text: string = dict[key] ?? (domainMcpMessages['pt-BR'] as Record<string, string>)[key] ?? key;
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
    }
  }
  return text;
}
