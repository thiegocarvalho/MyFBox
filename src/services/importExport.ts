import { tDomainMcp } from '../i18n/modules/domainMcp';
import type {
  Account,
  Category,
  EncryptedVaultEnvelope,
  Transaction,
} from '../types/finance';

export function downloadEncryptedBackupFile(
  envelope: EncryptedVaultEnvelope,
  vaultName: string
): void {
  const safeName =
    vaultName
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-|-$/g, '') || tDomainMcp('domainMcp.importExport.defaultVaultSlug');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `myfbox-${safeName}-${dateStr}.myfbox.json`;
  const jsonString = JSON.stringify(envelope, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeCsvText(value: string): string {
  return /^\s*[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
}

export function buildTransactionsCSV(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  accounts: readonly Account[]
): string {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = [
    tDomainMcp('domainMcp.importExport.csvHeader.date'),
    tDomainMcp('domainMcp.importExport.csvHeader.description'),
    tDomainMcp('domainMcp.importExport.csvHeader.type'),
    tDomainMcp('domainMcp.importExport.csvHeader.status'),
    tDomainMcp('domainMcp.importExport.csvHeader.paidAt'),
    tDomainMcp('domainMcp.importExport.csvHeader.amount'),
    tDomainMcp('domainMcp.importExport.csvHeader.currency'),
    tDomainMcp('domainMcp.importExport.csvHeader.fixedRate'),
    tDomainMcp('domainMcp.importExport.csvHeader.category'),
    tDomainMcp('domainMcp.importExport.csvHeader.account'),
    tDomainMcp('domainMcp.importExport.csvHeader.notes'),
  ];

  const incomeLabel = tDomainMcp('domainMcp.importExport.csvTypeIncome');
  const expenseLabel = tDomainMcp('domainMcp.importExport.csvTypeExpense');
  const paidLabel = tDomainMcp('domainMcp.importExport.csvStatusPaid');
  const pendingLabel = tDomainMcp('domainMcp.importExport.csvStatusPending');
  const noCategoryLabel = tDomainMcp('domainMcp.importExport.csvNoCategory');
  const defaultAccountLabel = tDomainMcp('domainMcp.importExport.csvDefaultAccount');

  const rows = transactions.map((tx) => {
    const tipo = tx.type === 'income' ? incomeLabel : expenseLabel;
    const status = tx.status === 'paid' ? paidLabel : pendingLabel;
    const valor = (tx.type === 'expense' ? -tx.amount : tx.amount).toFixed(2);
    const moeda = tx.currency || 'BRL';
    const cotacao = tx.exchangeRate ? tx.exchangeRate.toFixed(4) : '';
    const cat = catMap.get(tx.categoryId) || noCategoryLabel;
    const acc = accMap.get(tx.accountId) || defaultAccountLabel;
    const notes = tx.notes || '';

    return [
      tx.date,
      safeCsvText(tx.description),
      tipo,
      status,
      tx.paidAt ?? '',
      valor,
      moeda,
      cotacao,
      safeCsvText(cat),
      safeCsvText(acc),
      safeCsvText(notes),
    ]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

export function exportTransactionsToCSV(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  accounts: readonly Account[],
  filenamePrefix: string = tDomainMcp('domainMcp.importExport.csvFilenamePrefix')
): void {
  const csvContent = buildTransactionsCSV(transactions, categories, accounts);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
