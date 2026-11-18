import React, { useEffect, useState } from 'react';
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

interface McpInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalTab = 'prompts' | 'capabilities' | 'install' | 'security';

interface PromptItem {
  id: string;
  category: 'Lançamentos' | 'Baixas' | 'Cotações' | 'Metas' | 'Consultas' | 'Comparativos' | 'Backups';
  title: string;
  prompt: string;
  description: string;
  toolsUsed: string[];
}

const PROMPT_ITEMS: PromptItem[] = [
  {
    id: 'tx-simple',
    category: 'Lançamentos',
    title: 'Registrar despesa do dia a dia',
    prompt: 'Registre uma despesa de R$ 42,00 no almoço de hoje na categoria Alimentação.',
    description: 'Lança um gasto pago na data atual. Se omitir a categoria, o app sugere automaticamente pelo histórico e descrição.',
    toolsUsed: ['create_transaction'],
  },
  {
    id: 'tx-future',
    category: 'Lançamentos',
    title: 'Agendar conta a pagar no futuro',
    prompt: 'Agende uma despesa de R$ 2.200 do aluguel para o dia 10 do mês que vem na categoria Moradia.',
    description: 'Datas futuras ficam como pendentes automaticamente e entram na previsão financeira do mês correspondente.',
    toolsUsed: ['create_transaction'],
  },
  {
    id: 'tx-installments',
    category: 'Lançamentos',
    title: 'Lançar compra parcelada em N vezes',
    prompt: 'Lance a compra parcelada de um notebook no valor de R$ 3.600 em 10 parcelas mensais começando hoje.',
    description: 'Cria as parcelas mensais calculando o valor unitário e marcando as futuras como pendentes de forma vinculada.',
    toolsUsed: ['create_transaction'],
  },
  {
    id: 'tx-foreign-currency',
    category: 'Lançamentos',
    title: 'Receita ou despesa em moeda estrangeira (USD / EUR)',
    prompt: 'Recebi US$ 1.500 de uma consultoria internacional hoje. Registre como receita na minha conta em Dólar.',
    description: 'Registra o lançamento na moeda especificada com conversão pela taxa de câmbio offline fixada no cofre.',
    toolsUsed: ['create_transaction'],
  },
  {
    id: 'acc-create-multi',
    category: 'Lançamentos',
    title: 'Criar conta em moeda estrangeira',
    prompt: 'Crie uma conta corrente em Euro chamada "Wise Europa" com saldo inicial de 500 EUR.',
    description: 'Adiciona uma nova conta em qualquer uma das 13 moedas globais suportadas no cofre.',
    toolsUsed: ['create_account'],
  },
  {
    id: 'acc-transfer',
    category: 'Lançamentos',
    title: 'Transferir valores entre contas (mesma ou outra moeda)',
    prompt: 'Transfira R$ 1.200 da Conta Principal para a Reserva de Emergência hoje.',
    description: 'Lança automaticamente o par de saída e entrada. Entre moedas diferentes, converte usando a cotação offline do cofre.',
    toolsUsed: ['transfer_between_accounts'],
  },
  {
    id: 'tx-settle',
    category: 'Baixas',
    title: 'Dar baixa (quitar) lançamento pendente',
    prompt: 'Localize a conta de luz pendente deste mês e dê baixa marcando como paga com data de hoje.',
    description: 'Pesquisa o lançamento pendente, marca como pago e registra a data do pagamento sem alterar a competência original.',
    toolsUsed: ['list_transactions', 'update_transaction'],
  },
  {
    id: 'tx-edit-val',
    category: 'Baixas',
    title: 'Corrigir valor ou descrição de lançamento',
    prompt: 'Altere o valor do lançamento de ontem no Supermercado para R$ 185,50 e adicione a nota "Compras da semana".',
    description: 'Atualiza valores, datas, notas ou descrições de qualquer lançamento já existente.',
    toolsUsed: ['list_transactions', 'update_transaction'],
  },
  {
    id: 'tx-change-category',
    category: 'Baixas',
    title: 'Mudar a categoria de um lançamento',
    prompt: 'Mude a categoria do lançamento "Farmácia São Paulo" para a categoria Saúde & Farmácia.',
    description: 'Reclassifica o gasto para a categoria desejada mantendo as regras e metas orçamentárias íntegras.',
    toolsUsed: ['list_categories', 'update_transaction'],
  },
  {
    id: 'rate-set-usd',
    category: 'Cotações',
    title: 'Definir cotação offline do Dólar (USD → BRL)',
    prompt: 'Defina a cotação do Dólar (USD para BRL) em 5,85 no meu cofre.',
    description: '100% offline soberano: atualiza a taxa sem acessar APIs externas e sincroniza as conversões em todo o app.',
    toolsUsed: ['set_exchange_rate'],
  },
  {
    id: 'rate-set-any',
    category: 'Cotações',
    title: 'Cadastrar cotação entre moedas populares (ex: EUR / BRL)',
    prompt: 'Cadastre a cotação do Euro: 1 EUR = 6,32 BRL, e me mostre a lista de cotações salvas.',
    description: 'Aceita qualquer par entre as 13 moedas globais suportadas (USD, EUR, GBP, etc.).',
    toolsUsed: ['set_exchange_rate', 'list_exchange_rates'],
  },
  {
    id: 'rate-list',
    category: 'Cotações',
    title: 'Listar cotações e moedas suportadas',
    prompt: 'Quais cotações de moedas estão cadastradas no meu cofre atualmente?',
    description: 'Retorna todos os pares salvos no cofre, data de atualização, fonte e a lista fechada de moedas válidas.',
    toolsUsed: ['list_exchange_rates'],
  },
  {
    id: 'cat-create-budget',
    category: 'Metas',
    title: 'Criar nova categoria com teto mensal',
    prompt: 'Crie uma nova categoria de despesa chamada "Pets" com teto mensal de R$ 350.',
    description: 'Cria a categoria no cofre e define o limite orçamentário mensal para acompanhamento nas metas.',
    toolsUsed: ['create_category', 'set_category_budget'],
  },
  {
    id: 'cat-adjust-budget',
    category: 'Metas',
    title: 'Ajustar ou remover meta de gastos',
    prompt: 'Aumente o teto mensal da categoria "Supermercado" para R$ 1.600.',
    description: 'Ajusta o limite de gastos mensal de despesas existentes. Use "null" ou "remover meta" para retirar o teto.',
    toolsUsed: ['list_categories', 'set_category_budget'],
  },
  {
    id: 'query-overview',
    category: 'Consultas',
    title: 'Resumo do mês e previsão de saldo',
    prompt: 'Como estão minhas finanças este mês? Me mostre o saldo confirmado, previsto e quanto ainda tenho a pagar.',
    description: 'Devolve a visão geral executiva do mês em BRL e USD, entradas, saídas e pendências a vencer.',
    toolsUsed: ['get_overview'],
  },
  {
    id: 'query-category-spending',
    category: 'Consultas',
    title: 'Consultar gastos por categoria',
    prompt: 'Quanto eu já gastei com Supermercado e Transporte neste mês?',
    description: 'Filtra os lançamentos do mês pela categoria solicitada e soma os valores realizados.',
    toolsUsed: ['list_categories', 'list_transactions'],
  },
  {
    id: 'query-accounts',
    category: 'Consultas',
    title: 'Saldos de todas as contas',
    prompt: 'Liste todas as minhas contas cadastradas com os saldos atuais e moedas.',
    description: 'Exibe cada conta bancária, carteira física ou conta internacional com saldos confirmados e projetados.',
    toolsUsed: ['list_accounts'],
  },
  {
    id: 'compare-months',
    category: 'Comparativos',
    title: 'Comparativo de gastos dos últimos meses',
    prompt: 'Compare meus gastos deste mês com os últimos 3 meses e me aponte as maiores variações.',
    description: 'Analisa as variações mês a mês por competência e indica as categorias que mais subiram ou desceram.',
    toolsUsed: ['get_month_comparison'],
  },
  {
    id: 'insight-generate',
    category: 'Comparativos',
    title: 'Gerar insight financeiro na aba Comparativos',
    prompt: 'Gere o insight financeiro para a aba Comparativos do mês atual com destaques e análise das maiores saídas.',
    description: 'A IA redige um insight objetivo com causas, riscos e próximos passos, gravando cifrado diretamente no cofre.',
    toolsUsed: ['get_month_comparison', 'save_insight'],
  },
  {
    id: 'backup-export',
    category: 'Backups',
    title: 'Gerar backup cifrado do cofre (.myfbox.json)',
    prompt: 'Gere um backup cifrado do meu cofre agora usando a ferramenta export_backup.',
    description: 'Exporta o envelope seguro (AES-256-GCM) para a pasta vaults/ do projeto e atualiza o carimbo de último backup.',
    toolsUsed: ['export_backup'],
  },
];

interface ToolDoc {
  name: string;
  category: string;
  description: string;
  args: string;
}

const MCP_TOOLS_DOCS: ToolDoc[] = [
  {
    name: 'connect_app',
    category: 'Conexão',
    description: 'Verifica o status da conexão com o app aberto ou gera o link de pareamento seguro.',
    args: '—',
  },
  {
    name: 'get_overview',
    category: 'Visão Geral',
    description: 'Resumo do mês: saldo confirmado e previsto (BRL/USD), total recebido e pago, pendências e cotações ativas.',
    args: 'month? (AAAA-MM)',
  },
  {
    name: 'list_accounts',
    category: 'Contas',
    description: 'Lista contas com moeda, saldo confirmado e previsto até o fim do mês.',
    args: '—',
  },
  {
    name: 'create_account',
    category: 'Contas',
    description: 'Cria uma conta bancária, reserva, investimento ou carteira em qualquer das 16 moedas suportadas.',
    args: 'name, type?, currency?, initialBalance?, institution?, color?',
  },
  {
    name: 'transfer_between_accounts',
    category: 'Contas',
    description: 'Transfere valores entre duas contas com conversão multimoeda automática.',
    args: 'fromAccountName?, toAccountName?, amount, date?, description?',
  },
  {
    name: 'list_categories',
    category: 'Categorias',
    description: 'Lista todas as categorias com tipo (income/expense), cor e meta mensal.',
    args: 'type? ("income" | "expense")',
  },
  {
    name: 'create_category',
    category: 'Categorias',
    description: 'Cria nova categoria no cofre (não duplica nome e tipo).',
    args: 'name, type, monthlyBudget?, color?',
  },
  {
    name: 'set_category_budget',
    category: 'Metas',
    description: 'Define, ajusta ou remove o teto de gastos mensal em reais de uma despesa.',
    args: 'categoryId, monthlyBudget (número ou null)',
  },
  {
    name: 'list_transactions',
    category: 'Lançamentos',
    description: 'Consulta lançamentos com filtros ricos por mês, tipo, status, categoria ou busca textual.',
    args: 'month?, type?, status?, categoryId?, accountId?, search?, limit?',
  },
  {
    name: 'create_transaction',
    category: 'Lançamentos',
    description: 'Registra lançamento único ou parcelado (2 a 36x) com sugestão automática inteligente de categoria.',
    args: 'description, amount, type, date?, categoryName?, accountName?, status?, currency?, repeatMonths?',
  },
  {
    name: 'update_transaction',
    category: 'Lançamentos',
    description: 'Atualiza campos de um lançamento, altera valores, notas ou dá baixa (status="paid", paidAt).',
    args: 'id, ...campos a alterar',
  },
  {
    name: 'delete_transaction',
    category: 'Lançamentos',
    description: 'Exclui definitivamente um lançamento do cofre.',
    args: 'id',
  },
  {
    name: 'set_exchange_rate',
    category: 'Câmbio Offline',
    description: 'Cadastra ou atualiza cotação de qualquer par entre moedas populares (100% offline).',
    args: 'from (código), to (código), rate (número > 0)',
  },
  {
    name: 'list_exchange_rates',
    category: 'Câmbio Offline',
    description: 'Lista todas as cotações salvas no cofre e a relação de moedas populares suportadas.',
    args: '—',
  },
  {
    name: 'delete_exchange_rate',
    category: 'Câmbio Offline',
    description: 'Remove a taxa de câmbio de um par específico do cofre.',
    args: 'from (código), to (código)',
  },
  {
    name: 'get_month_comparison',
    category: 'Comparativos',
    description: 'Comparativo mês a mês (até 24 meses) com receitas, despesas, variações e categorias com maior oscilação.',
    args: 'month?, months? (padrão 6)',
  },
  {
    name: 'save_insight',
    category: 'Insights IA',
    description: 'Salva o insight analítico do mês cifrado no cofre (com título, narrativa, destaques e assinatura).',
    args: 'month, title, body, highlights?',
  },
  {
    name: 'list_insights',
    category: 'Insights IA',
    description: 'Lê os insights salvos pelo assistente no cofre.',
    args: 'month?',
  },
  {
    name: 'delete_insight',
    category: 'Insights IA',
    description: 'Remove um insight salvo no cofre.',
    args: 'month',
  },
  {
    name: 'export_backup',
    category: 'Backups',
    description: 'Salva um backup cifrado (AES-256-GCM) em vaults/ do projeto e atualiza "Último backup".',
    args: '—',
  },
];

export const McpInstructionsModal: React.FC<McpInstructionsModalProps> = ({ isOpen, onClose }) => {
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

  const isRemoteWeb =
    !window.myfboxDesktop?.isDesktop &&
    typeof window !== 'undefined' &&
    window.location.hostname !== '127.0.0.1' &&
    window.location.hostname !== 'localhost';

  const mcpConfigObject = {
    mcpServers: {
      myfbox: {
        command: 'node',
        args: [desktopMcpPath ?? '/CAMINHO/ABSOLUTO/MyFBox/mcp/server.mjs'],
        ...(isRemoteWeb ? { env: { MYFBOX_APP_URL: window.location.origin } } : {}),
      },
    },
  };
  const mcpConfigJson = JSON.stringify(mcpConfigObject, null, 2);
  const [searchQuery, setSearchQuery] = useState('');
  const [promptCategoryFilter, setPromptCategoryFilter] = useState<string>('todos');

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const filteredPrompts = PROMPT_ITEMS.filter((item) => {
    const matchesCategory = promptCategoryFilter === 'todos' || item.category === promptCategoryFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;
    const matchesQuery =
      item.title.toLowerCase().includes(q) ||
      item.prompt.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.toolsUsed.some((t) => t.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  const categories = ['todos', ...Array.from(new Set(PROMPT_ITEMS.map((p) => p.category)))];

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
              <span>MCP & SKILLS OFICIAIS</span>
            </div>
            <h2 id="mcp-instructions-title">Guia de Instruções & Prompts MCP</h2>
            <p>
              Opere seu cofre financeiro com qualquer assistente ou agente de IA compatível com MCP
              através de uma ponte local 100% segura e soberana.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Fechar modal de instruções"
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
            <span>Prompts ({PROMPT_ITEMS.length})</span>
          </button>

          <button
            type="button"
            className={`mcp-modal-tab-btn ${activeTab === 'capabilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('capabilities')}
          >
            <ListTree size={13} />
            <span>Capacidades ({MCP_TOOLS_DOCS.length})</span>
          </button>

          <button
            type="button"
            className={`mcp-modal-tab-btn ${activeTab === 'install' ? 'active' : ''}`}
            onClick={() => setActiveTab('install')}
          >
            <Terminal size={13} />
            <span>Instalação</span>
          </button>

          <button
            type="button"
            className={`mcp-modal-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <ShieldCheck size={13} />
            <span>Segurança</span>
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
                    placeholder="Buscar por prompt, ação, ferramenta ou categoria..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="mcp-clear-search"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpar busca"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="mcp-category-pills">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`mcp-cat-pill ${promptCategoryFilter === cat ? 'active' : ''}`}
                      onClick={() => setPromptCategoryFilter(cat)}
                    >
                      {cat === 'todos' ? 'Todos' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPrompts.length === 0 ? (
                <div className="mcp-empty-state">
                  <Search size={24} />
                  <p>Nenhum prompt encontrado para os filtros selecionados.</p>
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
                            {item.toolsUsed.map((t) => (
                              <code key={t}>{t}</code>
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
                            title="Copiar prompt para o chat do assistente"
                          >
                            {isCopied ? (
                              <>
                                <Check size={13} /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy size={13} /> Copiar Prompt
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
                  <strong>O que o assistente pode fazer no MyFBox:</strong>
                  <p>
                    O servidor MCP expõe 20 ferramentas organizadas que cobrem todas as operações
                    essenciais do cofre. Todas as ações gravam no cofre criptografado e emitem avisos
                    visíveis no aplicativo.
                  </p>
                </div>
              </div>

              <div className="mcp-tools-table-wrap">
                <table className="mcp-tools-table">
                  <thead>
                    <tr>
                      <th>Ferramenta</th>
                      <th>Categoria</th>
                      <th>O que faz</th>
                      <th>Parâmetros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MCP_TOOLS_DOCS.map((t) => (
                      <tr key={t.name}>
                        <td>
                          <code className="mcp-tool-code">{t.name}</code>
                        </td>
                        <td>
                          <span className="mcp-cat-tag">{t.category}</span>
                        </td>
                        <td className="mcp-tool-desc">{t.description}</td>
                        <td className="mcp-tool-args">
                          <code>{t.args}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mcp-skills-summary">
                <h4 className="mcp-section-subtitle">Skills Especializadas Incluídas</h4>
                <div className="mcp-skills-grid">
                  <div className="mcp-skill-box">
                    <div className="mcp-skill-header">
                      <Wallet size={16} />
                      <strong>Skill: myfbox (.claude/skills/myfbox/SKILL.md)</strong>
                    </div>
                    <p>
                      Controla lançamentos, criação de contas e transferências multimoeda, parcelamentos em N vezes,
                      sugestão de categorias por IA, metas mensais e gestão de cotações offline (16 moedas).
                    </p>
                  </div>

                  <div className="mcp-skill-box">
                    <div className="mcp-skill-header">
                      <TrendingUp size={16} />
                      <strong>Skill: myfbox-insights (.claude/skills/myfbox-insights/SKILL.md)</strong>
                    </div>
                    <p>
                      Compara meses, detecta oscilações e redige insights analíticos e práticos
                      gravados diretamente no cofre cifrado para a aba Comparativos (com suporte a leitura por voz local).
                    </p>
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
                  <h4>Configuração Automática (.mcp.json)</h4>
                  <p>
                    O projeto já inclui o arquivo <code>.mcp.json</code> pronto na raiz. Ao abrir seu assistente
                    de IA nesta pasta, o servidor MCP <code>myfbox</code> é detectado automaticamente.
                  </p>
                  <div className="mcp-code-block-wrap">
                    <div className="mcp-code-header">
                      <span>.mcp.json (na raiz do projeto)</span>
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
                        {copiedId === 'mcp-json-code' ? 'Copiado!' : 'Copiar'}
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
                <div className="mcp-step-num">2</div>
                <div className="mcp-step-content">
                  <h4>Configuração Manual em Outros Clientes MCP</h4>
                  <p>
                    {desktopMcpPath
                      ? 'Configuração pronta para o app Desktop (caminho detectado automaticamente):'
                      : isRemoteWeb
                      ? 'Configuração para esta versão Web (inclui MYFBOX_APP_URL deste endereço; exige Node.js e o arquivo mcp/server.mjs local):'
                      : 'Adicione à configuração de MCP do seu cliente ou ambiente apontando para o script mcp/server.mjs com o caminho absoluto:'}
                  </p>
                  <div className="mcp-code-block-wrap">
                    <div className="mcp-code-header">
                      <span>Configuração MCP (JSON)</span>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => handleCopy('manual-mcp-code', mcpConfigJson)}
                      >
                        {copiedId === 'manual-mcp-code' ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === 'manual-mcp-code' ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <pre className="mono">{mcpConfigJson}</pre>
                  </div>
                </div>
              </div>

              <div className="mcp-guide-step">
                <div className="mcp-step-num">3</div>
                <div className="mcp-step-content">
                  <h4>Como Parear com 1 Comando</h4>
                  <p>No chat do assistente de IA, envie o prompt de pareamento:</p>
                  <div className="mcp-prompt-box">
                    <p className="mcp-prompt-text">
                      “Conecte ao MyFBox pelo servidor MCP local e me mostre o status da conexão.”
                    </p>
                    <button
                      type="button"
                      className={`btn-secondary btn-sm mcp-copy-btn ${copiedId === 'pair-prompt' ? 'copied' : ''}`}
                      onClick={() =>
                        handleCopy(
                          'pair-prompt',
                          'Conecte ao MyFBox pelo servidor MCP local e me mostre o status da conexão.'
                        )
                      }
                    >
                      {copiedId === 'pair-prompt' ? (
                        <>
                          <Check size={13} /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copiar Prompt
                        </>
                      )}
                    </button>
                  </div>
                  <ol className="mcp-guide-ol">
                    <li>O assistente chamará <code>connect_app</code> e retornará um link com código curto.</li>
                    <li>Abra o link neste navegador com o cofre desbloqueado.</li>
                    <li>Confira o código de conferência visual e clique em <strong>Autorizar</strong>.</li>
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
                  <h3>Arquitetura Local-First Soberana</h3>
                  <p>
                    O MyFBox foi desenhado para que a inteligência artificial sirva você sem que você
                    precise abrir mão da sua privacidade financeira.
                  </p>
                </div>
              </div>

              <div className="mcp-security-points">
                <div className="mcp-sec-card">
                  <div className="mcp-sec-icon">🔒</div>
                  <div>
                    <strong>Sua senha mestra nunca sai do navegador</strong>
                    <p>
                      O processo MCP não conhece a sua senha nem a sua chave derivada AES-256-GCM. Ele apenas
                      envia mensagens em formato JSON para o app aberto via WebSocket em loopback local (<code>127.0.0.1</code>).
                    </p>
                  </div>
                </div>

                <div className="mcp-sec-card">
                  <div className="mcp-sec-icon">⚡</div>
                  <div>
                    <strong>100% Offline Soberano</strong>
                    <p>
                      O aplicativo não realiza chamadas para APIs de terceiros. As cotações de moedas e
                      todas as regras de categorização e comparativos são processadas estritamente de forma local.
                    </p>
                  </div>
                </div>

                <div className="mcp-sec-card">
                  <div className="mcp-sec-icon">🛡️</div>
                  <div>
                    <strong>Cofre Trancado = Acesso Bloqueado</strong>
                    <p>
                      Se você trancar o cofre ou se o tempo de auto-bloqueio por inatividade expirar, o
                      servidor MCP imediatamente responde que o cofre está inacessível. Nenhuma ação de IA
                      pode destravar o cofre sem a sua senha mestra digitada manualmente.
                    </p>
                  </div>
                </div>

                <div className="mcp-sec-card">
                  <div className="mcp-sec-icon">👁️</div>
                  <div>
                    <strong>Transparência Total & Notificações</strong>
                    <p>
                      Sempre que o MCP registra, edita ou exclui um lançamento, um aviso em tempo real aparece na
                      interface informando exatamente o que foi executado.
                    </p>
                  </div>
                </div>

                <div className="mcp-sec-card">
                  <div className="mcp-sec-icon">🚫</div>
                  <div>
                    <strong>Operações Exclusivas do Usuário (Bloqueadas no MCP)</strong>
                    <p>
                      O MCP <strong>não pode</strong> criar cofre, apagar/resetar o cofre, alterar a senha mestra
                      nem fazer backup sem criptografia. A exportação de planilha CSV é exclusiva do usuário pela
                      interface do aplicativo; via MCP, o único backup permitido é o envelope cifrado (<code>AES-256-GCM</code>).
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
            <span>Dica: Experimente combinar prompts, como: <em>"Crie a categoria Pets com meta de 300 e registre 89,90 de ração nela"</em>.</span>
          </div>
          <button type="button" className="btn-primary" onClick={onClose}>
            Entendi, fechar
          </button>
        </footer>
      </div>
    </div>
  );
};
