import React, { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface QButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

export const QButton: React.FC<QButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  loading, 
  ...props 
}) => {
  const baseStyle = "relative font-medium transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-[0.98] flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-stone-800 text-stone-100 dark:bg-stone-200 dark:text-stone-900 border-2 border-transparent hover:-translate-y-0.5 hover:shadow-quirky dark:hover:shadow-quirky-dark rounded-tl-md rounded-tr-sm rounded-br-lg rounded-bl-md",
    secondary: "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border-2 border-stone-800 dark:border-stone-600 hover:-translate-y-0.5 hover:shadow-quirky dark:hover:shadow-quirky-dark rounded-tl-sm rounded-tr-lg rounded-br-sm rounded-bl-xl",
    danger: "bg-red-900/10 text-red-700 dark:text-red-400 border-2 border-red-200 dark:border-red-900 hover:bg-red-900/20 rounded-lg rotate-[0.5deg]",
    ghost: "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} px-4 py-2 ${loading ? 'opacity-80 cursor-not-allowed' : ''} ${className}`}
      disabled={loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

export const QCard: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 p-5 rounded-tl-2xl rounded-tr-sm rounded-br-xl rounded-bl-md shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
      {title && <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 mb-4 border-b-2 border-stone-100 dark:border-stone-800 pb-2 inline-block transform -rotate-[0.5deg]">{title}</h3>}
      {children}
    </div>
  );
};

export const QInput: React.FC<InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider ml-1">{label}</label>}
      <input 
        className={`bg-stone-50 dark:bg-stone-800 border-b-2 border-stone-300 dark:border-stone-600 focus:border-stone-800 dark:focus:border-stone-400 outline-none px-3 py-2 rounded-t-md transition-colors ${className}`}
        {...props}
      />
    </div>
  );
};

export const QSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider ml-1">{label}</label>}
      <div className="relative">
        <select 
            className={`appearance-none w-full bg-stone-50 dark:bg-stone-800 border-b-2 border-stone-300 dark:border-stone-600 focus:border-stone-800 dark:focus:border-stone-400 outline-none px-3 py-2 rounded-t-md transition-colors ${className}`}
            {...props}
        >
            {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-700 dark:text-stone-300">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>
    </div>
  );
};

export const QBadge: React.FC<{ children: React.ReactNode, color?: string }> = ({ children, color = 'bg-stone-200' }) => {
    return (
        <span className={`${color} px-2 py-0.5 text-xs font-bold rounded-full border border-black/5 inline-block transform rotate-[-1deg]`}>
            {children}
        </span>
    )
}