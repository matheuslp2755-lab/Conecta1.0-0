import React from 'react';

type CrystalLevel = 'BRILHANTE' | 'EQUILIBRADO' | 'APAGADO' | 'RACHADO';

interface ConnectionCrystalProps {
  level: CrystalLevel;
  className?: string;
}

const ConnectionCrystal: React.FC<ConnectionCrystalProps> = ({ level, className }) => {
  const levelStyles = {
    BRILHANTE: {
      gradientFrom: '#00F2FF',
      gradientTo: '#00C2FF',
      filter: 'drop-shadow(0 0 5px #00d2ff)',
      animation: 'pulse 2s infinite',
    },
    EQUILIBRADO: {
      gradientFrom: '#4FBFFF',
      gradientTo: '#2AA5FF',
      filter: 'none',
      animation: 'none',
    },
    APAGADO: {
      gradientFrom: '#A0AEC0',
      gradientTo: '#718096',
      filter: 'none',
      animation: 'none',
    },
    RACHADO: {
      gradientFrom: '#718096',
      gradientTo: '#4A5568',
      filter: 'none',
      animation: 'none',
    },
  };

  const style = levelStyles[level];

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
      `}</style>
      <svg
        className={className}
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: style.filter,
          animation: style.animation,
          transition: 'all 0.5s ease-in-out',
        }}
      >
        <defs>
          <linearGradient id={`crystalGradient-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={style.gradientFrom} />
            <stop offset="100%" stopColor={style.gradientTo} />
          </linearGradient>
        </defs>
        <g fill={`url(#crystalGradient-${level})`} stroke="#fff" strokeOpacity="0.2" strokeWidth="1">
          <path d="M24 4L12 16L24 44L36 16L24 4Z" />
          <path d="M24 4L12 16L4 28L12 40L24 44" opacity="0.8" />
          <path d="M24 4L36 16L44 28L36 40L24 44" opacity="0.8" />
        </g>
        {level === 'RACHADO' && (
          <path
            d="M24 4 L20 20 L28 25 L24 44 M18 18 L30 30"
            fill="none"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    </>
  );
};

export default ConnectionCrystal;
