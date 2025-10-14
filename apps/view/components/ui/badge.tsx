import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeProps = HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, ...props }: Readonly<BadgeProps>) {
  return <span className={cn('ui-badge', className)} {...props} />;
}
