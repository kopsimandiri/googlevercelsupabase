import React from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
  containerClassName?: string;
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      children,
      containerClassName = '',
      className = '',
      id,
      disabled,
      leftIcon,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);

    return (
      <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-stone-700 tracking-wide flex items-center justify-between">
            <span>{label}</span>
            {props.required && <span className="text-rose-600 font-bold">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 text-stone-400 pointer-events-none flex items-center justify-center shrink-0">
              {leftIcon}
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={`w-full appearance-none bg-white text-stone-900 text-sm rounded-xl border transition-all duration-150 ease-in-out py-2.5 ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } pr-10 ${
              error
                ? 'border-rose-500 bg-rose-50/30 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                : 'border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 shadow-xs'
            } ${disabled ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed' : 'hover:border-stone-400 cursor-pointer'} focus:outline-hidden ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3.5 pointer-events-none text-stone-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error ? (
          <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-0.5" role="alert">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
