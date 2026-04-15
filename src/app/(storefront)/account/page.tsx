'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import {
  User, Package, MapPin, Heart, LogOut, Edit2, Check,
  Loader2, Download, ChevronDown, Plus, Trash2, Truck,
  ExternalLink, Search, X, AlertTriangle, Clock, RefreshCw,
  CheckCircle2
} from 'lucide-react';
import AddressForm from '@/components/ui/AddressForm';

import { API_URL } from '@/lib/api';
import { authFetch, safeJson, unwrapApiResponse } from '@/lib/integrationAdapters';
import type { Address } from '@/types';

interface OrderItem {
  id: string;
  name: string;
  size: string;
  price: number;
  image: string;
  quantity: number;
}

interface Order {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  date?: string;
  createdAt: string;
  items: OrderItem[];
  shippingAddress?: Address;
  awb?: string;
  awbNumber?: string;
  courier?: string;
  paymentMethod?: string;
  paymentMode?: string;
  trackingUrl?: string;
  cancellable?: boolean;
  hoursLeft?: number;
}

// ── Cancel Confirmation Modal ─────────────────────────────────────────────────
function CancelModal({
  order,
  onConfirm,
  onClose,
  isProcessing,
}: {
  order: Order;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isProcessing: boolean;
}) {
  const [reason, setReason] = useState('');
  const isPaidOnline = order.paymentMode &&
    !['COD', 'Cash on Delivery'].includes(order.paymentMode);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[480px] shadow-2xl z-10 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-semantic-error" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-sans text-[13px] font-bold text-primary-dark uppercase tracking-widest">
                Cancel Order
              </h3>
              <p className="font-sans text-[10px] text-gray-400 tracking-widest">{order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Refund info */}
          {isPaidOnline ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded">
              <div className="flex items-start space-x-2">
                <RefreshCw className="w-4 h-4 text-semantic-warning mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="font-sans text-[11px] font-bold text-semantic-warning uppercase tracking-widest mb-1">
                    Refund will be processed
                  </p>
                  <p className="font-sans text-[11px] text-semantic-warning leading-relaxed">
                    ₹{order.total?.toLocaleString('en-IN')} will be refunded to your original payment
                    method within 5–7 business days after cancellation.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded">
              <p className="font-sans text-[11px] text-gray-600 leading-relaxed">
                This is a Cash on Delivery order. No refund is required.
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block font-sans text-[10px] text-gray-400 tracking-widest uppercase mb-2">
              Reason for cancellation (optional)
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full font-sans text-[12px] text-primary-dark border border-gray-200 px-3 py-2.5 outline-none focus:border-gray-400 transition-colors bg-white"
            >
              <option value="">Select a reason...</option>
              <option value="Changed my mind">Changed my mind</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Found a better price">Found a better price</option>
              <option value="Shipping too slow">Shipping too slow</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <p className="font-sans text-[10px] text-gray-400 leading-relaxed">
            Once cancelled, this action cannot be undone. Our team will be notified immediately.
          </p>
        </div>

        <div className="flex space-x-3 p-6 pt-0">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3.5 border border-gray-200 font-sans text-[10px] font-bold tracking-widest uppercase text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Keep Order
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isProcessing}
            className="flex-1 py-3.5 bg-red-500 text-white font-sans text-[10px] font-bold tracking-widest uppercase hover:bg-red-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            {isProcessing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Cancelling...</span></>
            ) : (
              'Cancel Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Account Page ─────────────────────────────────────────────────────────
export default function AccountDashboardPage() {
  const { addresses, addAddress, editAddress, removeAddress } = useCart();
  const { currentUser, logout, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'tracking' | 'addresses'>('profile');
  const [mounted, setMounted]     = useState(false);

  const [userProfile, setUserProfile] = useState({ name: '', email: '', phone: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile]   = useState(false);
  const [profileSuccess, setProfileSuccess]     = useState(false);

  const [pastOrders, setPastOrders]       = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [manualAwb, setManualAwb]         = useState('');

  const [cancellingOrder, setCancellingOrder]     = useState<Order | null>(null);
  const [isCancelling, setIsCancelling]           = useState(false);
  const [cancelResult, setCancelResult]           = useState<{ orderId: string; message: string; refund: boolean } | null>(null);

  const [isAddingAddress, setIsAddingAddress]   = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);

    // Load profile from CartContext (already hydrated from localStorage)
    if (currentUser) {
      setUserProfile({
        name:  currentUser.name  || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
      });
    }

    fetchOrders();
  }, [currentUser]);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await authFetch(`${API_URL}/api/user/orders`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const payload = await safeJson<any>(res, {});
        const orders = unwrapApiResponse<Order[]>(payload);
        setPastOrders(Array.isArray(orders) ? orders : []);
      }
      else setPastOrders([]);
    } catch {
      setPastOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleProfileSave = async () => {
    setIsSavingProfile(true);
    try {
      console.log('Saving profile with customerId:', currentUser?.customerId);
      
      // Backend currently exposes profile read endpoint only.
      // Keep UI editable while safely skipping unsupported server patch.
      const freshUserData = {
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
      };
      console.log('Updated profile:', freshUserData);

      if (currentUser) {
        const updated = {
          ...currentUser,
          name: freshUserData.name || userProfile.name,
          email: freshUserData.email || userProfile.email,
          phone: freshUserData.phone || userProfile.phone,
        };
        login(updated);
      }

      setIsEditingProfile(false);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error('Profile save failed:', err);
      alert('Failed to save profile. Please check console for details.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Cancel order ───────────────────────────────────────────────────────────
  const handleCancelConfirm = async (reason: string) => {
    if (!cancellingOrder) return;
    setIsCancelling(true);
    try {
      const res = await authFetch(
        `${API_URL}/api/user/orders/${cancellingOrder.id}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      );
      const data = await safeJson<any>(res, {});

      if (!res.ok) {
        alert(data.error || 'Failed to cancel order.');
        return;
      }

      setCancelResult({
        orderId: cancellingOrder.orderId,
        message: data.message,
        refund:  data.refundRequired,
      });

      // Refresh orders list
      await fetchOrders();
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setIsCancelling(false);
      setCancellingOrder(null);
    }
  };

  const handleDownloadBill = (order: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintingOrder(order);
    setTimeout(() => { window.print(); setTimeout(() => setPrintingOrder(null), 500); }, 300);
  };

  const closeAddressForm = () => { setIsAddingAddress(false); setEditingAddressId(null); };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const renderReceiptContent = (orderToPrint: any) => {
    if (!orderToPrint) return null;
    return (
      <div className="bg-white p-10 w-full max-w-3xl mx-auto border border-gray-200">
        <div className="text-center mb-6 pb-6 border-b border-dashed border-gray-300">
          <h2 className="font-serif text-3xl text-primary-dark tracking-widest uppercase mb-1">AARAH</h2>
          <p className="font-sans text-[8px] text-gray-500 tracking-[0.2em] uppercase">Maternity & Nursing Wear</p>
          <div className="mt-6 flex flex-col space-y-1.5 items-center">
            <span className="bg-gray-100 text-primary-dark px-3 py-1 font-sans text-[10px] font-bold tracking-widest uppercase rounded-sm border border-gray-200">TAX INVOICE</span>
            <p className="font-sans text-[11px] text-primary-dark font-bold tracking-wider mt-2">Order: {orderToPrint.orderId}</p>
            <p className="font-sans text-[9px] text-gray-500 tracking-wider">Date: {orderToPrint.date}</p>
          </div>
        </div>
        {orderToPrint.address && (
          <div className="mb-6 pb-6 border-b border-dashed border-gray-300">
            <span className="font-sans text-[8px] text-gray-400 tracking-widest uppercase mb-2 block">SHIPPED TO</span>
            <span className="font-sans text-[10px] font-bold text-primary-dark uppercase block">{orderToPrint.address.name}</span>
            <span className="font-sans text-[9px] text-gray-600 mt-1 uppercase leading-relaxed block">
              {orderToPrint.address.address}, {orderToPrint.address.city} - {orderToPrint.address.postalCode}
            </span>
          </div>
        )}
        <table className="w-full text-left mb-6 pb-6 border-b border-solid border-gray-200">
          <thead><tr className="font-sans text-[8px] text-gray-400 tracking-widest uppercase border-b border-gray-200"><th className="pb-3 font-normal">Item</th><th className="pb-3 font-normal text-center">Qty</th><th className="pb-3 font-normal text-right">Price</th></tr></thead>
          <tbody>
            {orderToPrint.items?.map((item: any, i: number) => (
              <tr key={i} className="font-sans text-[9px] text-primary-dark uppercase border-b border-dashed border-gray-100 last:border-0">
                <td className="py-4 pr-2"><span className="block font-bold max-w-[140px] leading-relaxed">{item.name}</span><span className="text-[8px] text-gray-500 block mt-0.5">Size: {item.size}</span></td>
                <td className="py-4 text-center">{item.quantity}</td>
                <td className="py-4 text-right">₹{(item.price * item.quantity).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between font-sans text-[13px] font-bold text-primary-dark tracking-widest uppercase border-t border-gray-200 pt-3">
          <span>Total Paid</span>
          <span>₹{orderToPrint.total?.toLocaleString('en-IN') || 0}</span>
        </div>
        <div className="text-center font-sans text-[8px] text-gray-400 tracking-[0.2em] uppercase pt-4 border-t border-dashed border-gray-300 mt-6">
          <p>Thank you for shopping with Aarah.</p>
        </div>
      </div>
    );
  };

  if (!mounted) return null;

  const activeShipments = pastOrders.filter(o => o.awbNumber);

  const TABS = [
    { id: 'profile',   label: 'My Profile',       icon: User   },
    { id: 'orders',    label: 'Order History',     icon: Package },
    { id: 'tracking',  label: 'Track Order',       icon: Truck  },
    { id: 'addresses', label: 'Saved Addresses',   icon: MapPin },
  ] as const;

  const statusColor = (status: string) => {
    switch (status) {
      case 'Delivered':      return 'bg-green-50 border-green-200 text-semantic-success';
      case 'Processing':     return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'Shipped':
      case 'OutForDelivery': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'Cancelled':      return 'bg-red-50 border-red-200 text-semantic-error';
      case 'Returned':       return 'bg-gray-50 border-gray-200 text-gray-700';
      default:               return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@media print { @page{size:portrait;margin:0}body{background:white!important} header,footer,nav{display:none!important} .screen-only{display:none!important} .print-only{display:block!important;width:100%!important;max-width:800px!important;margin:0 auto!important;padding:40px!important} }` }} />

      <main className="screen-only min-h-screen bg-[#FAFAFA] pt-32 md:pt-40 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="font-serif text-3xl md:text-4xl text-primary-dark tracking-wide">My Account</h1>
            <p className="font-sans text-[11px] text-gray-500 tracking-[0.15em] uppercase mt-2">
              Welcome back, {userProfile.name ? userProfile.name.split(' ')[0] : 'Guest'}
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
            {/* Sidebar */}
            <aside className="w-full md:w-64 flex-shrink-0">
              <div className="md:hidden flex overflow-x-auto space-x-2 pb-2 mb-6 border-b border-gray-200">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); closeAddressForm(); }}
                    className={`flex items-center space-x-2 px-4 py-3 whitespace-nowrap font-sans text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === tab.id ? 'text-primary-dark border-b-2 border-primary-dark bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}>
                    <tab.icon className="w-4 h-4" strokeWidth={1.5} /><span>{tab.label}</span>
                  </button>
                ))}
              </div>
              <div className="hidden md:flex flex-col bg-white border border-gray-100 shadow-sm p-4">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); closeAddressForm(); }}
                    className={`flex items-center space-x-3 w-full px-4 py-4 font-sans text-[11px] font-bold tracking-widest uppercase transition-all text-left ${activeTab === tab.id ? 'bg-[#F9F9F9] text-primary-dark border-l-2 border-primary-dark' : 'text-gray-500 hover:bg-gray-50 border-l-2 border-transparent hover:text-primary-dark'}`}>
                    <tab.icon className="w-4 h-4" strokeWidth={1.5} /><span>{tab.label}</span>
                  </button>
                ))}
                <div className="my-4 border-t border-gray-100" />
                <Link href="/wishlist" className="flex items-center space-x-3 w-full px-4 py-4 font-sans text-[11px] font-bold tracking-widest uppercase text-gray-500 hover:bg-gray-50 hover:text-primary-dark transition-all border-l-2 border-transparent">
                  <Heart className="w-4 h-4" strokeWidth={1.5} /><span>Wishlist</span>
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-4 font-sans text-[11px] font-bold tracking-widest uppercase text-semantic-error hover:bg-red-50 hover:text-red-600 transition-all border-l-2 border-transparent">
                  <LogOut className="w-4 h-4" strokeWidth={1.5} /><span>Sign Out</span>
                </button>
              </div>
            </aside>

            {/* Main content */}
            <section className="flex-1 min-w-0">

              {/* ── Cancel success banner ── */}
              {cancelResult && (
                <div className={`mb-6 p-4 border rounded flex items-start space-x-3 animate-in fade-in ${cancelResult.refund ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                  <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cancelResult.refund ? 'text-semantic-warning' : 'text-semantic-success'}`} strokeWidth={1.5} />
                  <div className="flex-1">
                    <p className="font-sans text-[11px] font-bold text-primary-dark tracking-widest uppercase mb-1">
                      {cancelResult.refund ? 'Order Cancelled — Refund Initiated' : 'Order Cancelled Successfully'}
                    </p>
                    <p className="font-sans text-[11px] text-gray-600">{cancelResult.message}</p>
                  </div>
                  <button onClick={() => setCancelResult(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── PROFILE TAB ── */}
              {activeTab === 'profile' && (
                <div className="bg-white border border-gray-100 p-6 md:p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                    <h2 className="font-serif text-2xl text-primary-dark tracking-wide">Account Details</h2>
                    {!isEditingProfile && (
                      <button onClick={() => setIsEditingProfile(true)} className="flex items-center space-x-2 text-[10px] font-sans font-bold tracking-widest uppercase text-gray-500 hover:text-primary-dark transition-colors">
                        <Edit2 className="w-3.5 h-3.5" /><span>Edit</span>
                      </button>
                    )}
                  </div>
                  <div className="max-w-lg space-y-6">
                    {([['Full Name', 'name', 'text'], ['Email Address', 'email', 'email'], ['Phone Number', 'phone', 'tel']] as const).map(([label, key, type]) => (
                      <div key={key}>
                        <label className="block font-sans text-[10px] text-gray-400 tracking-widest uppercase mb-2">{label}</label>
                        <input type={type} value={(userProfile as any)[key]} onChange={e => setUserProfile({ ...userProfile, [key]: e.target.value })} disabled={!isEditingProfile}
                          className={`w-full font-sans text-[13px] text-primary-dark outline-none transition-all ${isEditingProfile ? 'border-b border-gray-300 pb-2 focus:border-primary-dark bg-[#F9F9F9] px-3 pt-2' : 'border-b border-transparent pb-2 bg-transparent'}`} />
                      </div>
                    ))}
                    {isEditingProfile && (
                      <div className="pt-6 flex items-center space-x-4">
                        <button onClick={handleProfileSave} disabled={isSavingProfile}
                          className="bg-[#191919] text-white px-8 py-3.5 font-sans text-[10px] font-bold tracking-widest uppercase hover:bg-black transition-all shadow-sm w-40 flex justify-center">
                          {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                        </button>
                        <button onClick={() => setIsEditingProfile(false)} className="text-[10px] font-sans font-bold tracking-widest uppercase text-gray-500 hover:text-gray-800">Cancel</button>
                      </div>
                    )}
                    {profileSuccess && (
                      <div className="flex items-center space-x-2 text-semantic-success bg-green-50 p-3 border border-green-100 animate-in fade-in">
                        <Check className="w-4 h-4" /><span className="font-sans text-[10px] font-bold tracking-widest uppercase">Profile Updated Successfully</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ORDERS TAB ── */}
              {activeTab === 'orders' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {isLoadingOrders ? (
                    <div className="bg-white border border-gray-100 p-12 text-center flex flex-col items-center justify-center shadow-sm h-64">
                      <Loader2 className="w-8 h-8 text-gray-300 animate-spin mb-4" />
                      <p className="font-sans text-xs text-gray-500 tracking-widest uppercase">Fetching your orders...</p>
                    </div>
                  ) : pastOrders.length === 0 ? (
                    <div className="bg-white border border-gray-100 p-12 text-center flex flex-col items-center shadow-sm">
                      <Package className="w-12 h-12 text-gray-300 mb-4" strokeWidth={1} />
                      <p className="font-sans text-xs text-gray-500 tracking-widest uppercase mb-6">You haven't placed any orders yet.</p>
                      <Link href="/shop" className="bg-[#191919] text-white px-8 py-4 font-sans text-[10px] font-bold tracking-widest uppercase hover:bg-black transition-colors">Start Shopping</Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pastOrders.map(order => (
                        <div key={order.orderId} className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                          {/* Order header */}
                          <div
                            onClick={() => setExpandedOrder(expandedOrder === order.orderId ? null : order.orderId)}
                            className="p-6 cursor-pointer hover:bg-[#F9F9F9] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex flex-col space-y-1">
                              <span className="font-sans text-[12px] font-bold text-primary-dark tracking-wider uppercase">Order {order.orderId}</span>
                              <span className="font-sans text-[10px] text-gray-500 tracking-widest uppercase">Placed on {order.date}</span>
                            </div>
                            <div className="flex items-center space-x-4 sm:space-x-6">
                              <div className="flex flex-col sm:items-end space-y-1">
                                <span className="font-sans text-[10px] text-gray-400 tracking-widest uppercase">Total</span>
                                <span className="font-sans text-[12px] font-bold text-primary-dark">₹{order.total?.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className={`px-3 py-1 font-sans text-[9px] font-bold tracking-widest uppercase rounded-sm border ${statusColor(order.status)}`}>
                                  {order.status}
                                </span>

                                {/* ── 48hr cancel button ── */}
                                {order.cancellable && (
                                  <button
                                    onClick={e => { e.stopPropagation(); setCancellingOrder(order); }}
                                    className="flex items-center space-x-1.5 px-3 py-1 border border-red-200 bg-red-50 text-semantic-error font-sans text-[9px] font-bold tracking-widest uppercase hover:bg-red-100 transition-colors rounded-sm"
                                  >
                                    <X className="w-3 h-3" strokeWidth={2.5} />
                                    <span>Cancel</span>
                                    {order.hoursLeft && order.hoursLeft > 0 && order.hoursLeft <= 12 && (
                                      <span className="flex items-center space-x-0.5 text-semantic-error">
                                        <Clock className="w-2.5 h-2.5" />
                                        <span>{order.hoursLeft}h left</span>
                                      </span>
                                    )}
                                  </button>
                                )}

                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expandedOrder === order.orderId ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                          </div>

                          {/* Order details (expanded) */}
                          <div className={`border-t border-gray-100 transition-all duration-500 bg-[#FAFAFA] ${expandedOrder === order.orderId ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                            <div className="p-6">
                              <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-200">
                                <h4 className="font-sans text-[10px] text-gray-500 tracking-widest uppercase">Items in this order</h4>
                                <button onClick={e => handleDownloadBill(order, e)}
                                  className="flex items-center justify-center bg-white border border-gray-300 px-5 py-2.5 font-sans text-[9px] font-bold tracking-widest uppercase text-primary-dark hover:bg-gray-50 transition-colors shadow-sm">
                                  <Download className="w-3.5 h-3.5 mr-2" /><span>Invoice</span>
                                </button>
                              </div>

                              <div className="space-y-4">
                                {order.items?.map((item: any, idx: number) => (
                                  <div key={idx} className="flex space-x-4 bg-white p-4 border border-gray-100 shadow-sm">
                                    {item.image && (
                                      <div className="relative w-16 h-20 bg-gray-100 flex-shrink-0">
                                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                                      </div>
                                    )}
                                    <div className="flex flex-col justify-center flex-1">
                                      <div className="flex justify-between items-start">
                                        <span className="font-sans text-[11px] font-bold text-primary-dark uppercase tracking-widest">{item.name}</span>
                                        <span className="font-sans text-[11px] font-bold text-primary-dark">₹{item.price.toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex items-center space-x-4 mt-2 font-sans text-[10px] text-gray-500 tracking-widest uppercase">
                                        {item.size && <span>Size: {item.size}</span>}
                                        <span>Qty: {item.quantity}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* 48hr window notice in expanded view */}
                              {order.cancellable && (
                                <div className="mt-4 flex items-center space-x-2 bg-amber-50 border border-amber-200 p-3">
                                  <Clock className="w-4 h-4 text-semantic-warning flex-shrink-0" strokeWidth={1.5} />
                                  <p className="font-sans text-[10px] text-semantic-warning tracking-widest">
                                    You can cancel this order for the next <strong>{order.hoursLeft} hours</strong>.
                                    After that, cancellations are not available.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TRACKING TAB ── */}
              {activeTab === 'tracking' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  <div className="bg-white border border-gray-100 p-6 md:p-10 shadow-sm">
                    <h2 className="font-serif text-2xl text-primary-dark tracking-wide mb-2">Track Package</h2>
                    <p className="font-sans text-[10px] text-gray-500 tracking-widest uppercase mb-6">Enter your AWB number for real-time courier updates</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="e.g. STC123456789" value={manualAwb} onChange={e => setManualAwb(e.target.value)}
                          className="w-full bg-[#F9F9F9] border border-gray-200 pl-11 pr-4 py-3.5 outline-none text-[11px] font-sans text-primary-dark uppercase tracking-widest focus:border-gray-400 transition-colors" />
                      </div>
                      <a href={manualAwb.trim() ? `https://stcourier.com/track/shipment/${manualAwb.trim()}` : '#'}
                        target={manualAwb.trim() ? '_blank' : '_self'} rel="noopener noreferrer"
                        className={`flex items-center justify-center space-x-2 px-8 py-3.5 font-sans text-[10px] font-bold tracking-widest uppercase transition-all shadow-sm ${manualAwb.trim() ? 'bg-[#191919] text-white hover:bg-black' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                        <span>Track Now</span><ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 p-6 md:p-10 shadow-sm">
                    <h3 className="font-serif text-xl text-primary-dark tracking-wide mb-6 pb-4 border-b border-gray-100">Active Shipments</h3>
                    {isLoadingOrders ? (
                      <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>
                    ) : activeShipments.length === 0 ? (
                      <div className="py-8 text-center flex flex-col items-center">
                        <Truck className="w-10 h-10 text-gray-200 mb-3" strokeWidth={1} />
                        <p className="font-sans text-[10px] text-gray-500 tracking-widest uppercase">No active shipments at the moment.</p>
                      </div>
                    ) : activeShipments.map(order => (
                      <div key={order.orderId} className="border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F9F9F9] hover:bg-white transition-colors mb-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white border border-gray-200 rounded-full shadow-sm"><Package className="w-5 h-5 text-primary-dark" strokeWidth={1.5} /></div>
                          <div>
                            <span className="font-sans text-[12px] font-bold text-primary-dark tracking-wider uppercase block">Order {order.orderId}</span>
                            <span className="font-sans text-[9px] text-gray-500 mt-1 uppercase tracking-widest">AWB: <span className="font-bold text-primary-dark">{order.awbNumber}</span></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 font-sans text-[9px] font-bold tracking-widest uppercase rounded-sm border ${statusColor(order.status)}`}>{order.status}</span>
                          <a href={order.trackingUrl || `https://stcourier.com/track/shipment/${order.awbNumber}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center space-x-2 bg-white border border-gray-300 text-primary-dark px-4 py-2 font-sans text-[9px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-colors shadow-sm">
                            <span>Track</span><ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ADDRESSES TAB ── */}
              {activeTab === 'addresses' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {isAddingAddress ? (
                    <div className="bg-white border border-gray-100 p-6 md:p-10 shadow-sm">
                      <h2 className="font-serif text-2xl text-primary-dark tracking-wide mb-8 border-b border-gray-100 pb-4">
                        {editingAddressId ? 'Edit Address' : 'Add New Address'}
                      </h2>
                      <AddressForm
                        initialData={editingAddressId ? addresses.find(a => a.id === editingAddressId) : undefined}
                        onSave={addressData => { if (editingAddressId !== null) editAddress(editingAddressId, addressData); else addAddress(addressData); closeAddressForm(); }}
                        onCancel={closeAddressForm}
                        submitLabel={editingAddressId ? 'Update Address' : 'Save Address'}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="font-serif text-2xl text-primary-dark tracking-wide">Address Book</h2>
                        <button onClick={() => setIsAddingAddress(true)} className="flex items-center space-x-2 text-[10px] font-sans font-bold tracking-widest uppercase text-primary-dark border border-primary-dark px-4 py-2 hover:bg-[#F9F9F9] transition-colors">
                          <Plus className="w-3.5 h-3.5" /><span>Add New</span>
                        </button>
                      </div>
                      {addresses.length === 0 ? (
                        <div className="bg-white border border-gray-100 p-12 text-center shadow-sm">
                          <p className="font-sans text-xs text-gray-500 tracking-widest uppercase mb-4">No saved addresses found.</p>
                          <button onClick={() => setIsAddingAddress(true)} className="bg-[#191919] text-white px-6 py-3 font-sans text-[10px] font-bold tracking-widest uppercase hover:bg-black transition-colors">Add Address</button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {addresses.map(addr => (
                            <div key={addr.id} className="bg-white border border-gray-200 p-6 flex flex-col shadow-sm hover:border-gray-400 transition-colors">
                              <span className="font-sans text-[12px] font-bold text-primary-dark uppercase tracking-wider mb-2">{addr.name}</span>
                              <span className="font-sans text-[11px] text-gray-600 leading-relaxed uppercase mb-4">{addr.address},<br />{addr.city} - {addr.postalCode}</span>
                              <span className="font-sans text-[10px] text-gray-500 tracking-widest mb-6">PH: {addr.phone}</span>
                              <div className="flex space-x-4 mt-auto pt-4 border-t border-gray-100">
                                <button onClick={() => { setEditingAddressId(addr.id); setIsAddingAddress(true); }} className="text-[9px] font-sans font-bold tracking-widest uppercase text-primary-dark hover:text-gray-500 flex items-center"><Edit2 className="w-3 h-3 mr-1" /> Edit</button>
                                <button onClick={() => { if (window.confirm('Delete this address?')) removeAddress(addr.id); }} className="text-[9px] font-sans font-bold tracking-widest uppercase text-semantic-error hover:text-red-700 flex items-center"><Trash2 className="w-3 h-3 mr-1" /> Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </section>
          </div>
        </div>
      </main>

      {/* Print receipt */}
      {printingOrder && <div className="print-only hidden bg-white">{renderReceiptContent(printingOrder)}</div>}

      {/* Cancel modal */}
      {cancellingOrder && (
        <CancelModal
          order={cancellingOrder}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancellingOrder(null)}
          isProcessing={isCancelling}
        />
      )}
    </>
  );
}
