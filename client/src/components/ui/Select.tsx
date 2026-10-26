import React, {
  useId,
  useState,
  useRef,
  useImperativeHandle,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error: externalError,
      required,
      onBlur,
      onChange,
      onInvalid,
      children,
      id,
      value,
      defaultValue,
      name,
      disabled,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const [touched, setTouched] = useState(false);
    const [internalError, setInternalError] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    // Extract internal value for uncontrolled mode, but respect controlled value
    const [internalValue, setInternalValue] = useState(
      value !== undefined ? value : defaultValue || "",
    );

    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    const innerRef = useRef<HTMLSelectElement>(null);
    const selectedOptionRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const generatedId = useId();
    const selectId = id || `select-${generatedId}`;

    useImperativeHandle(ref, () => innerRef.current as HTMLSelectElement);

    // Close on outside click
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
          setTouched(true);
        }
      };
      if (isOpen) {
        document.addEventListener("mousedown", handleOutsideClick);
      }
      return () =>
        document.removeEventListener("mousedown", handleOutsideClick);
    }, [isOpen]);

    useEffect(() => {
      if (isOpen) selectedOptionRef.current?.focus();
    }, [isOpen]);

    const validate = (el: HTMLSelectElement) => {
      if (!el.validity.valid) {
        setInternalError(el.validationMessage);
      } else {
        setInternalError("");
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

    const displayError =
      externalError || (touched && internalError ? internalError : "");
    const errorId = `${selectId}-error`;
    const describedBy =
      [ariaDescribedBy, displayError ? errorId : undefined]
        .filter(Boolean)
        .join(" ") || undefined;

    // Parse options from children
    const options: {
      value: string;
      label: React.ReactNode;
      disabled?: boolean;
    }[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === "option") {
        options.push({
          value: child.props.value ?? child.props.children,
          label: child.props.children,
          disabled: child.props.disabled,
        });
      }
    });

    const selectedOption = options.find(
      (opt) => String(opt.value) === String(internalValue),
    );
    const displayLabel = selectedOption ? selectedOption.label : "Select...";

    const handleOptionSelect = (optValue: string) => {
      setInternalValue(optValue);
      setIsOpen(false);
      document.getElementById(selectId)?.focus();
      setTouched(true);

      // Keep the form control in sync and notify the caller once.
      if (innerRef.current) {
        const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          "value",
        )?.set;
        if (nativeSelectValueSetter) {
          nativeSelectValueSetter.call(innerRef.current, optValue);
        } else {
          innerRef.current.value = optValue;
        }
        validate(innerRef.current);
      }

      // Explicitly call onChange to guarantee state updates for controlled components
      if (onChange) {
        onChange({
          target: { name, value: optValue, id: selectId },
          currentTarget: { name, value: optValue, id: selectId },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as any);
      }
    };

    return (
      <div
        className={cn(
          "flex flex-col",
          label
            ? "space-y-1 w-full"
            : className && className.includes("w-")
              ? ""
              : "w-full sm:w-auto min-w-[140px]",
        )}
        ref={containerRef}
        data-select-control
      >
        {label && (
          <label
            id={`${selectId}-label`}
            htmlFor={selectId}
            className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1"
          >
            {label}{" "}
            {required && (
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {/* Custom Trigger */}
          <button
            type="button"
            id={selectId}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={label ? `${selectId}-label` : undefined}
            aria-label={props["aria-label"]}
            aria-invalid={Boolean(displayError)}
            aria-describedby={describedBy}
            className={cn(
              "h-[42px] w-full rounded-[1.25rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface text-gray-900 dark:text-gray-100 px-4 py-2 text-[13px] cursor-pointer select-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600",
              displayError && "border-red-500",
              disabled && "opacity-50 cursor-not-allowed",
              className,
              "flex items-center justify-between",
            )}
            onClick={() => {
              if (!disabled) setIsOpen(!isOpen);
            }}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                e.preventDefault();
                if (!disabled) setIsOpen(true);
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                if (!disabled) setIsOpen(true);
              }
              if (e.key === "Escape") setIsOpen(false);
            }}
          >
            <span
              className={cn(
                "block truncate",
                !selectedOption && "text-gray-400",
              )}
            >
              {displayLabel}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>

          {/* Custom Dropdown Menu */}
          {isOpen && (
            <div
              role="listbox"
              aria-labelledby={label ? `${selectId}-label` : undefined}
              className="absolute z-50 flex w-full flex-col mt-2 bg-surface border border-slate-200 dark:border-slate-700 rounded-[1.25rem] shadow-xl max-h-60 overflow-y-auto overscroll-contain p-1.5 ring-1 ring-black ring-opacity-5"
            >
              {options.map((opt, i) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={String(opt.value) === String(internalValue)}
                  disabled={opt.disabled}
                  ref={
                    String(opt.value) === String(internalValue)
                      ? selectedOptionRef
                      : undefined
                  }
                  key={i}
                  className={cn(
                    "block w-full shrink-0 text-left cursor-pointer select-none relative py-2.5 px-3 text-[13px] rounded-xl transition-colors font-medium mb-0.5 last:mb-0",
                    opt.disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-brand-primary hover:text-white dark:hover:bg-brand-primary dark:hover:text-white text-gray-900 dark:text-gray-100",
                    String(opt.value) === String(internalValue) && !opt.disabled
                      ? "bg-accent-50 text-brand-primary font-medium dark:bg-accent-900/20"
                      : "",
                  )}
                  onClick={() => {
                    if (!opt.disabled) handleOptionSelect(String(opt.value));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setIsOpen(false);
                      document.getElementById(selectId)?.focus();
                      return;
                    }
                    if (e.key === "Tab") {
                      setIsOpen(false);
                      return;
                    }
                    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                    e.preventDefault();
                    const options = Array.from(
                      containerRef.current?.querySelectorAll<HTMLButtonElement>(
                        '[role="option"]',
                      ) || [],
                    );
                    const current = options.indexOf(e.currentTarget);
                    const direction = e.key === "ArrowDown" ? 1 : -1;
                    let next = current;
                    for (let i = 0; i < options.length; i++) {
                      next =
                        (next + direction + options.length) % options.length;
                      if (!options[next].disabled) {
                        options[next].focus();
                        break;
                      }
                    }
                  }}
                >
                  <span className="block truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Hidden Native Select for Forms */}
          <select
            id={`${selectId}-native`}
            name={name}
            className="sr-only pointer-events-none"
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
            aria-hidden="true"
            tabIndex={-1}
            {...props}
          >
            {children}
          </select>
        </div>

        {displayError && (
          <p id={errorId} className="mt-1 text-sm text-red-500" role="alert">
            {displayError}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
