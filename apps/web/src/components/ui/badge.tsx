import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-terracotta text-white',
        secondary:
          'border-transparent bg-olive text-white',
        outline:
          'border-forest/20 text-forest bg-surface/50',
        subtle:
          'border-transparent bg-forest/10 text-forest',
        success:
          'border-transparent bg-status-success/15 text-olive font-bold',
        warning:
          'border-transparent bg-status-warning/15 text-terracotta font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
