import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/auth';
import toast from 'react-hot-toast';
import { Briefcase } from 'lucide-react';
import { AnimatedForm } from '@/components/ui/modern-animated-sign-in';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    
    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password });
      if (response.success) {
        login(response.data.token, response.data.user);
        toast.success('Login successful');
        navigate('/dashboard');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Login failed. Please check your credentials and try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const formFields = {
    header: 'Welcome back',
    subHeader: 'Sign in to your HR Portal',
    fields: [
      {
        label: 'Username / Email',
        required: true,
        type: 'text' as const,
        placeholder: 'Enter your username or email',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          setEmail(event.target.value),
      },
      {
        label: 'Password',
        required: true,
        type: 'password' as const,
        placeholder: 'Enter your password',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          setPassword(event.target.value),
      },
    ],
    submitButton: isLoading ? 'Signing in...' : 'Sign in',
    
    errorField: errorMsg || undefined,
  };

  return (
    <div className="min-h-screen flex font-sans bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Decorative background blobs to make transparency visible */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 dark:bg-blue-900/30 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 dark:bg-indigo-900/30 blur-3xl"></div>
      </div>

      <div className="w-full flex flex-col items-center justify-center p-4 lg:p-8 relative z-10">
        {/* Transparent Glass Card Container */}
        <div className="w-full max-w-md backdrop-blur-xl bg-surface/60  border border-white/40 dark:border-gray-800/60 shadow-2xl rounded-3xl p-8 lg:p-10 relative overflow-hidden">
          {/* Subtle inner shine */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent dark:from-white/5 opacity-50 pointer-events-none"></div>
          
          <div className="text-center mb-8 relative z-10">
            <div className="mx-auto bg-accent-500 rounded-lg w-12 h-12 flex items-center justify-center mb-6 shadow-md">
              <Briefcase className="w-7 h-7 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="relative z-10">
            <AnimatedForm
              {...formFields}
              fieldPerRow={1}
              onSubmit={handleLoginSubmit}
              goTo={(e) => { e.preventDefault(); toast.error('Forgot password flow not implemented'); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

