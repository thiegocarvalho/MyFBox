import React, { useEffect, useState } from 'react';
import { Bot, ShieldCheck, X } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import { mcpShortCode, type McpPairingRequest } from '../services/mcpBridge';

interface McpPairDialogProps {
  request: McpPairingRequest;
  onApprove: () => void;
  onReject: () => void;
}

export const McpPairDialog: React.FC<McpPairDialogProps> = ({ request, onApprove, onReject }) => {
  const { t } = useI18n();
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
          <h2 id="pair-title">{t('domainMcp.pair.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onReject}
            aria-label={t('domainMcp.pair.reject')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="modal-body pair-body">
          <div className="pair-icon">
            <Bot size={28} />
          </div>
          <p>{t('domainMcp.pair.description')}</p>

          <div className="pair-code">
            <span>{t('domainMcp.pair.codeLabel')}</span>
            <strong className="mono">{code ?? '····-····'}</strong>
          </div>

          <ul className="pair-facts">
            <li>
              <ShieldCheck size={14} /> {t('domainMcp.pair.factLoopback', { port: request.port })}
            </li>
            <li>
              <ShieldCheck size={14} /> {t('domainMcp.pair.factSecrets')}
            </li>
            <li>
              <ShieldCheck size={14} /> {t('domainMcp.pair.factDisable')}
            </li>
          </ul>

          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onReject}>
              {t('domainMcp.pair.reject')}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onApprove}
              autoFocus
              disabled={!code}
            >
              {t('domainMcp.pair.authorise')}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};
