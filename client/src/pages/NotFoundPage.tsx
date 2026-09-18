import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="flex min-h-[60vh] items-center justify-center" aria-labelledby="not-found-title">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-surface p-8 text-center shadow-sm dark:border-slate-700  sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-500">404</p>
        <h1 id="not-found-title" className="mt-3 text-3xl font-bold text-navy-900 dark:text-white">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
          This page may have moved, or you may not have access to it. Return to a known page to continue working.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Go back
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
            Dashboard
          </Button>
        </div>
      </div>
    </section>
  );
}

