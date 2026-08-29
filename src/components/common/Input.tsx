import React from 'react';
import { AlertCircle, Eye, EyeOff, Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isClearable?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      isClearable = false,
      onClear,
      containerClassName = '',
      className = '',
      id,
      type = 'text',
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);
    const isPassword = type === 'password';
    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    return (
      <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-stone-700 tracking-wide flex items-center justify-between">
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

          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            disabled={disabled}
            value={value}
            className={`w-full bg-white text-stone-900 placeholder:text-stone-400 text-sm rounded-xl border transition-all duration-150 ease-in-out py-2.5 px-3.5 ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${rightIcon || isPassword || isClearable ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-rose-500 bg-rose-50/30 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                : 'border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 shadow-xs'
            } ${disabled ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed select-none' : 'hover:border-stone-400'} focus:outline-hidden ${className}`}
            {...props}
          />

          {/* Action icons on right */}
          <div className="absolute right-3 flex items-center gap-1.5 text-stone-400">
            {isClearable && hasValue && !disabled && (
              <button
                type="button"
                onClick={onClear}
                tabIndex={-1}
                aria-label="Clear input"
                className="p-1 hover:text-stone-600 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {isPassword && !disabled && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="p-1 hover:text-stone-700 rounded-md transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}

            {!isPassword && rightIcon && <div className="pointer-events-none">{rightIcon}</div>}
          </div>
        </div>

        {/* Feedback helper or error */}
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

Input.displayName = 'Input';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, helperText, error, containerClassName = '', className = '', id, disabled, ...props }, ref) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);

    return (
      <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-stone-700 tracking-wide flex items-center justify-between">
            <span>{label}</span>
            {props.required && <span className="text-rose-600 font-bold">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={`w-full bg-white text-stone-900 placeholder:text-stone-400 text-sm rounded-xl border transition-all duration-150 ease-in-out py-2.5 px-3.5 min-h-[90px] ${
            error
              ? 'border-rose-500 bg-rose-50/30 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
              : 'border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 shadow-xs'
          } ${disabled ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed' : 'hover:border-stone-400'} focus:outline-hidden ${className}`}
          {...props}
        />

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

TextArea.displayName = 'TextArea';

export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearchChange?: (val: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Cari data...',
  value,
  onChange,
  onSearchChange,
  onClear,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    if (onSearchChange) onSearchChange(e.target.value);
  };

  return (
    <Input
      type="search"
      leftIcon={<Search className="w-4 h-4" />}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      isClearable={true}
      onClear={() => {
        if (onClear) onClear();
        if (onSearchChange) onSearchChange('');
      }}
      {...props}
    />
  );
};
