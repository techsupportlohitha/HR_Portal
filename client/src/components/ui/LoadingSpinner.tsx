import { Loader2 } from "lucide-react";

export function LoadingSpinner({ className }: { className?: string }) {
 return (
 <div className="flex h-full w-full items-center justify-center p-4" role="status" aria-label="Loading">
 <Loader2 aria-hidden="true" className={`h-8 w-8 animate-spin text-primary-500 ${className || ''}`} />
 </div>
 );
}
