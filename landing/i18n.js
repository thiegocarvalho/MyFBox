(function () {
  var STORAGE_KEY = 'myfbox_language';
  var SUPPORTED = ['pt-BR', 'en-GB', 'es', 'zh-CN'];

  function normalizeLanguage(raw) {
    if (!raw || typeof raw !== 'string') return null;
    var cleaned = raw.trim().toLowerCase().replace(/_/g, '-');
    if (!cleaned) return null;
    if (cleaned === 'pt' || cleaned.indexOf('pt-') === 0) return 'pt-BR';
    if (cleaned === 'en' || cleaned.indexOf('en-') === 0) return 'en-GB';
    if (cleaned === 'es' || cleaned.indexOf('es-') === 0) return 'es';
    if (cleaned === 'zh' || cleaned.indexOf('zh-') === 0) return 'zh-CN';
    return null;
  }

  var TRANSLATIONS = {
    'pt-BR': {
      meta: {
        title: 'MyFBox — Seu dinheiro no seu controle, direto no seu aparelho',
        description:
          'Organize contas, gastos, metas e moedas sem criar conta nem mandar seus extratos para a nuvem. Use direto no navegador ou baixe para Windows, macOS e Linux.'
      },
      skipLink: 'Pular para o conteúdo',
      nav: {
        ariaLabel: 'Navegação principal',
        screens: 'Telas',
        assistant: 'Assistente IA',
        privacy: 'Privacidade',
        download: 'Baixar',
        github: 'GitHub',
        openApp: 'Abrir app',
        langLabel: 'Selecionar idioma'
      },
      hero: {
        tagline: '100% GRATUITO · CÓDIGO ABERTO · NO SEU APARELHO',
        title: 'Seu dinheiro no seu controle.',
        lead:
          'Acompanhe contas, gastos do mês e metas sem criar conta, sem pagar mensalidade e sem entregar seus extratos para ninguém.',
        ctaDesktop: 'Baixar app no computador',
        ctaWeb: 'Abrir no Navegador',
        metaFree: '100% grátis, sem planos pagos',
        metaPlatforms: 'Win · Mac · Linux · Web',
        metaLicense: 'Código aberto (AGPL-3.0)',
        stageLabel: 'MYFBOX // VISÃO DO MÊS',
        stageAlt:
          'Tela principal do MyFBox mostrando saldo atual, entradas, saídas, previsão do mês e despesas por categoria'
      },
      screens: {
        kicker: 'POR DENTRO DO APP',
        title: 'Feito para usar todo dia em poucos segundos',
        lead: 'Escolha uma tela abaixo para ver como o MyFBox funciona na prática.',
        tablistLabel: 'Telas do MyFBox',
        shortcutPrefix: 'Atalho rápido:',
        s1: {
          num: '01 / VISÃO DO MÊS',
          title: 'Saiba quanto vai sobrar',
          desc: 'Veja o saldo de hoje separado das contas pendentes até o fim do mês.',
          alt: 'Visão geral do mês com saldo atual, previsão até o fim do mês e gráfico anual',
          label: 'MYFBOX // VISÃO GERAL',
          caption: 'Separa o dinheiro que já entrou ou saiu do que ainda vai vencer.'
        },
        s2: {
          num: '02 / LANÇAMENTOS',
          title: 'Anote sem perder tempo',
          desc: 'Parcelamentos, recorrências, filtros rápidos e sugestão automática de categoria.',
          alt: 'Lista de lançamentos com filtros, categorias e valores pagos ou pendentes',
          label: 'MYFBOX // LANÇAMENTOS',
          caption: 'Aperte N em qualquer tela para anotar um gasto sem tirar a mão do teclado.'
        },
        s3: {
          num: '03 / METAS',
          title: 'Limites que avisam antes',
          desc: 'Coloque um teto mensal para mercado, lazer ou transporte e veja o quanto já usou.',
          alt: 'Tela de metas mensais por categoria com barra de progresso do orçamento',
          label: 'MYFBOX // METAS',
          caption: 'Defina limites por categoria e acompanhe antes de estourar o mês.'
        },
        s4: {
          num: '04 / PRIVACIDADE',
          title: 'Só você abre o cofre',
          desc: 'Seus dados ficam protegidos pela sua senha mestra, mesmo se alguém abrir o aparelho.',
          alt: 'Tela de desbloqueio por senha mestra do cofre MyFBox',
          label: 'MYFBOX // COFRE TRANCADO',
          caption: 'Tranca sozinho por inatividade. Só a sua senha abre de novo.'
        }
      },
      mcp: {
        kicker: 'MODO ASSISTENTE',
        title: 'Converse com suas finanças sem entregar sua senha',
        lead:
          'Quando quiser, conecte seu assistente de IA local via MCP. Você pede em linguagem natural e o cofre aberto atualiza na hora — ao trancar o app, o acesso corta na hora.',
        windowTitle: 'Seu Assistente de IA',
        status: 'MyFBox MCP conectado',
        avatar: 'IA',
        u1: 'Paguei R$ 84,50 no mercado hoje no Nubank',
        a1Tool: 'Usou MyFBox MCP · registrar lançamento',
        a1Text: 'Registrado em Alimentação (Nubank). Seu saldo de hoje foi atualizado.',
        u2: 'Quanto já gastei em mercado este mês?',
        a2Tool: 'Usou MyFBox MCP · consultar mês',
        a2Text: 'Você gastou R$ 505,30 em 2 compras — 56% da sua meta de R$ 900,00.',
        u3: 'Lembra que dia 25 vence a internet de R$ 149,90',
        a3Tool: 'Usou MyFBox MCP · agendar pendente',
        a3Text: 'Agendado para 25/11 como pendente. A previsão do mês já foi atualizada.',
        composerHint: 'Pergunte sobre seus gastos...',
        replay: 'Repetir',
        liveBar: 'MYFBOX // COFRE ABERTO AO VIVO',
        kpiBalance: 'SALDO HOJE',
        kpiExpenses: 'SAÍDAS DO MÊS',
        kpiProjected: 'SALDO PREVISTO',
        goalLabel: 'Meta: Alimentação',
        txInternetTitle: 'Internet Fibra',
        txInternetTag: 'Pendente · 25/11',
        txMarketTitle: 'Supermercado',
        txMarketTag: 'Alimentação · Pago',
        values: {
          initSaldo: 'R$ 4.850,00',
          initSaidas: 'R$ 420,80',
          initPrevisto: 'R$ 4.850,00',
          initMeta: 'R$ 420,80 / R$ 900,00',
          after1Saldo: 'R$ 4.765,50',
          after1Saidas: 'R$ 505,30',
          after1Previsto: 'R$ 4.765,50',
          after1Meta: 'R$ 505,30 / R$ 900,00',
          after2Previsto: 'R$ 4.615,60',
          txInternetAmt: '-R$ 149,90',
          txMarketNewAmt: '-R$ 84,50',
          txMarketOldAmt: '-R$ 420,80'
        }
      },
      privacy: {
        kicker: 'SEU DINHEIRO, SUAS REGRAS',
        title: 'Por que não pedimos nem seu e-mail',
        lead:
          'A maioria dos aplicativos financeiros ganha dinheiro olhando o que você compra. O MyFBox faz o caminho oposto: tudo roda no seu próprio aparelho.',
        p1Title: 'Sem servidor no meio',
        p1Desc:
          'Não existe conta para criar, senha para recuperar por e-mail nem banco de dados externo recebendo seus lançamentos.',
        p2Title: 'Funciona sem internet',
        p2Desc:
          'Use no avião, no metrô ou no escritório. O app não consulta APIs de bancos nem serviços externos.',
        p3Title: 'Leve para onde quiser',
        p3Desc:
          'Quer trocar de computador ou celular? Baixe um único arquivo protegido por senha e restaure no outro aparelho.'
      },
      download: {
        kicker: 'GRATUITO E CÓDIGO ABERTO',
        title: 'Baixe no computador ou abra no navegador',
        leadPrefix: 'Todas as versões são ',
        leadStrong: '100% gratuitas e de código aberto',
        leadSuffix:
          ' — sem assinatura, sem limite de lançamentos e sem versão paga. Para uso diário, recomendamos o app nativo instalado.',
        badgeRecommended: 'RECOMENDADO',
        badgePractical: 'PRÁTICO',
        winTitle: 'Windows',
        winDesc: 'Instalador tradicional ou versão portátil. Roda 100% offline no seu PC.',
        winBtn: 'Baixar para Windows',
        macTitle: 'macOS',
        macDesc: 'Compatível com Mac Apple Silicon (M1/M2/M3/M4) e Intel. Arquivo local.',
        macBtn: 'Baixar para macOS',
        linTitle: 'Linux',
        linDesc: 'Pacotes prontos em AppImage e .deb (Ubuntu/Debian). Zero dependência de rede.',
        linBtn: 'Baixar para Linux',
        webTitle: 'Navegador (Web)',
        webDesc: 'Experimente na hora sem instalar nada. Depois leve seu backup para o app desktop.',
        webBtn: 'Abrir no Navegador'
      },
      faq: {
        kicker: 'DÚVIDAS COMUNS',
        title: 'Perguntas diretas',
        q1: 'Onde meus dados ficam guardados?',
        a1: 'No navegador, eles ficam salvos no armazenamento local do próprio navegador. No app instalado no computador, ficam em um arquivo protegido na sua pasta de usuário.',
        q2: 'E se eu esquecer minha senha mestra?',
        a2: 'Não é possível recuperar, porque ninguém além de você tem a chave. Guarde sua senha em um gerenciador de senhas confiável.',
        q3: 'Funciona com mais de uma moeda?',
        a3: 'Sim. Você pode ter contas e lançamentos em Real, Dólar, Euro e outras moedas, com cotações informadas por você sem depender de internet.',
        q4: 'Posso exportar meus dados para planilha?',
        a4: 'Sim. Além do arquivo de backup protegido por senha, você pode baixar seus lançamentos em CSV a qualquer momento.',
        ghAriaLabel: 'Ver código-fonte no GitHub (licença AGPL-3.0)',
        ghTitle: 'Ver código-fonte no GitHub',
        ghText: 'Código aberto no GitHub'
      },
      footer: {
        openWeb: 'Abrir App Web',
        github: 'GitHub',
        security: 'Segurança',
        downloads: 'Downloads'
      }
    },

    'en-GB': {
      meta: {
        title: 'MyFBox — Your money under your control, straight on your device',
        description:
          'Organise accounts, spending, budgets and currencies without creating an account or sending your statements to the cloud. Use in your browser or download for Windows, macOS and Linux.'
      },
      skipLink: 'Skip to content',
      nav: {
        ariaLabel: 'Main navigation',
        screens: 'Screens',
        assistant: 'AI Assistant',
        privacy: 'Privacy',
        download: 'Download',
        github: 'GitHub',
        openApp: 'Open app',
        langLabel: 'Select language'
      },
      hero: {
        tagline: '100% FREE · OPEN SOURCE · ON YOUR DEVICE',
        title: 'Your money under your control.',
        lead:
          'Track accounts, monthly spending and budgets without creating an account, paying a subscription or handing your statements to anyone.',
        ctaDesktop: 'Download desktop app',
        ctaWeb: 'Open in Browser',
        metaFree: '100% free, no paid tiers',
        metaPlatforms: 'Win · Mac · Linux · Web',
        metaLicense: 'Open source (AGPL-3.0)',
        stageLabel: 'MYFBOX // MONTH OVERVIEW',
        stageAlt:
          'MyFBox main screen showing current balance, income, expenses, monthly forecast and spending by category'
      },
      screens: {
        kicker: 'INSIDE THE APP',
        title: 'Built for everyday use in seconds',
        lead: 'Pick a screen below to see how MyFBox works in practice.',
        tablistLabel: 'MyFBox screens',
        shortcutPrefix: 'Quick shortcut:',
        s1: {
          num: '01 / MONTH OVERVIEW',
          title: 'Know what will be left',
          desc: 'See today’s balance separated from pending bills due before the end of the month.',
          alt: 'Monthly overview with current balance, end-of-month forecast and annual chart',
          label: 'MYFBOX // OVERVIEW',
          caption: 'Separates money already received or spent from what is still due.'
        },
        s2: {
          num: '02 / TRANSACTIONS',
          title: 'Log entries without delay',
          desc: 'Instalments, recurring bills, quick filters and automatic category suggestions to categorise faster.',
          alt: 'Transactions list with filters, categories and paid or pending amounts',
          label: 'MYFBOX // TRANSACTIONS',
          caption: 'Press N on any screen to log an expense without taking your hands off the keyboard.'
        },
        s3: {
          num: '03 / BUDGETS',
          title: 'Limits that warn you early',
          desc: 'Set a monthly cap for groceries, leisure or transport and see how much you have used.',
          alt: 'Monthly category budgets screen with progress bars',
          label: 'MYFBOX // BUDGETS',
          caption: 'Set limits by category and stay on track before overspending.'
        },
        s4: {
          num: '04 / PRIVACY',
          title: 'Only you unlock the vault',
          desc: 'Your data stays protected by your master password, even if someone else opens your device.',
          alt: 'MyFBox master password vault unlock screen',
          label: 'MYFBOX // VAULT LOCKED',
          caption: 'Locks automatically on inactivity. Only your password opens it again.'
        }
      },
      mcp: {
        kicker: 'ASSISTANT MODE',
        title: 'Chat with your finances without sharing your password',
        lead:
          'Whenever you choose, authorise your local AI assistant via MCP. Ask in plain English and the unlocked vault updates straight away — lock the app and access stops immediately.',
        windowTitle: 'Your AI Assistant',
        status: 'MyFBox MCP connected',
        avatar: 'AI',
        u1: 'Paid £84.50 at the supermarket today via Monzo',
        a1Tool: 'Used MyFBox MCP · log transaction',
        a1Text: 'Recorded under Groceries (Monzo). Today’s balance has been updated.',
        u2: 'How much have I spent on groceries this month?',
        a2Tool: 'Used MyFBox MCP · query month',
        a2Text: 'You have spent £505.30 across 2 shops — 56% of your £900.00 budget.',
        u3: 'Remind me fibre broadband of £149.90 is due on the 25th',
        a3Tool: 'Used MyFBox MCP · schedule pending',
        a3Text: 'Scheduled for 25/11 as pending. Your monthly forecast has been updated.',
        composerHint: 'Ask about your spending...',
        replay: 'Replay',
        liveBar: 'MYFBOX // LIVE UNLOCKED VAULT',
        kpiBalance: 'TODAY’S BALANCE',
        kpiExpenses: 'MONTH EXPENSES',
        kpiProjected: 'FORECAST BALANCE',
        goalLabel: 'Budget: Groceries',
        txInternetTitle: 'Fibre Broadband',
        txInternetTag: 'Pending · 25/11',
        txMarketTitle: 'Supermarket',
        txMarketTag: 'Groceries · Paid',
        values: {
          initSaldo: '£4,850.00',
          initSaidas: '£420.80',
          initPrevisto: '£4,850.00',
          initMeta: '£420.80 / £900.00',
          after1Saldo: '£4,765.50',
          after1Saidas: '£505.30',
          after1Previsto: '£4,765.50',
          after1Meta: '£505.30 / £900.00',
          after2Previsto: '£4,615.60',
          txInternetAmt: '-£149.90',
          txMarketNewAmt: '-£84.50',
          txMarketOldAmt: '-£420.80'
        }
      },
      privacy: {
        kicker: 'YOUR MONEY, YOUR RULES',
        title: 'Why we don’t even ask for your email',
        lead:
          'Most finance apps make money by watching your spending behaviour. MyFBox takes the opposite approach: everything runs on your own device.',
        p1Title: 'No server in the middle',
        p1Desc:
          'No account to register, no email password recovery and no external database receiving your transactions.',
        p2Title: 'Works offline',
        p2Desc:
          'Use it on a flight, on the train or at the office. The app never queries bank APIs or external services.',
        p3Title: 'Take it anywhere',
        p3Desc:
          'Switching computers or phones? Download a single password-protected backup file and restore it on the new device.'
      },
      download: {
        kicker: 'FREE AND OPEN SOURCE',
        title: 'Download for desktop or open in your browser',
        leadPrefix: 'Every version is ',
        leadStrong: '100% free and open source',
        leadSuffix:
          ' — no subscription, no transaction limits and no paid tier. For daily use, we recommend the installed native app.',
        badgeRecommended: 'RECOMMENDED',
        badgePractical: 'INSTANT',
        winTitle: 'Windows',
        winDesc: 'Standard installer or portable build. Runs 100% offline on your PC.',
        winBtn: 'Download for Windows',
        macTitle: 'macOS',
        macDesc: 'Supports Apple Silicon (M1/M2/M3/M4) and Intel Macs. Local file storage.',
        macBtn: 'Download for macOS',
        linTitle: 'Linux',
        linDesc: 'Ready-to-run AppImage and .deb packages (Ubuntu/Debian). Zero network dependencies.',
        linBtn: 'Download for Linux',
        webTitle: 'Browser (Web)',
        webDesc: 'Try it straight away with nothing to install. Move your backup to the desktop app later.',
        webBtn: 'Open in Browser'
      },
      faq: {
        kicker: 'COMMON QUESTIONS',
        title: 'Straight answers',
        q1: 'Where is my data stored?',
        a1: 'In the browser, data is saved in your browser’s local storage. In the installed desktop app, it is kept in a protected file inside your user folder.',
        q2: 'What if I forget my master password?',
        a2: 'It cannot be recovered, because nobody else holds the key. Store your password in a trusted password manager.',
        q3: 'Does it support multiple currencies?',
        a3: 'Yes. You can hold accounts and transactions in GBP, EUR, USD, BRL and other currencies, with exchange rates you set yourself offline.',
        q4: 'Can I export my data to a spreadsheet?',
        a4: 'Yes. Alongside the password-protected backup file, you can download your transactions as CSV at any time.',
        ghAriaLabel: 'View source code on GitHub (AGPL-3.0 licence)',
        ghTitle: 'View source code on GitHub',
        ghText: 'Open source on GitHub'
      },
      footer: {
        openWeb: 'Open Web App',
        github: 'GitHub',
        security: 'Security',
        downloads: 'Downloads'
      }
    },

    es: {
      meta: {
        title: 'MyFBox — Tu dinero bajo tu control, directo en tu dispositivo',
        description:
          'Organiza cuentas, gastos, metas y monedas sin crear cuenta ni enviar tus extractos a la nube. Úsalo en el navegador o descárgalo para Windows, macOS y Linux.'
      },
      skipLink: 'Ir al contenido',
      nav: {
        ariaLabel: 'Navegación principal',
        screens: 'Pantallas',
        assistant: 'Asistente IA',
        privacy: 'Privacidad',
        download: 'Descargar',
        github: 'GitHub',
        openApp: 'Abrir app',
        langLabel: 'Seleccionar idioma'
      },
      hero: {
        tagline: '100% GRATUITO · CÓDIGO ABIERTO · EN TU DISPOSITIVO',
        title: 'Tu dinero bajo tu control.',
        lead:
          'Controla cuentas, gastos del mes y metas sin crear cuenta, sin pagar suscripciones y sin entregar tus extractos a nadie.',
        ctaDesktop: 'Descargar app de escritorio',
        ctaWeb: 'Abrir en el Navegador',
        metaFree: '100% gratis, sin planes de pago',
        metaPlatforms: 'Win · Mac · Linux · Web',
        metaLicense: 'Código abierto (AGPL-3.0)',
        stageLabel: 'MYFBOX // VISIÓN DEL MES',
        stageAlt:
          'Pantalla principal de MyFBox con saldo actual, ingresos, gastos, previsión del mes y gastos por categoría'
      },
      screens: {
        kicker: 'POR DENTRO DE LA APP',
        title: 'Hecha para usar cada día en pocos segundos',
        lead: 'Elige una pantalla abajo para ver cómo funciona MyFBox en la práctica.',
        tablistLabel: 'Pantallas de MyFBox',
        shortcutPrefix: 'Atajo rápido:',
        s1: {
          num: '01 / VISIÓN DEL MES',
          title: 'Sabe cuánto te quedará',
          desc: 'Ve el saldo de hoy separado de los pagos pendientes hasta fin de mes.',
          alt: 'Resumen mensual con saldo actual, previsión hasta fin de mes y gráfico anual',
          label: 'MYFBOX // RESUMEN',
          caption: 'Separa el dinero que ya entró o salió de lo que aún está por vencer.'
        },
        s2: {
          num: '02 / MOVIMIENTOS',
          title: 'Registra sin perder tiempo',
          desc: 'Cuotas, pagos recurrentes, filtros rápidos y sugerencia automática de categoría.',
          alt: 'Lista de movimientos con filtros, categorías e importes pagados o pendientes',
          label: 'MYFBOX // MOVIMIENTOS',
          caption: 'Pulsa N en cualquier pantalla para anotar un gasto sin soltar el teclado.'
        },
        s3: {
          num: '03 / METAS',
          title: 'Límites que avisan antes',
          desc: 'Fija un tope mensual para supermercado, ocio o transporte y mira cuánto llevas usado.',
          alt: 'Pantalla de metas mensuales por categoría con barra de progreso del presupuesto',
          label: 'MYFBOX // METAS',
          caption: 'Define límites por categoría y haz seguimiento antes de pasarte.'
        },
        s4: {
          num: '04 / PRIVACIDAD',
          title: 'Solo tú abres la caja fuerte',
          desc: 'Tus datos quedan protegidos por tu contraseña maestra, incluso si alguien abre tu equipo.',
          alt: 'Pantalla de desbloqueo con contraseña maestra de la caja fuerte MyFBox',
          label: 'MYFBOX // CAJA BLOQUEADA',
          caption: 'Se bloquea sola por inactividad. Solo tu contraseña vuelve a abrirla.'
        }
      },
      mcp: {
        kicker: 'MODO ASISTENTE',
        title: 'Conversa con tus finanzas sin entregar tu contraseña',
        lead:
          'Cuando quieras, conecta tu asistente de IA local mediante MCP. Pides en lenguaje natural y la caja abierta se actualiza al instante — al bloquear la app, el acceso se corta de inmediato.',
        windowTitle: 'Tu Asistente de IA',
        status: 'MyFBox MCP conectado',
        avatar: 'IA',
        u1: 'Pagué € 84,50 en el súper hoy con BBVA',
        a1Tool: 'Usó MyFBox MCP · registrar movimiento',
        a1Text: 'Registrado en Alimentación (BBVA). Tu saldo de hoy se ha actualizado.',
        u2: '¿Cuánto llevo gastado en súper este mes?',
        a2Tool: 'Usó MyFBox MCP · consultar mes',
        a2Text: 'Llevas € 505,30 en 2 compras — el 56% de tu meta de € 900,00.',
        u3: 'Recuerda que el día 25 vence la fibra de € 149,90',
        a3Tool: 'Usó MyFBox MCP · programar pendiente',
        a3Text: 'Programado para el 25/11 como pendiente. La previsión del mes ya se actualizó.',
        composerHint: 'Pregunta sobre tus gastos...',
        replay: 'Repetir',
        liveBar: 'MYFBOX // CAJA ABIERTA EN VIVO',
        kpiBalance: 'SALDO HOY',
        kpiExpenses: 'GASTOS DEL MES',
        kpiProjected: 'SALDO PREVISTO',
        goalLabel: 'Meta: Alimentación',
        txInternetTitle: 'Internet Fibra',
        txInternetTag: 'Pendiente · 25/11',
        txMarketTitle: 'Supermercado',
        txMarketTag: 'Alimentación · Pagado',
        values: {
          initSaldo: '€ 4.850,00',
          initSaidas: '€ 420,80',
          initPrevisto: '€ 4.850,00',
          initMeta: '€ 420,80 / € 900,00',
          after1Saldo: '€ 4.765,50',
          after1Saidas: '€ 505,30',
          after1Previsto: '€ 4.765,50',
          after1Meta: '€ 505,30 / € 900,00',
          after2Previsto: '€ 4.615,60',
          txInternetAmt: '-€ 149,90',
          txMarketNewAmt: '-€ 84,50',
          txMarketOldAmt: '-€ 420,80'
        }
      },
      privacy: {
        kicker: 'TU DINERO, TUS REGLAS',
        title: 'Por qué no pedimos ni tu correo',
        lead:
          'La mayoría de las apps financieras ganan dinero observando lo que compras. MyFBox hace lo contrario: todo funciona en tu propio dispositivo.',
        p1Title: 'Sin servidor de por medio',
        p1Desc:
          'No hay cuenta que crear, contraseña que recuperar por correo ni base de datos externa recibiendo tus movimientos.',
        p2Title: 'Funciona sin internet',
        p2Desc:
          'Úsalo en el avión, en el metro o en la oficina. La app no consulta APIs bancarias ni servicios externos.',
        p3Title: 'Llévalo adonde quieras',
        p3Desc:
          '¿Cambias de ordenador o móvil? Descarga un único archivo protegido por contraseña y restáuralo en el otro equipo.'
      },
      download: {
        kicker: 'GRATUITO Y CÓDIGO ABIERTO',
        title: 'Descarga en tu ordenador o abre en el navegador',
        leadPrefix: 'Todas las versiones son ',
        leadStrong: '100% gratuitas y de código abierto',
        leadSuffix:
          ' — sin suscripción, sin límite de movimientos y sin versión de pago. Para uso diario, recomendamos la app nativa instalada.',
        badgeRecommended: 'RECOMENDADO',
        badgePractical: 'PRÁCTICO',
        winTitle: 'Windows',
        winDesc: 'Instalador clásico o versión portátil. Funciona 100% sin conexión en tu PC.',
        winBtn: 'Descargar para Windows',
        macTitle: 'macOS',
        macDesc: 'Compatible con Mac Apple Silicon (M1/M2/M3/M4) e Intel. Archivo local.',
        macBtn: 'Descargar para macOS',
        linTitle: 'Linux',
        linDesc: 'Paquetes listos en AppImage y .deb (Ubuntu/Debian). Cero dependencia de red.',
        linBtn: 'Descargar para Linux',
        webTitle: 'Navegador (Web)',
        webDesc: 'Pruébalo al instante sin instalar nada. Luego lleva tu respaldo a la app de escritorio.',
        webBtn: 'Abrir en el Navegador'
      },
      faq: {
        kicker: 'DUDAS FRECUENTES',
        title: 'Respuestas directas',
        q1: '¿Dónde se guardan mis datos?',
        a1: 'En el navegador, se guardan en el almacenamiento local del propio navegador. En la app instalada en el ordenador, quedan en un archivo protegido dentro de tu carpeta de usuario.',
        q2: '¿Y si olvido mi contraseña maestra?',
        a2: 'No es posible recuperarla, porque nadie más que tú tiene la clave. Guarda tu contraseña en un gestor de contraseñas fiable.',
        q3: '¿Funciona con más de una moneda?',
        a3: 'Sí. Puedes tener cuentas y movimientos en Euro, Dólar, Real y otras monedas, con tipos de cambio indicados por ti sin depender de internet.',
        q4: '¿Puedo exportar mis datos a hoja de cálculo?',
        a4: 'Sí. Además del archivo de copia de seguridad protegido por contraseña, puedes descargar tus movimientos en CSV en cualquier momento.',
        ghAriaLabel: 'Ver código fuente en GitHub (licencia AGPL-3.0)',
        ghTitle: 'Ver código fuente en GitHub',
        ghText: 'Código abierto en GitHub'
      },
      footer: {
        openWeb: 'Abrir App Web',
        github: 'GitHub',
        security: 'Seguridad',
        downloads: 'Descargas'
      }
    },

    'zh-CN': {
      meta: {
        title: 'MyFBox — 你的财务由你掌控，数据留在本地设备',
        description:
          '无需注册账号或上传账单到云端，轻松管理账户、日常收支、预算与多币种。支持浏览器直接使用，或下载 Windows、macOS 与 Linux 桌面版。'
      },
      skipLink: '跳到正文',
      nav: {
        ariaLabel: '主导航',
        screens: '界面预览',
        assistant: 'AI 助手',
        privacy: '隐私安全',
        download: '下载',
        github: 'GitHub',
        openApp: '打开应用',
        langLabel: '选择语言'
      },
      hero: {
        tagline: '100% 免费 · 开源软件 · 纯本地运行',
        title: '你的财务，由你掌控。',
        lead: '无需注册账号、无需付费订阅、无需向任何服务器上传账单，随时记录账户、月度支出与预算目标。',
        ctaDesktop: '下载桌面版应用',
        ctaWeb: '在浏览器中打开',
        metaFree: '完全免费，无任何付费墙',
        metaPlatforms: 'Win · Mac · Linux · Web',
        metaLicense: '开源协议 (AGPL-3.0)',
        stageLabel: 'MYFBOX // 本月概览',
        stageAlt: 'MyFBox 主界面，显示当前余额、收入、支出、本月预测及分类开销'
      },
      screens: {
        kicker: '应用内部',
        title: '为每天几秒钟记账而设计',
        lead: '点击下方标签，查看 MyFBox 的实际使用界面。',
        tablistLabel: 'MyFBox 界面列表',
        shortcutPrefix: '快捷键：',
        s1: {
          num: '01 / 本月概览',
          title: '清楚月底还剩多少',
          desc: '将今日可用余额与月底前待支付账单清晰区分。',
          alt: '月度概览界面，展示当前余额、月底预测与年度趋势图',
          label: 'MYFBOX // 本月概览',
          caption: '区分已入账/已支出金额与待到期账单。'
        },
        s2: {
          num: '02 / 交易记录',
          title: '快速记账不费时间',
          desc: '支持分期、定期账单、快捷筛选与智能分类推荐。',
          alt: '交易记录列表，包含筛选器、分类及已付或待付状态',
          label: 'MYFBOX // 交易记录',
          caption: '在任意界面按 N 键即可快速记一笔，无需离开键盘。'
        },
        s3: {
          num: '03 / 预算目标',
          title: '超支前及时提醒',
          desc: '为餐饮、娱乐或交通设置月度上限，实时查看已使用比例。',
          alt: '按分类设置的月度预算目标及进度条界面',
          label: 'MYFBOX // 预算目标',
          caption: '按分类设置预算上限，避免月底超支。'
        },
        s4: {
          num: '04 / 隐私保护',
          title: '只有你能打开保险库',
          desc: '即使他人使用你的设备，数据也始终受主密码加密保护。',
          alt: 'MyFBox 主密码解锁保险库界面',
          label: 'MYFBOX // 保险库已锁定',
          caption: '闲置后自动锁定，只有你的主密码才能再次解锁。'
        }
      },
      mcp: {
        kicker: 'AI 助手模式',
        title: '用自然语言管账，绝不交出密码',
        lead:
          '需要时可通过 MCP 连接你的本地 AI 助手。用日常对话记账或查账，已解锁的保险库实时更新；一旦锁定应用，访问权限立即切断。',
        windowTitle: '你的 AI 助手',
        status: 'MyFBox MCP 已连接',
        avatar: 'AI',
        u1: '今天在超市用银行卡花了 ¥84.50',
        a1Tool: '已调用 MyFBox MCP · 记录交易',
        a1Text: '已记录至「餐饮食品」分类。今日余额已同步更新。',
        u2: '这个月超市一共花了多少？',
        a2Tool: '已调用 MyFBox MCP · 查询本月',
        a2Text: '本月共消费 2 笔，合计 ¥505.30 — 占 ¥900.00 预算的 56%。',
        u3: '提醒我 25 号要交 ¥149.90 的宽带费',
        a3Tool: '已调用 MyFBox MCP · 添加待付账单',
        a3Text: '已安排在 11/25 作为待付账单。本月预测余额已更新。',
        composerHint: '询问你的收支情况...',
        replay: '重播演示',
        liveBar: 'MYFBOX // 实时已解锁保险库',
        kpiBalance: '今日余额',
        kpiExpenses: '本月支出',
        kpiProjected: '预计结余',
        goalLabel: '预算：餐饮食品',
        txInternetTitle: '光纤宽带',
        txInternetTag: '待付 · 25/11',
        txMarketTitle: '超市采购',
        txMarketTag: '餐饮食品 · 已付',
        values: {
          initSaldo: '¥4,850.00',
          initSaidas: '¥420.80',
          initPrevisto: '¥4,850.00',
          initMeta: '¥420.80 / ¥900.00',
          after1Saldo: '¥4,765.50',
          after1Saidas: '¥505.30',
          after1Previsto: '¥4,765.50',
          after1Meta: '¥505.30 / ¥900.00',
          after2Previsto: '¥4,615.60',
          txInternetAmt: '-¥149.90',
          txMarketNewAmt: '-¥84.50',
          txMarketOldAmt: '-¥420.80'
        }
      },
      privacy: {
        kicker: '你的资金，你的规则',
        title: '为什么我们连你的邮箱都不问',
        lead:
          '大多数记账软件靠分析你的消费习惯盈利。MyFBox 选择相反的道路：一切完全运行在你自己的设备上。',
        p1Title: '没有中间服务器',
        p1Desc: '无需注册账号，没有邮箱找回密码流程，也没有任何外部数据库接收你的账单记录。',
        p2Title: '完全离线可用',
        p2Desc: '在飞机上、地铁里或办公室都能随时使用。应用不请求任何银行 API 或外部服务。',
        p3Title: '随时随地迁移',
        p3Desc: '更换电脑或手机？只需导出一份受密码保护的加密备份文件，在新设备上恢复即可。'
      },
      download: {
        kicker: '免费且开源',
        title: '下载桌面版或直接在浏览器中使用',
        leadPrefix: '所有版本均 ',
        leadStrong: '100% 免费且开源',
        leadSuffix: ' — 无订阅费、无记账条数限制、无付费版。日常使用推荐安装桌面原生应用。',
        badgeRecommended: '推荐',
        badgePractical: '便捷',
        winTitle: 'Windows',
        winDesc: '提供标准安装包与便携版。在你的电脑上 100% 离线运行。',
        winBtn: '下载 Windows 版',
        macTitle: 'macOS',
        macDesc: '原生支持 Apple Silicon (M1/M2/M3/M4) 与 Intel Mac。数据本地存储。',
        macBtn: '下载 macOS 版',
        linTitle: 'Linux',
        linDesc: '提供 AppImage 与 .deb 安装包 (Ubuntu/Debian)。零网络依赖。',
        linBtn: '下载 Linux 版',
        webTitle: '浏览器 (Web)',
        webDesc: '无需安装即刻体验。之后可随时将备份导入桌面版继续使用。',
        webBtn: '在浏览器中打开'
      },
      faq: {
        kicker: '常见问题',
        title: '直接解答',
        q1: '我的数据保存在哪里？',
        a1: '在浏览器中，数据保存在浏览器的本地存储中；在桌面安装版中，数据以加密文件形式保存在你的用户目录下。',
        q2: '如果忘记主密码怎么办？',
        a2: '无法找回，因为除了你之外没有任何人持有密钥。请务必将密码保存在可靠的密码管理器中。',
        q3: '支持多种货币吗？',
        a3: '支持。你可以管理人民币、美元、欧元、英镑等多种货币账户与交易，汇率由你手动设定，不依赖网络。',
        q4: '可以导出数据到电子表格吗？',
        a4: '可以。除了受密码保护的完整备份文件外，你还可以随时将交易记录导出为 CSV 文件。',
        ghAriaLabel: '在 GitHub 上查看源代码（AGPL-3.0 协议）',
        ghTitle: '在 GitHub 上查看源代码',
        ghText: 'GitHub 开源仓库'
      },
      footer: {
        openWeb: '打开网页版',
        github: 'GitHub',
        security: '安全说明',
        downloads: '下载中心'
      }
    }
  };

  function getByPath(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function updateAppLinks(lang) {
    var links = document.querySelectorAll('a[data-app-link]');
    links.forEach(function (link) {
      var base = link.getAttribute('data-app-link') || './app/';
      link.setAttribute('href', base + '?lang=' + encodeURIComponent(lang));
    });
  }

  function applyLanguage(lang, persist) {
    var dict = TRANSLATIONS[lang] || TRANSLATIONS['pt-BR'];
    document.documentElement.lang = lang;
    document.title = dict.meta.title;

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', dict.meta.description);

    var nodes = document.querySelectorAll('[data-i18n]');
    nodes.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = getByPath(dict, key);
      if (typeof val === 'string') {
        el.textContent = val;
      }
    });

    var attrNodes = document.querySelectorAll('[data-i18n-attrs]');
    attrNodes.forEach(function (el) {
      var spec = el.getAttribute('data-i18n-attrs');
      if (!spec) return;
      spec.split(',').forEach(function (pair) {
        var idx = pair.indexOf(':');
        if (idx === -1) return;
        var attr = pair.slice(0, idx).trim();
        var key = pair.slice(idx + 1).trim();
        var val = getByPath(dict, key);
        if (typeof val === 'string') {
          el.setAttribute(attr, val);
        }
      });
    });

    // Sync active storyboard stage text with selected tab
    var activeTab = document.querySelector('.scene-btn[aria-selected="true"]');
    if (activeTab) {
      var img = document.getElementById('scene-img');
      var label = document.getElementById('scene-label');
      var caption = document.getElementById('scene-caption');
      if (img) img.alt = activeTab.getAttribute('data-alt') || '';
      if (label) label.textContent = activeTab.getAttribute('data-label') || '';
      if (caption) caption.textContent = activeTab.getAttribute('data-caption') || '';
    }

    // Update MCP demo values
    window.__myfboxMcpValues = dict.mcp.values;
    if (typeof window.__myfboxResetMcpScene === 'function') {
      window.__myfboxResetMcpScene();
    }

    updateAppLinks(lang);

    var select = document.getElementById('lang-select');
    if (select && select.value !== lang) {
      select.value = lang;
    }

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Ignore storage errors in restricted contexts
      }
    }
  }

  function detectInitialLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      var fromUrl = normalizeLanguage(params.get('lang'));
      if (fromUrl && SUPPORTED.indexOf(fromUrl) !== -1) {
        return { lang: fromUrl, persist: true };
      }
    } catch {
      // Ignore URLSearchParams errors
    }

    var staticLang = normalizeLanguage(document.documentElement.getAttribute('data-static-lang'));
    if (staticLang && staticLang !== 'pt-BR') {
      return { lang: staticLang, persist: true };
    }

    try {
      var stored = normalizeLanguage(localStorage.getItem(STORAGE_KEY));
      if (stored && SUPPORTED.indexOf(stored) !== -1) {
        return { lang: stored, persist: false };
      }
    } catch {
      // Ignore storage errors
    }

    return { lang: staticLang || 'pt-BR', persist: false };
  }

  function initI18n() {
    var initial = detectInitialLang();
    var staticLang = normalizeLanguage(document.documentElement.getAttribute('data-static-lang')) || 'pt-BR';

    // Always bind app links and select value; only re-translate DOM if initial differs from static HTML
    var select = document.getElementById('lang-select');
    if (select) {
      select.value = initial.lang;
      select.addEventListener('change', function () {
        var nextLang = normalizeLanguage(select.value) || 'pt-BR';
        applyLanguage(nextLang, true);
      });
    }

    if (initial.lang !== staticLang) {
      applyLanguage(initial.lang, initial.persist);
    } else {
      var dict = TRANSLATIONS[initial.lang] || TRANSLATIONS['pt-BR'];
      window.__myfboxMcpValues = dict.mcp.values;
      updateAppLinks(initial.lang);
      if (initial.persist) {
        try {
          localStorage.setItem(STORAGE_KEY, initial.lang);
        } catch {
          // Ignore
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
})();
