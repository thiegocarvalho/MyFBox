import React, { useEffect, useState } from 'react';
import { Bot, ShieldCheck, X } from 'lucide-react';
import { mcpShortCode, type McpPairingRequest } from '../services/mcpBridge';

interface McpPairDialogProps {
  request: McpPairingRequest;
  onApprove: () => void;
  onReject: () => void;
}

/** Confirmação do pareamento por link (#mcp-pair=...) com o servidor MCP local. */
export const McpPairDialog: React.FC<McpPairDialogProps> = ({ request, onApprove, onReject }) => {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    mcpShortCode(request.token).then((c) => alive && setCode(c));
    return () => {
      alive = false;
    };
  }, [request.token]);

  return (
    <div
      className="modal-backdrop"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onReject();
      }}
    >
      <div
        className="modal-card pair-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pair-title"
      >
        <header className="modal-header">
          <h2 id="pair-title">Conectar assistente</h2>
          <button type="button" className="icon-btn" onClick={onReject} aria-label="Recusar">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body pair-body">
          <div className="pair-icon">
            <Bot size={28} />
          </div>
          <p>
            Um assistente (servidor MCP local) quer acessar este cofre para consultar e registrar
            lançamentos. Ele só funciona nesta máquina e enquanto o cofre estiver desbloqueado.
          </p>

          <div className="pair-code">
            <span>Confira se o código é o mesmo mostrado pelo assistente</span>
            <strong className="mono">{code ?? '····-····'}</strong>
          </div>

          <ul className="pair-facts">
            <li>
              <ShieldCheck size={14} /> Conexão só com 127.0.0.1, porta {request.port}
            </li>
            <li>
              <ShieldCheck size={14} /> A senha e a chave do cofre não saem do navegador
            </li>
            <li>
              <ShieldCheck size={14} /> Dá para desligar quando quiser em Configurações › Modo MCP local
            </li>
          </ul>

          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onReject}>
              Recusar
            </button>
            <button type="button" className="btn-primary" onClick={onApprove} autoFocus disabled={!code}>
              Autorizar
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};
