import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-terracotta text-white shadow-sm hover:bg-terracotta-hover border border-terracotta-dark/20',
        secondary:
          'bg-olive text-white shadow-sm hover:bg-olive-hover border border-olive-dark/20',
        outline:
          'border border-forest/20 bg-surface/80 text-forest hover:bg-surface-hover hover:border-forest/30',
        ghost:
          'text-forest hover:bg-forest/10 hover:text-forest',
        elevated:
          'bg-bg-elevated text-forest shadow-sm hover:bg-surface-hover border border-forest/15',
        destructive:
          'bg-status-error text-white shadow-sm hover:bg-status-error/90',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs rounded',
        md: 'h-9 px-3.5 text-sm',
        lg: 'h-10 px-4 text-base rounded-lg',
        icon: 'h-8 w-8 p-0 rounded-md',
        'icon-sm': 'h-7 w-7 p-0 rounded',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
