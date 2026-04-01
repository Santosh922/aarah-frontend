'use client';

import { useState, useEffect, Suspense } from 'react';
import { API_URL } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

// ── Inner component uses useSearchParams — must be inside Suspense ────────────
function ResetPasswordContent() {
  const searchParams = useSearchParams();

  // ── FIX: Read the reset token from the URL query param ───────────────────
  // Your backend email will send a link like:
  //   https://yoursite.com/reset-password?token=<JWT_OR_UUID>
  const token = searchParams.get('token');

  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);

  const [isLoading, setIsLoading]   = useState(false);
  const [isSuccess, setIsSuccess]   = useState(false);
  const [error, setError]           = useState('');

  // ── Guard: if there's no token in the URL, show an invalid-link screen ───
  if (!token) {
    return (
      <div className="flex flex-col items-center text-center mt-2">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100">
          <AlertTriangle className="w-5 h-5 text-semantic-error" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-2xl text-primary-dark mb-4 tracking-widest uppercase">
          Invalid Link
        </h1>
        <p className="font-sans text-[11px] text-gray-500 tracking-widest uppercase leading-relaxed mb-8">
          This password reset link is missing or invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="w-full bg-[#191919] text-white py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors shadow-md flex justify-center"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setIsLoading(true);

    try {
      // ── FIX: Real API call — sends the token + new password to backend ──
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Common backend error cases:
        // 400 — token expired or already used
        // 404 — token not found
        setError(data.error || 'This link has expired or has already been used. Please request a new one.');
        return;
      }

      setIsSuccess(true);

    } catch {
      setError('Could not connect to the server. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-16 h-16 bg-[#F6FBF7] border border-[#E8F3EA] rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-600" strokeWidth={1.5} />
        </div>

        <h1 className="font-serif text-2xl text-primary-dark mb-4 tracking-widest uppercase">
          Password Reset
        </h1>

        <p className="font-sans text-[11px] text-gray-500 tracking-widest uppercase leading-relaxed mb-8">
          Your password has been successfully reset. You can now log in with your new password.
        </p>

        <Link
          href="/"
          className="w-full bg-[#191919] text-white py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors shadow-md flex justify-center"
        >
          Continue to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center mt-2">
      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
        <KeyRound className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />
      </div>

      <h1 className="font-serif text-3xl text-primary-dark mb-4 tracking-widest uppercase">
        New Password
      </h1>
      <p className="font-sans text-[11px] text-gray-500 tracking-widest uppercase leading-relaxed mb-8">
        Your new password must be at least 8 characters and different from previously used passwords.
      </p>

      <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-6">

        {/* New password */}
        <div className="flex flex-col text-left relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="NEW PASSWORD"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            className={`bg-[#F9F9F9] px-4 py-4 outline-none text-[10px] font-sans tracking-widest text-primary-dark border-b-2 transition-colors pr-12 ${
              error && error.includes('8 characters') ? 'border-red-500' : 'border-transparent focus:border-primary-dark'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-dark transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Confirm password */}
        <div className="flex flex-col text-left">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="CONFIRM NEW PASSWORD"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
            className={`bg-[#F9F9F9] px-4 py-4 outline-none text-[10px] font-sans tracking-widest text-primary-dark border-b-2 transition-colors ${
              error && error.includes('match') ? 'border-red-500' : 'border-transparent focus:border-primary-dark'
            }`}
          />
          {error && (
            <span className="text-[9px] text-semantic-error tracking-widest uppercase mt-2">
              {error}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !password || !confirmPassword}
          className={`w-full flex items-center justify-center py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase transition-all shadow-md mt-4 ${
            isLoading || !password || !confirmPassword
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#191919] text-white hover:bg-black'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Resetting...</span>
            </div>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </div>
  );
}

// ── Wrapper — required because useSearchParams needs Suspense in Next.js ─────
export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4 py-20">
      <div className="w-full max-w-md bg-white p-8 md:p-12 shadow-2xl border border-gray-100 relative">
        <Suspense fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        }>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </main>
  );
}
