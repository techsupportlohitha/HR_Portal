import React, { useState } from "react";
import { cn } from "@/lib/utils"; // Assuming standard shadcn utility

export interface RadioOption {
 id: string;
 value: string;
 label: string | React.ReactNode;
}

interface AnimatedRadioProps {
 options: RadioOption[];
 value?: string;
 onChange?: (value: string) => void;
 className?: string;
 name?: string;
}

export default function AnimatedRadio({ options, value, onChange, className, name }: AnimatedRadioProps) {
 // If used as an uncontrolled component fallback, though in sidebar it'll be controlled
 const [internalValue, setInternalValue] = useState(options[0]?.value || "");
 const selectedValue = value !== undefined ? value : internalValue;

 const handleChange = (val: string) => {
 setInternalValue(val);
 if (onChange) onChange(val);
 };

 const getGliderTransform = () => {
 const index = options.findIndex((option) => option.value === selectedValue);
 // Fallback to 0 if not found
 return `translateY(${Math.max(0, index) * 100}%)`;
 };

 return (
 <div className={cn("flex items-center", className)}>
 <div className="relative flex flex-col pl-3 w-full">
 {options.map((option) => (
 <div key={option.id} className="relative z-20 py-1">
 <input
 id={option.id}
 name={name || "animated-radio"}
 type="radio"
 value={option.value}
 checked={selectedValue === option.value}
 onChange={(e) => handleChange(e.target.value)}
 className="sr-only"
 />
 <label
 htmlFor={option.id}
 onClick={(e) => {
 e.preventDefault();
 handleChange(option.value);
 }}
 className={`cursor-pointer text-sm font-medium py-3 px-4 block transition-all duration-300 ease-in-out ${
 selectedValue === option.value
 ? 'text-teal-600 dark:text-teal-400'
 : 'text-slate-600 dark:text-slate-400 hover:text-teal-500/80 dark:hover:text-teal-300/80'
 }`}
 >
 {option.label}
 </label>
 </div>
 ))}

 <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent">
 <div
 className="relative w-full bg-gradient-to-b from-transparent via-teal-600 dark:via-teal-500 to-transparent transition-transform duration-500 ease-[cubic-bezier(0.37,1.95,0.66,0.56)]"
 style={{ 
 transform: getGliderTransform(),
 height: `${100 / options.length}%` 
 }}
 >
 <div className="absolute top-1/2 -translate-y-1/2 h-3/5 w-[300%] bg-teal-600 dark:bg-teal-500 blur-[6px] opacity-70" />
 <div className="absolute left-0 h-full w-36 bg-gradient-to-r from-teal-600/20 dark:from-teal-500/20 to-transparent pointer-events-none" />
 </div>
 </div>
 </div>
 </div>
 );
}
