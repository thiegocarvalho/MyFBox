import type {
  Account,
  Category,
  EncryptedVaultEnvelope,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types/finance';

export interface ParsedImportItem {
  tempId: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  categoryId: string;
  accountId: string;
  selected: boolean;
}

export function downloadEncryptedBackupFile(envelope: EncryptedVaultEnvelope, vaultName: string) {
  const safeName = vaultName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '') || 'cofre';
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

/**
 * Evita "CSV injection": planilhas executam células que começam com = + - @ (ou tab/CR)
 * como fórmula. Prefixar com apóstrofo faz o conteúdo ser tratado como texto.
 */
function safeCsvText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  filenamePrefix: string = 'myfbox-lancamentos'
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = [
    'Data',
    'Descricao',
    'Tipo',
    'Status',
    'Valor',
    'Moeda',
    'Cotacao_USD_BRL',
    'Categoria',
    'Conta',
    'Notas',
  ];
  const rows = transactions.map((tx) => {
    const tipo = tx.type === 'income' ? 'Receita' : 'Despesa';
    const status = tx.status === 'paid' ? 'Pago' : 'Pendente';
    const valor = (tx.type === 'expense' ? -tx.amount : tx.amount).toFixed(2);
    const moeda = tx.currency || 'BRL';
    const cotacao = tx.exchangeRate ? tx.exchangeRate.toFixed(4) : '';
    const cat = catMap.get(tx.categoryId) || 'Sem Categoria';
    const acc = accMap.get(tx.accountId) || 'Conta Padrão';
    const notes = tx.notes || '';

    // Campos de texto livre passam por safeCsvText (evita fórmulas no Excel/Calc);
    // valores numéricos (ex.: "-142.80") ficam como estão.
    return [
      tx.date,
      safeCsvText(tx.description),
      tipo,
      status,
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

  // Add UTF-8 BOM for Excel / Calc compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
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

function guessCategoryForDescription(
  description: string,
  type: TransactionType,
  categories: Category[]
): string {
  const lower = description.toLowerCase();
  const candidates = categories.filter((c) => c.type === type);
  if (candidates.length === 0) return categories[0]?.id || '';

  if (type === 'income') {
    if (lower.includes('salário') || lower.includes('salario') || lower.includes('folha') || lower.includes('pagamento')) {
      return candidates.find((c) => c.name.toLowerCase().includes('salário'))?.id || candidates[0].id;
    }
    if (lower.includes('cdb') || lower.includes('dividendo') || lower.includes('rendimento') || lower.includes('juros')) {
      return candidates.find((c) => c.name.toLowerCase().includes('rendimento'))?.id || candidates[0].id;
    }
    return candidates[0].id;
  }

  // Expense matching
  if (
    lower.includes('mercado') ||
    lower.includes('atacad') ||
    lower.includes('assai') ||
    lower.includes('carrefour') ||
    lower.includes('pao de acucar') ||
    lower.includes('hortifruti') ||
    lower.includes('feira')
  ) {
    return candidates.find((c) => c.name.toLowerCase().includes('mercado'))?.id || candidates[0].id;
  }
  if (
    lower.includes('ifood') ||
    lower.includes('restaurante') ||
    lower.includes('padaria') ||
    lower.includes('cafe') ||
    lower.includes('café') ||
    lower.includes('lanch') ||
    lower.includes('burger') ||
    lower.includes('pizza')
  ) {
    return candidates.find((c) => c.name.toLowerCase().includes('restaurante'))?.id || candidates[0].id;
  }
  if (
    lower.includes('uber') ||
    lower.includes('99app') ||
    lower.includes('posto') ||
    lower.includes('combustivel') ||
    lower.includes('gasolina') ||
    lower.includes('estacionamento') ||
    lower.includes('pedagio')
  ) {
    return candidates.find((c) => c.name.toLowerCase().includes('transporte'))?.id || candidates[0].id;
  }
  if (
    lower.includes('aluguel') ||
    lower.includes('condominio') ||
    lower.includes('condomínio') ||
    lower.includes('energia') ||
    lower.includes('enel') ||
    lower.includes('sabesp') ||
    lower.includes('iptu')
  ) {
    return candidates.find((c) => c.name.toLowerCase().includes('moradia'))?.id || candidates[0].id;
  }
  if (
    lower.includes('farmacia') ||
    lower.includes('farmácia') ||
    lower.includes('drogaria') ||
    lower.includes('drogasil') ||
    lower.includes('medico') ||
    lower.includes('médico') ||
    lower.includes('hospital') ||
    lower.includes('saude')
  ) {
    return candidates.find((c) => c.name.toLowerCase().includes('saúde'))?.id || candidates[0].id;
  }
  if (
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('aws') ||
    lower.includes('internet') ||
    lower.includes('vivo') ||
    lower.includes('claro') ||
    lower.includes('assinatura')
  ) {
    return candidates.find((c) => c.name.toLowerCase().includes('assinatura'))?.id || candidates[0].id;
  }

  return candidates[0].id;
}

function normalizeDateString(raw: string): string {
  const clean = raw.trim().replace(/^["']|["']$/g, '');
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.slice(0, 10);
  }
  // DD/MM/YYYY
  const brMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  // YYYYMMDD (OFX style)
  const ofxMatch = clean.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofxMatch) {
    return `${ofxMatch[1]}-${ofxMatch[2]}-${ofxMatch[3]}`;
  }
  return new Date().toISOString().slice(0, 10);
}

export function parseOFXContent(
  content: string,
  categories: Category[],
  defaultAccountId: string
): ParsedImportItem[] {
  const items: ParsedImportItem[] = [];
  const blocks = content.split(/<STMTTRN>/i).slice(1);

  blocks.forEach((block, index) => {
    const trnAmtMatch = block.match(/<TRNAMT>([^<\r\n]+)/i);
    const dtPostedMatch = block.match(/<DTPOSTED>([^<\r\n]+)/i);
    const memoMatch = block.match(/<MEMO>([^<\r\n]+)/i);
    const nameMatch = block.match(/<NAME>([^<\r\n]+)/i);

    if (!trnAmtMatch) return;
    const rawAmt = trnAmtMatch[1].trim().replace(',', '.');
    const numericAmount = parseFloat(rawAmt);
    if (Number.isNaN(numericAmount) || numericAmount === 0) return;

    const type: TransactionType = numericAmount >= 0 ? 'income' : 'expense';
    const amount = Math.abs(numericAmount);
    const date = dtPostedMatch ? normalizeDateString(dtPostedMatch[1]) : new Date().toISOString().slice(0, 10);
    const description = (memoMatch?.[1] || nameMatch?.[1] || `Lançamento OFX #${index + 1}`).trim();
    const categoryId = guessCategoryForDescription(description, type, categories);

    items.push({
      tempId: `ofx_${Date.now()}_${index}`,
      date,
      description,
      amount,
      type,
      status: 'paid',
      categoryId,
      accountId: defaultAccountId,
      selected: true,
    });
  });

  return items;
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSVContent(
  content: string,
  categories: Category[],
  defaultAccountId: string
): ParsedImportItem[] {
  const cleanContent = content.replace(/^\uFEFF/, '').trim();
  const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') && !headerLine.includes(',') ? ';' : ',';
  const headers = splitCSVLine(headerLine, delimiter).map((h) =>
    h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  const dateIdx = headers.findIndex((h) => h.includes('data') || h.includes('date'));
  const descIdx = headers.findIndex(
    (h) => h.includes('desc') || h.includes('titulo') || h.includes('title') || h.includes('historico')
  );
  const valIdx = headers.findIndex((h) => h.includes('valor') || h.includes('amount') || h.includes('value'));
  const typeIdx = headers.findIndex((h) => h.includes('tipo') || h.includes('type'));
  const statusIdx = headers.findIndex((h) => h.includes('status') || h.includes('situacao'));

  const items: ParsedImportItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delimiter);
    if (cols.length < 2) continue;

    const rawDate = cols[dateIdx >= 0 ? dateIdx : 0] || '';
    const rawDesc = cols[descIdx >= 0 ? descIdx : 1] || `Item CSV #${i}`;
    const rawVal = cols[valIdx >= 0 ? valIdx : cols.length - 1] || '0';

    // Handle Brazilian number format (1.234,56) or standard (-1234.56)
    let normalizedVal = rawVal.replace(/[R$\s]/g, '');
    if (normalizedVal.includes(',') && normalizedVal.includes('.')) {
      normalizedVal = normalizedVal.replace(/\./g, '').replace(',', '.');
    } else if (normalizedVal.includes(',')) {
      normalizedVal = normalizedVal.replace(',', '.');
    }

    const numericVal = parseFloat(normalizedVal);
    if (Number.isNaN(numericVal) || numericVal === 0) continue;

    let type: TransactionType = numericVal >= 0 ? 'income' : 'expense';
    if (typeIdx >= 0 && cols[typeIdx]) {
      const tLower = cols[typeIdx].toLowerCase();
      if (tLower.includes('desp') || tLower.includes('saida') || tLower.includes('expense')) {
        type = 'expense';
      } else if (tLower.includes('rec') || tLower.includes('entrada') || tLower.includes('income')) {
        type = 'income';
      }
    }

    let status: TransactionStatus = 'paid';
    if (statusIdx >= 0 && cols[statusIdx]) {
      const sLower = cols[statusIdx].toLowerCase();
      if (sLower.includes('pend') || sLower.includes('aberto')) {
        status = 'pending';
      }
    }

    const date = normalizeDateString(rawDate);
    const amount = Math.abs(numericVal);
    const description = rawDesc.trim() || `Lançamento #${i}`;
    const categoryId = guessCategoryForDescription(description, type, categories);

    items.push({
      tempId: `csv_${Date.now()}_${i}`,
      date,
      description,
      amount,
      type,
      status,
      categoryId,
      accountId: defaultAccountId,
      selected: true,
    });
  }

  return items;
}
