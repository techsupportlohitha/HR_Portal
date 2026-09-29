import React from 'react';
import { cn } from '@/lib/utils';

export type ShiftStatus = 'active' | 'standby' | 'warning' | 'danger';

interface ShiftBadgeProps {
 status: ShiftStatus;
 label?: string;
 className?: string;
}

export function ShiftBadge({ status, label, className }: ShiftBadgeProps) {
 const styles = {
 active: "bg-status-active-bg text-status-active border-status-active/20",
 standby: "bg-status-standby-bg text-status-standby border-status-standby/20",
 warning: "bg-status-warning-bg text-status-warning border-status-warning/20",
 danger: "bg-status-danger-bg text-status-danger border-status-danger/20",
 };

 const dotColors = {
 active: "bg-status-active",
 standby: "bg-status-standby",
 warning: "bg-status-warning",
 danger: "bg-status-danger",
 };

 const defaultLabels = {
 active: "Clocked In",
 standby: "Standby",
 warning: "Overtime",
 danger: "Absent",
 };

 return (
 <div className={cn(
 "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
 styles[status],
 className
 )}>
 <span className="relative flex h-2 w-2">
 {status === 'active' && (
 <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotColors[status])}></span>
 )}
 <span className={cn("relative inline-flex rounded-full h-2 w-2", dotColors[status])}></span>
 </span>
 {label || defaultLabels[status]}
 </div>
 );
}
