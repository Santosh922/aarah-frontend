'use client';

import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-sans font-bold tracking-[0.2em] uppercase transition-all disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[#191919] text-white hover:bg-black disabled:bg-gray-200 disabled:text-gray-400',
    outline: 'border border-[#191919] text-[#191919] bg-transparent hover:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400',
    ghost:   'text-[#191919] bg-transparent hover:bg-gray-50 disabled:text-gray-400',
  };

  const sizes = {
    sm: 'text-[9px] px-6 py-2.5',
    md: 'text-[10px] px-8 py-3.5',
    lg: 'text-[11px] px-10 py-4',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          <span>Loading...</span>
        </>
      ) : children}
    </button>
  );
}
