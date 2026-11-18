import { analyticsMessages } from '../modules/analytics';
import { appShellMessages } from '../modules/appShell';
import { domainMcpMessages } from '../modules/domainMcp';
import { managementMessages } from '../modules/management';
import { transactionsMessages } from '../modules/transactions';
import type { TranslationDictionary } from './pt-BR';

export const enGB: TranslationDictionary = {
  'language.label': 'Language',
  'language.selectAria': 'Select interface language',
  'language.currentLabel': 'Active language: {{language}}',
  'language.settingsTitle': 'Interface language',
  'language.settingsDesc': 'Choose the language used for menus, dates, numbers, and categories.',
  'language.savedToast': 'Language changed to {{language}}',
  ...appShellMessages['en-GB'],
  ...analyticsMessages['en-GB'],
  ...transactionsMessages['en-GB'],
  ...managementMessages['en-GB'],
  ...domainMcpMessages['en-GB'],
};
