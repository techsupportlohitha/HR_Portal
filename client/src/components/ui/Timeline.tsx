import React from "react";
import { cn } from "@/lib/utils";
import { Check, Circle, Clock, CheckCircle2, ChevronRight, type LucideIcon } from "lucide-react";
import { motion, HTMLMotionProps } from "framer-motion";

export type TimelineStatus = "completed" | "current" | "upcoming";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  category?: string;
  status?: TimelineStatus;
  icon?: LucideIcon;
  image?: string;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TimelineItem[];
}

export function Timeline({ items, className, ...props }: TimelineProps) {
  return (
    <div className={cn("relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent", className)} {...props}>
      {items.map((item, index) => (
        <TimelineItemCard key={item.id} item={item} index={index} />
      ))}
    </div>
  );
}

function TimelineItemCard({ item, index }: { item: TimelineItem; index: number }) {
  const isCompleted = item.status === "completed";
  const isCurrent = item.status === "current";
  const isEven = index % 2 === 0;

  const Icon = item.icon || (isCompleted ? CheckCircle2 : (isCurrent ? Clock : Circle));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cn(
        "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-gray-950 bg-surface shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2",
          isCompleted ? "text-green-500 border-green-100 dark:border-green-900" : isCurrent ? "text-blue-500 border-blue-100 dark:border-blue-900" : "text-gray-400 border-gray-100 dark:border-gray-800"
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2">
            <h3 className={cn("font-bold text-lg", isCompleted ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300")}>
              {item.title}
            </h3>
            {item.category && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface text-slate-500 dark:text-slate-400">
                {item.category}
              </span>
            )}
          </div>
          {item.date && (
            <time className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {item.date}
            </time>
          )}
        </div>
        {item.description && (
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">
            {item.description}
          </p>
        )}
        {item.image && (
          <div className="mt-3 overflow-hidden rounded-lg">
            <img src={item.image} alt={item.title} className="w-full object-cover max-h-48 transition-transform hover:scale-105 duration-500" />
          </div>
        )}
      </div>
    </motion.div>
  );
}



