import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, BadgeCheck, Briefcase, Building2, ExternalLink, ShieldCheck } from 'lucide-react';
import { employeesApi } from '@/api/employees';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { profilePhotoUrl as resolveProfilePhotoUrl } from '@/utils/profilePhotoUrl';

const companyUrl = 'https://www.pattabhiagro.com/pafpl/index.html';

export default function PublicEmployeeVerificationPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-employee-card', token],
    queryFn: () => employeesApi.getPublicCard(token),
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60_000,
  });
  const employee = data?.data;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:py-16">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Pattabhi Agro Foods</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Employee pass verification</h1>
          <p className="mt-2 text-sm text-slate-300">Public work identity pass</p>
        </header>

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8" aria-live="polite">
          {isLoading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}
          {!isLoading && (isError || !employee) && (
            <div className="py-8 text-center">
              <p className="font-semibold text-white">This pass can’t be verified</p>
              <p className="mt-2 text-sm text-slate-300">It may be invalid or the employee may no longer be active.</p>
            </div>
          )}
          {employee && (
            <>
              <div className="flex flex-col items-center text-center">
                {employee.profilePhoto ? (
                  <img
                    src={resolveProfilePhotoUrl(employee.profilePhoto)}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    className="h-24 w-24 rounded-3xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-teal-500 text-3xl font-bold text-white">
                    {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                  </div>
                )}
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified employee
                </span>
                <h2 className="mt-4 text-2xl font-bold">{employee.firstName} {employee.lastName}</h2>
                <p className="mt-1 text-emerald-300">{employee.designation || 'Employee'}</p>
              </div>

              <dl className="mt-7 grid gap-3 border-t border-slate-700 pt-6 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-800/70 p-4">
                  <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400"><Briefcase className="h-4 w-4" /> Employee ID</dt>
                  <dd className="mt-2 font-semibold">{employee.employeeCode}</dd>
                </div>
                <div className="rounded-2xl bg-slate-800/70 p-4">
                  <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400"><Building2 className="h-4 w-4" /> Department</dt>
                  <dd className="mt-2 font-semibold">{employee.department?.name || '—'}</dd>
                </div>
              </dl>
              <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">This public pass displays work identity details only. Personal contact, payroll, and employment records remain private.</p>
            </>
          )}
        </section>

        <a href={companyUrl} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-between rounded-2xl bg-emerald-500 px-5 py-4 font-semibold text-white transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950">
          <span>Visit Pattabhi Agro Foods website</span><ExternalLink className="h-5 w-5" aria-hidden="true" />
        </a>
        <Link to="/login" className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white">HR Portal sign in <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </main>
  );
}

