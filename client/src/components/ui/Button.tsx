import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { RippleButton } from './ripple-button';


export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'approve';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    
    // Base styles: rounded-lg, focus rings, disabled states, transitions for micro-interactions
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      // 1. Brand Primary
      primary: "bg-brand-primary text-white hover:bg-brand-hover hover:-translate-y-0.5 hover:shadow-[0_4px_6px_-1px_rgba(71,85,105,0.2)] active:translate-y-0 active:scale-[0.98] focus-visible:ring-brand-light",
      
      // 2. Dark Slate Navigation (also maps to 'approve' for backward compat)
      dark: "bg-sidebar text-white hover:bg-[#1E293B] hover:-translate-y-0.5 hover:shadow active:translate-y-0 active:scale-[0.98] focus-visible:ring-sidebar",
      approve: "bg-sidebar text-white hover:bg-[#1E293B] hover:-translate-y-0.5 hover:shadow active:translate-y-0 active:scale-[0.98] focus-visible:ring-sidebar",
      
      // 3. Soft Slate (Secondary)
      secondary: "bg-tint text-text-heading border border-slate-border hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-[0.98] focus-visible:ring-slate-border",
      
      // 4. Ghost / Outline
      outline: "bg-transparent border-2 border-slate-border text-text-body hover:bg-tint active:scale-[0.98] focus-visible:ring-slate-border",
      ghost: "bg-transparent text-text-muted hover:bg-tint hover:text-text-heading active:scale-[0.98] focus-visible:ring-tint",
      
      // Additional: Danger
      danger: "bg-status-danger text-white hover:bg-red-600 hover:-translate-y-0.5 hover:shadow active:translate-y-0 active:scale-[0.98] focus-visible:ring-status-danger-bg",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-5 py-2 text-sm",
      lg: "h-12 px-8 text-base",
      icon: "h-9 w-9 p-0",
    };

    if (variant === 'primary') {
      return (
        <RippleButton
          ref={ref}
          rippleColor="#ffffff"
          className={cn(baseStyles, variants[variant], sizes[size], className)}
          disabled={disabled || isLoading}
          {...props}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {children}
        </RippleButton>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
