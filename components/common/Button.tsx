
import React, { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, className, disabled, ...props }) => {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`w-full bg-sky-500 text-white font-semibold rounded-lg py-1.5 px-4 transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-sky-600'}
        ${className || ''}`}
    >
      {children}
    </button>
  );
};

export default Button;
