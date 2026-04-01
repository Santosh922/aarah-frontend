'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AddressFormProps {
  initialData?: {
    name: string;
    phone: string;
    postalCode: string;
    city: string;
    address: string;
  };
  onSave: (addressData: any) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function AddressForm({ 
  initialData, 
  onSave, 
  onCancel, 
  submitLabel = "Save Address" 
}: AddressFormProps) {
  
  // Set initial state (empty if new address, filled if editing)
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    postalCode: initialData?.postalCode || '',
    city: initialData?.city || '',
    address: initialData?.address || ''
  });
  
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);

  // The Pincode logic is now safely isolated inside this component!
  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = e.target.value.replace(/\D/g, ''); 
    setFormData({ ...formData, postalCode: pin });

    if (pin.length === 6) {
      setIsPincodeLoading(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        if (!res.ok) throw new Error("API Error");
        
        const data = await res.json();
        if (data && data[0].Status === 'Success') {
          const city = data[0].PostOffice[0].District;
          setFormData(prev => ({ ...prev, city: city }));
        }
      } catch (error) {
        // Silent fail
      } finally {
        setIsPincodeLoading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.postalCode || !formData.city || !formData.phone) {
      return alert("Please fill out all required fields.");
    }
    // Send the data back up to whatever page is using this component
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-2">
          <label className="font-sans text-[9px] tracking-widest text-gray-400 uppercase">Full Name</label>
          <input type="text" placeholder="e.g. Jane Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#F9F9F9] border border-gray-200 px-4 py-3 outline-none text-[11px] font-sans text-primary-dark uppercase tracking-widest focus:border-gray-400 transition-colors" />
        </div>
        
        <div className="space-y-2">
          <label className="font-sans text-[9px] tracking-widest text-gray-400 uppercase">Phone Number</label>
          <input type="tel" maxLength={10} placeholder="e.g. 9876543210" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} className="w-full bg-[#F9F9F9] border border-gray-200 px-4 py-3 outline-none text-[11px] font-sans text-primary-dark uppercase tracking-widest focus:border-gray-400 transition-colors" />
        </div>
        
        <div className="space-y-2">
          <label className="font-sans text-[9px] tracking-widest text-gray-400 uppercase">Pincode</label>
          <div className="relative">
            <input type="text" maxLength={6} placeholder="6-DIGIT PINCODE" value={formData.postalCode} onChange={handlePincodeChange} className="w-full bg-[#F9F9F9] border border-gray-200 px-4 py-3 outline-none text-[11px] font-sans text-primary-dark uppercase tracking-widest focus:border-gray-400 transition-colors" />
            {isPincodeLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" strokeWidth={2}/>}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="font-sans text-[9px] tracking-widest text-gray-400 uppercase">City / District</label>
          <input type="text" placeholder="AUTO-FILLS FROM PINCODE" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-[#F9F9F9] border border-gray-200 px-4 py-3 outline-none text-[11px] font-sans text-primary-dark uppercase tracking-widest focus:border-gray-400 transition-colors" />
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <label className="font-sans text-[9px] tracking-widest text-gray-400 uppercase">Full Street Address</label>
          <textarea placeholder="House No, Building, Street, Area" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-[#F9F9F9] border border-gray-200 px-4 py-3 outline-none text-[11px] font-sans text-primary-dark uppercase tracking-widest h-24 resize-none focus:border-gray-400 transition-colors" />
        </div>
      </div>
      
      <div className="flex space-x-4">
        <button type="submit" className="bg-[#191919] text-white px-8 py-3.5 font-sans text-[10px] font-bold tracking-widest uppercase hover:bg-black transition-all shadow-sm min-w-[160px]">
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-[10px] font-sans font-bold tracking-widest uppercase text-gray-500 hover:text-gray-800">
          Cancel
        </button>
      </div>
    </form>
  );
}