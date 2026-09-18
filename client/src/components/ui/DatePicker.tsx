import React, { useState, useRef, useEffect, useId } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from './Calendar';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue'> {
  label?: string;
  error?: string;
  value?: string | Date; // ISO string or Date object
  defaultValue?: string | Date;
  
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, required, value: controlledValue, defaultValue, onChange, id, name, disabled, type, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || `datepicker-${generatedId}`;
    
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    // Initialize internal date state
    const parseInitialDate = (val?: string | Date) => {
      if (!val) return undefined;
      if (val instanceof Date) return isValid(val) ? val : undefined;
      const parsed = parseISO(val);
      return isValid(parsed) ? parsed : undefined;
    };

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
      parseInitialDate(controlledValue !== undefined ? controlledValue : defaultValue)
    );

    // Sync with controlled value
    useEffect(() => {
      if (controlledValue !== undefined) {
        setSelectedDate(parseInitialDate(controlledValue));
      }
    }, [controlledValue]);

    // Handle outside clicks to close the popover
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideClick);
      }
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen]);

    const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      setIsOpen(false);
      
      const isoDate = format(date, 'yyyy-MM-dd');
      
      // Update hidden input explicitly
              if (hiddenInputRef.current) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(hiddenInputRef.current, isoDate);
          } else {
            hiddenInputRef.current.value = isoDate;
          }
          hiddenInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Explicitly call onChange to guarantee state updates for controlled components
        if (onChange) {
          onChange({
            target: { name: name || '', value: isoDate, id: inputId },
            currentTarget: { name: name || '', value: isoDate, id: inputId },
            preventDefault: () => {},
            stopPropagation: () => {}
          } as any);
        }
      
      
    };

    const displayValue = selectedDate ? format(selectedDate, 'PPP') : 'Pick a date';

    return (
      <div className={cn("flex flex-col relative", label ? "space-y-1 w-full" : (className && className.includes('w-') ? "" : "w-full sm:w-auto min-w-[200px]"))} ref={containerRef}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
          </label>
        )}
        
        <div className="relative w-full">
          {/* Custom Trigger */}
          <button
            type="button"
            className={cn(
              "flex items-center justify-between h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-surface px-3 py-2 text-sm cursor-pointer select-none transition-colors",
              !selectedDate && "text-slate-500 dark:text-slate-400",
              selectedDate && "text-slate-900 dark:text-slate-100 font-medium",
              error && "border-red-500 focus:ring-red-500",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
            disabled={disabled}
          >
            <span className="block truncate">{displayValue}</span>
            <CalendarIcon className="h-4 w-4 opacity-50 ml-2 shrink-0" />
          </button>

          {/* Calendar Popover */}
          {isOpen && !disabled && (
            <div className="absolute z-50 mt-1 left-0 shadow-xl border border-slate-border rounded-xl overflow-hidden bg-surface animate-in fade-in zoom-in-95 duration-100">
              <Calendar
                value={selectedDate}
                onChange={handleDateSelect}
                className="border-0 shadow-none bg-transparent"
              />
            </div>
          )}
        </div>

        {/* Hidden Input for Form Submission */}
        <input
          type="hidden"
          id={inputId}
          name={name}
          ref={hiddenInputRef}
          onChange={onChange}
          value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
          {...(props as any)}
        />
        
        {error && (
          <p className="mt-1 text-sm text-red-500" role="alert">{error}</p>
        )}
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";
