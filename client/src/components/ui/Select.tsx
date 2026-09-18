import React, { useId, useState, useRef, useImperativeHandle, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error: externalError, required, onBlur, onChange, onInvalid, children, id, value, defaultValue, name, disabled, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const [touched, setTouched] = useState(false);
    const [internalError, setInternalError] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    // Extract internal value for uncontrolled mode, but respect controlled value
    const [internalValue, setInternalValue] = useState(value !== undefined ? value : (defaultValue || ''));
    
    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    const innerRef = useRef<HTMLSelectElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const generatedId = useId();
    const selectId = id || `select-${generatedId}`;

    useImperativeHandle(ref, () => innerRef.current as HTMLSelectElement);

    // Close on outside click
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setTouched(true);
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideClick);
      }
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen]);

    const validate = (el: HTMLSelectElement) => {
      if (!el.validity.valid) {
        setInternalError(el.validationMessage);
      } else {
        setInternalError('');
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
      setTouched(true);
      validate(e.target);
      if (onBlur) onBlur(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (touched) validate(e.target);
      if (onChange) onChange(e);
    };
    
    const handleInvalid = (e: React.FormEvent<HTMLSelectElement>) => {
      setTouched(true);
      validate(e.currentTarget);
      if (onInvalid) onInvalid(e);
    };

    const displayError = externalError || (touched && internalError ? internalError : '');
    const errorId = `${selectId}-error`;
    const describedBy = [ariaDescribedBy, displayError ? errorId : undefined].filter(Boolean).join(' ') || undefined;

    // Parse options from children
    const options: { value: string; label: React.ReactNode; disabled?: boolean }[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        options.push({
          value: child.props.value ?? child.props.children,
          label: child.props.children,
          disabled: child.props.disabled
        });
      }
    });

    const selectedOption = options.find(opt => String(opt.value) === String(internalValue));
    const displayLabel = selectedOption ? selectedOption.label : 'Select...';

        const handleOptionSelect = (optValue: string) => {
      setInternalValue(optValue);
      setIsOpen(false);
      setTouched(true);
      
      // Update hidden select and trigger native change event so React forms catch it
      if (innerRef.current) {
        const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
        if (nativeSelectValueSetter) {
          nativeSelectValueSetter.call(innerRef.current, optValue);
        } else {
          innerRef.current.value = optValue;
        }
        innerRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Explicitly call onChange to guarantee state updates for controlled components
      if (onChange) {
        onChange({
          target: { name, value: optValue, id: selectId },
          currentTarget: { name, value: optValue, id: selectId },
          preventDefault: () => {},
          stopPropagation: () => {}
        } as any);
      }
    };

    return (
      <div className={cn("flex flex-col", label ? "space-y-1 w-full" : (className && className.includes("w-") ? "" : "w-full sm:w-auto min-w-[140px]"))} ref={containerRef}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
          </label>
        )}
        
        <div className="relative">
          {/* Custom Trigger */}
          <div
            className={cn(
              "h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-surface text-gray-900 dark:text-gray-100 px-3 py-2 text-sm cursor-pointer select-none transition-colors",
              displayError && "border-red-500",
              disabled && "opacity-50 cursor-not-allowed",
              className,
              "flex items-center justify-between"
            )}
            onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!disabled) setIsOpen(!isOpen);
              }
            }}
          >
            <span className={cn("block truncate", !selectedOption && "text-gray-400")}>{displayLabel}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>

          {/* Custom Dropdown Menu */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-surface border border-slate-border rounded-md shadow-lg max-h-60 overflow-auto py-1 ring-1 ring-black ring-opacity-5">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className={cn(
                    "cursor-pointer select-none relative py-2 pl-3 pr-9 text-sm transition-colors",
                    opt.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-brand-primary hover:text-white dark:hover:bg-brand-primary dark:hover:text-white text-gray-900 dark:text-gray-100",
                    String(opt.value) === String(internalValue) && !opt.disabled ? "bg-accent-50 text-brand-primary font-medium dark:bg-accent-900/20" : ""
                  )}
                  onClick={() => {
                    if (!opt.disabled) handleOptionSelect(String(opt.value));
                  }}
                >
                  <span className="block truncate">{opt.label}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Hidden Native Select for Forms */}
          <select
            id={selectId}
            name={name}
            className="hidden"
            ref={innerRef}
            required={required}
            disabled={disabled}
            value={internalValue}
            onChange={(e) => {
               setInternalValue(e.target.value);
               handleChange(e);
            }}
            onBlur={handleBlur}
            onInvalid={handleInvalid}
            aria-invalid={Boolean(displayError)}
            aria-describedby={describedBy}
            {...props}
          >
            {children}
          </select>
        </div>

        {displayError && (
          <p id={errorId} className="mt-1 text-sm text-red-500" role="alert">{displayError}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
