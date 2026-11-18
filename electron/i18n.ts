export const SUPPORTED_ELECTRON_LANGUAGES = ['pt-BR', 'en-GB', 'es', 'zh-CN'] as const

export type ElectronLanguage = (typeof SUPPORTED_ELECTRON_LANGUAGES)[number]

export const DEFAULT_ELECTRON_LANGUAGE: ElectronLanguage = 'pt-BR'

export interface ElectronI18nDictionary {
  readonly menu: {
    readonly file: string
    readonly openVault: string
    readonly saveVault: string
    readonly close: string
    readonly quit: string
    readonly edit: string
    readonly undo: string
    readonly redo: string
    readonly cut: string
    readonly copy: string
    readonly paste: string
    readonly selectAll: string
    readonly view: string
    readonly reload: string
    readonly toggleDevTools: string
    readonly resetZoom: string
    readonly zoomIn: string
    readonly zoomOut: string
    readonly toggleFullscreen: string
    readonly window: string
    readonly minimize: string
    readonly zoom: string
    readonly help: string
    readonly about: string
  }
  readonly dialogs: {
    readonly openTitle: string
    readonly saveTitle: string
    readonly vaultFilterName: string
    readonly allFilesFilterName: string
    readonly confirmReplaceTitle: string
    readonly confirmReplaceMessage: string
    readonly confirmReplaceDetail: string
    readonly confirm: string
    readonly cancel: string
    readonly errorTitle: string
    readonly openErrorMessage: string
    readonly saveErrorMessage: string
    readonly aboutTitle: string
    readonly aboutMessage: string
  }
}

const ptBR: ElectronI18nDictionary = {
  menu: {
    file: 'Arquivo',
    openVault: 'Abrir cofre...',
    saveVault: 'Salvar cofre...',
    close: 'Fechar',
    quit: 'Sair',
    edit: 'Editar',
    undo: 'Desfazer',
    redo: 'Refazer',
    cut: 'Recortar',
    copy: 'Copiar',
    paste: 'Colar',
    selectAll: 'Selecionar tudo',
    view: 'Visualizar',
    reload: 'Recarregar',
    toggleDevTools: 'Ferramentas do desenvolvedor',
    resetZoom: 'Tamanho real',
    zoomIn: 'Ampliar',
    zoomOut: 'Reduzir',
    toggleFullscreen: 'Tela cheia',
    window: 'Janela',
    minimize: 'Minimizar',
    zoom: 'Zoom',
    help: 'Ajuda',
    about: 'Sobre o MyFBox',
  },
  dialogs: {
    openTitle: 'Abrir cofre MyFBox',
    saveTitle: 'Salvar cofre MyFBox',
    vaultFilterName: 'Cofre MyFBox (.myfbox.json)',
    allFilesFilterName: 'Todos os arquivos',
    confirmReplaceTitle: 'Confirmar substituição',
    confirmReplaceMessage: 'Deseja substituir o cofre atual?',
    confirmReplaceDetail: 'Essa ação sobrescreverá os dados cifrados locais.',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    errorTitle: 'Erro no MyFBox',
    openErrorMessage: 'Não foi possível abrir o arquivo de cofre.',
    saveErrorMessage: 'Não foi possível salvar o arquivo de cofre.',
    aboutTitle: 'Sobre o MyFBox',
    aboutMessage: 'MyFBox — Controle financeiro pessoal local-first, cifrado no dispositivo.',
  },
}

const enGB: ElectronI18nDictionary = {
  menu: {
    file: 'File',
    openVault: 'Open Vault...',
    saveVault: 'Save Vault...',
    close: 'Close',
    quit: 'Quit',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    view: 'View',
    reload: 'Reload',
    toggleDevTools: 'Toggle Developer Tools',
    resetZoom: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullscreen: 'Toggle Full Screen',
    window: 'Window',
    minimize: 'Minimise',
    zoom: 'Zoom',
    help: 'Help',
    about: 'About MyFBox',
  },
  dialogs: {
    openTitle: 'Open MyFBox Vault',
    saveTitle: 'Save MyFBox Vault',
    vaultFilterName: 'MyFBox Vault (.myfbox.json)',
    allFilesFilterName: 'All Files',
    confirmReplaceTitle: 'Confirm Replacement',
    confirmReplaceMessage: 'Do you want to replace the current vault?',
    confirmReplaceDetail: 'This action will overwrite local encrypted data.',
    confirm: 'Confirm',
    cancel: 'Cancel',
    errorTitle: 'MyFBox Error',
    openErrorMessage: 'Unable to open the vault file.',
    saveErrorMessage: 'Unable to save the vault file.',
    aboutTitle: 'About MyFBox',
    aboutMessage: 'MyFBox — Local-first personal finance tracker, encrypted on-device.',
  },
}

const es: ElectronI18nDictionary = {
  menu: {
    file: 'Archivo',
    openVault: 'Abrir bóveda...',
    saveVault: 'Guardar bóveda...',
    close: 'Cerrar',
    quit: 'Salir',
    edit: 'Editar',
    undo: 'Deshacer',
    redo: 'Rehacer',
    cut: 'Cortar',
    copy: 'Copiar',
    paste: 'Pegar',
    selectAll: 'Seleccionar todo',
    view: 'Ver',
    reload: 'Recargar',
    toggleDevTools: 'Herramientas para desarrolladores',
    resetZoom: 'Tamaño real',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    toggleFullscreen: 'Pantalla completa',
    window: 'Ventana',
    minimize: 'Minimizar',
    zoom: 'Zoom',
    help: 'Ayuda',
    about: 'Acerca de MyFBox',
  },
  dialogs: {
    openTitle: 'Abrir bóveda de MyFBox',
    saveTitle: 'Guardar bóveda de MyFBox',
    vaultFilterName: 'Bóveda MyFBox (.myfbox.json)',
    allFilesFilterName: 'Todos los archivos',
    confirmReplaceTitle: 'Confirmar reemplazo',
    confirmReplaceMessage: '¿Desea reemplazar la bóveda actual?',
    confirmReplaceDetail: 'Esta acción sobrescribirá los datos cifrados locales.',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    errorTitle: 'Error de MyFBox',
    openErrorMessage: 'No se pudo abrir el archivo de bóveda.',
    saveErrorMessage: 'No se pudo guardar el archivo de bóveda.',
    aboutTitle: 'Acerca de MyFBox',
    aboutMessage: 'MyFBox — Control financiero personal local-first, cifrado en el dispositivo.',
  },
}

const zhCN: ElectronI18nDictionary = {
  menu: {
    file: '文件',
    openVault: '打开保险库...',
    saveVault: '保存保险库...',
    close: '关闭',
    quit: '退出',
    edit: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    view: '视图',
    reload: '重新加载',
    toggleDevTools: '切换开发者工具',
    resetZoom: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    toggleFullscreen: '切换全屏',
    window: '窗口',
    minimize: '最小化',
    zoom: '缩放',
    help: '帮助',
    about: '关于 MyFBox',
  },
  dialogs: {
    openTitle: '打开 MyFBox 保险库',
    saveTitle: '保存 MyFBox 保险库',
    vaultFilterName: 'MyFBox 保险库 (.myfbox.json)',
    allFilesFilterName: '所有文件',
    confirmReplaceTitle: '确认替换',
    confirmReplaceMessage: '是否要替换当前保险库？',
    confirmReplaceDetail: '此操作将覆盖本地加密数据。',
    confirm: '确认',
    cancel: '取消',
    errorTitle: 'MyFBox 错误',
    openErrorMessage: '无法打开保险库文件。',
    saveErrorMessage: '无法保存保险库文件。',
    aboutTitle: '关于 MyFBox',
    aboutMessage: 'MyFBox — 本地优先、设备端加密的个人财务管理工具。',
  },
}

export const ELECTRON_DICTIONARIES: Record<ElectronLanguage, ElectronI18nDictionary> = {
  'pt-BR': ptBR,
  'en-GB': enGB,
  es,
  'zh-CN': zhCN,
}

export function normalizeElectronLanguage(raw?: string | null): ElectronLanguage {
  if (!raw || typeof raw !== 'string') return DEFAULT_ELECTRON_LANGUAGE
  const cleaned = raw.trim().toLowerCase().replace(/_/g, '-')
  if (!cleaned) return DEFAULT_ELECTRON_LANGUAGE
  if (cleaned === 'pt' || cleaned.startsWith('pt-')) return 'pt-BR'
  if (cleaned === 'en' || cleaned.startsWith('en-')) return 'en-GB'
  if (cleaned === 'es' || cleaned.startsWith('es-')) return 'es'
  if (cleaned === 'zh' || cleaned.startsWith('zh-')) return 'zh-CN'
  return DEFAULT_ELECTRON_LANGUAGE
}

export function getElectronDictionary(language: ElectronLanguage): ElectronI18nDictionary {
  return ELECTRON_DICTIONARIES[language] ?? ELECTRON_DICTIONARIES[DEFAULT_ELECTRON_LANGUAGE]
}
