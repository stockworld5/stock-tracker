'use client';

import { FieldError } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface InputFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;

  register?: any;
  validation?: Record<string, any>;
  error?: FieldError;

  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  inputClassName?: string;
}

export default function InputField({
  name,
  label,
  type = 'text',
  placeholder,
  autoComplete,
  disabled,
  register,
  validation,
  error,
  value,
  onChange,
  inputClassName,
}: InputFieldProps) {
  const registerProps =
    typeof register === 'function'
      ? register(name, validation)
      : { value, onChange };

  return (
    <div className="w-full">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-muted-foreground mb-1.5"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={cn(
            // layout
            "w-full h-11 rounded-xl px-4",

            // typography
            "text-[15px] text-foreground placeholder:text-muted-foreground",

            // base appearance
            "bg-background border border-border",

            // interaction
            "outline-none transition-colors duration-150",
            "focus:border-primary focus:ring-1 focus:ring-primary/40",

            // disabled
            disabled && "opacity-50 cursor-not-allowed",

            // error
            error && "border-red-500 focus:ring-red-500/40",

            inputClassName
          )}
          {...registerProps}
        />
      </div>

      {error?.message && (
        <p className="text-xs text-red-500 mt-1">{error.message}</p>
      )}
    </div>
  );
}
