import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: Readonly<CardProps>) {
  return <div className={cn('ui-card', className)} {...props} />;
}
