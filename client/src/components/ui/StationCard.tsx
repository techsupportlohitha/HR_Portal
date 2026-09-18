import React from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { ShiftBadge, ShiftStatus } from './ShiftBadge';
import { cn } from '@/lib/utils';

interface StationCardProps {
  stationName: string;
  activeCount: number;
  totalCount: number;
  overallStatus: ShiftStatus;
  className?: string;
  onManage?: () => void;
  onAlert?: () => void;
}

export function StationCard({
  stationName,
  activeCount,
  totalCount,
  overallStatus,
  className,
  onManage,
  onAlert
}: StationCardProps) {
  return (
    <div className={cn(
      "bg-surface rounded-xl border border-slate-border p-5",
      "",
      className
    )}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-text-heading">{stationName}</h3>
          <p className="text-sm text-text-muted mt-0.5">Personnel Capacity: {totalCount}</p>
        </div>
        <ShiftBadge status={overallStatus} label={overallStatus === 'active' ? 'Operational' : undefined} />
      </div>

      <div className="flex items-center gap-4 py-3 border-y border-slate-border/60 my-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-tint flex items-center justify-center text-brand-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-heading leading-none">{activeCount}</p>
            <p className="text-xs text-text-muted font-medium mt-1">Active Now</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="primary" className="flex-1" onClick={onManage}>
          Manage Shift
        </Button>
        <Button variant="outline" className="px-3 text-text-muted" onClick={onAlert} title="Issue Alert">
          <AlertCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
