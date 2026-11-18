import React from 'react';
import { Globe } from 'lucide-react';
import { LANGUAGE_OPTIONS, type AppLanguage } from '../i18n';
import { useI18n } from '../i18n/useI18n';

interface LanguageSelectorProps {
  variant?: 'compact' | 'buttons';
  value?: AppLanguage;
  onChange?: (lang: AppLanguage) => void;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  value,
  onChange,
  className = '',
}) => {
  const { language, setLanguage, t } = useI18n();
  const active = value ?? language;

  const handleSelect = (next: AppLanguage) => {
    if (onChange) {
      onChange(next);
    } else {
      setLanguage(next);
    }
  };

  if (variant === 'buttons') {
    return (
      <div
        className={`lang-selector-grid ${className}`.trim()}
        role="radiogroup"
        aria-label={t('language.selectAria')}
      >
        {LANGUAGE_OPTIONS.map((opt) => {
          const isSelected = active === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`lang-selector-btn ${isSelected ? 'active' : ''}`}
              onClick={() => handleSelect(opt.code)}
            >
              <span className="lang-selector-short">{opt.shortLabel}</span>
              <span className="lang-selector-name">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <label className={`lang-selector-compact ${className}`.trim()}>
      <Globe size={14} aria-hidden />
      <select
        aria-label={t('language.selectAria')}
        value={active}
        onChange={(e) => handleSelect(e.target.value as AppLanguage)}
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
};
