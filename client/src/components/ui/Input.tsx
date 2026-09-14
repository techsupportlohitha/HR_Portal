import React, { useId, useState, useRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error: externalError, required, onBlur, onChange, onInvalid, id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const [touched, setTouched] = useState(false);
    const [internalError, setInternalError] = useState('');
    const innerRef = useRef<HTMLInputElement>(null);
    const generatedId = useId();
    const inputId = id || `input-${generatedId}`;

    useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    const validate = (el: HTMLInputElement) => {
      if (!el.validity.valid) {
        setInternalError(el.validationMessage);
      } else {
        setInternalError('');
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      validate(e.target);
      if (onBlur) onBlur(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (props.type === 'number') {
        if (e.target.value.includes('.')) {
          e.target.value = e.target.value.split('.')[0];
        }
        if (props.min !== undefined && Number(props.min) >= 0) {
          if (Number(e.target.value) < 0) {
            e.target.value = props.min.toString();
          }
        }
      }
      if (touched) validate(e.target);
      if (onChange) onChange(e);
    };
    
    const handleInvalid = (e: React.FormEvent<HTMLInputElement>) => {
      setTouched(true);
      validate(e.currentTarget);
      if (onInvalid) onInvalid(e);
    };

    const displayError = externalError || (touched && internalError ? internalError : '');
    const errorId = `${inputId}-error`;
    const describedBy = [ariaDescribedBy, displayError ? errorId : undefined].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            displayError && "border-red-500",
            className
          )}
          ref={innerRef}
          required={required}
          onBlur={(e) => {
            if (props.type === 'number') {
              let changed = false;
              if (e.target.value.includes('.')) {
                e.target.value = e.target.value.split('.')[0];
                changed = true;
              }
              if (props.min !== undefined && Number(props.min) >= 0 && Number(e.target.value) < 0) {
                e.target.value = String(props.min);
                changed = true;
              }
              if (changed && onChange) {
                const event = Object.create(e);
                event.target = e.target;
                event.currentTarget = e.currentTarget;
                onChange(event as unknown as React.ChangeEvent<HTMLInputElement>);
              }
            }
            handleBlur(e);
          }}
          onKeyDown={(e) => {
            if (props.type === 'number') {
              if (e.key === '.') e.preventDefault();
              if (props.min !== undefined && Number(props.min) >= 0 && e.key === '-') e.preventDefault();
            }
            if (props.onKeyDown) props.onKeyDown(e);
          }}
          onChange={(e) => {
            if (props.type === 'number') {
              if (e.target.value.includes('.')) {
                e.target.value = e.target.value.split('.')[0];
              }
              if (props.min !== undefined && Number(props.min) >= 0 && Number(e.target.value) < 0) {
                e.target.value = String(props.min);
              }
            }
            handleChange(e);
          }}
          onInvalid={handleInvalid}
          aria-invalid={Boolean(displayError)}
          aria-describedby={describedBy}
          {...props}
        />
        {displayError && (
          <p id={errorId} className="mt-1 text-sm text-red-500" role="alert">{displayError}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
