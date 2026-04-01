'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

function getApiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = getApiUrl('/api/auth/admin/login');
      const res = await fetch(apiUrl, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server Error: ${res.status} ${res.statusText}. Check terminal logs.`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Authentication failed (Status: ${res.status}).`);
      }

      localStorage.setItem('aarah_admin_session', 'active');

      router.push('/admin/dashboard');
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Authentication failed. Please try again.';
      console.error('[ADMIN_LOGIN_CLIENT_ERROR]', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#333333] flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-[#191919] border border-gray-600 flex items-center justify-center overflow-hidden mb-4 shadow-lg">
          <img src="/assets/logo.png" alt="AARAH Logo" className="w-8 h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <span className="font-serif text-2xl font-bold tracking-widest text-white uppercase">AARAH</span>
        <span className="font-sans text-[8px] tracking-[0.4em] text-gray-400 uppercase mt-1 flex items-center">
          <ShieldCheck className="w-3 h-3 mr-1" /> SECURE ADMIN PORTAL
        </span>
      </div>

      <div className="bg-white w-full max-w-[440px] px-10 py-14 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <h1 className="font-sans text-[22px] tracking-[0.25em] mb-2 uppercase text-[#191919]">SIGN IN</h1>
          <p className="font-sans text-[9px] text-gray-400 tracking-[0.2em] uppercase">AUTHORIZED PERSONNEL ONLY</p>
        </div>

        <form onSubmit={handleAdminLogin} className="flex flex-col space-y-6">
          <div className="flex flex-col space-y-2">
            <label className="font-sans text-[8px] tracking-widest text-gray-500 uppercase font-bold">Email Address</label>
            <input type="email" placeholder="NAME@EXAMPLE.COM" value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              className="w-full bg-[#FAFAFA] border border-transparent focus:border-gray-300 px-4 py-3.5 outline-none text-[10px] font-sans tracking-widest uppercase transition-colors" />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="font-sans text-[8px] tracking-widest text-gray-500 uppercase font-bold">Password</label>
            <input type="password" placeholder="••••••••" value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              className="w-full bg-[#FAFAFA] border border-transparent focus:border-gray-300 px-4 py-3.5 outline-none text-[10px] font-sans tracking-widest transition-colors" />
          </div>

          {error && <p className="text-[9px] text-semantic-error tracking-widest uppercase font-bold text-center pt-2">{error}</p>}

          <button type="submit" disabled={isLoading}
            className={`w-full h-14 flex items-center justify-center space-x-2 font-sans text-[10px] font-bold tracking-[0.2em] uppercase transition-all mt-4 shadow-sm ${isLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#191919] text-white hover:bg-black'}`}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <><span>SIGN IN</span><ArrowRight className="w-3.5 h-3.5 ml-2" strokeWidth={2} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
