'use client';

import { API_URL } from '@/lib/api';
import Image from 'next/image';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation'; 
import { useState, useEffect, Suspense } from 'react';

// Wrap the form logic in a sub-component so we can use Next.js Suspense boundary for search params
function AddressFormContent() {
  const { cartItems, cartTotal, openCart, addAddress, editAddress, addresses } = useCart();
  const router = useRouter(); 
  const searchParams = useSearchParams();
  
  // Check if we are editing an existing address
  const editId = searchParams.get('edit');
  const isEditing = !!editId;

  // Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Validation Errors State
  const [errors, setErrors] = useState({
    email: '', phone: '', addressLine: '', postalCode: ''
  });

  // Pre-fill data if editing
  useEffect(() => {
    if (isEditing && editId) {
      const existingAddr = addresses.find(a => a.id === Number(editId));
      if (existingAddr) {
        const nameParts = existingAddr.name.split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
        setAddressLine(existingAddr.address);
        setCity(existingAddr.city);
        setPostalCode(existingAddr.postalCode);
        setPhone(existingAddr.phone);
      }
    }
  }, [isEditing, editId, addresses]);

  // Strict Validation Logic
  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: '', phone: '', addressLine: '', postalCode: '' };

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Please enter a valid email address.';
      isValid = false;
    }
    if (!phone.match(/^\d{10}$/)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number.';
      isValid = false;
    }
    if (addressLine.trim().length < 5) {
      newErrors.addressLine = 'Please enter your complete address.';
      isValid = false;
    }
    if (!postalCode.match(/^\d{6}$/)) {
      newErrors.postalCode = 'Please enter a valid 6-digit postal code.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return; 

    const payload = {
      name: `${firstName} ${lastName}`.trim().toUpperCase(),
      address: addressLine.toUpperCase(),
      city: city.toUpperCase(),
      postalCode: postalCode,
      phone: phone,
      email: email.toLowerCase()
    };

    if (isEditing && editId) {
      editAddress(Number(editId), payload);
    } else {
      addAddress(payload);
    }

    router.push('/checkout');
  };

  if (cartItems.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center py-20">
            <h1 className="font-serif text-3xl text-primary-dark mb-4 tracking-widest uppercase">Your Bag is Empty</h1>
            <Link href="/shop" className="bg-primary-dark text-white px-10 py-4 font-sans text-xs font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors shadow-md">CONTINUE SHOPPING</Link>
        </div>
     );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
      {/* LEFT COLUMN: The Address Form */}
      <div className="lg:col-span-7 flex flex-col space-y-12">
        <nav className="flex items-center text-[11px] font-sans tracking-widest text-gray-400 mb-2 uppercase">
          <button onClick={openCart} className="hover:text-primary-dark transition-colors cursor-pointer">Cart</button>
          <span className="mx-2">/</span>
          <Link href="/checkout" className="hover:text-primary-dark transition-colors cursor-pointer">Shipping</Link>
          <span className="mx-2">/</span>
          <span className="text-primary-dark font-medium">{isEditing ? 'Edit Address' : 'Add Address'}</span>
        </nav>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-10">
          
          {/* Contact Information */}
          <div>
            <h3 className="font-sans text-[11px] font-bold tracking-[0.15em] uppercase text-primary-dark mb-6">CONTACT INFORMATION</h3>
            <div className="flex flex-col space-y-3">
              <div>
                <input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-white border ${errors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-gray-300'} px-4 py-4 text-xs font-sans placeholder-gray-400 focus:outline-none transition-colors shadow-sm`} />
                {errors.email && <p className="text-semantic-error text-[10px] mt-1 font-sans">{errors.email}</p>}
              </div>
              
              <div>
                <input type="tel" placeholder="Phone Number (10 Digits)" required value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10}
                  className={`w-full bg-white border ${errors.phone ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-gray-300'} px-4 py-4 text-xs font-sans placeholder-gray-400 focus:outline-none transition-colors shadow-sm`} />
                {errors.phone && <p className="text-semantic-error text-[10px] mt-1 font-sans">{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <h3 className="font-sans text-[11px] font-bold tracking-[0.15em] uppercase text-primary-dark mb-6">SHIPPING ADDRESS</h3>
            <div className="flex flex-col space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="First Name" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white border border-gray-100 px-4 py-4 text-xs font-sans placeholder-gray-400 focus:outline-none focus:border-gray-300 transition-colors shadow-sm" />
                <input type="text" placeholder="Last Name" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-white border border-gray-100 px-4 py-4 text-xs font-sans placeholder-gray-400 focus:outline-none focus:border-gray-300 transition-colors shadow-sm" />
              </div>

              <div>
                <input type="text" placeholder="Address" required value={addressLine} onChange={(e) => setAddressLine(e.target.value)}
                  className={`w-full bg-white border ${errors.addressLine ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-gray-300'} px-4 py-4 text-xs font-sans placeholder-gray-400 focus:outline-none transition-colors shadow-sm`} />
                {errors.addressLine && <p className="text-semantic-error text-[10px] mt-1 font-sans">{errors.addressLine}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                <input type="text" placeholder="City" required value={city} onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-white border border-gray-100 px-4 py-4 text-xs font-sans placeholder-gray-400 focus:outline-none focus:border-gray-300 transition-colors shadow-sm" />
                
                <div>
                  <input type="text" placeholder="Postal Code (6 Digits)" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} maxLength={6}
                    className={`w-full bg-white border ${errors.postalCode ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-gray-300'} px-4 py-4 text-xs font-sans placeholder-gray-400 focus:outline-none transition-colors shadow-sm`} />
                  {errors.postalCode && <p className="text-semantic-error text-[10px] mt-1 font-sans">{errors.postalCode}</p>}
                </div>
              </div>

              <button type="submit" className="w-full md:w-[60%] bg-[#191919] text-white py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors shadow-md mt-4">
                {isEditing ? 'Save Address' : 'Add Address'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: Order Summary */}
      <div className="lg:col-span-5 bg-white p-8 lg:p-10 sticky top-32 border border-gray-100 shadow-sm">
         <h3 className="font-sans text-[11px] font-bold tracking-[0.15em] uppercase text-primary-dark mb-8">YOUR ORDER</h3>
         
         <div className="flex flex-col space-y-6 mb-8">
            {cartItems.map((item) => (
              <div key={`${item.id}-${item.size}`} className="flex space-x-4">
                <div className="relative w-16 h-20 bg-gray-100 flex-shrink-0 border border-gray-100">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                  <div className="absolute -top-2 -right-2 bg-primary-dark text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{item.quantity}</div>
                </div>
                <div className="flex flex-col flex-1 justify-center py-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-sans text-[9px] font-bold text-primary-dark pr-4 uppercase tracking-[0.1em] leading-relaxed">{item.name}</h4>
                    <span className="font-sans text-[11px] font-bold text-primary-dark">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="font-sans text-[8px] text-gray-500 uppercase tracking-widest mb-1">ORGANIC COMBED COTTON</p>
                  <p className="font-sans text-[8px] text-gray-500 uppercase tracking-widest">SIZE: {item.size} | BLUE</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
              <div className="flex justify-between items-center text-[10px] font-sans tracking-widest uppercase text-gray-500">
                <span>Subtotal</span>
                <span className="font-bold text-primary-dark">₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-sans tracking-widest uppercase">
                <span className="text-gray-500">Shipping</span>
                <span className="font-bold text-green-600">COMPLIMENTARY</span>
              </div>
          </div>

          <div className="border-t border-gray-100 mt-6 pt-6 flex justify-between items-end">
            <div className="flex flex-col">
              <span className="font-sans text-[11px] font-bold tracking-widest uppercase text-primary-dark mb-1">TOTAL</span>
              <span className="font-sans text-[8px] tracking-[0.15em] text-gray-400 uppercase">VAT INCLUDED</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="font-sans text-[8px] tracking-widest text-gray-400 mb-1">INR</span>
                <span className="font-sans text-2xl font-bold text-primary-dark tracking-tight">₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
      </div>
    </div>
  );
}

// Main Page Wrapper to handle Next.js Suspense for useSearchParams
export default function AddAddressPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-32 pb-20">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-2xl tracking-[0.2em] uppercase text-primary-dark text-center mb-16">YOUR BAG</h1>
        <Suspense fallback={<div className="text-center text-sm font-sans tracking-widest text-gray-500 py-20 uppercase">Loading...</div>}>
          <AddressFormContent />
        </Suspense>
      </div>
    </main>
  );
}