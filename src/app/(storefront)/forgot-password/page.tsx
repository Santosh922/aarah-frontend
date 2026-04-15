'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/apiClient';
import { sendForgotOtp } from '@/services/authService';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your email or phone number.');
      return;
    }

    setIsLoading(true);

    try {
      await sendForgotOtp({ identifier: identifier.trim() });
      setIsSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not connect to the server. Please check your internet connection.');
      }
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
              Enter your email address or phone number. We will send an OTP to your registered phone number.
            </p>

            <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-5">
              <div className="flex flex-col text-left">
                <input
                  type="text"
                  placeholder="EMAIL OR PHONE NUMBER"
                  value={identifier}
                  onChange={e => { setIdentifier(e.target.value); setError(''); }}
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
                  'Send OTP'
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
              OTP Sent
            </h1>

            <p className="font-sans text-[11px] text-gray-500 tracking-widest uppercase leading-relaxed mb-8">
              If an account exists for <span className="font-bold text-primary-dark">{identifier}</span>,
              we have sent an OTP to your registered phone number.
            </p>

            <Link
              href={`/reset-password?identifier=${encodeURIComponent(identifier.trim())}`}
              className="w-full bg-[#191919] text-white py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors shadow-md flex justify-center"
            >
              Continue to Verify OTP
            </Link>

            <button
              onClick={() => { setIsSubmitted(false); setError(''); }}
              className="font-sans text-[9px] text-gray-400 tracking-widest uppercase underline underline-offset-4 mt-8 hover:text-primary-dark transition-colors"
            >
              Didn&apos;t receive the OTP? Try again.
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
