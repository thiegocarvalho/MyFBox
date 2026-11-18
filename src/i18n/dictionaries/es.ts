import { analyticsMessages } from '../modules/analytics';
import { appShellMessages } from '../modules/appShell';
import { domainMcpMessages } from '../modules/domainMcp';
import { managementMessages } from '../modules/management';
import { transactionsMessages } from '../modules/transactions';
import type { TranslationDictionary } from './pt-BR';

export const es: TranslationDictionary = {
  'language.label': 'Idioma',
  'language.selectAria': 'Seleccionar idioma de la interfaz',
  'language.currentLabel': 'Idioma activo: {{language}}',
  'language.settingsTitle': 'Idioma de la interfaz',
  'language.settingsDesc': 'Elige el idioma usado en menús, fechas, números y categorías.',
  'language.savedToast': 'Idioma cambiado a {{language}}',
  ...appShellMessages.es,
  ...analyticsMessages.es,
  ...transactionsMessages.es,
  ...managementMessages.es,
  ...domainMcpMessages.es,
};
