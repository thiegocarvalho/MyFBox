import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  ListTree,
  Sparkles,
  ShieldCheck,
  Search,
  Bot,
  TrendingUp,
  Wallet,
  HelpCircle,
} from 'lucide-react';
import { buildMcpSetupInfo } from '../utils/mcpConfig';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n';

interface McpInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalTab = 'prompts' | 'capabilities' | 'install' | 'security';

interface PromptDefinition {
  id: string;
  categoryKey: TranslationKey;
  titleKey: TranslationKey;
  promptKey: TranslationKey;
  descKey: TranslationKey;
  toolsUsed: string[];
}

const PROMPT_DEFINITIONS: PromptDefinition[] = [
  {
    id: 'tx-simple',
    categoryKey: 'domainMcp.promptCat.transactions',
    titleKey: 'domainMcp.prompt.txSimple.title',
    promptKey: 'domainMcp.prompt.txSimple.prompt',
    descKey: 'domainMcp.prompt.txSimple.desc',
    toolsUsed: ['create_transaction'],
  },
  {
    id: 'tx-future',
    categoryKey: 'domainMcp.promptCat.transactions',
    titleKey: 'domainMcp.prompt.txFuture.title',
    promptKey: 'domainMcp.prompt.txFuture.prompt',
    descKey: 'domainMcp.prompt.txFuture.desc',
    toolsUsed: ['create_transaction'],
  },
  {
    id: 'tx-installments',
    categoryKey: 'domainMcp.promptCat.transactions',
    titleKey: 'domainMcp.prompt.txInstallments.title',
    promptKey: 'domainMcp.prompt.txInstallments.prompt',
    descKey: 'domainMcp.prompt.txInstallments.desc',
    toolsUsed: ['create_transaction'],
  },
  {
    id: 'tx-foreign-currency',
    categoryKey: 'domainMcp.promptCat.transactions',
    titleKey: 'domainMcp.prompt.txForeignCurrency.title',
    promptKey: 'domainMcp.prompt.txForeignCurrency.prompt',
    descKey: 'domainMcp.prompt.txForeignCurrency.desc',
    toolsUsed: ['create_transaction'],
  },
  {
    id: 'acc-create-multi',
    categoryKey: 'domainMcp.promptCat.transactions',
    titleKey: 'domainMcp.prompt.accCreateMulti.title',
    promptKey: 'domainMcp.prompt.accCreateMulti.prompt',
    descKey: 'domainMcp.prompt.accCreateMulti.desc',
    toolsUsed: ['create_account'],
  },
  {
    id: 'acc-transfer',
    categoryKey: 'domainMcp.promptCat.transactions',
    titleKey: 'domainMcp.prompt.accTransfer.title',
    promptKey: 'domainMcp.prompt.accTransfer.prompt',
    descKey: 'domainMcp.prompt.accTransfer.desc',
    toolsUsed: ['transfer_between_accounts'],
  },
  {
    id: 'tx-settle',
    categoryKey: 'domainMcp.promptCat.settlements',
    titleKey: 'domainMcp.prompt.txSettle.title',
    promptKey: 'domainMcp.prompt.txSettle.prompt',
    descKey: 'domainMcp.prompt.txSettle.desc',
    toolsUsed: ['list_transactions', 'update_transaction'],
  },
  {
    id: 'tx-edit-val',
    categoryKey: 'domainMcp.promptCat.settlements',
    titleKey: 'domainMcp.prompt.txEditVal.title',
    promptKey: 'domainMcp.prompt.txEditVal.prompt',
    descKey: 'domainMcp.prompt.txEditVal.desc',
    toolsUsed: ['list_transactions', 'update_transaction'],
  },
  {
    id: 'tx-change-category',
    categoryKey: 'domainMcp.promptCat.settlements',
    titleKey: 'domainMcp.prompt.txChangeCat.title',
    promptKey: 'domainMcp.prompt.txChangeCat.prompt',
    descKey: 'domainMcp.prompt.txChangeCat.desc',
    toolsUsed: ['list_categories', 'update_transaction'],
  },
  {
    id: 'rate-set-usd',
    categoryKey: 'domainMcp.promptCat.rates',
    titleKey: 'domainMcp.prompt.rateSetUsd.title',
    promptKey: 'domainMcp.prompt.rateSetUsd.prompt',
    descKey: 'domainMcp.prompt.rateSetUsd.desc',
    toolsUsed: ['set_exchange_rate'],
  },
  {
    id: 'rate-set-any',
    categoryKey: 'domainMcp.promptCat.rates',
    titleKey: 'domainMcp.prompt.rateSetAny.title',
    promptKey: 'domainMcp.prompt.rateSetAny.prompt',
    descKey: 'domainMcp.prompt.rateSetAny.desc',
    toolsUsed: ['set_exchange_rate', 'list_exchange_rates'],
  },
  {
    id: 'rate-list',
    categoryKey: 'domainMcp.promptCat.rates',
    titleKey: 'domainMcp.prompt.rateList.title',
    promptKey: 'domainMcp.prompt.rateList.prompt',
    descKey: 'domainMcp.prompt.rateList.desc',
    toolsUsed: ['list_exchange_rates'],
  },
  {
    id: 'cat-create-budget',
    categoryKey: 'domainMcp.promptCat.budgets',
    titleKey: 'domainMcp.prompt.catCreateBudget.title',
    promptKey: 'domainMcp.prompt.catCreateBudget.prompt',
    descKey: 'domainMcp.prompt.catCreateBudget.desc',
    toolsUsed: ['create_category', 'set_category_budget'],
  },
  {
    id: 'cat-adjust-budget',
    categoryKey: 'domainMcp.promptCat.budgets',
    titleKey: 'domainMcp.prompt.catAdjustBudget.title',
    promptKey: 'domainMcp.prompt.catAdjustBudget.prompt',
    descKey: 'domainMcp.prompt.catAdjustBudget.desc',
    toolsUsed: ['list_categories', 'set_category_budget'],
  },
  {
    id: 'query-overview',
    categoryKey: 'domainMcp.promptCat.queries',
    titleKey: 'domainMcp.prompt.queryOverview.title',
    promptKey: 'domainMcp.prompt.queryOverview.prompt',
    descKey: 'domainMcp.prompt.queryOverview.desc',
    toolsUsed: ['get_overview'],
  },
  {
    id: 'query-category-spending',
    categoryKey: 'domainMcp.promptCat.queries',
    titleKey: 'domainMcp.prompt.queryCatSpending.title',
    promptKey: 'domainMcp.prompt.queryCatSpending.prompt',
    descKey: 'domainMcp.prompt.queryCatSpending.desc',
    toolsUsed: ['list_transactions', 'list_categories'],
  },
  {
    id: 'query-future-pending',
    categoryKey: 'domainMcp.promptCat.queries',
    titleKey: 'domainMcp.prompt.queryAccounts.title',
    promptKey: 'domainMcp.prompt.queryAccounts.prompt',
    descKey: 'domainMcp.prompt.queryAccounts.desc',
    toolsUsed: ['list_transactions'],
  },
  {
    id: 'compare-recent',
    categoryKey: 'domainMcp.promptCat.comparisons',
    titleKey: 'domainMcp.prompt.compareMonths.title',
    promptKey: 'domainMcp.prompt.compareMonths.prompt',
    descKey: 'domainMcp.prompt.compareMonths.desc',
    toolsUsed: ['get_month_comparison'],
  },
  {
    id: 'insight-monthly',
    categoryKey: 'domainMcp.promptCat.comparisons',
    titleKey: 'domainMcp.prompt.insightGenerate.title',
    promptKey: 'domainMcp.prompt.insightGenerate.prompt',
    descKey: 'domainMcp.prompt.insightGenerate.desc',
    toolsUsed: ['get_month_comparison', 'save_insight'],
  },
  {
    id: 'backup-snapshot',
    categoryKey: 'domainMcp.promptCat.backups',
    titleKey: 'domainMcp.prompt.backupExport.title',
    promptKey: 'domainMcp.prompt.backupExport.prompt',
    descKey: 'domainMcp.prompt.backupExport.desc',
    toolsUsed: ['export_backup'],
  },
];

interface ToolDefinition {
  name: string;
  categoryKey: TranslationKey;
  descKey: TranslationKey;
  argsKey?: TranslationKey;
  defaultArgs?: string;
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'connect_app',
    categoryKey: 'domainMcp.toolCat.connection',
    descKey: 'domainMcp.tool.connectApp.desc',
    defaultArgs: '—',
  },
  {
    name: 'get_overview',
    categoryKey: 'domainMcp.toolCat.overview',
    descKey: 'domainMcp.tool.getOverview.desc',
    argsKey: 'domainMcp.tool.getOverview.args',
  },
  {
    name: 'list_accounts',
    categoryKey: 'domainMcp.toolCat.accounts',
    descKey: 'domainMcp.tool.listAccounts.desc',
    defaultArgs: '—',
  },
  {
    name: 'create_account',
    categoryKey: 'domainMcp.toolCat.accounts',
    descKey: 'domainMcp.tool.createAccount.desc',
    defaultArgs: 'name, type?, currency?, initialBalance?, institution?, color?',
  },
  {
    name: 'transfer_between_accounts',
    categoryKey: 'domainMcp.toolCat.accounts',
    descKey: 'domainMcp.tool.transferBetweenAccounts.desc',
    defaultArgs: 'fromAccountName?, toAccountName?, amount, date?, description?',
  },
  {
    name: 'list_categories',
    categoryKey: 'domainMcp.toolCat.categories',
    descKey: 'domainMcp.tool.listCategories.desc',
    defaultArgs: 'type? ("income" | "expense")',
  },
  {
    name: 'create_category',
    categoryKey: 'domainMcp.toolCat.categories',
    descKey: 'domainMcp.tool.createCategory.desc',
    defaultArgs: 'name, type, monthlyBudget?, color?',
  },
  {
    name: 'set_category_budget',
    categoryKey: 'domainMcp.toolCat.budgets',
    descKey: 'domainMcp.tool.setCategoryBudget.desc',
    argsKey: 'domainMcp.tool.setCategoryBudget.args',
  },
  {
    name: 'list_transactions',
    categoryKey: 'domainMcp.toolCat.transactions',
    descKey: 'domainMcp.tool.listTransactions.desc',
    defaultArgs: 'month?, type?, status?, categoryId?, accountId?, search?, limit?',
  },
  {
    name: 'create_transaction',
    categoryKey: 'domainMcp.toolCat.transactions',
    descKey: 'domainMcp.tool.createTransaction.desc',
    defaultArgs:
      'description, amount, type, date?, categoryName?, accountName?, status?, currency?, repeatMonths?',
  },
  {
    name: 'update_transaction',
    categoryKey: 'domainMcp.toolCat.transactions',
    descKey: 'domainMcp.tool.updateTransaction.desc',
    argsKey: 'domainMcp.tool.updateTransaction.args',
  },
  {
    name: 'delete_transaction',
    categoryKey: 'domainMcp.toolCat.transactions',
    descKey: 'domainMcp.tool.deleteTransaction.desc',
    defaultArgs: 'id',
  },
  {
    name: 'set_exchange_rate',
    categoryKey: 'domainMcp.toolCat.offlineFx',
    descKey: 'domainMcp.tool.setExchangeRate.desc',
    argsKey: 'domainMcp.tool.setExchangeRate.args',
  },
  {
    name: 'list_exchange_rates',
    categoryKey: 'domainMcp.toolCat.offlineFx',
    descKey: 'domainMcp.tool.listExchangeRates.desc',
    defaultArgs: '—',
  },
  {
    name: 'delete_exchange_rate',
    categoryKey: 'domainMcp.toolCat.offlineFx',
    descKey: 'domainMcp.tool.deleteExchangeRate.desc',
    argsKey: 'domainMcp.tool.deleteExchangeRate.args',
  },
  {
    name: 'get_month_comparison',
    categoryKey: 'domainMcp.toolCat.comparisons',
    descKey: 'domainMcp.tool.getMonthComparison.desc',
    argsKey: 'domainMcp.tool.getMonthComparison.args',
  },
  {
    name: 'save_insight',
    categoryKey: 'domainMcp.toolCat.aiInsights',
    descKey: 'domainMcp.tool.saveInsight.desc',
    defaultArgs: 'month, title, body, highlights?',
  },
  {
    name: 'list_insights',
    categoryKey: 'domainMcp.toolCat.aiInsights',
    descKey: 'domainMcp.tool.listInsights.desc',
    defaultArgs: 'month?',
  },
  {
    name: 'delete_insight',
    categoryKey: 'domainMcp.toolCat.aiInsights',
    descKey: 'domainMcp.tool.deleteInsight.desc',
    defaultArgs: 'month',
  },
  {
    name: 'export_backup',
    categoryKey: 'domainMcp.toolCat.backups',
    descKey: 'domainMcp.tool.exportBackup.desc',
    defaultArgs: '—',
  },
];

export const McpInstructionsModal: React.FC<McpInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ModalTab>('prompts');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [desktopMcpPath, setDesktopMcpPath] = useState<string | null>(null);

  useEffect(() => {
    const mcpApi = window.myfboxDesktop?.mcp;
    if (!mcpApi) return;
    let alive = true;
    mcpApi
      .info()
      .then((info) => {
        if (alive && info?.serverPath) setDesktopMcpPath(info.serverPath);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const mcpSetup = buildMcpSetupInfo({ desktopMcpPath });
  const { mcpConfigJson } = mcpSetup;
  const [searchQuery, setSearchQuery] = useState('');
  const [promptCategoryFilter, setPromptCategoryFilter] = useState<string>('todos');

  const promptItems = useMemo(
    () =>
      PROMPT_DEFINITIONS.map((p) => ({
        id: p.id,
        category: t(p.categoryKey),
        rawCategoryKey: p.categoryKey,
        title: t(p.titleKey),
        prompt: t(p.promptKey),
        description: t(p.descKey),
        toolsUsed: p.toolsUsed,
      })),
    [t]
  );

  const mcpToolsDocs = useMemo(
    () =>
      TOOL_DEFINITIONS.map((d) => ({
        name: d.name,
        category: t(d.categoryKey),
        description: t(d.descKey),
        args: d.argsKey ? t(d.argsKey) : (d.defaultArgs ?? '—'),
      })),
    [t]
  );

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const categories = useMemo(() => {
    const rawKeys = Array.from(new Set(PROMPT_DEFINITIONS.map((p) => p.categoryKey)));
    return ['todos', ...rawKeys];
  }, []);

  const filteredPrompts = useMemo(() => {
    return promptItems.filter((item) => {
      const matchesCategory =
        promptCategoryFilter === 'todos' || item.rawCategoryKey === promptCategoryFilter;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;
      const matchesQuery =
        item.title.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.toolsUsed.some((tu) => tu.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [promptItems, promptCategoryFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="modal-card mcp-instructions-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-instructions-title"
      >
        <header className="modal-header mcp-modal-header">
          <div className="mcp-modal-title-wrap">
            <div className="mcp-badge">
              <Bot size={14} />
              <span>{t('domainMcp.modal.badge')}</span>
            </div>
            <h2 id="mcp-instructions-title">{t('domainMcp.modal.title')}</h2>
            <p>{t('domainMcp.modal.subtitle')}</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={t('domainMcp.modal.closeAria')}
          >
            <X size={20} />
          </button>
        </header>

        <div className="mcp-modal-nav">
          <button
            type="button"
            className={`mcp-modal-tab-btn ${activeTab === 'prompts' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompts')}
          >
            <Sparkles size={13} />
            <span>{t('domainMcp.modal.tabPrompts', { count: promptItems.length })}</span>
          </button>

          <button
            type="button"
            className={`mcp-modal-tab-btn ${activeTab === 'capabilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('capabilities')}
          >
            <ListTree size={13} />
            <span>{t('domainMcp.modal.tabCapabilities', { count: mcpToolsDocs.length })}</span>
          </button>

          <button
            type="button"
            className={`mcp-modal-tab-btn ${activeTab === 'install' ? 'active' : ''}`}
            onClick={() => setActiveTab('install')}
          >
            <Terminal size={13} />
            <span>{t('domainMcp.modal.tabInstall')}</span>
          </button>

          <button
            type="button"
            className={`mcp-modal-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <ShieldCheck size={13} />
            <span>{t('domainMcp.modal.tabSecurity')}</span>
          </button>
        </div>

        <div className="modal-body mcp-modal-body">
          {activeTab === 'prompts' && (
            <div className="mcp-tab-pane">
              <div className="mcp-prompts-top">
                <div className="mcp-search-box">
                  <Search size={15} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('domainMcp.modal.searchPlaceholder')}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="mcp-clear-search"
                      onClick={() => setSearchQuery('')}
                      aria-label={t('domainMcp.modal.clearSearchAria')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="mcp-category-pills">
                  {categories.map((catKey) => (
                    <button
                      key={catKey}
                      type="button"
                      className={`mcp-cat-pill ${promptCategoryFilter === catKey ? 'active' : ''}`}
                      onClick={() => setPromptCategoryFilter(catKey)}
                    >
                      {catKey === 'todos' ? t('domainMcp.modal.filterAll') : t(catKey as TranslationKey)}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPrompts.length === 0 ? (
                <div className="mcp-empty-state">
                  <Search size={24} />
                  <p>{t('domainMcp.modal.emptyPrompts')}</p>
                </div>
              ) : (
                <div className="mcp-prompts-grid">
                  {filteredPrompts.map((item) => {
                    const isCopied = copiedId === item.id;
                    return (
                      <div key={item.id} className="mcp-prompt-card">
                        <div className="mcp-prompt-card-header">
                          <span className="mcp-prompt-category">{item.category}</span>
                          <div className="mcp-prompt-tools">
                            {item.toolsUsed.map((tu) => (
                              <code key={tu}>{tu}</code>
                            ))}
                          </div>
                        </div>

                        <h4 className="mcp-prompt-title">{item.title}</h4>
                        <p className="mcp-prompt-desc">{item.description}</p>

                        <div className="mcp-prompt-box">
                          <p className="mcp-prompt-text">“{item.prompt}”</p>
                          <button
                            type="button"
                            className={`btn-secondary btn-sm mcp-copy-btn ${isCopied ? 'copied' : ''}`}
                            onClick={() => handleCopy(item.id, item.prompt)}
                            title={t('domainMcp.modal.copyPromptTitle')}
                          >
                            {isCopied ? (
                              <>
                                <Check size={13} /> {t('domainMcp.modal.copied')}
                              </>
                            ) : (
                              <>
                                <Copy size={13} /> {t('domainMcp.modal.copyPrompt')}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'capabilities' && (
            <div className="mcp-tab-pane">
              <div className="mcp-intro-callout">
                <ListTree size={18} />
                <div>
                  <strong>{t('domainMcp.modal.capCalloutTitle')}</strong>
                  <p>{t('domainMcp.modal.capCalloutBody')}</p>
                </div>
              </div>

              <div className="mcp-tools-table-wrap">
                <table className="mcp-tools-table">
                  <thead>
                    <tr>
                      <th>{t('domainMcp.modal.tableTool')}</th>
                      <th>{t('domainMcp.modal.tableCategory')}</th>
                      <th>{t('domainMcp.modal.tableWhat')}</th>
                      <th>{t('domainMcp.modal.tableParams')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mcpToolsDocs.map((td) => (
                      <tr key={td.name}>
                        <td>
                          <code className="mcp-tool-code">{td.name}</code>
                        </td>
                        <td>
                          <span className="mcp-cat-tag">{td.category}</span>
                        </td>
                        <td className="mcp-tool-desc">{td.description}</td>
                        <td className="mcp-tool-args">
                          <code>{td.args}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mcp-skills-summary">
                <h4 className="mcp-section-subtitle">{t('domainMcp.modal.skillsSubtitle')}</h4>
                <div className="mcp-skills-grid">
                  <div className="mcp-skill-box">
                    <div className="mcp-skill-header">
                      <Wallet size={16} />
                      <strong>{t('domainMcp.modal.skillMyfboxTitle')}</strong>
                    </div>
                    <p>{t('domainMcp.modal.skillMyfboxDesc')}</p>
                  </div>

                  <div className="mcp-skill-box">
                    <div className="mcp-skill-header">
                      <TrendingUp size={16} />
                      <strong>{t('domainMcp.modal.skillInsightsTitle')}</strong>
                    </div>
                    <p>{t('domainMcp.modal.skillInsightsDesc')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="mcp-tab-pane">
              <div className="mcp-guide-step">
                <div className="mcp-step-num">1</div>
                <div className="mcp-step-content">
                  <h4>{t('domainMcp.modal.installStep1Title')}</h4>
                  <p>
                    {mcpSetup.environment === 'desktop'
                      ? t('domainMcp.modal.installStep1Desktop')
                      : mcpSetup.environment === 'web-remote'
                        ? t('domainMcp.modal.installStep1Web')
                        : t('domainMcp.modal.installStep1Local')}
                  </p>
                  <div className="mcp-code-block-wrap" style={{ marginBottom: '0.75rem' }}>
                    <div className="mcp-code-header">
                      <span>{t('domainMcp.modal.installJsonHeader')}</span>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => handleCopy('manual-mcp-code', mcpConfigJson)}
                      >
                        {copiedId === 'manual-mcp-code' ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === 'manual-mcp-code'
                          ? t('domainMcp.modal.copied')
                          : t('domainMcp.modal.copyJson')}
                      </button>
                    </div>
                    <pre className="mono">{mcpConfigJson}</pre>
                  </div>
                  <div className="mcp-code-block-wrap">
                    <div className="mcp-code-header">
                      <span>{t('domainMcp.modal.installCliHeader')}</span>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => handleCopy('cli-mcp-code', mcpSetup.claudeCliCommand)}
                      >
                        {copiedId === 'cli-mcp-code' ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === 'cli-mcp-code'
                          ? t('domainMcp.modal.copied')
                          : t('domainMcp.modal.copyCli')}
                      </button>
                    </div>
                    <pre className="mono">{mcpSetup.claudeCliCommand}</pre>
                  </div>
                </div>
              </div>

              <div className="mcp-guide-step">
                <div className="mcp-step-num">2</div>
                <div className="mcp-step-content">
                  <h4>{t('domainMcp.modal.installStep2Title')}</h4>
                  <p>
                    {t('domainMcp.modal.installStep2DescBefore')} <code>.mcp.json</code>{' '}
                    {t('domainMcp.modal.installStep2DescAfter')}
                  </p>
                  <div className="mcp-code-block-wrap">
                    <div className="mcp-code-header">
                      <span>{t('domainMcp.modal.installStep2Header')}</span>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() =>
                          handleCopy(
                            'mcp-json-code',
                            JSON.stringify(
                              {
                                mcpServers: {
                                  myfbox: {
                                    command: 'node',
                                    args: ['mcp/server.mjs'],
                                  },
                                },
                              },
                              null,
                              2
                            )
                          )
                        }
                      >
                        {copiedId === 'mcp-json-code' ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === 'mcp-json-code'
                          ? t('domainMcp.modal.copied')
                          : t('domainMcp.modal.copy')}
                      </button>
                    </div>
                    <pre className="mono">{`{
  "mcpServers": {
    "myfbox": {
      "command": "node",
      "args": ["mcp/server.mjs"]
    }
  }
}`}</pre>
                  </div>
                </div>
              </div>

              <div className="mcp-guide-step">
                <div className="mcp-step-num">3</div>
                <div className="mcp-step-content">
                  <h4>{t('domainMcp.modal.installStep3Title')}</h4>
                  <p>{t('domainMcp.modal.installStep3Desc')}</p>
                  <div className="mcp-prompt-box">
                    <p className="mcp-prompt-text">“{t('domainMcp.modal.pairPrompt')}”</p>
                    <button
                      type="button"
                      className={`btn-secondary btn-sm mcp-copy-btn ${copiedId === 'pair-prompt' ? 'copied' : ''}`}
                      onClick={() => handleCopy('pair-prompt', t('domainMcp.modal.pairPrompt'))}
                    >
                      {copiedId === 'pair-prompt' ? (
                        <>
                          <Check size={13} /> {t('domainMcp.modal.copied')}
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> {t('domainMcp.modal.copyPrompt')}
                        </>
                      )}
                    </button>
                  </div>
                  <ol className="mcp-guide-ol">
                    <li>
                      {t('domainMcp.modal.installStep3Li1Before')} <code>connect_app</code>{' '}
                      {t('domainMcp.modal.installStep3Li1After')}
                    </li>
                    <li>{t('domainMcp.modal.installStep3Li2')}</li>
                    <li>
                      {t('domainMcp.modal.installStep3Li3Before')}{' '}
                      <strong>{t('domainMcp.modal.installStep3Li3Strong')}</strong>.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="mcp-tab-pane">
              <div className="mcp-security-banner">
                <ShieldCheck size={28} />
                <div>
                  <h3>{t('domainMcp.modal.securityBannerTitle')}</h3>
                  <p>{t('domainMcp.modal.securityBannerDesc')}</p>
                </div>
              </div>

              <div className="mcp-security-points">
                <div className="mcp-sec-card">
                  <div className="mcp-sec-icon">🔒</div>
                  <div>
                    <strong>{t('domainMcp.modal.secCard1Title')}</strong>
                    <p>
                      {t('domainMcp.modal.secCard1BodyBefore')} <code>127.0.0.1</code>
                      {t('domainMcp.modal.secCard1BodyAfter')}
                    </p>
                  </div>
                </div>

                <div className="mcp-sec-card">
                  <div className="mcp-sec-icon">⚡</div>
                  <div>
                    <strong>{t('domainMcp.modal.secCard2Title')}</strong>
                    <p>{t('domainMcp.modal.secCard2Body')}</p>
                  </div>
                </div>

                <div className="mcp-sec-card">
                  <div className="mcp-sec-icon">🛡️</div>
                  <div>
                    <strong>{t('domainMcp.modal.secCard3Title')}</strong>
                    <p>{t('domainMcp.modal.secCard3Body')}</p>
                  </div>
                </div>

                <div className="mcp-sec-card">
                  <div className="mcp-sec-icon">👁️</div>
                  <div>
                    <strong>{t('domainMcp.modal.secCard4Title')}</strong>
                    <p>{t('domainMcp.modal.secCard4Body')}</p>
                  </div>
                </div>

                <div className="mcp-sec-card">
                  <div className="mcp-sec-icon">🚫</div>
                  <div>
                    <strong>{t('domainMcp.modal.secCard5Title')}</strong>
                    <p>
                      {t('domainMcp.modal.secCard5Body1')}{' '}
                      <strong>{t('domainMcp.modal.secCard5BodyStrong')}</strong>{' '}
                      {t('domainMcp.modal.secCard5Body2')} <code>AES-256-GCM</code>
                      {t('domainMcp.modal.secCard5Body3')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="modal-footer mcp-modal-footer">
          <div className="mcp-footer-tip">
            <HelpCircle size={14} />
            <span>
              {t('domainMcp.modal.footerTipLabel')}{' '}
              <em>{t('domainMcp.modal.footerTipExample')}</em>.
            </span>
          </div>
          <button type="button" className="btn-primary" onClick={onClose}>
            {t('domainMcp.modal.footerClose')}
          </button>
        </footer>
      </div>
    </div>
  );
};
