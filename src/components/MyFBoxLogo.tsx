import React from 'react';

interface MyFBoxLogoProps {
  size?: number;
  className?: string;
}

export const MyFBoxLogo: React.FC<MyFBoxLogoProps> = ({ size = 28, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`myfbox-logo-svg ${className}`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Alça da Caixa de Ferramentas */}
      <path
        d="M12 6C12 4.34315 13.3431 3 15 3H17C18.6569 3 20 4.34315 20 6V7.5H12V6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      {/* Cédula de dinheiro de fundo (inclinada) */}
      <rect
        x="7.5"
        y="7.5"
        width="16"
        height="8.5"
        rx="1.5"
        transform="rotate(-7 15.5 11.5)"
        stroke="var(--color-emerald, #10b981)"
        strokeWidth="1.5"
        strokeDasharray="2 1.5"
        opacity="0.65"
      />

      {/* Cédula de dinheiro da frente */}
      <rect
        x="8"
        y="9"
        width="15.5"
        height="9"
        rx="1.5"
        stroke="var(--color-teal, #2dd4bf)"
        strokeWidth="1.8"
        fill="rgba(45, 212, 191, 0.14)"
      />

      {/* Símbolo de Cifrão ($) na cédula principal */}
      <path
        d="M16 10.5V16.5M14.5 11.7C14.5 11.2 15.1 11.2 16 11.2C16.9 11.2 17.5 11.6 17.5 12.2C17.5 13 14.5 13 14.5 14C14.5 14.7 15.1 15 16 15C16.9 15 17.5 14.6 17.5 14.2"
        stroke="var(--color-teal, #2dd4bf)"
        strokeWidth="1.5"
      />

      {/* Moeda de valor dourada saltando da caixa */}
      <circle
        cx="24"
        cy="9.5"
        r="3"
        stroke="var(--color-amber, #f59e0b)"
        strokeWidth="1.6"
        fill="rgba(245, 158, 11, 0.2)"
      />
      <path
        d="M24 8V11"
        stroke="var(--color-amber, #f59e0b)"
        strokeWidth="1.3"
      />

      {/* Abertura da Tampa da Caixa de Ferramentas */}
      <path
        d="M3 15.5L5.5 12.5C6 12 6.8 11.7 7.6 11.7H9"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M23 11.7H24.4C25.2 11.7 26 12 26.5 12.5L29 15.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      {/* Corpo / Compartimento da Caixa de Ferramentas */}
      <rect
        x="3"
        y="15.5"
        width="26"
        height="12.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="rgba(14, 19, 31, 0.9)"
      />

      {/* Friso Horizontal de Reforço */}
      <line
        x1="3"
        y1="20.5"
        x2="29"
        y2="20.5"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.45"
      />

      {/* Fechos Metálicos Laterais (Travas da Toolbox) */}
      <rect
        x="7.5"
        y="19"
        width="3"
        height="3.5"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="rgba(36, 49, 76, 0.95)"
      />
      <rect
        x="21.5"
        y="19"
        width="3"
        height="3.5"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="rgba(36, 49, 76, 0.95)"
      />

      {/* Detalhe de empunhadura frontal */}
      <line
        x1="13.5"
        y1="24.5"
        x2="18.5"
        y2="24.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
};
