'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Loader2, MessageCircle, ChevronLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/apiClient';
import { loginEmail, register, resendRegisterOtp, sendLoginOtp, verifyLoginOtp, verifyRegisterOtp } from '@/services/authService';

type ModalView = 'SIGN_IN' | 'SIGN_UP' | 'PHONE' | 'OTP';
type OtpMode = 'LOGIN' | 'REGISTER';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const { setSession } = useAuth();
  const [view, setView] = useState<ModalView>('SIGN_IN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [phone, setPhone] = useState('');
  const [otpMode, setOtpMode] = useState<OtpMode>('LOGIN');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const otpLength = 6;

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setView('SIGN_IN');
        setEmail(''); setPassword(''); setFirstName(''); setLastName('');
        setPhone(''); setOtp(['', '', '', '', '', '']);
        setOtpMode('LOGIN');
        setError(null); setTimer(0);
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (timer <= 0 || view !== 'OTP') return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer, view]);

  const handleSuccess = (data: any, fallbackPhone?: string) => {
    const role = data?.user?.role || 'USER';
    onSuccess?.();
    onClose();
    window.location.href = role === 'ADMIN' ? '/admin' : '/account';
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const data = await loginEmail({ email, password });
      setSession({
        token: data.token,
        user: {
          name: `${data.user.firstName} ${data.user.lastName}`.trim(),
          phone: data.user.phoneNumber,
          email: data.user.email,
          customerId: String(data.user.id),
          role: data.user.role,
          status: data.user.status,
          phoneVerified: data.user.phoneVerified,
        },
      });
      handleSuccess(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Invalid credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(password)) { setError('Password must contain at least one uppercase letter'); return; }
    if (!/[a-z]/.test(password)) { setError('Password must contain at least one lowercase letter'); return; }
    if (!/\d/.test(password)) { setError('Password must contain at least one number'); return; }
    if (!/[@$!%*?&#]/.test(password)) { setError('Password must contain at least one special character'); return; }
    setIsLoading(true);
    try {
      const name = `${firstName} ${lastName}`.trim();
      await register({
        name,
        email,
        phoneNumber: phone,
        password,
      });
      setOtpMode('REGISTER');
      setOtp(['', '', '', '', '', '']);
      setView('OTP');
      setTimer(30);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err: any) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    setIsLoading(true);
    try {
      setOtpMode('LOGIN');
      await sendLoginOtp({ phoneNumber: phone });
      setOtp(['', '', '', '', '', '']);
      setView('OTP');
      setTimer(30);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err: any) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const otpCode = otp.join('').slice(0, otpLength);
    if (otpCode.length !== otpLength) return;
    setIsLoading(true);
    try {
      let data: any;
      if (otpMode === 'REGISTER') {
        data = await verifyRegisterOtp({ phoneNumber: phone, otp: otpCode });
        setSession({
          token: data.token,
          user: {
            name: `${data.user.firstName} ${data.user.lastName}`.trim(),
            phone: data.user.phoneNumber,
            email: data.user.email,
            customerId: String(data.user.id),
            role: data.user.role,
            status: data.user.status,
            phoneVerified: data.user.phoneVerified,
          },
        });
      } else {
        data = await verifyLoginOtp({ phoneNumber: phone, otp: otpCode });
        setSession({
          token: data.token,
          user: {
            name: `${data.user.firstName} ${data.user.lastName}`.trim(),
            phone: data.user.phoneNumber,
            email: data.user.email,
            customerId: String(data.user.id),
            role: data.user.role,
            status: data.user.status,
            phoneVerified: data.user.phoneVerified,
          },
        });
      }
      handleSuccess(data, phone);
    } catch (err: any) {
      if (err instanceof ApiError) setError(err.message);
      else setError(err.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs[0].current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < otpLength - 1) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs[index - 1].current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-[500px] shadow-2xl flex flex-col z-10 overflow-y-auto max-h-[95vh] scrollbar-none animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black transition-colors z-20">
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <div className="p-8 md:p-12">
          
          {view === 'SIGN_IN' && (
            <div className="animate-in fade-in duration-500">
              <div className="text-center mb-10">
                <h2 className="font-sans text-[32px] tracking-[0.25em] text-[#191919] uppercase mb-3">SIGN IN</h2>
                <p className="font-sans text-[10px] text-gray-500 tracking-[0.15em] uppercase">WELCOME BACK TO AARAH</p>
              </div>

              <form onSubmit={handleEmailSignIn} className="space-y-6">
                <div className="space-y-2 text-left">
                  <label className="font-sans text-[10px] tracking-[0.15em] text-gray-500 uppercase font-medium">EMAIL ADDRESS</label>
                  <input type="email" required placeholder="NAME@EXAMPLE.COM" value={email} onChange={e => {setEmail(e.target.value); setError(null);}}
                    className="w-full bg-[#FAFAFA] border-none px-4 py-4 text-[12px] font-sans text-[#191919] tracking-widest outline-none focus:ring-1 focus:ring-gray-200 transition-shadow placeholder:text-gray-400" />
                </div>
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center">
                    <label className="font-sans text-[10px] tracking-[0.15em] text-gray-500 uppercase font-medium">PASSWORD</label>
                    <a href="/forgot-password" onClick={onClose} className="font-sans text-[10px] tracking-[0.15em] text-gray-500 uppercase hover:text-[#191919] transition-colors">FORGOT?</a>
                  </div>
                  <input type="password" required placeholder="••••••••" value={password} onChange={e => {setPassword(e.target.value); setError(null);}}
                    className="w-full bg-[#FAFAFA] border-none px-4 py-4 text-[12px] font-sans text-[#191919] tracking-widest outline-none focus:ring-1 focus:ring-gray-200 transition-shadow placeholder:text-gray-400" />
                </div>

                {error && <p className="text-[10px] text-semantic-error tracking-widest uppercase font-bold text-center">{error}</p>}

                <button type="submit" disabled={isLoading}
                  className="w-full py-4 mt-2 bg-[#191919] text-white flex items-center justify-center font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors disabled:opacity-70">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>SIGN IN</span><ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} /></>}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                <p className="font-sans text-[11px] tracking-[0.15em] text-gray-500 uppercase mb-4">NEW TO AARAH?</p>
                <button type="button" onClick={() => {setView('SIGN_UP'); setError(null);}} className="font-sans text-[12px] font-bold tracking-[0.2em] text-[#191919] uppercase hover:text-gray-500 transition-colors">
                  CREATE AN ACCOUNT
                </button>
                <div className="mt-8">
                  <button type="button" onClick={() => {setView('PHONE'); setError(null);}} className="text-gray-400 flex items-center justify-center mx-auto space-x-1 font-sans text-[9px] tracking-[0.1em] uppercase hover:text-[#191919] transition-colors">
                    <MessageCircle className="w-3 h-3"/><span>Or sign in with WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'SIGN_UP' && (
            <div className="animate-in fade-in duration-500">
              <div className="text-center mb-10">
                <h2 className="font-sans text-[32px] tracking-[0.25em] text-[#191919] uppercase mb-3">SIGN UP</h2>
                <p className="font-sans text-[10px] text-gray-500 tracking-[0.15em] uppercase">JOIN THE AARAH COMMUNITY</p>
              </div>

              <form onSubmit={handleEmailSignUp} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <label className="font-sans text-[10px] tracking-[0.15em] text-gray-500 uppercase font-medium">FIRST NAME</label>
                    <input type="text" required placeholder="YOUR FIRST NAME" value={firstName} onChange={e => setFirstName(e.target.value)}
                      className="w-full bg-[#FAFAFA] border-none px-4 py-4 text-[10px] sm:text-[11px] font-sans text-[#191919] tracking-widest outline-none focus:ring-1 focus:ring-gray-200 transition-shadow placeholder:text-gray-400" />
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="font-sans text-[10px] tracking-[0.15em] text-gray-500 uppercase font-medium">LAST NAME</label>
                    <input type="text" placeholder="YOUR LAST NAME" value={lastName} onChange={e => setLastName(e.target.value)}
                      className="w-full bg-[#FAFAFA] border-none px-4 py-4 text-[10px] sm:text-[11px] font-sans text-[#191919] tracking-widest outline-none focus:ring-1 focus:ring-gray-200 transition-shadow placeholder:text-gray-400" />
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  <label className="font-sans text-[10px] tracking-[0.15em] text-gray-500 uppercase font-medium">PHONE NUMBER</label>
                  <div className="flex h-[52px] bg-[#FAFAFA] focus-within:ring-1 focus-within:ring-gray-200 transition-shadow">
                    <div className="flex items-center justify-center px-4 border-r border-white text-gray-400 text-[12px] font-sans">+91</div>
                    <input type="tel" maxLength={10} required placeholder="10-DIGIT NUMBER" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError(null); }}
                      className="flex-1 bg-transparent px-4 outline-none text-[12px] font-sans text-[#191919] tracking-widest placeholder:text-gray-400" />
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  <label className="font-sans text-[10px] tracking-[0.15em] text-gray-500 uppercase font-medium">EMAIL ADDRESS</label>
                  <input type="email" required placeholder="NAME@EXAMPLE.COM" value={email} onChange={e => {setEmail(e.target.value); setError(null);}}
                    className="w-full bg-[#FAFAFA] border-none px-4 py-4 text-[12px] font-sans text-[#191919] tracking-widest outline-none focus:ring-1 focus:ring-gray-200 transition-shadow placeholder:text-gray-400" />
                </div>
                <div className="space-y-2 text-left">
                  <label className="font-sans text-[10px] tracking-[0.15em] text-gray-500 uppercase font-medium">PASSWORD</label>
                  <input type="password" required minLength={8} placeholder="MINIMUM 8 CHARACTERS" value={password} onChange={e => {setPassword(e.target.value); setError(null);}}
                    className="w-full bg-[#FAFAFA] border-none px-4 py-4 text-[12px] font-sans text-[#191919] tracking-widest outline-none focus:ring-1 focus:ring-gray-200 transition-shadow placeholder:text-gray-400" />
                </div>

                <div className="pt-2 text-center">
                  <p className="font-sans text-[9px] text-gray-500 tracking-[0.15em] uppercase leading-relaxed">
                    I AGREE TO THE <a href="/terms" className="underline underline-offset-4 hover:text-[#191919]">TERMS OF SERVICE</a> AND <a href="/terms" className="underline underline-offset-4 hover:text-[#191919]">PRIVACY POLICY</a>
                  </p>
                </div>

                {error && <p className="text-[10px] text-semantic-error tracking-widest uppercase font-bold text-center">{error}</p>}

                <button type="submit" disabled={isLoading}
                  className="w-full py-4 mt-2 bg-[#191919] text-white flex items-center justify-center font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors disabled:opacity-70">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>CREATE ACCOUNT</span><ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} /></>}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                <p className="font-sans text-[11px] tracking-[0.15em] text-gray-500 uppercase mb-4">ALREADY HAVE AN ACCOUNT?</p>
                <button type="button" onClick={() => {setView('SIGN_IN'); setError(null);}} className="font-sans text-[12px] font-bold tracking-[0.2em] text-[#191919] uppercase hover:text-gray-500 transition-colors">
                  SIGN IN HERE
                </button>
                <div className="mt-8">
                  <button type="button" onClick={() => {setView('PHONE'); setError(null);}} className="text-gray-400 flex items-center justify-center mx-auto space-x-1 font-sans text-[9px] tracking-[0.1em] uppercase hover:text-[#191919] transition-colors">
                    <MessageCircle className="w-3 h-3"/><span>Or sign up with WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {(view === 'PHONE' || view === 'OTP') && (
            <div className="animate-in fade-in duration-500">
              <button type="button" onClick={() => {setView('SIGN_IN'); setError(null);}} className="mb-6 font-sans text-[10px] text-gray-400 tracking-[0.15em] uppercase hover:text-[#191919] flex items-center transition-colors">
                <ChevronLeft className="w-3 h-3 mr-1" /> BACK TO EMAIL
              </button>

              <div className="text-center mb-10">
                <h2 className="font-sans text-[28px] tracking-[0.25em] text-[#191919] uppercase mb-3">
                  {view === 'PHONE' ? 'WHATSAPP LOGIN' : 'VERIFY CODE'}
                </h2>
                <p className="font-sans text-[10px] text-gray-500 tracking-[0.15em] uppercase leading-relaxed">
                  {view === 'PHONE'
                    ? 'FAST, PASSWORDLESS AUTHENTICATION.'
                    : `${otpMode === 'REGISTER' ? 'VERIFY YOUR REGISTRATION CODE' : 'SENT TO'} +91 ${phone}`}
                </p>
              </div>

              {view === 'PHONE' ? (
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="space-y-2 text-left">
                    <label className="font-sans text-[10px] tracking-[0.15em] text-gray-500 uppercase font-medium">MOBILE NUMBER</label>
                    <div className="flex h-[52px] bg-[#FAFAFA] focus-within:ring-1 focus-within:ring-gray-200 transition-shadow">
                      <div className="flex items-center justify-center px-4 border-r border-white text-gray-400 text-[12px] font-sans">+91</div>
                      <input type="tel" maxLength={10} required placeholder="10-DIGIT NUMBER" value={phone} onChange={e => {setPhone(e.target.value.replace(/\D/g, '')); setError(null);}}
                        className="flex-1 bg-transparent px-4 outline-none text-[12px] font-sans text-[#191919] tracking-widest placeholder:text-gray-400" />
                    </div>
                  </div>

                  {error && <p className="text-[10px] text-semantic-error tracking-widest uppercase font-bold text-center">{error}</p>}

                  <button type="submit" disabled={isLoading || phone.length !== 10}
                    className="w-full py-4 bg-[#191919] text-white flex items-center justify-center font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors disabled:opacity-70">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>GET OTP</span><ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-between gap-3 mb-6">
                    {otp.slice(0, otpLength).map((digit, i) => (
                      <input key={i} ref={otpRefs[i]} type="tel" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                        className={`w-full h-16 text-center text-xl font-sans font-medium bg-[#FAFAFA] border-none transition-shadow outline-none focus:ring-1 focus:ring-gray-200 ${digit ? 'text-[#191919]' : 'text-gray-400'}`} />
                    ))}
                  </div>

                  {error && <p className="text-[10px] text-semantic-error tracking-widest uppercase font-bold text-center">{error}</p>}

                  <button type="submit" disabled={isLoading || otp.join('').slice(0, otpLength).length !== otpLength}
                    className="w-full py-4 bg-[#191919] text-white flex items-center justify-center font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors disabled:opacity-70">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>VERIFY CODE</span><CheckCircle2 className="w-4 h-4 ml-2" strokeWidth={1.5} /></>}
                  </button>

                  <div className="text-center pt-4">
                    {timer > 0 ? (
                      <span className="font-sans text-[10px] text-gray-400 tracking-widest uppercase flex items-center justify-center">
                        <RefreshCw className="w-3 h-3 mr-2 opacity-50" /> RESEND IN 00:{timer < 10 ? `0${timer}` : timer}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (otpMode === 'REGISTER') {
                            setError(null);
                            setIsLoading(true);
                            resendRegisterOtp({ phoneNumber: phone })
                              .then(() => {
                                setOtp(['', '', '', '', '', '']);
                                setTimer(30);
                                setTimeout(() => otpRefs[0].current?.focus(), 100);
                              })
                              .catch((err: unknown) => {
                                if (err instanceof ApiError) setError(err.message);
                                else setError('Failed to resend OTP');
                              })
                              .finally(() => setIsLoading(false));
                          } else {
                            handleSendOtp();
                          }
                        }}
                        className="font-sans text-[10px] font-bold text-[#191919] tracking-[0.15em] uppercase hover:text-gray-500 transition-colors underline underline-offset-4"
                      >
                        RESEND CODE
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
