import React, { InputHTMLAttributes } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const TextInput: React.FC<TextInputProps> = ({ label, id, value, ...props }) => {
  const hasValue = value && String(value).length > 0;

  return (
    <div className="relative bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md focus-within:border-zinc-400 dark:focus-within:border-zinc-500">
      <label
        htmlFor={id}
        className={`absolute left-2 transition-all duration-200 ease-in-out pointer-events-none 
          ${hasValue 
            ? 'top-1 text-[10px] text-zinc-500 dark:text-zinc-400' 
            : 'top-1/2 -translate-y-1/2 text-xs text-zinc-400 dark:text-zinc-500'
          }`}
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        {...props}
        className={`w-full bg-transparent p-2 text-xs rounded-md dark:text-zinc-100
          ${hasValue ? 'pt-5 pb-1' : ''}
          focus:outline-none`}
      />
    </div>
  );
};

export default TextInput;