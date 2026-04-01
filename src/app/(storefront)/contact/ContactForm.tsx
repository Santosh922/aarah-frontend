'use client';

import { API_URL } from '@/lib/api';
import { Check } from 'lucide-react';
import { useState } from 'react';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const response = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (response.ok) {
        setStatus('success');
        setName(''); setEmail(''); setSubject(''); setMessage('');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="YOUR NAME" 
          className="w-full border-b border-gray-300 py-3 text-[10px] font-sans tracking-widest uppercase text-primary-dark placeholder-gray-400 focus:outline-none focus:border-primary-dark transition-colors bg-transparent" />
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="EMAIL ADDRESS" 
          className="w-full border-b border-gray-300 py-3 text-[10px] font-sans tracking-widest uppercase text-primary-dark placeholder-gray-400 focus:outline-none focus:border-primary-dark transition-colors bg-transparent" />
      </div>

      <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="SUBJECT" 
        className="w-full border-b border-gray-300 py-3 text-[10px] font-sans tracking-widest uppercase text-primary-dark placeholder-gray-400 focus:outline-none focus:border-primary-dark transition-colors bg-transparent" />

      <textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="YOUR MESSAGE" rows={4}
        className="w-full border-b border-gray-300 py-3 text-[10px] font-sans tracking-widest uppercase text-primary-dark placeholder-gray-400 focus:outline-none focus:border-primary-dark transition-colors bg-transparent resize-none" />

      <button 
        type="submit" 
        disabled={status === 'loading' || status === 'success'}
        className={`w-full md:w-auto md:self-start px-12 py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-sm flex items-center justify-center
          ${status === 'idle' ? 'bg-[#191919] text-white hover:bg-black' : ''}
          ${status === 'loading' ? 'bg-gray-400 text-white cursor-not-allowed' : ''}
          ${status === 'success' ? 'bg-green-600 text-white' : ''}
          ${status === 'error' ? 'bg-red-600 text-white' : ''}
        `}
      >
        {status === 'idle' && 'Send Message'}
        {status === 'loading' && 'Sending...'}
        {status === 'success' && <><Check className="w-4 h-4 mr-2" /> Message Sent</>}
        {status === 'error' && 'Error - Try Again'}
      </button>
    </form>
  );
}
