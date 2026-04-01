'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

export interface AddressData {
  id?: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
}

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: AddressData) => void;
  initialData?: AddressData | null;
}

export default function AddressModal({ isOpen, onClose, onSave, initialData }: AddressModalProps) {
  const [form, setForm] = useState<AddressData>({ name: '', phone: '', address: '', city: '', state: '', postalCode: '' });

  useEffect(() => {
    if (isOpen) setForm(initialData || { name: '', phone: '', address: '', city: '', state: '', postalCode: '' });
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[500px] shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-sans text-[14px] tracking-[0.2em] font-bold text-[#191919] uppercase">{initialData ? 'Edit Address' : 'Add New Address'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-black transition-colors"><X className="w-5 h-5" strokeWidth={1.5} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="FULL NAME" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-[#FAFAFA] px-4 py-3 outline-none text-[11px] font-sans tracking-widest text-[#191919] border-b-2 border-transparent focus:border-[#191919] transition-colors placeholder:text-gray-400" />
            <input required placeholder="PHONE (10 DIGITS)" value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="bg-[#FAFAFA] px-4 py-3 outline-none text-[11px] font-sans tracking-widest text-[#191919] border-b-2 border-transparent focus:border-[#191919] transition-colors placeholder:text-gray-400" />
          </div>
          <input required placeholder="ADDRESS (HOUSE NO, BUILDING, STREET)" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-[#FAFAFA] px-4 py-3 outline-none text-[11px] font-sans tracking-widest text-[#191919] border-b-2 border-transparent focus:border-[#191919] transition-colors placeholder:text-gray-400" />
          <div className="grid grid-cols-3 gap-4">
            <input required placeholder="CITY" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="col-span-1 bg-[#FAFAFA] px-4 py-3 outline-none text-[11px] font-sans tracking-widest text-[#191919] border-b-2 border-transparent focus:border-[#191919] transition-colors placeholder:text-gray-400" />
            <input required placeholder="STATE" value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="col-span-1 bg-[#FAFAFA] px-4 py-3 outline-none text-[11px] font-sans tracking-widest text-[#191919] border-b-2 border-transparent focus:border-[#191919] transition-colors placeholder:text-gray-400" />
            <input required placeholder="PINCODE" value={form.postalCode} onChange={e => setForm({...form, postalCode: e.target.value.replace(/\D/g, '').slice(0, 6)})} className="col-span-1 bg-[#FAFAFA] px-4 py-3 outline-none text-[11px] font-sans tracking-widest text-[#191919] border-b-2 border-transparent focus:border-[#191919] transition-colors placeholder:text-gray-400" />
          </div>
          <button type="submit" className="w-full mt-4 py-4 bg-[#191919] text-white flex items-center justify-center font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors">
            <span>SAVE ADDRESS</span><ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
