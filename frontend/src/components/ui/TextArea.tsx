import { type TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = ({ label, error, className, ...props }: TextAreaProps) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'w-full px-3 py-2 text-sm bg-surface-100 border border-surface-300 rounded-lg',
          'text-gray-200 placeholder-gray-500',
          'transition-all duration-200',
          'focus:border-accent focus:ring-2 focus:ring-accent/20',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};
