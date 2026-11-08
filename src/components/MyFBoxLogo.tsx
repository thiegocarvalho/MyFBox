import React from 'react';

interface MyFBoxLogoProps {
  size?: number;
  className?: string;
}

/**
 * Marca MyFBox: caixa/cofre sólido em limão com alça reta, fenda da tampa e
 * cifrão em bloco recortados em preto, e sombra branca sólida deslocada
 * (linguagem brutalista "neonzinho"). Desenhada em grade de 32×32 para ler
 * bem do favicon (16px) ao login (64px+).
 */
export const MyFBoxLogo: React.FC<MyFBoxLogoProps> = ({ size = 28, className = '' }) => {
  const accent = 'var(--color-accent, #C8FF00)';
  const ink = 'var(--bg-app, #101010)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={`myfbox-logo-svg ${className}`}
      role="img"
      aria-label="MyFBox"
    >
      {/* Sombra sólida deslocada */}
      <rect x="2" y="14" width="25" height="16" fill="#FFFFFF" />

      {/* Alça */}
      <path
        d="M11.5 11V5.5H23.5V11"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinejoin="miter"
        strokeLinecap="butt"
      />

      {/* Corpo da caixa */}
      <rect x="5" y="11" width="25" height="16" fill={accent} />

      {/* Fenda da tampa */}
      <rect x="5" y="15" width="25" height="1.6" fill={ink} />

      {/* Cifrão em bloco */}
      <path
        d="M20.5 19H15V21.6H20V24.4H14.5M17.5 17.8V25.6"
        fill="none"
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    </svg>
  );
};
