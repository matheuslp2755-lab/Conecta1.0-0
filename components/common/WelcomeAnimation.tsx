import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface WelcomeAnimationProps {
  onAnimationEnd: () => void;
}

const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ onAnimationEnd }) => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering');

  useEffect(() => {
    // Transição de entrada para visível
    const enterTimer = setTimeout(() => {
      setPhase('visible');
    }, 100); // pequeno atraso para acionar a transição

    // Transição de visível para saída
    const visibleTimer = setTimeout(() => {
      setPhase('exiting');
    }, 3000); // Permanece visível por 3 segundos

    // Chama onAnimationEnd e limpa
    const exitTimer = setTimeout(() => {
      onAnimationEnd();
    }, 4000); // 3s visível + 1s de animação de saída

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(visibleTimer);
      clearTimeout(exitTimer);
    };
  }, [onAnimationEnd]);

  const overlayClasses = {
    entering: 'opacity-0',
    visible: 'opacity-100',
    exiting: 'opacity-0',
  };

  const textClasses = {
    entering: 'opacity-0 scale-95',
    visible: 'opacity-100 scale-100',
    exiting: 'opacity-0 scale-105',
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center transition-opacity duration-1000 ${overlayClasses[phase]}`}
    >
      <h1
        className={`text-4xl sm:text-5xl font-serif text-white text-center transition-all duration-1000 ease-out ${textClasses[phase]}`}
      >
        {t('welcome.title')}
      </h1>
    </div>
  );
};

export default WelcomeAnimation;
