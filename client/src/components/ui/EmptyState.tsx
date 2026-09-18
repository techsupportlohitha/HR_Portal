import { LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  const titleId = useId();

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center bg-surface border border-slate-border border-dashed rounded-xl", className)} role="status" aria-labelledby={titleId}>
      <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mb-4" aria-hidden="true">
        <Icon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" className="shadow-sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}





