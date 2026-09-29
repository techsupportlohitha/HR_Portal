import { useEffect, useState } from 'react';

const ANIMATION_DURATION_MS = 350;

export function CountUp({ end, prefix = '', suffix = '' }: { end: number; prefix?: string; suffix?: string }) {
 const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const [value, setValue] = useState(reduceMotion ? end : 0);

 useEffect(() => {
 if (reduceMotion) {
 setValue(end);
 return;
 }

 const startedAt = Date.now();
 const timer = window.setInterval(() => {
 const progress = Math.min((Date.now() - startedAt) / ANIMATION_DURATION_MS, 1);
 const easedProgress = 1 - Math.pow(1 - progress, 3);
 setValue(Math.round(end * easedProgress));

 if (progress === 1) {
 window.clearInterval(timer);
 }
 }, 16);

 return () => window.clearInterval(timer);
 }, [end, reduceMotion]);

 return (
 <span className="tabular-nums whitespace-nowrap">
 <span className="sr-only">{`${prefix}${end}${suffix}`}</span>
 <span aria-hidden="true">{`${prefix}${value}${suffix}`}</span>
 </span>
 );
}
