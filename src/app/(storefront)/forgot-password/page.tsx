'use client';

import { useState } from 'react';
import { API_URL } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, MailCheck, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail]           = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      // ── Always show the success screen regardless of whether the email
      //    exists in the DB. This prevents user enumeration attacks where
      //    an attacker could probe which emails are registered. ────────────
      if (res.ok || res.status === 404) {
        setIsSubmitted(true);
        return;
      }

      // Only surface a real error for genuine server failures (5xx)
      const data = await res.json().catch(() => ({}));
      setError(data.error || `Something went wrong (${res.status}). Please try again.`);

    } catch {
      setError('Could not connect to the server. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4 py-20">

      <div className="w-full max-w-md bg-white p-8 md:p-12 shadow-2xl border border-gray-100 relative">

        <Link
          href="/"
          className="absolute top-6 left-6 text-gray-400 hover:text-primary-dark transition-colors"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </Link>

        {!isSubmitted ? (
          <div className="flex flex-col items-center text-center mt-4">
            <h1 className="font-serif text-3xl text-primary-dark mb-4 tracking-widest uppercase">
              Reset Password
            </h1>
            <p className="font-sans text-[11px] text-gray-500 tracking-widest uppercase leading-relaxed mb-8">
              Enter the email address associated with your account, and we will send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-5">
              <div className="flex flex-col text-left">
                <input
                  type="email"
                  placeholder="EMAIL ADDRESS"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className={`bg-[#F9F9F9] px-4 py-4 outline-none text-[10px] font-sans tracking-widest text-primary-dark border-b-2 transition-colors ${
                    error ? 'border-red-500' : 'border-transparent focus:border-primary-dark'
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
                disabled={isLoading}
                className={`w-full flex items-center justify-center py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase transition-all shadow-md mt-2 ${
                  isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#191919] text-white hover:bg-black'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-[#F6FBF7] border border-[#E8F3EA] rounded-full flex items-center justify-center mb-6">
              <MailCheck className="w-8 h-8 text-green-600" strokeWidth={1.5} />
            </div>

            <h1 className="font-serif text-2xl text-primary-dark mb-4 tracking-widest uppercase">
              Check Your Email
            </h1>

            <p className="font-sans text-[11px] text-gray-500 tracking-widest uppercase leading-relaxed mb-8">
              If an account exists for <span className="font-bold text-primary-dark">{email}</span>,
              we've sent a password reset link. Check your inbox and spam folder.
            </p>

            <Link
              href="/"
              className="w-full bg-[#191919] text-white py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors shadow-md flex justify-center"
            >
              Back to Home
            </Link>

            <button
              onClick={() => { setIsSubmitted(false); setError(''); }}
              className="font-sans text-[9px] text-gray-400 tracking-widest uppercase underline underline-offset-4 mt-8 hover:text-primary-dark transition-colors"
            >
              Didn't receive the email? Try again.
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
