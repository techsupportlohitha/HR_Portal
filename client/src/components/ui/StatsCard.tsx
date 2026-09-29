
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './Card';

interface StatsCardProps {
 title: string;
 value: string | number;
 icon: LucideIcon;
 trend?: {
 value: string;
 label: string;
 positive: boolean;
 };
}

export function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
 return (
 <Card>
 <CardContent className="p-6">
 <div className="flex items-center justify-between space-y-0 pb-2">
 <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
 <div className="rounded-md bg-primary-50 p-2">
 <Icon className="h-4 w-4 text-primary-600" />
 </div>
 </div>
 <div className="flex flex-col gap-1">
 <div className="text-2xl font-bold">{value}</div>
 {trend && (
 <p className="text-xs text-slate-500 dark:text-slate-400">
 <span className={trend.positive ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
 {trend.value}
 </span>{" "}
 {trend.label}
 </p>
 )}
 </div>
 </CardContent>
 </Card>
 );
}
