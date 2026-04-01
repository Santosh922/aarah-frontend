'use client';

import { API_URL } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Check, X, Star, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  content: string;
  reviewerName: string;
  reviewerDetails?: string;
  customerEmail?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved: boolean;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    images?: { url: string }[];
  };
}

interface ToastItem { id: string; type: 'success' | 'error'; message: string }

function useToast() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const uidRef = useRef(0);
  const add = useCallback((type: ToastItem['type'], message: string) => {
    const id = String(++uidRef.current);
    setItems(p => [...p.slice(-4), { id, type, message }]);
    setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 3800);
  }, []);
  const remove = useCallback((id: string) => setItems(p => p.filter(t => t.id !== id)), []);
  return { items, toast: { success: (m: string) => add('success', m), error: (m: string) => add('error', m) }, remove };
}

export default function AdminReviewsPage() {
  const { items: toastItems, toast, remove: removeToast } = useToast();
  const { currentUser, isMounted } = useAdminAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/reviews?status=${filter}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      } else {
        toast.error('Failed to load reviews');
      }
    } catch {
      toast.error('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isMounted && currentUser) {
      fetchReviews();
    }
  }, [isMounted, currentUser, fetchReviews]);

  const handleUpdateStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`${API_URL}/api/admin/reviews`, {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (res.ok) {
        toast.success(`Review ${newStatus.toLowerCase()}`);
        fetchReviews();
      } else {
        toast.error('Failed to update review');
      }
    } catch {
      toast.error('Failed to update review');
    }
  };

  if (!isMounted || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0e0e0e' }}>
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  const filteredReviews = reviews.filter(r => r.status === filter);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0e0e0e', fontFamily: "'DM Sans',sans-serif", color: '#fff' }}>
      {/* Topbar */}
      <div className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0e0e0e]/90 backdrop-blur-md px-6 md:px-10 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08] bg-white/[0.06]">
            <MessageSquare className="w-5 h-5 text-white/60" />
          </div>
          <div>
            <h1 className="text-white font-bold text-[18px]" style={{ fontFamily: "'Georgia',serif" }}>Review Moderation</h1>
            <p className="text-white/40 text-[11px] mt-0.5 tracking-widest uppercase">Quality Control Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchReviews} disabled={loading} className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.06] text-white/50 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl">
            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-[11px] font-bold tracking-wide transition-all ${filter === f ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                {f}
                {f === 'PENDING' && reviews.filter(r => r.status === 'PENDING').length > 0 && (
                  <span className="ml-1.5 bg-blue-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">{reviews.filter(r => r.status === 'PENDING').length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-white/5 animate-pulse rounded-2xl" />)}</div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-24 text-center border border-white/[0.05] rounded-3xl bg-white/[0.02]">
            <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/80 font-semibold">No {filter.toLowerCase()} reviews</p>
            <p className="text-white/40 text-xs mt-1">You are all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review, i) => {
              let formattedDate = 'Unknown Date';
              try {
                if (review.createdAt) {
                  formattedDate = new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                }
              } catch (e) {
                formattedDate = 'Invalid Date';
              }

              return (
                <div key={review.id} className="p-5 rounded-2xl border border-white/[0.05] bg-white/[0.02] flex flex-col md:flex-row gap-6 transition-all hover:bg-white/[0.03]">
                  {/* Product Image */}
                  {review.product?.images?.[0]?.url && (
                    <div className="md:w-20 shrink-0">
                      <img src={review.product.images[0].url} alt={review.product?.name || 'Product'} className="w-20 h-20 rounded-xl object-cover" />
                    </div>
                  )}

                  {/* Product & User Details */}
                  <div className="md:w-1/3 shrink-0 border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 md:pr-6">
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} className={`w-4 h-4 ${idx < (review.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-white/10'}`} />
                      ))}
                    </div>
                    <h3 className="text-white text-sm font-bold mt-2">{review.product?.name || 'Unknown Product'}</h3>

                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-white/80 text-[11px] font-semibold">{review.reviewerName || 'Anonymous'}</p>
                      <p className="text-white/30 text-[10px] truncate">{review.customerEmail || review.reviewerDetails || ''}</p>
                      <p className="text-white/20 text-[9px] mt-1">{formattedDate}</p>
                    </div>
                  </div>

                  {/* Review Text & Actions */}
                  <div className="flex-1 flex flex-col justify-between">
                    <p className="text-white/70 text-sm leading-relaxed italic">"{review.content || 'No text provided'}"</p>

                    {filter === 'PENDING' && (
                      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/5">
                        <button onClick={() => handleUpdateStatus(review.id, 'APPROVED')} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 rounded-xl text-xs font-bold transition-colors">
                          <Check className="w-4 h-4" /> Approve & Publish
                        </button>
                        <button onClick={() => handleUpdateStatus(review.id, 'REJECTED')} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-colors">
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}

                    {filter !== 'PENDING' && (
                      <div className="mt-4 flex items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider ${filter === 'APPROVED' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {filter}
                        </span>
                        {filter === 'REJECTED' && (
                          <button onClick={() => handleUpdateStatus(review.id, 'APPROVED')} className="text-[10px] text-white/40 hover:text-white underline ml-auto">Re-evaluate</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2 pointer-events-none">
        {toastItems.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto border backdrop-blur-md shadow-xl ${t.type === 'success' ? 'bg-green-900/40 border-green-500/30 text-green-400' : 'bg-red-900/40 border-red-500/30 text-red-400'}`}>
            {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="text-[12px] font-medium">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="ml-1 opacity-50 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
