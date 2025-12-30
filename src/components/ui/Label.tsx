import React from 'react';
import { cn } from '@/lib/utils';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({ className, children, ...props }) => {
  return (
    <label
      className={cn(
        'block text-sm font-medium text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
};

