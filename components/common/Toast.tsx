import React from 'react';

interface ToastProps {
  message: string;
  show: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, show }) => {
  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 transform transition-all duration-500 ease-in-out z-[100] ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
      } pointer-events-none`}
    >
      <div className="bg-black dark:bg-white text-white dark:text-black rounded-full px-6 py-3 shadow-lg font-semibold text-sm">
        {message}
      </div>
    </div>
  );
};

export default Toast;
