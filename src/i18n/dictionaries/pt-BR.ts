import { analyticsMessages } from '../modules/analytics';
import { appShellMessages } from '../modules/appShell';
import { domainMcpMessages } from '../modules/domainMcp';
import { managementMessages } from '../modules/management';
import { transactionsMessages } from '../modules/transactions';

export const ptBR = {
  'language.label': 'Idioma',
  'language.selectAria': 'Selecionar idioma da interface',
  'language.currentLabel': 'Idioma ativo: {{language}}',
  'language.settingsTitle': 'Idioma da interface',
  'language.settingsDesc': 'Escolha o idioma usado nos menus, datas, números e categorias.',
  'language.savedToast': 'Idioma alterado para {{language}}',
  ...appShellMessages['pt-BR'],
  ...analyticsMessages['pt-BR'],
  ...transactionsMessages['pt-BR'],
  ...managementMessages['pt-BR'],
  ...domainMcpMessages['pt-BR'],
} as const;

export type TranslationKey = keyof typeof ptBR;
export type TranslationDictionary = Record<TranslationKey, string>;
