import { analyticsMessages } from '../modules/analytics';
import { appShellMessages } from '../modules/appShell';
import { domainMcpMessages } from '../modules/domainMcp';
import { managementMessages } from '../modules/management';
import { transactionsMessages } from '../modules/transactions';
import type { TranslationDictionary } from './pt-BR';

export const zhCN: TranslationDictionary = {
  'language.label': '语言',
  'language.selectAria': '选择界面语言',
  'language.currentLabel': '当前语言：{{language}}',
  'language.settingsTitle': '界面语言',
  'language.settingsDesc': '选择菜单、日期、数字和分类所使用的语言。',
  'language.savedToast': '语言已切换为 {{language}}',
  ...appShellMessages['zh-CN'],
  ...analyticsMessages['zh-CN'],
  ...transactionsMessages['zh-CN'],
  ...managementMessages['zh-CN'],
  ...domainMcpMessages['zh-CN'],
};
