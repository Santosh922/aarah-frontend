'use client';

import { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ApiError } from '@/lib/apiClient';
import { resetPassword, verifyForgotOtp } from '@/services/authService';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const queryIdentifier = searchParams.get('identifier') || '';

  const [identifier, setIdentifier] = useState(queryIdentifier);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpVerified, setOtpVerified] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const otpCode = useMemo(() => otp.join(''), [otp]);

  const validatePassword = () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return false; }
    if (!/[A-Z]/.test(password)) { setError('Password must contain at least one uppercase letter'); return false; }
    if (!/[a-z]/.test(password)) { setError('Password must contain at least one lowercase letter'); return false; }
    if (!/\d/.test(password)) { setError('Password must contain at least one number'); return false; }
    if (!/[@$!%*?&#]/.test(password)) { setError('Password must contain at least one special character'); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match. Please try again.'); return false; }
    return true;
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) { setError('Please enter email or phone number.'); return; }
    if (otpCode.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }

    setIsLoading(true);
    try {
      await verifyForgotOtp({ identifier: identifier.trim(), otp: otpCode });
      setOtpVerified(true);
      setError('');
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Could not verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      await resetPassword({ identifier: identifier.trim(), newPassword: password });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Could not connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!identifier.trim() && !isSuccess) {
    return (
      <div className="flex flex-col items-center text-center mt-2">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100">
          <AlertTriangle className="w-5 h-5 text-semantic-error" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-2xl text-primary-dark mb-4 tracking-widest uppercase">
          Missing Identifier
        </h1>
        <p className="font-sans text-[11px] text-gray-500 tracking-widest uppercase leading-relaxed mb-8">
          Start from forgot password to request OTP first.
        </p>
        <Link
          href="/forgot-password"
          className="w-full bg-[#191919] text-white py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors shadow-md flex justify-center"
        >
          Go to Forgot Password
        </Link>
      </div>
    );
  }

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
          Your password has been successfully reset. You can now sign in.
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
        Reset Password
      </h1>

      {!otpVerified ? (
        <>
          <p className="font-sans text-[11px] text-gray-500 tracking-widest uppercase leading-relaxed mb-8">
            Enter the 6-digit OTP sent to your registered phone.
          </p>
          <form onSubmit={handleVerifyOtp} className="w-full flex flex-col space-y-6">
            <div className="flex flex-col text-left">
              <input
                type="text"
                placeholder="EMAIL OR PHONE NUMBER"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setError(''); }}
                className="bg-[#F9F9F9] px-4 py-4 outline-none text-[10px] font-sans tracking-widest text-primary-dark border-b-2 border-transparent focus:border-primary-dark transition-colors"
              />
            </div>
            <div className="grid grid-cols-6 gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  type="tel"
                  maxLength={1}
                  value={digit}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '').slice(-1);
                    const next = [...otp];
                    next[idx] = value;
                    setOtp(next);
                    setError('');
                  }}
                  className="h-12 text-center text-lg font-sans bg-[#F9F9F9] outline-none border-b-2 border-transparent focus:border-primary-dark"
                />
              ))}
            </div>
            {error && <span className="text-[9px] text-semantic-error tracking-widest uppercase mt-2">{error}</span>}
            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6}
              className={`w-full flex items-center justify-center py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase transition-all shadow-md mt-2 ${
                isLoading || otpCode.length !== 6
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#191919] text-white hover:bg-black'
              }`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify OTP'}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="font-sans text-[11px] text-gray-500 tracking-widest uppercase leading-relaxed mb-8">
            Enter your new password.
          </p>
          <form onSubmit={handleResetPassword} className="w-full flex flex-col space-y-6">
            <div className="flex flex-col text-left relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="NEW PASSWORD"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="bg-[#F9F9F9] px-4 py-4 outline-none text-[10px] font-sans tracking-widest text-primary-dark border-b-2 border-transparent focus:border-primary-dark transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-dark transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex flex-col text-left">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="CONFIRM NEW PASSWORD"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                className="bg-[#F9F9F9] px-4 py-4 outline-none text-[10px] font-sans tracking-widest text-primary-dark border-b-2 border-transparent focus:border-primary-dark transition-colors"
              />
            </div>
            {error && <span className="text-[9px] text-semantic-error tracking-widest uppercase mt-2">{error}</span>}
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className={`w-full flex items-center justify-center py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase transition-all shadow-md mt-2 ${
                isLoading || !password || !confirmPassword
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#191919] text-white hover:bg-black'
              }`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

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
