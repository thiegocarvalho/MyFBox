import React from 'react';

interface MyFBoxLogoProps {
  size?: number;
  className?: string;
}

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
      <rect x="2" y="14" width="25" height="16" fill="#FFFFFF" />
      <path
        d="M11.5 11V5.5H23.5V11"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinejoin="miter"
        strokeLinecap="butt"
      />
      <rect x="5" y="11" width="25" height="16" fill={accent} />
      <path
        d="M20.5 15.8H14.5V19H20.5V22.2H14.5M17.5 14.2V23.8"
        fill="none"
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    </svg>
  );
};

interface MyFBoxBrandProps {
  size?: number;
  className?: string;
}

export const MyFBoxBrand: React.FC<MyFBoxBrandProps> = ({ size = 40, className = '' }) => (
  <div className={`brand-block ${className}`.trim()}>
    <div className="brand-logo-wrap">
      <MyFBoxLogo size={size} />
    </div>
    <div className="brand-text">
      <span className="brand-title">
        My<span className="brand-highlight">F</span>Box
      </span>
      <span className="brand-tagline">My Financial Box</span>
    </div>
  </div>
);
