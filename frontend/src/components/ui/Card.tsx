import { type ComponentProps } from 'react';
import { clsx } from 'clsx';

export const Card = ({ className, children, ...props }: ComponentProps<'div'>) => (
  <div
    className={clsx(
      'bg-surface rounded-xl border border-surface-300/50 shadow-lg animate-fade-in',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ className, children, ...props }: ComponentProps<'div'>) => (
  <div
    className={clsx('px-5 py-4 border-b border-surface-300/50', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }: ComponentProps<'h3'>) => (
  <h3
    className={clsx('text-lg font-semibold text-gray-100', className)}
    {...props}
  >
    {children}
  </h3>
);

export const CardContent = ({ className, children, ...props }: ComponentProps<'div'>) => (
  <div
    className={clsx('p-5', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardDescription = ({ className, children, ...props }: ComponentProps<'p'>) => (
  <p
    className={clsx('text-sm text-gray-400 mt-1', className)}
    {...props}
  >
    {children}
  </p>
);
